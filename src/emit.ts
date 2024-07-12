import produce, {
  current as getCurrentDraft,
  original as getOriginalDraft,
} from 'immer'
import get from 'lodash/get'
import set from 'lodash/set'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import moment from 'moment'
import * as u from '@jsmanifest/utils'
import * as c from './constants'
import * as t from './types'
import { mergeDeep } from './utils'

// const wrap = (a) => (orig, fn) => {
//   a(orig, fn(orig))
//   return orig
// }
// const fake = wrap((fn) => (root) => void fn(root))

function getEmitter<O extends Record<string, any> = Record<string, any>>(
  fn: (callback: (obj: O) => O) => O,
) {
  const emit = function emit<
    P extends Record<string, any> = Record<string, any>,
  >({ type, payload }: { type: t.EmitType; payload: P }) {
    return fn((obj) => {
      if(type === c.emitType.SET_VALUE) {
        
        return (()=>{     
          const { pageName, dataKey, value, replace } = payload
          let isHasDollar: boolean = false
          let cutDollar: boolean = false
          let lastLen = 0
          if(u.isArr(dataKey)){
            isHasDollar = dataKey.includes('$')
            if(isHasDollar) dataKey.pop()
          }
          let currVal: any
          let newVal = cloneDeep(value)
          if (!replace) {
            //used to merge new value to existing value ref
            if (u.isUnd(pageName)) {
              currVal = get(obj, dataKey)
            } else {
              currVal = get(obj[pageName], dataKey)
            }
          }
          if(isHasDollar && u.isArr(currVal)){
            lastLen = currVal.length - 1
            cutDollar = true
          }
          
          if(JSON.stringify(currVal) === JSON.stringify(newVal)) return obj;
          
          let rootDeepCopy = obj
          
          if (u.isObj(currVal) && u.isObj(newVal)) {
            if ('doc' in newVal) {
              // {} --> []
              if (!u.isArr(currVal.doc) && u.isArr(newVal.doc)) {
                const currValDoc = currVal.doc
                currVal.doc = []
                // We are merging multiple docs with the current doc. Add in the curr doc if it
                // doesn't exist in the incoming list of docs
                if (
                  currValDoc?.id &&
                  u.isStr(currValDoc.id) &&
                  !newVal.doc.every((d) => d?.id === currValDoc.id)
                ) {
                  currVal.doc.push(currValDoc)
                }
                currVal.doc.push(...newVal.doc)
              }
              // {} --> {}
              else if (!u.isArr(currVal.doc) && u.isObj(newVal.doc)) {
                currVal.doc = newVal.doc
              } else if ('id' in currVal) {
                newVal = mergeDeep(currVal, newVal.doc)
              } else {
                currVal.doc.length = 0
                currVal.doc.push(...newVal.doc)
              }
            }else if('edge' in newVal){
              // {} --> []
              if (!u.isArr(currVal.edge) && u.isArr(newVal.edge)) {
                currVal.edge = []
                const currValDoc = currVal.edge
                // We are merging multiple docs with the current doc. Add in the curr doc if it
                // doesn't exist in the incoming list of docs
                if (
                  currValDoc?.id &&
                  u.isStr(currValDoc.id) &&
                  !newVal.edge.every((d) => d?.id === currValDoc.id)
                ) {
                  currVal.edge.push(currValDoc)
                }
                currVal.edge.push(...newVal.edge)
              }
              // {} --> {}
              else if (!u.isArr(currVal.edge) && u.isObj(newVal.edge)) {
                currVal.edge = newVal.edge 
              } else if ('id' in currVal) {
                newVal = mergeDeep(currVal, newVal.edge)
              } else {
                currVal.edge = []
                // currVal.edge.length = 0
                if(u.isArr(newVal.edge)) currVal.edge.push(...newVal.edge) 
                else currVal.edge = newVal.edge
              }
            }else if(Object.keys(newVal).length === 0){
              newVal = u.cloneDeep(newVal)
              if (typeof pageName === 'undefined') {
                if(cutDollar){
                  set(rootDeepCopy,[...dataKey,lastLen], newVal)
                }else{
                  set(rootDeepCopy, dataKey, newVal)
                }
                
              } else {
                if(cutDollar){
                  set(rootDeepCopy[pageName], [...dataKey,lastLen], newVal)
                }else{
                  set(rootDeepCopy[pageName], dataKey, newVal)
                }
              }
            } else {
              newVal = merge(currVal, newVal)
            }
          } else if (u.isArr(currVal) && u.isArr(newVal)) {
            // If they are not the same reference, we must update the data in this array without losing the reference.
            if (currVal !== newVal) {
              currVal.length = 0
              currVal.push(...newVal)
            }
          } else if (typeof pageName === 'undefined') {
            if(cutDollar){
              set(rootDeepCopy, [...dataKey,lastLen], newVal)
            }else{
              set(rootDeepCopy, dataKey, newVal)
            }
          } else {
            if(cutDollar){
              set(rootDeepCopy[pageName], [...dataKey,lastLen], newVal)
            }else{
              set(rootDeepCopy[pageName], dataKey, newVal)
            }
          }
          // obj = deepCopy(rootDeepCopy)
          return rootDeepCopy
        })()
      } else {
        let a = produce(obj, (draft) => {
          switch (type) {
            case c.emitType.ADD_BUILTIN_FNS:
              return void u.forEach(
                ([key, val]) => set(draft['builtIn'], key, val),
                u.entries(payload.builtInFns),
              )
            case c.emitType.DELETE_PAGE:
              return void delete draft[payload.pageName]
            case c.emitType.EDIT_DRAFT:
              return void payload?.callback?.(draft, {
                getCurrent: getCurrentDraft,
                getOriginal: getOriginalDraft,
              })
            case c.emitType.SET_CACHE:
              const { cacheIndex, data,cacheTime } = payload
              const _cacheTime = cacheTime?cacheTime:600
              if(payload?.type){
                const currentTimestamp = moment(Date.now()).toString()
                return void set(draft['apiCache'], cacheIndex, {
                  data,
                  timestamp: currentTimestamp,
                  type: payload.type,
                  cacheTime: _cacheTime
                })
              }else{
                const currentTimestamp = moment(Date.now()).toString()
                return void set(draft['apiCache'], cacheIndex, {
                  data,
                  timestamp: currentTimestamp,
                  cacheTime: _cacheTime
                })
              }
            case c.emitType.DELETE_CACHE: {
              const { cacheIndex } = payload
              delete draft['apiCache'][cacheIndex]
              break
            }
            case c.emitType.SET_LOCAL_PROPERTIES:
            case c.emitType.SET_ROOT_PROPERTIES: {
              u.entries(payload.properties).forEach(([k, v]) => {
                set(
                  type === c.emitType.SET_ROOT_PROPERTIES
                    ? draft
                    : draft[payload.pageName],
                  k,
                  v,
                )
              })
              break
            }
            default:
              break
          }
        })
        return a
      }
    })
    // return fn((obj) => {
    //   let a = produce(obj, (draft) => {
    //     switch (type) {
    //       case c.emitType.ADD_BUILTIN_FNS:
    //         return void u.forEach(
    //           ([key, val]) => set(draft['builtIn'], key, val),
    //           u.entries(payload.builtInFns),
    //         )
    //       case c.emitType.DELETE_PAGE:
    //         return void delete draft[payload.pageName]
    //       case c.emitType.EDIT_DRAFT:
    //         return void payload?.callback?.(draft, {
    //           getCurrent: getCurrentDraft,
    //           getOriginal: getOriginalDraft,
    //         })
    //       case c.emitType.SET_CACHE:
    //         const { cacheIndex, data } = payload
    //         const currentTimestamp = moment(Date.now()).toString()
    //         return void set(draft['apiCache'], cacheIndex, {
    //           data,
    //           timestamp: currentTimestamp,
    //         })
    //       case c.emitType.SET_LOCAL_PROPERTIES:
    //       case c.emitType.SET_ROOT_PROPERTIES: {
    //         u.entries(payload.properties).forEach(([k, v]) => {
    //           set(
    //             type === c.emitType.SET_ROOT_PROPERTIES
    //               ? draft
    //               : draft[payload.pageName],
    //             k,
    //             v,
    //           )
    //         })
    //         break
    //       }
    //       case c.emitType.SET_VALUE:{
    //         const { pageName, dataKey, value, replace } = payload

    //         let currVal: any
    //         let newVal = value
    //         if (!replace) {
    //           //used to merge new value to existing value ref
    //           if (u.isUnd(pageName)) {
    //             currVal = get(obj, dataKey)
    //           } else {
    //             currVal = get(obj[pageName], dataKey)
    //           }
    //         }

    //         // if(JSON.stringify(currVal) === JSON.stringify(newVal)) break

    //         if (u.isObj(currVal) && u.isObj(newVal)) {
    //           if ('doc' in newVal) {
    //             // {} --> []
    //             if (!u.isArr(currVal.doc) && u.isArr(newVal.doc)) {
    //               const currValDoc = currVal.doc
    //               currVal.doc = []
    //               // We are merging multiple docs with the current doc. Add in the curr doc if it
    //               // doesn't exist in the incoming list of docs
    //               if (
    //                 currValDoc?.id &&
    //                 u.isStr(currValDoc.id) &&
    //                 !newVal.doc.every((d) => d?.id === currValDoc.id)
    //               ) {
    //                 currVal.doc.push(currValDoc)
    //               }
    //               currVal.doc.push(...newVal.doc)
    //             }
    //             // {} --> {}
    //             else if (!u.isArr(currVal.doc) && u.isObj(newVal.doc)) {
    //               currVal.doc = newVal.doc
    //             } else if ('id' in currVal) {
    //               newVal = mergeDeep(currVal, newVal.doc)
    //             } else {
    //               currVal.doc.length = 0
    //               currVal.doc.push(...newVal.doc)
    //             }
    //           }else if('edge' in newVal){
    //             // {} --> []
    //             if (!u.isArr(currVal.edge) && u.isArr(newVal.edge)) {
    //             currVal.edge = []
    //               const currValDoc = currVal.edge
    //               // We are merging multiple docs with the current doc. Add in the curr doc if it
    //               // doesn't exist in the incoming list of docs
    //               if (
    //                 currValDoc?.id &&
    //                 u.isStr(currValDoc.id) &&
    //                 !newVal.edge.every((d) => d?.id === currValDoc.id)
    //               ) {
    //                 currVal.edge.push(currValDoc)
    //               }
    //               currVal.edge.push(...newVal.edge)
    //             }
    //             // {} --> {}
    //             else if (!u.isArr(currVal.edge) && u.isObj(newVal.edge)) {
    //               currVal.edge = newVal.edge
    //             } else if ('id' in currVal) {
    //               newVal = mergeDeep(currVal, newVal.edge)
    //             } else {
    //               currVal.edge = []
    //               // currVal.edge.length = 0
    //               currVal.edge.push(...newVal.edge)
    //             }
    //           }else if(Object.keys(newVal).length === 0){
    //             newVal = u.cloneDeep(newVal)
    //             if (typeof pageName === 'undefined') {
    //               set(draft, dataKey, newVal)
    //             } else {
    //               set(draft[pageName], dataKey, newVal)
    //             }
    //           } else {
    //             newVal = merge(currVal, newVal)
    //           }
    //         } else if (u.isArr(currVal) && u.isArr(newVal)) {
    //           // If they are not the same reference, we must update the data in this array without losing the reference.
    //           if (currVal !== newVal) {
    //             currVal.length = 0
    //             currVal.push(...newVal)
    //           }
    //         } else if (typeof pageName === 'undefined') {
    //           set(draft, dataKey, newVal)
    //         } else {
    //           set(draft[pageName], dataKey, newVal)
    //         }
    //       }
    //       default:
    //         break
    //     }
    //   })
    //   return a
    // })
  }

  return emit
}

export default getEmitter
