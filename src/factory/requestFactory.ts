import * as u from '@jsmanifest/utils'
import curry from 'lodash/curry'
import cloneDeep from 'lodash/cloneDeep'
import type CADL from '../CADL'
import getIdList from '../utils/getIdList'
import isPopulated from '../utils/isPopulated'
import log from '../utils/log'
import store from '../common/store'
import { _TEST_ } from '../utils/common'
import { mergeDeep } from '../utils'

import * as c from '../constants'

const logStyle = `background: purple; color: white; display: block;`
const logMsg = (msg = '', opts?: any) =>
  u.isObj(msg) ? log.debug(msg) : log.debug(msg, logStyle, opts)

function createRequestFactory({ dispatch }: { dispatch: CADL['dispatch'] }) {
  function getCache(cacheIndex: string | number) {
    return Promise.resolve(
      dispatch({
        type: c.dispatchActionType.GET_CACHE,
        payload: { cacheIndex },
      }),
    )
  }

  function getData(payload: { pageName?: string; dataKey?: any }) {
    return Promise.resolve(
      dispatch({ type: c.dispatchActionType.GET_DATA, payload }),
    )
  }

  function isNoodlTestEnv() {
    return store.env === 'test'
  }

  function populateObject(payload: {
    object: any
    pageName?: string
    copy?: boolean
  }) {
    return Promise.resolve(
      dispatch({ type: c.dispatchActionType.POPULATE_OBJECT, payload }),
    )
  }

  function setCache(cacheIndex: string | number, data: any) {
    return Promise.resolve(
      dispatch({
        type: c.dispatchActionType.SET_CACHE,
        payload: { data, cacheIndex },
      }),
    )
  }

  function updateData(dataKey: string, data: any, pageName = '') {
    const payload = { dataKey, data } as Record<string, any>
    pageName && (payload.pageName = pageName)
    return Promise.resolve(
      dispatch({ type: c.dispatchActionType.UPDATE_DATA, payload }),
    )
  }

  const requestFactory = curry(
    async (
      kind: 'edge' | 'doc' | 'vertex',
      {
        apiObject,
        name,
        pageName,
      }: {
        apiObject: {
          api: string
          dataKey?: any
          dataIn?: any
          dataOut?: any
        } & Record<string, any>
        name?: Record<string, any>
        pageName: string
      },
    ) => {
      let label = kind[0].toUpperCase() + kind[1].slice()
      let { api, dataKey, dataIn, dataOut, ...reqOptions } = cloneDeep(
        apiObject || {},
      )

      let data: any
      let idList: string[] | Uint8Array[] = []
      let nonce: number | undefined
      let res: Record<string, any> = {}
      let sCondition: string = reqOptions?.sCondition || ''

      data = await getData({ pageName, dataKey: dataIn || dataKey })
      data = await populateObject({
        object: data,
        pageName,
        copy: true,
      })

      let { deat, id, _nonce, ...updates } = data

      u.isNum(_nonce) && (nonce = _nonce)

      if (!isPopulated(id)) {
        log.error(
          new Error(
            `Missing reference ${id} ${pageName ? `on page ${pageName}` : ''}`,
          ),
        )
      }

      name && (data = mergeDeep(data, { name }))
      idList = getIdList(id)
      reqOptions = { ...reqOptions, ...updates }
      sCondition = updates?.sCondition
      const storeProp = data?.store
      let reqKind: 'GET' | 'DELETE' | 'UPDATE' | '' = ''

      try {
        // If an id came in it is an update request
        if (id) {
          reqKind = 'UPDATE'
        }

        if (!_TEST_ && isNoodlTestEnv()) {
          logMsg(`[GET] ${label}`, { idList, reqOptions })
        }

        if (sCondition) {
          reqOptions.scondition = sCondition
        }

        // Buffer check
        const { pass: shouldPass, cacheIndex } = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: {
            apiObject: { idList, options: reqOptions, nonce },
          },
        })

        if (!shouldPass) {
          res = await getCache(cacheIndex)

          if (!_TEST_ && isNoodlTestEnv()) {
            const s = 'background:#7268A6; color: white; display: block;'
            log.debug(`[Using Cached Data] ${label}`, s, apiObject)
          }
        } else {
          if (reqOptions.sCondition) {
            reqOptions.scondition = reqOptions.sCondition
            delete reqOptions.sCondition
          }

          const { data } = await store.level2SDK.vertexServices.retrieveVertex({
            idList,
            options: reqOptions,
          })

          await setCache(cacheIndex, data)

          res = data

          if (!_TEST_ && store.env === 'test') {
            log.info(
              '%cGet Vertex Response',
              'background: purple; color: white; display: block;',
              res,
            )
          }
        }
      } catch (error) {
        if (error instanceof Error) throw error
        throw new Error(String(error))
      }

      res.jwt && (await updateData('Global.currentUser.JWT', res.jwt))
      await updateData(dataOut || dataKey, res, pageName)
      return res
    },
  )

  return requestFactory
}

export default createRequestFactory
