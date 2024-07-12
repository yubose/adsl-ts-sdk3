import * as u from '@jsmanifest/utils'
import { documentToNote,contentToBlob } from '../../../services/Document/utils'
import store from '../../../common/store'
import PItoS3Helper from '../S3Convert/PItoS3Helper'
import basicExtraction from '../KeyExtraction/BasicAlgorithm'
import FuzzyIndexCreator from '../FuzzyIndexCreator'
import { replaceUint8ArrayWithBase64 } from '../../../CADL/utils'
import log from '../../../utils/log'
export default class PersonalIndexCtr {
    private mTime:number = 0
    private user_vid
    private indexTablesDao
    private isadmin
    private rootNoteBookId
    private PI_docID
    constructor(indexTablesDao) {
        this.indexTablesDao = indexTablesDao
        this.isadmin = false
    }

    /**
     * backupPI
     */
    public async backUpPI(piDoc?:Record<string,any>) {
      const rootNoteBookId = this.rootNoteBookId
      const user_vid = this.getUser_Vid()
      const pItoS3Helper = new PItoS3Helper(this.indexTablesDao)
      const context = pItoS3Helper.DBStoJSON()
      let uploadResponse
      let requestOptions:any = {
        content:context,
      }
      if(piDoc){
        requestOptions.eid = piDoc?.eid
        requestOptions.id = piDoc?.id
      }else{
        const response = await this.retrievePersonalIndex(user_vid)
        if (response.code != 0){
          return false
        }
        const docs = response?.document
        if(context && docs && docs.length){
          piDoc = docs[0]
          requestOptions.eid = piDoc?.eid
          requestOptions.id = piDoc?.id
        }
      }

      if(!piDoc){
        requestOptions.eid = rootNoteBookId
      }
      uploadResponse = await this.uploadPersonalIndex(requestOptions)
      return uploadResponse

      
    }
    /**
     * retrievePersonalIndex
     */
    public async retrievePersonalIndex(user_vid) {
      const idList = [this.rootNoteBookId]
      const requestOptions:any = {
          xfname: 'eid',
          type: '1793',
          obfname: 'mtime',
      }
      let rawResponse
      await store.level2SDK.documentServices
        .retrieveDocument({
          idList,
          options: requestOptions,
        }).then((res)=>{
          rawResponse = res.data
          const documents = u.reduce(
            u.array(res?.data?.document),
            (acc, obj) => (!u.isNil(obj) ? acc.concat(obj) : acc),
            [] as any[],
          )

          return Promise.allSettled(
            documents.map?.(async (document) => {
              //decrypt data
              if (document?.deat?.url) {
                //skip files that are in S3
                //these will be retrieved as needed by noodl established prepareDoc util fn
                return document
              } else {
                let note: any
                try {
                  note = await documentToNote({ document })
                } catch (error) {
                  const err =
                    error instanceof Error ? error : new Error(String(error))
                }
                return note
              }
            })
          )
        }).then((res) => {
          delete rawResponse.document
          rawResponse.document = res.reduce((acc, result) => {
            // @ts-expect-error
            const { status, value: doc } = result
            return status === 'fulfilled' && !u.isNil(doc)
              ? acc.concat(doc)
              : acc
          }, [] as any[])
        })
        
      return rawResponse
    }

    /**
     * uploadPersonalIndex
     */
    public async uploadPersonalIndex(
      requestOptions
      :{content:any,eid:string,id?:string|Uint8Array}
      ){
        let response

        const blob = await contentToBlob(requestOptions?.content, 'application/json')
        if(requestOptions?.id){
          response = await store.level2SDK.documentServices
            .updateDocument({
              id: requestOptions?.id,
              fid: requestOptions?.id,
              eid: requestOptions?.eid,
              subtype: 2,
              // name:,
              size: blob.size,
              type:1793,
            })
        }else{
          response = await store.level2SDK.documentServices
            .createDocument({
              eid: requestOptions?.eid,
              type: 1793,
              subtype: 2,
              size: blob.size,
              // name: {}
            })
        }
      if(response?.code === 0){
        await this.uploadFileToS3_low(response?.data?.document,requestOptions?.content)
      }
      return response
    }

    private async uploadFileToS3_low(doc,bs64Data){
      const deat = doc?.deat
      if (deat !== null && deat && deat.url && bs64Data) {
        const res = await store.level2SDK.documentServices
          .uploadDocumentToS3({ url: deat.url, sig: deat.sig, data: bs64Data })
          .then(store.responseCatcher)
          .catch(store.errorCatcher)
      }
    }


    private async getPIData(doc) {
      const subtype = doc.subtype
      if (subtype?.isOnServer) {
          log.debug("personal index should not be on server");
      } else {
          const deat = doc?.deat
          const url = deat?.url
          try {
              if(deat && url){
                const response =
                  await store.level2SDK.documentServices.downloadDocumentFromS3({ url })
                const content = response?.data
                return content
              }
          } catch (error) {
              log.error(error)
          }
      }

      return null
    }

    /**
     * restorePI
     */
    public async restorePI() {
      if(!this.indexTablesDao.indexTableIsEmpty){
        return false
      }
      const user_vid = this.getUser_Vid()
      const response = await this.retrievePersonalIndex(user_vid)
      if (response.code != 0){
        return false
      }
      const docs = response?.document
      let piDoc
      if(docs && docs.length){
        piDoc = docs[0]
        const jsonStr = await this.getPIData(piDoc)
        if (jsonStr == null){
        }
        this.PI_docID = jsonStr[0]?.id
        const pItoS3Helper = new PItoS3Helper(this.indexTablesDao)
        pItoS3Helper.converS3ToDBS(jsonStr)
      }else{
        log.error('restorePI did not find a document')
      }
      const isFinishedInsert = await this.updatePI_mtime()
      await this.backUpPI(piDoc)
      return true
    }

    /**
     * retrieveLatestDoc
     */
    private async retrieveLatestDoc(user_vid,lastestDocId:string) {
        const idList = [user_vid]
        const requestOptions:any = {
            ObjType: 1344,
            scondition: `D.type not in (1793)`,
            asc: false,
            obfname: 'D.mtime',
            loid: lastestDocId,
        }
        let rawResponse
        await store.level2SDK.documentServices
          .retrieveDocument({
            idList,
            options: requestOptions,
          }).then((res)=>{
            rawResponse = res.data
            const documents = u.reduce(
              u.array(res?.data?.document),
              (acc, obj) => (!u.isNil(obj) ? acc.concat(obj) : acc),
              [] as any[],
            )

            return Promise.allSettled(
              documents.map?.(async (document) => {
                //decrypt data
                if (document?.deat?.url) {
                  //skip files that are in S3
                  //these will be retrieved as needed by noodl established prepareDoc util fn
                  return document
                } else {
                  let note: any
                  try {
                    note = await documentToNote({ document })
                  } catch (error) {
                    const err =
                      error instanceof Error ? error : new Error(String(error))
                  }
                  return note
                }
              }),
            )
          }).then((res) => {
            delete rawResponse.document
            rawResponse.document = res.reduce((acc, result) => {
              // @ts-expect-error
              const { status, value: doc } = result
              return status === 'fulfilled' && !u.isNil(doc)
                ? acc.concat(doc)
                : acc
            }, [] as any[])
          }).catch((error) => {
            console.error(
              error instanceof Error ? error : new Error(String(error)),
            )
          })
        return rawResponse
    }
    private getPI_mtime() {
        return this.indexTablesDao.getPI_mtime()
    }
    private async updatePI_mtime() {
      const lastestDocId = this.indexTablesDao.getLatestDocId()
      const newTime = new Date().getTime()
      const user_vid = this.getUser_Vid()
      const rawResponse = await this.retrieveLatestDoc(user_vid,lastestDocId) 
      this.mTime = newTime
      return this.insertIndexTable(rawResponse)
      
    }
    private insertIndexTable(response){
      if(response?.document?.length){
        const docs = response?.document
        for (let item of u.filter(Boolean, u.array(docs))) {
          let content = item?.name?.data
          const contentAfterExtraction = basicExtraction(content)
  
          const fuzzyIndexCreator = new FuzzyIndexCreator()
          let docId = item?.id
          if (docId instanceof Uint8Array) {
            docId = store.level2SDK.utilServices.uint8ArrayToBase64(docId)
          }
          log.debug('insert doc',{item})
          for (let key of contentAfterExtraction) {
            const initialMapping = fuzzyIndexCreator.initialMapping(key)
            const fKey = fuzzyIndexCreator.toFuzzyInt64(initialMapping)
            //const fKeyHex = fuzzyIndexCreator.toFuzzyHex(initialMapping)
            const queryRes = this.indexTablesDao.getPIByDocId(item?.id)
            if(queryRes.length){
              const [cols,values] = queryRes[0]
              this.indexTablesDao.deleteIndexByDocId(item?.id)
              this.indexTablesDao.insertAll({
                kText: key,
                docId,
                docType: item.type,
                fKey,
                score: 0,
              })
            }else{
              this.indexTablesDao.insertAll({
                kText: key,
                docId,
                docType: item.type,
                fKey,
                score: 0,
                mtime: item.mtime,
              })
            }
          
            //log.debug('insert to index table!!!', fKey, initialMapping, fKeyHex)
          }
        }
        return true
      }
      return false
    }

    private getUser_Vid() {
        this.user_vid = localStorage.getItem('facility_vid')?
          localStorage.getItem('facility_vid'):
          localStorage.getItem('user_vid')
        return this.user_vid
    }

    public async isAdmin(){
      const user_vid = this.getUser_Vid()
      const idList = [user_vid]
      const requestOptions:any = {
          ObjType: '4',
          scondition: 'E.type in (1100,1200) AND V.type=20',
          xfname: 'E.bvid',
          ids: idList,
      }
      await store.level2SDK.vertexServices
        .retrieveVertex({
          idList: [],
          options: requestOptions,
        }).then((res)=>{
          const vertexs = res?.data?.vertex
          if(vertexs && vertexs.length){
            this.isadmin = true
            // this.setRootNoteBookId(this.getAdminConnectedEdgeId())
          }
        })
      return this.isadmin
    }

    //get 110 or 1200edge
    public async getAdminConnectedEdgeId() {
      const facility_vid = localStorage.getItem('facility_vid')
      const user_vid = localStorage.getItem('user_vid')
      const idList:any[] = [user_vid,facility_vid]
      const requestOptions:any = {
        scondition: 'type in (1100,1200)',
        xfname: 'bvid,evid',
        // ids: idList,
      }
      let rawResponse
      let eid
      await store.level2SDK.edgeServices
        .retrieveEdge({
          idList,
          options: requestOptions,
        }).then((res)=>{
          const edge = res?.data?.edge
          if(edge && edge.length){
            rawResponse = edge[0]
            rawResponse = replaceUint8ArrayWithBase64(rawResponse)
            eid = rawResponse?.eid
          }
        })
        
      return eid
    }

    public setRootNoteBookId(rootNoteBookId){
      this.rootNoteBookId = rootNoteBookId
    }


}