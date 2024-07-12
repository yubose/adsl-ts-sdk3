import FuzzyIndexCreator from '../utils/FuzzyIndexCreator'
import PersonalIndexCtr from '../utils/PersonalIndexCtr'
import store from '../../common/store'
import log from '../../utils/log'

export default class IndexRepository {
  public docTableDao
  public indexTablesDao
  public userDB
  public PersonalIndexCtr

  constructor() {
    // this.userDB = new FrontEndDB()
  }

  public async search(input: string,sCondition:string) {
    if (!input) return
    const fuzzyCreator = new FuzzyIndexCreator()
    const initMapping = fuzzyCreator.initialMapping(input)
    const fuzzyInd = fuzzyCreator.toFuzzyHex(initMapping)
    const res = this.indexTablesDao?.extendAndFuzzySearch({
      kInput: input,
      ins_hex: fuzzyInd,
    })
    log.debug('fuzzysearch', input, res)

    let docs: any[] = []
    if (!res.length) return docs

    const { values } = res[0]
    const flattenValues = values.reduce((acc, id) => {
      if (!acc.includes(id[0])) {
        acc.push(id[0])
      }
      return acc
    }, [])
    docs = this.getDocsByIds(flattenValues,sCondition)
    let returnDocs: any[] = []
    for(let j =0;j<docs.length;j++) {
      const doc = docs[j]
      if (doc?.length) {
        const obj: any = {}
        const { columns, values } = doc[0]
        for (let i = 0; i < columns.length; i++) {
          let prop = columns[i]
          let val = values[0][i]
          if (['deat', 'name'].includes(prop)) {
            obj[prop] = JSON.parse(val)
          } else {
            obj[prop] = val
          }
        }
        returnDocs.push(obj)
      }else{
        const s3Doc = await this.getS3DocById(flattenValues[j])
        returnDocs.push(s3Doc?.document[0])
      }
    }

    return returnDocs
  }
  public async getS3DocById(docId){
    const idList = [docId]
      const requestOptions:any = {
          xfname: 'id',
      }
      let rawResponse
      await store.level2SDK.documentServices
        .retrieveDocument({
          idList,
          options: requestOptions,
        }).then((res)=>{
          rawResponse =res?.data
        })
      //insert into doc table
      const doc = rawResponse?.document[0]
      this.cacheDoc(doc)
      return rawResponse
  }
  public async getDataBase(config) {
    if (config) {
      await this.userDB.getDatabase(config)
      this.docTableDao = this.userDB.DocTableDao
      this.indexTablesDao = this.userDB.IndexTablesDao
      this.PersonalIndexCtr = new PersonalIndexCtr(this.indexTablesDao)
    }
  }

  public indexTableIsEmpty() {
    return this.indexTablesDao?.getCount() === 0
  }

  public insertIndexData(personalIndexTables) {
    this.indexTablesDao?.insertAll(personalIndexTables)
  }

  public getTypeById(did) {
    return this.indexTablesDao?.getTypeById(did)
  }

  public deleteIndexByDocId(did) {
    this.indexTablesDao?.deleteIndexByDocId(did)
  }

  public getPIByDocId(did) {
    return this.indexTablesDao?.getPIByDocId(did)
  }

  public getkTextByDid(docId) {
    return this.indexTablesDao?.getAllkTextByDid(docId)
  }

  public getAllDocId() {
    return this.indexTablesDao?.getAllDocId()
  }

  public getAllDocByFkey({ kInput, ins_hex }) {
    return this.indexTablesDao?.extendAndFuzzySearch({ kInput, ins_hex })
  }

  public getDocById(did) {
    return this.docTableDao?.getDocById?.(did)
  }

  public cacheDoc(doc) {
    this.docTableDao?.insertDoc(doc)
  }

  public deleteCachedDocById(did) {
    return this.docTableDao?.deleteDocById(did)
  }

  public getDocsByIds(relatedDocsIds,sCondition) {
    let result: any[] = []
    for (let did of relatedDocsIds) {
      result.push(this.docTableDao?.getDocById?.(did,sCondition))
    }
    return result
  }

  public getDocsByPageId(pageId) {
    return this.docTableDao?.getDocsByPageId(pageId)
  }

  public getLastestDocsByType(payload){
    return this.docTableDao?.getLastestDocsByType(payload?.type)
  }

  public getAllDocsByType(payload){
    return this.docTableDao?.getAllDocsByType(payload?.type)
  }
}
