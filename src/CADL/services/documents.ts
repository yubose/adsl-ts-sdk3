import * as u from '@jsmanifest/utils'
import type { Response } from '../../ecos'
import cloneDeep from 'lodash/cloneDeep'
import set from 'lodash/set'
import unset from 'lodash/unset'
import store from '../../common/store'
import { documentToNote } from '../../services/Document/utils'
import Document from '../../services/Document'
import { UnableToLocateValue } from '../../errors'
import getIdList from '../../utils/getIdList'
import isPopulated from '../../utils/isPopulated'
import * as c from '../../constants'
import { toast } from './utils'
import log from '../../utils/log'
import { getHandedCode, replaceUint8ArrayWithBase64 } from '../utils'
import { _TEST_ } from '../../utils/common'
import replaceEidWithId from '../../utils/replaceEidWithId'
import DType from '../../common/DType'
import { deepCopy } from '../../deepClone'
import { sendNotification } from '../../utils/NotificationUtils'
// import { has } from 'lodash'
export { get, create }

const cacheType = new Set([174081])

function get({ pageName, apiObject, dispatch }) {
  return async function sendRetrieveDocument() {
    let startTime = new Date().getTime()
    let res
    const { api, dataKey, dataIn, dataOut, subtype, ...options } = cloneDeep(
      apiObject || {},
    )

    let requestOptions = {
      ...options,
    }
    let maxcount = options?.maxcount
    let type = options?.type
    let cacheTime = options?.cacheTime
    let sCondition = options?.sCondition
    let nonce
    let idList: (string|Uint8Array)[] = []
    let objtype
    if (dataIn) {
      //get current object name value
      const currentVal = await dispatch({
        type: c.dispatchActionType.GET_DATA,
        payload: { pageName, dataKey: dataIn ? dataIn : dataKey },
      })
      const { deat, id, ids, _nonce, ObjType, key,...populatedCurrentVal } =
        await dispatch({
          type: c.dispatchActionType.POPULATE_OBJECT,
          payload: { object: currentVal, pageName, copy: true },
        })
      cacheTime = populatedCurrentVal?.cacheTime

      if (ObjType && ObjType === 3 && key) {
        let res: any[] = []
        const searchResponse = await dispatch({
          type: c.dispatchActionType.SEARCH_CACHE,
          payload: { key, sCondition: populatedCurrentVal?.sCondition },
        })
        if (searchResponse.length) {
          const decryptedDocs = searchResponse.map(async (doc) => {
            if (doc) {
              const decryptedDoc = await documentToNote({ document: doc })
              return decryptedDoc
            }
            return
          })
          await Promise.all(decryptedDocs)
            .then((decryptedDataResults) => {
              res = decryptedDataResults
            })
            .catch((error) => {
              log.error(
                error instanceof Error ? error : new Error(String(error)),
              )
            })
        }
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName,
            dataKey: dataOut ? dataOut : dataKey,
            data: { doc: res, searchResult: true },
          },
        })
        return
      }
      objtype = ObjType
      idList = getIdList(ids || id)
      nonce = _nonce
      if (!isPopulated(id)) {
        const err = new UnableToLocateValue(
          `Missing reference ${id} at page ${pageName}`,
        )
        return log.error(err)
      }

      requestOptions = populatedCurrentVal
      maxcount = populatedCurrentVal?.maxcount
      type = populatedCurrentVal?.type
      sCondition = populatedCurrentVal?.sCondition
    } else {
      const { deat, _nonce, id, ids, ...populatedCurrentVal } = await dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { object: requestOptions, pageName },
      })
      cacheTime = populatedCurrentVal?.cacheTime
      idList = getIdList(ids || id)
      nonce = _nonce
      requestOptions = populatedCurrentVal
    }

    if (maxcount) {
      requestOptions.maxcount = parseInt(maxcount)
    }
    if (type) {
      requestOptions.type = parseInt(type)
    }
    if (sCondition) {
      requestOptions.scondition = sCondition
    }
    const _handledCode = requestOptions?._handledCode
    if (objtype) {
      requestOptions.ObjType = objtype
    }
    //Buffer check
    const { pass: shouldPass, cacheIndex } = await dispatch({
      type: c.dispatchActionType.SET_API_BUFFER,
      payload: {
        apiObject: {
          idList,
          options: requestOptions,
          nonce,
        },
      },
    })

    let responseData: Response['data'] | undefined

    try {
      if (_TEST_) {
        log.info(
          '%cGet Document Request',
          'background: purple; color: white; display: block;',
          { idList, options: requestOptions },
        )
      }
      //Buffer check
      if (!shouldPass) {
        responseData = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        if (_TEST_) {
          log.debug(
            `%cUsing Cached Data for`,
            'background:#7268A6; color: white; display: block;',
            apiObject,
          )
        }
      } else {
        // const loid:any[] = await dispatch({
        //   type: c.dispatchActionType.FONTDB_OPREATE,
        //   payload: { funcName: 'getLastestDocsByType',type:requestOptions?.type},
        // })
        // if(loid && u.isArr(loid) && loid.length){
        //   const { columns, values } = loid[0]
        //	log.debug('using loid',values[0])
        //   requestOptions.loid = values[0]
        // }

        let retrieveDocResponse =
          await store.level2SDK.documentServices.retrieveDocument({
            idList,
            options: requestOptions,
          })

        responseData = retrieveDocResponse?.data

        let documents = [] as any[]

        if (u.isArr(responseData?.document)) {
          documents.push(
            ...u
              .array(responseData?.document)
              .reduce(
                (acc, obj) => (!u.isNil(obj) ? acc.concat(obj) : acc),
                [] as any[],
              ),
          )
        }

        let items = await Promise.allSettled(
          documents.map(async (doc) => {
            await dispatch({
              type: c.dispatchActionType.INSERT_TO_OBJECT_TABLE, //yuhan
              payload: { doc },
            })
            //decrypt data
            if (doc?.deat?.url && doc.name.type !== 'application/json') {
              //skip files that are in S3
              //these will be retrieved as needed by noodl established prepareDoc util fn
              return doc
            } else {
              let note: any
              try {
                //Buffer check
                const dType = new DType(doc.subtype)
                const id = await store.level2SDK.utilServices.uint8ArrayToBase64(doc.id)
                const { pass: shouldPass, cacheIndex } = await dispatch({
                  type: c.dispatchActionType.SET_ENCRYPT_BUFFER,
                  payload: {
                    apiObject: {
                      id: id,
                      mtime: doc.mtime,
                      cacheTime
                    },
                  },
                })
                if(!shouldPass && dType.isEncrypted){
                  note = await dispatch({
                    type: c.dispatchActionType.GET_CACHE,
                    payload: { cacheIndex },
                  })
                  log.debug(
                    `%cUsing Cached Data for Doc Decrypt`,
                    'background:#7268A6; color: white; display: block;',
                    note,
                  )
                }else{
                  note = await documentToNote({ document: doc})
                  if(dType.isEncrypted && shouldPass){
                    log.debug(
                      `%cSeting Cached Data for Doc Decrypt`,
                      'background:#7268A6; color: white; display: block;',
                      note,
                    )
                    await dispatch({
                        type: c.dispatchActionType.SET_CACHE,
                        payload: { data:note, cacheIndex ,type: 'E',cacheTime},   // E: EncryptDoc
                    })
                  }
                   
                }
                
              } catch (error) {
                const err =
                  error instanceof Error ? error : new Error(String(error))
                log.error(err, { note, error: err, document: doc })
              }
              return note
            }
          }),
        )

        set(
          retrieveDocResponse,
          `data.doc`,
          items.reduce((acc, result) => {
            // @ts-expect-error
            const { status, value } = result
            return status === 'fulfilled' && !u.isNil(value)
              ? acc.concat(value)
              : acc
          }, [] as any[]),
        )

        unset(retrieveDocResponse, 'data.document')
        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: { data: responseData, cacheIndex,cacheTime },
        })

        // if (loid==null){
        //   res = rawResponse
        // }else{
        //   res = await dispatch({
        //     type: c.dispatchActionType.FONTDB_OPREATE,
        //     payload: { funcName: 'getAllDocsByType',type: options?.type },
        //   }).then(async(documents)=>{
        //     return Promise.allSettled(
        //       documents.map?.(async (document) => {
        //         //decrypt data
        //         if (document?.deat?.url) {
        //           //skip files that are in S3
        //           //these will be retrieved as needed by noodl established prepareDoc util fn
        //           return document
        //         } else {
        //           let note: any
        //           try {
        //             note = await documentToNote({ document })
        //           } catch (error) {
        //             const err =
        //               error instanceof Error ? error : new Error(String(error))
        //             log.error(err, { note, error: err, document })
        //           }
        //           return note
        //         }
        //       }),
        //     )
        //   })
        // }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`Error occurred in the function "sendRetrieveDocument"`, {
        apiObject,
        cacheIndex,
        error: err,
        pageName,
        requestOptions,
      })
      throw err
    }

    if (responseData) {
      const responseCode = responseData?.code
      const responseErr = responseData?.error
      if (_TEST_) {
        if (_handledCode) {
          const errorCodes = getHandedCode(_handledCode)
          responseCode &&
            errorCodes[0] !== 'all' &&
            !(errorCodes.indexOf(responseCode) !== -1) &&
            toast(`${responseCode}:${responseErr}`, { type: 'error' })
        } else {
          responseCode &&
            toast(`${responseCode}:${responseErr}`, { type: 'error' })
        }
        log.info(
          '%cGet Document Response',
          'background: purple; color: white; display: block;',
          responseData,
        )
      }
      if (responseData?.jwt) {
        //update Global jwt
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          payload: {
            dataKey: 'Global.currentUser.JWT',
            data: responseData.jwt,
          },
        })
      }
      await dispatch({
        type: c.dispatchActionType.UPDATE_DATA,
        //TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut ? dataOut : dataKey,
          data: responseData,
        },
      })
      await dispatch({
        type: c.dispatchActionType.INSERT_TO_INDEX_TABLE,
        payload: { doc: responseData },
      })
    }

    const len = responseData.doc.length
    for(let i = 0; i < len; i++) {
      const doc = responseData.doc[i]
      const cacheIndex = store.level2SDK.utilServices.uint8ArrayToBase64(doc.id)
      if(dispatch({
        type: c.dispatchActionType.HAS_CACHE,
        payload: { cacheIndex },
      })) {
        const newDoc = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        if(newDoc && doc.mtime < newDoc.doc.mtime) {
          responseData.doc[i] = deepCopy(newDoc.doc)
          await dispatch({
            type: c.dispatchActionType.DELETE_CACHE,
            payload: { cacheIndex: cacheIndex }
          })
        }
      }
    }
    let endTime = new Date().getTime()
    const timeUsed = endTime - startTime
    const data = { idList, options: requestOptions,timeUsed}
    return responseData
  }
}

function create({ pageName, apiObject, dispatch }) {
  //@ts-ignore
  return async function sendCreateDocument() {
    let startTime = new Date().getTime()
    //@ts-ignore
    const { dataKey, dataIn, dataOut } = cloneDeep(apiObject || {})
    const currentVal = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: {
        dataKey: dataIn ? dataIn : dataKey,
        pageName,
      },
    })
    const { deat, id, _handledCode, _nonce, ...populatedCurrentVal } =
      await dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { object: currentVal, pageName },
      })
    let cacheTime = populatedCurrentVal?.cacheTime
    if (!isPopulated(id)) {
      throw new UnableToLocateValue(
        `Missing reference ${id} at page ${pageName}`,
      )
    }
    //send Notification start
    if(!!populatedCurrentVal?.subtype?.notification && parseInt(populatedCurrentVal?.type) === 4352){
      const notification = populatedCurrentVal?.name?.notification
      const subtype = populatedCurrentVal.subtype
      const dType = new DType()
      dType.notification = !!+subtype?.notification
      dType.ringToneNotify = !!+subtype?.ringToneNotify
      dType.isZipped = !!+subtype?.isZipped
      dType.isEncrypted = !!+subtype?.isEncrypted
      dType.isOnServer = !!+subtype?.isOnServer
      const payload = {
        uuid: populatedCurrentVal?.eid?populatedCurrentVal?.eid:"",
        message: {
          did: JSON.stringify({
            ...populatedCurrentVal,
            deat, 
            id,  
            subtype: dType.value
          }),
          type: !!populatedCurrentVal?.subtype?.ringToneNotify?"ringtong":"message",
          openApp: "true",
          onClickLandingPage: notification?.onClickLandingPage?notification?.onClickLandingPage:"",
          title: notification?.title?notification?.title:"",
          // context: notification?.context,
          body: notification?.body || notification?.context,
          targetApp: populatedCurrentVal?.fid,
        },
        delay: populatedCurrentVal?.tage?populatedCurrentVal?.tage:0
      }
      if(populatedCurrentVal?.name?.title){
        payload['uid'] = populatedCurrentVal?.name?.title
      }else{
        payload['eid'] = populatedCurrentVal?.eid
        payload['uid'] = localStorage.getItem('user_vid')
      }
      await sendNotification(payload)
      return
    }
    if (
      populatedCurrentVal.type == '2000' &&
      typeof populatedCurrentVal.name.nonce === 'function'
    ) {
      //document is a payment type
      populatedCurrentVal.name = {
        ...populatedCurrentVal.name, 
        nonce: populatedCurrentVal.name.nonce(),
      }
    }
    const nonce = _nonce
    // Buffer check
    const { pass: shouldPass, cacheIndex } = await dispatch({
      type: c.dispatchActionType.SET_API_BUFFER,
      payload: {
        apiObject: {
          id: populatedCurrentVal.eid,
          options: populatedCurrentVal,
          nonce,
        },
      },
    })

    let res
    //If id is in apiObject then it is an updateRequest
    if(parseInt(populatedCurrentVal.type) === 4001 && !shouldPass && nonce){
      res = await dispatch({
        type: c.dispatchActionType.GET_CACHE,
        payload: { cacheIndex },
      })

      if (_TEST_) {
        log.info(
          `%cUsing Cached Data for`,
          'background:#7268A6; color: white; display: block;',
          apiObject,
        )
      }
    }else{
      if (id) {
        try {
          const imageCacheRes  = await dispatch({
            type: c.dispatchActionType.SET_API_BUFFER,
            payload: {
              apiObject: {
                id,
              }
            },
          })

          if(!imageCacheRes.pass){
            await dispatch({
              type: c.dispatchActionType.DELETE_CACHE,
              payload: { cacheIndex: imageCacheRes.cacheIndex },
            })
          }

          const {
            eid,
            name,
            subtype: dTypeProps,
            isRefreshData,
            ...restOfDocOptions
          } = populatedCurrentVal
          if (_TEST_) {
            log.info(
              '%cUpdate Document Request',
              'background: purple; color: white; display: block;',
              id,
              {
                edge_id: eid,
                content: name?.data,
                mediaType: name?.type,
                title: name?.title,
                targetRoomName: name?.targetRoomName,
                documentName: name,
                tags: name?.tags,
                user: name?.user,
                sesk: name?.sesk,
                aesk: name?.aesk,
                atimes: restOfDocOptions?.atimes,
                tage: restOfDocOptions?.tage,
                type: restOfDocOptions?.type,
                fid: restOfDocOptions?.fid,
                reid: restOfDocOptions?.reid,
                  jwt: restOfDocOptions?.jwt,
                dTypeProps,
              },
            )
          }
          const _isRefreshData = isRefreshData?isRefreshData:false
          const response = await Document.update(id, {
            edge_id: eid,
            content: name?.data,
            mediaType: name?.type,
            title: name?.title,
            paymentNonce: name?.nonce,
            documentName: name,
            targetRoomName: name?.targetRoomName,
            tags: name?.tags,
            user: name?.user,
            sesk: name?.sesk,
            sfname: name?.sfname,
            aesk: name?.aesk,
            atimes: restOfDocOptions?.atimes,
            tage: restOfDocOptions?.tage,
            type: restOfDocOptions?.type,
            fid: restOfDocOptions?.fid,
            reid: restOfDocOptions?.reid,
            jwt: restOfDocOptions?.jwt,
            isRefreshData: _isRefreshData,
            dTypeProps,
          })
          res = response
          if (_TEST_) {
            if (_handledCode) {
              const errorCodes = getHandedCode(_handledCode)
              res?.code &&
                errorCodes[0] !== 'all' &&
                !(errorCodes.indexOf(res?.code) !== -1) &&
                toast(`${res?.code}:${res?.error}`, { type: 'error' })
            } else {
              res?.code &&
                res?.code &&
                toast(`${res?.code}:${res?.error}`, { type: 'error' })
            }
            log.info(
              '%cUpdate Document Response',
              'background: purple; color: white; display: block;',
              res,
            )
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          console.error(`Error occurred in the function "sendCreateDocument"`, {
            apiObject,
            error,
            pageName,
            data: populatedCurrentVal,
          })
          throw err
        }
      } else {
        //TODO: check data store to see if object already exists. if it does call update instead to avoid poluting the database

        try {
          const {
            subtype: dTypeProps,
            eid,
            name,
            ...restOfDocOptions
          } = populatedCurrentVal
          if (u.isStr(restOfDocOptions.type)) {
            restOfDocOptions.type = parseInt(restOfDocOptions.type)
          }
          if (_TEST_) {
            log.info(
              '%cCreate Document Request',
              'background: purple; color: white; display: block;',
              {
                edge_id: eid,
                content: name?.data,
                targetRoomName: name?.targetRoomName,
                paymentNonce: name?.nonce,
                mediaType: name?.type,
                title: name?.title,
                user: name?.user,
                sesk: name?.sesk,
                aesk: name?.aesk,
                notification: name?.notification,
                orderNumber: name?.orderNumber,
                vendorId: name?.vendorId,
                documentName: name,
                atimes: restOfDocOptions?.atimes,
                tage: restOfDocOptions?.tage,
                type: restOfDocOptions?.type,
                fid: restOfDocOptions?.fid,
                reid: restOfDocOptions?.reid,
                jwt: restOfDocOptions?.jwt,
                dTypeProps,
              },
            )
          }
          const response = await Document.create({
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
            fid: restOfDocOptions?.fid,
            reid: restOfDocOptions?.reid,
            jwt: restOfDocOptions?.jwt,
            documentName: name,
            dTypeProps,
            dispatch,
          })
          res = response
          if(restOfDocOptions.type ==5001 || restOfDocOptions.type == 4005){   // 5001 查询 cpt doc, 4005 处理 通用查询
            const searchResp = (response as any).doc.deat

            if(restOfDocOptions.type == 4005 && (restOfDocOptions.tage&0x01) === 1){  
                if(u.isArr(searchResp)){
                  let items  = u.reduce(
                    u.array(searchResp as any),
                    (acc, edge) => {
                      edge.name = JSON.parse(edge.name)
                      return edge ? acc.concat(replaceEidWithId(edge)) : acc
                    },
                    [] as any[],
                  )
                  res = {edge: items}
                }else{
                  res = {edge: []}
                }
            }else if((restOfDocOptions.type == 4005 && (restOfDocOptions.tage&&0x02) === 2) || restOfDocOptions.type == 5001){
              if(u.isArr(searchResp)){
                let items = await Promise.allSettled(
                  searchResp.map(async(doc)=>{
                    doc.name = JSON.parse(doc.name)
                    if(doc?.deat){
                      doc.deat = JSON.parse(doc.deat)
                    }
                    let note =  await documentToNote({ document: doc })
                    return note
                  })
                )
                let docs = items.reduce((acc, result) => {
                  // @ts-expect-error
                  const { status, value } = result
                  if (value?.reid){
                    value['esig'] = value.reid
                  }
                  return status === 'fulfilled' && !u.isNil(value)
                    ? acc.concat(value)
                    : acc
                }, [] as any[])
                res = {doc: docs}
              }else{
                res = {doc: []}
              }
            }
          }
          restOfDocOptions.type ==4001 && nonce && await dispatch({
            type: c.dispatchActionType.SET_CACHE,
            payload: { data: response|| null, cacheIndex,cacheTime },
          })

          if(!!populatedCurrentVal?.subtype?.notification && parseInt(populatedCurrentVal?.type) === 769){
            const doc = replaceUint8ArrayWithBase64(res.doc)
            const subtype = doc?.subtype
            const notification = doc?.name?.notification
            const dType = new DType()
            dType.notification = !!+subtype?.notification
            dType.ringToneNotify = !!+subtype?.ringToneNotify
            dType.isZipped = !!+subtype?.isZipped
            dType.isEncrypted = !!+subtype?.isEncrypted
            dType.isOnServer = !!+subtype?.isOnServer
            const payload = {
              uuid: "",
              message: {
                did: JSON.stringify({
                  ...doc,
                  subtype: dType.value
                }),
                type: subtype?.ringToneNotify?"ringtong":"message",
                onClickLandingPage: notification?.onClickLandingPage?notification?.onClickLandingPage:'',
                title: notification?.title?notification?.title:'',
                openApp: "true",
                body: notification?.body || notification?.context,
                targetApp: doc?.fid,
              },
              delay: doc?.tage?doc?.tage:0
            }
            payload['eid'] = doc?.eid
            payload['uid'] = localStorage.getItem('user_vid')
            await sendNotification(payload)
          }

          if (_TEST_) {
            if (_handledCode) {
              const errorCodes = getHandedCode(_handledCode)
              res?.code &&
                errorCodes[0] !== 'all' &&
                !(errorCodes.indexOf(res?.code) !== -1) &&
                toast(`${res?.code}:${res?.error}`, { type: 'error' })
            } else {
              res?.code && toast(`${res?.code}:${res?.error}`, { type: 'error' })
            }
            log.info(
              '%cCreate Document Response',
              'background: purple; color: white; display: block;',
              res,
            )
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          console.error(`Error occurred running the function Document.create`, {
            apiObject,
            data: populatedCurrentVal,
            error: err,
            pageName,
          })
          throw err
        }
      }
    }
    if (res) {
      if (res.jwt) {
        //update Global jwt
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,

          payload: {
            dataKey: 'Global.currentUser.JWT',
            data: res.jwt,
          },
        })
      }
      await dispatch({
        type: c.dispatchActionType.UPDATE_DATA,
        //TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut ? dataOut : dataKey,
          data: res,
        },
      })

      await dispatch({
        type: c.dispatchActionType.INSERT_TO_INDEX_TABLE,
        payload: { doc: [res.doc] },
      })

      if(cacheType.has(res?.doc?.type)) {
        const cacheIndex = store.level2SDK.utilServices.uint8ArrayToBase64(res.doc.id)
        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: { data: res, cacheIndex, type: "C",cacheTime }
        })
      }
    
    }
    let endTime = new Date().getTime()
    const timeUsed = endTime - startTime
    const data = {
      id: populatedCurrentVal.eid,
      populatedCurrentVal,
      timeUsed}
    return res
  }
}
