import * as u from '@jsmanifest/utils'
import store from '../../common/store'
import { retrieveEdge, retrieveDocument } from '../../common/retrieve'
import AiTmedError from '../../common/AiTmedError'
import DType from '../../common/DType'
import { UnableToLocateValue } from '../../errors'
import { getHalfkey,updateRootEdge } from '../../../src/CADL/services/encrypt'
import { getBit } from '../../common/DType'
import {
  CONTENT_SIZE_LIMIT,
  contentToBlob,
  documentToNote,
  produceEncryptData,
  produceGzipData,
} from './utils'
import isPopulated from '../../utils/isPopulated'
import type { CommonTypes } from '../../ecos'
import * as c from '../../constants'
import * as t from './types'
import { retrieveVertex } from '../../common/retrieve'
import { SEND_TEXT_MESSAGE } from '../../common/DType'
import imageCompression from 'browser-image-compression'
import log from '../../utils/log'
import ecosAxios from '../../axios/ecosAxios'
const edgeType = [40000,10002,10000,1053,10004]
/**
 * @param params
 * @param params.edge_id: string
 * @param params.title: string
 * @param params.content: string | Blob
 * @param params.type: 0 | 1 | 2 | 3 | 10 | 11 | 12
 * @param params.tags?: string[]
 * @param params.dataType?: number
 * @returns Promise<Document>
 */
export const create = async ({
  edge_id,
  title,
  tags = [],
  content,
  tage,
  type,
  user,
  sesk,
  aesk,
  targetRoomName,
  notification,
  fid,
  reid, // transform to esig in lvl2
  mediaType,
  dataType = 0,
  atimes,
  dTypeProps,
  paymentNonce,
  documentName,
  orderNumber,
  jwt,
  dispatch,
  vendorId
}: t.CreateDocumentParams) => {
  //check if eid has been dereferenced
  if (!isPopulated(edge_id)) {
    throw new UnableToLocateValue(`Missing reference ${edge_id}`)
  }

  const dType = new DType()
  dType.dataType =
    dTypeProps?.applicationDataType || dTypeProps?.dataType || dataType

  // Permission
  dType.isEditable = !!+dTypeProps?.isEditable || true

  // Content to Blob
  const blob = await contentToBlob(content, mediaType)
  dType.setMediaType(mediaType || blob.type)

  // Gzip
  const { data: gzipData, isZipped } = await produceGzipData(blob,dTypeProps?.isZipped)
  dType.isZipped = !!+dTypeProps?.isZipped || isZipped
  dType.notification = !!+dTypeProps?.notification
  dType.ringToneNotify = !!+dTypeProps?.ringToneNotify
  dType.sendtoSelf = !!+dTypeProps?.sendtoSelf
  dType.sendTextMessage = !!getBit(parseInt(JSON.stringify(dTypeProps)),SEND_TEXT_MESSAGE)

  // dType.isOnServer = !!+dTypeProps?.isOnServer || gzipData.length < CONTENT_SIZE_LIMIT

  // dType.isOnServer = !!+dTypeProps?.isOnServer || gzipData.length < CONTENT_SIZE_LIMIT
  if(typeof dTypeProps?.isOnServer === 'undefined'){
    dType.isOnServer = gzipData.length < CONTENT_SIZE_LIMIT
  }else{
    dType.isOnServer = !!+dTypeProps?.isOnServer && gzipData.length < CONTENT_SIZE_LIMIT
  }
    if (type == 435201 || type == 437761) {
    dType.isOnServer = false
    }
  // Encryption
  dType.isEncrypted = !!+dTypeProps?.isEncrypted
  //发送短信

  const currentUserId = u.isBrowser() ? (localStorage.getItem('facility_vid')
  ? localStorage.getItem('facility_vid')
  : localStorage.getItem('user_vid')) : ''
  // 如果做的是 related appt，type = 284160， 则需要更新40000
  if (type == 284160 ) {
    // 如果eid = reid 则相当于当前会议是一个根会议, 不需要做什么处理。
    // 如果不是根会议 则需要更新 新的 relatedapp的 beask 和 eesak
    // 这个文档的 reid 指向的是 根会议 eid指向的是当前会议
    // 1. 如果不存在fid 则说明，这个是一个根会议 不需要走下面流程
    // 2. 如果fid存在，则说明这不是一个根会议，则自己在 fid 所指向的 related doc 所指向的边上
    const respEdge = await retrieveEdge(edge_id)
    const edge = respEdge?.data?.edge?.[0] || null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })
    const currentUserSk = localStorage.getItem('facility_sk')?localStorage.getItem('facility_sk'):localStorage.getItem('sk')
    const currentUserPk = localStorage.getItem('facility_pk')?localStorage.getItem('facility_pk'):localStorage.getItem('pk')
    //如果 edge 已经有besak 则不需要重新生成
    if (!edge.besak) {
      if (fid) {
        const relatedTagResp = await retrieveDocument(fid)
        const relatedTagEid = relatedTagResp?.data?.document?.length ? relatedTagResp?.data?.document[0].eid : null
        // const currentRoo
        const resp = await retrieveEdge(relatedTagEid!)
        const rootAppt = resp?.data?.edge?.[0] || null
        let halfKey = await getHalfkey(rootAppt, currentUserId)
        // 2. 更新新的预约，也就是 eid 指向的边
        
        let skOfInviterToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
        let pkOfInviterToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserPk!)
        let repsV = await retrieveVertex(edge.evid)
        const evidVertex = repsV?.data?.vertex?.[0]
        let pkOfInviteeToUint8Array = evidVertex?.pk
        const besak = store.level2SDK.utilServices.aKeyEncrypt(
          pkOfInviterToUint8Array,
          skOfInviterToUint8Array,
          halfKey!
        )
        const eesak = store.level2SDK.utilServices.aKeyEncrypt(
          pkOfInviteeToUint8Array,
          skOfInviterToUint8Array,
          halfKey!
        )
        await store.level2SDK.edgeServices.updateEdge({
          id: edge_id,
          type: 40000,
          besak,
          eesak,
          name: edge.name,
        })
      } else {
        // 如果没有fid 说明是根会议，直接生成besak 和 eesak 来加密就可以 
        currentUserId && (await updateRootEdge(edge, currentUserPk!, currentUserSk!, currentUserId))
      }
    }
  }
  let returnDataInUint8Array = gzipData
  /**
   * BUG: 1100 10000 处理
   */
  
  if (dType.isEncrypted && type!= 284160) {
    const resp = await retrieveEdge(edge_id)
    const edge = resp?.data?.edge?.[0] || null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })
    const processedEdge = edgeType.indexOf(edge?.type)
    const isInviteEdge = edge?.type === 1053
    let halfKey: Uint8Array | null
    if (processedEdge!=-1) {
      let rootEdge = edge
      if (isInviteEdge) {
        const resp = await retrieveEdge(edge?.refid)
        rootEdge = resp?.data?.edge?.[0]
      }
      halfKey = await getHalfkey(rootEdge, currentUserId)
      if (halfKey) {
        const  data  = await store.level2SDK.commonServices.encryptDoc(
          halfKey,
          gzipData
        )
        returnDataInUint8Array = data
      } else {
        console.error('halfKey is null,  @chenchen.xu ');
        dType.isEncrypted = false
        returnDataInUint8Array = gzipData
      }
    }
    else {
      console.error('edge not encrypt,  @chenchen.xu ');
      returnDataInUint8Array = gzipData
    }
  }

  const bs64Data = store.level2SDK.utilServices.uint8ArrayToBase64(
    returnDataInUint8Array,
  )
  dType.isBinary = false
  
  const name: t.NoteDocumentName = {
    ...documentName,
    title,
    tags,
    type: blob.type,
  }
  orderNumber && (name.orderNumber = orderNumber)
  vendorId && (name.vendorId = vendorId)
  if (user) {
    name.user = user
  }
  if (targetRoomName) {
    name.targetRoomName = targetRoomName
  }
  if (sesk) {
    name.sesk = sesk
  }
  if (aesk) {
    name.aesk = aesk
  }

  // data must be base64 in name field
  if (dType.isOnServer) {
    name.data = bs64Data
  } else {
    name.data = undefined
  }
  if (paymentNonce) {
    name.nonce = paymentNonce
  }
  if (notification) {
    name.notification = notification
  }
  const response = await store.level2SDK.documentServices
    .createDocument({
      eid: edge_id,
      eSig: reid, // transform to esig in lvl2
      type,
      subtype: dType.value,
      name,
      tage,
      atimes,
      size: blob.size,
      fid,
      jwt,
    })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
  if (!response || !response.data) {
    throw new AiTmedError({
      name: 'UNKNOW_ERROR',
      message: 'Document -> create -> createDocument -> no response',
    })
  }
  const document: CommonTypes.Doc = response.data?.document
  if (!document) return response
  const { deat } = document

  if (!dType.isOnServer && deat !== null && deat && deat.url && deat.sig) {
    await store.level2SDK.documentServices
      .uploadDocumentToS3({ url: deat.url, sig: deat.sig, data: bs64Data })
      .then(store.responseCatcher)
      .catch(store.errorCatcher)
  }
  //TODO: convert document type to be read like documentToNote
  //type has to be converted in order to use filter
  if (dispatch) {
    await dispatch({
      type: c.dispatchActionType.INSERT_TO_OBJECT_TABLE,
      payload: { doc: document },
    })
  }
  const note = await documentToNote({ document })
  // createdoc id-obj update
  return {
    jwt: response?.data?.jwt,
    error: response?.data?.error,
    doc: note,
    code: response?.data?.code,
  }
}


/**
 * @param params
 * @param params.edge_id: string
 * @param params.title: string
 * @param params.content: string | Blob
 * @param params.type: 0 | 1 | 2 | 3 | 10 | 11 | 12
 * @param params.tags?: string[]
 * @param params.dataType?: number
 * @returns Promise<Document>
 */
export const createChatImage = async ({
  edge_id,
  title,
  tags = [],
  content,
  tage,
  type,
  user,
  sesk,
  aesk,
  targetRoomName,
  notification,
  fid,
  reid, // transform to esig in lvl2
  mediaType,
  dataType = 0,
  atimes,
  dTypeProps,
  paymentNonce,
  documentName,
  orderNumber,
  jwt,
  dispatch,
  vendorId
}: t.CreateDocumentParams) => {
  //check if eid has been dereferenced
  if (!isPopulated(edge_id)) {
    throw new UnableToLocateValue(`Missing reference ${edge_id}`)
  }
  const compressOptions = {
    maxSizeMB: 0.064,
    maxWidthOrHeight:480,
    useWebWorker: false,
  }


  const resp = await retrieveEdge(edge_id)
  const edge = resp?.data?.edge?.[0] || null
  
  if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })
  const dType = new DType()
  dType.dataType =
    dTypeProps?.applicationDataType || dTypeProps?.dataType || dataType

  // Permission
  dType.isEditable = !!+dTypeProps?.isEditable || true

  // Content to Blob
  let compressedFile
  if(content instanceof File){
    compressedFile = await imageCompression(content, compressOptions);
  }
  
  const blob = await contentToBlob(content, mediaType)
  const compressedBlob = await contentToBlob(compressedFile, mediaType)
  dType.setMediaType(mediaType || blob.type)

  // Gzip
  const { data: gzipData, isZipped } = await produceGzipData(blob,dTypeProps?.isZipped)
  const { data: compressedData, isZipped: _isZipped } = await produceGzipData(compressedBlob,dTypeProps?.isZipped)
  dType.isZipped = !!+dTypeProps?.isZipped || isZipped
  dType.notification = !!+dTypeProps?.notification
  dType.ringToneNotify = !!+dTypeProps?.ringToneNotify
  dType.sendtoSelf = !!+dTypeProps?.sendtoSelf
  dType.sendTextMessage = !!getBit(parseInt(JSON.stringify(dTypeProps)),SEND_TEXT_MESSAGE)

  dType.isOnServer = !!+dTypeProps?.isOnServer? gzipData.length < CONTENT_SIZE_LIMIT : !!+dTypeProps?.isOnServer

  // Encryption
  dType.isEncrypted = !!+dTypeProps?.isEncrypted
  //发送短信


  let returnDataInUint8Array = gzipData
  /**
   * BUG: 1100 10000 处理
   */
  
  const bs64Data = store.level2SDK.utilServices.uint8ArrayToBase64(
    returnDataInUint8Array,
  )

  const compressedBs64Data = store.level2SDK.utilServices.uint8ArrayToBase64(
    compressedData,
  )
  dType.isBinary = false
  
  const name: t.NoteDocumentName = {
    ...documentName,
    title,
    tags,
    type: blob.type,
  }
  orderNumber && (name.orderNumber = orderNumber)
  vendorId && (name.vendorId = vendorId)
  if (user) {
    name.user = user
  }
  if (targetRoomName) {
    name.targetRoomName = targetRoomName
  }
  if (sesk) {
    name.sesk = sesk
  }
  if (aesk) {
    name.aesk = aesk
  }

  // data must be base64 in name field
  if (dType.isOnServer) {
    name.data = bs64Data
  }else{
    name.data = undefined
  }
  if (paymentNonce) {
    name.nonce = paymentNonce
  }
  if (notification) {
    name.notification = notification
  }
  const response = await store.level2SDK.documentServices
    .createDocument({
      eid: edge.eid,
      eSig: reid, // transform to esig in lvl2
      type,
      subtype: dType.value,
      name,
      tage,
      atimes,
      size: blob.size,
      fid,
      jwt,
    })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
  if (!response || !response.data) {
    throw new AiTmedError({
      name: 'UNKNOW_ERROR',
      message: 'Document -> create -> createDocument -> no response',
    })
  }
  const document: CommonTypes.Doc = response.data?.document
  if (!document) return response

  //TODO: convert document type to be read like documentToNote
  //type has to be converted in order to use filter
  if (dispatch) {
    await dispatch({
      type: c.dispatchActionType.INSERT_TO_OBJECT_TABLE,
      payload: { doc: document },
    })
  }
  const note = await documentToNote({ document })

  // createdoc id-obj update
  note.name.data = bs64Data
  note.name.compressedBs64Data = compressedBs64Data
  return {
    jwt: response?.data?.jwt,
    error: response?.data?.error,
    doc: note,
    code: response?.data?.code,
  }
}
/**
 * @param params
 * @param params.edge_id: string
 * @param params.title: string
 * @param params.content: string | Blob
 * @param params.type: 0 | 1 | 2 | 3 | 10 | 11 | 12
 * @param params.tags?: string[]
 * @param params.dataType?: number
 * @returns Promise<Document>
 */
export const nocheckcreate = async ({
  edge_id,
  title,
  tags = [],
  content,
  tage,
  type,
  user,
  sesk,
  aesk,
  targetRoomName,
  fid,
  reid, // transform to esig in lvl2
  mediaType,
  dataType = 0,
  dTypeProps,
  atimes,
  notification,
  paymentNonce,
  orderNumber,
  documentName,
  jwt,
  dispatch,
  vendorId
}: t.CreateDocumentParams) => {
  const dType = new DType()

  dType.dataType =
    dTypeProps?.applicationDataType || dTypeProps?.dataType || dataType

  // Permission
  dType.isEditable = !!+dTypeProps?.isEditable || true

  // Content to Blob
  const blob = await contentToBlob(content, mediaType)
  dType.setMediaType(mediaType || blob.type)

  // Gzip
  const { data: gzipData, isZipped } = await produceGzipData(blob,dTypeProps?.isZipped)
  dType.isZipped = !!+dTypeProps?.isZipped || isZipped
  if(typeof dTypeProps?.isOnServer === 'undefined'){
    dType.isOnServer = gzipData.length < CONTENT_SIZE_LIMIT
  }else{
    dType.isOnServer = !!+dTypeProps?.isOnServer && gzipData.length < CONTENT_SIZE_LIMIT
  }
  if (type == 435201 || type == 437761) {
    dType.isOnServer = false
  }
  // Encryption
  dType.isEncrypted = !!+dTypeProps?.isEncrypted
  let esak: Uint8Array | string = ''
  let publicKeyOfSender: string = ''

  const currentUserVid = localStorage.getItem('user_vid')

  let returnDataInUint8Array = gzipData
  if (dType.isEncrypted) {
    const { data } = await produceEncryptData(gzipData, esak, publicKeyOfSender)
    returnDataInUint8Array = data
  }

  const bs64Data = await store.level2SDK.utilServices.uint8ArrayToBase64(
    returnDataInUint8Array,
  )
  dType.isBinary = false

  const name: t.NoteDocumentName = {
    ...documentName,
    title,
    tags,
    type: blob.type,
  }
  orderNumber && (name.orderNumber = orderNumber)
  vendorId && (name.vendorId = vendorId)
  if (user) {
    name.user = user
  }
  if (targetRoomName) {
    name.targetRoomName = targetRoomName
  }
  if (sesk) {
    name.sesk = sesk
  }
  if (aesk) {
    name.aesk = aesk
  }

  // data must be base64 in name field
  if (dType.isOnServer) {
    name.data = bs64Data
  }
  if (paymentNonce) {
    name.nonce = paymentNonce
  }

  if (notification) {
    name.notification = notification
  }
  const response = await store.level2SDK.documentServices
    .createDocument({
      eid: edge_id,
      eSig: reid, // transform to esig in lvl2
      type,
      subtype: dType.value,
      name,
      atimes,
      tage,
      size: blob.size,
      fid,
      jwt,
    })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
  if (!response || !response.data) {
    throw new AiTmedError({
      name: 'UNKNOW_ERROR',
      message: 'Document -> create -> createDocument -> no response',
    })
  }
  const document: CommonTypes.Doc = response.data?.document
  if (!document) return response
  const { deat } = document

  if (!dType.isOnServer && deat !== null && deat && deat.url && deat.sig) {
    await store.level2SDK.documentServices
      .uploadDocumentToS3({ url: deat.url, sig: deat.sig, data: bs64Data })
      .then(store.responseCatcher)
      .catch(store.errorCatcher)
  }

  //TODO: convert document type to be read like documentToNote
  //type has to be converted in order to use filter
  if (dispatch) {
    await dispatch({
      type: c.dispatchActionType.INSERT_TO_OBJECT_TABLE,
      payload: { doc: document },
    })
  }
  const note = await documentToNote({ document })
  // createdoc id-obj update
  return {
    jwt: response?.data?.jwt,
    error: response?.data?.error,
    doc: note,
    code: response?.data?.code,
  }
}

/**
 *
 * @param id: Uint8Array | string
 * @param _edge?: Edge
 * @returns Promise<Document>
 */
//TODO: refactor to account for retrieving using edge and xfname:eid
export const retrieve = async (id, _edge) => {
  const resp = await retrieveDocument(id)
  const document = resp?.data?.document?.length ? resp?.data?.document[0] : null
  if (!document) {
    throw new AiTmedError({ name: 'NOT_A_NOTE' })
  }
  const note = await documentToNote({ document, _edge })
  return note
}

/**
 * @param id: string | Uint8Array
 * @param fields
 * @param fields.notebook_id?: string
 * @param fields.title?: string
 * @param fields.content?: string | Blob
 * @param type?: text/plain | application/json | text/html | text/markdown | image/* | application/pdf | video/* | string
 * @param fields.tags?: string[]
 * @param save?: boolean
 * @returns Promise<Document>
 */
export const update: any = async (
  id,
  {
    edge_id,
    title,
    content,
    mediaType,
    tags,
    type,
    tage,
    dTypeProps,
    jwt,
    reid,
    fid,
    atimes,
    isRefreshData,
    user,
    paymentNonce,
    documentName
  },
) => {
  // Get original document
  const resp = await retrieveDocument(id)
  const respDoc = resp.data.document[0]
  const MettingDocType = [184321,184320,186881,186880,204801,204800,140801,140800,135681,135680,138241,138240,238081,238080,1793,1792,2305,2304,1537,1536,122881,122880,125441,125440,128001,128000,130561,130560,133121,133120,168961,168960,192001,189441,179201]
  if(MettingDocType.includes(type) && respDoc?.esig && respDoc?.eid){
      const originDocReid = store.level2SDK.utilServices.uint8ArrayToBase64(respDoc?.esig)
      const originDocEid = store.level2SDK.utilServices.uint8ArrayToBase64(respDoc?.eid)
      if (edge_id != originDocEid || reid != originDocReid) {
        console.error('eid or reid been changed');
      }
      reid = originDocReid
      edge_id = originDocEid
  }
  const patientProfiletype = 102401
  if (type == patientProfiletype) {
    // 不允许改变 eid 
    const originDocEid = store.level2SDK.utilServices.uint8ArrayToBase64(respDoc?.eid)
    if (edge_id != originDocEid) {
      console.error('eid been changed');
    }
    edge_id = originDocEid
  }
  const document = resp?.data?.document?.length ? resp?.data?.document[0] : null
  if (!document) {
    throw new AiTmedError({ name: 'NOT_A_NOTE' })
  }

  // Update Params
  const params: any = {
    id: document.id,
    eid: edge_id,
    tage: tage,
  }

  // Update name
  const name: t.NoteDocumentName = {
    ...document.name,
    ...documentName
  }

  if (typeof title !== 'undefined') name.title = title
  if (typeof user !== 'undefined') name.user = user
  name.tags = tags
  // if (
  //   typeof tags !== 'undefined' &&
  //   Array.isArray(name.tags) &&
  //   Array.isArray(tags)
  // ) {
  //   const tagsSet = new Set([...name.tags, ...tags])
  //   name.tags = Array.from(tagsSet)
  // }
  // if (
  //   typeof tags !== 'undefined' &&
  //   (!Array.isArray(name.tags) || !Array.isArray(tags))
  // ) {
  //   name.tags = []
  // }

  // DType
  const isOldDataStructure =
    typeof name.isOnS3 !== 'undefined' ||
    typeof name.isZipped !== 'undefined' ||
    typeof name.isBinary !== 'undefined' ||
    typeof name.isEncrypt !== 'undefined' ||
    typeof name.edit_mode !== 'undefined'

  const dType = isOldDataStructure ? new DType() : new DType(document.subtype)
  if (paymentNonce) {
    name.nonce = paymentNonce
  }
  let note: any
  let response
  // Update document
  if (typeof content === 'undefined') {
    // Does not need to update content
    params.name = name
    response = await store.level2SDK.documentServices
      .updateDocument({ ...params, subtype: dType.value, jwt })
      .then(store.responseCatcher)
      .catch(store.errorCatcher)
    if (!response || response.code !== 0) {
      throw new AiTmedError({
        name: 'UNKNOW_ERROR',
        message: 'Document -> update -> updateDocument -> no response',
      })
    }
    const resp = await retrieveDocument(id)
    const doc = resp?.data?.document?.length ? resp?.data?.document[0] : null
    note = await documentToNote({ document: doc })
  } else {
    // Need to update content
    // Content to Blob
    const blob = await contentToBlob(content, mediaType)

    // Gzip
    const { data: gzipData, isZipped } = await produceGzipData(blob,dTypeProps?.isZipped)
    dType.isZipped = isZipped
    // dType.isOnServer =
    //   !!+dTypeProps?.isOnServer || gzipData.length < CONTENT_SIZE_LIMIT
    // dType.isOnServer =
    //   !!+dTypeProps?.isOnServer || gzipData.length < CONTENT_SIZE_LIMIT
    if(typeof dTypeProps?.isOnServer === 'undefined'){
      dType.isOnServer = gzipData.length < CONTENT_SIZE_LIMIT
    }else{
      dType.isOnServer = !!+dTypeProps?.isOnServer && gzipData.length < CONTENT_SIZE_LIMIT
    }
    if (type == 435201 || type == 437761) {
      dType.isOnServer = false
    }
    dType.isEncrypted = !!+dTypeProps?.isEncrypted
    let returnDataInUint8Array = gzipData
    if (dType.isEncrypted) {
      // Get edge
      const edge =
        (typeof edge_id !== 'undefined'
          ? await retrieveEdge(edge_id)
          : await retrieveEdge(document?.eid)
        )?.data?.edge?.[0] || null
      if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })
      const currentUserId = localStorage.getItem('facility_vid')
        ? localStorage.getItem('facility_vid')
        : localStorage.getItem('user_vid')
      const processedEdge = edgeType.indexOf(edge?.type)
      const isInviteEdge = edge?.type === 1053
      // const isRoomEdge = edge?.type === 40000
      // const isConnectionEdge = edge?.type === 10002
      // const isRootNoteBook = edge?.type === 10000
      // const facilityRelationEdge = edge?.type === 1100
      let halfKey: Uint8Array | null
      if (processedEdge!=-1) {
        let rootEdge = edge
        if (isInviteEdge) {
          const resp = await retrieveEdge(edge?.refid)
          rootEdge = resp?.data?.edge?.[0]
        }
        halfKey = await getHalfkey(rootEdge, currentUserId)
        if (halfKey) {
          const  data  = await store.level2SDK.commonServices.encryptDoc(
            halfKey,
            gzipData
          )
          returnDataInUint8Array = data
          dType.isEncrypted = true
        } else {
          console.error('halfKey is null when encrypt doc,  @chenchen.xu @yongjian.yu');
          returnDataInUint8Array = gzipData
        }
      }
      else {
        console.error(`${edge?.type},this edge type not be handled in code may cause decrypt/encrypt issues, contact @chenchen.xu @yongjian.yu to fix`);
        returnDataInUint8Array = gzipData
      }
    }
    const bs64Data = await store.level2SDK.utilServices.uint8ArrayToBase64(returnDataInUint8Array)
    dType.isBinary = false

    name.type = blob.type
    params.size = blob.size

    if (dType.isOnServer) {
      name.data = bs64Data
      params.name = name
    } else {
      // if (isRefreshData) {
        const instance = ecosAxios()
        const { data } = await instance?.({
          url: '/document/updateS3',
          method: 'post',
          data: {
            docId: store.level2SDK.utilServices.uint8ArrayToBase64(document.id),
          },
        }) ?? {}
        const { url, sig } = data['data']
        log.info('new s3 url ',url)
        await store.level2SDK.documentServices
          .uploadDocumentToS3({ url, sig, data: bs64Data })
          .then(store.responseCatcher)
          .catch(store.errorCatcher)
      // }
      params.name = name
      if (typeof name.data !== 'undefined'){
        params.name.data = null
      }
      params.name.title = title
      params.name.type = blob.type
    }

    response = await store.level2SDK.documentServices.updateDocument({
      id: document.id,
      eid: edge_id,
      subtype: dType.value,
      name: params.name,
      size: blob.size,
      tage: tage,
      atimes,
      type,
      jwt,
      eSig: reid,
      fid: fid,
    })
    if (!response || response.code !== 0) {
      throw new AiTmedError({
        name: 'UNKNOW_ERROR',
        message: 'Document -> update -> updateDocument -> no response',
      })
    }

    const updatedDocument: CommonTypes.Doc = response.data?.document
    const { deat } = updatedDocument
    if (deat !== null && deat && deat.url && deat.sig && !dType.isOnServer) {
      await store.level2SDK.documentServices
        .uploadDocumentToS3({ url: deat.url, sig: deat.sig, data: bs64Data })
        .then(store.responseCatcher)
        .catch(store.errorCatcher)
    }

    note = await documentToNote({ document: updatedDocument })
  }
  // update obj
  // return new note
  return {
    jwt: response?.data?.jwt,
    error: response?.data?.error,
    doc: note,
    code: response?.data?.code,
  }
}


export const retrieveUncachedDocs = async (docId) => {
  const idList = [docId]
  const requestOptions: any = {
    xfname: 'id',
  }
  let rawResponse
  await store.level2SDK.documentServices
    .retrieveDocument({
      idList,
      options: requestOptions,
    }).then((res) => {
      rawResponse = res?.data
    })
  return rawResponse
}

export const retrieveAllVisibleEcosDocs = async (userID) => {
  const idList = [userID]
  const requestOptions: any = {
    ObjType: 8,
    scondition: `E.type>9999 AND D.type not in (1793)`,
    asc: true,
    obfname: 'D.mtime',
  }
  let rawResponse
  await store.level2SDK.documentServices
    .retrieveDocument({
      idList,
      options: requestOptions,
    }).then((res) => {
      rawResponse = res?.data
    })
  return rawResponse
}

export const retrieveAllNewVisibleEcosDocs = async (userID, PI_docID) => {
  const idList = [userID]
  const requestOptions: any = {
    ObjType: 8,
    scondition: `E.type>9999 AND D.type not in (1793)`,
    asc: true,
    obfname: 'D.mtime',
    loid: PI_docID,
  }
  let rawResponse
  await store.level2SDK.documentServices
    .retrieveDocument({
      idList,
      options: requestOptions,
    }).then((res) => {
      rawResponse = res?.data
    })
  return rawResponse
}

export const docUploadToS3 = async (doc, bs64Data) => {
  const deat = doc?.deat
  if (deat !== null && deat && deat.url && bs64Data) {
    const res = await store.level2SDK.documentServices
      .uploadDocumentToS3({ url: deat.url, sig: deat.sig, data: bs64Data })
      .then(store.responseCatcher)
      .catch(store.errorCatcher)
    if (res?.code == 0) {
      log.debug('upload doc success')
    } else {
      log.debug('upload doc failed')
    }
  }
}