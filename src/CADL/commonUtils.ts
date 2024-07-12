import * as u from '@jsmanifest/utils'
import clone from 'lodash/clone'
import type CADL from './CADL'
import isPopulated from '../utils/isPopulated'
import log from '../utils/log'
import services from './services'
import * as edgeServices from './services/edges'
import * as vertexServices from './services/vertexes'
import * as documentServices from './services/documents'
import * as builtInServices from './services/builtIn'
import * as remove from './services/remove'

export {
    createFuncAttacher,
}
/**
 * Attaches ecos functions to api objects.
 *
 * There are two kinds of API objects.
 *
 * There are objects who have an "api" property where the value is an eCOS method
 *
 * @example
 * ```
 * const apiObject = { api: 'ce', dataIn: {...}, dataOut: {...} }
 * ```
 *
 * And there are objects who are references to builtIn functions
 *
 * @example
 *
 * ```
 * const builtInReference = {
 * 	'=.builtIn.string.equal': {
 *			dataIn: {...},
 *			dataOut: {...}
 *   }
 * }
 * ```
 *
 * @param cadlObject
 * @param dispatch
 * @returns The object with functions attached to it.
 */
 function createFuncAttacher({
    cadlObject,
    dispatch,
    force = false,
  }: {
    cadlObject: Record<string, any>
    dispatch: CADL['dispatch']
    force?: boolean
  }): Record<string, any> {
    let keys = u.keys(cadlObject)
    let pageName = keys.length > 1 ? 'Global' : keys[0]
  
    return attachFnsHelper({
      pageName,
      cadlObject,
      dispatch,
      force,
    })
  
    function attachFnsHelper({
      pageName,
      cadlObject,
      dispatch,
      force = false,
    }: {
      pageName: string
      cadlObject: Record<string, any>
      dispatch: Function
      force?: boolean
    }): Record<string, any> {
      // Traverse through the page object and look for the api keyword
      let output = cadlObject
      if (pageName === 'Global' && !force) return output
  
      if (u.isObj(output)) {
        u.keys(output).forEach((key) => {
          if (u.isObj(output[key])) {
            output[key] = attachFnsHelper({
              pageName,
              cadlObject: output[key],
              dispatch,
            })
          } else if (u.isArr(output[key])) {
            const copy = [...output[key]]
            // debugger
            output[key].length = 0
            for (let item of copy) {
              if (u.isObj(item)) {
                item = attachFnsHelper({ pageName, cadlObject: item, dispatch })
              }
              output[key].push(item)
            }
          } else if (u.isStr(output[key]) && key === 'api') {
            const pathToNameField = `${
              output.dataOut || output.dataKey || ''
            }.name`
            // When api keyword is found we attach the ecos function
            const { api, _nonce, ...restOptions } = output
            // Have this because api can be of shape 'builtIn.***'
            const apiSplit = api.split('.')
            const apiType = apiSplit[0]
            const apiFunc = services(apiType)({
              pageName,
              apiObject: output,
              dispatch,
            })
  
            if (/(ce|cd|cv|builtIn)/.test(apiType)) {
              if (isPopulated(output)) output = [pathToNameField, apiFunc]
            } else {
              if (isPopulated(restOptions)) {
                const args = { pageName, apiObject: output, dispatch }
                output = services(apiType)(args)
              }
            }
          }
        })
      }
  
      return output
    }
  }
  
  export const createFuncAttacher2 = (function () {
    const fns = {
      ce: edgeServices.create,
      re: edgeServices.get,
      cv: vertexServices.create,
      rv: vertexServices.get,
      cd: documentServices.create,
      rd: documentServices.get,
      dx: remove.remove,
      builtIn: builtInServices.builtIn,
    }
  
    function getPageName(obj: Record<string, any>) {
      const keys = u.keys(obj)
      return keys.length > 1 ? 'Global' : keys[0]
    }
  
    const isApiKeyPair = (key = '', value: any) => u.isStr(value) && key === 'api'
  
    function hashParams(obj) {
      return `${obj.dataOut || obj.dataKey}.name`
    }
  
    const cache = {
      prepare: {},
    } as Record<string, any>
  
    function attach({
      pageName = '',
      cadlObject,
      dispatch,
      force = false,
    }: {
      pageName: string
      cadlObject: Record<string, any>
      dispatch: CADL['dispatch']
      force?: boolean
    }) {
      // Traverse through the page object and look for the api keyword
      let output = cadlObject
      if (pageName === 'Global' && !force) return output
  
      if (u.isObj(output)) {
        for (const [key, value] of u.entries(output)) {
          // Attach the ecos request function
          if (isApiKeyPair(key, value)) {
            const pathToNameField = hashParams(output)
  
            // param1 = json arr
            // param2 = name list / common seperated properteis (picked from the obj)
  
            if (!cache[pathToNameField]) {
              cache[pathToNameField] = isPopulated(output)
                ? [
                    pathToNameField,
                    fns[value]({ pageName, apiObject: output, dispatch }),
                  ]
                : // @ts-expect-error
                  fns[api]({ pageName, apiObject: output, dispatch })
  
              if (/(ce|cd|cv|builtIn)/.test(value)) {
                // @ts-expect-error
                if (isPopulated(output)) output = [pathToNameField, apiFunc]
              } else {
                // @ts-expect-error
                if (isPopulated(restOptions)) {
                  // @ts-expect-error
                  output = fns[api]({ pageName, apiObject: output, dispatch })
                }
              }
            }
  
            const { api, _nonce, ...restOptions } = output
            const apiFunc = fns[api]({ pageName, apiObject: output, dispatch })
  
            if (/(ce|cd|cv|builtIn)/.test(api)) {
              if (isPopulated(output)) output = [pathToNameField, apiFunc]
            } else {
              if (isPopulated(restOptions)) {
                output = fns[api]({ pageName, apiObject: output, dispatch })
              }
            }
            continue
          }
  
          if (u.isArr(value) || u.isObj(value)) {
            attach({ pageName, cadlObject: value, dispatch })
          }
        }
      } else if (u.isArr(output)) {
        u.forEach((o) => attach({ pageName, cadlObject: o, dispatch }), output)
      }
  
      return output
    }
  
    function attachFns({
      cadlObject,
      dispatch,
      force = false,
    }: {
      cadlObject: Record<string, any>
      dispatch: CADL['dispatch']
      force?: boolean
    }): Record<string, any> {
      const pageName = getPageName(cadlObject)
      return attach({
        pageName,
        cadlObject,
        dispatch,
        force,
      })
    }
  
    return attachFns
  })()