import AiTmedError from '../../common/AiTmedError'
import { retrieveEdge, retrieveAuthorizationEdge } from '../../common/retrieve'
import log from '../../utils/log'
import store from '../../common/store'
import { gzip, ungzip } from '../../utils'
import DType from '../../common/DType'
import {getHalfkey} from '../../../src/CADL/services/encrypt'
import * as DocumentTypes from './types'
import * as DocumentUtilsTypes from './utilsTypes'
import apiAxios from '../../axios/proxyAxios'
import * as u from '@jsmanifest/utils'

export const CONTENT_SIZE_LIMIT = 32768

/**
 *
 * @param data: Uint8Array | Blob
 * @param besak?: string | Uint8Array
 * @returns Promise<obj>
 * @returns obj.data: Uint8Array
 * @returns obj.isEncrypt: boolean
 */
export const produceEncryptData: DocumentUtilsTypes.ProduceEncryptData = async (
  _data,
  esak,
  publicKeyOfReceiver,
) => {
  // Make sure data is Uint8Array
  let data: Uint8Array =
      _data instanceof Blob
        ? await store.level2SDK.utilServices.blobToUint8Array(_data)
        : _data,
    isEncrypt = false
  if (typeof esak !== 'undefined' && esak !== '' && publicKeyOfReceiver) {
    /* Encryption */
    try {
      data = await store.level2SDK.commonServices.encryptData(
        esak,
        publicKeyOfReceiver,
        data,
      )
      isEncrypt = true
    } catch (error) {}
  }
  return { data, isEncrypt }
}
/**
 *
 * @param _data Uint8Array | Blob
 * @returns Promise<obj>
 * @returns obj.data: Uint8Array
 * @returns obj.isGzip: boolean
 */
export const produceGzipData: DocumentUtilsTypes.ProduceGzipData = async (
  _data,
  isZipped
) => {
  // Make sure data is Uint8Array
  let u8a =
    _data instanceof Blob
      ? await store.level2SDK.utilServices.blobToUint8Array(_data)
      : _data

  const data = gzip(u8a)
  return { data: isZipped ? data : u8a, isZipped }
}
/**
 * @param content: string | Blob
 * @param type: text/plain | application/json | text/html | text/markdown | image/* | application/pdf | video/* | string
 * @returns Blob
 */
export const contentToBlob: DocumentUtilsTypes.ContentToBlob = (
  content,
  type,
) => {
  /* Convert content to be blob */
  let blob
  if (typeof content === 'string') {
    blob = new Blob([content], { type })
  } else if (content instanceof Blob) {
    blob = content
  } else {
    try {
      const jsonStr = JSON.stringify(content)
      blob = new Blob([jsonStr], { type: 'application/json' })
    } catch (error) {
      throw new AiTmedError({
        name: 'NOTE_CONTENT_INVALID',
        message: (error instanceof Error ? error : new Error(String(error)))
          .message,
      })
    }
  }
  return blob
}
/**
 *
 * @param document: Doc
 * @param edge?: Edge
 * @returns Promise<Document>
 */
export const documentToNote: DocumentUtilsTypes.DocumentToNote = async ({
  document,
  _edge,
  esakOfCurrentUser,
}) => {
  !document && (document = {})
  const name: DocumentTypes.NoteDocumentName = document.name || {}
  const contentType = parseInt(name.type) === 0 ? 'text/plain' : name.type
  const deat: DocumentTypes.NoteDocumentDeat | null = document.deat
  let dataType: boolean = false;

  // DType
  const dType = new DType(document.subtype)
  // Get data
  let content: string | Blob | Record<any, any> | null = null,
    //@ts-ignore
    isBroken = false,
    //@ts-ignore
    error: AiTmedError | null = null
  try {
    let data: Uint8Array
    if (dType.isOnServer || document.type === 545281) {
      if (name.data !== undefined) {
        // Get from name.data
        dataType = Array.isArray(name.data);
        data = await store.level2SDK.utilServices.base64ToUint8Array(name.data)
      } else {
        throw new AiTmedError({
          name: 'UNKNOW_ERROR',
          message: 'name.data is undefined',
        })
      }
    } else {
      // Download from S3
      if (deat !== null && deat.url) {
        const response = await store.level2SDK.documentServices
          .downloadDocumentFromS3({ url: deat.url})
          .then(store.responseCatcher)
          .catch(store.errorCatcher)
        if (!response) throw 'no response'
        data = dType.isBinary
          ? (response.data as Uint8Array)
          : await store.level2SDK.utilServices.base64ToUint8Array(
              response.data as string,
            )
      } else {
        throw 'deat.url is missing'
      }
    }
    
    
    if (dType.isEncrypted) {
      // 解密文档
      /**
       * 1. 获取 halfkey ，
       * 1.1 获取用户所在的边，如果是40000，判断用户在40000还是10002 或者 1053
       * 1.2 获取用户的halfkey
       */
      const authEdgeResp = await retrieveAuthorizationEdge(document)
      const authEdge = authEdgeResp?.data?.edge?.length
        ? authEdgeResp.data.edge[0]
        : null
      // Validate Edge
      if (authEdge === null) {
        throw new AiTmedError({
          name: 'UNKNOW_ERROR',
          message: 'Document -> documentToNote -> retrieveEdge -> edge is null. The document dont have eid',
        })
      }
      // 获取到根边
      let rootEdge = authEdge
      // 考虑到participate 离开会议的情况
      if(authEdge.type === 1053 || authEdge.type == -1053) {
        // if 1053 get 40000 或者 10002
        const resp = await retrieveEdge(authEdge.refid)
        if(resp) {
          rootEdge = resp?.data?.edge?.[0]
        }
      }
      const currentUserId = localStorage.getItem('facility_vid')
        ? localStorage.getItem('facility_vid')
        : localStorage.getItem('user_vid')
      const halfkey = await getHalfkey(rootEdge,currentUserId)
      // data = await store.level2SDK.commonServices.decryptDoc(
      //   halfkey as Uint8Array,
      //   data,
      // ) 
      let dataDecrypt = await store.level2SDK.commonServices.decryptDoc(
        halfkey as Uint8Array,
        data,
      ) 
      const bchalf = rootEdge.name?.bc || null

      if (dataDecrypt == null && bchalf ) {
        //解密失败了 try again
        log.info(`dfail，try bchalf: ${store.level2SDK.utilServices.uint8ArrayToBase64(document.id)}`);
        for (let index = 0; index < bchalf.length; index++) {
          const element = bchalf[index];
          dataDecrypt = await store.level2SDK.commonServices.decryptDoc(
            store.level2SDK.utilServices.base64ToUint8Array(element),
            data,
          ) 
          if (dataDecrypt != null) {
            console.error(`try times: ${index}`)
            break
          }
        }
      }
      //如何解密失败,从远程拉去halfkey数据解密
      if(dataDecrypt === null){
        const halfkeyData = await apiAxios("proxy")({
          url: 'api/log/getHalfKeysByEid',
          method: 'post',
          data: {
            appointmentid: store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.eid?rootEdge.eid:rootEdge.id)
          },
        })
        if(halfkeyData.status === 200){
          const list = halfkeyData['data']['list']
          if(u.isArr(list) && list.length >0){
            log.error(store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.eid?rootEdge.eid:rootEdge.id))
            log.error(halfkeyData)
            for (let index = 0; index < list.length; index++) {
              const element = list[index];
              log.error(`dfail，try，eidhalfkey，docid：${store.level2SDK.utilServices.uint8ArrayToBase64(document.id)}，第${index}次`);
              log.error(data);
              log.error(`${element} --- ${store.level2SDK.utilServices.base64ToUint8Array(element)}`)
              dataDecrypt = await store.level2SDK.commonServices.decryptDoc(
                store.level2SDK.utilServices.base64ToUint8Array(element),
                data,
              ) 
              if (dataDecrypt != null) {
                log.error(`eidhalfkey success，element：${element}，docid：${store.level2SDK.utilServices.uint8ArrayToBase64(document.id)}，第${index}次`);
                log.error(dataDecrypt)
                break
              }
            }
          }
        }
      }
      // 如果仍然失败 尝试把halfkey清空掉 然后重新解密
      if(dataDecrypt === null){
        window['app']['root']['halfkeyCache'] = {}
        const halfkey = await getHalfkey(rootEdge,currentUserId) 
        dataDecrypt = await store.level2SDK.commonServices.decryptDoc(
          halfkey as Uint8Array,
          data,
        )
      }
      if (dataDecrypt == null) {
        // 如果 bchalf 也没有解密出来 返回的是 null ，则尝试用这个试试 不知道为什么会存在 没加密的情况
        log.error('all d fail');
        dataDecrypt = data
      }
      data = dataDecrypt 
    }
    // Ungzip
    if (dType.isZipped) data = ungzip(data)
    const blob = await store.level2SDK.utilServices.uint8ArrayToBlob(
      data,
      contentType,
    )
    if (/^text\//.test(blob.type)) {
      content = await new Response(blob).text()
    } else if (blob.type === 'application/json') {
      const jsonStr = await new Response(blob).text()
      if(typeof(jsonStr) === 'string'){
        try {
          content = JSON.parse(jsonStr)
        } catch (error) {
          log.error('json parse error')
          log.error(jsonStr)
          if (error instanceof SyntaxError) {
            try {
              content = JSON.parse(jsonStr.replace(/\\\\/g, '\\'))
            } catch (error) {
              content = jsonStr
            }
          }
          
        }
      }else{
        content = jsonStr
      }

    } else {
      content = blob
    }
  } catch (reason) {
    if (typeof reason === 'string') {
      error = new AiTmedError({
        name: 'DOWNLOAD_FROM_S3_FAIL',
        message: `Document -> documentToNote -> ${reason}`,
      })
    } else {
      // @ts-ignore
      error = reason
    }
    content = null
    isBroken = true
  }
  if (content instanceof Blob) {

    content = await store.level2SDK.utilServices.blobToBase64(content)

  }
  return {
    ...document,
    name: {
      ...name,
      title: name.title,
      nonce: name?.nonce,
      targetRoomName: name?.targetRoomName,
      user: name?.user,
      sesk: name?.sesk,
      notification: name?.notification,
      orderNumber: name?.orderNumber,
      vendorId: name?.vendorId,
      aesk: name?.aesk,
      type: contentType === 'text/plain' ? 'application/json' : contentType,
      // data: contentType === 'text/plain' ? { note: content } : content,
      data: dataType?[content]:content,
      tags: name.tags || [],
    },

    created_at: document.ctime * 1000,
    modified_at: document.mtime * 1000,
    subtype: {
      isOnServer: dType.isOnServer,
      isZipped: dType.isZipped,
      isBinary: dType.isBinary,
      isEncrypted: dType.isEncrypted,
      isEditable: dType.isEditable,
      applicationDataType: dType.dataType,
      notification: dType.notification,
      ringToneNotify: dType.ringToneNotify,
      sendtoSelf:dType.sendtoSelf,
      mediaType: dType.mediaType,
      size: document.size,
    },
  }
}

/**
 *
 * @param document: Doc
 * @param edge?: Edge
 * @returns Promise<Document>
 */
export const chatDocumentToNote: DocumentUtilsTypes.DocumentToNote = async ({
  document,
  _edge,
  esakOfCurrentUser,
  isToUrl=false
}) => {
  !document && (document = {})
  const name: DocumentTypes.NoteDocumentName = document.name || {}
  const contentType = parseInt(name.type) === 0 ? 'text/plain' : name.type
  const deat: DocumentTypes.NoteDocumentDeat | null = document.deat
  let dataType: boolean = false;

  // DType
  const dType = new DType(document.subtype)
  // Get data
  let content: string | Blob | Record<any, any> | null = null,
    //@ts-ignore
    isBroken = false,
    //@ts-ignore
    error: AiTmedError | null = null
  try {
    let data: Uint8Array
    if (dType.isOnServer) {
      if (name.data !== undefined) {
        // Get from name.data
        dataType = Array.isArray(name.data);
        data = await store.level2SDK.utilServices.base64ToUint8Array(name.data)
      } else {
        throw new AiTmedError({
          name: 'UNKNOW_ERROR',
          message: 'name.data is undefined',
        })
      }
    } else {
      // Download from S3
      if (deat !== null && (deat.url2 || deat.url)) {
        if(isToUrl && typeof Worker === 'function' && deat?.url2){
          const docId = store.level2SDK.utilServices.uint8ArrayToBase64(document.id)
          const blob = await imageParseOnWebWorker(docId,document.name.type,dType.isZipped,deat.url2)
          let url = ''
          if(blob instanceof Blob){
            url = URL.createObjectURL(blob)
          }
          return url
          
        }
        const response = await store.level2SDK.documentServices
          .downloadDocumentFromS3({ url: deat.url2 || deat.url })
          .then(store.responseCatcher)
          .catch(store.errorCatcher)
        if (!response) throw 'no response'


        data = dType.isBinary
          ? (response.data as Uint8Array)
          : await store.level2SDK.utilServices.base64ToUint8Array(
              response.data as string,
            )
      } else {
        throw 'deat.url is missing'
      }
    }
    

    // Ungzip
    if (dType.isZipped) data = ungzip(data)
    const blob = await store.level2SDK.utilServices.uint8ArrayToBlob(
      data,
      contentType,
    )

    if (/^text\//.test(blob.type)) {
      content = await new Response(blob).text()
    } else if (blob.type === 'application/json') {
      const jsonStr = await new Response(blob).text()
      try {
        content = JSON.parse(jsonStr)
      } catch (error) {
        content = jsonStr
      }
    } else {
      content = blob
    }
  } catch (reason) {
    if (typeof reason === 'string') {
      error = new AiTmedError({
        name: 'DOWNLOAD_FROM_S3_FAIL',
        message: `Document -> documentToNote -> ${reason}`,
      })
    } else {
      // @ts-ignore
      error = reason
    }
    content = null
    isBroken = true
  }


  if (content instanceof Blob && !isToUrl) {
    content = await store.level2SDK.utilServices.blobToBase64(content)
  }else if(content instanceof Blob && isToUrl){
    return URL.createObjectURL(content)
  }
  return {
    ...document,
    name: {
      ...name,
      title: name.title,
      nonce: name?.nonce,
      targetRoomName: name?.targetRoomName,
      user: name?.user,
      sesk: name?.sesk,
      notification: name?.notification,
      orderNumber: name?.orderNumber,
      vendorId: name?.vendorId,
      aesk: name?.aesk,
      type: contentType === 'text/plain' ? 'application/json' : contentType,
      // data: contentType === 'text/plain' ? { note: content } : content,
      data: dataType?[content]:content,
      tags: name.tags || [],
    },

    created_at: document.ctime * 1000,
    modified_at: document.mtime * 1000,
    subtype: {
      isOnServer: dType.isOnServer,
      isZipped: dType.isZipped,
      isBinary: dType.isBinary,
      isEncrypted: dType.isEncrypted,
      isEditable: dType.isEditable,
      applicationDataType: dType.dataType,
      notification: dType.notification,
      ringToneNotify: dType.ringToneNotify,
      sendtoSelf:dType.sendtoSelf,
      mediaType: dType.mediaType,
      size: document.size,
    },
  }
}


export default function imageParseOnWebWorker(id:string,type:string,isZipped:boolean, url:string,options?:object) {
  return new Promise((resolve, reject) => {
    const workerScriptURL = './image-load-sw.js'
    const worker = new Worker(workerScriptURL)

    function handler(e) {
      const {id:returnId,blob} = e.data
      if(id === returnId){
        resolve(blob)
        worker.terminate()
      }
    }

    worker.addEventListener('message', handler)
    worker.addEventListener('error', reject)

    worker.postMessage({
      id,
      type,
      isZipped,
      url,
    })
  })
}

