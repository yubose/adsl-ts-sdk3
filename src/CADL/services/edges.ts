import * as u from '@jsmanifest/utils'
import cloneDeep from 'lodash/cloneDeep'
import type { CommonTypes } from '../../common/ecos'
import type CADL from '../CADL'
import store from '../../common/store'
import { _TEST_} from '../../utils/common'
import { retrieveEdge, retrieveVertex } from '../../common/retrieve'
import replaceEidWithId from '../../utils/replaceEidWithId'
import { UnableToLocateValue } from '../../errors'
import getIdList from '../../utils/getIdList'
import isPopulated from '../../utils/isPopulated'
import log,{onlineLog} from '../../utils/log'
import mergeDeep from '../../utils/mergeDeep'
import * as c from '../../constants'
import { toast } from './utils'
import { getHandedCode } from '../utils'
export { get, create }
import {getHalfkey,getPkOfEdgeEvid} from './encrypt'
import { storeToken } from '../../utils/NotificationUtils'
const edgeType = [40000,10002,10000,1053,1200]
/**
 *
 * @param output Api object
 */
function get({
  apiObject,
  pageName,
  dispatch,
}: {
  apiObject: any
  dispatch: CADL['dispatch']
  pageName: string
}) {
  return async function sendRetrieveEdge() {
    let startTime = new Date().getTime()
    let res = {} as {
      error?: {
        code: number
        name: string
        message: string
        source?: string
      }
      jwt: null | string
      edge: null | string | CommonTypes.Edge[]
      code: number
    }

    let { api, dataKey, dataIn, dataOut, ...options } = cloneDeep(
      apiObject || {},
    )

    let idList: (string | Uint8Array)[] = []
    let requestOptions = { ...options }
    let maxcount = options?.maxcount
    let type = options?.type
    let sCondition = options?.sCondition
    let nonce: number | null = null
    let cacheTime = options?.cacheTime

    // Get current object name value
    let currentVal = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: { pageName, dataKey: dataIn || dataKey },
    })

    if (dataIn) {
      const { deat, id, _nonce, ...populatedCurrentVal } = await dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { object: currentVal, pageName, copy: true },
      })
      cacheTime = populatedCurrentVal?.cacheTime
      if (!isPopulated(id)) {
        return log.error(
          new UnableToLocateValue(
            `Missing reference ${id} at page ${pageName}`,
          ),
        )
      }

      idList = getIdList(id)
      nonce = _nonce

      requestOptions = { ...requestOptions, ...populatedCurrentVal }
      maxcount = populatedCurrentVal?.maxcount
      type = populatedCurrentVal?.type
      sCondition = populatedCurrentVal?.sCondition
    } else if (options.id) {
      idList = getIdList(options.id)
    }
    const { deat, id, _handledCode, _nonce, ...populatedCurrentVal } =
      await dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { object: requestOptions, pageName },
      })
    cacheTime = populatedCurrentVal?.cacheTime
    maxcount && (requestOptions.maxcount = parseInt(maxcount))
    requestOptions = { ...requestOptions, ...populatedCurrentVal }
    sCondition && (requestOptions.scondition = sCondition)
    type && (requestOptions.type = parseInt(type))
    // Buffer check
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

    try {
      if (_TEST_) {
        log.info(
          '%cGet Edge Request',
          'background: purple; color: white; display: block;',
          { idList, options: requestOptions },
        )
      }

      if (!shouldPass) {
        res = await dispatch({
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
        const resp = await retrieveEdge(idList, requestOptions)

        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: { data: resp?.data || null, cacheIndex,cacheTime },
        })

        res = resp?.data || null
      }
    } catch (error) {
			const err = error instanceof Error ? error : new Error(String(error))
			console.error(`Error occurred in function "sendRetrieveEdge"`, {
				apiObject,
				cacheIndex,
				error: err,
				idList,
				requestOptions,
			})
      throw err
    }

    // Doesn't update the state. Shows mock data instead.
    if (!res?.edge?.length && store.env === 'test'&&_TEST_) {
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
        '%cGet Edge Response',
        'background: purple; color: white; display: block;',
        res,
      )
      await dispatch({
        type: c.dispatchActionType.UPDATE_DATA,
        // TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut || dataKey,
          data: res,
        },
      })
 
    } else {
      res.edge = u.reduce(
        u.array(res?.edge as any),
        (acc, edge) => (edge ? acc.concat(replaceEidWithId(edge)) : acc),
        [] as any[],
      )

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
          '%cGet Edge Response',
          'background: purple; color: white; display: block;',
          res,
        )

      }
      
      if (res.jwt) {
        // Update Global jwt
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
        // TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut || dataKey,
          data: res,
        },
      })
    }
    let endTime = new Date().getTime()
    const timeUsed = endTime - startTime
    const data = { idList, options: requestOptions,timeUsed}
    return res
  }
}

/**
 * Creates an edge or updates an edge if there is an id
 * in the apiObject
 *
 * @param param0
 */
function create({ pageName, apiObject, dispatch }) {
  return async function sendCreateEdge(name) {
    const { dataKey, dataIn, dataOut } = cloneDeep(apiObject || {})
    // Get current object name value
    const { deat, id, _handledCode, ...rest } = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: { pageName, dataKey: dataIn || dataKey },
    })

    let obj = await dispatch({
      type: c.dispatchActionType.POPULATE_OBJECT,
      payload: { object: rest, pageName, copy: true },
    })

    let isFCMRegisterEdge = obj.type === 1090

    isFCMRegisterEdge && (obj.subtype = 2)

    if (!isPopulated(id)) {
      throw new UnableToLocateValue(
        `Missing reference ${id} at page ${pageName}`,
      )
    }

    // Merging existing name field and incoming name field
    let parsedType = parseInt(obj.type)
    let res: any

    if (Number.isNaN(parsedType) || parsedType === 0) return
    obj = { ...obj, type: parsedType }
    name && (obj = mergeDeep(obj, { name }))
    // If there is an id present
    // It is treated as un update request
    if (id && !id.startsWith('.')) {
      try {
        if (_TEST_) {
          log.info(
            '%cUpdate Edge Request',
            'background: purple; color: white; display: block;',
            { ...obj, id },
          )
        }

        res = (
          await store.level2SDK.edgeServices.updateEdge({
            ...obj,
            id,
          })
        )?.data

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
            '%cUpdate Edge Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      } catch (error) {
				const err = error instanceof Error ? error : new Error(String(error))
				console.error(`Error occurred in function "sendCreateEdge"`, {
					apiObject,
					error: err,
					pageName,
					someObjectInTheFunction: obj,
				})
        throw err
      }
    } else {
      try {
        if (store.env === 'test'&&_TEST_) {
          log.info(
            '%cCreate Edge Request',
            'background: purple; color: white; display: block;',
            obj,
          )
        }
        //store token
        if(obj.type === 1090 && obj?.name?.accessToken){
          const target = obj.evid === "pwHFrS9I8/5VPu+UxzHAWg=="?'provider':'patient'
          const payload = {
            token: obj.name.accessToken,
            platform: 'web',
            target
          }
          await storeToken(payload)
        }else if(obj.type === 1090 && !obj?.name?.accessToken){
          toast(`Notification token register failed !`, { type: 'default' })
        }
        const { data = {} } = await store.level2SDK.edgeServices.createEdge(obj) || {}
        const processedEdge = edgeType.indexOf(data?.edge?.type)
        const isInviteEdge = data?.edge?.type === 1053
        const isRoomEdge = data.edge?.type === 40000
        const isConnectTionEdge = data.edge?.type === 10002
        const isFacilityRelationEdge = data.edge?.type === 1100
        const isRootNoteBook = data.edge?.type === 10000
        // handle the edge need generate besak or eesak 
        if (processedEdge!=-1) {
          const currentUserSk = u.isBrowser() ? localStorage.getItem('facility_sk')?localStorage.getItem('facility_sk'):localStorage.getItem('sk') : ''
          let skOfInviterToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
          const currentUserId = u.isBrowser() ? (localStorage.getItem('facility_vid')
            ? localStorage.getItem('facility_vid')
            : localStorage.getItem('user_vid')) : ''
          let rootEdge = data.edge 
          let subtype = data.edge?.subtype
          if(isInviteEdge && subtype!=210){
            if (data.edge?.subtype == 8) { //rphelper
              res = data
            } else {
              const inviteEdge = data?.edge
              const rootEdgeresp = await retrieveEdge(data?.edge?.refid)
              let pkOfInviteeToUint8Array = getPkOfEdgeEvid(inviteEdge)
              rootEdge = rootEdgeresp?.data?.edge?.[0]
              let halfkey = await getHalfkey(rootEdge,currentUserId)
              if(halfkey){
                const eesak = store.level2SDK.utilServices.aKeyEncrypt(
                  pkOfInviteeToUint8Array,
                  skOfInviterToUint8Array,
                  halfkey
                )
                const { data: updatedInviteEdgeRes } =
                  await store.level2SDK.edgeServices.updateEdge({
                    id: inviteEdge.eid,
                    type: 1053,
                    eesak,
                    name: inviteEdge.name,
                  })
                res = updatedInviteEdgeRes
              }
            }
          }else if(data?.edge?.type === 1200){
            let halfkey
            let ownerSK: string | undefined | null
            let ownerPK: string | undefined | null
            let ownerId: string | undefined | null
            let facilityVid: string | undefined | null
            let facility_pk: string | undefined | null
            let facility_sk: string | undefined | null


            if (u.isBrowser()) {
              
            }
            ownerSK = localStorage.getItem('sk')
            ownerPK = localStorage.getItem('pk')
            ownerId = localStorage.getItem('user_vid')
            const inviteEdge = data?.edge
            // 获取被邀请者的vertex
            const evidVertexresp = await retrieveVertex(data?.edge?.evid)
            const evidVertex = evidVertexresp?.data?.vertex?.[0]
            let pkOfStaffToUint8Array = evidVertex?.pk

            facilityVid = localStorage.getItem('facility_vid')
            facility_pk = localStorage.getItem('facility_pk')
            facility_sk = localStorage.getItem('facility_sk')
            //get edge 1200
            if(ownerId && ownerPK && ownerSK && facilityVid){
              const connectionEdgeptions = {
                xfname: 'Bvid,Evid',
                scondition: 'type in (1100,1200)',
                maxcount: 1
              }
              const connectionEdgeResponse = await store.level2SDK.edgeServices.retrieveEdge({
                idList: [facilityVid,ownerId],
                options: connectionEdgeptions
              })
              const connectionEdge = connectionEdgeResponse.data.edge[0]

                if(connectionEdge.type === 1200){
                  const recvSecretKey = store.level2SDK.utilServices.base64ToUint8Array(ownerSK)
                  const sendPublicKey = store.level2SDK.utilServices.base64ToUint8Array(facility_pk!)
                  let eData = new Uint8Array(connectionEdge['eesak'])
                  halfkey = store.level2SDK.utilServices.aKeyDecrypt(
                    sendPublicKey,
                    recvSecretKey,
                    eData,
                  )
                }else if(connectionEdge.type === 1100){
                  const key = `${ownerSK}${facilityVid}`
                  const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: key}) 
                  halfkey = store.level2SDK.utilServices.base64ToUint8Array(password)
                }
            }

            if(currentUserSk && pkOfStaffToUint8Array && facility_pk && facility_sk && halfkey){
              let pkOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facility_pk)
              let skOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facility_sk)
              
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
              log.debug('test12',{halfkey})
              const { data: updatedInviteEdgeRes } =
                await store.level2SDK.edgeServices.updateEdge({
                  id: inviteEdge.eid,
                  type: 1200,
                  eesak,
                  besak,
                  name: inviteEdge.name,
                })
              const jwtUser = u.isBrowser() ? (localStorage.getItem('facility_vid')
                ? localStorage.getItem('facility_vid')
                : localStorage.getItem('user_vid')) : ''
              onlineLog({
                userId: jwtUser,
                facilityId: localStorage.getItem('facility_vid'),
                rootEdgeId: rootEdge.eid,
                halfKey: halfkey?store.level2SDK.utilServices.uint8ArrayToBase64(halfkey):halfkey,
                other: {
                  platform: "web",
                  op:"ce"
                }
              })
              res = updatedInviteEdgeRes
              // log.debug('tets9',res)
              
            }
          } else if(isRoomEdge || isConnectTionEdge|| isFacilityRelationEdge || isRootNoteBook || (isInviteEdge && subtype==210)){
            res = data
          }

        }else {
          res = data
        }
        if (_TEST_) {
          if (_handledCode) {
            const errorCodes = getHandedCode(_handledCode)
            res?.code &&
              errorCodes[0] !== 'all' &&
              !(errorCodes.indexOf(res?.code) !== -1) &&
              toast(`${res?.code}:${res?.error}`, { type: 'error' })
          } else {
            // temp not showing error code 10316, 10317,3001 caused by 1031 for changing JWT, 2002 caused by 1031, 1005 caused by 1090

            const codeArray = [10316, 10317, 3001, 1005, 2002]
            res?.code &&
              codeArray.indexOf(res?.code) == -1 &&
              toast(`${res?.code}:${res?.error}`, { type: 'error' })

            // res?.code && toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }
          log.info(
            '%cCreate Edge Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      } catch (error) {
				const err = error instanceof Error ? error : new Error(String(error))
				console.error(`Error occurred in function "sendCreateEdge"`, {
					apiObject,
					error: err,
					pageName,
					someObjectInTheFunction: obj,
					stack: err.stack,
				})
        throw err
      }
    }

    if (res) {
      res.edge = replaceEidWithId(res.edge)

      if (res.jwt) {
        // Update Global jwt
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          payload: { dataKey: 'Global.currentUser.JWT', data: res.jwt },
        })
      }

      await dispatch({
        type: c.dispatchActionType.UPDATE_DATA,
        //TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut || dataKey,
          data: res,
        },
      })

      // Dispatch action to update state that is dependant of this response
      await dispatch({
        type: c.dispatchActionType.POPULATE,
        payload: { pageName },
      })
    }
    return res
  }
}
