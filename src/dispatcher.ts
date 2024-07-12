import * as u from '@jsmanifest/utils'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import sha256 from 'crypto-js/sha256'
import Base64 from 'crypto-js/enc-base64'
import moment from 'moment'
import type CADL from './CADL'
import { bridge, isCapitalized } from './utils/common'
// import basicExtraction from './db/utils/KeyExtraction/BasicAlgorithm'
import {
  populateObject,
  replaceUint8ArrayWithBase64,
} from './CADL/utils'
import { createFuncAttacher } from './CADL/commonUtils'
import store from './common/store'
import log from './utils/log'
// import FuzzyIndexCreator from './db/utils/FuzzyIndexCreator'
import * as c from './constants'
import * as t from './types'
import has from 'lodash/has'


function getDispatcher(cadl: CADL) {
  const handleDispatch = {
    [c.dispatchActionType.ADD_FUNCTION]: async ({
      payload,
    }: {
      payload: t.DispatchPayload.AddFunction
    }) => {
      // Actions for page currently used for signIn
      const { pageName = '', fn } = payload
      if (cadl.root.actions[pageName]) {
        const payload = { dataKey: `actions.${pageName}.update`, value: fn }
        cadl.emit({ type: c.emitType.SET_VALUE, payload })
      } else {
        cadl.emit({
          type: c.emitType.SET_VALUE,
          payload: { dataKey: `actions.${pageName}`, value: { update: fn } },
        })
      }
    },
    [c.dispatchActionType.EVAL_OBJECT]: async ({
      payload,
    }: {
      payload: t.DispatchPayload.EvalObject
    }) => {
      /**
       * Handles the following cases
       *
       * case 1: Assignment expression
       * {'.key@':3}
       *
       *  * The left-hand side ('.key@') denotes the path that will be updated with the corresponding value on the right (3)
       *  * '@' must be present after the path for the expression to be evaluated successfully
       *
       * case 2: Evaluating eval builtIn functions
       * {
       *   '=.builtIn.add: {
       *     dataIn: { val1:1, val2: 3 },
       *     dataOut: '.path'
       *   }
       * }
       *  * The program knows cadl is a function to be evaluated because of the '=' at the start of the key.
       *  * It will will find the reference to the function at the given path, then apply the given arguments (dataIn)
       *
       * case 3: If blocks
       *
       *  * The program runs handleIfCommand if it notices that there is an 'if' key
       *
       */
      try{
        let { pageName = '', updateObject } = payload
        let results: any
  
        if (u.isStr(updateObject)) {
          // Handles possible missing references
          updateObject = await cadl.handleEvalString({
            stringArg: updateObject,
            pageName,
          })
        }
  
        if (u.isObj(updateObject)) {
          results = await cadl.handleEvalObject({
            object: updateObject,
            pageName,
          })
        } else if (u.isArr(updateObject)) {
          // Handles shape:
          // [{'.path@':3}, {'path2@':5}, {if:['.condition', ifTrue, ifFalse]}]
          results = await cadl.handleEvalArray({
            array: updateObject,
            pageName,
          })
        }
      return results

      } catch (error) {
        log.error(error instanceof Error ? error : new Error(String(error)))
        throw error;
      }
      

      // NOTE: Global is instantiated once unlike other pages that are instantiated multiple times
      // await cadl.dispatch({
      //   type: c.dispatchActionType.POPULATE,
      //   payload: { pageName: 'Global' },
      // })
      // await cadl.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
    },
    // [c.dispatchActionType.FONTDB_OPREATE]: async ({
    //   payload,
    // }: {
    //   payload: t.DispatchPayload.FontDbOpreate
    // }) => {
    //   const funcName = payload?.funcName
    //   if (funcName) {
    //     switch (funcName) {
    //       case 'getLastestDocsByType':
    //         return cadl.indexRepository.getLastestDocsByType(payload)
    //       case 'getAllDocsByType':
    //         return cadl.indexRepository.getAllDocsByType(payload)
    //     }
    //   }
    // },
    [c.dispatchActionType.GET_CACHE]: ({
      payload,
    }: {
      payload: t.DispatchPayload.GetCache
    }) => {
      return cadl.getApiCache(payload.cacheIndex)
    },
    [c.dispatchActionType.HAS_CACHE]: ({
      payload,
    }: {
      payload: t.DispatchPayload.GetCache
    }) => {
      return has(cadl.root.apiCache, payload.cacheIndex)
    },
    async [c.dispatchActionType.GET_DATA]({
      payload: { dataKey = '', pageName = '' } = {},
    }: {
      payload: t.DispatchPayload.GetData
    }) {
      if (!dataKey) return
      const pathArr = dataKey.split('.')
      return bridge(get(cadl.root[pageName], pathArr), () =>
        get(cadl.root, pathArr),
      )
    },
    [c.dispatchActionType.IF_OBJECT]: async ({
      payload,
    }: {
      payload: t.DispatchPayload.IfObject
    }) => {
      return cadl.handleIfCommand({
        pageName: payload?.pageName || '',
        ifCommand: payload?.updateObject,
      })
    },
    // [c.dispatchActionType.INSERT_TO_INDEX_TABLE]: async ({
    //   payload,
    // }: {
    //   payload: t.DispatchPayload.InsertToIndexTable
    // }) => {
    //   //log.debug('insert index payload!!!', payload)
    //   let doc: any = []
    //   if (u.isArr(payload.doc?.doc)) {
    //     doc = payload.doc?.doc
    //   } else {
    //     // for adding new doc
    //     doc = payload.doc
    //   }

    //   for (let item of u.filter(Boolean, u.array(doc))) {
    //     let content = item?.name
    //     const contentAfterExtraction = basicExtraction(content)

    //     const fuzzyIndexCreator = new FuzzyIndexCreator()
    //     let docId = item?.id
    //     if (docId instanceof Uint8Array) {
    //       docId = store.level2SDK.utilServices.uint8ArrayToBase64(docId)
    //     }
    //     for (let key of contentAfterExtraction) {
    //       const initialMapping = fuzzyIndexCreator.initialMapping(key)
    //       const fKey = fuzzyIndexCreator.toFuzzyInt64(initialMapping)
    //       //const fKeyHex = fuzzyIndexCreator.toFuzzyHex(initialMapping)
    //       cadl.indexRepository.insertIndexData({
    //         // kText: key,
    //         // id: docId,
    //         // docId,
    //         // docType: item.type,
    //         // fuzzyKey: initialMapping,
    //         // initMapping: initialMapping,
    //         // fKey,
    //         // fKeyHex,
    //         // score: 0,
    //         kText: key,
    //         docId,
    //         docType: item.type,
    //         fKey,
    //         score: 0,
    //         mtime: item.mtime,
    //       })
    //       //log.debug('insert to index table!!!', fKey, initialMapping, fKeyHex)
    //     }
    //   }
    // },
    // [c.dispatchActionType.INSERT_TO_OBJECT_TABLE]: async ({
    //   payload,
    // }: {
    //   payload: t.DispatchPayload.InsertToObjectTable
    // }) => {
    //   //yuhan
    //   //log.debug('insert object payload!!!', action.payload)
    //   const doc = payload.doc
    //   let docId = doc.id
    //   if (docId instanceof Uint8Array) {
    //     docId = store.level2SDK.utilServices.uint8ArrayToBase64(docId)
    //   }
    //   const isInObjectCache = cadl.indexRepository.getDocById(docId)
    //   if (isInObjectCache?.length) return
    //   const cachedDoc = cadl.indexRepository.getDocById(docId)
    //   if (!cachedDoc?.length) {
    //     cadl.indexRepository.cacheDoc(doc)
    //   }
    // },
    async [c.dispatchActionType.POPULATE]({
      payload,
    }: {
      payload: t.DispatchPayload.Populate
    }) {
      let pageName = payload?.pageName || ''
      let obj = cloneDeep(cadl.root[pageName])

      for (const op of ['.', '..', '~']) {
        obj = populateObject({
          source: obj,
          lookFor: op,
          locations: op == '~' ? [cadl] : [cadl.root, cadl.root[pageName]],
        })
      }

      obj = createFuncAttacher({
        cadlObject: obj,
        dispatch: cadl.dispatch.bind(cadl),
      })

      cadl.emit({
        type: c.emitType.SET_ROOT_PROPERTIES,
        payload: { properties: { [pageName]: obj } },
      })

      await cadl.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
    },
    async [c.dispatchActionType.POPULATE_OBJECT]({
      payload: { copy = false, object, pageName = '' } = {},
    }: {
      payload: t.DispatchPayload.PopulateObject
    }) {
      let populatedObject: any
      let sourceObject = copy ? cloneDeep(object) : object
      populatedObject = populateObject({
        source: sourceObject,
        lookFor: ['=', '..', '.'],
        locations: [cadl.root, cadl.root[pageName]],
      })

      return populatedObject
    },
    // async [c.dispatchActionType.SEARCH_CACHE]({
    //   payload: { key = '', sCondition = '' } = {},
    // }: {
    //   payload: t.DispatchPayload.SearchCache
    // }) {
    //   return await cadl.indexRepository.search(key, sCondition)
    // },
    async [c.dispatchActionType.SET_API_BUFFER]({
      payload,
    }: {
      payload: t.DispatchPayload.SetApiBuffer
    }) {
      const apiObject = payload?.apiObject
      try {
        let limit = store.env === 'test' ? 600 : 600
        let hash = Base64.stringify(sha256(JSON.stringify(apiObject)))
        let currentTimestamp = moment(Date.now())
        let apiDispatchBufferObject = cadl.root.apiCache
        let pass = false

        if (!(hash in apiDispatchBufferObject)) {
          // If request has not been made (hash undefined) request continues
          pass = true
        } else {
          //if similar request has been made (hash exists)
          //compare recorded timestamp with current timestamp
          const oldTimestamp = moment(apiDispatchBufferObject[hash]?.timestamp)
          const _cacheTime = apiDispatchBufferObject[hash]?.cacheTime
          const cacheTime:number = _cacheTime?_cacheTime:600
          const timeDiff = currentTimestamp.diff(oldTimestamp, 'seconds')
          if (timeDiff > cacheTime) {
            apiDispatchBufferObject[hash].timestamp =
              currentTimestamp.toString()
            pass = true
          } else {
            apiDispatchBufferObject[`${hash}FAILED_REPEAT`] = {
              timestamp: currentTimestamp.toString(),
              request: apiObject,
            }
            pass = false
          }
        }
        // Remove old values
        for (let [key, val] of u.entries(apiDispatchBufferObject)) {
          const _cacheTime = val?.cacheTime
          const cacheTime = _cacheTime?_cacheTime:600
          const timeDiff = currentTimestamp.diff(val?.timestamp, 'seconds')
          // if(!val?.type){
          //   if (timeDiff > limit) delete apiDispatchBufferObject[key]
          // }else{
          //   if (timeDiff > 60*60) delete apiDispatchBufferObject[key]
          // }
          if (timeDiff > cacheTime) delete apiDispatchBufferObject[key]
        }
        return { pass, cacheIndex: hash }
      } catch (error) {
        log.error(error instanceof Error ? error : new Error(String(error)))
        return { pass: false, cacheIndex: hash }
      }
    },
    async [c.dispatchActionType.SET_ENCRYPT_BUFFER]({
      payload,
    }: {
      payload: t.DispatchPayload.SetApiBuffer
    }) {
      const apiObject = payload?.apiObject
      try {
        let hash = Base64.stringify(sha256(JSON.stringify(apiObject)))
        let apiDispatchBufferObject = cadl.root.apiCache
        let pass = false

        if (!(hash in apiDispatchBufferObject)) {
          // If request has not been made (hash undefined) request continues
          pass = true
        } else {
          //if similar request has been made (hash exists)
          //compare recorded timestamp with current timestamp
          pass = false
        }
        return { pass, cacheIndex: hash }
      } catch (error) {
        log.error(error instanceof Error ? error : new Error(String(error)))
        return { pass: false, cacheIndex: hash }
      }
    },
    async [c.dispatchActionType.SET_CACHE]({
      payload,
    }: {
      payload: t.DispatchPayload.SetCache
    }) {
      cadl.emit({ type: c.emitType.SET_CACHE, payload })
    },
    async [c.dispatchActionType.DELETE_CACHE]({
      payload,
    }: {
      payload: t.DispatchPayload.DeleteCache,
    }) {
      cadl.emit({ type: c.emitType.DELETE_CACHE, payload })
    },
    async [c.dispatchActionType.UPDATE_DATA]({
      payload,
    }: {
      payload: t.DispatchPayload.UpdateData
    }) {
      let { pageName = '', dataKey, data: rawData } = payload || {}
      let data = replaceUint8ArrayWithBase64(rawData)
      let pathArr = dataKey ? dataKey.split('.') : ''

      if (pageName === 'builtIn') {
        cadl.emit({
          type: c.emitType.SET_VALUE,
          payload: { dataKey: pathArr, value: data },
        })
      } else if (!dataKey) {
        return
      } else {
        let isRoot = isCapitalized(dataKey)
        let currentVal = get(isRoot ? cadl.root : cadl.root[pageName], pathArr)
        let mergedVal: any
        let shouldReplace = false

        if (u.isArr(currentVal)) {
          mergedVal = u.array(data)
        } else if (isRoot) {
          mergedVal = u.isArr(data) ? data[0] : data
        } else if (u.isObj(currentVal) && u.isArr(data)) {
          mergedVal = !data.length
            ? currentVal
            : (data.length == 1 && data[0]) || undefined
        } else {
          mergedVal = data
        }

        if (mergedVal?.jwt) {
          for (const kind of ['doc', 'edge', 'vertex']) {
            if (u.isArr(mergedVal[kind]) && !mergedVal[kind].length) {
              shouldReplace = true
              break
            }
          }
        }

        const payload = {
          dataKey: pathArr,
          value: mergedVal,
          replace: shouldReplace,
        } as any

        if (!isRoot) payload.pageName = pageName
        cadl.emit({ type: c.emitType.SET_VALUE, payload })
      }
      await cadl.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
    },
    [c.dispatchActionType.UPDATE_LOCAL_STORAGE]: async () => {
      if (u.isBrowser()) {
        // Only add the Global object if user is loggedIn
        // const esk = localStorage.getItem('esk')
        // if (esk) {
          const { globalRegister, ...rest } = cadl.root?.Global || {}
          localStorage.setItem('Global', JSON.stringify(rest))
        // }
      }
    },
    // [c.dispatchActionType.PULL_INDEX_TABLE]: async ({ payload }) => {
    //   const personalIndexCtr = cadl.indexRepository.PersonalIndexCtr
    //   if (personalIndexCtr?.indexTablesDao) {
    //     let rootNoteBookId = await dispatch({
    //       type: c.dispatchActionType.GET_DATA,
    //       payload: {
    //         dataKey: 'Global.currentUser.vertex.deat.rnb64ID',
    //       },
    //     })
    //     const update_index = async () => {
    //       await personalIndexCtr.restorePI()
    //     }
    //     if (cadl?.config?.platform && cadl?.config?.platform === 'admin') {
    //       rootNoteBookId = await personalIndexCtr.getAdminConnectedEdgeId()
    //     }
    //     personalIndexCtr.setRootNoteBookId(rootNoteBookId)
    //     cadl?.config?.platform === 'admin' && payload?.isAdmin && update_index()
    //     if (!cadl?.config?.platform || cadl?.config?.platform !== 'admin') {
    //       update_index()
    //     }
    //   }
    // },
    // [c.dispatchActionType.PUSH_INDEX_TABLE]: async () => {
    //   const personalIndexCtr = cadl.indexRepository.PersonalIndexCtr
    //   if (personalIndexCtr?.indexTablesDao) {
    //     const update_index = async () => {
    //       await personalIndexCtr.backUpPI()
    //     }
    //     update_index()
    //   }
    // },
    [c.dispatchActionType.CLEAR_ROOT]: async () => {
      let actions = get(cadl,"root.actions");
      let builtIn = get(cadl,"root.builtIn");
      let extendedBuiltIn = get(cadl,'root.extendedBuiltIn')
      let getConsumerOptions = get(cadl,'root.getConsumerOptions')
      let localForage = get(cadl,'root.localForage')
      let Config = get(cadl,'root.Config')
      let apiCache = get(cadl,'root.apiCache')
      set(cadl,'root',{});
      set(cadl,"root.actions",actions);
      set(cadl,"root.builtIn",builtIn);
      set(cadl,"root.extendedBuiltIn",extendedBuiltIn);
      set(cadl,"root.localForage",localForage);
      set(cadl,"root.Config",Config);
      set(cadl,"root.apiCache",apiCache);
      set(cadl,'root.getConsumerOptions',getConsumerOptions);
    },
    [c.dispatchActionType.GET_CADLENDPOINT]: async () => {
      let cadlEndpoint = get(cadl,"cadlEndpoint");
      return cadlEndpoint
    },
  }

  const dispatch: t.Dispatch<t.DispatchPayload> = (action) => {
    return handleDispatch[action?.type]?.(action)
  }

  return dispatch
}

export default getDispatcher
