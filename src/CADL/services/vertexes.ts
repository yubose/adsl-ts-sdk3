import * as u from '@jsmanifest/utils'
import cloneDeep from 'lodash/cloneDeep'
import store from '../../common/store'
import { UnableToLocateValue } from '../../errors'
import getIdList from '../../utils/getIdList'
import isPopulated from '../../utils/isPopulated'
import log from '../../utils/log'
import mergeDeep from '../../utils/mergeDeep'
import { _TEST_ } from '../../utils/common'
import * as c from '../../constants'
import {toast}  from "./utils"
import { getHandedCode, getParentSK } from '../utils'
export { get, create }

function get({ pageName, apiObject, dispatch }) {
  return async function sendRetrieveVertex() {
    const { api, dataKey, dataIn, dataOut, ...options } = cloneDeep(
      apiObject || {},
    )

    let res: Record<string, any> = {}
    let idList = [] as (string | Uint8Array)[]
    let nonce: number | undefined
    let requestOptions = options
    let sCondition = options?.sCondition

    // Get current object name value
    let currentVal = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: { pageName, dataKey: dataIn || dataKey },
    })

    let { deat, id,_handledCode, _nonce, ...populatedCurrentVal } = await dispatch({
      type: c.dispatchActionType.POPULATE_OBJECT,
      payload: { object: currentVal, pageName, copy: true },
    })

    nonce = _nonce

    if (!isPopulated(id)) {
      throw new UnableToLocateValue(
        `Missing reference ${id} at page ${pageName}`,
      )
    }

    idList = getIdList(id)
    requestOptions = { ...requestOptions, ...populatedCurrentVal }
    sCondition = populatedCurrentVal?.sCondition

    try {
      if (_TEST_) {
        log.info(
          '%cGet Vertex Request',
          'background: purple; color: white; display: block;',
          { idList, options: requestOptions },
        )
      }
      if (sCondition) {
        requestOptions.scondition = sCondition
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
      if (!shouldPass) {
        res = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        if (store.env === 'test'&&_TEST_) {
          log.debug(
            `%cUsing Cached Data for`,
            'background:#7268A6; color: white; display: block;',
            apiObject,
          )
        }
      } else {
        if (requestOptions.sCondition) {
          requestOptions.scondition = requestOptions.sCondition
          delete requestOptions.sCondition
        }
        log.debug(u.cyan('store.level2SDK'), store)
        const { data } = await store.level2SDK.vertexServices.retrieveVertex({
          idList,
          options: requestOptions,
        })

        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: { data, cacheIndex },
        })

        res = data

        if (_TEST_) {
          if(_handledCode){
            const errorCodes = getHandedCode(_handledCode)
            res?.code && errorCodes[0]!=='all'&& !(errorCodes.indexOf(res?.code)!==-1)&& toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }else{
            res?.code && toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }
          log.info(
            '%cGet Vertex Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      }
    } catch (error) {
      throw error
    }
    if (res) {
      if (store.env === 'test'&&_TEST_) {
        if(_handledCode){
          const errorCodes = getHandedCode(_handledCode)
          res?.code && errorCodes[0]!=='all'&& !(errorCodes.indexOf(res?.code)!==-1)&& toast(`${res?.code}:${res?.error}`,{ type: 'error' })
        }else{
          res?.code && toast(`${res?.code}:${res?.error}`,{ type: 'error' })
        }
        // log.info(
        //   '%cGet Vertex Response',
        //   'background: purple; color: white; display: block;',
        //   res,
        // )
      }
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
    }
    return res
  }
}

function create({ pageName, apiObject, dispatch }) {
  return async function sendCreateVertex(name) {
    const { dataKey, dataIn, dataOut } = cloneDeep(apiObject || {})
    const { deat, ...currentVal } = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: {
        dataKey: dataIn ? dataIn : dataKey,
        pageName,
      },
    })
    let { id,_handledCode, ...populatedCurrentVal } = await dispatch({
      type: c.dispatchActionType.POPULATE_OBJECT,
      payload: { object: currentVal, pageName, copy: true },
    })
    if (!isPopulated(id)) {
      const err = new UnableToLocateValue(
        `Missing reference ${id} at page ${pageName}`,
      )
      return log.error(err)
    }

    let mergedVal = populatedCurrentVal
    if (name) {
      mergedVal = mergeDeep(mergedVal, { name })
    }

    const { api, store: storeProp, get, ...options } = mergedVal
    let res
  
    //If id is in apiObject it is an update request
    if (id) {
      try {
        if (_TEST_) {
          log.info(
            '%cUpdate Vertex Request',
            'background: purple; color: white; display: block;',
            { ...options, id },
          )
        }

        if (options['type']) {
          options['type'] = parseInt(options?.type)
        }
        if (options['tage']) {
          options['tage'] = parseInt(options?.tage)
        }
        if(deat){
          options['deat'] = deat
        }
        if(!options['pk'] && !options['esk'] && [20,21,30].includes(options['type'])){
            const parentSK = getParentSK(options['type'])
            const pw = `${parentSK}${id}`
            const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
            const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithParentSK({
              secretKey,
              password: pw,
            })
            options['pk'] = store.level2SDK.utilServices.uint8ArrayToBase64(publicKey)
            options['esk'] = store.level2SDK.utilServices.uint8ArrayToBase64(encryptedSecretKey)
        }
        const { data } = await store.level2SDK.vertexServices.updateVertex({
          ...options,
          id,
        })
        res = data
        if (_TEST_) {
          if(_handledCode){
            const errorCodes = getHandedCode(_handledCode)
            res?.code && errorCodes[0]!=='all'&& !(errorCodes.indexOf(res?.code)!==-1)&& toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }else{
            res?.code && toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }
          log.info(
            '%cUpdate Vertex Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      } catch (error) {
        throw error
      }
    } else {
      if (options['type']) {
        options['type'] = parseInt(options?.type)
      }
      if (options['tage']) {
        options['tage'] = parseInt(options?.tage)
      }

      //TODO: check data store to see if object already exists. if it does call update instead to avoid poluting the database
      try {
        if (_TEST_) {
          log.info(
            '%cCreate Vertex Request',
            'background: purple; color: white; display: block;',
            { ...options },
          )
        }

        let response = await store.level2SDK.vertexServices.createVertex({
          ...options,
        })

        res = response
        const vertex = response?.data?.vertex
        if(vertex && !vertex.esk && !vertex.pk && [20,21,30].includes(options['type'])){
          const parentSK = getParentSK(options['type'])
          const id = store.level2SDK.utilServices.uint8ArrayToBase64(vertex?.id)
          const pw = `${parentSK}${id}`
          const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
          const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithParentSK({
            secretKey,
            password: pw,
          })
          options['pk'] = store.level2SDK.utilServices.uint8ArrayToBase64(publicKey)
          options['esk'] = store.level2SDK.utilServices.uint8ArrayToBase64(encryptedSecretKey)
          const { data } = await store.level2SDK.vertexServices.updateVertex({
            ...options,
            id: vertex?.id,
          })
          res = {data:data}
        }

        if (!_TEST_) {
          if(_handledCode){
            const errorCodes = getHandedCode(_handledCode)
            res?.code && errorCodes[0]!=='all'&& !(errorCodes.indexOf(res?.code)!==-1)&& toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }else{
            res?.code && toast(`${res?.code}:${res?.error}`,{ type: 'error' })
          }
          log.info(
            '%cCreate Vertex Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      } catch (error) {
        throw error
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
    }
    return res
  }
}
