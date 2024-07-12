import store from '../../common/store'
import Document, {documentToNote} from '../../services/Document'
import {retrieveDocument, retrieveEdge, retrieveVertex} from '../../common/retrieve'
import get from 'lodash/get'
import set from 'lodash/set'
import uniqBy from 'lodash/uniqBy'
import uniq from 'lodash/uniq'
import getIdList from '../../utils/getIdList'
import isPopulated from '../../utils/isPopulated'
import log, { adminBugLog } from '../../utils/log'
import {UnableToLocateValue} from '../../errors'
import AiTmedError from '../../common/AiTmedError'
import {replaceUint8ArrayWithBase64} from '../utils'
import {cloneDeep, differenceWith,filter, find, isArray, orderBy, remove} from 'lodash'
import * as u from '@jsmanifest/utils'
import {getHalfkey} from './encrypt'
import indexLocalForage from './localforage'
import replaceEidWithId from '../../utils/replaceEidWithId'
import { generateOrderNumber, removeDiffKeys } from './utils'
import apiAxios from '../../axios/proxyAxios'
import moment from 'moment'
import utils from './utils'
import round from 'lodash/round'
import elasticsearch from './elasticsearch'
import { detailDiffObject,formatInsuranceList,formatDetailDiff,addressTransformInsuranceList } from './utils'
import { medicalInsuranceKey,workersCompKey,personInjuryKey } from './constant'
// import encryptionServices from './ecc'
// import { customAlphabet } from 'nanoid'
/**
 * @function
 * @description get 0 or 1 from the specified bit
 * @param {string} sourceNum
 * @param {number} bit
 * @returns {number}
 */
function getBitValue(sourceNum, bit) {
  let value = parseInt(sourceNum).toString(2)
  let len = value.length
  return value[len - bit]
}
/**
 * @function
 * @description Set 0 or 1 to the specified bit
 * @param {string} sourceNum => original number
 * @param {number} bit => target bit
 * @param {1|0} targetValue => target value for target bit
 * @returns {number}
 */
function setBitValue(sourceNum, bit, targetValue: 1 | 0) {
  let value = parseInt(sourceNum).toString(2)
  let len = value.length
  let valueArray = value.split('')
  valueArray.splice(len - bit, 1, targetValue.toString())
  let newValue = valueArray.join('')
  return parseInt(newValue, 2)
}
const shareDoc = async({ sourceDoc, targetEdgeID, targetRoomName, targetFileID, reid })=> {
    const resp = await retrieveDocument(sourceDoc.id)
    const document = resp?.data?.document?.length
      ? resp?.data?.document[0]
      : null
    const note = await documentToNote({ document })
    let content = note?.name?.data
    if (typeof content === 'string') {
      content = await store.level2SDK.utilServices.base64ToBlob(
        note?.name?.data,
        note?.name?.type,
      )
    }
    const sharedDoc = await Document.create({
      atimes: -10,
      content,
      targetRoomName,
      title: note?.name?.title,
      paymentNonce: note?.name?.nonce,
      user: note?.name?.user,
      type: note?.type,
      edge_id: targetEdgeID,
      mediaType: note?.name?.type,
      fid: targetFileID,
      reid: reid,
      tage: note?.tage,
      dTypeProps: note.subtype
    })
  return replaceUint8ArrayWithBase64(sharedDoc)
  }
const shareDocList = async({
    sourceDocList,
    targetEdgeID,
    targetRoomName,
    targetFileID,
    reid,
    fidPointToSelf = false
  })=>{
    //check if eid has been dereferenced
    if (!isPopulated(targetEdgeID)) {
      throw new UnableToLocateValue(`Missing reference ${targetEdgeID} in function "shareDocList`)
    }
    const resp = await retrieveEdge(targetEdgeID)
    const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        const resp = await retrieveDocument(sourceDoc.id)
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        const note = await documentToNote({ document })
        let content = note?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }
        const oldFid = note?.id
        const doc = await Document.create({
          content,
          targetRoomName,
          title: note?.name?.title,
          user: note?.name?.user,
          type: note?.type,
          paymentNonce: note?.name?.nonce,
          edge_id: targetEdgeID,
          mediaType: note?.name?.type,
          fid: fidPointToSelf ? oldFid : targetFileID,
          reid: reid,
          dTypeProps: note.subtype,
          tage: note.tage,
          atimes: -10
        })
        return replaceUint8ArrayWithBase64(doc['doc'])
      }),
    )
  }


const shareSourceDocList = async({
  sourceDocList,
  targetEdgeID,
  targetRoomName,
  targetFileID,
  reid,
  fidPointToSelf = false
})=>{
  //check if eid has been dereferenced
  if (!isPopulated(targetEdgeID)) {
    throw new UnableToLocateValue(`Missing reference ${targetEdgeID} in function "shareDocList`)
  }
  const resp = await retrieveEdge(targetEdgeID)
  const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
  if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

  return await Promise.all(
    sourceDocList.map(async (sourceDoc) => {
      let content = sourceDoc?.name?.data
      const doc = await Document.create({
        content,
        targetRoomName,
        title: sourceDoc?.name?.title,
        user: sourceDoc?.name?.user,
        type: sourceDoc?.type,
        paymentNonce: sourceDoc?.name?.nonce,
        edge_id: targetEdgeID,
        mediaType: sourceDoc?.name?.type,
        fid: fidPointToSelf ? sourceDoc.id : targetFileID,
        reid: reid,
        dTypeProps: sourceDoc.subtype,
        tage: sourceDoc.tage,
        atimes: -10,
        vendorId: sourceDoc?.name?.vendorId
      })
      return replaceUint8ArrayWithBase64(doc['doc'])
    }),
  )
}
export default {
  async storeFourGDevicesInfo({ 
    eid
  }: {
    eid: string
  }) {

    const docOptions: any = {
      type: 471041,
      obfname: "mtime",
      xfname: 'eid',
      maxcount: "-1",
    }
    const devideInfoResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [eid],
      options: docOptions
    })
    const devideInfos = devideInfoResp.data.document
    let dataInfos = new Array<{
      data: Object
      dataType: string
      deviceId: string
      modelNumber: string
      deviceType: string
      deviceCtime: string
      _id: string
    }>()

    for(let i= 0; i < devideInfos.length; i++) {
      const deviceInfo = await documentToNote({document: devideInfos[i]})
      const id = deviceInfo.name.data.deviceInfo.serialNumber
      // const response = await axios.get(`https://api.aitmed.io:443/api/fourg/getByDeviceId?deviceId=${id}`)
      const response = await apiAxios("proxy")({
        method: "get",
        url: "/api/fourg/getByDeviceId",
        params: {
          deviceId: id
        }
      })
      // const response = await axios.get(`http://127.0.0.1:5001/api/fourg/getByDeviceId?deviceId=${id}`)
      if(response.hasOwnProperty('data') && response.data.hasOwnProperty('data')) {
        dataInfos = dataInfos.concat(response.data.data)
      } else {
        dataInfos = dataInfos.concat(response.data)
      }
    }

    const idList = new Array<string>()
    if (dataInfos.length === 0) return
    for(let i = 0; i < dataInfos.length; i++) {
      const data = dataInfos[i]
      try {
        const resp = await Document.create({
          edge_id: eid,
          atimes: -10,
          content: data.data,
          title: data.deviceType,
          paymentNonce: data.deviceCtime,
          type: parseInt(data.dataType)
        })
        if(resp.code === 0) {
          idList.push(data._id)
        }
      } catch (error) {
        
      }
    }
    await apiAxios("proxy")({
      method: "post",
      url: "/api/fourg/backupById",
      data: {
        idList
      }
    })
  },


  async createTemplateImage({ EId, imageList }) {
    const res = {}
    if(u.isArr(imageList)) {
      const length = imageList.length
      for(let i = 0; i < length; i++) {
        const image = imageList[i]
        if(u.isObj(image) && 'key' in image && 'value' in image) {
          const data = store.level2SDK.utilServices.base64ToBlob(
            image.value.split(',')[1],
            image.value.split(',')[0].match(/:(.*?);/)[1]
          )
          const response = await Document.create({
            edge_id: EId,
            type: 430081,
            atimes: -10,
            content: data,
            dTypeProps: {
              isOnServer: 0
            },
            mediaType: "image/*",
          })
          // @ts-ignore
          res[image.key] = store.level2SDK.utilServices.uint8ArrayToBase64(response.doc.id)
        }
      }
    }
    return res
  },
  async retrieveTemplateImage({ 
    idList, 
    ids 
  }: { 
    idList: Record<any, any>
    ids: Record<string, {
      id: string
      fileName: string
      status: boolean
      isReadOnly: boolean
      imgPath: string
    }>
  }) {
    if(u.isObj(ids)) {
      const keys = Object.keys(ids)
      const length = keys.length
      for(let i = 0; i < length; i++) {
        const key = keys[i]
        const resp = await retrieveDocument(idList[key])
        const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
        await documentToNote({ document }).then(
          (note) => {
            let blob = store.level2SDK.utilServices.base64ToBlob(
              note?.name?.data,
              note?.name?.type,
            )
            ids[key].id = key
            ids[key].imgPath = URL.createObjectURL(blob)
          },
          (error) => {
            if (store.env === 'test') {
              log.error(error instanceof Error ? error : new Error(String(error)))
            }
          },
        )
      }
    }
    return ids
  },
  async patientSearchInfo({ facilityId }) {
    // 处理病人索引并放置在 indexdb
    //get patientIndexTableDoc
    const docOptions: any = {
      type: 337921,
      xfname: 'ovid',
      maxcount: "1",
      obfname: "mtime"
    }
    const indexTableResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions,
    })
    const indexTable = indexTableResp.data.document[0]
    let data:Array<object> = []
    let newLatestId
    let saveDocId
    let updateEid
    let lastModifiedTime = 0
    let decryptedDoc
    let sCondition:string = "E.type in (10002,-10002) AND E.subtype=131072"
    if (indexTable) {
      decryptedDoc = await documentToNote({ document: indexTable })
      data = decryptedDoc.name.data.patientSearchInfo
      newLatestId = decryptedDoc.name.data.latestId
      if (decryptedDoc.name.data.lastModifiedTime) {
        lastModifiedTime = decryptedDoc.name.data.lastModifiedTime
      }
      sCondition = `E.type in (10002,-10002) AND E.subtype=131072 AND D.mtime>${lastModifiedTime*1000000}`
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.eid)
      saveDocId = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.id)
    } 
    const docOptions2: any = {
      ObjType: 28,
      type: 102401,
      xfname: 'E.bvid|E.evid',
      scondition: sCondition,
      sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E ON E.id=D.eid\"}",
      obfname: "D.mtime",
      maxcount: "10000",
    }
    const docResponse2 = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions2,
    })
    let documents: Array<Object> = docResponse2.data.document
    let items = await Promise.allSettled(
        documents.map(async (doc) => {
          let note: any
          try {
            note = await documentToNote({ document: doc })
          } catch (error) {
            const err =
                error instanceof Error ? error : new Error(String(error))
            log.error(err, { note, error: err, document: doc })
          }
          return note
        })
    ) as {status: 'fulfilled' | 'rejected', value}[]
    const getStatus = async(id) =>{
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [id],
        options: {
          ObjType: 28,
          xfname: "E.id",
          sfname: "{\"join\":\"INNER JOIN Vertex V ON E.evid = V.id OR E.bvid = V.id\",\"result\":\"E.*\"}",
          sCondition: "E.type in (10002,-10002) AND E.subtype=131072 AND V.type=20",
          maxcount: 1          
        }
      })
      const edgeNote = replaceUint8ArrayWithBase64(edgeResponse.data.edge[0])
      const patientId = (
        edgeNote.bvid === facilityId 
        ? edgeNote.evid 
        : edgeNote.bvid
      )
      const patientVertexResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [patientId],
      })
      if(patientVertexResp.data.vertex[0].type === 3) return "Internal"
      // return edgeResponse.data.edge.length > 0 ? (edgeResponse.data.edge[0].type == '-10002' ? 'Deleted' : "Active") : 'Deleted'
      return (
        edgeResponse.data.edge.length > 0 ?
          edgeResponse.data.edge[0].type == '10002' ?
            edgeResponse.data.edge[0].tage === -5 ?
              "Internal"
              : "Active"
            : 'Deleted'
          : 'Deleted'
      )
    }
    let newRespData : Array<any> = []
    newRespData = await Promise.all(
        items.map(async (doc) => {
          if(doc.status === 'fulfilled') {
            const connectEdgeid = store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.eid)
            return {
              '10002id': connectEdgeid, //10002 的id 用来去重
              'id': store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.id), //profile的id
              'fullName': doc.value.name.data.basicInfo?.fullName || doc.value.name.data.fullName,
              'dateOfBirth': doc.value.name.data.basicInfo?.dateOfBirth || doc.value.name.data.dateOfBirth,
              'phoneNumber': doc.value.name.data.basicInfo?.phone || doc.value.name.data.phone,
              'gender': doc.value.name.data.basicInfo?.gender || doc.value.name.data.gender,
              'status': await getStatus(connectEdgeid)
            }
          }
        })
    )
    // 如果没有获取到新数据 则直接返回
    if (
        (newRespData.length === 0) || 
        (newRespData.length === 1 && items[0]["value"]['mtime'] === get(decryptedDoc,"name.data.lastModifiedTime"))
      ) {
      log.log('no new patient ,return directly');
      //
      const indexdbKeys = await indexLocalForage.keys()
      if (!indexdbKeys.includes('patientIndex')) {
        // 之前已经有过了，所以不需要重复的设置
        indexLocalForage.setItem('patientIndex',data)
      }
      return
    } else {
      lastModifiedTime = items[0]["value"]['mtime']
    }
    data = newRespData.concat(data)
    const removeDuplicates = (dataArray:Array<{}>)=>{
        const seenIds = new Set();
        const result = [];
        for (const item of dataArray) {
            const key = `${item["10002id"]}-${item["id"]}`;
            if (!seenIds.has(key)) {
                seenIds.add(key);
                //@ts-ignore
                result.push(item);
            }
        }
        return result;
    }
    let obj = removeDuplicates(data)
    if (saveDocId) {
      log.log('delete origin doc ,and create new one ');
      await store.level2SDK.commonServices.deleteRequest([saveDocId])
    } else {
      // 首次创建 需要获取 eid
      const options: any = {
        type: 10000,
        xfname: 'bvid',
        obfname: "ctime"
      }
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [facilityId],
        options: options,
      })
      const eid = edgeResponse.data.edge[0].eid
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(eid)
    }
    await Document.create({
      edge_id: updateEid,
      content: {
        'patientSearchInfo': obj,
        'latestId': newLatestId,
        'lastModifiedTime': lastModifiedTime
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json',
      type: 337921,
    })
    await indexLocalForage.removeItem('patientIndex')
    indexLocalForage.setItem('patientIndex',obj)
    return
  },
  async queryPatientSearchInfo({ facilityId }) {
    // 处理病人索引并放置在 indexdb
    //get patientIndexTableDoc
    const docOptions: any = {
      type: 337921,
      xfname: 'ovid',
      maxcount: "1",
      obfname: "mtime"
    }
    const indexTableResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions,
    })
    const indexTable = indexTableResp.data.document[0]
    let data:Array<object> = []

    let decryptedDoc
    if (indexTable) {
      decryptedDoc = await documentToNote({ document: indexTable })
      data = decryptedDoc.name.data.patientSearchInfo
      log.debug('test10',data)
      if(u.isArr(data)){
        const errorData:any[] = []
        for(let i=0;i<data.length;i++){
          try{
            const patientInfo = data[i]
            const idOfConnection = patientInfo['10002id']
            const connectionEdge = await store.level2SDK.edgeServices.retrieveEdge({
              idList: [idOfConnection],
              options: {},
            })
            const bvidVertex = await store.level2SDK.vertexServices.retrieveVertex({
              idList: [connectionEdge.data.edge[0].bvid]
            })
            const evidVertex = await store.level2SDK.vertexServices.retrieveVertex({
              idList: [connectionEdge.data.edge[0].evid]
            })
            let patientVertex:Record<string,any> = bvidVertex.data.vertex[0]
            if(evidVertex.data.vertex[0].type === 1){
              patientVertex = evidVertex.data.vertex[0]
            }
            if(patientVertex.type !== 1) continue
            const options: Record<string,any> = {
              type: 102401,
              xfname: 'ovid',
              maxcount: "1",
              obfname: "mtime"
            }
            const profileDoc = await store.level2SDK.documentServices.retrieveDocument({
              idList: [patientVertex.id],
              options: options,
            })
            const profile = profileDoc.data.document[0]
            const decryptedpProfileDoc = await documentToNote({ document: profile })
            const newPhone = decryptedpProfileDoc.name?.data?.basicInfo?.phone
            const indexPhone = patientInfo['phoneNumber']
            const indexFullName = patientInfo['fullName']

            let newFullName = decryptedpProfileDoc.name?.data?.basicInfo?.fullName
            newFullName = newFullName?newFullName:`${decryptedpProfileDoc.name?.data?.basicInfo?.firstName} ${decryptedpProfileDoc.name?.data?.basicInfo?.lastName}`
            log.debug(`[query and compare] ${i+1}/${data.length}`,{
              patientInfo,
              decryptedpProfileDoc
            })
            if(u.isStr(newFullName) && u.isStr(newPhone) && u.isStr(indexFullName) && u.isStr(indexPhone)){
              const handledFullName = newFullName.replace(/\s*/g,'').toString().toLowerCase()
              const indexName = indexFullName.replace(/\s*/g,'').toString().toLowerCase()
              if(indexName !== handledFullName){
                errorData.push({
                  errMessage: 'Mismatched fullName',
                  ...patientInfo,
                  newFullName,
                  newPatientId: store.level2SDK.utilServices.uint8ArrayToBase64(patientVertex.id),
                  newPhone,
                })
              }else if(newPhone !== indexPhone){
                errorData.push({
                  errMessage: 'Mismatched phone number',
                  ...patientInfo,
                  newFullName,
                  newPatientId: store.level2SDK.utilServices.uint8ArrayToBase64(patientVertex.id),
                  newPhone
                })
              }   
            }else{
              log.debug(`[query and compare] no name or phoneNumber`,{
                patientInfo,
                decryptedpProfileDoc
              })
            }
          }catch(error){
            log.debug(`[query and compare]`,error)
            continue
          }
          
          // break
        }

        log.debug(`[query and  ]`,errorData)
      }

    }

    
  },
  async providerSearchInfo({ facilityId }) {
    // 处理医生索引并放置在 indexdb
    //get providerIndexTableDoc
    const docOptions: any = {
      type: 340481,
      xfname: 'ovid',
      maxcount: "1",
      obfname: "mtime"
    }
    const indexTableResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions,
    })
    const indexTable = indexTableResp.data.document[0]
    let data:Array<object> = []
    let newLatestId:string|null = ''
    let saveDocId:string = ''
    let updateEid:string = ''
    let asc:Boolean = false 
    if (indexTable) {
      const decryptedDoc = await documentToNote({ document: indexTable })
      data = decryptedDoc.name.data.providerSearchInfo
      newLatestId = decryptedDoc.name.data.latestId ? decryptedDoc.name.data.latestId : data[0]['profileId']
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.eid)
      saveDocId = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.id)
      asc = true  //false 降序 true 升序
    } else {
      data = []
    }
    const docOptions2: any = {
      ObjType: 28,
      type: 35841,
      xfname: 'E.bvid|E.evid',
      sCondition: "E.type in (10002,-10002) AND E.tage in (1,-5) AND E.subtype&0xf0000=0x30000",
      scondition: "E.type in (10002,-10002) AND E.tage in (1,-5) AND E.subtype&0xf0000=0x30000",
      sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Vertex V on V.id = D.ovid INNER JOIN Edge E ON E.bvid = V.id OR E.evid = V.id\"}",
      maxcount: "10000",
      obfname: "D.mtime",
      loid: newLatestId,
      asc: asc,
    }
    const docResponse2 = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions2,
    })
    let respDocList = docResponse2.data.document
    if (respDocList.length === 0) { 
      log.log('no new provider ,return directly');
      const indexdbKeys = await indexLocalForage.keys()
      if (!indexdbKeys.includes('providerIndex')) {
        // 之前已经有过了，所以不需要重复的设置
        indexLocalForage.setItem('providerIndex',data)
      }
      return 
    }
    if (asc) {
      respDocList = respDocList.reverse()
    }
    const unique = (arr,val,val2)=>{
      if (arr.length === 0) {
        return []
      }

      const res = new Map();
      return arr.filter(item => {
        if (item[val] === '' || item[val2] === '') {
        return true
        }
        if (!item) {
          return false
        }
        return !(res.has(item[val]) || res.has(item[val2])) && (res.set(item[val], 1) && res.set(item[val2],1))
      })
    }
    let decryptedDocList = await Promise.allSettled(
      respDocList.map(async (doc) => {
        let note: any
        try {
          note = await documentToNote({ document: doc })
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error(String(error))
          log.error(err, { note, error: err, document: doc })
        }
        return note
      })
    ) as {status: 'fulfilled' | 'rejected', value}[]
    const getStatus = async(prodId,connectEdge) =>{
      const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [prodId],
        options: {
          xfname: "id",
        },
      })
      const vertexType = vertexResp.data.vertex?.[0].type
      if (vertexType < 0) {
        return "Deleted"
      } 
      if (connectEdge.type == 10002 && connectEdge.tage > 0) {
        return "Active"
      }
      return "Inactive"
    }
    const get10002Edge = async(providerId)=>{
      const edgeResp = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [facilityId,providerId],
        options: {
          xfname: "(bvid,evid)|(evid,bvid)",
          scondition: "type in (10002,-10002) AND subtype&0xf0000=0x30000",
          maxcount: "1",
          obfname: "mtime"
        },
      })
      return edgeResp.data.edge[0] //[store.level2SDK.utilServices.uint8ArrayToBase64(edgeResp.data.edge[0].eid || edgeResp.data.edge[0].id),edgeResp.data.edge[0].type,edgeResp.data.edge[0].tage]
    }
    let newRespData : Array<any> = []
    newRespData = await Promise.all(
      decryptedDocList.map(async (doc) => {
        if(doc.status === 'fulfilled') {
          const prodId = store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.bsig) //provider id
          const connectEdge = await get10002Edge(prodId)    // 获取10002的状态
          if (!connectEdge) {
            // 如果没查到 说明可能是一个老的数据 10002 可能被删掉了，不返回 10002 的id
            return {
              '10002id': '', //10002 的id 用来去重
              'status': 'Inactive',
              "prodid": prodId,
              "profileId": store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.id),
              'fullName': doc.value.name.data.fullName,
              'gender': doc.value.name.data.gender,
              'phoneNumber': doc.value.name.data.phone,
              'selectedSpecialty': doc.value.name.data.selectedSpecialty,
              'title': doc.value.name.data.title,
            }
          }
          return {
            '10002id': store.level2SDK.utilServices.uint8ArrayToBase64(connectEdge.eid ? connectEdge.eid : connectEdge.id), //10002 的id 用来去重
            'status': await getStatus(prodId,connectEdge),
            "prodid": prodId,
            "profileId": store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.id),
            'fullName': doc.value.name.data.fullName,
            'gender': doc.value.name.data.gender,
            'phoneNumber': doc.value.name.data.phone,
            'selectedSpecialty': doc.value.name.data.selectedSpecialty,
            'title': doc.value.name.data.title,
          }
        }
      })
    )
    data = newRespData.concat(data)
    let uniquedProList = unique(data,'10002id','prodid')
    newLatestId = data[0]['profileId']
    if (saveDocId) {
      log.log('delete origin doc ,and create new one ');
      await store.level2SDK.commonServices.deleteRequest([saveDocId])
    } else {
      // 首次创建 需要获取 eid
      const options: any = {
        type: 10000,
        xfname: 'bvid',
        obfname: "ctime"
      }
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [facilityId],
        options: options,
      })
      const eid = edgeResponse.data.edge[0].eid
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(eid)
    } 
    await Document.create({
      edge_id: updateEid,
      content: {
        'providerSearchInfo': uniquedProList,
        'latestId': newLatestId
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json',
      type: 340481,
    })
    await indexLocalForage.removeItem('providerIndex')
    indexLocalForage.setItem('providerIndex',uniquedProList)
    return 
  },
  async aitmedStoreInfo({superAdminId}:{superAdminId: string}) {
    // const facilityId = localStorage.getItem('user_vid') as string
    log.debug("facilityId", superAdminId)
    // 处理产品索引并放置在 indexdb
    //get aitmedStoreIndexTableDoc
    const docOptions: any = {
      type: 417281,
      xfname: 'ovid',
      maxcount: "1",
      obfname: "ctime"
    }
    const indexTableResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [superAdminId],
      options: docOptions,
    })
    const indexTable = indexTableResp.data.document[0]
    let data:Array<object> = []
    let newLatestId
    let saveDocId
    let updateEid
    let lastModifiedTime = 0
    let decryptedDoc
    let sCondition:string = ""
    if (indexTable) {
      decryptedDoc = await documentToNote({ document: indexTable })
      data = decryptedDoc.name.data.aitmedStoreSearchInfo
      newLatestId = decryptedDoc.name.data.latestId
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.eid)
      saveDocId = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.id)
      if (decryptedDoc.name.data.lastModifiedTime) {
        lastModifiedTime = decryptedDoc.name.data.lastModifiedTime
      }
      sCondition = `mtime>${lastModifiedTime*1000000}`
    }
    const docOptions2: any = {
      type: 197121,
      xfname: 'ovid',
      obfname: "mtime",
      maxcount: "1000",
      scondition: sCondition,
      asc: false,
    }
    const docResponse2 = await store.level2SDK.documentServices.retrieveDocument({
      idList: [superAdminId],
      options: docOptions2,
    })
    let documents: Array<Object> = docResponse2.data.document
    let items = await Promise.allSettled(
      documents.map(async (doc) => {
        let note: any
        try {
          note = await documentToNote({ document: doc })
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error(String(error))
          log.error(err, { note, error: err, document: doc })
        }
        return note
      })
    ) as {status: 'fulfilled' | 'rejected', value}[]
    let newRespData : Array<any> = []
    newRespData = await Promise.all(
      items.map(async (doc) => {
        if(doc.status === 'fulfilled') {
          if(doc.value.name.data.basicInfo.productStatus.value === 'Archived'){
            log.debug("ITEM", doc.value.name.data.basicInfo.productStatus)
          }
          return {
            'id': store.level2SDK.utilServices.uint8ArrayToBase64(doc.value.id), //profile的id
            'title': doc.value.name.data.basicInfo.title,
            'type': doc.value.name.data.basicInfo.type,
            'coverImgId': doc.value.name.data.coverImgId,
            'price': doc.value.name.data.pricing.price,
            'status': doc.value.name.data.basicInfo.productStatus.value,
            'inventory': doc.value.name.title,
            'options': doc.value.name.data.options.optionSpliceStr,
            'vendor': doc.value.name.data.basicInfo.vendor,
            'committed': doc.value.name.user || "0",
          }
        }
      })
    )
    if (
      (newRespData.length === 0) ||
      (newRespData.length === 1 && items[0]["value"]['mtime'] === decryptedDoc?.name?.data.lastModifiedTime)
    ) {
      log.log('no new aitmedStore ,return directly');
      // 
      const indexdbKeys = await indexLocalForage.keys()
      if (!indexdbKeys.includes('aitmedStoreIndex')) {
        indexLocalForage.setItem('aitmedStoreIndex', data)
      }
      return data
    } else {
      lastModifiedTime = items[0]["value"]['mtime']
    }
    data = newRespData.concat(data)
    const unique = (arr,val)=>{
      if (arr.length === 0) {
        return []
      }
      const res = new Map();
      return arr.filter(item => !(res.has(item[val])) && (res.set(item[val], 1)))
    }
    let obj = unique(data,'id')
    if (saveDocId) {
      log.log('delete origin doc ,and create new one ');
      await store.level2SDK.commonServices.deleteRequest([saveDocId])
    } else {
      // 首次创建 需要获取 eid
      const options: any = {
        type: 10000,
        xfname: 'bvid',
        obfname: "mtime"
      }
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [superAdminId],
        options: options,
      })
      const eid = edgeResponse.data.edge[0].eid
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(eid)
    } 
    await Document.create({
      atimes: -10,
      edge_id: updateEid,
      content: {
        'aitmedStoreSearchInfo': obj,
        'latestId': newLatestId,
        'lastModifiedTime': lastModifiedTime
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json',
      type: 417281,
    })
    await indexLocalForage.removeItem('aitmedStoreIndex')
    indexLocalForage.setItem('aitmedStoreIndex', obj)
    return obj
  },
  async deleteAitmedStoreInfo({ id }) {
    const facilityId = (
      localStorage.getItem('facility_vid') ?
        localStorage.getItem('facility_vid') :
        localStorage.getItem('user_vid')
    ) as string
    log.debug("facilityId", facilityId)
    // 处理产品索引并放置在 indexdb
    //get aitmedStoreIndexTableDoc
    const docOptions: any = {
      type: 417281,
      xfname: 'ovid',
      maxcount: "1",
      obfname: "ctime"
    }
    const indexTableResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: docOptions,
    })
    const indexTable = indexTableResp.data.document[0]
    let data:Array<object> = []
    let newLatestId
    let saveDocId
    let updateEid
    let lastModifiedTime = 0
    if(indexTable) {
      const decryptedDoc = await documentToNote({ document: indexTable })
      log.debug('解密后的文档');
      log.debug(decryptedDoc);
      data = decryptedDoc.name.data.aitmedStoreSearchInfo
      newLatestId = decryptedDoc.name.data.latestId
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.eid)
      saveDocId = store.level2SDK.utilServices.uint8ArrayToBase64(decryptedDoc.id)
      if (decryptedDoc.name.data.lastModifiedTime) {
        lastModifiedTime = decryptedDoc.name.data.lastModifiedTime
      }
    } else {
      data = []
    }
    const len = data.length
    data = data.filter(item => {
      // @ts-ignore
      return item.id !== id
    })
    if(data.length < len && saveDocId) {
      log.log('delete origin doc ,and create new one ');
      await store.level2SDK.commonServices.deleteRequest([saveDocId])
    } else {
      // 首次创建 需要获取 eid
      const options: any = {
        type: 10000,
        xfname: 'bvid',
        obfname: "ctime"
      }
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [facilityId],
        options: options,
      })
      const eid = edgeResponse.data.edge[0].eid
      updateEid = store.level2SDK.utilServices.uint8ArrayToBase64(eid)
    }
    newLatestId = data[0]['id']
    lastModifiedTime = data[0]['mtime']
    await Document.create({
      atimes: -10,
      edge_id: updateEid,
      content: {
        'aitmedStoreSearchInfo': data,
        'latestId': newLatestId,
        'lastModifiedTime': lastModifiedTime
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json',
      type: 417281,
    })
    await indexLocalForage.removeItem('aitmedStoreIndex')
    indexLocalForage.setItem('aitmedStoreIndex', data)
  },
  async procedureCodeInfo({facilityId,eid}:{facilityId:string,eid:string}){
    // 获取是否已经创建index doc
    const procedureIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 419841,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    // 获取procedure code list时的scondition
    let searchCondition: string = "type in (309760,312320)" 
    // procedure code list 
    let procedureList: {}[] = []
    let procedureInfo:any
    if(procedureIndexResp.data.document.length){
      // 解密后的doc
      procedureInfo = await documentToNote({document: procedureIndexResp.data.document[0]})
      // 如果有值，则设置获取procedure的条件为mtime>lastMtime 
      searchCondition = `type in (309760,312320) AND mtime>${get(procedureInfo,"name.data.lastModifiedTime")*1000000}`
      procedureList = get(procedureInfo,"name.data.procedureList")
    }

    // 获取mtime>lastModifiedTime的list
    const procedureListResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        xfname: "ovid",
        maxcount: 1000,
        asc: false,
        obfname: "mtime",
        scondition: searchCondition
      }
    })
    // 如果获取到新的procedure code则push进list里，并且更新index doc
    // 如果没有获取到新的，直接设置indexDB的item
    if(procedureListResp.data.document.length){
      // 如果获取到自己，且mtime相同，直接返回
      if(procedureListResp.data.document.length===1 && procedureListResp.data.document[0].mtime===get(procedureInfo,"name.data.lastModifiedTime")){
        log.log('no new procedure code, return directly');
        const indexdbKeys = await indexLocalForage.keys()
        if(!indexdbKeys.includes("procedureCodeIndex")){
          indexLocalForage.setItem("procedureCodeIndex",procedureList)
        }
      }else{
        let newListData: {}[] = await Promise.all(procedureListResp.data.document.map(async (eachDoc)=>{
          const eachProcedureCode = await documentToNote({document: eachDoc})  
          return {
            "id": store.level2SDK.utilServices.uint8ArrayToBase64(get(eachProcedureCode,"id")),
            "reid": store.level2SDK.utilServices.uint8ArrayToBase64(get(eachProcedureCode,"esig")),
            "type": get(eachProcedureCode,"type"),
            "quantity": get(eachProcedureCode,"name.data.quantity"),
            "revenueCode": get(eachProcedureCode,"name.data.revenueCode"),
            "hashCode": get(eachProcedureCode,"name.data.hashCode"),
            "modifiers": get(eachProcedureCode,"name.data.modifiers"),
            "isRequireNdc": get(eachProcedureCode,"name.data.isRequireNdc"),
            "folder": get(eachProcedureCode,"name.data.folder"),
            "code": get(eachProcedureCode,"name.data.code"),
            "num": get(eachProcedureCode,"name.data.num"),
            "description": get(eachProcedureCode,"name.data.description"),
            "pos": get(eachProcedureCode,"name.data.pos"),
            "charge": get(eachProcedureCode,"name.data.charge"),
            "panelCode": get(eachProcedureCode,"name.data.panelCode"),
            "ndc": get(eachProcedureCode,"name.data.ndc"),
          }
        }))
        procedureList = [...newListData,...procedureList]
        procedureList = uniqBy(procedureList,"id")
        await indexLocalForage.removeItem('procedureCodeIndex')
        indexLocalForage.setItem("procedureCodeIndex",procedureList)
        // 如果index doc 存在，则删除原先的，然后重建
        if(procedureIndexResp.data.document.length){
          const deleteResp = await store.level2SDK.commonServices.deleteRequest([procedureIndexResp.data.document[0].id])
          if(store.env === "test") {
            log.info(
              "%cDelete Object Response",
              "background: purple;color: white; display: block;",
              deleteResp,
            )
          }
        }
        const createResp = await Document.create({
          edge_id: eid,
          type: 419841,
          atimes: -10,
          content: {
            "lastModifiedTime": procedureListResp.data.document[0].mtime,
            "procedureList": procedureList,
          },
          dTypeProps:{
            isOnServer: 0
          },
          mediaType: 'application/json'
        })
      }
    }else{
      indexLocalForage.setItem("procedureCodeIndex",procedureList)
    }
    return procedureList
  },  
  async deleteProcedureCodeInfo({facilityId,id}:{facilityId: string,id: string}){
    // 获取index doc
    const procedureIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 419841,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    const procedureInfo = await documentToNote({document: procedureIndexResp.data.document[0]})
    let procedureCodeList = get(procedureInfo,"name.data.procedureList")
    // 将该doc从列表中移除
    remove(procedureCodeList,eachCode=>get(eachCode,"id") == id)
    // index db 中移除
    indexLocalForage.setItem("procedureCodeIndex",procedureCodeList)
    // 删除index doc并且重建 
    const deleteResp = await store.level2SDK.commonServices.deleteRequest([procedureIndexResp.data.document[0].id])
    if(store.env === "test") {
      log.info(
        "%cDelete Object Response",
        "background: purple;color: white; display: block;",
        deleteResp,
      )
    }
    const createResp = await Document.create({
      edge_id: procedureInfo.eid,
      type: 419841,
      atimes: -10,
      content: {
        "lastModifiedTime": get(procedureInfo,"name.data.lastModifiedTime"),
        "procedureList": procedureCodeList,
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json'
    })
  },
  // payer info 
  async payerInfo({facilityId,eid}:{facilityId:string,eid:string}){
    // 获取是否已经创建index doc
    const payerIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 422401,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    // 获取payer list时的scondition
    let searchCondition: string = "type in (314880,314881)" 
    // procedure code list 
    let payerList: {}[] = []
    let payerInfo:any
    if(payerIndexResp.data.document.length){
      // 解密后的doc
      payerInfo = await documentToNote({document: payerIndexResp.data.document[0]})
      // 如果有值，则设置获取procedure的条件为mtime>lastMtime 
      searchCondition = `type in (314880,314881) AND mtime>${get(payerInfo,"name.data.lastModifiedTime")*1000000}`
      payerList = get(payerInfo,"name.data.payerList")
    }

    // 获取mtime>lastModifiedTime的list
    const payerListResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        xfname: "ovid",
        maxcount: 1000,
        asc: false,
        obfname: "mtime",
        scondition: searchCondition
      }
    })

    // 如果获取到新的procedure code则push进list里，并且更新index doc
    // 如果没有获取到新的，直接设置indexDB的item
    if(payerListResp.data.document.length){
      // 如果获取到自己，且mtime相同，直接返回
      if(payerListResp.data.document.length===1 && payerListResp.data.document[0].mtime===get(payerInfo,"name.data.lastModifiedTime")){
        log.log('no new payer, return directly');
        const indexdbKeys = await indexLocalForage.keys()
        if(!indexdbKeys.includes("payerIndex")){
          indexLocalForage.setItem("payerIndex",payerList)
        }
      }else{
        let newListData: {}[] = await Promise.all(payerListResp.data.document.map(async (eachDoc)=>{
          const eachPayer = await documentToNote({document: eachDoc})  
          return {
            "id": store.level2SDK.utilServices.uint8ArrayToBase64(get(eachPayer,"id")),
            "type": get(eachPayer,"type"),
            "payerName": get(eachPayer,"name.data.payerName"),
            "payerID": get(eachPayer,"name.data.payerID"),
            "phone": get(eachPayer,"name.data.phone"),
            "state": get(eachPayer,"name.data.state"),
            "payerType": get(eachPayer,"name.data.payerType"),
            "billingType": get(eachPayer,"name.data.billingType"),
            "fullAddress": get(eachPayer,"name.data.fullAddress"),
            "address1": get(eachPayer,"name.data.address1"),
            "address2": get(eachPayer,"name.data.address2"),
            "city": get(eachPayer,"name.data.city"),
            "contact": get(eachPayer,"name.data.contact"),
            "county": get(eachPayer,"name.data.county"),
            "email": get(eachPayer,"name.data.email"),
            "fax": get(eachPayer,"name.data.fax"),
            "insuranceType": get(eachPayer,"name.data.insuranceType"),
            "zip": get(eachPayer,"name.data.zip"),
            "insuranceProgram": get(eachPayer,"name.data.insuranceProgram"),
          }
        }))
        payerList = [...newListData,...payerList]
        payerList = uniqBy(payerList,"id")
        await indexLocalForage.removeItem('payerIndex')
        indexLocalForage.setItem("payerIndex",payerList)
        // 如果index doc 存在，则删除原先的，然后重建
        if(payerIndexResp.data.document.length){
          const deleteResp = await store.level2SDK.commonServices.deleteRequest([payerIndexResp.data.document[0].id])
          if(store.env === "test") {
            log.info(
              "%cDelete Object Response",
              "background: purple;color: white; display: block;",
              deleteResp,
            )
          }
        }
        const createResp = await Document.create({
          edge_id: eid,
          type: 422401,
          atimes: -10,
          content: {
            "lastModifiedTime": payerListResp.data.document[0].mtime,
            "payerList": payerList,
          },
          dTypeProps:{
            isOnServer: 0
          },
          mediaType: 'application/json'
        })
      }
    }else{
      indexLocalForage.setItem("payerIndex",payerList)
    }
    return payerList
  },
  // 从indexdb中删除payer 
  async deletePayerInfo({facilityId,id}:{facilityId: string,id: string}){
    // 获取index doc
    const payerIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 422401,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    const payerInfo = await documentToNote({document: payerIndexResp.data.document[0]})
    let payerList = get(payerInfo,"name.data.payerList")
    // 将该doc从列表中移除
    remove(payerList,eachCode=>get(eachCode,"id") == id)
    // index db 中移除
    indexLocalForage.setItem("payerIndex",payerList)
    // 删除index doc并且重建 
    const deleteResp = await store.level2SDK.commonServices.deleteRequest([payerIndexResp.data.document[0].id])
    if(store.env === "test") {
      log.info(
        "%cDelete Object Response",
        "background: purple;color: white; display: block;",
        deleteResp,
      )
    }
    const createResp = await Document.create({
      edge_id: payerInfo.eid,
      type: 422401,
      atimes: -10,
      content: {
        "lastModifiedTime": get(payerInfo,"name.data.lastModifiedTime"),
        "payerList": payerList,
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json'
    })
  }, 
  // facility template
  async templateInfo({facilityId,eid}:{facilityId:string,eid:string}){
    // 获取是否已经创建index doc
    const templateIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 424961,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    // 获取payer list时的scondition
    let searchCondition: string = "D.type in (435201,437761) AND D.tage!= 2 AND E.type=10000" 
    // procedure code list 
    let templateList: {}[] = []
    let templateInfo:any
    if(templateIndexResp.data.document.length){
      // 解密后的doc
      templateInfo = await documentToNote({document: templateIndexResp.data.document[0]})
      // 如果有值，则设置获取procedure的条件为mtime>lastMtime 
      searchCondition = `D.type in (435201,437761) AND D.mtime>${get(templateInfo,"name.data.lastModifiedTime")*1000000} AND D.tage!= 2 AND E.type=10000`
      templateList = get(templateInfo,"name.data.templateList")
    }
 
    // 获取mtime>lastModifiedTime的list
    const templateListResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        xfname: "E.bvid",
        ObjType: 8,
        maxcount: 1000,
        asc: false,
        obfname: "D.mtime",
        scondition: searchCondition
      }
    })

    // 如果获取到新的procedure code则push进list里，并且更新index doc
    // 如果没有获取到新的，直接设置indexDB的item
    if(templateListResp.data.document.length){
      // 如果获取到自己，且mtime相同，直接返回
      if(templateListResp.data.document.length===1 && templateListResp.data.document[0].mtime===get(templateInfo,"name.data.lastModifiedTime")){
        log.log('no new tempate, return directly');
        const indexdbKeys = await indexLocalForage.keys()
        if(!indexdbKeys.includes("templateIndex")){
          indexLocalForage.setItem("templateIndex",templateList)
        }
      }else{
        let newListData: {}[] = await Promise.all(templateListResp.data.document.map(async (eachDoc)=>{
          const eachTemplate = await documentToNote({document: eachDoc})  
          return {
            "id": store.level2SDK.utilServices.uint8ArrayToBase64(get(eachTemplate,"id")),
            "type": get(eachTemplate,"type"),
            "documentName": get(eachTemplate,"name.title"),
            "creator": get(eachTemplate,"name.user"),
            "description": get(eachTemplate,"name.data.description"),
            "documentType": get(eachTemplate,"name.tags"),
            "tab": get(eachTemplate,"name.nonce"),
          }
        }))
        templateList = [...newListData,...templateList]
        templateList = uniqBy(templateList,"id")
        await indexLocalForage.removeItem('templateIndex')
        indexLocalForage.setItem("templateIndex",templateList)
        // 如果index doc 存在，则删除原先的，然后重建
        if(templateIndexResp.data.document.length){
          const deleteResp = await store.level2SDK.commonServices.deleteRequest([templateIndexResp.data.document[0].id])
          if(store.env === "test") {
            log.info(
              "%cDelete Object Response",
              "background: purple;color: white; display: block;",
              deleteResp,
            )
          }
        }
        const createResp = await Document.create({
          edge_id: eid,
          type: 424961,
          atimes: -10,
          content: {
            "lastModifiedTime": templateListResp.data.document[0].mtime,
            "templateList": templateList,
          },
          dTypeProps:{
            isOnServer: 0
          },
          mediaType: 'application/json'
        })
      }
    }else{
      indexLocalForage.setItem("templateIndex",templateList)
    }
    return templateList
  },
  // 从indexdb中删除template
  async deleteTemplateInfo({facilityId,id}:{facilityId: string,id: string}){
    // 获取index doc
    const templateIndexResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        type: 424961,
        xfname: "ovid",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    const templateInfo = await documentToNote({document: templateIndexResp.data.document[0]})
    let templateList = get(templateInfo,"name.data.templateList")
    // 将该doc从列表中移除
    remove(templateList,eachCode=>get(eachCode,"id") == id)
    // index db 中移除
    indexLocalForage.setItem("templateIndex",templateList)
    // 删除index doc并且重建 
    const deleteResp = await store.level2SDK.commonServices.deleteRequest([templateIndexResp.data.document[0].id])
    if(store.env === "test") {
      log.info(
        "%cDelete Object Response",
        "background: purple;color: white; display: block;",
        deleteResp,
      )
    }
    const createResp = await Document.create({
      edge_id: templateInfo.eid,
      type: 424961,
      atimes: -10,
      content: {
        "lastModifiedTime": get(templateInfo,"name.data.lastModifiedTime"),
        "templateList": templateList,
      },
      dTypeProps:{
        isOnServer: 0
      },
      mediaType: 'application/json'
    })
  }, 
  async shareDoc({ sourceDoc, targetEdgeID, targetRoomName, targetFileID, reid, user}) {
    const resp = await retrieveDocument(sourceDoc.id)
    const document = resp?.data?.document?.length
      ? resp?.data?.document[0]
      : null
    const note = await documentToNote({ document })
    let content = note?.name?.data
    if (typeof content === 'string') {
      content = await store.level2SDK.utilServices.base64ToBlob(
        note?.name?.data,
        note?.name?.type,
      )
    }
    const sharedDoc = await Document.create({
      content,
      targetRoomName,
      title: note?.name?.title,
      paymentNonce: note?.name?.nonce,
      user: user ? user : note?.name?.user,
      type: note?.type,
      edge_id: targetEdgeID,
      mediaType: note?.name?.type,
      fid: targetFileID,
      reid: reid,
      tage: note?.tage,
      dTypeProps: note.subtype
    })
    return replaceUint8ArrayWithBase64(sharedDoc)
  },
  async shareFinancial({ sourceDoc, eid, reid, user, appTime, patientName}) {
    const content = get(sourceDoc, 'name.data')
    const patClassTag = {
      "name": "Patient",
      "fontColor": "0xf8ae29",
      "backgroundColor": "0xfff4e0",
      "display": "block"
    }
    const adminClassTag = {
      "name": "Admin",
      "fontColor": "0x005795",
      "backgroundColor": "0xe9f2fc",
      "display": "block"
    }
    const { patientInfo, userInfo } = content
    const sharedDoc = await Document.create({
      content: {
        ...content,
        classTag: localStorage.getItem('facility_vid')?.toString() ? adminClassTag : patClassTag,
        patientInfo: {
          ...patientInfo,
          examDate: appTime
        },
        userInfo: {
          ...userInfo,
          patientName: patientName ? patientName : get(userInfo, "patientName")
        }
      },
      title: get(sourceDoc,"name.title"),
      paymentNonce: get(sourceDoc, "name.nonce"),
      user,
      type: get(sourceDoc, "type"),
      edge_id: eid,
      mediaType: get(sourceDoc, "name.type"),
      reid: reid,
      tage: get(sourceDoc, 'tage'),
      dTypeProps: get(sourceDoc, 'subtype')
    })
    return replaceUint8ArrayWithBase64(sharedDoc)
  },
  async shareDocByFid({ sourceDoc, targetEdgeID, targetRoomName }) {
    const resp = await retrieveDocument(sourceDoc.id)
    const document = resp?.data?.document?.length
      ? resp?.data?.document[0]
      : null
    const note = await documentToNote({ document })
    let content = note?.name?.data
    if (typeof content === 'string') {
      content = await store.level2SDK.utilServices.base64ToBlob(
        note?.name?.data,
        note?.name?.type,
      )
    }
    return await Document.create({
      content,
      targetRoomName,
      title: note?.name?.title,
      user: note?.name?.user,
      type: note?.type,
      edge_id: note?.eid,
      fid: targetEdgeID,
      mediaType: note?.name?.type,
      dTypeProps: note.subtype
    })
  },
  async shareEdgeList({
    sourceEdgeList,
    refid,
  }) {
    if (u.isArr(sourceEdgeList)) {
      return Promise.all(
        sourceEdgeList.map(async (sourceEdge) => {
          // const document = await retrieveDocument(sourceDoc.id)
          // const note = await documentToNote({ document })
          const obj = cloneDeep(sourceEdge)
          obj.id = ""
          obj.refid = refid
          obj.etime = ""
          const edge = await store.level2SDK.edgeServices.createEdge(obj)
          return replaceUint8ArrayWithBase64(edge['edge'])
        }),
      )
    }
  },
  async shareEdge({
    sourceEdgeList,
    refid,
  }) {
    if (u.isArr(sourceEdgeList)) {
      return Promise.all(
        sourceEdgeList.map(async (sourceEdge) => {
          // const document = await retrieveDocument(sourceDoc.id)
          // const note = await documentToNote({ document })
          const obj = cloneDeep(sourceEdge)
          obj.refid = refid
          const edge = await store.level2SDK.edgeServices.createEdge(obj)
          return replaceUint8ArrayWithBase64(edge['edge'])
        }),
      )
    }
  },  
  async createDocList({
    dataArray,
    type,
    eid,
    reid,
  }) {
    if (u.isArr(dataArray)) {
      return Promise.all(
        dataArray.map(async (name) => {
          const doc = await Document.nocheckcreate({
            atimes: -10,
            content: name?.data,
            targetRoomName: name.targetRoomName,
            user: name?.user,
            title: name?.title,
            paymentNonce: name?.nonce,
            type: type,
            edge_id: eid,
            mediaType: 'application/json',
            // fid: null,
            reid: reid,
          })
          return replaceUint8ArrayWithBase64(doc['doc'])
        })
      )
    }
  },
  async createDocListByDoc({
    dataArray,
    type,
    eid,
    fid,
    innerType,
    pickupLocationId,
  }) {
    if (u.isArr(dataArray)) {
      return Promise.all(
        dataArray.map(async (eachDoc) => {
          let doc
          if (eachDoc?.['id']) {
            let requestOptions = {
              xfname: "reid",
            }
            let idList = [eachDoc["id"]]
            let docResp = await store.level2SDK.documentServices.retrieveDocument({
              idList,
              options: requestOptions,
            })
            if (docResp.data.document.length) {
              let deleteArray = docResp.data.document
              deleteArray.forEach(async element => {
                const res = await store.level2SDK.commonServices.deleteRequest(
                  [
                    element["id"]
                  ]
                )
                if (store.env === "test") {
                  log.info(
                    '%cDelete Object Response',
                    'background: purple; color: white; display: block;',
                    res,
                  )
                }
              });
            }
            doc = await Document.update(eachDoc?.id, {
              edge_id: eid,
              content: eachDoc?.name?.data,
              targetRoomName: eachDoc?.name.targetRoomName,
              type: type,
              title: eachDoc?.name?.title,
              tage: eachDoc?.tage,
              mediaType: 'application/json',
              dTypeProps: eachDoc?.subtype,
              fid: eachDoc.fid,
              // jwt: data?.jwt
            })
          } else {
            doc = await Document.nocheckcreate({
              content: eachDoc?.name?.data,
              title: eachDoc?.name?.title,
              tage: eachDoc?.tage,
              type: type,
              edge_id: eid,
              fid: fid,
              mediaType: 'application/json',
              dTypeProps: eachDoc?.subtype,
              targetRoomName: eachDoc?.name.targetRoomName,
            })
          }

          const newDoc = replaceUint8ArrayWithBase64(doc['doc'])
          let innerDataArray: {}[] = eachDoc?.name?.data?.variants
          if(innerDataArray.length){
            innerDataArray.map(async (variant) => {
              const data = {
                pickAndStock: [
                  {
                    pickupLocationId: pickupLocationId,
                    stock: variant["title"],
                  }
                ],
                ...variant["data"]
              }
              const innerDoc = await Document.nocheckcreate({
                content: data,
                title: variant["title"],
                type: innerType,
                edge_id: eid,
                reid: newDoc.id,
                mediaType: 'application/json',
                tage: 3 
              })
              const skuLocation = await Document.nocheckcreate({
                content: data,
                title: variant["title"],
                type: 455681,
                edge_id: eid,
                mediaType: 'application/json',
                atimes: -10,
                fid: pickupLocationId,
                reid: replaceUint8ArrayWithBase64(innerDoc['doc'])?.id,
              })
              return replaceUint8ArrayWithBase64(doc['doc']);
            })
          } else {
            const defaultData = {
              combination: "Default",
              options: {
                Options: "Default"
              },
              price: get(eachDoc,"name.data.pricing.price"),
              costPerItem: get(eachDoc,"name.data.pricing.costPerItem"),
              sku: get(eachDoc,"name.data.inventory.sku"),
              barcode: get(eachDoc,"name.data.inventory.barcode"),
              pickAndStock: [
                {
                  pickupLocationId: pickupLocationId,
                  stock: get(eachDoc,"name.title")
                }
              ]
            }
            const innerDoc = await Document.nocheckcreate({
              content: defaultData,
              title: get(eachDoc,"name.title"),
              type: innerType,
              edge_id: eid,
              reid: newDoc.id,
              mediaType: 'application/json',
              tage: 7, // tage位数： 11 (创建的是superadmin的商品)
            })
            const skuLocation = await Document.nocheckcreate({
              content: defaultData,
              title: get(eachDoc,"name.title"),
              type: 455681,
              edge_id: eid,
              mediaType: 'application/json',
              atimes: -10,
              fid: pickupLocationId,
              reid: replaceUint8ArrayWithBase64(innerDoc['doc'])?.id,
            })
          }

        })
      )
    }
  },
  // 创建doc ->dataArray 里含有type
  async createDocListWithType({dataArray,eid}:{dataArray:{}[],eid:string}){
    if(u.isArr(dataArray)){
      return Promise.all(
        dataArray.map(async (data) => {
          const docCreateResp = await Document.nocheckcreate({
            content: get(data,"name.data", ''),
            title: get(data,"title"),
            type: get(data,"type"),
            edge_id: eid,
            mediaType: 'application/json',
            reid: get(data,"reid") || "",
            atimes: -10,
          })
          return replaceUint8ArrayWithBase64(docCreateResp['doc'])
        })
      )
    }
  },
  async createDocListByFidList({
    dataArray,
    type,
    eid,
    reid="",
  }) {
    if (u.isArr(dataArray)) {
      return Promise.all(
        dataArray.map(async (eachData) => {
          const doc = await Document.nocheckcreate({
            content: eachData?.name?.data,
            title: eachData?.name?.title,
            type: type,
            edge_id: eid,
            fid: eachData?.fid,
            reid:reid,
          })
          const newDoc = replaceUint8ArrayWithBase64(doc['doc'])
          return newDoc
        })
      )
    }
  },
  async createDocByRef({
    dataArray,
    type,
    eid,
    reid,
    fid,
  }) {
    if (u.isArr(dataArray)) {
      return Promise.all(
        dataArray.map(async (name) => {
          const doc = await Document.nocheckcreate({
            content: name?.data,
            targetRoomName: name.targetRoomName,
            user: name?.user,
            title: name?.title,
            type: type ? type : get(name,"type"),
            edge_id: eid,
            mediaType: 'application/json',
            paymentNonce: name?.nonce,
            fid: fid,
            reid: reid,
            tage: get(name,"tage") ? get(name,"tage") : 0,
          })
          return replaceUint8ArrayWithBase64(doc['doc'])
        })
      )
    }
  },
  async shareDocList({
    sourceDocList,
    targetEdgeID,
    targetRoomName,
    targetFileID,
    reid,
    fidPointToSelf = false
  }) {
    //check if eid has been dereferenced
    if (!isPopulated(targetEdgeID)) {
      throw new UnableToLocateValue(`Missing reference ${targetEdgeID} in function "shareDocList`)
    }
    const resp = await retrieveEdge(targetEdgeID)
    const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        const resp = await retrieveDocument(sourceDoc.id)
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        const note = await documentToNote({ document })
        let content = note?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }
        const oldFid = note?.id
        const doc = await Document.create({
          content,
          targetRoomName,
          title: note?.name?.title,
          user: note?.name?.user,
          type: note?.type,
          paymentNonce: note?.name?.nonce,
          edge_id: targetEdgeID,
          mediaType: note?.name?.type,
          fid: fidPointToSelf ? oldFid : targetFileID,
          reid: reid,
          dTypeProps: note.subtype,
          tage: note.tage,
          atimes: -10
        })
        const newDoc = replaceUint8ArrayWithBase64(doc['doc'])
        return newDoc
      }),
    )
  },
  async shareDocListWithFid({
    sourceDocList,
    targetEdgeID,
    reid,
  }) {
    //check if eid has been dereferenced
    if (!isPopulated(targetEdgeID)) {
      throw new UnableToLocateValue(`Missing reference ${targetEdgeID} in function "shareDocList`)
    }
    const resp = await retrieveEdge(targetEdgeID)
    const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        const resp = await retrieveDocument(sourceDoc.id)
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        const note = await documentToNote({ document })
        let content = note?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }
        const doc = await Document.create({
          content,
          title: note?.name?.title,
          user: note?.name?.user,
          type: note?.type,
          paymentNonce: note?.name?.nonce,
          edge_id: targetEdgeID,
          mediaType: note?.name?.type,
          fid: note?.fid,
          reid: reid,
          dTypeProps: note.subtype,
          tage: note.tage,
          atimes: -10
        })
        const newDoc = replaceUint8ArrayWithBase64(doc['doc'])
        return newDoc
      }),
    )
  },
  // not use now
  updateDocList({ sourceDocList }) {
    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        // const document = await retrieveDocument(sourceDoc.id)
        // const note = await documentToNote({ document })
        let content = sourceDoc?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            sourceDoc?.name?.data,
            sourceDoc?.name?.type,
          )
        }
        const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = sourceDoc
        const { title, tags, user, targetRoomName, ...restNameOptions } = name
        const mediaType = restNameOptions.type
        // const id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.bsig)
        // const edge_id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.eid)

        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: sourceDoc.bsig,
            type: 1030,
          })
        }

        let doc = await Document.update(sourceDoc?.id, {
          edge_id: eid,
          content: content,
          user: user,
          type: type,
          title: title,
          tags: tags,
          reid: reid,
          fid: fid,
          tage: tage,
          mediaType: mediaType,
          targetRoomName: targetRoomName,
          dTypeProps: subtype
          // jwt: data?.jwt
        })
        
        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: localStorage.getItem('user_vid')?.toString(),
            type: 1030,
          })
        }
        return replaceUint8ArrayWithBase64(doc['doc'])
      }),
    )
  },

  /**
   * Update the type of doc for a given doc array
   * according to specific rules
   *
   * specific rules: Set 0|1 to the type specific bit
   *
   * @param sourceDocList
   * @param targetBit
   * @param targetValue
   */
  updateDocListType({ sourceDocList, targetBit, targetValue }) {
    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        // const document = await retrieveDocument(sourceDoc.id)
        // const note = await documentToNote({ document })
        let content = sourceDoc?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            sourceDoc?.name?.data,
            sourceDoc?.name?.type,
          )
        }

        // const id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.bsig)
        // const edge_id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.eid)
        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: sourceDoc.bsig,
            type: 1030,
          })
        }

        let newType = sourceDoc?.type
        let bitValue = getBitValue(sourceDoc?.type, targetBit)
        if (bitValue != targetValue) {
          newType = setBitValue(sourceDoc?.type, targetBit, targetValue)
          const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = sourceDoc
          const { title, tags, user,targetRoomName, ...restNameOptions } = name
          const mediaType = restNameOptions.type
          await Document.update(sourceDoc?.id, {
            edge_id: eid,
            targetRoomName: targetRoomName,
            user: user,
            title: title,
            content: content,
            tags: tags,
            reid: reid,
            fid: fid,
            type: newType,
            mediaType: mediaType,
            dTypeProps: subtype

            // jwt: data?.jwt
          })
        }

        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: localStorage.getItem('user_vid')?.toString(),
            type: 1030,
          })
        }
      }),
    )
  },
  updateDocListReid({ sourceDocList, reid }) {
    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        // const document = await retrieveDocument(sourceDoc.id)
        // const note = await documentToNote({ document })
        let content = sourceDoc?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            sourceDoc?.name?.data,
            sourceDoc?.name?.type,
          )
        }
        // const id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.bsig)
        // const edge_id = await store.level2SDK.utilServices.uint8ArrayToBase64(note?.eid)
        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: sourceDoc.bsig,
            type: 1030,
          })
        }

        log.debug('test', {
          edge_id: sourceDoc.eid,
          content: content,
          reid: reid,
          // jwt: data?.jwt
        })
        const { tage, type, eid, name, fid, subtype, ...restOptions } = sourceDoc
        const { title, tags, user,targetRoomName, ...restNameOptions } = name
        const mediaType = restNameOptions.type
        await Document.update(sourceDoc?.id, {
          edge_id: eid,
          content: content,
          type: type,
          reid: reid,
          fid: fid,
          mediaType: mediaType,
          dTypeProps: subtype,
          targetRoomName: targetRoomName,
          tage,
          user: user,
          title: title,
          tags: tags,
          // jwt: data?.jwt
        })

        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: localStorage.getItem('user_vid')?.toString(),
            type: 1030,
          })
        }
      }),
    )
  },

  /**
   * Query each doc id in the sourceDocList as the doc pointed to by the reid,
   *  and update the type for these doc
   * @param sourceDocList
   * @param targetBit
   * @param targetValue
   * @param sCondition
   */
  async updateReidDocListType({
    sourceDocList,
    targetBit,
    targetValue,
    sCondition,
    eid,
  }) {
    let idList: (string | Uint8Array)[]
    const facility_vid = localStorage.getItem('facility_vid')?.toString()
    const user_vid = localStorage.getItem('user_vid')?.toString()
    const currentUserId = facility_vid ? facility_vid : user_vid
    for (let i = 0; i < sourceDocList.length; i++) {
      idList = getIdList([sourceDocList[i].id, currentUserId])
      let requestOptions = {
        xfname: 'reid,ovid',
        scondition: sCondition,
      }
      let reidDocs = await store.level2SDK.documentServices.retrieveDocument({
        idList,
        options: requestOptions,
      })
      let reidDocList = reidDocs.data.document
      //create doc
      if (reidDocList.length == 0) {
        let type: any = 3584
        const content: any = ''
        const targetRoomName: any = ''
        let bitValue = getBitValue(type, targetBit)
        if (bitValue != targetValue) {
          type = setBitValue(type, targetBit, targetValue)
        }
        await Document.create({
          content,
          atimes: -10,
          targetRoomName,
          title: '',
          user: '',
          reid: sourceDocList[i].id,
          edge_id: eid,
          type: type,
        })
      }

      //update type
      // await Promise.all(reidDocList.map(async (reidDoc) => {
      for (let j = 0; j < reidDocList.length; j++) {
        const document = reidDocList[j]
        const note = await documentToNote({ document })
        let content = note?.name?.data
        if (
          typeof content == 'string' &&
          content != 'undefined' &&
          document?.name?.data != null
        ) {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }

        const id = await store.level2SDK.utilServices.uint8ArrayToBase64(
          note?.bsig,
        )
        const edge_id = await store.level2SDK.utilServices.uint8ArrayToBase64(
          note?.eid,
        )
        let switchJwt = false
        if (id != currentUserId) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: id,
            type: 1030,
          })
          switchJwt = true
        }

        let newType = note?.type
        let bitValue = getBitValue(note?.type, targetBit)
        if (bitValue != targetValue) {
          newType = setBitValue(note?.type, targetBit, targetValue)
          const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = note
          const { title, tags, user,targetRoomName, ...restNameOptions } = name
          const mediaType = restNameOptions.type
          await Document.update(note?.id, {
            edge_id: edge_id,
            content: content,
            type: newType,
            reid: reid,
            fid: fid,
            mediaType: mediaType,
            dTypeProps: subtype,
            targetRoomName: targetRoomName,
            user: user,
            title: title,
            tags: tags,
            aitmes: -10,
            // jwt: data?.jwt
          })
        }

        if (switchJwt) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: currentUserId,
            type: 1030,
          })
        }
      }

      // }))
    }
  },

  /**
   * Establish a connection between the doc array of the email and the doc of the folder (doc(type=3084))
   * @param sourceDocList
   * @param folder
   * @param eid
   */
  createFolderTag({ sourceDocList, folder, eid }) {
    let idList
    const type: any = 3840
    const content: any = ''
    const targetRoomName: any = ''
    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        idList = getIdList([sourceDoc.id, folder])
        const requestOptions = {
          xfname: 'reid,fid',
          type: 3840,
        }
        const linkDocs =
          await store.level2SDK.documentServices.retrieveDocument({
            idList,
            options: requestOptions,
          })
        const folderTags = linkDocs.data.document
        if (folderTags.length == 0) {
          await Document.create({
            content,
            targetRoomName,
            title: '',
            user: '',
            reid: sourceDoc.id,
            edge_id: eid,
            fid: folder,
            type: type,
          })
        }
      }),
    )
  },

  /**
   * Delete the link between the doc array of the email and the doc of the folder (doc(type=3084))
   * @param sourceDocList
   * @param folder
   */
  deleteFolderTag({ sourceDocList, folder }) {
    let idList
    return Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        idList = getIdList([sourceDoc.id, folder])
        const requestOptions = {
          xfname: 'reid,fid',
          type: 3840,
        }
        const linkDocs =
          await store.level2SDK.documentServices.retrieveDocument({
            idList,
            options: requestOptions,
          })
        const folderTags = linkDocs.data.document
        for (let j = 0; j < folderTags.length; j++) {
          const document = folderTags[j]
          const note = await documentToNote({ document })
          const res = await store.level2SDK.commonServices.deleteRequest([
            note.id,
          ])
          if (store.env === 'test') {
            log.info(
              '%cDelete Object Response',
              'background: purple; color: white; display: block;',
              res,
            )
          }
        }
      }),
    )
  },

  async copyDocToAttachment({ sourceDocList, newType }) {
    let res: any[] = []
    await Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        let note = sourceDoc
        if (Object.keys(sourceDoc).length == 1) {
          const resp = await retrieveDocument(sourceDoc.id)
          const document = resp?.data?.document?.length
            ? resp?.data?.document[0]
            : null
          note = await documentToNote({ document })
        }
        let content = note?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }
        let response = await Document.create({
          content,
          title: note?.name?.title,
          user: note?.name?.user,
          type: newType,
          edge_id: note?.eid,
          mediaType: note?.name?.type,
          fid: note?.fid,
        })

        // @ts-expect-error
        response.doc.id = await store.level2SDK.utilServices.uint8ArrayToBase64(
          // @ts-expect-error
          response?.doc?.id,
        )
        // sharedDocList[i] = sharedDoc
        // return sharedDoc
        res.push(response)
      }),
    )
    return res
  },

  async generatorSigForOldAccount({ id, name, sk, phoneNumber }) {
    if (id && name && sk) {
      const response = await store.level2SDK.Account.generatorSigForOldAccount({
        id,
        userInfo: name,
        sk,
        phoneNumber,
      })
      return response
    }
    return {}
  },

  async transformVisitReason({ vertexId, rootNoteBookId }) {
    if (vertexId && rootNoteBookId) {
      const reasonDocResponse =
        await store.level2SDK.documentServices.retrieveDocument({
          idList: getIdList([rootNoteBookId]),
          options: {
            xfname: 'eid',
            type: 79360,
            maxcount: 1,
            obfname: 'mtime',
          },
        })
      const linkEdgesResponse = await retrieveEdge(vertexId, {
        xfname: 'bvid|evid',
        type: 10002,
        scondition: 'subtype=196608',
      })
      const reasonDoc = reasonDocResponse.data.document[0]
      const linkEdges = linkEdgesResponse.data.edge
      if (reasonDoc && linkEdges?.length) {
        const note = await documentToNote({ document: reasonDoc })
        let content = note?.name?.data
        if (
          typeof content == 'string' &&
          content != 'undefined' &&
          reasonDoc?.name?.data != null
        ) {
          content = await store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
        }
        content.reasonForVisit.forEach((element) => {
          element['fee'] = '0.00'
          if (element.hasOwnProperty('selectDoc')) {
            delete element?.selectDoc
          }
        })
        const newContent = {
          reasonForVisit: {
            Telemedicine: content.reasonForVisit,
            OfficeVisits: content.reasonForVisit,
          },
          version: 2,
        }

        return Promise.all(
          linkEdges.map(async (linkEdge) => {
            await Document.nocheckcreate({
              content: newContent,
              title: '',
              user: '',
              edge_id: linkEdge.eid,
              type: 79360,
            })
          }),
        )
      }
      return
    }
    return
  },
  
  async obtainAccountBoolean({ edgeID }: { edgeID: string }) {
    // get edge
    const edgeResp = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [edgeID],
      options: {
        xfname: "id",
        obfname: "ctime"
      },
    })
    let vertexID = ""
    vertexID = await store.level2SDK.utilServices.uint8ArrayToBase64(edgeResp.data.edge?.[0].bvid)
    if (edgeResp.data.edge?.[0].type === 10000) {
      const connectEdge = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [vertexID, localStorage.getItem("facility_vid")?.toString()],
        options: {
          xfname: "(evid,bvid)|(bvid,evid)",
          type: 10002,
          obfname: "mtime",
        }
      })

      if (connectEdge.data.edge?.[0].tage === -5) return false
    }
    // get the vertex which is not facility
    let userID = vertexID === localStorage.getItem("facility_vid")?.toString() ? await store.level2SDK.utilServices.uint8ArrayToBase64(edgeResp.data.edge?.[0].evid) : await store.level2SDK.utilServices.uint8ArrayToBase64(edgeResp.data.edge?.[0].bvid)
    const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [userID],
      options: {
        xfname: "id",
        obfname: "ctime",
      },
    })
    return (vertexResp.data.vertex?.[0].type === 1) ? true : false
  },
  async updateVertexSign({ id, name, sk }: { id: string, name: {}, sk: any }) {
    const { pkSign, skSign } = store.level2SDK.utilServices.generateSignatureKeyPair();
    const eskSign = store.level2SDK.utilServices.sKeyEncrypt(store.level2SDK.utilServices.base64ToUint8Array(sk), skSign);
    const pkSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(pkSign)
    const eskSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(eskSign)
    try {
      await store.level2SDK.vertexServices.updateVertex({
        id: id,
        name: {
          ...name,
          pkSign: pkSignBase64,
          eskSign: eskSignBase64,
        },
      })
      store.level2SDK.utilServices.storeCredentialsInLocalStorage({ pkSign, eskSign })
    } catch (error) {
      log.error(
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  },
  async deletePayerPayment({ id }: { id: string }) {
    const applyRecordResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [id],
      options: {
        type: 256001,
        xfname: "fid",
      },
    })
    const applyRecordArray = applyRecordResp?.data?.document
    if (u.isArr(applyRecordArray)) {
      await Promise.all(
        applyRecordArray.map(async (applyRecord) => {
          const applyRecordNote = await documentToNote({ document: applyRecord })
          const claimRecordResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: [applyRecord?.id],
            options: {
              ObjType: 28,
              type: 253441,
              xfname: "D2.id",
              sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Doc D2 on D.id = D2.reid\"}",
              scondition: "D2.type=256001",
            },
          })
          const document = claimRecordResp?.data?.document[0]
          const claimRecordNote = await documentToNote({ document })
          let firstApply: {}[] = get(claimRecordNote, "name.data.firstApplied")
          let secondApply: {}[] = get(claimRecordNote, "name.data.secondApplied")
          if (get(applyRecordNote, "name.data.whichInsurance") === "first") {
            firstApply.forEach(eachData => {
              eachData["appliedAmount"] = "0.00"
              eachData["adjustment"] = "0.00"
              eachData["billBalance"] = eachData["amountBilled"]
            });
            claimRecordNote["name"]["data"]['firstInsuranceHasUsed'] = 0
            set(claimRecordNote, "name.data.firstApplied", firstApply)
          } else {
            secondApply.forEach(eachData => {
              eachData["appliedAmount"] = "0.00"
              eachData["adjustment"] = "0.00"
              eachData["billBalance"] = eachData["amountBilled"]
            });
            claimRecordNote["name"]["data"]['secondInsuranceHasUsed'] = 0
            set(claimRecordNote, "name.data.secondApplied", secondApply)
          }
          let totalApplied: {}[] = get(claimRecordNote, "name.data.totalApplied")
          let tempObj = {
            amount: 0,
            appliedAmount: 0,
            adjustment: 0,
            claimBalance: 0,
            primaryPaid: 0,
            secondaryPaid: 0,
            status: ''
          }
          for (let i = 0; i < totalApplied.length; i++) {
            totalApplied[i]['primaryPaid'] = parseFloat(firstApply[i]['appliedAmount']).toFixed(2)
            totalApplied[i]['secondaryPaid'] = parseFloat(secondApply[i]['appliedAmount']).toFixed(2)
            totalApplied[i]['adjustment'] = (parseFloat(firstApply[i]['adjustment']) + parseFloat(secondApply[i]['adjustment'])).toFixed(2)
            totalApplied[i]['appliedAmount'] = (parseFloat(firstApply[i]['appliedAmount']) + parseFloat(secondApply[i]['appliedAmount'])).toFixed(2)
            totalApplied[i]['coInsurance'] = (parseFloat(firstApply[i]['coInsurance'])).toFixed(2)
            totalApplied[i]['copay'] = (parseFloat(firstApply[i]['copay'])).toFixed(2)
            totalApplied[i]['deductable'] = (parseFloat(firstApply[i]['deductable'])).toFixed(2)
            totalApplied[i]['ptBalance'] = (parseFloat(firstApply[i]['ptBalance'])).toFixed(2)
            totalApplied[i]['billBalance'] = (parseFloat(totalApplied[i]['amountBilled']) + parseFloat(totalApplied[i]['appliedAmount']) + parseFloat(totalApplied[i]['adjustment'])).toFixed(2)
            tempObj['adjustment'] += parseFloat(totalApplied[i]['adjustment']);
            tempObj['claimBalance'] += parseFloat(totalApplied[i]['billBalance']);
            tempObj['appliedAmount'] += parseFloat(totalApplied[i]['appliedAmount']);
            tempObj['primaryPaid'] += parseFloat(totalApplied[i]['primaryPaid']);
            tempObj['secondaryPaid'] += parseFloat(totalApplied[i]['secondaryPaid']);
          }
          claimRecordNote["name"]["data"]['adjustment'] = (tempObj['adjustment']).toFixed(2)
          claimRecordNote["name"]["data"]['claimBalance'] = (tempObj['claimBalance']).toFixed(2)
          claimRecordNote["name"]["data"]['appliedAmount'] = (tempObj['appliedAmount']).toFixed(2)
          claimRecordNote["name"]["data"]['primaryPaid'] = (tempObj['primaryPaid']).toFixed(2)
          claimRecordNote["name"]["data"]['secondaryPaid'] = (tempObj['secondaryPaid']).toFixed(2)
          set(claimRecordNote, "name.data.totalApplied", totalApplied)

          const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = applyRecordNote
          const content = applyRecordNote?.name?.data
          const { title, tags, user,targetRoomName, ...restNameOptions } = name
          const mediaType = restNameOptions.type
          await Document.update(applyRecordNote?.id, {
            edge_id: eid,
            content: content,
            type: type,
            reid: reid,
            fid: fid,
            mediaType: mediaType,
            dTypeProps: subtype,
            targetRoomName: targetRoomName,
            user: user,
            title: title,
            tags: tags,
            tage: -2,
          })
          await Document.update(claimRecordNote?.id, {
            edge_id: claimRecordNote.eid,
            content: claimRecordNote?.name?.data,
            type: claimRecordNote.type,
            reid: claimRecordNote.reid,
            fid: claimRecordNote.fid,
            mediaType: claimRecordNote?.name.type,
            dTypeProps: claimRecordNote.subtype,
            user: claimRecordNote?.name.user,
            title: claimRecordNote?.name.title,
            tage: claimRecordNote?.tage,
          })

        })
      )
    }
  },
  updateDocType({ sourceDocList }) {
    return Promise.all(
      sourceDocList.map(async sourceDoc => {
        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: sourceDoc.bsig,
            type: 1030,
          })
        }
        const linkDoc = await retrieveDocument(sourceDoc.fid)
        let document = linkDoc.data.document[0]
        let note = await documentToNote({ document: document })
        let content = note?.name?.data
        const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = note
        const { title, tags, user,targetRoomName, ...restNameOptions } = name
        const mediaType = restNameOptions.type
        await Document.update(note?.id, {
          edge_id: eid,
          content: content,
          user: user,
          type: -type,
          title: title,
          tags: tags,
          reid: reid,
          fid: fid,
          tage: 0,
          mediaType: mediaType,
          targetRoomName: targetRoomName,
          dTypeProps: subtype
        })
      })
    )
  },
  
  async referredFrom(appID:string){
    // according 40000id get 1053
    const inviteEdge = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [appID],
      options: {
        xfname: "refid",
        type: 1053,
        scondition: "subtype=200",
        maxcount: 1,
        obfname: "ctime"
      }
    })
    return get(inviteEdge?.data?.edge[0],"name.inviter")
  },
  // 批量邀请人到新的会议，仅适用于 admin 创建 replace appointment的情况
  async invitePList ({meetingid, invitee}: {
    meetingid: String,
    invitee: Array<any>
  }) {
    const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [meetingid],
    })
    const facilityId = localStorage.getItem('facility_vid')
    const meetingInfo = edgeResponse?.data.edge[0]
    const currentUserSk = localStorage.getItem('facility_sk')
    let resp: Array<any> = []
    if (meetingInfo && meetingInfo.eesak && facilityId && currentUserSk) {
      // 获取 halfkey
      const currentUserSkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
      const halfkey = await getHalfkey(meetingInfo,facilityId)
      if (!halfkey) {
        return {
          errCode: "100", 
          errMsg: "no halfkey"
        }
      }
      resp = await Promise.all(
        invitee.map(async(item)=>{
          const eVertex = await retrieveVertex(item.evid)
          const eVertexPk = eVertex.data.vertex[0].pk
          const eesak = store.level2SDK.utilServices.aKeyEncrypt(
            eVertexPk,
            currentUserSkUint8Array,
            halfkey!
          )
          const edgeReq = {
            refid: meetingid,
            evid: item.evid,
            name: item.name,
            eesak: eesak,
            type: item.type,
            subtype: item.subtype,
            tage: item.tage
          }
          return await store.level2SDK.edgeServices.createEdge(edgeReq)
        })
      )
    } else {
      console.error('err no eesak on 40000"');
      return {
        errCode: "100",
        errMsg: "no eesak on 40000"
      }
    }
  },
  async createProviderGroup({groupId,providerList,chiefProvider}:{
    groupId: string;
    providerList: Array<{ bsig?: string; name: { data: { fullName: string,title:string } } }>;
    chiefProvider: string;
  }) {
    // 获取所有的1057 删除原先的1057
    const originGroup = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [groupId],
      options: {
        xfname: "refid",
        type: 1057
      }
    })
    let deleteIdArray:string[] = []
    get(originGroup,"data.edge").forEach(curGroup => {
      deleteIdArray.push(store.level2SDK.utilServices.uint8ArrayToBase64(get(curGroup,"eid")))
    });
    if(deleteIdArray.length){
      // 删除原先的1057
      await store.level2SDK.edgeServices.deleteEdge(deleteIdArray)
    }
    Promise.all(providerList.map(async prod=>{
      if (prod?.bsig === chiefProvider) {
        await store.level2SDK.edgeServices.createEdge({
          bvid: localStorage.getItem('facility_vid'),
          evid: prod.bsig,
          atimes: -10,
          type: "1057",
          subtype: "10",
          refid: groupId,
          name: {
            prodName: `${prod.name.data.fullName}, ${prod.name.data.title}`
          }
        })
      } else {
        await store.level2SDK.edgeServices.createEdge({
          evid: prod.bsig,
          atimes: -10,
          bvid: localStorage.getItem('facility_vid'),
          type: "1057",
          refid: groupId,
          name: {
            prodName: `${prod.name.data.fullName}, ${prod.name.data.title}`
          }
        })
      }
    }))
  },
  async inviteGroupToRoom({inviter,inviterRole,roomId,groupId}:{
    inviter: string
    inviterRole: string
    roomId: string
    groupId: string
  }) {
    await store.level2SDK.documentServices.createDocument({
      eid: roomId,
      type: 360961,
      eSig: groupId
    })
    const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [roomId],
    })
    const all1057 = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [groupId],
      options: {
        xfname: "refid",
        type: 1057
      }
    })
    let prods:Array<{providerId:string,providerName:string,subtype:number|string}> = [] 
    all1057.data.edge.forEach(element => {
      prods.push({
        providerId: element?.evid,
        providerName: element.name.prodName,
        subtype: element.subtype
      })
    });
    const roomInfo = edgeResponse?.data.edge[0]
    if (!roomInfo) {
      console.error('no room info');
      return 
    }
    const currentUserId = localStorage.getItem('facility_vid')
            ? localStorage.getItem('facility_vid')
            : localStorage.getItem('user_vid')
    const halfkey = await getHalfkey(roomInfo,currentUserId)
    Promise.all(prods.map(async prod=>{
      const eVertex = await retrieveVertex(prod.providerId)
      const eVertexPk = eVertex.data.vertex[0].pk
      const currentUserSk = localStorage.getItem('facility_sk') ? localStorage.getItem('facility_sk') : localStorage.getItem('sk')
      const currentUserSkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
      const eesak = store.level2SDK.utilServices.aKeyEncrypt(
        eVertexPk,
        currentUserSkUint8Array,
        halfkey!
      )
      const edgeReq = {
        bvid: currentUserId,
        refid: roomId,
        evid: prod.providerId,
        name: {
          role: "Provider",
          roleName: prod.providerName,
          inviter: inviter,
          inviterRole: inviterRole
        },
        eesak: eesak,
        type: 1053,
        tage: prod.subtype==10 ? 1 : 0,
        subtype: 140,
      }
      await store.level2SDK.edgeServices.createEdge(edgeReq)
    }))
  },
  async createPaymentTag({statementId, roomIds,facilityRootBookId}:{
    statementId: string,
    roomIds: Array<string>,
    facilityRootBookId: string
  }) {
    await Promise.all(roomIds.map(async item=>{
      await Document.create({
        reid: item,
        edge_id: facilityRootBookId,
        content: {},
        fid: statementId,
        mediaType: 'application/json',
        type: 355841,
        atimes: -10,
      })
    }))
  },
  async createSuperVisor({prodArray,connectEdgeId,subtype,prodId}:{prodArray:{}[],connectEdgeId:string,subtype:number|string,prodId:string}){
    // 获取所有已有的1054，根据subtype更新
    const superviseProdResp = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [connectEdgeId], 
      options: {
        type: 1054,
        xfname: "refid",
        maxcount: "100",
      }
    })
    // 去除已经添加过的
    let prodFilter:{}[] = prodArray
    get(superviseProdResp,"data.edge").forEach((curProd)=>{
      prodFilter = filter(prodFilter,(pro)=>{
        return !((get(pro,"bsig") === store.level2SDK.utilServices.uint8ArrayToBase64(get(curProd,"evid"))))
      })
    })
    // update 1054 And create 1054
    Promise.all(
      [get(superviseProdResp,"data.edge").map(async curProd=>{
      const {id,...obj} = curProd
      const superUpdateProdResp = await store.level2SDK.edgeServices.updateEdge({
        ...obj,
        atimes: -10,
        id: get(curProd,"eid"),
        subtype: subtype,
        })
      }),
      prodFilter.map(async curProd=>{
        const superVisorResp = await store.level2SDK.edgeServices.createEdge({
          bvid: localStorage.getItem("facility_vid"),
          evid: get(curProd,"bsig"),
          type: 1054,
          refid: connectEdgeId,
          atimes: -10,
          subtype: subtype,
          name: {
            providerName:  `${get(curProd,"name.data.fullName")}, ${get(curProd,"name.data.title")}`,
            specialty: get(curProd,"name.data.selectedSpecialty",[])?.join(","),
            license: `${get(curProd,"name.data.MedicalLicense", [] as any)[0]?.state} ${get(curProd,"name.data.MedicalLicense", [] as any)[0]?.medicalLicense}`, 
            npi: get(curProd,"name.data.NPI"),  
            dea: get(curProd,"name.data.DEA"),  
            email: get(curProd,"name.data.email"),
          }
        })
      })]
    ).catch(reason=>{
      console.error("create/update error",reason);
    })
    // 切换医生的jwt
    await store.level2SDK.edgeServices.createEdge({
      bvid: prodId,
      type: 1030
    })
    Promise.all(prodFilter.map(async curProd => {
      // 获取两个provider是否是好友
      const connectRetrieveResp = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [prodId,get(curProd,"bsig")],
        options: {
          xfname: "(bvid,evid)|(evid,bvid)",
          scondition: "subtype=262144 AND tage>0",
          type: 10002
        }
      })
      
      // 如果不是好友 自动成为好友
      if(!get(connectRetrieveResp,"data.edge").length){
        // 自动成为好友，建立10002
        const connectionEdgeResp = await store.level2SDK.edgeServices.createEdge({
          bvid: prodId,
          evid: get(curProd,"bsig"),
          type: 10002,
          atimes: -10,
          subtype: 262144,
          tage: 1,
        })
      }
    })).catch(reason=>{
      console.error("create edge error",reason);
    })
    // 切换回医生jwt
    await store.level2SDK.edgeServices.createEdge({
      bvid: localStorage.getItem("facility_vid")?.toString(),
      type: 1030
    })     
  },
  async update1054Subtype({connectId,subtype}:{connectId:string,subtype:string|number}){
    const _targetEdge = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [connectId],
      options: {
        xfname: "refid",
        type: 1054,
        obfname: "ctime"
      }
    });
    await Promise.allSettled(
      _targetEdge?.data?.edge?.map(async (_item:any)=>
      await store.level2SDK.edgeServices.updateEdge({
        id: _item.eid,
        type: 1054,
        subtype: subtype,
        name: _item.name
      })
    ))
  },
  async autoConnection({providerList,profile,hashTag,insuranceList}:{
    providerList: any[],profile:any,hashTag:any,insuranceList:any
  }){
    const vertexID = localStorage.getItem(`user_vid`);
    await Promise.all(providerList.map(async prod=>{
      const judgeEdgeList = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [vertexID,prod],
        options: {
          xfname: "(evid,bvid)|(bvid,evid)",
          type: 10002,
          sCondition: 'tage>0',
          maxcount: 1
        }
      });
      if(!judgeEdgeList.length){
        const createEdge = await store.level2SDK.edgeServices.createEdge({
          bvid: vertexID,
          evid: prod,
          subtype: 65536,
          tage: 1,
          type: 10002
        });
        const eid = store.level2SDK.utilServices.uint8ArrayToBase64(createEdge.data.edge?.eid)
        const _objShareDoc =  await shareDoc({
          sourceDoc: profile,
          // @ts-ignore
          targetEdgeID: eid,
          targetRoomName: undefined,
          targetFileID: undefined,
          reid: undefined
        });
        await shareDoc({
          sourceDoc: hashTag,
          // @ts-ignore
          targetEdgeID: eid,
          targetRoomName: undefined,
          targetFileID: undefined,
          reid: _objShareDoc.doc.id
        });
        await shareDocList({
          sourceDocList: insuranceList,
          // @ts-ignore
          targetEdgeID: eid,
          targetRoomName: undefined,
          targetFileID: undefined,
          reid: _objShareDoc.doc.id
        });

      }
    }))

  },
  async shoppingCartProductionStatus({
    cartList,
    productionIdPath,
    attr,
    valueArr,
    errorArr,
  }:{
    cartList: any[]
    productionIdPath: string
    attr: string[]
    valueArr: string[]
    errorArr: string[]
  }) {
    const cloneList = cloneDeep(cartList)
    const productionList = cartList.map(item=>get(item,productionIdPath))
    const productionResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: productionList
    })
    const productionDocumentList = productionResp?.data?.document?.length
    ? productionResp?.data?.document
    : []
    const docList = await Promise.all(productionDocumentList.map(
      async (document) => await documentToNote({ document: replaceUint8ArrayWithBase64(document) }),
    ))
    for (const item of docList) {
        let currentCart = cloneList.find(cart=>(get(item,'id') === get(cart,productionIdPath)))   
        if (item?.tage === 1 && item?.type > 0) {
          attr.forEach((j,order)=>{
            set(currentCart,j,valueArr[order])
          })
        } else {
          attr.forEach((j,order)=>{
            set(currentCart,j,errorArr[order])
          })
        }
    }
    return cloneList
  },
  async distinguishOnOrOffShelvesProducts({
    productionList
  }:{
    productionList: {[key in string]: any}[]
  }){
    let productIdList: string[] = [];
    productionList.forEach(product => {
      productIdList.push(product.id)
    })
    let documentList = await store.level2SDK.documentServices.retrieveDocument({
      idList: productIdList
    })
    let docList = documentList?.data?.document
    let reProductionList = await Promise.all(
      docList.map(async document => (await documentToNote({document})))
    )
    let grounding: {}[] = []
    let undercarriage : {}[] = []
    reProductionList.forEach( async pro =>{
      pro.id = await store.level2SDK.utilServices.uint8ArrayToBase64(get(pro,"id"))
      if(pro.tage===1 && pro.name.title > 0){
        grounding.push(pro)
      }else{
        undercarriage.push(pro)
      }
    })
    return{
      grounding,undercarriage
    }

  },
  async updateDocListByTage({ sourceDocList,tage }) {
    return await Promise.all(
      sourceDocList.map(async (sourceDoc) => {
        let content = sourceDoc?.name?.data
        if (typeof content === 'string') {
          content = await store.level2SDK.utilServices.base64ToBlob(
            sourceDoc?.name?.data,
            sourceDoc?.name?.type,
          )
        }
        const {  type, eid, name, reid, fid, subtype, ...restOptions } = sourceDoc
        const { title, tags, user, targetRoomName, ...restNameOptions } = name
        const mediaType = restNameOptions.type

        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: sourceDoc.bsig,
            type: 1030,
          })
        }

        await Document.update(sourceDoc?.id, {
          edge_id: eid,
          content: content,
          user: user,
          type: type,
          title: title,
          tags: tags,
          reid: reid,
          fid: fid,
          tage: tage,
          mediaType: mediaType,
          targetRoomName: targetRoomName,
          dTypeProps: subtype
        })

        if (sourceDoc.bsig != localStorage.getItem('user_vid')?.toString()) {
          await store.level2SDK.edgeServices.createEdge({
            bvid: localStorage.getItem('user_vid')?.toString(),
            type: 1030,
          })
        }
      }),
    )
  },
  async shoppingCartStockStatus({
    cartList,
    productionIdPath,
    purchaseNumPath,
    purchasePricePath,
    purchaseTotalMoneyPath,
    inventoryIdPath,
    inventoryNumPath,
    inventoryPricePath = 'name.data.price',
    attr,
    valueArr,
    errorArr,
    flag = false,
    superAdminId,
  }: {
    cartList: any[]
    productionIdPath: string
    purchaseNumPath: string
    purchasePricePath: string
    purchaseTotalMoneyPath: string
    inventoryIdPath: string
    inventoryNumPath: string
    inventoryPricePath: string
    attr: string[]
    valueArr: any[]
    errorArr: any[]
    flag: boolean,
    superAdminId: string
  }) {
    async function _cartHandle(cartOrder) {
        // ? 查询当前购物车商品doc
        const productionResp =
          await store.level2SDK.documentServices.retrieveDocument({
            idList: [get(cartOrder,productionIdPath)],
          })
        const productionDocumentList = productionResp?.data?.document?.length
          ? productionResp?.data?.document
          : []
        const productionList = await Promise.all(productionDocumentList.map(
          async (document) => await documentToNote({ document: replaceUint8ArrayWithBase64(document) }),
        ))
        const currentProduction = productionList[0]
        // ?判断当前商品状态
        /* 
          * 1. 商品有效 规格库存 大于 购买数
          * 2. 商品有效 规格库存 小于等于 购买数 且 规格库存>0
          * 3. 商品有效 规格库存 小于 购买数 且 规格库存=0
          * -------------------------------------------
          * 4. 商品下架  
        */
        const currentProductionStatus = currentProduction?.tage === 1 && currentProduction?.type > 0  ? true : false
        if (currentProductionStatus) {
          // ? 商品有效表现
          attr.forEach((j, order) => {
            set(cartOrder, j, valueArr[order])
          })
          // ? 查询商品种类库存doc
          const inventoryResp= await store.level2SDK.documentServices.retrieveDocument({
            idList: [get(cartOrder,inventoryIdPath)],
          })  
          const inventoryDocumentList = inventoryResp?.data?.document?.length
          ? inventoryResp?.data?.document
          : []
          const inventoryList = await Promise.all(inventoryDocumentList.map(
            async (document) => await documentToNote({ document: replaceUint8ArrayWithBase64(document) }),
          ))
          const currentStock = inventoryList[0]
          // ? 判断当前商品对应的库存是否存在
          if (currentStock) {
            // ? 判断当前库存是否支持邮寄
            const shoppingStatus = get(currentStock,'tage').toString(2).split('').reverse()[1] === '1' && currentStock.bsig !== superAdminId
            if (shoppingStatus) {
              const {data}= await store.level2SDK.documentServices.retrieveDocument({
                idList: [currentStock.id],
                options: {
                  ObjType: 28,
                  xfname: "D3.Id",
                  sfname: "{\"join\":\"INNER JOIN Doc D2 ON D2.reid=D.id INNER JOIN Doc D3 ON D3.id=D2.fid\",\"result\":\"D.*\"}",
                  scondition: "D.type=199681 AND D3.type=199681 AND D2.type=473601"
                }
              })
              const superadminInventory = await Promise.all(
                data.document.map(
                  async (doc) =>
                    await documentToNote({
                      document: replaceUint8ArrayWithBase64(doc),
                    }),
                ),
              )
              if (superadminInventory.length !== 0) {
                currentStock.name.title = (+superadminInventory[0].name.title + +currentStock.name.title).toString()
                currentStock.name.data.price = superadminInventory[0].name.data.price
              }
            }
            // ?规格库存总数
            const totalInventory = get(currentStock, inventoryNumPath)
            // ?当前购买数
            const currentInventory = get(cartOrder, purchaseNumPath)
            // ?当前购物车下单价
            const currentInventoryPrice = get(cartOrder, purchasePricePath)
            // ?规格商品单价
            const totalInventoryPrice = get(currentStock, inventoryPricePath)
            // ? 单价是否改变
            set(cartOrder, 'priceChange', false)
            // * 商品有效 规格库存 小于 购买数 且 规格库存不为0
            if (+totalInventory <= +currentInventory && +totalInventory > 0 && +currentInventory > 0) {
              // ? 商品是否有效
              ;+totalInventory === +currentInventory
                ? set(cartOrder, 'productionIsValid', true)
                : set(cartOrder, 'productionIsValid', false)
              //  ? 是否将最大库存数设置为当前订单购买数量
              if (flag) {
                // ?将购买数 设置为最大库存数
                set(cartOrder, purchaseNumPath, +totalInventory)
                // ?更新totalMoney
                set(
                  cartOrder,
                  purchaseTotalMoneyPath,
                  (+totalInventory * +totalInventoryPrice).toFixed(2),
                )
                set(cartOrder, 'productionIsValid', true)

                const facilityId = get(cartOrder,"name.data.orderList[0].productionList[0].facilityId")
                const sourceFacilityId = get(cartOrder,"name.data.orderList[0].productionList[0].sourceFacilityId")
                if (sourceFacilityId && facilityId === superAdminId) {
                  set(cartOrder,'name.data.orderList[0].productionList[0].facilityId',sourceFacilityId)
                }
                // ?更新对应的购物车数据
                await Document.update(cartOrder?.id, {
                  edge_id: cartOrder?.eid,
                  content: cartOrder?.name?.data,
                  type: cartOrder?.type,
                  title: cartOrder?.name?.title,
                  tage: cartOrder?.tage,
                  mediaType: 'application/json',
                  dTypeProps: cartOrder?.subtype,
                  fid: cartOrder.fid,
                  atimes: -10,
                  paymentNonce: (+totalInventory).toString()
                })
              }
            } else if(+totalInventory < +currentInventory && +totalInventory === 0 && +currentInventory > 0) {
              // ? 商品是否无效
              set(cartOrder, 'productionIsValid', false)
              // ? 下架商品样式表现
              attr.forEach((j, order) => {
                set(cartOrder, j, errorArr[order])
              })
            }else {
              // ? 商品是否有效
              set(cartOrder, 'productionIsValid', true)
            }
            /*
            * 判断当前购物车商品单价和库存单价是否相同 (库存对应的商品价格变动)
            */
            if (+currentInventoryPrice !== +totalInventoryPrice) {
              set(cartOrder, 'productionIsValid', false)
              // ? 商品单价是否变化
              set(cartOrder, 'priceChange', true)
              if (flag) {
                set(cartOrder, 'productionIsValid', true)
                set(cartOrder, 'priceChange', false)
                // ?永远拿最新的单价
                set(cartOrder, purchasePricePath, totalInventoryPrice)
                // ?更新totalMoney
                set(
                  cartOrder,
                  purchaseTotalMoneyPath,
                  (+currentInventory * +totalInventoryPrice).toFixed(2),
                )
                // ?更新对应的购物车数据
                await Document.update(cartOrder?.id, {
                  edge_id: cartOrder?.eid,
                  content: cartOrder?.name?.data,
                  type: cartOrder?.type,
                  title: cartOrder?.name?.title,
                  tage: cartOrder?.tage,
                  mediaType: 'application/json',
                  dTypeProps: cartOrder?.subtype,
                  fid: cartOrder.fid,
                  atimes: -10,
                })
              }
            }
          } else {
            // ? 下架商品样式表现
            attr.forEach((j, order) => {
              set(cartOrder, j, errorArr[order])
            })
            // ? 商品是否有效
            set(cartOrder, 'productionIsValid', false)
          }
        } else {
          // ? 下架商品样式表现
          attr.forEach((j, order) => {
            set(cartOrder, j, errorArr[order])
          })
          // ? 商品是否有效
          set(cartOrder, 'productionIsValid', false)
        }

        return cartOrder
    }
    return await Promise.all(cartList.map(async cart=> await _cartHandle(cart)))    
  },
  async updateThirdApply({
    id
  }:{
    id: string[]
  }){
    const queryOptions = {
      ObjType: 28,
      type: 253441,
      xfname: 'E2.Bvid',
      sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid\"}",
      scondition: "E2.type=40000 AND E.subtype&0xff in (6,100)  AND D.type=253441 AND D.tage=0",
      obfname: "ctime",
      maxcount: 3000,
    }
    const docResp = await store.level2SDK.documentServices.retrieveDocument({
      // idList: id,
      idList: id,
      options: queryOptions,
    })
    let documents = docResp?.data?.document
    let docList = await Promise.all(documents.map(document => documentToNote({document})))
    log.debug('bb');
    
    for(let i = 0; i < docList.length; i++) {
      // claimRecord 没有该属性
      let doc = docList[i];
      if(!doc.name.data.hasOwnProperty('totalApplied')){
        log.debug('doc',doc);

        // log.debug('before', replaceUint8ArrayWithBase64(doc.bsig));
        // let a = await Document.update(doc.id, {
        //   edge_id: eid,
        //   content: content,
        //   user: user,
        //   type: type,
        //   title: title,
        //   tags: tags,
        //   reid: reid,
        //   fid: fid,
        //   tage: 0,
        //   mediaType: mediaType,
        //   dTypeProps: subtype
        // })
        // log.debug('after', replaceUint8ArrayWithBase64(a.doc));
      }

    }
    log.debug('docList', docList);
    return docResp
  },
  async updateClaimProperties({
    id
  }:{
    id: string[]
  }){
    const queryOptions = {
      type: 253441,
      xfname: 'none',
      maxcount: 3000
    }
    // const queryOptions = {
    //   type: 253441,
    //   ObjType: 28,
    //   xfname: 'E2.Bvid,E2.Evid',
    //   sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid\"}",
    //   sCondition: "E2.type=40000 AND E.subtype&0xff in (6,100) AND D.tage=0",
    //   maxcount: 3000
    // }
    const docResp = await store.level2SDK.documentServices.retrieveDocument({
      // idList: id,
      idList: [],
      options: queryOptions,
    })

    let documents = docResp?.data?.document
    let docList = await Promise.all(documents.map(document => documentToNote({document})))
    // docList.forEach(async doc => {
    for(let i = 0; i < docList.length; i++) {
      // claimRecord 没有该属性
      let doc = docList[i];
      if(!doc.name.data.hasOwnProperty('patientPayment')){
        log.debug(i);
        let meetingId = await store.level2SDK.utilServices.uint8ArrayToBase64(get(doc, "esig"))
        // patient payment
        const res = await store.level2SDK.documentServices.retrieveDocument({
          idList: [meetingId],
          options: {
            type: 171521,
            xfname: "reid",
            maxcount: 100
          },
        })
        // super bill
        const codeRes = await store.level2SDK.documentServices.retrieveDocument({
          idList: [meetingId],
          options: {
            type: 184321,
            xfname: "reid",
            maxcount: 100
          },
        })
        let codes = codeRes.data.document
        log.debug('superbill', codes);
        let payments = res.data.document
        let superbill = await Promise.all(
          codes.map(
            code => {
                console.error(documentToNote({document: code}));
                return documentToNote({document: code})
            }
        ))
        let currentPatientPayments = await Promise.all(payments.map( payment => documentToNote({document: payment})))

        log.debug('superbill', superbill);
        log.debug('currentPatientPayments', currentPatientPayments);

        doc.name.data.patientPayment = {}
        doc.name.data.patientPayment.patientPaymentApplied = []
        doc.name.data.patientPayment.totalPatientPaymentApplied = {}
        doc.name.data.patientPayment.totalPatientPaymentApplied.codeAssignCondition = []
        if(currentPatientPayments?.length != 0 && superbill?.length != 0 ){
          doc.name.data.patientPayment = generatePatientPaymentApplied(superbill[0]?.name?.data?.procedureCodeList, doc.name.data.appStime, currentPatientPayments, doc.name.data.patientPayment.patientPaymentApplied )
        }
        let content = doc?.name?.data    
        const { tage, type, eid, name, reid, fid, subtype, ...restOptions } = doc
        const { title, tags, user, ...restNameOptions } = name
        const mediaType = restNameOptions.type  
        // log.debug('before', replaceUint8ArrayWithBase64(doc));
        await store.level2SDK.edgeServices.createEdge({
          bvid: doc.bsig,
          type: 1030,
        })
        // log.debug('before', replaceUint8ArrayWithBase64(doc.bsig));
        let a = await Document.update(doc.id, {
          edge_id: eid,
          content: content,
          user: user,
          type: type,
          title: title,
          tags: tags,
          reid: reid,
          fid: fid,
          tage: 0,
          mediaType: mediaType,
          dTypeProps: subtype
        })
        // log.debug('after', replaceUint8ArrayWithBase64(a.doc));
        function generatePatientPaymentApplied(arr, stime, patientPayment, claimRecord) {
          let claimArrays: any[] = claimRecord;
          let havePaymentIds = claimRecord.map(item => item['patientPaymentId'])
          for (let i = 0; i < patientPayment.length; i++) {
              let obj = {}
              if(!havePaymentIds.includes(patientPayment[i]['id'])){
                  let newArr: {}[] = []
                  for (let j = 0; j < arr?.length; j++) {
                      if (arr[j].hasOwnProperty('hashCode')) {
                          let str = ''
                          for (let k = 0; k < arr[j]['modifiers'].length; k++) {
                              str += arr[j]['modifiers'][k].split(' -')[0] + '; '
                          }
                          let amountInit = (parseFloat(arr[j]['charge']) * parseFloat(arr[j]['quantity'])).toFixed(2)
                          newArr[j] = {
                              adjustment: '0.00',
                              appliedAmount: '0.00',
                              cptCode: str,
                              stime: stime,
                              code: arr[j]['code'],
                              panelCode: arr[j]['panelCode'],
                              hashCode: arr[j]['hashCode'],
                              deductable: '0.00',
                              patientPaid: '0.00',
                              coInsurance: '0.00',
                              copay: '0.00',
                              ptBalance: '0.00',
                              description: arr[j]['description'],
                              amountBilled: amountInit,
                              billBalance: amountInit,
                          }
                      }
                  }
                  obj = {
                      patientPaymentId: patientPayment[i]['id'],
                      isAssignment: false,
                      codeAssignCondition: newArr
                  }
              }
              if(Object.keys(obj).length > 0) claimArrays.push(obj)
          }
          let totalPatientPaymentApplied = {};
          totalPatientPaymentApplied['codeAssignCondition'] = []
          for (let i = 0; i < arr?.length; i++) {
              totalPatientPaymentApplied['codeAssignCondition'][i] = {}
          }
          totalPatientPaymentApplied['codeAssignCondition'].forEach((obj, index) => {
              let tempObj = {
                  adjustment: '0.00',
                  amountBilled: '0.00',
                  appliedAmount: '0.00',
                  billBalance: '0.00',
                  coInsurance: '0.00',
                  code: '',
                  copay: '0.00',
                  cptCode: '',
                  deductable: '0.00',
                  description: '',
                  hashCode: '',
                  panelCode: '',
                  patientPaid: '0.00',
                  ptBalance: '0.00',
                  stime: ''
              }
              claimArrays.forEach((item) => {
                  let pay = item['codeAssignCondition']
                  tempObj['adjustment'] = (parseFloat(tempObj['adjustment']) + parseFloat(pay[index]['adjustment'])).toFixed(2);
                  tempObj['appliedAmount'] = (parseFloat(tempObj['appliedAmount']) + parseFloat(pay[index]['appliedAmount'])).toFixed(2);
                  tempObj['patientPaid'] = pay[index]['patientPaid'];
                  tempObj['coInsurance'] = pay[index]['coInsurance'];
                  tempObj['copay'] = pay[index]['copay'];
                  tempObj['deductable'] = pay[index]['deductable'];
                  tempObj['ptBalance'] = pay[index]['ptBalance'];
                  tempObj['amountBilled'] = pay[index]['amountBilled'];
                  tempObj['billBalance'] = (parseFloat(tempObj['amountBilled']) + parseFloat(tempObj['appliedAmount']) + parseFloat(tempObj['adjustment']) + parseFloat(tempObj['patientPaid'])).toFixed(2);
                  tempObj['code'] = pay[index]['code'];
                  tempObj['cptCode'] = pay[index]['cptCode'];
                  tempObj['description'] = pay[index]['description'];
                  tempObj['hashCode'] = pay[index]['hashCode'];
                  tempObj['panelCode'] = pay[index]['panelCode'];
                  tempObj['stime'] = pay[index]['stime'];
              })
              totalPatientPaymentApplied['codeAssignCondition'][index] = tempObj
          });
          let res = {
              patientPaymentApplied: claimArrays,
              totalPatientPaymentApplied,
          }
          return res
        }
      }

    }
    log.debug(docList);
    return docResp
  },
  changePatPayment(){
    store.level2SDK.documentServices.retrieveDocument({
      idList: [],
      options: {
        xfname: "none",
        type: 171521,
        maxcount: 1000,
      }
    }).then(async resp => {
      let docArr = get(resp,"data.document")
      let noteArr = await Promise.all(docArr.map((eachDoc)=> documentToNote({document:replaceUint8ArrayWithBase64(eachDoc)})))
      return noteArr
    }).then(resp => {
        let patPayment = resp
        let reasonArr: any[] = [] 
        let otherIdArr: any[] = []
        patPayment.forEach(element => {
          if(get(element,"name.data.totalAmount")){
            if(get(element,"name.title.amount")){
              reasonArr.push(element)
            }else{
              otherIdArr.push(element)
            }
          }
        });
    })
  },
  async handlePatPayment(){
    let patPayment:any = []
    let errId:any = []
    let updateErrorId:any = []
      for (let index = 0; index < patPayment.length; index++) {
        const eachPay = patPayment[index];
        const resp  = await store.level2SDK.edgeServices.createEdge({
          bvid: eachPay.bsig,
          type: 1030,
        })
        
        if (resp.code === -1) {
          errId.push(eachPay?.id)
          continue  
        } else {
          let respp = await Document.update(eachPay?.id, {
            edge_id: eachPay?.eid,
            content: eachPay?.name?.data,
            type: eachPay?.type,
            paymentNonce: eachPay?.name?.title,
            title: {
              "amount":  (+get(eachPay,"name.data.totalAmount")).toFixed(2),
              "appliedAmount": "0.00",
              "balance": (+get(eachPay,"name.data.totalAmount")).toFixed(2)
            },
            tage: eachPay?.tage,
            mediaType: 'application/json',
            dTypeProps: eachPay?.subtype,
            fid: eachPay.fid,
            // jwt: data?.jwt
          })
        }
      
      }
    // patPayment.forEach(async eachPay => {
    //   await store.level2SDK.edgeServices.createEdge({
    //     bvid: eachPay.bsig,
    //     type: 1030,
    //   })
    //   await Document.update(eachPay?.id, {
    //     edge_id: eachPay?.eid,
    //     content: eachPay?.name?.data,
    //     type: eachPay?.type,
    //     paymentNonce: eachPay?.name?.title,
    //     title: {
    //       "amount":  (+get(eachPay,"name.data.totalAmount")).toFixed(2),
    //       "appliedAmount": "0.00",
    //       "balance": (+get(eachPay,"name.data.totalAmount")).toFixed(2)
    //     },
    //     tage: eachPay?.tage,
    //     mediaType: 'application/json',
    //     dTypeProps: eachPay?.subtype,
    //     fid: eachPay.fid,
    //     // jwt: data?.jwt
    //   })
      
    // });
  },
  async generateDetailReport({
    facilityId,
    payerIdList,
    otherIdList
  }:{
    facilityId: string,
    payerIdList: string[],
    otherIdList: string[]
  }){
    const queryMeeting = {
      ObjType: 28,
      xfname: 'D2.Id,E2.Bvid,E2.Evid',
      sfname: "{\"join\":\"INNER JOIN Doc D on E.id=D.reid INNER JOIN Doc D2 ON D2.id=D.fid INNER JOIN Edge E2 on E2.id = E.refid\",\"result\":\"E.*\"}",
      scondition: "E2.type=40000 AND E.type=40000 AND E.subtype&0xff in (6,15,17,100) AND D.type=350721 AND D2.type in (314880, 314881)",
      maxcount: 1000
    }
    // const queryPatientPayment = {
    //   xfname: "reid",
    //   type: 171521,
    //   scondition: 'tage=0',
    //   maxcount: 500
    // }
    const queryPatientProfile = {
      xfname: "(E.bvid,E.evid)|(E.evid,E.bvid)",
      ObjType: 8,
      maxcount: 500,
      obfname: "ctime",
      scondition: "E.type=10002 AND D.type=102401"
    }
    const queryMeetingFinancial = {
      xfname: "reid",
      type: 174081,
      obfname: "ctime"
    }
    const queryClaim = {
      xfname: "reid",
      type: 253441,
      obfname: "ctime"
    }
    let payersConnectMeeting:{}[] = [], otherId = cloneDeep(otherIdList);
    // 获取payer doc
    const payerDocPromise = payerIdList.map(async id => {
      const docResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [id]
      })
      const payerDoc = docResp.data.document[0]
      const payerRes = await documentToNote({document: payerDoc})
      const payerId = await store.level2SDK.utilServices.uint8ArrayToBase64(payerRes.id)
      return {
        id: payerId,
        name: payerRes.name.data.payerName,
        phone: payerRes.name.data.phone,
      }
    })
    // 根据payer doc, match payer doc, 查询每个payer的meeting
    const meetingPromise = payerIdList.map(async id => {
      otherIdList = cloneDeep(otherId)
      otherIdList.unshift(id)
      const currentPayerAndOtherId = otherIdList
      const edgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
        idList: currentPayerAndOtherId,
        options: queryMeeting,
      })
      const meetings = edgeResponse.data.edge
      return meetings
    })
    
    // 异步处理 payerDoc meetingEdge
    const payerInfo = await Promise.all(payerDocPromise)
    const meetingEdge = await Promise.all(meetingPromise)
    log.debug('meetingEdge',meetingEdge );
    const res = await Promise.all(
      payerIdList.map(async (id, i) => {
        try{
          let payerId = id
          const payerResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: [payerId],
          })
          let reportObj : { payerInfo:{}, detailReport: {}[], totalAmount: {} }
          reportObj = {
            payerInfo: payerInfo[i],
            detailReport: [],
            totalAmount: {
              current: '',
              overThirty: '',
              overSixty: '',
              overNinty: '',
              total: '',
            }
          }
          let meetings = meetingEdge[i]
          log.debug('meetings',meetings );
          if(meetings.length != 0){
            let isPassProgress = 0
            // meeting 异步处理
            for(let j = 0; j < meetings?.length; j++) {
              log.debug('meeeting index, payer id', j,meetings[j],payerId );
              let patientProfileId = ''
              let insuranceNumber = '', fincialInfo = {}, patientResp = {}, patientInfo: any= {}, patientId = ''
              // let fincialResp, claimRecordResp, claimRecord: { name?: { data?: { firstInsuranceHasUsed?: number, status?: string, claimBalance?: string } }} = {}
              
              let detailObj = {
                meetingInfo: {
                  id: "",
                  startTime: '',
                },
                patientInfo: {
                  id: '',
                  name: '',
                  phone: '',
                  dateOfBirth: '',
                  patStatus: '',
                  subscriberID: ''
                },
                patientPayment: {
                  current: '',
                  overThirty: '',
                  overSixty: '',
                  overNinty: '',
                  total: '',
                }
              }
              const meetingId = await store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].eid)
              // claimRecord finical 异步处理
              const claimRecordDocPromise = store.level2SDK.documentServices.retrieveDocument({
                idList: [meetingId],
                options: queryClaim,
              })
              const fincialDocPromise = store.level2SDK.documentServices.retrieveDocument({
                idList: [meetingId],
                options: queryMeetingFinancial,
              })

              // 根据会议信息查询102401
              const meetingResp = await store.level2SDK.edgeServices.retrieveEdge({
                idList: [meetingId]
              })
              
              if(meetingResp.data.edge[0].name.patientId){
                patientId = meetingResp.data.edge[0].name.patientId
              }
              else if(store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid) === facilityId){
                patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].evid)
              }
              else if(store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid) === meetingResp.data.edge[0].name.providerId){
                patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].evid)
              }else{
                patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid)
              }
              // 2024.6.25_修改了102401的查询方式
              const patientDocPromise = store.level2SDK.documentServices.retrieveDocument({
                idList: [patientId,facilityId],
                options: queryPatientProfile,
              })
              let fincialResp = {}
              let claimRecordResp = {}
              let claimRecord : any = {}
              const [claimRecordDocResp, fincialDocResp, patientDocResp] = await Promise.all([claimRecordDocPromise, fincialDocPromise, patientDocPromise])
              // claimRecord fincial patientInfo 解压缩异步处理, *claim为必须项
              if(claimRecordDocResp.data.document.length != 0){
                claimRecordResp = claimRecordDocResp.data.document[0]
                fincialResp = fincialDocResp.data.document[0]
                patientResp = patientDocResp.data.document[0]
                const unzipClaim = documentToNote({document: claimRecordResp})
                const unzipFincial = documentToNote({document: fincialResp})
                const unzipPatientInfo = documentToNote({document: patientResp})
                const [unzippedClaimData, unzipFincialData, unzipPatientInfoData] = await Promise.all([unzipClaim, unzipFincial, unzipPatientInfo])
                claimRecord = unzippedClaimData
                fincialInfo = unzipFincialData
                patientInfo = unzipPatientInfoData
                insuranceNumber = judgeInsuranceNumber(payerId, fincialInfo)
                patientProfileId = await store.level2SDK.utilServices.uint8ArrayToBase64(patientInfo.id)
              }
              if(Object.keys(claimRecord).length != 0 && claimRecord?.name?.data?.claimBalance != '' && claimRecord?.name?.data?.claimBalance != '0.00'  ){
                // 当前payer是第一保险 并且未分配状态 不是Secondary Insurance 则进行业务处理
                if(insuranceNumber === '1' && claimRecord?.name?.data?.firstInsuranceHasUsed != 1 && claimRecord?.name?.data?.status != 'Secondary Insurance'){
                  await processingPayement()
                  isPassProgress = 1
                }
                // 当前payer是第二保险 并且已分配状态 是Secondary Insurance 则进行业务处理
                else if(insuranceNumber === '2' && claimRecord?.name?.data?.firstInsuranceHasUsed == 1 && claimRecord?.name?.data.status == 'Secondary Insurance'){
                  await processingPayement()
                  isPassProgress = 1
                }
              }
              
              // payment 相关业务处理
              async function processingPayement(){
                detailObj.meetingInfo = {
                  id: meetingId,
                  startTime: meetings[j].stime,
                }
                detailObj.patientInfo = {
                  id: patientProfileId,
                  name: patientInfo.name.data?.basicInfo?.fullName,
                  phone: patientInfo.name.data?.basicInfo?.phone,
                  dateOfBirth: patientInfo.name.data?.basicInfo?.dateOfBirth,
                  patStatus: 'Active',
                  subscriberID: getPayerInsuranceID(payerId, fincialInfo),
                }
                // amount
                detailObj.patientPayment = getMeetingAmount(claimRecord, meetings[j].stime)
                reportObj.detailReport.push(detailObj)
              }
              // 根据payer匹配fincial中填写的的payer的insurance ID
              function getPayerInsuranceID(payerId, fincialInfo){
                const fincialCon = fincialInfo.name.data
                switch(fincialCon.medicalVisitInfo.visitType??''){
                  case 'Medical Insurance':
                    if(fincialCon.medicalInsurance?.firstMatchPayer?.payerDocId == payerId) return fincialCon.medicalInsurance.defaultInsurance.ID
                    else if(fincialCon.medicalInsurance?.secondMatchPayer?.payerDocId == payerId) return fincialCon.medicalInsurance.secondaryInsurance.ID
                  case 'Workers Comp':
                    return ''
                  case 'Personal Injury':
                    if(fincialCon.personalInjury?.firstMatchPayer?.payerDocId == payerId) return fincialCon.personalInjury.primaryInsurance.ID
                    else if(fincialCon.personalInjury?.secondMatchPayer?.payerDocId == payerId) return fincialCon.personalInjury.secondaryInsurance.ID
                }
                return ''
              }
              // 求得meeting金额
              function getMeetingAmount(claimRecord, stime){
                let meetingConnectPaymentSum = claimRecord.name.data?.claimBalance
                let obj = {
                  current: '0.00',
                  overThirty: '0.00',
                  overSixty: '0.00',
                  overNinty: '0.00',
                  total: meetingConnectPaymentSum,
                }
                let nowStamp = new Date().getTime()/1000
                const timeDifference = nowStamp - stime;
                log.debug('timeDifference',timeDifference);
                if(timeDifference <= 2592000) {
                  obj.current = meetingConnectPaymentSum;
                }else if(timeDifference > 2592000 && timeDifference <= 5184000){
                  obj.overThirty = meetingConnectPaymentSum;
                }else if(timeDifference > 5184000 && timeDifference <= 7776000){
                  obj.overSixty = meetingConnectPaymentSum;
                }else {
                  obj.overNinty = meetingConnectPaymentSum;
                }
                return obj
              }
              // 求得当前payer第几保险
              function judgeInsuranceNumber(payerId, fincialInfo){
                const fincialCon = fincialInfo.name.data
                switch(fincialCon.medicalVisitInfo.visitType??''){
                  case 'Medical Insurance':
                    if(fincialCon.medicalInsurance?.firstMatchPayer?.payerDocId == payerId) return '1'
                    else if(fincialCon.medicalInsurance.secondMatchPayer?.payerDocId == payerId) return '2'
                  case 'Workers Comp':
                    if(fincialCon.workersComp?.insuranceMatchPayer?.payerDocId == payerId) return '1'
                  case 'Personal Injury':
                    if(fincialCon.personalInjury?.firstMatchPayer?.payerDocId == payerId) return '1'
                    else if(fincialCon.personalInjury?.secondMatchPayer?.payerDocId == payerId) return '2'
                }
                return ''
              }
            }
            if(isPassProgress == 1) payersConnectMeeting.push(reportObj)
          }
        }catch(err){
          console.error('An error occurred in Promise.all for payerId:', id, err);
        }
      })
    ).catch(error => {
      console.error('An error occurred in Promise.all:', error);
    });
    // total amount
    function computedTotalAmount(payersConnectMeeting){
      payersConnectMeeting.forEach(onePayer => {
        onePayer.detailReport.forEach(detail => {
          let {totalAmount} = onePayer
          let {patientPayment} = detail
          Object.keys(patientPayment).forEach(key => {
            totalAmount[key] = (+totalAmount[key]) + (+patientPayment[key])
          })
        })
        let {totalAmount} = onePayer
        Object.keys(totalAmount).forEach(key => {
          totalAmount[key] = Math.round(totalAmount[key]* 100) / 100
        })
      })
      return payersConnectMeeting
    }
    payersConnectMeeting = computedTotalAmount(payersConnectMeeting)
    return payersConnectMeeting
  },
  async generateDetailReportSelfPay({
    facilityId,
    otherIdList
  }:{
    facilityId: string,
    otherIdList: string[]
  }){
    const queryPatientPayment = {
      xfname: "reid",
      type: 171521,
      scondition: 'tage=0',
      maxcount: 500
    }
    const queryPatientProfile = {
      xfname: "(E.bvid,E.evid)|(E.evid,E.bvid)",
      ObjType: 8,
      maxcount: 500,
      obfname: "ctime",
      scondition: "E.type=10002 AND D.type=102401"
    }
    const querySelfPayMeeting = {
      ObjType: 28,
      xfname: "E2.Bvid,E2.Evid",
      sfname: "{\"join\":\"INNER JOIN Edge E2 on E2.id = E.refid\",\"result\":\"E.*\"}",
      scondition: "E2.type=40000 AND E.type=40000 AND E.subtype&0xff in (6,15,17,100) AND E.tage&0x4000=0x4000",
      maxcount: 1000
    }
    const selfDocResp = await store.level2SDK.edgeServices.retrieveEdge({
      idList: otherIdList,
      options: querySelfPayMeeting,
    })
    let payersConnectMeeting:{}[] = [];
    
    let reportObj : { payerInfo:{}, detailReport: {}[], totalAmount: {} }
    reportObj = {
      payerInfo: {
        id: '',
        name: '',
        phone: ''
      },
      detailReport: [],
      totalAmount: {
        current: '',
        overThirty: '',
        overSixty: '',
        overNinty: '',
        total: '',
      }
    }
    const meetings = selfDocResp.data.edge
    log.debug(meetings);
    if(meetings.length != 0){
      
      const res = await Promise.all(
        meetings.map(async (meet, j) => {
          try{let  patientId = ''
          let detailObj = {
            meetingInfo: {
              id: "",
              startTime: '',
            },
            patientInfo: {
              id: '',
              name: '',
              phone: '',
              dateOfBirth: '',
              patStatus: '',
              subscriberID: ''
            },
            patientPayment: {
              current: '',
              overThirty: '',
              overSixty: '',
              overNinty: '',
              total: '',
            }
          }
          
          const meetingId = await store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].eid)
          const paymentDocPromise = store.level2SDK.documentServices.retrieveDocument({
            idList: [meetingId],
            options: queryPatientPayment,
          })
          //根据会议信息查询102401
          const meetingResp = await store.level2SDK.edgeServices.retrieveEdge({
            idList: [meetingId]
          })
          
         
          if(meetingResp.data.edge[0].name.patientId){
              patientId = meetingResp.data.edge[0].name.patientId
            }
            else if(store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid) === facilityId){
              patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].evid)
            }
            else if(store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid) === meetingResp.data.edge[0].name.providerId){
              patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].evid)
            }
            else{
              patientId = store.level2SDK.utilServices.uint8ArrayToBase64(meetings[j].bvid)
            }
          const patientDocPromise = store.level2SDK.documentServices.retrieveDocument({
            idList: [patientId,facilityId],
            options: queryPatientProfile,
          })
          // payment patient 异步请求
          const [paymentDocResp, patientDocResp] = await Promise.all([paymentDocPromise, patientDocPromise])
          const paymentResp = paymentDocResp.data.document
          let paymentList = await Promise.all(paymentResp.map(async p => await documentToNote({document: p})))
          const patientResp = patientDocResp?.data?.document[0]
          let patientInfo, patientProfileId = ''
          if(patientDocResp?.data?.document.length!=0){
            patientInfo = await documentToNote({document: patientResp})
            patientProfileId = await store.level2SDK.utilServices.uint8ArrayToBase64(patientInfo.id)
          }
          log.debug('aa1',paymentList );
          log.debug('aa2',patientResp );
          log.debug('aa3',patientInfo );
          
          await processingPayement()
          // payment 相关业务处理
          async function processingPayement(){
            detailObj.meetingInfo = {
              id: meetingId,
              startTime: meetings[j].stime,
            }
            detailObj.patientInfo = {
              id: patientProfileId,
              name: patientInfo?.name.data?.basicInfo?.fullName,
              phone: patientInfo?.name.data?.basicInfo?.phone,
              dateOfBirth: patientInfo?.name.data?.basicInfo?.dateOfBirth,
              patStatus: 'Active',
              subscriberID: '',
            }
            // amount
            if(paymentList.length != 0) {
              detailObj.patientPayment = getMeetingAmount(paymentList, meetings[j].stime)
              if(get(detailObj, 'patientPayment.total') != '0.00' ){
                reportObj.detailReport.push(detailObj)
                log.debug('reportObj', reportObj);
              }
            }
          }
          // 求得meeting金额
          function getMeetingAmount(paymentList, stime){
            let meetingConnectPaymentSum = 0
            paymentList.forEach(obj => {
              meetingConnectPaymentSum += +obj.name.title?.amount || 0
            })
            let str = meetingConnectPaymentSum.toFixed(2)
            let obj = {
              current: '0.00',
              overThirty: '0.00',
              overSixty: '0.00',
              overNinty: '0.00',
              total: str,
            }
            let nowStamp = new Date().getTime() / 1000
            const timeDifference = nowStamp - stime;
            if(timeDifference <= 2592000) {
              obj.current = str;
            }else if(timeDifference > 2592000 && timeDifference <= 5184000){
              obj.overThirty = str;
            }else if(timeDifference > 5184000 && timeDifference <= 7776000){
              obj.overSixty = str;
            }else {
              obj.overNinty = str;
            }
            return obj
          }}catch(err){
            log.debug('%An error occurred in Promise.all for payerId',meet, err );
          }

        })
      ).catch(error => {
        log.debug('An error occurred in Promise.all',error )
      })
      payersConnectMeeting.push(reportObj)
      log.debug('payersConnectMeeting',payersConnectMeeting);
      log.debug('meeting', meetings);
    }
    payersConnectMeeting = computedTotalAmount(payersConnectMeeting)
    function computedTotalAmount(payersConnectMeeting){
      payersConnectMeeting?.forEach(onePayer => {
        onePayer.detailReport?.forEach(detail => {
          const {patientPayment} = detail
          const {totalAmount} = onePayer
          Object.keys(patientPayment).forEach(key => {
            totalAmount[key] = (+totalAmount[key]) + (+patientPayment[key])
          })
        })
        const {totalAmount} = onePayer
        Object.keys(totalAmount).forEach(key => {
          totalAmount[key] = Math.round(totalAmount[key] * 100) / 100;
        });
      })
      return payersConnectMeeting
    }
    log.debug('result',payersConnectMeeting);
    
    return payersConnectMeeting
  },
  /**
   * @function
   * @description Get Doc via id
   * @param {string} docId
   * @returns {Document}
   */
  async getDoc({docId}){
    if(docId){
      const resp = await retrieveDocument(docId)
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      let note = await documentToNote({ document })
      note = replaceUint8ArrayWithBase64(note)
      let content = note?.name?.data
      if (typeof content === 'string') {
        note.name.data = await store.level2SDK.utilServices.base64ToBlob(
          note?.name?.data,
          note?.name?.type,
        )
      }
      
      return {
        doc: [note]
      }
    }
  },
  /**
   * @function
   * @description Get edge via id
   * @param {string} edgeId
   * @returns {edge}
   */
  async getEdge({edgeId}){
    if(edgeId){
      const resp = await retrieveEdge(edgeId)
      let edge = resp?.data?.edge?.length
        ? resp?.data?.edge[0]
        : null
      edge = replaceUint8ArrayWithBase64(edge)
      edge = replaceEidWithId(edge)
      return edge
    }
  },
  /**
   * 处理pickup location的对应状态
   * @param allLocList ————全部的location list
   * @param curSelLocList ————当前选中的location list
   * @returns 
   */
  async handlePickupLocation({ allLocList,curSelLocList }:{ allLocList: {}[],curSelLocList: {}[] }){
    const facility_vid = localStorage.getItem("facility_vid")
    await Promise.all(allLocList.map(async eachLoc => {
      const pickupResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(eachLoc,"id", '')],
        options: {
          xfname: "fid",
          type: 453121,
          maxcount: 1,
        }
      })
      if(pickupResp.data?.document.length){
        const pickup = await documentToNote({document:replaceUint8ArrayWithBase64(pickupResp?.data?.document[0])})
        let tage = find(curSelLocList,eachSel => get(eachSel,"id") === get(eachLoc,"id")) ? 1 : -1
        await Document.update(get(pickup,"id"),{
          atimes: -10,
          edge_id: get(pickup,"eid"),
          content: get(pickup,"name.data"),
          user: get(pickup,"name.user"),
          type: 453121,
          title: get(pickup,"eid"),
          tags: get(pickup,"name.tags"),
          fid: get(pickup,"fid"),
          tage: tage,
          mediaType: get(pickup,"name.type")
        }) 
               
      }else{
        // 处理新建
        if(find(curSelLocList,eachSel => get(eachSel,"id") === get(eachLoc,"id"))){
            // 获取facility-> location的1100
            const relateEdgeResp = await store.level2SDK.edgeServices.retrieveEdge({
              idList: [facility_vid,get(eachLoc,"id")],
              options: {
                  xfname: "bvid,evid",
                  maxcount: 1,
                  type: 1100
              }
            })
            const relateEdge = replaceUint8ArrayWithBase64(relateEdgeResp.data.edge[0])
            const eachCreateResp = await Document.nocheckcreate({
              atimes: -10,
              content: {
                facilityId: facility_vid,
              },
              type: 453121,
              edge_id: relateEdge?.eid,
              mediaType: 'application/json',
              fid: get(eachLoc,"id"),
              tage: 1,
            })
            
        }
      }
    }))
  },
  async createAboutProduct({
    dataArray,
    eid,
    reid,
    isDefault=false,
  }) {
    if (u.isArr(dataArray)) {
      return await Promise.all(
        // 创建种类doc
        dataArray.map(async (name) => {
          let title = get(name,"data.pickAndStock").reduce((pre,cur)=>pre+(+get(cur,"stock")),0).toString()
          const variant = await Document.nocheckcreate({
            atimes: -10,
            content: name?.data,
            title: title,
            type: 199681,
            edge_id: eid,
            mediaType: 'application/json',
            reid: reid ? reid : get(name,"productionId"),
            tage: isDefault ? 7 : 3, // tage位数： 11 (创建的是superadmin的商品)
          })
          // 创建sku-location
          await Promise.all(
            get(name,"data.pickAndStock").map(async eachPick=>{
              const skuLocation = await Document.nocheckcreate({
                atimes: -10,
                content: name?.data,
                title: get(eachPick,"stock") || "0",
                type: 455681,
                edge_id: eid,
                fid: get(eachPick,"pickupLocationId"),
                mediaType: 'application/json',
                reid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
              })
              return replaceUint8ArrayWithBase64(skuLocation['doc'])
            })
          )
          return replaceUint8ArrayWithBase64(variant['doc'])
        })
      )
    }
  },
  async updateAboutProduct({updateVariantList}:{updateVariantList:{}[]}){
    return Promise.all(updateVariantList.map(async eachVariant => {
        // 更新商品的种类doc
        const variantDoc = await Document.update(get(eachVariant,"id"), {
          atimes: -10,
          edge_id: get(eachVariant,"eid"),
          content: get(eachVariant,"name.data"),
          user: get(eachVariant,"name.user"),
          type: get(eachVariant,"type"),
          title: get(eachVariant,"name.title"),
          tags: get(eachVariant,"name.tags"),
          reid: get(eachVariant,"esig"),
          fid: get(eachVariant,"fid"),
          tage: get(eachVariant,"tage"),
          mediaType: get(eachVariant,"name.type"),
        })
        // 获取当前种类doc下所有的sku-location doc
        const skuLocationDocResp = await store.level2SDK.documentServices.retrieveDocument({
          idList: [get(eachVariant,"id", '')],
          options: {
            xfname: "reid",
            type: 455681,
          }
        })
        if(skuLocationDocResp?.data?.document.length){
          const skuLocation = replaceUint8ArrayWithBase64(skuLocationDocResp)
          skuLocation?.data?.document.map(async eachSkuLoc => {
            const skuLoc = await documentToNote({document: eachSkuLoc})
            let title = get(
              find(get(eachVariant,"name.data.pickAndStock"),eachPick=>get(eachPick,"pickupLocationId")===get(skuLoc,"fid")),
              "stock"
            )
            return await Document.update(get(skuLoc,"id"), {
              atimes: -10,
              edge_id: get(skuLoc,"eid"),
              content: get(eachVariant,"name.data"),
              user: get(skuLoc,"name.user"),
              type: get(skuLoc,"type"),
              title: title,
              tags: get(skuLoc,"name.tags"),
              reid: get(skuLoc,"esig"),
              fid: get(skuLoc,"fid"),
              tage: get(skuLoc,"tage"),
              mediaType: get(skuLoc,"name.type"),
            })
          })
        }else{
          // 创建sku-location
          await Promise.all(
            get(eachVariant,"name.data.pickAndStock", []).map(async eachPick=>{
              const skuLocation = await Document.nocheckcreate({
                atimes: -10,
                content: get(eachVariant,"name.data", ''),
                title: get(eachPick,"stock") || "0",
                type: 455681,
                edge_id: get(eachVariant,"eid", ''),
                fid: get(eachPick,"pickupLocationId"),
                mediaType: 'application/json',
                reid: get(eachVariant,"id"),
              })
              return replaceUint8ArrayWithBase64(skuLocation['doc'])
            })
          )
        }
        return replaceUint8ArrayWithBase64(variantDoc['doc'])
    }))
  },
  async orderProductStatus({
    cartList,
    productionFacilityIdPath,
    pickupLocationList,
    isPick = true
  }: {
    cartList: any
    productionFacilityIdPath: string
    pickupLocationList: any
    isPick: boolean
  }) {
    const cloneCartList = cloneDeep(cartList)
    const clonePickupLocationList = cloneDeep(pickupLocationList)
    await Promise.all(clonePickupLocationList.map(async (pick) => {
      if (pick.facilityId !== '' && pick.pickupLocationId !== '') {
        const currentFacilityProduct = cloneCartList.filter(
          (product) =>
            pick.facilityId ===
            get(
              product,
              'name.data.orderList[0].productionList[0].facilityId',
            ),
        )
        await Promise.all(currentFacilityProduct.map(async (product) =>{
          const currentProductTypeId = get(
            product,
            'name.data.orderList[0].productionList[0].inventoryId',
          )
          const  { data } =
          await store.level2SDK.documentServices.retrieveDocument({
            idList: [pick.pickupLocationId,currentProductTypeId],
            options: {
              xfname: 'fid,reid',
              type: 455681,
            },
          })
          const currentLocationSku = await Promise.all(
            data.document.map(
              async (doc) =>
                await documentToNote({
                  document: replaceUint8ArrayWithBase64(doc),
                }),
            ),
          )
          set(product, 'isSku', false)
          set(
            product,
            'name.data.orderList[0].productionList[0].pickUpLocationSkuId',
            '',
          )
          if (currentLocationSku.length === 0 && !isPick) {          
            const  {data}= await store.level2SDK.documentServices.retrieveDocument({
              idList: [currentProductTypeId],
              options: {
                ObjType: 28,
                xfname: "D3.Id",
                sfname: "{\"join\":\"INNER JOIN Doc D2 ON D2.reid=D.id INNER JOIN Doc D3 ON D3.id=D2.fid\",\"result\":\"D.*\"}",
                scondition: "D.type=199681 AND D3.type=199681 AND D2.type=473601"
              }
            })
            const superadminInventory = await Promise.all(
              data.document.map(
                async (doc) =>
                  await documentToNote({
                    document: replaceUint8ArrayWithBase64(doc),
                  }),
              ),
            )
            if (superadminInventory.length !==0 ) {
              const superadminInventorySku  =
              await store.level2SDK.documentServices.retrieveDocument({
                idList: [pick.pickupLocationId,superadminInventory[0].id],
                options: {
                  xfname: 'fid,reid',
                  type: 455681,
                },
              })
              const currentSuperadminInventorySku = await Promise.all(
                superadminInventorySku.data.document.map(
                  async (doc) =>
                    await documentToNote({
                      document: replaceUint8ArrayWithBase64(doc),
                    }),
                ),
              )
              set(product, 'isSku', true)
              set(
                product,
                'name.data.orderList[0].productionList[0].pickUpLocationSkuId',
                currentSuperadminInventorySku[0].id,
              )
              set(
                product,
                'name.data.orderList[0].productionList[0].pickUpLocation',
                pick.pickupLocation || pick.address,
              )
            }
          
          }else {
            currentLocationSku.forEach(sku=>{
              if (sku.esig === currentProductTypeId) {
                set(product, 'isSku', true)
                set(
                  product,
                  'name.data.orderList[0].productionList[0].pickUpLocationSkuId',
                  sku.id,
                )
                set(
                  product,
                  'name.data.orderList[0].productionList[0].pickUpLocation',
                  pick.pickupLocation || pick.address,
                )
              }  
            })
          }
        }))
      }
    })
    )
    return cloneCartList
  },
  async updateOrderProductStock({
    shoppingCart
  }:{
    shoppingCart: {[key in string]: any}[]
  }){
    await Promise.all(
      shoppingCart.map(async pro => {
        if(pro?.name?.title){
          const docResp = await retrieveDocument(pro?.esig)
          const document = docResp.data.document[0]
          const inventory = await documentToNote({ document });
          log.debug(inventory.name.title);
          set(pro, 'name.data.orderList[0].productionList[0].stock', inventory.name.title)
        }
      })
    )
    return shoppingCart
  },
  async addRecommendationProInventory({
    shoppingCart
  }:{
    shoppingCart: {[key in string]: any}[]
  }){
    await Promise.all(
      shoppingCart.map(async pro => {
        if(pro?.productionId){
          const docResp = await retrieveDocument(get(pro, 'inventoryId'))
          const document = docResp.data.document[0]
          const inventory = await documentToNote({ document });
          log.debug(inventory.name.title);
          set(pro, 'stock', inventory.name.title)
        }
      })
    )
    return shoppingCart
  },


  async processOrders({orderArr,orderStatusTemp}: {orderArr: any[],orderStatusTemp: any[]}){
    const cloneOrderList = cloneDeep(orderArr)
    const res = await Promise.all(cloneOrderList.map(async order=>{
      const statusList = orderStatusTemp.filter(status=> order.tage.toString(2).split('').reverse()[status.bitPosition]==='1')
      const {bitPosition,...statusAttribute} = statusList[statusList.length -1]
      Object.keys(statusAttribute).forEach(key=>{
        set(order,key,statusAttribute[key])
      })
       try {
          const { data } =
          await store.level2SDK.documentServices.retrieveDocument({
            idList: [order.eid],
            options: {
              xfname: 'eid',
              type: 220161,
            },
          })  
          const facilityProductList = await Promise.all(
            data.document.map(
              async (doc) =>
                await documentToNote({
                  document: replaceUint8ArrayWithBase64(doc),
                }),
            ),
          )
          const orderSourceFacilityId = get(order,'name.nonce')
          let currentFacilityProductList 
          if (get(order,"name.data.deliveryMethod.type") === "Pick up") {
            currentFacilityProductList = facilityProductList
          } else {
            if (orderSourceFacilityId) {
              currentFacilityProductList = facilityProductList.filter(product=>{
              const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
              return productSourceFacilityId && productSourceFacilityId===orderSourceFacilityId ? true : false
            })
            } else {
              currentFacilityProductList = facilityProductList.filter(product=>{
                const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
                return !productSourceFacilityId ? true : false
              })
            }
          }
          set(order,'productList',currentFacilityProductList)
          if (currentFacilityProductList.length > 1) {
            set(order,'more','block') 
          } else {
            set(order,'more','none') 
          }
          return order
       } catch (error) {
        log.debug(error);
       }
    }))
    return res
  },
  async createOrder({
    facilityOrderArr,
    shopOrderCreateEdgeRequest,
    facilityOrderRequest, 
    newProductionId,
    paymentType="online",
  }: 
  {
    facilityOrderArr: any[],
    shopOrderCreateEdgeRequest:any,
    facilityOrderRequest:any
    newProductionId: string[]
    paymentType: string,
  }) {
    const cloneList = cloneDeep(facilityOrderArr)
    const orderEdgeRequest = cloneDeep(shopOrderCreateEdgeRequest)
    orderEdgeRequest.name.facilityIdList =  uniq(facilityOrderArr.map(item=>item.facilityId))
    orderEdgeRequest.name.quantity = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'quantity')    
    },0)
    orderEdgeRequest.name.totalMoney = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'totalMoney')    
    },0).toFixed(2)
    orderEdgeRequest.name.amount = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'totalMoney')    
    },0).toFixed(2)
    orderEdgeRequest.name.platform = "web"
    const recommendationId = cloneList.map(item=>get(item,'orderList[0].name.recommendationId'))[0]
    recommendationId && (orderEdgeRequest.name.recommendationId = recommendationId)    
    const { data } = await store.level2SDK.edgeServices.createEdge(orderEdgeRequest)
    const edgeResp = replaceUint8ArrayWithBase64(data['edge'])
    let facilityOrderIdList: string [] = []
    await Promise.all(cloneList.map(async currentFacilityOrder=>{
      if (edgeResp.eid && currentFacilityOrder.facilityId && currentFacilityOrder.orderList.length !== 0 ) {
        let facilityOrderDocRequest = cloneDeep(facilityOrderRequest)
        facilityOrderDocRequest.name.data.platform = "web"
        facilityOrderDocRequest.name.data.pickUpLocation = currentFacilityOrder.pickUpLocation
        facilityOrderDocRequest.name.data.taxes = currentFacilityOrder.taxes
        if(newProductionId) facilityOrderDocRequest.name.data.productionIdList = newProductionId
        await shareSourceDocList({
          sourceDocList: currentFacilityOrder.orderList,
          targetEdgeID: edgeResp.eid,
          targetRoomName: undefined,
          targetFileID: undefined,
          reid: undefined,
          fidPointToSelf: true,
        });     
        const tage = paymentType === "online" ? (get(currentFacilityOrder,'shoppingStatus') ? -33 : -1) : (paymentType === "offline" ? 2 ** 14 : 2 
        ** 15)
        const paymentNonce = get(currentFacilityOrder,'shoppingStatus') ? (get(currentFacilityOrder,'sourceFacilityId') === get(currentFacilityOrder,'facilityId') ? null : get(currentFacilityOrder,'sourceFacilityId')) : null
        let orderPrefix
        switch (get(facilityOrderDocRequest, 'name.data.deliveryMethod.type')) {
          case "Ship to me":
            orderPrefix = "S"
            break;
          case "":
            orderPrefix = "D"
            break;
          case "Virtual Store":
            orderPrefix = "V"
            break;
          default:
            orderPrefix = "P"
            break;
        }        
        const vendorIdList: string[] = uniq(currentFacilityOrder.orderList.map(order=>get(order,'name.data.orderList[0].productionList[0].vendorId'))) 
        if (vendorIdList.length !==0 ){
          for (const vendorId of vendorIdList) {
            let vendorOrderList = currentFacilityOrder.orderList.filter(order=>get(order,'name.data.orderList[0].productionList[0].vendorId')===vendorId)
            let content = {
              ...facilityOrderDocRequest.name.data
            }
            content.quantity = vendorOrderList.reduce((previousValue, currentValue)=>{
              return +previousValue + +get(currentValue,'name.data.orderList[0].productionList[0].num')    
            },0)
            content.totalbeforeTax = (vendorOrderList.reduce((previousValue, currentValue)=>{
              return +previousValue + (+get(currentValue,'name.data.orderList[0].productionList[0].price') *  +get(currentValue,'name.data.orderList[0].productionList[0].num'))  
            },0)).toFixed(2)
            
            if (get(facilityOrderDocRequest,'name.data.deliveryMethod.type') ==='Ship to me' ) {
              if (get(facilityOrderDocRequest,'name.data.shippingCost') ==='Standard(1-3 days)') {
                content.shippingCostAmount  = vendorOrderList.reduce((previousValue, currentValue)=>{
                  return +previousValue + (+get(currentValue,'name.data.orderList[0].productionList[0].shipping.flagRateShipping') * +get(currentValue,'name.data.orderList[0].productionList[0].num'))
                },0).toFixed(2)
              }else {
                content.shippingCostAmount  = vendorOrderList.reduce((previousValue, currentValue)=>{
                  return +previousValue + (+get(currentValue,'name.data.orderList[0].productionList[0].shipping.nextDayShipping') * +get(currentValue,'name.data.orderList[0].productionList[0].num'))  
                },0).toFixed(2)
              }
            }else {
              content.shippingCostAmount = '0.00'
            }      
            content.taxes = (+content.totalbeforeTax * currentFacilityOrder.taxRate).toFixed(2)
            content.totalMoney = (+content.totalbeforeTax + +content.taxes + +content.shippingCostAmount).toFixed(2)
            let title = content.totalMoney 
            const orderNumber = `${orderPrefix}${generateOrderNumber()}`
            const docResp =  await Document.create({
              edge_id: edgeResp.eid,
              content,
              fid: currentFacilityOrder.facilityId,
              mediaType: 'application/json',
              type: paymentType === "online" ? 3001:3006,
              atimes: -10,
              user: facilityOrderDocRequest.name.user,
              tage,  
              title,
              paymentNonce,
              orderNumber,
              vendorId,
            }) 
            const document = replaceUint8ArrayWithBase64(docResp['doc']) 
            facilityOrderIdList.push(document.id) 
          }
        }else {
          return {
            facilityOrderIdList: [],
            status: false
          }
        }
      }
    }))
    edgeResp.tage = edgeResp.tage | (1 << 1)
    await store.level2SDK.edgeServices.updateEdge({ 
      id: edgeResp.eid,
      ...edgeResp
    }) 
    return {
      facilityOrderIdList,
      status: true
    }
  },
  async createAdminOrder({
    facilityOrderArr,
    shopOrderCreateEdgeRequest,
    facilityOrderRequest, 
    // newProductionId,
    paymentType="online",
    isDedicated = false,
    creditStatus,
    isPatientOrder = false
  }: 
  {
    facilityOrderArr: any[],
    shopOrderCreateEdgeRequest:any,
    facilityOrderRequest:any
    // newProductionId: string[]
    paymentType: string,
    isDedicated: boolean,
    creditStatus: {[key in string]}
    isPatientOrder: boolean
  }) {
    const cloneList = cloneDeep(facilityOrderArr)
    const orderEdgeRequest = cloneDeep(shopOrderCreateEdgeRequest)
    orderEdgeRequest.tage =  paymentType === "online" ? 0 : 1,
    orderEdgeRequest.name.facilityIdList = uniq(facilityOrderArr.map(item=>item.facilityId))
    // 3008需要给evid
    orderEdgeRequest.evid =  paymentType === "virtualStore" ? orderEdgeRequest.name.facilityIdList[0] : '',
    orderEdgeRequest.name.quantity = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'quantity')    
    },0)
    orderEdgeRequest.name.totalMoney = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'totalMoney')    
    },0).toFixed(2) 
    orderEdgeRequest.name.amount = facilityOrderArr.reduce((previousValue, currentValue)=>{
      return +previousValue + +get(currentValue,'totalMoney')    
    },0).toFixed(2) 
    orderEdgeRequest.name.redirectUrl = u.isBrowser() ?  window.location.href : ""
    orderEdgeRequest.name.paymentToken = creditStatus.token
    const { data } = await store.level2SDK.edgeServices.createEdge(orderEdgeRequest)
    const edgeResp = replaceUint8ArrayWithBase64(data['edge'])
    let facilityOrderIdList: string [] = []
    
    await Promise.all(cloneList.map(async currentFacilityOrder=>{
      if (edgeResp.eid && currentFacilityOrder.facilityId && currentFacilityOrder.orderList.length !== 0 ) {
        let facilityOrderDocRequest = cloneDeep(facilityOrderRequest)
        facilityOrderDocRequest.name.data.pickUpLocation = currentFacilityOrder.pickUpLocation
        // facilityOrderDocRequest.name.data.taxes = currentFacilityOrder.taxes
        await shareSourceDocList({
          sourceDocList: currentFacilityOrder.orderList,
          targetEdgeID: edgeResp.eid,
          targetRoomName: undefined,
          targetFileID: undefined,
          reid: undefined,
          fidPointToSelf: true,
        });   
        let vendorIdList: string[] = uniq(currentFacilityOrder.orderList.map(order => get(order, 'name.data.orderList[0].productionList[0].vendorId')))
        if(vendorIdList.length != 0){
          for (const vendorId of vendorIdList) {
            let vendorOrderList = filter(currentFacilityOrder.orderList, 
              order => get(order, 'name.data.orderList[0].productionList[0].vendorId') === vendorId
            )
            let orderContent = {...facilityOrderDocRequest.name.data}
            orderContent.quantity = vendorOrderList.reduce((prev, cur) => {
              return +prev + +get(cur, 'name.data.orderList[0].productionList[0].num')
            }, 0)
            orderContent.totalbeforeTax = vendorOrderList.reduce((prev, cur) => {
              return +prev + +get(cur, 'name.data.orderList[0].productionList[0].price') * +get(cur, 'name.data.orderList[0].productionList[0].num')
            }, 0).toFixed(2)
            // 对于deliveryMethod是Shipping以及dedicated商品需要计算相关金额
            if(get(facilityOrderDocRequest, 'name.data.deliveryMethod.type') == 'Shipping' || get(facilityOrderDocRequest, 'name.data.deliveryMethod.type') == ''){
              if (get(facilityOrderDocRequest,'name.data.shippingCost') ==='Standard(1-3 days)') {
                orderContent.shippingCostAmount = vendorOrderList.reduce((prev, cur) => {
                  return +prev + (+get(cur, 'name.data.orderList[0].productionList[0].shipping.flagRateShipping') * +get(cur, 'name.data.orderList[0].productionList[0].num'))
                }, 0).toFixed(2)
              }else {
                orderContent.shippingCostAmount  = vendorOrderList.reduce((previousValue, currentValue)=>{
                  return +previousValue + (+get(currentValue,'name.data.orderList[0].productionList[0].shipping.nextDayShipping') * +get(currentValue, 'name.data.orderList[0].productionList[0].num'))
                }, 0).toFixed(2)
              }
              orderContent.taxes = (+orderContent.totalbeforeTax * currentFacilityOrder.taxRate).toFixed(2)
              orderContent.totalMoney = (+orderContent.totalbeforeTax + +orderContent.taxes + +orderContent.shippingCostAmount).toFixed(2)
            }else if(get(facilityOrderDocRequest, 'name.data.deliveryMethod.type') == 'Virtual Store'){
              orderContent.shippingCostAmount = '0.00'
              orderContent.totalMoney = '0.00'
              orderContent.totalbeforeTax = '0.00'
            }else {
              orderContent.shippingCostAmount = '0.00'
              orderContent.taxes = (+orderContent.totalbeforeTax * currentFacilityOrder.taxRate).toFixed(2)
              orderContent.totalMoney = (+orderContent.totalbeforeTax + +orderContent.taxes + +orderContent.shippingCostAmount).toFixed(2)
            }
            let orderPrefix
            switch (get(facilityOrderDocRequest, 'name.data.deliveryMethod.type')) {
              case "Shipping":
                orderPrefix = "S"
                break;
              case "":
                orderPrefix = "D"
                break;
              case "Virtual Store":
                orderPrefix = "V"
                break;
              default:
                orderPrefix = "P"
                break;
            }
            let title = orderContent.totalMoney
            const orderNumber = `${orderPrefix}${generateOrderNumber()}`
            let tage: number
            if(paymentType === "online"){
              // tage = isDedicated ? -8 : -1 
              // 内部使用的商品初始状态也是 placed
              tage = -1 
            }else if(paymentType === "offline"){
              // tage = isDedicated ? 16392 : 2 ** 14
              if(isDedicated){
                tage = 16392
              }else if(!isPatientOrder) {
                tage = 2 ** 14
              }else{
                tage = 2 ** 15
              }
            }else {
              tage = 2 ** 15
            }
            if(tage < 0) {
              tage = -tage
              if(get(facilityOrderDocRequest, 'name.data.deliveryMethod.type') == 'Shipping'){
                tage = tage | Math.pow(2, 5)
              }else{
                tage = tage & ~Math.pow(2, 5)
              }
              if(get(facilityOrderDocRequest, 'name.data.purchaseType') == 'Internal Use'){
                tage = tage | Math.pow(2, 6)
              }else{
                tage = tage & ~Math.pow(2, 6)
              }
              tage = -tage
            }else if(tage > 0){
              if(get(facilityOrderDocRequest, 'name.data.deliveryMethod.type') == 'Shipping'){
                tage = tage | Math.pow(2, 5)
              }else{
                tage = tage & ~Math.pow(2, 5)
              }
              if(get(facilityOrderDocRequest, 'name.data.purchaseType') == 'Internal Use'){
                tage = tage | Math.pow(2, 6)
              }else{
                tage = tage & ~Math.pow(2, 6)
              }
            }
            let docResp = await Document.create({
                edge_id: edgeResp.eid,
                content: orderContent,
                fid: currentFacilityOrder.facilityId,
                mediaType: 'application/json',
                type: paymentType === "online" ? 3001 : (paymentType === "offline" ? 3006 : 3008),
                atimes: -10,
                user: facilityOrderDocRequest.name.user,
                tage,  
                title,
                orderNumber,
                vendorId: vendorId
              })
            let document = replaceUint8ArrayWithBase64(docResp['doc']) 
            facilityOrderIdList.push(document.id) 
          }
        }else{
          return{
            facilityOrderIdList: [],
            status: false
          }
        }
      }
    }))
    // 2 左移一位 变成4 100 把第四位变成1
    // 1 左移一位 变成2 10 把第二位变成1
    if(get(facilityOrderRequest, 'name.data.deliveryMethod.type') == 'Virtual Store' || paymentType === "offline"){
      edgeResp.tage = edgeResp.tage | (2 << 1)
    }else {
      edgeResp.tage = edgeResp.tage | (1 << 1)
    }
    // 把3001和220161share到新的2113上 然后扣库存
    await store.level2SDK.edgeServices.updateEdge({ 
      id: edgeResp.eid,
      ...edgeResp
    }) 
    // let d = await store.level2SDK.utilServices.uint8ArrayToBase64(a.data.edge.eid)
    // log.debug('aaa', d);
    return {
      facilityOrderIdList,
      // squareURL: edgeResp.name.squareURL
    }
  },  
  async createAdminProduct(
    { 
      orderInfo,
      orderList,
      fac_rootId,
      facilityId,
      facilityName,
      pickupLocIdList,
    }: {
      orderInfo: {}[],
      orderList: {}[],
      fac_rootId: string,
      facilityId: string,
      facilityName: string,
      pickupLocIdList: string[]
    }){
    const pickAndStock = pickupLocIdList.map(item => {
      return {"pickupLocationId": item, "stock": ""}
    })
    let productList:{}[] = []
    const deliveryMethod = get(orderInfo[0],"name.data.deliveryMethod.type") // 获取当前订单购买商品的方式 Shipping/VirtualStore
    // 将productionId和对应的种类docId分类和提取
    orderList.forEach(order => {
      const productId: string = get(order,"name.data.orderList[0].productionList[0].productionId", '')
      const product = find(productList,eachProduct=>get(eachProduct,"productId")===productId)
      if(product){
        set(product,"variantId",[...get(product,"variantId", []),get(order,"name.data.orderList[0].productionList[0].inventoryId")])
        product["variantStock"][get(order,"name.data.orderList[0].productionList[0].inventoryId")] = get(order,"name.nonce")
        productList = productList.map(each=>get(each,"productId")===get(product,"productId")?product:each)
      }else{
        productList.push({
          productId:productId,
          variantId: [get(order,"name.data.orderList[0].productionList[0].inventoryId")],
          variantStock: {[get(order,"name.data.orderList[0].productionList[0].inventoryId", '')] : get(order,"name.nonce")}
        })
      }
    }) 
    const productResult = await Promise.all(productList.map(async eachProduct => {
      // 获取原商品
      const originProductResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(eachProduct,"productId", '')],
        options: {
          xfname: "id",
          maxcount: 1
        }
      })
      const originProduct = await documentToNote({document: replaceUint8ArrayWithBase64(originProductResp?.data?.document[0])})
      // 获取原商品 variant doc 
      const originVariantResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: get(eachProduct,"variantId", []),
        options: {
          xfname: "id",
          maxcount: 1
        }
      })
      // 处理商品里的variant list
      const variantName = await Promise.all(originVariantResp.data?.document.map(async eachVariant=>{
        const variant = await documentToNote({document: replaceUint8ArrayWithBase64(eachVariant)})
        const {pickAndStock,...restData} = get(variant,"name.data")
        return {
          "title": eachProduct["variantStock"][get(variant,"id")],
          "data": {
            ...restData,
            originVariantId: get(variant,"id"),
          },
          "borderColor": "0xdedede"
        }
      }))
      // const getProductReqObj = {
      //   "name": get(originProduct,"id"),
      //   "facilityId": facilityId,
      //   "status": "All",
      //   "type": "All",
      //   "tage": [0,1,2],
      //   "docType": [197121]
      // }
      // 获取当前facility下是不是已经有过该商品
      // const getProductResp = await store.level2SDK.documentServices.retrieveDocument({
      //   idList: [fac_rootId],
      //   options: {
      //     ObjType: 35,
      //     jwt: localStorage.getItem("jwt")|| undefined,
      //     scondition: JSON.stringify({nonce: JSON.stringify(getProductReqObj)}),
      //   }
      // })
      // const getProduct = await documentToNote({document: replaceUint8ArrayWithBase64(getProductResp?.data?.document[0])})
      const getProduct = await elasticsearch.queryStoreProducts({
        facilityId: facilityId,
        docType: [197121],
        tage: [0,1,2],
        productionName: get(originProduct,"id"),
        type: "All",
        status: "",
        count: false,
        pageNumber: 1,  // 目标页页码
        limit: 1
      })
      // 如果已经当前facility下已经存在
      let newProduct
      if(isArray(getProduct) && getProduct.length){
        const  productExistResp = await store.level2SDK.documentServices.retrieveDocument({
          idList: [getProduct?.[0]?.id]
        })
        const productExist = await documentToNote({document: replaceUint8ArrayWithBase64(productExistResp?.data?.document[0])})
        // 如果是virtual Store 需要找到对应的种类doc，并且建立建立联系
        if(deliveryMethod !== "Shipping"){    
            // 获取当前商品下的所有种类doc
            const variantDocListResp = await store.level2SDK.documentServices.retrieveDocument({
              idList: [getProduct?.[0]?.id],
              options: {
                xfname: "reid",
                maxcount: 100,
                type: 199681,
              }
            })
            const variantDocList = 
              variantDocListResp?.data.document.length ? 
                await Promise.all(
                  variantDocListResp?.data.document.map(
                    async (doc) =>
                      await documentToNote({
                        document: replaceUint8ArrayWithBase64(doc),
                      }),
                  ),
                ) : []
            await Promise.all(variantName.map(async eachVariant => {
              const existVariant = find(variantDocList,eachExist => get(eachExist,"name.data.combination") === get(eachVariant,"data.combination"))
              let variant
              if(existVariant){
                variant = await Document.update(get(existVariant,"id"), {
                  atimes: -10,
                  edge_id: get(existVariant,"eid"),
                  content: get(existVariant,"name.data"),
                  user: get(existVariant,"name.user"),
                  type: get(existVariant,"type"),
                  title: get(existVariant,"name.title"),
                  reid: get(existVariant,"esig"),
                  fid: get(existVariant,"fid"),
                  tage: get(existVariant,"tage")|(1<<1),
                  mediaType: get(existVariant,"name.type"),
                })
              }else{
                const tage = get(eachVariant,"data.combination") === "Default" ? 6 : 2
                set(eachVariant,"data.pickAndStock",pickAndStock)
                variant = await Document.nocheckcreate({
                  atimes: -10,
                  content: get(eachVariant,"data"),
                  title: "0",
                  type: 199681,
                  edge_id: fac_rootId,
                  mediaType: 'application/json',
                  tage: tage,
                  reid: getProduct?.[0]?.id,
                })
                  // 创建sku-location
                Promise.all(
                  get(eachVariant,"data.pickAndStock").map(async eachPick=>{
                    const skuLocation = await Document.nocheckcreate({
                      atimes: -10,
                      content: get(eachVariant,"data"),
                      title: "0",
                      type: 455681,
                      edge_id: fac_rootId,
                      fid: get(eachPick,"pickupLocationId"),
                      mediaType: 'application/json',
                      tage: tage,
                      reid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
                    })
                    return replaceUint8ArrayWithBase64(skuLocation['doc'])
                  })
                )                
              }
              // 建立virtual store的联系
              Document.create({
                edge_id: fac_rootId,
                content: {},
                fid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
                reid: get(eachVariant,"data.originVariantId"),
                mediaType: 'application/json',
                type: 473601,
                atimes: -10,
              })
            }))
        }
        const newProductResp = await Document.update(getProduct?.[0]?.id,{
          atimes: -10,
          edge_id: get(productExist,"eid"),
          content: get(productExist,"name.data"),
          paymentNonce: deliveryMethod === "Shipping"
            ?
            (+(get(productExist, "name.nonce") || 0) + variantName.reduce((pre, cur) => pre + (+get(cur, "title")), 0)).toString() :
            get(productExist, "name.nonce"),
          user: get(productExist,"name.user"),
          type: get(productExist,"type"),
          title: get(productExist,"name.title"),
          tags: get(productExist,"name.tags"),
          reid: get(productExist,"esig"),
          fid: get(productExist,"fid"),
          tage: deliveryMethod === "Shipping" ? get(productExist,"tage") : 1, // 如果是购买virtual store 商品状态直接active
          mediaType: get(productExist,"name.type"),
        })
        newProduct = replaceUint8ArrayWithBase64(newProductResp['doc'])
      }else{
        // 新建商品
        const {basicInfo,variants,pricing,...restData} = get(originProduct,"name.data")
        set(basicInfo,"productStatus",{color: "0xf9bb4d",value: "Draft"})
        // set(pricing,"costPerItem",get(pricing,"price"))
        const newProductResp = await Document.nocheckcreate({
          edge_id: fac_rootId,
          title: "0",
          paymentNonce: deliveryMethod === "Shipping" ? variantName.reduce((pre,cur)=>pre+(+get(cur,"title")),0).toString() : "0",
          atimes: -10,
          user: "0",
          content: {
            basicInfo,
            variants:[],
            pricing,
            ...restData,
            facilityName: facilityName,
            originProductId: get(originProduct,"id"),
            vendorId: get(originProduct,"fid"),
          },
          type: 197121,
          fid: facilityId,
          tage: deliveryMethod === "Shipping" ? 0 : 1,
          mediaType: 'application/json',
        })
        newProduct = replaceUint8ArrayWithBase64(newProductResp['doc'])
        // 如果是virtual Store 需要建立对应的种类doc和sku
        if(deliveryMethod !== "Shipping"){
          await Promise.all(
            variantName.map(async eachVariant => {
              const tage = get(eachVariant,"data.combination") === "Default" ? 6 : 2
              set(eachVariant,"data.pickAndStock",pickAndStock)
              const variant = await Document.nocheckcreate({
                atimes: -10,
                content: get(eachVariant,"data"),
                title: "0",
                type: 199681,
                edge_id: fac_rootId,
                mediaType: 'application/json',
                tage: tage,
                reid: get(newProduct,"id"),
              })
              // 建立virtual store的联系
              await Document.create({
                edge_id: fac_rootId,
                content: {},
                fid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
                reid: get(eachVariant,"data.originVariantId"),
                mediaType: 'application/json',
                type: 473601,
                atimes: -10,
              })
              
              // 创建sku-location
              
              Promise.all(
                pickAndStock.map(async eachPick=>{
                  const skuLocation = await Document.nocheckcreate({
                    atimes: -10,
                    content: get(eachVariant,"data"),
                    title: "0",
                    type: 455681,
                    edge_id: fac_rootId,
                    fid: get(eachPick,"pickupLocationId"),
                    mediaType: 'application/json',
                    tage: tage,
                    reid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
                  })
                  return replaceUint8ArrayWithBase64(skuLocation['doc'])
                })
              )
            })
          )
        }
        Document.update(newProduct?.id,{
          edge_id: newProduct.eid,
          content: newProduct?.name?.data,
          targetRoomName: newProduct?.name.targetRoomName,
          type: newProduct.type,
          title: newProduct?.name?.title,
          tage: newProduct?.tage,
          mediaType: 'application/json',
          dTypeProps: newProduct?.subtype,
          fid: newProduct.fid,
        })
      }
      // 如果是virtual Store 不需要incoming
      if(deliveryMethod == "Shipping"){

        // 建立本次订单的incoming商品
        Document.create({
          edge_id: fac_rootId,
          content: {
            incomingData: variantName,
            productName: get(newProduct,"name.data.basicInfo.title"),
            coverImgId: get(newProduct,"name.data.coverImgId"),
          },
          fid: newProduct?.id,
          // reid指向对应vendor的订单id
          reid: get(
            find(orderInfo,curOrder =>
              get(curOrder,"name.vendorId") === get(originProduct,"fid")
            ),"id"
          ),
          mediaType: 'application/json',
          type: 468481,
          atimes: -10,
        })
      }
      return newProduct
    })) 
    return productResult
  },
  async updateAdminProduct({updateVariantList}:{updateVariantList:{}[]}){
    return Promise.all(updateVariantList.map(async eachVariant => {
        // 更新商品的种类doc
        const variantDoc = await Document.update(get(eachVariant,"id"), {
          atimes: -10,
          edge_id: get(eachVariant,"eid"),
          content: get(eachVariant,"name.data"),
          user: get(eachVariant,"name.user"),
          type: get(eachVariant,"type"),
          title: get(eachVariant,"name.title"),
          tags: get(eachVariant,"name.tags"),
          reid: get(eachVariant,"esig"),
          fid: get(eachVariant,"fid"),
          tage: get(eachVariant,"tage"),
          mediaType: get(eachVariant,"name.type"),
        })
        // 获取当前所有的pickup location
        const pickAndStock = get(eachVariant,"name.data.pickAndStock")
        // 获取当前种类doc下所有的sku-location doc
        const skuLocationDocResp = await store.level2SDK.documentServices.retrieveDocument({
          idList: [get(eachVariant,"id", '')],
          options: {
            xfname: "reid",
            type: 455681,
          }
        })
        const skuLocationList = await Promise.all(
          skuLocationDocResp.data.document.map(
            async (doc) =>
              await documentToNote({
                document: replaceUint8ArrayWithBase64(doc),
              }),
          )
        )
        let deleteArray:{}[]=[],createArray:{}[]=[],updateArray:{}[]=[]
        createArray = differenceWith(pickAndStock,skuLocationList,(eachPick,eachSku) => {
          return get(eachPick,"pickupLocationId") === get(eachSku,"fid")
        })
        deleteArray = differenceWith(skuLocationList,pickAndStock!,(eachSku,eachPick) => {
          return get(eachPick,"pickupLocationId") === get(eachSku,"fid")
        })
        skuLocationList.forEach(eachSku => {
          ;(pickAndStock as any)?.forEach(eachPick => {
            if(get(eachPick,"pickupLocationId") === get(eachSku,"fid")){
              set(eachSku,"name.title",get(eachPick,"stock"))
              updateArray.push(eachSku)
            }
          });
        });
        // 创建新sku
        Promise.all(createArray.map(async eachCreate => {
            const skuLocation = await Document.nocheckcreate({
              atimes: -10,
              content: get(eachVariant,"name.data", ''),
              title: get(eachCreate,"stock") || "0",
              type: 455681,
              edge_id: get(eachVariant,"eid", ''),
              fid: get(eachCreate,"pickupLocationId"),
              mediaType: 'application/json',
              reid: get(eachVariant,"id"),
            })
            return replaceUint8ArrayWithBase64(skuLocation["doc"])
        }))

        // 更新已有的sku
        Promise.all(updateArray.map(async eachUpdate => {
          const skuLocation = await Document.update(get(eachUpdate,"id"), {
            atimes: -10,
            edge_id: get(eachUpdate,"eid"),
            content: get(eachVariant,"name.data"),
            user: get(eachUpdate,"name.user"),
            type: get(eachUpdate,"type"),
            title: get(eachUpdate,"name.title"),
            tags: get(eachUpdate,"name.tags"),
            reid: get(eachUpdate,"esig"),
            fid: get(eachUpdate,"fid"),
            tage: get(eachUpdate,"tage"),
            mediaType: get(eachUpdate,"name.type")
          })
          return replaceUint8ArrayWithBase64(skuLocation["doc"])
        }))

        // 删除old
        Promise.all(deleteArray.map(async eachDel => {
          await store.level2SDK.documentServices.deleteDocument([get(eachDel,"id", '')])
        }))
        return replaceUint8ArrayWithBase64(variantDoc['doc'])
    }))
  },  
  async createInternalProduct({orderInfo,orderList,fac_rootId,facilityId,facilityName,pickupLocIdList}:{orderInfo:{}[],orderList: {}[], fac_rootId: string, facilityId: string, facilityName: string, pickupLocIdList: string[]}){
    const pickAndStock = pickupLocIdList.map(item => {
      return {"pickupLocationId": item, "stock": ""}
    })
    let productList:{}[] = [], quantity = 0
    // 将productionId和对应的种类docId分类和提取
    orderList.forEach(order => {
      const productId: string = get(order,"name.data.orderList[0].productionList[0].productionId", '')
      const product = find(productList,eachProduct=>get(eachProduct,"productId")===productId)
      quantity += +get(order,"name.data.orderList[0].productionList[0].num",0)
      if(product){
        set(product,"variantId",[...get(product,"variantId", ''),get(order,"name.data.orderList[0].productionList[0].inventoryId")])
        product["variantStock"][get(order,"name.data.orderList[0].productionList[0].inventoryId")] = get(order,"name.nonce")
        productList = productList.map(each=>get(each,"productId")===get(product,"productId")?product:each)
      }else{
        productList.push({
          productId:productId,
          variantId: [get(order,"name.data.orderList[0].productionList[0].inventoryId")],
          variantStock: {[get(order,"name.data.orderList[0].productionList[0].inventoryId", '')] : get(order,"name.nonce")}
        })
      }
    }) 
    const productResult = await Promise.all(productList.map(async eachProduct => {
      // 获取原商品
      const originProductResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(eachProduct,"productId", '')],
        options: {
          xfname: "id",
          maxcount: 1
        }
      })
      const originProduct = await documentToNote({document: replaceUint8ArrayWithBase64(originProductResp?.data?.document[0])})
      // 获取原商品 variant doc 
      const originVariantResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: get(eachProduct,"variantId", []),
        options: {
          xfname: "id",
          maxcount: 1
        }
      })
      // 处理商品里的variant list
      const variantName = await Promise.all(originVariantResp.data?.document.map(async eachVariant=>{
        const variant = await documentToNote({document: replaceUint8ArrayWithBase64(eachVariant)})
        return {
          "title": eachProduct["variantStock"][get(variant,"id")],
          "data": {
            ...get(variant,"name.data"),
            pickAndStock
          },
          "borderColor": "0xdedede"
        }
      }))
      log.debug('variantName',variantName);
      
      // const getProductReqObj = {
      //   "name": get(originProduct,"id"),
      //   "facilityId": facilityId,
      //   "status": "All",
      //   "type": "All",
      //   "tage": [0,1,2],
      //   "docType": [476161]
      // }
      // // 获取当前facility下是不是已经有过该商品
      // const getProductResp = await store.level2SDK.documentServices.retrieveDocument({
      //   idList: [fac_rootId],
      //   options: {
      //     ObjType: 35,
      //     jwt: localStorage.getItem("jwt")|| undefined,
      //     scondition: JSON.stringify({nonce: JSON.stringify(getProductReqObj)}),
      //   }
      // })
      // const getProduct = await documentToNote({document: replaceUint8ArrayWithBase64(getProductResp?.data?.document[0])})
      const getProduct = await elasticsearch.queryStoreProducts({
        facilityId: facilityId,
        docType: [197121],
        tage: [0,1,2],
        productionName: get(originProduct,"id"),
        type: "All",
        status: "",
        count: false,
        pageNumber: 1,  // 目标页页码
        limit: 1
      })      
      // 如果已经当前facility下已经存在
      let newProduct
      if(isArray(getProduct) && getProduct.length){
        const  productExistResp = await store.level2SDK.documentServices.retrieveDocument({
          idList: [getProduct?.[0]?.id]
        })
        const productExist = await  documentToNote({document: replaceUint8ArrayWithBase64(productExistResp?.data?.document[0])})
        const newProductResp = await Document.update(getProduct?.[0]?.id,{
          atimes: -10,
          edge_id: get(productExist,"eid"),
          content: get(productExist,"name.data"),
          paymentNonce: (+(get(productExist,"name.nonce")||0)+variantName.reduce((pre,cur)=>pre+(+get(cur,"title")),0)).toString(),
          user: get(productExist,"name.user"),
          type: get(productExist,"type"),
          title: get(productExist,"name.title"),
          tags: get(productExist,"name.tags"),
          reid: get(productExist,"esig"),
          fid: get(productExist,"fid"),
          tage: get(productExist,"tage"),
          mediaType: get(productExist,"name.type"),
        })
        newProduct = replaceUint8ArrayWithBase64(newProductResp['doc'])
      }else{
        // 新建商品
        const {basicInfo,variants,pricing,...restData} = get(originProduct,"name.data")
        set(basicInfo,"productStatus",{color: "0xf9bb4d",value: "Draft"})
        // set(pricing,"costPerItem",get(pricing,"costPerItem"))
        const newProductResp = await Document.nocheckcreate({
          edge_id: fac_rootId,
          title: "0",
          paymentNonce: variantName.reduce((pre,cur)=>pre+(+get(cur,"title")),0).toString(),
          atimes: -10,
          content: {
            basicInfo,
            variants:[],
            pricing,
            ...restData,
            facilityName: facilityName,
            originProductId: get(originProduct,"id"),
          },
          type: 476161,
          fid: facilityId,
          mediaType: 'application/json',
        })
        newProduct = replaceUint8ArrayWithBase64(newProductResp['doc'])
        let a = await Document.update(newProduct?.id,{
          edge_id: newProduct.eid,
          content: newProduct?.name?.data,
          targetRoomName: newProduct?.name.targetRoomName,
          type: newProduct.type,
          title: newProduct?.name?.title,
          tage: newProduct?.tage,
          mediaType: 'application/json',
          dTypeProps: newProduct?.subtype,
          fid: newProduct.fid,
        })
      }
      const interUseProductResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(newProduct, 'name.data.originProductId')],
      })
      const interUseProduct = await documentToNote({document: replaceUint8ArrayWithBase64(interUseProductResp?.data?.document[0])})
      log.debug('interUseProduct', interUseProduct);
      // 正常商品 & dedicated to internal Use
      // 正常商品有fid(vendorId) dedicated to internal Use没有fid(vendorId)
      const incomingProductOrderId = get(interUseProduct, "fid") 
      ? get(find(orderInfo, curOrder => get(curOrder, 'name.vendorId') === get(interUseProduct, "fid")), 'id')
      : get(orderInfo[0], 'id')

      // 建立本次订单的incoming商品
      let a = await Document.create({
        edge_id: fac_rootId,
        content: {
          incomingData: variantName,
          productName: get(newProduct,"name.data.basicInfo.title"),
          coverImgId: get(newProduct,"name.data.coverImgId"),
          quantity: quantity,
        },
        fid: newProduct?.id,
        reid: incomingProductOrderId,
        mediaType: 'application/json',
        type: 468481,
        atimes: -10,
        tage: 1,
      })
      return newProduct
    })) 
    return productResult
  },
  async productMerge({incomingData,fac_rootId}:{incomingData:{}[],fac_rootId:string}){
    let incomingProductList:{}[] = []
    incomingData.forEach(eachData => {
      const curProduct = find(incomingProductList,eachProduct=>get(eachProduct,"productionId")===get(eachData,"productionId"))
      if(curProduct){
        set(curProduct,"variant",[...get(curProduct,"variant", []),get(eachData,"data")])
        set(curProduct,"stock",+get(eachData,"title", '')+get(curProduct,"stock", ''))
        incomingProductList = incomingProductList.map(each=>get(each,"productionId")===get(curProduct,"productionId")?curProduct:each)
      }else{
        incomingProductList.push({
          productionId: get(eachData,"productionId"),
          productName: get(eachData,"productName"),
          variant: [get(eachData,"data")], // 此次该商品购买种类
          stock: +get(eachData,"title", ''), // 此次该商品总购买数目
        })
      }
    });
    log.debug('%cCadl Error','background-color:yellow;color: white;font-size: 30px',incomingProductList)
    incomingProductList.map(async eachIncoming=>{
      // 获取商品并且更新
      const productResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(eachIncoming,"productionId", '')],
        options: {
          xfname: "id",
          maxcount: 1,
        }
      })
      const product = await documentToNote({document: replaceUint8ArrayWithBase64(productResp?.data?.document[0])})
      // 更新商品的tage以及tags->后台通过tags去扣除incoming,+库存
      Document.update(product?.id,{
        edge_id: product.eid,
        content: product?.name?.data,
        targetRoomName: product?.name.targetRoomName,
        type: product.type,
        paymentNonce:  product.nonce,
        title: product?.name?.title,
        tage: 1,
        tags: [`${get(eachIncoming,"stock")}`],
        mediaType: 'application/json',
        dTypeProps: product?.subtype,
        fid: product.fid,
      })
      // 获取当前商品下的所有种类doc
      const variantDocListResp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [get(product,"id")],
        options: {
          xfname: "reid",
          maxcount: 100,
          type: 199681,
        }
      })
      const variantDocList = await Promise.all(
        variantDocListResp?.data.document.map(
          async (doc) =>
            await documentToNote({
              document: replaceUint8ArrayWithBase64(doc),
            }),
        ),
      )
      // 遍历当前商品的variant，有则更新，无则新建
      get(eachIncoming,"variant", [] as any[]).map(async newVariant => {
        const findVariant = find(
          variantDocList,
          originVariant=>get(originVariant,"name.data.combination")===get(newVariant,"combination")
        )
        //已经存在，更新variant和sku-location
        if(findVariant){
          const variantDoc = await Document.update(get(findVariant,"id"), {
            atimes: -10,
            edge_id: get(findVariant,"eid"),
            content: get(findVariant,"name.data"),
            user: get(findVariant,"name.user"),
            type: get(findVariant,"type"),
            title: get(findVariant,"name.title"),
            tags: [get(newVariant,"pickAndStock").reduce((pre,cur)=>pre+(+get(cur,"stock")),0).toString()],
            reid: get(findVariant,"esig"),
            fid: get(findVariant,"fid"),
            tage: get(findVariant,"tage")|(1<<0),
            mediaType: get(findVariant,"name.type"),
          })
          // 获取当前种类doc下所有的sku-location doc
          const skuLocationDocResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: [get(findVariant,"id")],
            options: {
              xfname: "reid",
              type: 455681,
            }
          })
          const skuLocation = replaceUint8ArrayWithBase64(skuLocationDocResp)
          if(skuLocation?.data?.document.length){
            skuLocation?.data?.document.map(async eachSkuLoc => {
              const skuLoc = await documentToNote({document: eachSkuLoc})
              let stock = get(
                find(get(newVariant,"pickAndStock"),eachPick=>get(eachPick,"pickupLocationId")===get(skuLoc,"fid")),
                "stock"
              )
              return await Document.update(get(skuLoc,"id"), {
                atimes: -10,
                edge_id: get(skuLoc,"eid"),
                content: get(findVariant,"name.data"),
                user: get(skuLoc,"name.user"),
                type: get(skuLoc,"type"),
                title: get(skuLoc,"title"),
                tags: [stock],
                reid: get(skuLoc,"esig"),
                fid: get(skuLoc,"fid"),
                tage: get(skuLoc,"tage")|(1<<0),
                mediaType: get(skuLoc,"name.type"),
              })
            })
          }else{
            get(newVariant,"pickAndStock").map(async eachPick=>{
              const skuLocation = await Document.nocheckcreate({
                atimes: -10,
                content: newVariant,
                title: get(eachPick,"stock") || "0",
                type: 455681,
                edge_id: fac_rootId,
                fid: get(eachPick,"pickupLocationId"),
                mediaType: 'application/json',
                reid: get(findVariant,"id"),
              })
              return replaceUint8ArrayWithBase64(skuLocation['doc'])

            })
          }
          return replaceUint8ArrayWithBase64(variantDoc['doc'])
        }else{
          log.debug('%c newVariant','background-color:blue;color: white;font-size: 40px',newVariant)
          let title = get(newVariant,"pickAndStock").reduce((pre,cur)=>pre+(+get(cur,"stock")),0).toString()
          const variant = await Document.nocheckcreate({
            atimes: -10,
            content: newVariant,
            title: title,
            type: 199681,
            edge_id: fac_rootId,
            tage: get(newVariant,"combination")==="Default" ? 5 : 1, // 5-> 101(binary)
            mediaType: 'application/json',
            reid: get(eachIncoming,"productionId"),
          })
          // 创建sku-location
          Promise.all(
            get(newVariant,"pickAndStock").map(async eachPick=>{
              const skuLocation = await Document.nocheckcreate({
                atimes: -10,
                content: newVariant,
                title: get(eachPick,"stock") || "0",
                type: 455681,
                edge_id: fac_rootId,
                fid: get(eachPick,"pickupLocationId"),
                tage: get(newVariant,"combination")==="Default" ? 5 : 1, // 5-> 101(binary)
                mediaType: 'application/json',
                reid: replaceUint8ArrayWithBase64(variant['doc'])?.id,
              })
              return replaceUint8ArrayWithBase64(skuLocation['doc'])
            })
          )
        }
      })
    })

  },
  async classifyShoppingCarts({carts}: {carts: {}[]}){
    let isFilterArr = await Promise.all(carts.map(async cart => {
      const resp = await retrieveDocument(cart['fid'])
      const document = resp?.data?.document?.length? resp?.data?.document[0]: null
      let note = await documentToNote({ document })
      return note['type'] > 0
    }))
    log.debug('isFilterArr',isFilterArr);
    
    return {
      availableCarts: carts.filter((_, index) => isFilterArr[index]),
      unavailableCarts: carts.filter((_, index) => !isFilterArr[index]),
    }
  },

  async createOutboundProduct({ outboundProduct, edgeId}: {outboundProduct: {}[], edgeId: string}){
    if(isArray(outboundProduct)){
      let res
      await Promise.all(outboundProduct.map(async outbound => {
        res = await Document.create({
          edge_id: edgeId,
          reid: get(outbound, 'pickUpLocationSkuId'),
          fid: undefined,
          content: outbound,
          mediaType: 'application/json',
          type: 481281,
          atimes: -10,
          title: get(outbound, 'num', 0).toString(),
        })
      }))
      log.debug(res);
      return res
    }
  },
  async filterCptCode({aiReportCptCodelist,facilityVid}: {aiReportCptCodelist: {}[],facilityVid: string}) {
    const cptCodeClonelist = cloneDeep(aiReportCptCodelist)
    const {data}= await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityVid],
      options: {
        xfname: "ovid",
        scondition: "type IN (309760,312320)",
        maxcount: -1
      }
    })
    const facilityCptCodeList= await Promise.all(
      data.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    )
    let recommendAdminCptCodeList: {}[] = []
    let effectiveCptCodeList: {}[] = []
    cptCodeClonelist.forEach(AiCptCode=>{
      const filterList = facilityCptCodeList.filter(facilityCptCode=>get(facilityCptCode,'name.data.code')===get(AiCptCode,'code'))
      if (filterList.length===0) {
        recommendAdminCptCodeList.push(AiCptCode)
      }else {
        effectiveCptCodeList.push(...filterList.map(item=>get(item,'name.data')))
      }
    })
    return {
      effectiveCptCodeList,
      recommendAdminCptCodeList
    }
  },
  async createRecommendAdminCptCode({createRequest,recommendAdminCptCodeList}:{createRequest:any,recommendAdminCptCodeList: any}){
    for (const cptCode of recommendAdminCptCodeList) {
      let createRequestClone = cloneDeep(createRequest)
      const {eid,reid,type,name} = createRequestClone
      name.title = cptCode.code
      name.nonce = cptCode.description
      await Document.create({
        edge_id: eid,
        reid,
        content: name.data,
        mediaType: 'application/json',
        type,
        atimes: -10,
        user: name.user,
        tage: 0,
        title: name.title,
        paymentNonce: name.nonce
      })
    }
  },
  async formatStoreList({array}: {array:any[]}){
    const result = await Promise.all(array.map(async item=>{
      const storeList = await elasticsearch.queryStoreProducts({
          facilityId: item.bsig,
          docType: [197121],
          tage: [1],
          productionName: '',
          type: "All",
          status: "",
          count: false,
          pageNumber: 1,  
          limit: 10,
        })  
      if (storeList.length!==0) {
        return {
          vid: get(item,'bsig'),
          avatar: get(item,'name.data.basicInfo.avatarId') || get(item,'name.data.basicInfo.businessLogo') || '',
          facilityName: get(item,'name.data.basicInfo.medicalFacilityName') || ''
        }
      } 
    }))

    return result.filter(Boolean)
  },
  async sendEmail({facilityOrderList,edge_id,isCanceled}:{facilityOrderList: any[],edge_id:string,isCanceled: boolean}){
    // ? 创建发送邮件doc
    async function _createEmail(receptEmail,subject,body) {
      const content = {
        receptEmail,
        subject,
        body,
        platform: 'web'
      }
      await Document.create({
        edge_id,
        content,
        mediaType: 'application/json',
        type: 3009,
        atimes: -10,
      })
    }
    // ? 发送通知邮件处理
    async function _sendEmailHandle(order,facilityProductList,facilityInfo,receptEmail,fromPlatform,toPlatform) {
      // ? 处理商品排版
      const productList = facilityProductList.map(item=>(
          `
            <tr>
              <td>${get(item,'name.data.orderList.0.productionList.0.title')}</td>
              <td>${get(item,'name.data.orderList.0.productionList.0.productInfo')}</td>
              <td>${get(item,'name.data.orderList.0.productionList.0.num')}</td>
              <td>${get(item,'name.data.orderList.0.productionList.0.totalMoney')}</td>
            </tr>
          `
        )).join('')
      const productTotalQTY = facilityProductList.reduce((pre,next)=>+pre+ +get(next,'name.data.orderList.0.productionList.0.num'),0)      
      let body,subject
      if (toPlatform === "Patient") {
        subject  = `AiTmed Order Confirmation, Order #: ${get(order,'name.orderNumber')}`
        // ? 预设邮件模板
        body = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style type="text/css">
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                    'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                    'Helvetica Neue', sans-serif;
                }
          
                i {
                  font-style: normal;
                  color: #3896ec;
                }
          
                a {
                  text-decoration: none;
                  color: #2988e6;
                  line-height: 35px;
                }
          
                p {
                  line-height: 35px;
                  word-wrap: break-word;
                }
          
                table {
                  margin: 30px 0 20px;
                  width: 100%;
                  border-collapse: collapse;
                }
                th,
                td {
                  padding: 11px 0 12px 34px;
                  text-align: left;
                }
          
                table thead th {
                  background-color: #f4f4f4;
                }
          
                table tbody tr {
                  border-bottom: 1px solid #dedede;
                }
              </style>
            </head>
            <body>
              <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
                <div>
                  <p>
                    Dear
                    <i>${get(order,'name.data.contactInfomation.name')}</i>
                  </p>
                  <p>Thank you for placing an order with us.</p>
                  <p>
                    This is to confirm that we have received your order. Your order number
                    is <i>${get(order,'name.orderNumber')}</i> Please check the
                    information below to confirm that it is correct.
                  </p>
                </div>
                <table>
                  <thead>
                    <th>Product</th>
                    <th>Option</th>
                    <th>QTY</th>
                    <th>Price</th>
                  </thead>
                  <tbody>
                      ${productList}
                  </tbody>
                </table>
                <div style="margin-bottom: 27px">
                  <p>Taxes: $${get(order,'name.data.taxes')}</p>
                  <p>Shipping: $${get(order,'name.data.shippingCostAmount') || '0.00'}</p>
                  <p>Order Total: $${get(order,'name.data.totalMoney')}</p>
                  <p>
                    Shipping Method: ${get(order,'name.data.deliveryMethod.type') ===
                    "Ship to me" ? "Shipping": get(order,'name.data.deliveryMethod.type')}
                  </p>
                  <p>
                    Shipping address: ${get(order,'name.data.contactInfomation.address')}
                  </p>
                </div>
          
                <p>
                  If you have any question regarding your order, please contact
                  ${get(facilityInfo,'name.data.basicInfo.medicalFacilityName')} at
                  <i>${get(facilityInfo,'name.data.basicInfo.email')}</i> or
                  ${get(facilityInfo,'name.data.basicInfo.phoneNumber')}
                </p>
          
                <div style="margin: 47px 0 28px">
                  <p>Regards,</p>
                  <p>Customer Service Team</p>
                  <p>
                    <a href="https://www.aitmed.com/"
                      >Aitmed.com</a
                    >
                  </p>
                </div>
          
                <div
                  style="
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #dedede;
                  "
                >
                  <a href="https://www.aitmed.com/index.html?TermsOfService"
                    >Terms of Use
                  </a>
          
                  <span style="color: #c1c1c1">|</span>
                  <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                    Privacy Policy</a
                  >
                </div>
          
                <div>
                  <p>
                    Note: This email was sent from a notification-only address that cannot
                    accept incoming email. Please do not reply to this message.
                  </p>
                  <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                  <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
                </div>
              </div>
            </body>
          </html>
          
          `  
      }else {
        subject  = `AiTmed New Order#: ${get(order,'name.orderNumber') } form ${fromPlatform}`
        body = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style type="text/css">
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                  'Helvetica Neue', sans-serif;
              }
        
              i {
                font-style: normal;
                color: #3896ec;
              }
        
              a {
                text-decoration: none;
                color: #2988e6;
                line-height: 35px;
              }
        
              p {
                line-height: 35px;
                word-wrap: break-word;
              }
        
              table {
                margin: 30px 0 20px;
                width: 100%;
                border-collapse: collapse;
              }
              th,
              td {
                padding: 11px 0 12px 34px;
                text-align: left;
              }
        
              table thead th {
                background-color: #f4f4f4;
              }
        
              table tbody tr {
                border-bottom: 1px solid #dedede;
              }
            </style>
          </head>
          <body>
            <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
              <div>
                <p>
                  Dear
                  <i>${get(facilityInfo,'name.contactName') || get(facilityInfo,'name.data.basicInfo.medicalFacilityName')}</i>
                </p>
                <p>
                  You have received a new order from ${fromPlatform} for ${productTotalQTY} item(s). Order number is <i>${get(order,'name.orderNumber')}</i>
                </p>
              </div>
              <table>
                <thead>
                  <th>Product</th>
                  <th>Option</th>
                  <th>QTY</th>
                  <th>Price</th>
                </thead>
                <tbody>
                    ${productList}
                </tbody>
              </table>

              <div style="margin-bottom: 27px">
                <h2 style='font-size:20px'>${toPlatform === "Admin"? "Customer":"Shipping" } Address</h2>
                <p>Name: ${get(order,'name.data.contactInfomation.name')}</p>
                <p>Address: ${get(order,'name.data.contactInfomation.address')}</p>
                <p>Phone # ${get(order,'name.data.contactInfomation.phone')}</p>
                <p>
                   Email: ${get(order,'name.data.contactInfomation.email')}
                </p>
              </div>

              <div style="margin-bottom: 27px">
                <h2 style='font-size:20px'>Order Summary</h2>
                <p>Taxes: $${get(order,'name.data.taxes')}</p>
                <p>Shipping: $${get(order,'name.data.shippingCostAmount') || '0.00'}</p>
                <p>Order Total: $${get(order,'name.data.totalMoney')}</p>
                <p>
                   ${toPlatform === "Admin" ? `Delivery Methods: ${get(order,'name.data.deliveryMethod.type')}`: `Shipping Cost: ${get(order,'name.data.shippingCost') === "Standard(1-3 days)" ? "Standard": "Expedited"}`}
                </p>
                <p>
                  ${toPlatform === "Admin" ? `Pick up location: ${get(order,'name.data.pickUpLocation')}`: `Shipping address: ${get(order,'name.data.contactInfomation.address')}`}
                </p>
              </div>
    

              <div style="margin: 47px 0 28px">
                <p>Regards,</p>
                <p>Customer Service Team</p>
                <p>
                  <a href="https://www.aitmed.com/"
                    >Aitmed.com</a
                  >
                </p>
              </div>
        
              <div
                style="
                  margin-bottom: 10px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #dedede;
                "
              >
                <a href="https://www.aitmed.com/index.html?TermsOfService"
                  >Terms of Use
                </a>
        
                <span style="color: #c1c1c1">|</span>
                <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                  Privacy Policy</a
                >
              </div>
        
              <div>
                <p>
                  Note: This email was sent from a notification-only address that cannot
                  accept incoming email. Please do not reply to this message.
                </p>
                <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
              </div>
            </div>
          </body>
        </html>
        
        `  
      }
      // ? 调用创建邮件函数
      await _createEmail(receptEmail,subject,body)
    }

    // ? 拒绝邮件处理
    async function _cancelledEmailHandle(order,facilityInfo,receptEmail,fromPlatform,toPlatform) {      
      let body,subject
      if (toPlatform === "Patient") {
        subject  = `AiTmed Order Cancelled, Order #: ${get(order,'name.orderNumber')}`
        // ? 预设邮件模板
        body = `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style type="text/css">
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                    'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                    'Helvetica Neue', sans-serif;
                }
          
                i {
                  font-style: normal;
                  color: #3896ec;
                }
          
                a {
                  text-decoration: none;
                  color: #2988e6;
                  line-height: 35px;
                }
          
                p {
                  line-height: 35px;
                  word-wrap: break-word;
                }
          
                table {
                  margin: 30px 0 20px;
                  width: 100%;
                  border-collapse: collapse;
                }
                th,
                td {
                  padding: 11px 0 12px 34px;
                  text-align: left;
                }
          
                table thead th {
                  background-color: #f4f4f4;
                }
          
                table tbody tr {
                  border-bottom: 1px solid #dedede;
                }
              </style>
            </head>
            <body>
              <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
                <div>
                  <p>
                    Dear
                    <i>${get(order,'name.data.contactInfomation.name')}</i>
                  </p>
                  <p>Thank you for placing an order with us.</p>
                  <p>
                     Unfortunately, we cannot process your order <i>${get(order,'name.orderNumber')}</i> at this moment for the cancel reason: 
                  </p>
                  <p>
                    ${get(order,'refund.name.data.cancelReason') || get(order,'refund.name.data.cancelReasonDetail')}
                  </p>
                </div>
          
                <p style="margin: 27px 0">
                  We apologize for any inconvenience this may cause. If you have any questions regarding your order, please contact ${get(facilityInfo,'name.data.basicInfo.medicalFacilityName')} at
                  <i>${get(facilityInfo,'name.data.basicInfo.email')}</i> or ${get(facilityInfo,'name.data.basicInfo.phoneNumber')}
                </p>
          
                <div style="margin: 47px 0 28px">
                  <p>Regards,</p>
                  <p>Customer Service Team</p>
                  <p>
                    <a href="https://www.aitmed.com/"
                      >Aitmed.com</a
                    >
                  </p>
                </div>
          
                <div
                  style="
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #dedede;
                  "
                >
                  <a href="https://www.aitmed.com/index.html?TermsOfService"
                    >Terms of Use
                  </a>
          
                  <span style="color: #c1c1c1">|</span>
                  <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                    Privacy Policy</a
                  >
                </div>
          
                <div>
                  <p>
                    Note: This email was sent from a notification-only address that cannot
                    accept incoming email. Please do not reply to this message.
                  </p>
                  <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                  <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
                </div>
              </div>
            </body>
          </html>
          
          `  
      }else {
        subject  = `AiTmed Order Cancelled, Order#: ${get(order,'name.orderNumber') } form ${fromPlatform}`
        body = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style type="text/css">
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                  'Helvetica Neue', sans-serif;
              }
        
              i {
                font-style: normal;
                color: #3896ec;
              }
        
              a {
                text-decoration: none;
                color: #2988e6;
                line-height: 35px;
              }
        
              p {
                line-height: 35px;
                word-wrap: break-word;
              }
        
              table {
                margin: 30px 0 20px;
                width: 100%;
                border-collapse: collapse;
              }
              th,
              td {
                padding: 11px 0 12px 34px;
                text-align: left;
              }
        
              table thead th {
                background-color: #f4f4f4;
              }
        
              table tbody tr {
                border-bottom: 1px solid #dedede;
              }
            </style>
          </head>
          <body>
            <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
                <table>
                  <thead>
                    <th colspan="2">Cancelled Order</th>
                  </thead>
                <tbody>
                  <tr>
                    <td>Customer Name</td>
                    <td>${get(order,'refund.name.data.contactInfomation.name')} ${fromPlatform}</td>
                  </tr>
                  <tr>
                    <td>Order #</td>
                    <td><i>${get(order,'name.orderNumber') } </i></td>
                  </tr>
                  <tr>
                    <td>Customer Email</td>
                    <td>${get(order,'refund.name.data.contactInfomation.email')}</td>
                  </tr>
                  <tr>
                    <td>Order Status</td>
                    <td>Cancelled</td>
                  </tr>
                  <tr>
                    <td>Cancelled by</td>
                    <td>${get(order,'refund.name.data.cancelFullBy')}</td>
                  </tr>
                  <tr>
                    <td>Cancel Date</td>
                    <td>${moment.unix(get(order,'refund.name.data.cancelTime')).format('MM/DD/YYYY')}</td>
                  </tr>
                  <tr>
                    <td>Cancelled Reason</td>
                    <td>${get(order,'refund.name.data.cancelReason') || get(order,'refund.name.data.cancelReasonDetail')}</td>
                  </tr>
                </tbody>
              </table>
              <div style="margin: 47px 0 28px">
                <p>Regards,</p>
                <p>Customer Service Team</p>
                <p>
                  <a href="https://www.aitmed.com/"
                    >Aitmed.com</a
                  >
                </p>
              </div>
              <div
                style="
                  margin-bottom: 10px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #dedede;
                "
              >
                <a href="https://www.aitmed.com/index.html?TermsOfService"
                  >Terms of Use
                </a>
        
                <span style="color: #c1c1c1">|</span>
                <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                  Privacy Policy</a
                >
              </div>
        
              <div>
                <p>
                  Note: This email was sent from a notification-only address that cannot
                  accept incoming email. Please do not reply to this message.
                </p>
                <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
              </div>
            </div>
          </body>
        </html>
        
        `  
      }
      // ? 调用创建邮件函数
      await _createEmail(receptEmail,subject,body)
    }

    // ? 遍历订单
    for (const order of facilityOrderList) {
      try {
        const { data } =
        await store.level2SDK.documentServices.retrieveDocument({
          idList: [order.eid],
          options: {
            xfname: 'eid',
            type: 220161,
          },
        })  
        const facilityProductList = await Promise.all(
          data.document.map(
            async (doc) =>
              await documentToNote({
                document: replaceUint8ArrayWithBase64(doc),
              }),
          ),
        )
        const orderSourceFacilityId = get(order,'name.nonce')
        let currentFacilityProductList 
        if (get(order,"name.data.deliveryMethod.type") === "Pick up") {
          currentFacilityProductList = facilityProductList
        } else {
          if (orderSourceFacilityId) {
            currentFacilityProductList = facilityProductList.filter(product=>{
            const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
            return productSourceFacilityId && productSourceFacilityId===orderSourceFacilityId ? true : false
          })
          } else {
            currentFacilityProductList = facilityProductList.filter(product=>{
              const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
              return !productSourceFacilityId ? true : false
            })
          }
        }
        const facilityResp = await store.level2SDK.documentServices.retrieveDocument({
          idList: [get(order,"fid")],
          options: {
            xfname: "ovid",
            scondition: "type in (276481,271361)"
          }
        })
        const facilityDoc = await Promise.all(
          facilityResp.data.document.map(
            async (doc) =>
              await documentToNote({
                document: replaceUint8ArrayWithBase64(doc),
              }),
          ),
        )
        // ? 给patient发邮件
        isCanceled ? await _cancelledEmailHandle(order,facilityDoc[0],get(order,'name.data.contactInfomation.email'),'Patient',"Patient") : await _sendEmailHandle(order,currentFacilityProductList,facilityDoc[0],get(order,'name.data.contactInfomation.email'),'Patient',"Patient")
        // ? 判断当前订单购买方式 
        if (get(order,"name.data.deliveryMethod.type") === "Pick up") {
          // ? 给admin 发送邮件
          isCanceled ? await _cancelledEmailHandle(order,facilityDoc[0],get(facilityDoc[0],'name.data.basicInfo.email'),'Patient',"Admin") : await _sendEmailHandle(order,currentFacilityProductList,facilityDoc[0],get(facilityDoc[0],'name.data.basicInfo.email'),'Patient',"Admin")
        } else {
          // ? 给vendor 发送邮件
          const verdorResp = await store.level2SDK.vertexServices.retrieveVertex({
            idList: [get(order,'name.vendorId')],
            options: {
              ObjType: 28, 
              scondition: 'V.type=2 AND E.type=1100 AND V2.type=20 AND E2.type=1100 AND V3.type=21',
              sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.bvid=V.id INNER JOIN Vertex V2 on V2.id = E.evid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}",
              xfname: 'V3.id',
              obfname: "V.ctime",
              maxcount: 500
            }
          })
          let vendorVertex = verdorResp.data.vertex
          const staffListResp = await store.level2SDK.vertexServices.retrieveVertex({
            idList: [get(order,'name.vendorId')],
            options: {
              ObjType: 28, 
              xfname: 'V3.id',
              sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.evid=V.id INNER JOIN Vertex V2 on V2.id = E.bvid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}" , 
              scondition: "V.type in (2,-2) AND E.type=1200 AND V2.type=20 AND E2.type=1100 AND V3.type=21",
              obfname: "V.ctime",
              maxcount: 500
            }
          })
          let staffVertex = staffListResp.data.vertex
          let vendorList = vendorVertex.concat(staffVertex)
          for (const vendor of vendorList) {
            isCanceled ? await _cancelledEmailHandle(order,vendor,get(vendor,'name.email'),'Patient',"Vendor") : await _sendEmailHandle(order,currentFacilityProductList,vendor,get(vendor,'name.email'),'Patient',"Vendor") 
          }
        }
     } catch (error) {
      log.debug(error);
     }
    }
  },
  async sendEmailToVendor({facilityOrderList,edge_id,platform}:{facilityOrderList: any[],edge_id:string,platform: string}){
    for (const order of facilityOrderList) {
      try {
        const { data } =
        await store.level2SDK.documentServices.retrieveDocument({
          idList: [order.eid],
          options: {
            xfname: 'eid',
            type: 220161,
          },
        })  
        // log.debug('%c order','background-color:pink;color: white;font-size: 40px',order)
        const facilityProductList = await Promise.all(
          data.document.map(
            async (doc) =>
              await documentToNote({
                document: replaceUint8ArrayWithBase64(doc),
              }),
          ),
        )
        const orderSourceFacilityId = get(order,'name.nonce')
        let currentFacilityProductList 
        if (get(order,"name.data.deliveryMethod.type") === "Pick up") {
          currentFacilityProductList = facilityProductList
        } else {
          if (orderSourceFacilityId) {
            currentFacilityProductList = facilityProductList.filter(product=>{
            const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
            return productSourceFacilityId && productSourceFacilityId===orderSourceFacilityId ? true : false
          })
          } else {
            currentFacilityProductList = facilityProductList.filter(product=>{
              const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
              return !productSourceFacilityId ? true : false
            })
          }
        }
      const facilityResp = await  store.level2SDK.documentServices.retrieveDocument({
        idList: [get(order,"fid")],
        options: {
          xfname: "ovid",
          scondition: "type in (276481,271361)"
        }
      })
      const facilityDoc = await Promise.all(
        facilityResp.data.document.map(
          async (doc) =>
            await documentToNote({
              document: replaceUint8ArrayWithBase64(doc),
            }),
        ),
      )
      const productTotalQTY = facilityProductList.reduce((pre,next)=>+pre+ +get(next,'name.data.orderList.0.productionList.0.num'),0)   
      let productList = currentFacilityProductList.map(item=>(
        `
          <tr>
            <td>${get(item,'name.data.orderList.0.productionList.0.title')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.productInfo')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.num')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.totalMoney')}</td>
          </tr>
        `
      )).join('')

      const verdorResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [get(order,'name.vendorId')],
        options: {
          ObjType: 28, 
          scondition: 'V.type=2 AND E.type=1100 AND V2.type=20 AND E2.type=1100 AND V3.type=21',
          sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.bvid=V.id INNER JOIN Vertex V2 on V2.id = E.evid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}",
          xfname: 'V3.id',
          obfname: "V.ctime",
          maxcount: 500
        }
      })
      let vendorVertex = verdorResp.data.vertex
      const staffListResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [get(order,'name.vendorId')],
        options: {
          ObjType: 28, 
          xfname: 'V3.id',
          sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.evid=V.id INNER JOIN Vertex V2 on V2.id = E.bvid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}" , 
          scondition: "V.type in (2,-2) AND E.type=1200 AND V2.type=20 AND E2.type=1100 AND V3.type=21",
          obfname: "V.ctime",
          maxcount: 500
        }
      })
      let staffVertex = staffListResp.data.vertex
      let vendorList = vendorVertex.concat(staffVertex)
      const shippingCostList = [
        {
          key: "Standard",
          value: "Standard(1-3 days)"
        },
        {
          key: "Expedited",
          value: "Next Day"
        },        
      ]
      const shippingCost = get(
        shippingCostList.find(e => get(order,"name.data.shippingCost") === get(e,"value")),
        "key"
      )
      // log.debug('%c staffVertex','background-color:pink;color: white;font-size: 40px',staffVertex)
      // log.debug('%c vendorList','background-color:pink;color: white;font-size: 40px',vendorList)
      for(const vendor of vendorList){
      let body = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style type="text/css">
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                  'Helvetica Neue', sans-serif;
              }
        
              i {
                font-style: normal;
                color: #3896ec;
              }
        
              a {
                text-decoration: none;
                color: #2988e6;
                line-height: 35px;
              }
        
              p {
                line-height: 35px;
                word-wrap: break-word;
              }
        
              table {
                margin: 30px 0 20px;
                width: 100%;
                border-collapse: collapse;
              }
              th,
              td {
                padding: 11px 0 12px 34px;
                text-align: left;
              }
        
              table thead th {
                background-color: #f4f4f4;
              }
        
              table tbody tr {
                border-bottom: 1px solid #dedede;
              }
            </style>
          </head>
          <body>
            <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
              <div>
                <p>
                  Dear
                  <i>${get(vendor,"name.contactName")}</i>
                </p>

                <p>
                You have received a new order from Admin for ${productTotalQTY} item(s). Order number is <i>${get(order,'name.orderNumber')}</i>
                </p>
              </div>
              <table>
                <thead>
                  <th>Product</th>
                  <th>Option</th>
                  <th>QTY</th>
                  <th>Price</th>
                </thead>
                <tbody>
                    ${productList}
                </tbody>
              </table>

              <div style= "display: flex ; flex-direction: column">
                <div style="margin-bottom: 27px">
                  <h3 style="font-weight: 600;">Shipping Address</h3>
                  <p>Name: ${get(order,'name.data.contactInfomation.name')}</p>
                  <p>Address: ${get(order,'name.data.contactInfomation.address')}</p>
                  <p>Phone #: ${get(order,'name.data.contactInfomation.phone')}</p>
                  <p>Email: ${get(order,'name.data.contactInfomation.email')}</p>
                </div>

                <div style="margin-bottom: 27px">
                  <h3 style="font-weight: 600;">Order Summary</h3>
                  <p>Taxes: $${get(order,'name.data.taxes')}</p>
                  <p>Shipping: $${get(order,'name.data.shippingCostAmount') || '0.00'}</p>
                  <p>Order Total: $${get(order,'name.data.totalMoney')}</p>
                  <p>Shipping cost: ${shippingCost}</p>
                  <p>Shipping address: ${get(order,'name.data.contactInfomation.address')}</p>
                </div>

              </div>

              <p>
                If you have any question regarding your order, please contact
                ${get(facilityDoc[0],'name.data.basicInfo.medicalFacilityName')} at
                <i>${get(facilityDoc[0],'name.data.basicInfo.email')}</i> or
                ${get(facilityDoc[0],'name.data.basicInfo.phoneNumber')}
              </p>
        
              <div style="margin: 47px 0 28px">
                <p>Regards,</p>
                <p>Customer Service Team</p>
                <p>
                  <a href="https://www.aitmed.com/">Aitmed.com</a>
                </p>
              </div>
        
              <div
                style="
                  margin-bottom: 10px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #dedede;
                "
              >
                <a href="https://www.aitmed.com/index.html?TermsOfService">Terms of Use</a>
        
                <span style="color: #c1c1c1">|</span>
                <a href="https://www.aitmed.com/index.html?PrivacyPolicy">Privacy Policy</a>
              </div>
        
              <div>
                <p>
                  Note: This email was sent from a notification-only address that cannot
                  accept incoming email. Please do not reply to this message.
                </p>
                <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
              </div>
            </div>
          </body>
        </html>
        
        `
        const subject = `AiTmed New Order #: ${get(order,'name.orderNumber')} from ${platform}`
        const receptEmail = get(vendor,'name.email');
        const content = {
          receptEmail,
          subject,
          body,
          platform: 'web'
        }
        await Document.create({
          edge_id,
          content,
          mediaType: 'application/json',
          type: 3009,
          atimes: -10,
        })
    }
     } catch (error) {
      log.debug(error);
     }
    }
  },
  async sendCancelEmailToVendor({orderList,cancelOrder,edge_id,platform,sellInfo}:{orderList: any[],cancelOrder: any,edge_id:string,platform: string,sellInfo: any}){
    for (const order of orderList) {
      try {
      const verdorResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [get(order,'name.vendorId')],
        options: {
          ObjType: 28, 
          scondition: 'V.type=2 AND E.type=1100 AND V2.type=20 AND E2.type=1100 AND V3.type=21',
          sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.bvid=V.id INNER JOIN Vertex V2 on V2.id = E.evid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}",
          xfname: 'V3.id',
          obfname: "V.ctime",
          maxcount: 500
        }
      })
      // 给买家发送邮件
      let body = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', sans-serif;
            }
      
            i {
              font-style: normal;
              color: #3896ec;
            }
      
            a {
              text-decoration: none;
              color: #2988e6;
              line-height: 35px;
            }
      
            p {
              line-height: 35px;
              word-wrap: break-word;
            }
      
            table {
              margin: 30px 0 20px;
              width: 100%;
              border-collapse: collapse;
            }
            th,
            td {
              padding: 11px 0 12px 34px;
              text-align: left;
            }
      
            table thead th {
              background-color: #f4f4f4;
            }
      
            table tbody tr {
              border-bottom: 1px solid #dedede;
            }
          </style>
        </head>
        <body>
          <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
            <div>
              <p>
                Dear
                <i>${get(order,'name.data.contactInfomation.name')}</i>
              </p>
              <p>Thank you for placing an order with us.</p>
              <p>
                 Unfortunately, we cannot process your order <i>${get(order,'name.orderNumber')}</i> at this moment for the cancel reason: ${cancelOrder.name.data.cancelReason}
              </p>

            </div>
      
            <p style="margin: 27px 0">
              We apologize for any inconvenience this may cause. If you have any questions regarding your order, please contact ${get(sellInfo,'name')} at
              <i>${get(sellInfo,'email')}</i> or ${get(sellInfo,'phone')}
            </p>
      
            <div style="margin: 47px 0 28px">
              <p>Regards,</p>
              <p>Customer Service Team</p>
              <p>
                <a href="https://www.aitmed.com/"
                  >Aitmed.com</a
                >
              </p>
            </div>
      
            <div
              style="
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dedede;
              "
            >
              <a href="https://www.aitmed.com/index.html?TermsOfService"
                >Terms of Use
              </a>
      
              <span style="color: #c1c1c1">|</span>
              <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                Privacy Policy</a
              >
            </div>
      
            <div>
              <p>
                Note: This email was sent from a notification-only address that cannot
                accept incoming email. Please do not reply to this message.
              </p>
              <p>© 2021 AiTmed, Inc. All rights reserved.</p>
              <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
            </div>
          </div>
        </body>
      </html>
      
      `  
      let subject = `Aitmed Order Cancelled, Order #: ${get(order,'name.orderNumber')} from ${platform}`
      let receptEmail = get(order,'name.data.contactInfomation.email')
      const content = {
        receptEmail,
        subject,
        body,
        platform: 'web'
      }
      await Document.create({
        edge_id,
        content,
        mediaType: 'application/json',
        type: 3009,
        atimes: -10,
      })

      let vendorVertex = verdorResp.data.vertex
      const staffListResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [get(order,'name.vendorId')],
        options: {
          ObjType: 28, 
          xfname: 'V3.id',
          sfname: "{\"result\":\"DISTINCT V.*\", \"join\": \"INNER JOIN Edge E on E.evid=V.id INNER JOIN Vertex V2 on V2.id = E.bvid INNER JOIN Edge E2 on E2.bvid=V2.id INNER JOIN Vertex V3 on E2.evid=V3.id\"}" , 
          scondition: "V.type in (2,-2) AND E.type=1200 AND V2.type=20 AND E2.type=1100 AND V3.type=21",
          obfname: "V.ctime",
          maxcount: 500
        }
      })
      let staffVertex = staffListResp.data.vertex
      let vendorList = vendorVertex.concat(staffVertex)
      
      // log.debug('%c order','background-color:pink;color: white;font-size: 40px',get(order,'name.orderNumber'))
      // log.debug('%c vendorList','background-color:pink;color: white;font-size: 40px',vendorList)
      for(const vendor of vendorList){
        let cancelDate = moment((cancelOrder.name.data.cancelTime)* 1000).format('MM/DD/YYYY')
        // log.debug('%c cancelDate','background-color:pink;color: white;font-size: 40px',cancelDate)
        let body = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', sans-serif;
            }
      
            i {
              font-style: normal;
              color: #3896ec;
            }
      
            a {
              text-decoration: none;
              color: #2988e6;
              line-height: 35px;
            }
      
            p {
              line-height: 35px;
              word-wrap: break-word;
            }
      
            table {
              margin: 30px 0 20px;
              width: 100%;
              border-collapse: collapse;
            }
            th,
            td {
              width: 100%;
              padding: 11px 0 12px 34px;
            }
      
            table thead th {  
              background-color: #f4f4f4;
            }
      
            table tbody tr {
              width: 100%;
              max-width: 1150px;
              display: flex;
              justify-content: flex-start;
              border-bottom: 1px solid #dedede;
            }
          </style>
        </head>
        <body>
          <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
            <table>
              <thead>
                <th style="width: 100%; text-align: left;">Cancelled Order</th>
              </thead>
              <tbody>
                  <tr>
                      <td>Customer Name</td><td>${cancelOrder.name.data.contactInfomation.name} (${platform})</td>
                  </tr>
                  <tr>
                      <td>Order #</td><td><i>${get(order,'name.orderNumber')}</i></td>
                  </tr>
                  <tr>
                      <td>Customer Email</td><td>${cancelOrder.name.data.contactInfomation.email}</td>
                  </tr>
                  <tr>
                      <td>Order Status</td><td>Cancelled</td>
                  </tr>
                  <tr>
                      <td>Cancelled by</td><td>${cancelOrder.name.data.cancelFullBy}</td>
                  </tr>
                  <tr>
                      <td>Cancel Date</td><td>${cancelDate}</td>
                  </tr>
                  <tr>
                      <td>Cancelled Reason</td><td>${cancelOrder.name.data.cancelReason}</td>
                  </tr>
              </tbody>
            </table>


            <div style="margin: 47px 0 28px">
              <p>Regards,</p>
              <p>Customer Service Team</p>
              <p>
                <a href="https://www.aitmed.com/">Aitmed.com</a>
              </p>
            </div>
      
            <div
              style="
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dedede;
              "
            >
              <a href="https://www.aitmed.com/index.html?TermsOfService">Terms of Use</a>
      
              <span style="color: #c1c1c1">|</span>
              <a href="https://www.aitmed.com/index.html?PrivacyPolicy">Privacy Policy</a>
            </div>
      
            <div>
              <p>
                Note: This email was sent from a notification-only address that cannot
                accept incoming email. Please do not reply to this message.
              </p>
              <p>© 2021 AiTmed, Inc. All rights reserved.</p>
              <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
            </div>
          </div>
        </body>
          </html>
          
          `
          const subject = `AiTmed Order Cancelled, Order #: ${get(order,'name.orderNumber')} from ${platform}`
          const receptEmail = get(vendor,'name.email');
          const content = {
            receptEmail,
            subject,
            body,
            platform: 'web'
          }
          await Document.create({
            edge_id,
            content,
            mediaType: 'application/json',
            type: 3009,
            atimes: -10,
          })
    }
     } catch (error) {
      log.debug(error);
     }
    }
  },
  async sendEmailToBuyer({orderList,edge_id,emailInfo,emailType}:{orderList: any[],edge_id:string,emailInfo: any,emailType: string}){
    // 给买家发送新订单邮件
    if(emailType === "newOrder"){
    for (const order of orderList) {
    
        const { data } =
        await store.level2SDK.documentServices.retrieveDocument({
          idList: [order.eid],
          options: {
            xfname: 'eid',
            type: 220161,
          },
        })  

        const facilityProductList = await Promise.all(
          data.document.map(
            async (doc) =>
              await documentToNote({
                document: replaceUint8ArrayWithBase64(doc),
              }),
          ),
        )
        const orderSourceFacilityId = get(order,'name.nonce')
        let currentFacilityProductList 
        if (get(order,"name.data.deliveryMethod.type") === "Pick up") {
          currentFacilityProductList = facilityProductList
        } else {
          if (orderSourceFacilityId) {
            currentFacilityProductList = facilityProductList.filter(product=>{
            const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
            return productSourceFacilityId && productSourceFacilityId===orderSourceFacilityId ? true : false
          })
          } else {
            currentFacilityProductList = facilityProductList.filter(product=>{
              const productSourceFacilityId = get(product,'name.data.orderList[0].productionList[0].sourceFacilityId')
              return !productSourceFacilityId ? true : false
            })
          }
        }
      const facilityResp = await  store.level2SDK.documentServices.retrieveDocument({
        idList: [get(order,"fid")],
        options: {
          xfname: "ovid",
          scondition: "type in (276481,271361)"
        }
      })
      const facilityDoc = await Promise.all(
        facilityResp.data.document.map(
          async (doc) =>
            await documentToNote({
              document: replaceUint8ArrayWithBase64(doc),
            }),
        ),
      )
      let productList = currentFacilityProductList.map(item=>(
        `
          <tr>
            <td>${get(item,'name.data.orderList.0.productionList.0.title')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.productInfo')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.num')}</td>
            <td>${get(item,'name.data.orderList.0.productionList.0.totalMoney')}</td>
          </tr>
        `
      )).join('')
      let body = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', sans-serif;
            }
      
            i {
              font-style: normal;
              color: #3896ec;
            }
      
            a {
              text-decoration: none;
              color: #2988e6;
              line-height: 35px;
            }
      
            p {
              line-height: 35px;
              word-wrap: break-word;
            }
      
            table {
              margin: 30px 0 20px;
              width: 100%;
              border-collapse: collapse;
            }
            th,
            td {
              padding: 11px 0 12px 34px;
              text-align: left;
            }
      
            table thead th {
              background-color: #f4f4f4;
            }
      
            table tbody tr {
              border-bottom: 1px solid #dedede;
            }
          </style>
        </head>
        <body>
          <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
            <div>
              <p>
                Dear
                <i>${get(order,'name.data.contactInfomation.name')}</i>
              </p>
              <p>Thank you for placing an order with us.</p>
              <p>
                This is to confirm that we have received your order. Your order number
                is <i>${get(order,'name.orderNumber')}</i> . Please check the
                information below to confirm that it is correct.
              </p>
            </div>
            <table>
              <thead>
                <th>Product</th>
                <th>Option</th>
                <th>QTY</th>
                <th>Price</th>
              </thead>
              <tbody>
                  ${productList}
              </tbody>
            </table>
            <div style="margin-bottom: 27px">
              <p>Taxes: $${get(order,'name.data.taxes')}</p>
              <p>Shipping: $${get(order,'name.data.shippingCostAmount') || '0.00'}</p>
              <p>Order Total: $${get(order,'name.data.totalMoney')}</p>
              <p>
                Shipping Method: ${get(order,'name.data.deliveryMethod.type') ===
                "Ship to me" ? "Shipping": get(order,'name.data.deliveryMethod.type')}
              </p>
              <p>
                Shipping address: ${get(order,'name.data.contactInfomation.address')}
              </p>
            </div>
      
            <p>
              If you have any question regarding your order, please contact
              ${get(emailInfo,'medicalFacilityName')} at
              <i>${get(emailInfo,'facilityEmail')}</i> or
              ${get(emailInfo,'facilityPhone')}
            </p>
      
            <div style="margin: 47px 0 28px">
              <p>Regards,</p>
              <p>Customer Service Team</p>
              <p>
                <a href="https://www.aitmed.com/"
                  >Aitmed.com</a
                >
              </p>
            </div>
      
            <div
              style="
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dedede;
              "
            >
              <a href="https://www.aitmed.com/index.html?TermsOfService"
                >Terms of Use
              </a>
      
              <span style="color: #c1c1c1">|</span>
              <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                Privacy Policy</a
              >
            </div>
      
            <div>
              <p>
                Note: This email was sent from a notification-only address that cannot
                accept incoming email. Please do not reply to this message.
              </p>
              <p>© 2021 AiTmed, Inc. All rights reserved.</p>
              <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
            </div>
          </div>
        </body>
      </html>
      
      `  
      let subject = `Aitmed Order Confirmation, Order #: ${get(order,'name.orderNumber')}`
      let receptEmail = get(order,'name.data.contactInfomation.email')
      const content = {
        receptEmail,
        subject,
        body,
        platform: 'web'
      }
      await Document.create({
        edge_id,
        content,
        mediaType: 'application/json',
        type: 3009,
        atimes: -10,
      })
    }
  }else if(emailType === "pickUp"){

    // pick up 邮件
    for (const order of orderList) {
      let body = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', sans-serif;
            }
      
            i {
              font-style: normal;
              color: #3896ec;
            }
      
            a {
              text-decoration: none;
              color: #2988e6;
              line-height: 35px;
            }
      
            p {
              line-height: 35px;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
            <div>
              <p>
                Dear
                <i>${get(order,'name.data.contactInfomation.name')}</i>
              </p>

              <p>Thank you for placing an order with us.</p>

              <p>This is to confirm that we prepared your order 
              <i>${get(order,'name.orderNumber')}</i>.
              You can pick up the products at ${get(emailInfo,'medicalFacilityName')},${get(order,'name.data.pickUpLocation')}.</p>
              
              <p>If you have any question regarding your order, please contact ${get(emailInfo,'medicalFacilityName')} at ${get(emailInfo,'facilityEmail')} or ${get(emailInfo,'facilityPhone')}.</p>
            </div>

            <div style="margin: 47px 0 28px">
              <p>Regards,</p>
              <p>Customer Service Team</p>
              <p>
                <a href="https://www.aitmed.com/"
                  >Aitmed.com</a
                >
              </p>
            </div>
      
            <div
              style="
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 2px solid #dedede;
              "
            >
              <a href="https://www.aitmed.com/index.html?TermsOfService"
                >Terms of Use
              </a>
      
              <span style="color: #c1c1c1">|</span>
              <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                Privacy Policy</a
              >
            </div>
      
            <div>
              <p>
                Note: This email was sent from a notification-only address that cannot
                accept incoming email. Please do not reply to this message.
              </p>
              <p>© 2021 AiTmed, Inc. All rights reserved.</p>
              <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
            </div>
          </div>
        </body>
      </html>
      
      `  
      let subject = `Aitmed Ready for Pickup, Order #: ${get(order,'name.orderNumber')}`
      let receptEmail = get(order,'name.data.contactInfomation.email')
      const content = {
        receptEmail,
        subject,
        body,
        platform: 'web'
      }
      await Document.create({
        edge_id,
        content,
        mediaType: 'application/json',
        type: 3009,
        atimes: -10,
      })
    }
    // shipping 邮件
    }else{
      for (const order of orderList) {
        let body = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style type="text/css">
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                  'Helvetica Neue', sans-serif;
              }
        
              i {
                font-style: normal;
                color: #3896ec;
              }
        
              a {
                text-decoration: none;
                color: #2988e6;
                line-height: 35px;
              }
        
              p {
                line-height: 35px;
                word-wrap: break-word;
              }
        
              table {
                margin: 30px 0 20px;
                width: 100%;
                border-collapse: collapse;
              }
              th,
              td {
                padding: 11px 0 12px 34px;
                text-align: left;
              }
        
              table thead th {
                background-color: #f4f4f4;
              }
        
              table tbody tr {
                border-bottom: 1px solid #dedede;
              }
            </style>
          </head>
          <body>
            <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
              <div>
                <p>
                  Dear
                  <i>${get(order,'name.data.contactInfomation.name')}</i>
                </p>
                <p>
                Thank you for placing an order with us.
                </p>
                <p>This is to confirm that we shipped your order <i>${get(order,'name.orderNumber')}</i> on ${get(emailInfo,'shipmentDate')}.</p>
                <p>Carrier: ${get(emailInfo,'carrier')}</p>
                <p>Tracking #: ${get(emailInfo,'trackNumber')}</p>
                <p>If you have any question regarding your order, please contact ${get(emailInfo,'medicalFacilityName')} at ${get(emailInfo,'facilityEmail')}or ${get(emailInfo,'facilityPhone')}.</p>
              </div>
          
              <div style="margin: 47px 0 28px">
                <p>Regards,</p>
                <p>Customer Service Team</p>
                <p>
                  <a href="https://www.aitmed.com/">Aitmed.com</a>
                </p>
              </div>
        
              <div
                style="
                  margin-bottom: 10px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #dedede;
                "
              >
                <a href="https://www.aitmed.com/index.html?TermsOfService"
                  >Terms of Use
                </a>
        
                <span style="color: #c1c1c1">|</span>
                <a href="https://www.aitmed.com/index.html?PrivacyPolicy">
                  Privacy Policy</a
                >
              </div>
        
              <div>
                <p>
                  Note: This email was sent from a notification-only address that cannot
                  accept incoming email. Please do not reply to this message.
                </p>
                <p>© 2021 AiTmed, Inc. All rights reserved.</p>
                <p>1000 S. Anaheim Blvd, Anaheim, CA 92805. Tel: 657-220-5555</p>
              </div>
            </div>
          </body>
        </html>
        
        `  
        let subject = `Aitmed Order Shipped, Order #: ${get(order,'name.orderNumber')}`
        let receptEmail = get(order,'name.data.contactInfomation.email')
        const content = {
          receptEmail,
          subject,
          body,
          platform: 'web'
        }
        await Document.create({
          edge_id,
          content,
          mediaType: 'application/json',
          type: 3009,
          atimes: -10,
        })
      }
    }
    
 
  
  },
  /**
   * Used to build the staff under the vendor
   * @param ownerId
   * @param facilityId
   * @param staffInfo
   * @returns 
   */
  async createVendorStaff(
    {
      ownerVertex,
      staffInfo,
    }:{
      ownerVertex: Record<string,any>
      staffInfo: Record<string,any>
    }
  ){
    const currentId = localStorage.getItem('user_vid')
    try{
      let newStaff // 返回结果
      const ownerUint8ArraySK = store.level2SDK.utilServices.sKeyDecrypt(
        store.level2SDK.utilServices.normalizeStringTo32BitArray(ownerVertex.name.password),
        store.level2SDK.utilServices.base64ToUint8Array(ownerVertex.esk)
      )
      if(ownerUint8ArraySK && ownerVertex?.id){
        const ownerSK = store.level2SDK.utilServices.uint8ArrayToBase64(ownerUint8ArraySK)
        const options = {
          ObjType: 4,
          xfname: "E.bvid",
          scondition: "E.type=1100 AND V.type=20",
        }
        const facilityResp = await store.level2SDK.vertexServices.retrieveVertex({
          idList: [ownerVertex.id],
          options,
        })
        const facilityVertex = facilityResp.data.vertex[0]
        const facilityId = store.level2SDK.utilServices.uint8ArrayToBase64(facilityVertex.id)
        const facilityPassword =  `${ownerSK}${facilityId}`
        const facilityPw = store.level2SDK.utilServices.generatePasswordWithParentSK({password: facilityPassword})
        const skOfFacilityToUint8Array = store.level2SDK.utilServices.sKeyDecrypt(
          store.level2SDK.utilServices.normalizeStringTo32BitArray(facilityPw),
          facilityVertex.esk
        )
        const pkOfFacilityToUint8Array = facilityVertex.pk
        if(skOfFacilityToUint8Array){
          const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: facilityPassword})
          let halfkey = store.level2SDK.utilServices.base64ToUint8Array(password)
          await store.level2SDK.edgeServices.createEdge({
            bvid: facilityId,
            type: 1030,
          })
          const jwt = localStorage.getItem('jwt')
          if(jwt){
            localStorage.setItem('vcjwt',jwt)
          }
          const { data } = await store.level2SDK.Account.createUserNoModifyKey({
            phone_number:staffInfo.phoneNumber,
            password: staffInfo.password,
            verification_code: 0,
            userInfo: { 
              ...staffInfo,
            },
            type: staffInfo.status === 'Active'?2:-2,
          })
          newStaff = data.vertex
          const pkOfStaffToUint8Array = data.vertex.pk
          const staffId = store.level2SDK.utilServices.uint8ArrayToBase64(data.vertex.id)
          const eesak = store.level2SDK.utilServices.aKeyEncrypt(
            pkOfStaffToUint8Array,
            skOfFacilityToUint8Array,
            halfkey
          )
          const besak = store.level2SDK.utilServices.aKeyEncrypt(
            pkOfFacilityToUint8Array,
            skOfFacilityToUint8Array,
            halfkey
          )
          const edgeOptions = {
            type: 1200,
            bvid: facilityId,
            evid: staffId,
            name:'',
            eesak,
            besak,
          }
          const re = await store.level2SDK.edgeServices.createEdge(edgeOptions)
          await store.level2SDK.edgeServices.createEdge({
            bvid: currentId,
            type: 1030,
          })
        }

      }
      
      return replaceUint8ArrayWithBase64(newStaff)
    }catch(error){
      await store.level2SDK.edgeServices.createEdge({
        bvid: currentId,
        type: 1030,
      })
      console.error(error)
    }
  },
  /**
   * Used to build vendor-related staff facility locations as well as owner-users and their contacts.
   * @param vendorObj 
   * @returns 
   */
  async createVendor({ vendorObj }: { vendorObj: Record<string,any> }) {

    const currentId = localStorage.getItem('user_vid')
    if(!vendorObj) return
    try{
      //create vendor self staff
      const vertexInfo = get(vendorObj,"name.basicInfo")
      const jwt = localStorage.getItem('jwt')
      if(jwt){
        localStorage.setItem('vcjwt',jwt)
      }
      const { data } = await store.level2SDK.Account.createUserNoModifyKey({
        phone_number:vertexInfo.phoneNumber,
        password: vertexInfo.password,
        verification_code: 0,
        userInfo: { ...vertexInfo },
        type: 2,
      })
      if(!data) return
      const ownerId = store.level2SDK.utilServices.uint8ArrayToBase64(data.vertex.id)
      const ownerUint8ArraySK = store.level2SDK.utilServices.sKeyDecrypt(
        store.level2SDK.utilServices.normalizeStringTo32BitArray(vertexInfo.password),
        data.vertex.esk
      )
      await store.level2SDK.edgeServices.createEdge({
        bvid: ownerId,
        type: 1030,
      })
      if(ownerUint8ArraySK){
        const ownerSK = store.level2SDK.utilServices.uint8ArrayToBase64(ownerUint8ArraySK)
        // create facility and 1100 edge
        const facilityOptions = {
          atimes: -10,
          type: 20,
          tage: 0,
          name: {
            basicInfo: {
              ...get(vendorObj,"name.basicInfo"),
              ...get(vendorObj,"name.vendorAddress")
            }
          },
          subtype: 110,
          esk: "",
          pk: "",
          jwt: "",
          uid: get(vendorObj,"name.basicInfo.vendorName"),
        }
        async function createFacilityUser({options,ownerId,ownerSK}){
          let response = await store.level2SDK.vertexServices.createVertex({...options})
          const vertex = response?.data?.vertex
          const facilityId = store.level2SDK.utilServices.uint8ArrayToBase64(vertex?.id)
          const pw = `${ownerSK}${facilityId}`
          const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
          const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithParentSK({
            secretKey,
            password: pw,
          })
          const sk = store.level2SDK.utilServices.uint8ArrayToBase64(secretKey)
          const pk = store.level2SDK.utilServices.uint8ArrayToBase64(publicKey)
          options['pk'] = pk
          options['esk'] = store.level2SDK.utilServices.uint8ArrayToBase64(encryptedSecretKey)
          await store.level2SDK.vertexServices.updateVertex({
            ...options,
            id: facilityId,
          })
          return {
            id: facilityId,
            sk,
            pk
          }
        }
        const facilityRes = await createFacilityUser({options: facilityOptions,ownerId,ownerSK})
        const facilityId = facilityRes.id
        const facility_sk = facilityRes.sk
        const facility_pk = facilityRes.pk
        await store.level2SDK.edgeServices.createEdge({
          bvid: facilityId,
          type: 1030,
        })
        const locationOptions = {
          ...facilityOptions,
          type: 21,
          pk: '',
          esk: '',
        }
        if(facilityId){
          await createFacilityUser({options: locationOptions,ownerId:facilityRes.id,ownerSK:facilityRes.sk})
        }
        const pkOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facility_pk)
        const skOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facility_sk)
        const staffList = get(vendorObj,"name.staffList")
        const key = `${ownerSK}${facilityId}`
        const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: key})
        let halfkey = store.level2SDK.utilServices.base64ToUint8Array(password)
        //create other staff and 1200 edge
        if(u.isArr(staffList) && facilityId){
          const jwt = localStorage.getItem('jwt')
          if(jwt){
            localStorage.setItem('vcjwt',jwt)
          }          
          await Promise.all(
            staffList.map(async staff =>{
              const { data } = await store.level2SDK.Account.createUserNoModifyKey({
                phone_number:staff.phoneNumber,
                password: staff.password,
                verification_code: 0,
                userInfo: { 
                  ...staff,
                },
                type: staff.status === 'Active'?2:-2,
              })
              const pkOfStaffToUint8Array = data.vertex.pk
              const staffId = store.level2SDK.utilServices.uint8ArrayToBase64(data.vertex.id)
              const eesak = store.level2SDK.utilServices.aKeyEncrypt(
                pkOfStaffToUint8Array,
                skOfFacilityToUint8Array,
                halfkey
              )
              const besak = store.level2SDK.utilServices.aKeyEncrypt(
                pkOfFacilityToUint8Array,
                skOfFacilityToUint8Array,
                halfkey
              )
              const edgeOptions = {
                type: 1200,
                bvid: facilityId,
                evid: staffId,
                name:'',
                eesak,
                besak,
              }
              // await store.level2SDK.edgeServices.createEdge({
              //   bvid: facilityId,
              //   type: 1030,
              // })
              const re = await store.level2SDK.edgeServices.createEdge(edgeOptions)
            })
          )
        }
        await store.level2SDK.edgeServices.createEdge({
          bvid: currentId,
          type: 1030,
        })
      }
    }catch(error){
      await store.level2SDK.edgeServices.createEdge({
        bvid: currentId,
        type: 1030,
      })
      console.error(error)
    }
  },
  async returnIncoming({ productList, curProductList }: { productList:{}[], curProductList:{}[] }){
    const facilityId = get(productList[0],"bsig")
    const userId = localStorage.getItem("facility_vid") ? localStorage.getItem("facility_vid")?.toString() : localStorage.getItem("user_vid")?.toString()
    await store.level2SDK.edgeServices.createEdge({
      bvid: facilityId,
      type: 1030,
    })
    const result = await Promise.all(
      productList.map(async product=> {
        const curProduct = curProductList.filter(
          cur => get(cur,"name.data.orderList.0.productionList.0.productionId") === get(product,"name.data.originProductId")
        )
        const productNumber = curProduct.reduce((pre:number,cur:{}) => {
          const num:string = get(cur,"name.nonce", '')
          return (pre+(+num))
        },0)
        return await Document.update(get(product,"id"),{
          edge_id: get(product,"eid"),
          content: get(product,"name.data"),
          targetRoomName: get(product,"name.targetRoomName"),
          type: get(product,"type"),
          title: get(product,"name.title"),
          tage: get(product,"tage"),
          mediaType: 'application/json',
          dTypeProps: get(product,"subtype"),
          fid: get(product,"fid"),
          reid: get(product,"reid"),
          paymentNonce: get(product,"nonce"),
          tags: [`-${productNumber}`],
          user: get(product,"name.user"),
        })
      })
    )
    await store.level2SDK.edgeServices.createEdge({
      bvid: userId,
      type: 1030,
    })
  },
  /**
   * 通过id获取所有的商品，并且更新
   * @param facilityId 
   */
  async updateProduct({facilityId}:{facilityId:string}){
    const productResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [facilityId],
      options: {
        ObjType: 8,
        xfname: "E.bvid",
        type: 197121,
        maxcount: 500,
        scondition: "E.type=10000 AND D.type=197121"
      }
    })
    const productList = await Promise.all(
      get(productResp,"data.document").map(
        async item => 
        await documentToNote({
          document: replaceUint8ArrayWithBase64(item)
        })
      )
    )
    const updateList = await Promise.all(
      productList.map(
        async product => {
          const {basicInfo,inventory,...rest} = get(product,"name.data")
          const updateResp = await Document.update(get(product,"id"),{
            edge_id: get(product,"eid"),
            content: {
              ...rest,
              basicInfo: {
                ...basicInfo,
                vendor: "AITMED INC",
                manufacturer: get(basicInfo,"vendor")
              },
              inventory: {
                ...inventory,
                inventoryLocation: "1000 S. Anaheim Blvd 200, Anaheim, CA, 928055803"
              }
            },
            targetRoomName: get(product,"name.targetRoomName"),
            type: get(product,"type"),
            title: get(product,"name.title"),
            tage: get(product,"tage"),
            mediaType: 'application/json',
            dTypeProps: get(product,"subtype"),
            fid: "YHfzOAAAAAACrQAAAAAAAA==",
            reid: get(product,"reid"),
            paymentNonce: get(product,"nonce"),
            tags: get(product,"name.tags"),
            user: get(product,"name.user"),
            vendorId: "YHfzOAAAAAACrQAAAAAAAA==",
          })
          return updateResp['doc']
        }
      )
    )
    log.debug('%c Cadl Error','background-color:green;color: white;font-size: 40px',updateList)
  },
  async updateDocTag({docList, index, hex}:{docList: {[key in string]}[], index: number, hex: number}){
    return docList.map(doc => {
      doc.tage = inhx(doc.tage, index, hex)
      log.debug(doc);
      return doc
    })
    function inhx(intHex, index, hex){
      if (typeof intHex === 'string') intHex = parseInt(intHex)
      if (((intHex >> (index - 1)) & 1) !== hex) {
        if (hex === 1) {
          intHex += Math.pow(2, index - 1)
        } else {
          intHex -= Math.pow(2, index - 1)
        }
        return intHex
      } else {
        return intHex
      }
    }
  },
  /**
   * 创建chatList聊天中图像doc
   * @param cdDataIn
   * @returns doc
   */
  async cdWithOutUpload({cdDataIn}:{cdDataIn:Record<string,any>}){
    try{
      if(cdDataIn){
        const {eid,fid,name,subtype,...restOfDocOptions} = cdDataIn
        if(u.isObj(name.data)){
          const response = await Document.createChatImage({
            edge_id: eid,
            content: name?.data,
            targetRoomName: name?.targetRoomName,
            paymentNonce: name?.nonce,
            mediaType: name?.type,
            title: name?.title,
            user: name?.user,
            sesk: name?.sesk,   
            tags: name?.tags,
            // @ts-expect-error
            sfname: name?.sfname,
            aesk: name?.aesk,
            notification: name?.notification,
            atimes: restOfDocOptions?.atimes,
            tage: restOfDocOptions?.tage,
            type: restOfDocOptions?.type,
            fid: fid,
            reid: restOfDocOptions?.reid,
            jwt: restOfDocOptions?.jwt,
            documentName: name,
            dTypeProps:subtype,
          })
          let res = replaceUint8ArrayWithBase64(response)
          res.doc.name.chatData.localData = name.data
          return res
        }
        
      }
    }catch(error){
      log.debug(error)
      throw error
    }
  },
  async filterShoppingCartByMethods({ShoppingCartList,method,inventoryIdPath ='name.data.orderList[0].productionList[0].inventoryId'}: {ShoppingCartList: any[],method: string,inventoryIdPath:string}){
    for (const item of ShoppingCartList) { 
      const inventoryId = get(item,inventoryIdPath) 
      const inventoryResp= await store.level2SDK.documentServices.retrieveDocument({
        idList: [inventoryId],
      })
      const inventoryList = inventoryResp?.data?.document?.length
      ? inventoryResp?.data?.document
      : []
      const tage = get(inventoryList[0],'tage')
      if (method==='Pick up') {
        set(item,'isPickUp',tage & 1 ? true : false)            
      }else {
        set(item,'isShipping',(tage >> 1) & 1 ? true : false)            
      }
    }
   return ShoppingCartList
  },
  async updateSku({superadminId}:{superadminId:string}){
    const skuListResp = await store.level2SDK.documentServices.retrieveDocument({
      idList: [superadminId],
      options: {
        xfname: "ovid",
        maxcount: 1000,
        type: 455681
      }
    })
    const skuList = await Promise.all(
      get(skuListResp,"data.document").map(
        async sku => await documentToNote({
          document: replaceUint8ArrayWithBase64(sku)
        })
      )
    )
    const needSkuList = skuList.filter(
      sku => !(get(sku,"name.data.pickAndStock")[0].pickupLocationId)
    )
    log.debug('%c needSkuList','background-color:pink;color: white;font-size: 40px',needSkuList)
    const pickupLocationId = "YCdy/QAAAABPVgJCrBIAAg=="
    const updatedSkuList = await Promise.all(
      needSkuList.map(
        async sku => {
          const pickAndStock = get(sku,"name.data.pickAndStock")
          const newPickAndStock = pickAndStock.map(
            each => {
              return {
                pickupLocationId,
                stock: get(each,"stock"),
              }
            }
          )
          const skuUpdateResp = await Document.update(get(sku,"id"), {
            atimes: -10,
            edge_id: get(sku,"eid"),
            content: {
              ...get(sku,"name.data"),
              pickAndStock: newPickAndStock,
            },
            user: get(sku,"name.user"),
            type: get(sku,"type"),
            title: get(sku,"name.title"),
            reid: get(sku,"esig"),
            fid: get(sku,"fid"),
            tage: get(sku,"tage"),
            mediaType: get(sku,"name.type"),
          })
          return skuUpdateResp["doc"]
        }
      )
    )  
    log.debug('%c updatedSkuList','background-color:pink;color: white;font-size: 40px',updatedSkuList)
  },
  async trimEHIData({ patientList, facilityId, locationIdList, author, vitalSignRange }:{ patientList:{}[], facilityId: string, locationIdList: string[], author: string, vitalSignRange: string}){
    return await Promise.all(
      patientList.map(async patient => {
          let patientObj
          // const global = JSON.parse(localStorage.getItem('Global') as string)
          // const currentUser = get(global,"currentUser.vertex.name.fullName")
          // const facilityId = localStorage.getItem("facility_vid")
          // const locationIdList = get(global,"alllocationID")
          // ! 获取10002 从而拿到patient vertex id 
          // const patientVertexResp = await store.level2SDK.edgeServices.retrieveEdge({
          //   idList: [get(patient,"10002id")]
          // })
          // const patientVertex = replaceUint8ArrayWithBase64(patientVertexResp?.data?.edge[0])
          // const patientId = patientVertex.bvid === facilityId ? patientVertex.evid : patientVertex.bvid
          
          // ! 获取10002 病人profile 
          const patientProfileResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: [get(patient,"id", '')],
          })
          const patientProfile = await documentToNote({document: replaceUint8ArrayWithBase64(patientProfileResp?.data?.document[0])})
          const friendEdge = await store.level2SDK.edgeServices.retrieveEdge({
            idList: [get(patient,"10002id")],
          })
          log.debug('friendEdge',friendEdge);
          const bvid = friendEdge.data.edge[0].bvid
          const evid = friendEdge.data.edge[0].evid
          const bvidEdge = store.level2SDK.utilServices.uint8ArrayToBase64(bvid)
          const evidEdge = store.level2SDK.utilServices.uint8ArrayToBase64(evid)
          let patientVertexId
          if(bvidEdge === facilityId) patientVertexId = evidEdge
          else patientVertexId = bvidEdge
          const belongEdgeId = JSON.parse(localStorage.getItem('Global') as string).formData.belongEdgeID
          const user_vid = localStorage.getItem("user_vid") as string
          // 为每一个patient 生成一个auditLog
          utils.createAuditLog({
            actionTypeCode: 6,
            recordTypeCode: 501761,
            eid: belongEdgeId,
            user: author,
            userId: user_vid,
            targetUserId: patientVertexId,
            date: "",
            accessPort: "admin",
            amendment: "",
            targetUser: get(patientProfile,"name.data.basicInfo.fullName"),
            amendmentId: '',
            directDetails: '',
          })
          let queryIdList: string[] = []
          queryIdList.push(patientVertexId, facilityId, ...locationIdList)
          // Encounters
          const edgeResp = await store.level2SDK.edgeServices.retrieveEdge({
            idList: queryIdList,
            options: {
              ObjType: 20,
              xfname: "(E.bvid,E2.Bvid)|(E.evid,E2.Bvid)",
              scondition: "E2.type=40000 AND E2.subtype&0xff in (1,9) AND E.type=40000 AND E.subtype&0xff in (6,11,15,17)",
              obfname: 'ctime',
              maxcount: 1000,
            },
          })
          const meetings = edgeResp.data.edge

          log.debug('meetings', meetings);
          // 获取时间戳的时分秒
          function formatTime(date) {
            let hours = date.getHours();
            let minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // 将午夜（0时）转换为 12 小时制
            minutes = minutes < 10 ? '0' + minutes : minutes; // 在分钟数小于 10 时补零
            const timeString = `${hours}:${minutes} ${ampm}`;
            return timeString;
          }
          // 获取年月日-时分秒
          function formatTimestamp(timestamp) {
            const date = new Date(timestamp);
            const dateString = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            const timeString = formatTime(date);
            const formattedString = `${dateString} ${timeString}`;
            return formattedString;
          }
          // 获取会议状态
          function getMeetingStatus(meet, tage = 'tage', type = 'subtype'){
            if ((get(meet, tage) & 0x100) === 256) return 'Completed'
            else {
              if ( (get(meet, type) & 0x00ff) === 6 || (get(meet, type) & 0x00ff) === 100 ) 
                return 'Scheduled'
              else if ((get(meet, type) & 0x00ff) === 11)
                return 'Canceled'
              else if ((get(meet, type) & 0x00ff) === 15)
                return 'Changed'
              else if ((get(meet, type) & 0x00ff) === 17) 
                return 'Replaced'
            }
            return ''
          }
          // 获取room的main provider
          function getMainProvider(arr, value, key, key1){
            for (let i = 0; i < arr.length; i++) if (get(arr[i], key) === value) return get(arr[i], key1)
          }
          const providerGroupOption={
            xfname: 'refid',
            type: 1053,
            scondition: "subtype = 140",
            obfname: 'ctime',
            maxcount: 1000,
          }
          // 获取provider
          async function getProvider(meet){
            let provider=''
            if(get(meet, 'name.visitType') == 'Telemedicine' || get(meet, 'name.visitType') == 'Office Visit') 
              provider = get(meet, 'name.providerName')
            else {
              const groupProdEdgeResp = await store.level2SDK.edgeServices.retrieveEdge({
                idList: [meet.eid],
                options: providerGroupOption,
              })
              const groupProdEdge = groupProdEdgeResp.data.edge
              log.debug('groupProdEdge', groupProdEdge);
              const mainProvider = getMainProvider(groupProdEdge, 1, 'tage', 'name.roleName')
              provider = mainProvider
            }
            return provider
          }
          // 获取location
          function getLocation(meet){
            if(get(meet, 'name.visitType') == 'Telemedicine') return 'Online'
            else if(get(meet, 'name.visitType') == 'Office Visit') return get(meet, 'name.location')
            else return get(meet, 'name.roomName') +'; '+ get(meet, 'name.location')  
          }
          async function getCareTeamMember(meet){
            if(get(meet, 'name.visitType') == 'Telemedicine' || get(meet, 'name.visitType') == 'Office Visit') return ''
            else{
              const groupProdEdgeResp = await store.level2SDK.edgeServices.retrieveEdge({
                idList: [meet.eid],
                options: providerGroupOption,
              })
              const groupProdEdge = groupProdEdgeResp.data.edge
              const filteredArray = groupProdEdge.filter(item => get(item, 'tage') != 1);
              return filteredArray.map(item => get(item, 'name.roleName')).join(', ')
            }
          }
          const encounters = await Promise.all(meetings.map(async meet => {
            log.debug('bvid', store.level2SDK.utilServices.uint8ArrayToBase64(meet.bvid))
            log.debug('evid', store.level2SDK.utilServices.uint8ArrayToBase64(meet.evid))
            log.debug(formatTimestamp(meet.stime*1000) +' - '+ formatTimestamp(meet.etime*1000));
            return{
              timeSlot: formatTimestamp(meet.stime*1000) +' - '+ formatTimestamp(meet.etime*1000),
              location: getLocation(meet),
              provider: await getProvider(meet),
              careTeamMember: await getCareTeamMember(meet),
              reason: get(meet, 'name.Reason'),
              encounterType: get(meet, 'name.visitType') === 'Telemedicine' ? 'Telemedicine': 'Office Visit',
              encounterStatus: getMeetingStatus(meet),
            }
          }))
          log.debug('encounters', encounters);
          
          // Superbill financialResponsibility Diagnoses
          let docResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: queryIdList,
            options: {
              ObjType: 28,
              xfname: "(E.bvid,E2.Bvid)|(E.evid,E2.Bvid)",
              sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid\"}",
              scondition: "E2.type=40000 AND E2.subtype&0xff in (1,9) AND E.type=40000 AND E.subtype&0xff in (6,11,15) AND D.type in (184321,174081,186881)" ,
              maxcount: 1000
            },
          })
          const documentList = docResp?.data?.document
          const meetingDoc = await Promise.all(
            documentList.map(async document => (await documentToNote({document})))
          )
          log.debug('meetingDoc', meetingDoc);
          // patient chart
          let patientChartResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: queryIdList,
            options: {
              ObjType: 28,
              xfname: "(E.bvid,E2.Bvid)|(E.evid,E2.Bvid)",
              sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid\"}",
              scondition: "E2.type=40000 AND E2.subtype&0xff in (1,9) AND E.type=40000 AND E.subtype&0xff in (6,11,15) AND D.type in (25601)" ,
              maxcount: 1,
              obfname: "ctime"
            },
          })
          log.debug('patientChartResp', patientChartResp);
          let patientChart: any[]=[]
          if(patientChartResp.data.document.length != 0){
            patientChart = await documentToNote({document: replaceUint8ArrayWithBase64(patientChartResp?.data?.document[0])})
          }
          const insuranceResp = await store.level2SDK.documentServices.retrieveDocument({
            idList: [get(patient,"id", '')],
            options: {
              type: 148481,
              xfname: "reid",
              maxcount: 1000
            },
          })
          const insuranceRespDoc = insuranceResp?.data?.document
          const insurnace = await Promise.all(
            insuranceRespDoc.map(async document => (await documentToNote({document})))
          )
          let superbill = meetingDoc.filter(item => item['type'] === 184321)
          let diagnosis = meetingDoc.filter(item => item['type'] === 186881)
          let vitalDocResp
          if(vitalSignRange === 'All vital sign') {
            vitalDocResp = await store.level2SDK.documentServices.retrieveDocument({
              idList: [patientVertexId],
              options: {
                ObjType: 8,
                scondition: 'E.type in (40000,10000,10002) AND D.type in (371201,373761,376321,378881,381441,384001,386561,389121,391681)',
                xfname: 'E.bvid|E.evid',
                obfname: 'D.deat',
                asc: false,
              }
            })
          } else {
            const appVitalResp = await store.level2SDK.documentServices.retrieveDocument({
              idList: queryIdList,
              options: {
                ObjType: 28,
                xfname: "(E.bvid,E2.Bvid)|(E.evid,E2.Bvid)",
                sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid\"}",
                scondition: "E2.type=40000 AND E2.subtype&0xff in (1,9) AND E.type=40000 AND E.subtype&0xff in (6,11,15) AND D.type in (371201,373761,376321,378881,381441,384001,386561,389121,391681)" ,
                maxcount: 1000
              },
            })
            const connectVitalResp = await store.level2SDK.documentServices.retrieveDocument({
              idList: [patientVertexId, facilityId],
              options: {
                ObjType: 8,
                xfname: "(E.bvid,E.evid)|(E.evid,E.bvid)",
                scondition: "E.type=10002 AND D.type in (371201,373761,376321,378881,381441,384001,386561,389121,391681)" ,
                maxcount: 1000
              },
            })
            vitalDocResp = {
              ...appVitalResp,
              ...connectVitalResp
            }
          }
          console.log('%c vitalDocResp ','background-color:aqua;color: white;font-size: 40px',vitalDocResp)
          const vitalList = vitalDocResp?.data?.document
          const vitalListDoc = await Promise.all(
            vitalList.map(async document => (await documentToNote({document})))
          )
          log.debug('vitalListDoc',vitalListDoc);
          
          let financial = meetingDoc.filter(item => item['type'] === 174081)
          let Height = meetingDoc.filter(item => item['type'] === 386561)
          const timesMap:any = {}
          vitalListDoc.forEach(obj => {
            if(!timesMap[obj.ctime]) timesMap[obj.ctime]=[]
            timesMap[obj.ctime].push(obj)
          })
          const vitalCategory: any = Object.values(timesMap)
          log.debug('timesMap', timesMap);
          const vitalResult = vitalCategory.map(cate => {
            let obj={}
            cate.map(vite => {
              obj['measurementDate'] = getTimes(vite['deat']*1000)
              switch(vite.type){
                case 371201: obj['bloodPressure'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 373761: obj['heartRate'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 376321: obj['respRate'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 378881: obj['o2Sat'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 381441: obj['temp'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 386561: obj['height'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 389121: obj['weight'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
                case 391681: obj['bmi'] = get(vite,'name.data.showData')+' '+get(vite,'name.data.unit');break;
              }
            })
            return obj 
          })
          log.debug('vitalResult', vitalResult);
          
          log.debug('vitalCategory', vitalCategory);

          log.debug('patientChart', patientChart);
          const allergiesList = get(patientChart, 'name.data.allergies.allergiesList')??[]
          let report: any = {
            allergies: [],
            patientHealthSummary: {}
          }
          log.debug('insurnace', insurnace);
          // let medicalInsurance = insurnace.filter(item => item.tage === 0)
          // let workersComp = insurnace.filter(item => (item.tage&2) === 2)
          // let personalInjury = insurnace.filter(item => (item.tage&4) === 4)
          // insurance providers 
          report.insuranceProviders = insurnace.map(insur => {
            if((insur.tage&4)==4){
              return{
                payerName: get(insur, 'name.data.attorneyInfo.name'),
                policyType: 'Personal Injury',
                policyID: '--',
                coveredPartyID: '--',
                policyHolder: '--',
              }
            }else if((insur.tage&2)==2){
              return{
                payerName: get(insur, 'name.data.insurance.companyName'),
                policyType: 'Workers Comp',
                policyID: '--',
                coveredPartyID: '--',
                policyHolder: '--',
              }
            }else{
              return{
                payerName: get(insur, 'name.data.companyName'),
                policyType: 'Medical Insurance',
                policyID: get(insur, 'name.data.memberId'),
                coveredPartyID: '--',
                policyHolder: get(insur, 'name.data.relation'),
              }
            }
          });
          // Allergies
          log.debug('allergiesList', allergiesList);
          report.allergies = allergiesList?.map((aler: any) => ({
            type:  '--',
            substance: aler.allergy,
            reaction: aler.happen,
            status: get(patientChart, 'name.data.allergies.status') == 'Yes' ? 'Active': 'inactive',
            startDate: '--',
            serverity: '--',
          }));
          // Problems
          const pastMedicalHistory = get(patientChart, 'name.data.pastMedicalHistory')??[]
          report.pastMedicalHistory = pastMedicalHistory?.map(past => ({
            snomedCtCode: "--",
            icdCmCde: "--",
            icdCmVersion: "--",
            problem: past,
            effectiveDates: "--",
            problemStatus: "Active"
          }));
          // social history
          const socialHistory = get(patientChart, 'name.data.socialHistory')??{}
          let socialHistoryResult: {}[] = []
          for (let key in socialHistory) {
            if (socialHistory.hasOwnProperty(key)) {
              const category = socialHistory[key];
              // const status = category.hasOwnProperty("haveCaffeine") ? category["haveCaffeine"] : category["drink"];
              let detail = "", status='';
              switch (key) {
                case "alcohol":
                  detail = `What type? ${category["types"]}; How many drinks per week? ${category["timesPerWeek"]};`;
                  status = category['drink'];
                  break;
                case "caffeine":
                  detail = `What type? ${category["types"]}; How many drinks per day?${category["timesPreDay"]};`;
                  status = category['haveCaffeine'];
                  break;
                case "tobacco":
                  detail = `What type? ${category["types"]}; How many packs per day? ${category["packs"]}; Number of years using?${category["timesPerWeek"]};`;
                  status = category['currently'];
                  break;
                case "recreationalDrug":
                  detail = `What type? ${category["drugsType"]};`;
                  status = category['haveIllicitDrugs'];
                  break;
                case "exercise":
                  detail = `What type? ${category["type"]}; How many days per week?${category["daysPerWeek"]}; How many hours per day? ${category["hoursPerDay"]};`;
                  status = category['haveExercise'];
                  break;
                case "nutrition":
                  detail = `What type? ${category["type"]}; How many meals on average per day? ${category["mealsPerDay"]};`;
                  status = category['haveDiet'];
                  break;
                case "personalSafety":
                  detail = `Do you live alone?  ${category["liveAlone"]}; Do you frequently fall? ${category["frequentlyFall"]};
                    Need assistance walking? ${category["needAssistanceWalking"]}; Have you ever been abused? ${category["abused"]}; 
                    Do you wear a seatbelt? ${category["seatBelt"]};
                   `;
                  status = '';
                  break;
              }
              socialHistoryResult.push({
                name: key,
                status,
                detail,
              });
            }
          }
          // Family History
          const familyHistory = get(patientChart, 'name.data.familyHistory')??[]
          report.familyHistory = familyHistory?.map(famH => ({
            diagnosis: famH,
            ageAtiOnest: "--",
          }));
          // Immunizations
          const immunizations = get(patientChart, 'name.data.immunizations.immunizationsList')??[]
          report.immunizations = immunizations?.map((imm: any) => ({
            vaccine: imm.name,
            startDate: "--",
            notes: "--",
            status: get('patientChart', 'name.data.immunizations.status') ==='Yes' ? 'Completed' : 'No',
          }));
          // procedureCode
          log.debug('superbill', superbill);
          let procedureCodeList = superbill.reduce((acc, supe) => {
            if((!supe.name.data.procedureCodeList) || !supe.name.data.procedureCodeList.length) return acc
            supe.name.data.procedureCodeList.map(procedureCode => {
              acc.push({
                code: procedureCode.code,
                startTime: getTimes(supe.ctime*1000),
                status: "Completed"
              });
            })
            return acc;
          }, [])
          log.debug('procedureCodeList', procedureCodeList);
          // result
          log.debug('diagnosis', diagnosis);
          let diagnosisList = diagnosis.reduce((acc, dia) => {
            dia.name.data.diagnosis.descriptiveList.map(procedureCode => {
              acc.push({
                code: procedureCode.code + ' '+ get(procedureCode, 'description'),
              });
            })
            return acc;
          }, [])
          log.debug('diagnosisList', diagnosisList);
          report['procedures'] = procedureCodeList
          report['results'] = diagnosisList
          log.debug('report', report);
          log.debug('patientProfile', patientProfile);
          function uuid() {
            var temp_url = URL.createObjectURL(new Blob());
            var uuid = temp_url.toString();
            URL.revokeObjectURL(temp_url);
            return uuid.substr(uuid.lastIndexOf("/") + 1);
          }
          function getTimes(unixTime: number){
            return unixTime ? moment(unixTime).format('MM/DD/YYYY'): ""
          }
          patientObj = {
            patientInfo:{
              patientName: get(patientProfile,"name.data.basicInfo.fullName"),
              dob: get(patientProfile,"name.data.basicInfo.dateOfBirth"),
              sex: get(patientProfile,"name.data.basicInfo.gender"),
              race: "",
              ethnicity: "",
              contactInfo: get(patientProfile,"name.data.contactInfo.address.fullAddress"),
              patientId: get(patientProfile,"id"),
              documentId: uuid(),
              ctime: getTimes(new Date().getTime()),
              performer: get(patientChart, "name.data.generalInfo.primaryCarePhysician")??'',
              author,
              socialSecurity: get(patientProfile,"name.data.basicInfo.socialSecurity"),
              email: get(patientProfile,"name.data.basicInfo.myEmail")??'',
              identificationTypeNumber: get(patientProfile,"name.data.identification.type") + ', ' + get(patientProfile,"name.data.identification.id"),
              identificationType: get(patientProfile,"name.data.identification.type"),
              identificationNumber: get(patientProfile,"name.data.identification.id"),
            }
          }
          report['patientHealthSummary'] = patientObj
          report['vitalSign'] = vitalResult
          report['encounters'] = encounters
          report['socialHistory'] = socialHistoryResult
          return report
        }
      )
    )
  },
  async createInternalPatient( { patientObj } : { patientObj: {} }){
    try{
      const jwt = localStorage.getItem('jwt')
      if(jwt){
        localStorage.setItem('vcjwt',jwt)
      }
      const { data } = await store.level2SDK.Account.createUserNoModifyKey({
        phone_number: get(patientObj,"name.phoneNumber", ''),
        password: "12345",
        verification_code: 0,
        userInfo: { ...get(patientObj,"name", {}), },
        type: 3,
      })
      if(!data) return { error: 'create internal patient failed' }
      return replaceUint8ArrayWithBase64(data)
    }catch(error){
      return { error: error}
    }
  },
  async createFamiliyPatient( { vertex } : { vertex: {} }){
    try{
      const pk = localStorage.getItem('pk')
      const sk = localStorage.getItem('sk')
      const jwt = localStorage.getItem('jwt')
      if(jwt && u.isStr(sk) && u.isStr(pk) && vertex){
        const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: sk})
        const secretKeyUInt8Array = store.level2SDK.utilServices.normalizeStringTo32BitArray(password)
        const encryptedDataUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
        const esk = store.level2SDK.utilServices.sKeyEncrypt(
          secretKeyUInt8Array,
          encryptedDataUInt8Array,
        )
        localStorage.setItem('vcjwt',jwt)
        if (esk instanceof Uint8Array) {
          const pkOfUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
          const { data } = await store.level2SDK.vertexServices.createVertex({
            ...vertex,
            pk:pkOfUint8Array,
            esk: esk,
          })
          if(!data) return { error: 'create Familiy patient failed' }
          return {data: replaceUint8ArrayWithBase64(data)}
        }
      
      }
    }catch(error){
      return { error: error}
    }
  },
  /**
   * Update user pk sk and update besak or eesak on conference edge
   * @param password 
   * @param facilityId 
   * @param patientId
   * @param defaultPk
   * @returns 
   */
  async updateVertexAndMeeting({
    password,
    facilityId,
    patientId,
    defaultPk
  }:{
    password:string,
    facilityId:string,
    patientId:string,
    defaultPk:string
  }){
      if(!password || !facilityId || !patientId || !defaultPk) return
      try{
        //create 1030 edge
        await store.level2SDK.edgeServices.createEdge({
          bvid: patientId,
          type: 1030,
        })

        //query patient vertex
        const { data: patientVertex } = await store.level2SDK.vertexServices.retrieveVertex({
          idList: [patientId],
          options: {
            xfname: 'id',
            maxcount: 1,
          },
        })
        const patientVertexBase64 = replaceUint8ArrayWithBase64(patientVertex.vertex[0])

        const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
        const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithPassword({
          password,
          secretKey,
        })
        const { pkSign, skSign } = store.level2SDK.utilServices.generateSignatureKeyPair()
        const eskSign = store.level2SDK.utilServices.sKeyEncrypt(secretKey, skSign)
        const pkSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(pkSign)
        const eskSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(eskSign)

        log.debug('test request',{
          ...patientVertexBase64,
          id: patientVertexBase64.id,
          name: { 
            ...patientVertexBase64.name, 
            pkSign: pkSignBase64, 
            eskSign: eskSignBase64 
          },
          pk: publicKey,
          subtype: 2,
          tage: 0,
          esk: encryptedSecretKey,
        })
        //update vertex
        await store.level2SDK.vertexServices.updateVertex({
          ...patientVertexBase64,
          id: patientVertexBase64.id,
          name: { 
            ...patientVertexBase64.name, 
            pkSign: pkSignBase64, 
            eskSign: eskSignBase64 
          },
          pk: publicKey,
          subtype: 2,
          tage: 0,
          esk: encryptedSecretKey,
        })
        log.debug(`[updateVertexAndMeeting][update vertex] end`)

        //create 1282 1283
        const rootNoteBookId = patientVertexBase64?.deat?.rnb64ID
        if(rootNoteBookId){
          const {data: docResponse} = await store.level2SDK.documentServices.retrieveDocument({
            idList: [rootNoteBookId],
            options: {
              xfname: "eid",
              scondition: "type in (1282,1283)"
            },
          })

          if(docResponse.document.length > 0){
            //delete previous 1282 1283
            const perviousIdList = docResponse.document.map((item)=>store.level2SDK.utilServices.uint8ArrayToBase64(item.id))
            const { data } = await store.level2SDK.commonServices.deleteRequest([
              ...perviousIdList
            ])
            log.debug('test44',data)
          }
          //create 1282 1283
          const max: number = 9999999999999999
          const key: number = Math.floor(Math.random() * max)
          const randomKey =  String(key).toString()
          const secretKeyUInt8Array = store.level2SDK.utilServices.normalizeStringTo32BitArray(randomKey)
          const sesk = store.level2SDK.utilServices.sKeyEncrypt(
            secretKeyUInt8Array,
            secretKey,
          )
          // const defaultPk = "EuRB2J4cBRfzhNTpyevVSxnySCBZmGBQC9sL/G8o81g="
          const pkUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(defaultPk)

          const aesk =  store.level2SDK.utilServices.aKeyEncrypt_str(
            pkUInt8Array,
            secretKey,
            randomKey,
          )

          const seskBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sesk)

          
          await store.level2SDK.documentServices.createDocument({
            eid: rootNoteBookId,
            type: 1282,
            name: {
              sesk: seskBase64
            },
            subtype: 134217761
          })

          await store.level2SDK.documentServices.createDocument({
            eid: rootNoteBookId,
            type: 1283,
            name: {
              aesk
            },
            subtype: 134217761
          })

          
        }
        

        // // //query all location Id
        // const { data: localationData } = await store.level2SDK.vertexServices.retrieveVertex({
        //   idList: [facilityId],
        //   options: {
        //     ObjType: 4,
        //     xfname: "E.bvid",
        //     scondition: "E.type=1100 AND V.type=21"
        //   },
        // })
        // const locationIdList = localationData.vertex.map((item: any) => store.level2SDK.utilServices.uint8ArrayToBase64(item.id))


        //query 4000 E6 edge meeting
        const { data: meetingData } = await store.level2SDK.edgeServices.retrieveEdge({
          idList: [
            patientId
            // facilityId,
            // ...locationIdList
          ],
          options: {
            xfname: "evid | bvid",
            obfname: "ctime",
            maxcount: '1000',
            scondition: 'type=40000 AND subtype&0xff in (6,11,15,17)',
            asc: false
          },
        })
        
        log.debug(`[updateVertexAndMeeting][query E6 meeting] end`,meetingData)
        const meetingEdges = meetingData.edge
        const currentUserSk = localStorage.getItem('facility_sk')?localStorage.getItem('facility_sk'):localStorage.getItem('sk')
        const currentUserPk = localStorage.getItem('facility_pk')?localStorage.getItem('facility_pk'):localStorage.getItem('pk')
        let skOfInviterToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
        let pkOfInviterToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserPk!)
        if(u.isArr(meetingEdges)){
          for(let i = 0; i < meetingEdges.length; i++){
            const itemData = replaceUint8ArrayWithBase64(meetingEdges[i])
            const {besak,eesak,bvid,evid,eid,name} = itemData
            if(besak && eesak && evid === patientId && bvid === facilityId){
              let halfkey = await getHalfkey(meetingEdges[i],facilityId)
              // if(bvid === facilityId || evid === facilityId){
              //   halfkey = await getHalfkey(meetingEdges[i],facilityId)
              // }else{
              //   const resp = await store.level2SDK.edgeServices.retrieveEdge({
              //     idList: [bvid,facilityId,eid],
              //     options: {
              //       xfname: 'bvid,evid,refid',
              //       type: 1053
              //     }
              //   })
              //   const rootEdge = resp?.data?.edge?.[0]
              //   halfkey = await getHalfkey(rootEdge,patientId)
              // }
              
              log.debug(`test000 ${i}`,{itemData,halfkey,facilityId,patientId})
              if(halfkey instanceof Uint8Array && evid === patientId && bvid === facilityId){
                const eesak = store.level2SDK.utilServices.aKeyEncrypt(
                  publicKey,
                  skOfInviterToUint8Array,
                  halfkey
                )
                await store.level2SDK.edgeServices.updateEdge({
                  ...itemData,
                  id: eid,
                  eesak: store.level2SDK.utilServices.uint8ArrayToBase64(eesak),
                  besak: besak
                })
                
              }
            }
            
          }
        }
      }catch(error){
        log.debug({ error: error})
      }
      //create 1030 edge
      await store.level2SDK.edgeServices.createEdge({
        bvid: facilityId,
        type: 1030,
      })
    
  },
  /**
   * 
   * @param recommendList  
   * @param rootNotebookID  
   * @param recommendationId  
   * @returns 
   */
  async createProductDocList({recommendList,rootNotebookID,recommendationId}: {recommendList: any[], rootNotebookID: string,recommendationId:string}){
    let productDocIdList: {}[] = []
    for (const product of recommendList) {
       let content = {
         orderList: [
          {
            facilityName: product.facilityName,
            inventorName: product.inventorName,
            productionList: [
              {
                ...product ,
                totalMoney: round((+get(product,'num') * +get(product,'price')),2).toFixed(2),
              }
            ]
          }
        ]
       }
       const docResp =  await Document.create({
          edge_id: rootNotebookID,
          reid: product.inventoryId ,
          content,
          fid: product.productionId,
          mediaType: 'application/json',
          type: 220161,
          atimes: -10,
          tage: 8, 
          title: product.facilityId,
          paymentNonce: (product.num).toString(),
          vendorId: product.vendorId,
          documentName: {
            recommendationId,
          }
        }) 
      const document = replaceUint8ArrayWithBase64(docResp['doc'])        
      productDocIdList.push(document.id) 
    }
    return productDocIdList
    
  },
  /**
   * Update user pk sk and update besak or eesak on conference edge
   * @param password 
   * @param facilityId 
   * @param patientId
   * @param defaultPk
   * @returns 
   */
  async updateMeeting({
    internalId,
    internalSk,
    facilityPk,
    currentVertex,
    pk,
    sk
  }:{
    internalId:string
    internalSk:string
    facilityPk: string
    currentVertex: {
      id:string
      deat: {rnb64ID?:string}
      name: {
        userName:string
      }
      uid: string
    }
    pk:string
    sk: string
  }){
    if(!internalId || !pk || !sk) return
    try{
      //query 4000 E6 edge meeting
      const { data: meetingData } = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [
          internalId
        ],
        options: {
          xfname: "evid | bvid",
          obfname: "ctime",
          maxcount: '1000',
          scondition: 'type=40000 AND subtype&0xff in (6,11,15,17)',
          asc: false
        },
      })
      //query profile
      const rootNoteBookId = currentVertex?.deat?.rnb64ID
      let userName = currentVertex.name.userName
      if(rootNoteBookId){
        const { data: profileDoc } = await store.level2SDK.documentServices.retrieveDocument({
          idList: [
            rootNoteBookId
          ],
          options: {
            xfname: "eid",
            obfname: "ctime",
            type: 102401,
            asc: false
          },
        })
        const documents = profileDoc?.document
        if(documents){
          const doc = documents[0]
          const note = await documentToNote({ document: doc})
          if(note?.['name']?.data?.basicInfo?.fullName){
            userName = note?.['name']?.data?.basicInfo?.fullName
          }
        }
      }
      
      const meetingEdges = meetingData.edge
      const skUint8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
      const pkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
      const skOfInternalUint8Array = store.level2SDK.utilServices.base64ToUint8Array(internalSk)
      const pkOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facilityPk)
      const allMeetingIds:any[] = []
      if(u.isArr(meetingEdges)){
        for(let i = 0; i < meetingEdges.length; i++){
          const itemData = replaceUint8ArrayWithBase64(meetingEdges[i])
          const {besak,eesak,bvid,evid,eid,name,tage} = itemData
          const newtag = tage | (1 << 22)
          const eesakUint8Array = store.level2SDK.utilServices.base64ToUint8Array(eesak)
          const halfkey = store.level2SDK.utilServices.aKeyDecrypt(
            pkOfFacilityToUint8Array,
            skOfInternalUint8Array,
            eesakUint8Array,
          )
          const newName = {
            ...name,
            patientId: currentVertex.id,
            patientName: userName,
            patientPhoneNumber: currentVertex.uid
          }
          allMeetingIds.push(eid)
          if( halfkey){
              const eesak = store.level2SDK.utilServices.aKeyEncrypt(
                pkUint8Array,
                skUint8Array,
                halfkey
              )
              await store.level2SDK.edgeServices.updateEdge({
                ...itemData,
                name: newName,
                id: eid,
                evid: currentVertex.id,
                eesak: store.level2SDK.utilServices.uint8ArrayToBase64(eesak),
                besak: besak,
                tage: newtag
              })

          }
          
        }
      }
      const rootNotebookID = currentVertex?.deat?.rnb64ID
      if(rootNotebookID){
        await store.level2SDK.edgeServices.createEdge({
          type: 1013,
          name: {
            rootNotebookId: rootNotebookID,
            appointmentIdList: allMeetingIds
          } 
        })
      }
    }catch(error){
      log.debug(error)
    }
  },
  /**
   * 
   * @param recommendUserInfo 
   * @param receptUserInfo
   * @param params
   * @param edge_id
   * @param url
   */
  async createGoodsLink({recommendUserInfo,receptUserInfo,params,edge_id,url}: {recommendUserInfo: {},receptUserInfo: {},params: {} ,edge_id: string,url:string}){
    // ? 创建发送邮件doc
    async function _createEmail(receptEmail,subject,body) {
      const content = {
        receptEmail,
        subject,
        body,
        platform: 'web'
      }
      await Document.create({
        edge_id,
        content,
        mediaType: 'application/json',
        type: 3009,
        atimes: -10,
      })
    }

    // ? 创建发送短信
    async function _createMessage(receptPhone,link) {
      const body = `Hello ${get(receptUserInfo,'patientName')},There is a recommendation by ${get(recommendUserInfo,'providerName')},${get(recommendUserInfo,'facilityName')}. Please check the recommendations follow. ${link}`
      const edgeRequest = {
        type: 1012,
        name: {
          body,
          to: receptPhone,
          platform: 'web'
        }
      }
      await store.level2SDK.edgeServices.createEdge(edgeRequest)
    }

    async function _sendEmailHandle(receptEmail,link) {
      const subject= 'AiTmed Medical Recommendation'
      const body = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style type="text/css">
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI',
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans',
                'Helvetica Neue', sans-serif;
            }
      
            i {
              font-style: normal;
              color: #666666;
              font-weight: 700;
            }
      
            a {
              color: #2988e6;
              line-height: 35px;
            }
      
            p {
              line-height: 35px;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div style="margin: 50px auto; color: #333333; font-size: 20px; width: auto; max-width: 1150px">
            <div>
              <p>
                Hello ${get(receptUserInfo,'patientName')},
              </p>
              <p style="margin-bottom: 41px">
                There is a recommendation by <i>${get(recommendUserInfo,'providerName')},${get(recommendUserInfo,'facilityName')}.</i>
              </p>
            </div>
            <p>
              Please check the recommendations follow.
            </p>
            <p>
              <a href="${link}">Link</a>
            </p>
          </div>
        </body>
      </html>
      
      `
      await _createEmail(receptEmail,subject,body)
    }   
    
    async function _base64Tobase58({ key }: { key: string }) {
      let uint8Array = store.level2SDK.utilServices.base64ToUint8Array(key)
      return store.level2SDK.utilServices.uint8ArrayToBase58(uint8Array)
    }

    let newParams = {}
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];
        set(newParams,key, await _base64Tobase58({ key: value}))
      }
    }


    const searchQuery = new URLSearchParams(newParams).toString();
    const link = `${url}&${searchQuery}`
    const email = get(receptUserInfo,'email')
    const phone = get(receptUserInfo,'phone')
    email && await _sendEmailHandle(email,link)
    phone && await _createMessage(phone,link)
    return link
  },
  async formatOrderList({idList}: {idList: any[]}){
    if (isArray(idList) && idList.length && idList.every(i => typeof i=== 'string')) {

      
      const { data } =
      await store.level2SDK.documentServices.retrieveDocument({
        idList,
        options: {
          maxcount: -1
        }
      })         
      const orderList = await Promise.all(
        data.document.map(
          async (doc) =>
            await documentToNote({
              document: replaceUint8ArrayWithBase64(doc),
            }),
        ),
      )
      return orderList.map(item=>({
        orderNumber: get(item,'name.orderNumber') ,
        tage: get(item,'tage'),
        orderTime: get(item,'ctime'),
        orderId: get(item,'id'),
      }))
    }
  },
  async formatRecommendList({objectList,orderStatusTemp,recommendationStatusTemp}: {objectList: any[],orderStatusTemp: any[],recommendationStatusTemp: any[]}){
    for (const item of objectList) {
       async function _formatOrderList({idList}: {idList: any[]}){
        if ( isArray(idList) && idList.every(i => typeof i=== 'string')) {
          const { data } =
          await store.level2SDK.documentServices.retrieveDocument({
            idList,
            options: {
              maxcount: -1
            }
          })   
          const orderList = await Promise.all(
            data.document.map(
              async (doc) =>
                await documentToNote({
                  document: replaceUint8ArrayWithBase64(doc),
                }),
            ),
          )
          return orderList.map(item=>({
            orderNumber: get(item,'name.orderNumber') ,
            tage: get(item,'tage'),
            orderTime: get(item,'ctime')
          }))
        }
       }
       const { type } = item
       if (type === 204801) {
         let statusList
         let orderList = await _formatOrderList({idList: get(item,'name.data.orderList')}) as any[]         
         if (orderList && orderList.length !== 0) {
           statusList = orderStatusTemp.filter(status=> orderList.slice(-1)[0].tage.toString(2).split('').reverse()[status.bitPosition]==='1')
         } else if(orderList && orderList.length === 0) {
           statusList = recommendationStatusTemp.filter(status=> item.tage===status.tage)
         } else {
           statusList = [{
             display: "none"
           }]
         }
         const {bitPosition,tage,...statusAttribute} = statusList.slice(-1)[0]
         Object.keys(statusAttribute).forEach(key=>{
           set(item,key,statusAttribute[key])
         })
       }else {
         set(item,'display','none')
       }
    }
    return objectList
  },
  async arrayDocumentToNote({array}: {array: any[]}){
    return await Promise.all(array.map(
      async document => {
        document.name = JSON.parse(document.name)
        return await documentToNote({ document })
      })
    )
  },
  async formatIndexRecommendList({objectList,orderStatusTemp,recommendationStatusTemp}: {objectList: any[],orderStatusTemp: any[],recommendationStatusTemp: any[]}){
    for (const item of objectList) {
        async function _formatOrderList({idList}: {idList: any[]}){
        if ( isArray(idList) && idList.every(i => typeof i=== 'string')) {
          const { data } =
          await store.level2SDK.documentServices.retrieveDocument({
            idList,
            options: {
              maxcount: -1
            }
          })   
          const orderList = await Promise.all(
            data.document.map(
              async (doc) =>
                await documentToNote({
                  document: replaceUint8ArrayWithBase64(doc),
                }),
            ),
          )
          return orderList.map(item=>({
            orderNumber: get(item,'name.orderNumber') ,
            tage: get(item,'tage'),
            orderTime: get(item,'ctime')
          }))
        }
        }
        const { type } = item
        if (type === 204801) {
          let statusList
          let orderList = await _formatOrderList({idList: get(item,'orderList')}) as any[]         
          if (orderList && orderList.length !== 0) {
            statusList = orderStatusTemp.filter(status=> orderList.slice(-1)[0].tage.toString(2).split('').reverse()[status.bitPosition]==='1')
          } else if(orderList && orderList.length === 0) {
            statusList = recommendationStatusTemp.filter(status=> item.tage===status.tage)
          } else {
            statusList = [{
              display: "none"
            }]
          }
          const {bitPosition,tage,...statusAttribute} = statusList.slice(-1)[0]
          Object.keys(statusAttribute).forEach(key=>{
            set(item,key,statusAttribute[key])
          })

        }else {
          set(item,'display','none')
        }
    }
    return objectList
  },
  // async updateFamilyAccount(){
  //   const accounts = [
        
  //   ]
  //   for(let i=0;i<accounts.length;i++){
  //     const accountId = accounts[i]
  //     const edge1100 = await store.level2SDK.edgeServices.retrieveEdge({
  //       idList: [accountId],
  //       options: {
  //         xfname: "evid",
  //         type: 1100
  //       }
  //     })
  //     if(edge1100.data.edge.length > 0){
  //       const connectEdge = edge1100.data.edge[0]
  //       const bvid = store.level2SDK.utilServices.uint8ArrayToBase64(connectEdge?.bvid)
  //       //change jwt to location
  //       await store.level2SDK.edgeServices.createEdge({
  //         bvid: bvid,
  //         type: 1030,
  //       })

  //       const parentVertexResp = await store.level2SDK.vertexServices.retrieveVertex({
  //         idList: [bvid]
  //       })

  //       const parentVertex = replaceUint8ArrayWithBase64(parentVertexResp.data.vertex[0])
  //       log.debug(`test ${i}`,parentVertex)
  //       const rootNoteBookId = parentVertex.deat.rnb64ID

  //       const prHelpResp = await store.level2SDK.documentServices.retrieveDocument({
  //         idList: [rootNoteBookId],
  //         options:{
  //           xfname: 'eid',
  //           scondition: 'type in (1282,1283)'
  //         } 
  //       })
  //       const prHelp = prHelpResp.data.document
  //       if(prHelp.length>=2){
  //         let sesk
  //         let aesk
  //         prHelp.forEach(doc=>{
  //           if(doc?.name?.aesk){
  //             aesk = doc?.name?.aesk
  //           }else if(doc?.name?.sesk){
  //             sesk = doc?.name?.sesk
  //           }
  //         })
  //         if(aesk && sesk){
  //           const defaultSk = 'u2a6PMBLa5mIZGDppHY2TX52i7y8ifKJiYQ55lKuNEk='
  //           const randomKey = encryptionServices.decryptASK({eData: aesk,recvSk:defaultSk,sendPk:parentVertex.pk})
  //           const sk = encryptionServices.decryptAES({key: randomKey,message: sesk})
  //           const pk = parentVertex.pk
  //           const jwt = localStorage.getItem('jwt')
  //           jwt && localStorage.setItem('vcjwt',jwt)
  //           const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: sk})
  //           const secretKeyUInt8Array = store.level2SDK.utilServices.normalizeStringTo32BitArray(password)
  //           const encryptedDataUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
  //           const esk = store.level2SDK.utilServices.sKeyEncrypt(
  //             secretKeyUInt8Array,
  //             encryptedDataUInt8Array,
  //           )
  //           const familyResp = await store.level2SDK.vertexServices.retrieveVertex({
  //             idList: [accountId],
  //           })
  //           const familyVertex = replaceUint8ArrayWithBase64(familyResp.data.vertex[0])
  //           const phone = parentVertex.name.phoneNumber?parentVertex.name.uid: ''
  //           if (esk instanceof Uint8Array && phone) {
  //             const pkOfUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
  //             const { data } = await store.level2SDK.vertexServices.updateVertex({
  //               ...familyVertex,
  //               id: familyVertex.id,
  //               pk: pkOfUint8Array,
  //               esk: esk,
  //               uid: `${phone}-${customAlphabet('123456789', 2)()}`
  //             })

  //           }

  //         }
  //       }
  //     }

  //   }
  // },
  /**
   * Updates a patient profile document.
   * @param {Object} params - The parameters for updating the patient profile.
   * @param {string} params.patProfileDocId - The ID of the patient profile document.
   * @param {Object} params.newPatProfile - The new patient profile.
   * @returns {Promise<string>} - The updated document in base64 format.
   */
  async updatePatProfile({patProfileDocId,newPatProfile}: {patProfileDocId: string,newPatProfile: object}) {
      const resp = await retrieveDocument(patProfileDocId)
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      const note = await documentToNote({ document })      
      const doc = await Document.update(patProfileDocId, {
        edge_id: get(note,"eid"),
        content: newPatProfile,
        atimes: -10,
        type: get(note,"type"),
        reid: get(note,"esig"),
        fid: get(note,"fid"),
        tage: get(note,"tage"),
        mediaType: get(note,"name.type"),
      })
      return replaceUint8ArrayWithBase64(doc['doc'])
  },
  /**
   * Retrieves insurance documents based on the provided parameters.
   *
   * @param {Object} options - The options object.
   *   @param {string[]} options.nonceList - The list of nonces.
   *   @param {string} options.patientBsig - The patient BSIG.
   *   @param {string} options.facilityBsig - The facility BSIG.
   *   @param {string} options.patientRootNotebookID - The patient root notebook ID.
   *   @param {string} options.patientProfileId - The patient profile ID.
   *   @param {string[]} options.reomveAttribute - The list of attributes to remove.
   * @return {Object} - An object containing the newInsuranceList, updateInsuranceList, and status.
   */
  async queryInsuranceByNonce({nonceList,patientBsig,facilityBsig,patientRootNotebookID,patientProfileId,reomveAttribute,queryAll= false,profile10002Id, roomEdgeID}: {nonceList: string [],patientBsig:string,facilityBsig: string,patientRootNotebookID:string,patientProfileId: string,reomveAttribute:string[],queryAll: boolean,profile10002Id:string,roomEdgeID:string}){
    /* queryAll=>false查询给定nonceList 10002下的Insurance  queryAll=>true 查询10002下的所有Insurance*/
    console.log('aaaa')
    // 获取 自己和 诊所之间的边下面的 insurance（诊所的insurance）
    // 如果queryall 给 了 false ，则只查询制定的几个 insurance
    let { data: insuranceTargetData } = queryAll ? await store.level2SDK.documentServices.retrieveDocument({
      idList: [
        profile10002Id,
      ],
      options: {
        type: 148481,
        xfname: "reid",
        obfname: "mtime"
      }
    })  : 
    await store.level2SDK.documentServices.retrieveDocument({
      idList: [
      ],
      options: {
        ObjType: 28,
        xfname: "none",
        type: 148481,
        sfname: "{\"join\":\"INNER JOIN Edge E ON D.eid=E.id\",\"result\":\"D.*\"}",
        obfname: "D.mtime",
        scondition: `(E.type = 10002) AND JSON_EXTRACT(D.name,\"$.nonce\") IN (\"${nonceList.map(str => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).join('","')}\")`,
      }
    })  

    // ? 获取对照保险数据 预约中 对照的保险数据来源于100002下所有的insurance 会议中来源于financial nonce 下10000的insurance
    const docTargetList =  await Promise.all(
      insuranceTargetData.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    ) 
    log.debug('%c 诊所下面的保险，或者所有的目标保险','background:red;color:#fff;font-size:2em;',docTargetList);
    // ? 预约 取10000下的所有保险与10002下的保险做对比 
    // ? 会议 取会议上share的最新保险与financial中选择的nonce insurance做对比
    const { data: insuranceSourceData } =
    queryAll ? await store.level2SDK.documentServices.retrieveDocument({
      idList: [
        patientRootNotebookID,
        patientProfileId
      ],
      options: {
        xfname: "eid,fid",
        type: 148481,
        obfname: "mtime",
      }
    })  : await store.level2SDK.documentServices.retrieveDocument({
      idList: [
        // ? 会议id
        roomEdgeID
      ],
      options: {
        xfname: "eid",
        type: 148481,
        obfname: "mtime",
      }
    }) 
    const docSourceList = await Promise.all(
      insuranceSourceData.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    )
    log.debug(
      '%c 自己的 10000 下面的保险',
      'background:red;color:#fff;font-size:2em;',
      docSourceList,
    )
    let newInsuranceList: object[] = [] 
    let updateInsuranceList: object[] = []
    let deleteInsuranceList: object[] = []
    let status: boolean 
    //  处理 两种情况
    // 1. 本地有，远程也有，但是远程和本地不一样
    // 2. 本地没有，远程有 
    for (const item of docTargetList) {
      // ? 过滤出双方都存在的保险
      const filterOldInsuranceList = Array.from(docSourceList).filter(i=>get(i,'name.nonce') === get(item,'name.nonce'))
      if (filterOldInsuranceList.length) {
        const result: any = {
          data: {}
        }

        const formatOldObject = formatInsuranceList([filterOldInsuranceList[0]],false)[0]
        const oldObject = formatOldObject?.content
        const newObject = formatInsuranceList([item],false)[0]?.content
        const tage = formatOldObject?.tage
        let matchingKey 
        switch (tage) {
          case 0:
            matchingKey = medicalInsuranceKey
            break;
          case 2:
            matchingKey = workersCompKey
            break; 
          case 4:
            matchingKey = personInjuryKey
            break;   
          default:
            matchingKey = medicalInsuranceKey
            break;
        }
        detailDiffObject(result.data,oldObject,newObject)
        const cloneObject = cloneDeep(result.data)
        const data =  removeDiffKeys(cloneObject,[
           'line',
           'secondLine',
           'city',
           'county',
           'state',
           'zipCode',
           'claimsLine',
           'claimsSecondLine',
           'claimsCity',
           'claimsCounty',
           'claimsState',
           'claimsZipCode',
           'insuranceLine',
           'insuranceSecondLine',
           'insuranceCity',
           'insuranceCounty',
           'insuranceState',
           'insuranceZipCode',
           'attorneyLine',
           'attorneySecondLine',
           'attorneyCity',
           'attorneyCounty',
           'attorneyState',
           'attorneyZipCode',
        ])    
        const diffFormatListCopy = orderBy(formatDetailDiff(data, matchingKey), ['key'], ['asc'])
        const diffFormatList = []
        diffFormatListCopy.forEach(item => {
          // @ts-ignore
          if (item.value._detail._new) {
            diffFormatList.push(item)
          }
        })
        if (diffFormatList.length) {
          updateInsuranceList.push({
            newInsuranceDoc: queryAll ? item : filterOldInsuranceList[0],
            oldInsuranceDoc: queryAll ? filterOldInsuranceList[0]: item,
            updateInsuranceFormat: diffFormatList,
          })
        }
      }else {
        newInsuranceList.push(item)
      }
    }


    // ? 过滤出10000存在 10002下不存在的保险

    if (queryAll) {
      // 不知道是不是被删除的
      // for (const insurance of docSourceList) {
      //   const delete10002InsuranceList = Array.from(docTargetList).filter(i=>get(i,'name.nonce') === get(insurance,'name.nonce'))  
      //   if (!delete10002InsuranceList.length) {
      //     deleteInsuranceList.push(insurance)
      //   }
      // }
    } else {
      // ? 若会议上有新的保险 本地10000下没有对应的保险 则为新增的保险
      for (const insurance of docSourceList) {
        const filterOldInsuranceList = Array.from(docTargetList).filter(i=>get(i,'name.nonce') === get(insurance,'name.nonce'))  
        if (!filterOldInsuranceList.length && nonceList.includes(get(insurance,'name.nonce'))) {
          newInsuranceList.push(insurance)
        }
      }
    }
    status = queryAll ? !(newInsuranceList.length === 0 && updateInsuranceList.length === 0 && deleteInsuranceList.length ===0) :  !(newInsuranceList.length === 0 && updateInsuranceList.length === 0)
    return {
      newInsuranceList,
      updateInsuranceList,
      deleteInsuranceList,
      status
    }
  },

  async adminDiffInsurance({
    nonceList,
    patdProfileId,
    facilityBsig,
    patientBsig,
    patientRootNotebookID,
    removeAttribute,
    roomEdgeID
  }:
    {
      nonceList: string[],
      patdProfileId: string,
      facilityBsig: string,
      patientBsig: string,
      patientRootNotebookID: string,
      removeAttribute: string[],
      roomEdgeID: string
    }) {
    // 1.获取10002 上面的insurance list,包括已经删除的
    const { data: insurance10002Data } =
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [
          patdProfileId
        ],
        options: {
          ObjType: 28,
          xfname: "D2.id",
          sfname: "{\"result\":\"D.*\", \"join\": \"INNER JOIN Doc D2 on D.reid = D2.id\"}",
          scondition: "D.type in (148481, -148481) AND D2.type=102401",
          obfname: "D.mtime"
        }
      })
    const targetList = await Promise.all(
      insurance10002Data.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    )
    // 3. 会议中shareinsurance
    const { data: insuranceSourceData } =
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [
          roomEdgeID
        ],
        options: {
          xfname: "eid",
          type: 148481,
          obfname: "mtime",
          scondition: `JSON_EXTRACT(name,\"$.nonce\") IN (\"${nonceList.map(str => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).join('","')}\")`,
        }
      })
    const docSourceList = await Promise.all(
      insuranceSourceData.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    )
    // 4.做对比
    let newInsuranceList: object[] = []
    let deleteInsuranceList: object[] = []
    let updateInsuranceList: object[] = []
    let status: boolean
    for (const item of docSourceList) {
      const filterList = Array.from(targetList).filter(i => get(i, 'name.nonce') === get(item, 'name.nonce'))
      if (filterList.length) {
        const result: any = {
          data: {}
        }
        if (filterList[0].type === -148481) {
          deleteInsuranceList.push(item)
        } else {
          const formatOldObject = formatInsuranceList([filterList[0]], false)[0]
          const oldObject = formatOldObject?.content
          const newObject = formatInsuranceList([item], false)[0]?.content
          const tage = formatOldObject?.tage
          let matchingKey
          switch (tage) {
            case 0:
              matchingKey = medicalInsuranceKey
              break;
            case 2:
              matchingKey = workersCompKey
              break;
            case 4:
              matchingKey = personInjuryKey
              break;
            default:
              matchingKey = medicalInsuranceKey
              break;
          }
          detailDiffObject(result.data, oldObject, newObject)
          const cloneObject = cloneDeep(result.data)
          const data = removeDiffKeys(cloneObject, [
            'line',
            'secondLine',
            'city',
            'county',
            'state',
            'zipCode',
            'claimsLine',
            'claimsSecondLine',
            'claimsCity',
            'claimsCounty',
            'claimsState',
            'claimsZipCode',
            'insuranceLine',
            'insuranceSecondLine',
            'insuranceCity',
            'insuranceCounty',
            'insuranceState',
            'insuranceZipCode',
            'attorneyLine',
            'attorneySecondLine',
            'attorneyCity',
            'attorneyCounty',
            'attorneyState',
            'attorneyZipCode',
          ])
          const diffFormatList = orderBy(formatDetailDiff(data, matchingKey), ['key'], ['asc'])
          if (diffFormatList.length) {
            updateInsuranceList.push({
              newInsuranceDoc: item,
              oldInsuranceDoc: filterList[0],
              updateInsuranceFormat: diffFormatList
            })
          }

        }
      } else {
        newInsuranceList.push(item)
      }
    }
    status = !(newInsuranceList.length === 0 && updateInsuranceList.length === 0 && deleteInsuranceList.length === 0)
    return {
      newInsuranceList,
      updateInsuranceList,
      deleteInsuranceList,
      status
    }
  },
  /**
   * Creates insurance records for the given insurance list.
   *
   * @param {any[]} formatInsuranceList - The list of insurance items to be formatted.
   * @param {string} patientRootNotebookID - The ID of the patient's root notebook.
   * @param {string} fid - The ID of the insurance record.
   * @return {Promise<void>} A promise that resolves when all the insurance records are created.
   */
  async createInsurance({formatInsuranceList,patientRootNotebookID,fid}: {formatInsuranceList: any[],patientRootNotebookID:string,fid:string}){
    for (const item of formatInsuranceList) {
       const {content,nonce,tage} = addressTransformInsuranceList([item],true)[0] 
       await Document.create({
        atimes: -10,
        content,
        paymentNonce: nonce,
        type: 148481,
        edge_id: patientRootNotebookID,
        mediaType: 'application/json',
        tage,
        fid
      }) 
    }
  },
  async adminCreateInsurance({formatInsuranceList,eid,reid}: {formatInsuranceList: any[],eid:string,reid:string}){
    for (const item of formatInsuranceList) {
       const {content,nonce,tage} = addressTransformInsuranceList([item],true)[0]
       await Document.create({
        atimes: -10,
        content,
        paymentNonce: nonce,
        type: 148481,
        edge_id: eid,
        mediaType: 'application/json',
        tage,
        reid
      }) 
    }
  },
  /**
   * Updates the insurance information.
   *
   * @param {Object} updateInsuranceList - The list of insurance items to update.
   * @param {Array} updateInsuranceList.updateInsuranceList - The array of insurance items to update.
   * @param {Object} updateInsuranceList.updateInsuranceList[].newInsuranceDoc - The new insurance document.
   * @param {Object} updateInsuranceList.updateInsuranceList[].oldInsuranceDoc - The old insurance document.
   * @return {Promise<void>} A promise that resolves when the update is complete.
   */
  async updateInsurance({updateInsuranceList}: {updateInsuranceList: any[]}) {
    for (const item of updateInsuranceList) {
      const { newInsuranceDoc, oldInsuranceDoc } = item 
      console.log('newInsuranceDoc', newInsuranceDoc)
      console.log('oldInsuranceDoc', oldInsuranceDoc)
      const content = get(addressTransformInsuranceList([newInsuranceDoc], false)[0], 'name.data')    
      console.log('content', content)
      await Document.update(oldInsuranceDoc?.id, {
        aitmes: -10,
        edge_id: oldInsuranceDoc.eid,
        content: content,
        type: oldInsuranceDoc.type,
        title: oldInsuranceDoc?.name?.title,
        tage: oldInsuranceDoc?.tage,
        mediaType: 'application/json',
        dTypeProps: oldInsuranceDoc?.subtype,
        paymentNonce: oldInsuranceDoc?.name.nonce,
        fid: oldInsuranceDoc.fid,
      })
    }
  
  },
  async adminUpdateInsurance({updateInsuranceList}: {updateInsuranceList: any[]}) {
    for (const item of updateInsuranceList) {
      const {newInsuranceDoc,oldInsuranceDoc} = item 
      // rui 2/22/2024修改 问题：40000的insurance没有更新到10002
      const content = get(addressTransformInsuranceList([newInsuranceDoc],false)[0],'name.data')    
      await Document.update(oldInsuranceDoc?.id, {
        aitmes: -10,
        edge_id: oldInsuranceDoc.eid,
        content: content,
        type: oldInsuranceDoc.type,
        title: oldInsuranceDoc?.name?.title,
        tage: oldInsuranceDoc?.tage,
        mediaType: 'application/json',
        dTypeProps: oldInsuranceDoc?.subtype,
        paymentNonce: oldInsuranceDoc?.name.nonce,
        reid: oldInsuranceDoc.reid,
      })
    }
  
  },
  async deleteInsurance({deleteInsuranceList}: {deleteInsuranceList: any[]}){ 
    for (const item of deleteInsuranceList) {
      item.id &&  await store.level2SDK.commonServices.deleteRequest([item.id])
    }
  },
  adminBugFeedback({ feedbackObj,  } : { feedbackObj: {} }){
    const curPageInfo = get(window,`app.root.${window['app'].initPage}`)
    const globalInfo = JSON.parse(localStorage.getItem('Global') as string)
    const needPageInfo = {
      title: (curPageInfo as any).title,
      formData: (curPageInfo as any).formData,
      apiRequest: (curPageInfo as any).apiRequest,
      global: {
        financialUpdate: get(globalInfo,"formData.financialUpdate"),
        appointmentInfo: get(globalInfo,"formData.appointmentInfo"),
        appData: get(globalInfo,"formData.appData"),
        patientInfo: get(globalInfo,"formData.patientInfo"),
        curAppointment: get(globalInfo,"formData.appointment")
      }
    }
    adminBugLog({
      feedback: get(feedbackObj,"feedback", ''),
      currentUserId: localStorage.getItem('user_vid')?.toString() || "",
      pageInfo: JSON.stringify(needPageInfo),
      other: {
        facilityId: localStorage.getItem('facility_vid')?.toString() || "",
        imgIdList: get(feedbackObj, "photosId"),
        pageName: window['app'].initPage
      }
    }) 
  },
  async removeProcedureCodeToDefault({
    isDelete,
    procedureCodeId,
    deleteCategoryId,
    defaultCategoryId
  }: {
    isDelete: boolean,
    procedureCodeId: string,
    deleteCategoryId: string,
    defaultCategoryId: string
  }) {
  // isDelete true : 表示将所删除的categroy下的所有procedureCode 移动到default文件夹下
  if(isDelete){
    const { data: procedureCodeData } =
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [
          deleteCategoryId
        ],
        options: {
          xfname: "reid",
          scondition: "type in (309760,312320)",
          obfname: "D.mtime"
        }
      })
    
    const procedureCodeList = await Promise.all(
      procedureCodeData.document.map(
        async (doc) =>
          await documentToNote({
            document: replaceUint8ArrayWithBase64(doc),
          }),
      ),
    )
    for (const item of procedureCodeList) {
      const resp = await Document.update(get(item,"id"), {
        aitmes: -10,
        edge_id: get(item,"eid"),
        content: get(item,"name.data"),
        type: get(item,"type"),
        title: get(item,"title"),
        tage: get(item,"tage"),
        mediaType: 'application/json',
        reid: defaultCategoryId,
        esig: defaultCategoryId
      })
    }
  }else{
    // isDedelete false : 判断当前ProcedureCode的esig是否为空 或者指向已经删除的category 是的话则更新该code
    const resp = await retrieveDocument(procedureCodeId)
    const procedureDoc = await documentToNote({
      document: replaceUint8ArrayWithBase64(resp?.data?.document[0]),
    })
    let categoryId = procedureDoc?.esig
    if(categoryId !== ''){
        const categoryData = await retrieveDocument(categoryId)

        const categoryResp = categoryData?.data?.document[0]

        const categoryDoc = await documentToNote({
          document: replaceUint8ArrayWithBase64(categoryResp),
        })

        if(categoryDoc.type < 0){
          const updateResp =  await Document.update(get(procedureDoc,"id"), {
                              aitmes: -10,
                              edge_id: get(procedureDoc,"eid"),
                              content: get(procedureDoc,"name.data"),
                              type: get(procedureDoc,"type"),
                              title: get(procedureDoc,"title"),
                              tage: get(procedureDoc,"tage"),
                              mediaType: 'application/json',
                              reid: defaultCategoryId,
                              esig: defaultCategoryId
          })
          return replaceUint8ArrayWithBase64(updateResp?.doc)
          
        }else{
          return procedureDoc
        }
    }else{ 
      const updateResp =  await Document.update(get(procedureDoc,"id"), {
        aitmes: -10,
        edge_id: get(procedureDoc,"eid"),
        content: get(procedureDoc,"name.data"),
        type: get(procedureDoc,"type"),
        title: get(procedureDoc,"title"),
        tage: get(procedureDoc,"tage"),
        mediaType: 'application/json',
        reid: defaultCategoryId,
        esig: defaultCategoryId
        })
        return replaceUint8ArrayWithBase64(updateResp?.doc)
        
    }
  }
  },
  async claimsFromInvoice({ facilityId }:{ facilityId: string[] }) {
    // 查询通过invoice创建的claims
    const { data: claimArray } = 
      await store.level2SDK.documentServices.retrieveDocument({
        idList: facilityId,
        options: {
          ObjType: 28,
          xfname: "E2.Bvid",
          sfname: "{\"join\":\"INNER JOIN Edge E on E.id = D.reid INNER JOIN Edge E2 on E2.id = E.refid INNER JOIN Doc D2 on D2.reid = E.id\",\"result\":\"D.*\"}",
          scondition: "E2.type=40000 AND E.subtype&0xff in (6,11,15,17)  AND D.type=253441 AND D2.type=179201",
          obfname: "D.ctime",
          // maxcount: 500,
          asc: false
        }
      })
  const claimList = await Promise.all(
    claimArray.document.map(
      async (doc) =>
        await documentToNote({
          document: replaceUint8ArrayWithBase64(doc),
        }),
    ),
  ) 
  // 定义函数 更新claim 列表
  function updateClaimsArr({ 
    arr,
    adjustment,
    adjustType,
  }: { 
    arr: {}[],
    adjustment: number,
    adjustType: string 
  }){
    if(adjustType === 'Amount'){
        let arrLength = arr.length 
        let average = adjustment/arrLength 
        let newArrTemp = arr 
        let isAssign = false
        let hasAssigned = 0
        let remainAdjust = adjustment
        do{
            for(let l = 0; l < newArrTemp.length; l++){
                if(newArrTemp[l]['billBalance'] <= average) {
                    newArrTemp[l]['adjustment'] = Number(newArrTemp[l]['amountBilled']) + Number(newArrTemp[l]['adjustment'])
                    newArrTemp[l]['billBalance'] = Number(newArrTemp[l]['amountBilled']) - Number(newArrTemp[l]['adjustment'])
                    hasAssigned = Number(newArrTemp[l]['adjustment']) + hasAssigned
                }else{
                        newArrTemp[l]['adjustment'] = Number(newArrTemp[l]['adjustment']) + average
                        newArrTemp[l]['billBalance'] = Number(newArrTemp[l]['amountBilled']) - Number(newArrTemp[l]['adjustment'])
                        hasAssigned = hasAssigned + Number(newArrTemp[l]['adjustment'])
                    }
                for(let m=0; m < arr.length; m++){
                    if(arr[m]['hashCode'] === newArrTemp[l]['hashCode']){
                        arr[m] = newArrTemp[l]
                    }
                }
            }
            if((adjustment-hasAssigned)<= 0){
                isAssign = true 
            } else {
                newArrTemp = newArrTemp.filter(item => Number(item['amountBilled']) > average)
                isAssign = false 
                remainAdjust = adjustment - hasAssigned
                average = remainAdjust/(newArrTemp.length)
            }
        } while (!isAssign)
        arr.forEach(item => {
            item['adjustment'] = (-(parseFloat(item['adjustment']))).toFixed(2)
            item['billBalance'] = (parseFloat(item['billBalance'])).toFixed(2)
        })
      }else{
        arr.forEach(item => {
          item['adjustment'] = (Number(item['amountBilled']) * adjustment * 0.01).toFixed(2)
          item['billBalance'] = (Number(item['amountBilled'])-item['adjustment']).toFixed(2)
          item['adjustment'] = (-(parseFloat(item['adjustment']))).toFixed(2)
          
      })
      }
    return arr 
  }
  // 遍历ClaimsList 
  for(let claim of claimList){
    // 查询当前claim对应的invoice
    const { data: invoiceDoc } = 
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [claim.esig],
        options: {
          ObjType: 28,
          xfname: "E.id",
          sfname: "{\"join\":\"INNER JOIN Edge E on E.id = D.reid \",\"result\":\"D.*\"}",
          scondition: "E.type=40000 AND E.subtype&0xff in (6,11,15,17) AND D.type=179201",
          maxcount: 1
        }
      })
    const invoiceData = await documentToNote({document: replaceUint8ArrayWithBase64(invoiceDoc.document[0])})

    // claim 内部procedure 价格跟claims 价格对不上的
    let codeTotalBill = 0.00
    for(const item of claim.name.data.firstApplied){
        codeTotalBill = parseFloat(codeTotalBill.toFixed(2)) + parseFloat(item['billBalance'])
      }
    if(codeTotalBill === Number(invoiceData.name.data.totalDue) && (claim.name.data.appliedAmount === '' || claim.name.data.appliedAmount == undefined || claim.name.data.appliedAmount === "0.00") && claim.name.data.patientPayment.patientPaymentApplied.length === 0){
        let adjustment: number
        let newArr: {}[] = []
        let isUpdateClaim = false
        if (invoiceData.name.data.discountType === 'Amount' && invoiceData.name.data.discountAmount !== ''){
            // 3. invoice 通过amount进行折扣
            adjustment = Number(invoiceData.name.data.discountAmount)
            newArr = claim.name.data.firstApplied
            newArr = updateClaimsArr({arr: newArr, adjustment: adjustment,adjustType: 'Amount'})
            // 4. 更新Claim amountBill/adjustment/claimBalance
            claim.name.data.amountBill = parseFloat(invoiceData.name.data.totalDue).toFixed(2)
            claim.name.data.adjustment = (-adjustment).toFixed(2)
            claim.name.data.claimBalance = (Number(invoiceData.name.data.totalDue) - adjustment).toFixed(2)
            isUpdateClaim = true
        } else if(invoiceData.name.data.discountType === 'Percentage' && invoiceData.name.data.discountPercentage){
            // 3. invoice 通过percentage进行折扣
            newArr = claim.name.data.firstApplied
            adjustment = Number(invoiceData.name.data.discountPercentage)
            newArr = updateClaimsArr({arr: newArr, adjustment: adjustment,adjustType: 'Percentage'})
            // 4. 更新Claim amountBill/adjustment/claimBalance
            claim.name.data.amountBill = parseFloat(invoiceData.name.data.totalDue).toFixed(2)
            claim.name.data.adjustment = (-(claim.name.data.amountBill*adjustment*0.01)).toFixed(2)
            claim.name.data.claimBalance = parseFloat(invoiceData.name.data.totalBalance).toFixed(2)
            isUpdateClaim = true
            }
        // 5. 更新Claim amountBill/adjustment/claimBalance
        if (isUpdateClaim) {
            claim.name.data.firstApplied = newArr
            claim.name.data.secondApplied = newArr
            claim.name.data.thirdApplied = newArr
            // totalApplied 不可以直接赋值
            for(let i=0; i < claim.name.data.totalApplied.length; i++){
              for(let k=0;k<newArr.length;k++){
                if(claim.name.data.totalApplied[i]['hashCode'] === newArr[k]['hashCode']){
                  claim.name.data.totalApplied[i]['adjustment'] = newArr[k]['adjustment']
                  claim.name.data.totalApplied[i]['billBalance'] = newArr[k]['billBalance']
                }
              }
            }
            console.log('%c Cadl update','background-color:pink;color: white;font-size: 40px', claim,invoiceData.name.data.discountType,invoiceData.name.data.totalBalance,invoiceData.name.data.adjustment)
            await Document.update(claim.id, {
              aitmes: -10,
              edge_id: claim.eid,
              content: claim.name.data,
              reid: claim.esig,
              type: claim.type,
              title: claim.title,
              tage: claim.tage,
            })
        }

    }



} 
}
}

