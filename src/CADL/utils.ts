import * as u from '@jsmanifest/utils'
import * as nt from 'noodl-types'
import cloneDeep from 'lodash/cloneDeep'
import store from '../common/store'
import { defineProperty, hasPropertyDescriptor, _TEST_ } from '../utils/common'
import { UnableToLocateValue } from '../errors'
import cache from '../cache'
import mergeDeep from '../utils/mergeDeep'
import populateString from '../utils/populateString'
import setRefAccessor from '../utils/setRefAccessor'
import type { ShouldAttachRefFn } from '../types'
import * as c from '../constants'

export {
  populateKeys,
  populateString,
  populateArray,
  populateObject,
  populateVals,
  replaceUint8ArrayWithBase64,
  replaceEvalObject,
  replaceVars,
  getHandedCode,
  getParentSK,
  getPropertyPath,
  Uint8ArrayToString
}
function Uint8ArrayToString(fileData:Uint8Array){
  var dataString = "";
  for (var i = 0; i < fileData.length; i++) {
    dataString += String.fromCharCode(fileData[i]);
  }
  return dataString
}

function getPropertyPath(obj:any, targetkey:string, currentPath = '') {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const path = currentPath ? `${currentPath}.${key}` : key;
      
      if (key === targetkey) {
        return path;
      }
      
      if (typeof value === 'object' && value !== null) {
        const nestedPath = getPropertyPath(value, targetkey, path);
        if (nestedPath) {
          return nestedPath;
        }
      }
    }
  }
  return null;
}
/**
 * Merges keys in source object with objects in locations where keys match lookFor.
 *
 * @param PopulateKeysArgs
 * @param PopulateKeysArgs.source Object to populate.
 * @param PopulateKeysArgs.lookFor Symbols to lookFor in properties e.g ['..,.']
 * @param PopulateKeysArgs.locations
 * @returns Populated object.
 */
function populateKeys({
  source,
  // lookFor,
  // locations,
  root,
  localRoot
}: {
  source: Record<string, any>
  // lookFor: string
  // locations: Record<string, any>[]
  root: any,
  localRoot: any
}): Record<string, any> {
  let output = source

  Object.keys(output).forEach((key) => {
    /** optimise */
    if (key.startsWith('.')) {
      let parent = {}
      let currKey = key
      
      let location = root

      if (key.startsWith('..')) {
        location = localRoot
        currKey = currKey.slice(1)
      }

      // let locationsLen = locations.length

      // for (let location of locations) {
      // for(let i = 0;i < locationsLen; i++){
      //   let location = locations[i]
        try {
          let arr = currKey.split('.')
          let res: any

          try {
            res = arr.slice(1).reduce((o, key) => o[key], location)
          } catch (error) {
            throw new UnableToLocateValue(
              'Value not found',
              error instanceof Error ? error : new Error(String(error)),
            )
          }
          // NOTE: This block is only entered for root references
          if (res) parent = cloneDeep(res)
          // if(res) parent = deepCopy(res)
        } catch (error) {
          // if (error instanceof UnableToLocateValue) continue
          if (error instanceof UnableToLocateValue) {}
          else throw error
        }
      // }

      if (u.keys(parent).length && output[key]) {
        const mergedObjects = mergeDeep(
          // populateKeys({ source: parent, lookFor, locations: [...locations] }),
          populateKeys({ source: parent, root, localRoot }),
          populateKeys({
            source: output[key],
            root, 
            localRoot
          }),
        )
        output = { ...output, ...mergedObjects }
        delete output[key]
      } else if (u.keys(parent).length) {
        // TODO: test why it is undefined when .Edge:""
        // Check SignUp page
        delete parent[key]
        const mergedObjects = populateKeys({
          source: parent,
          root, 
          localRoot
        })
        output = mergeDeep(mergedObjects, output)
        delete output[key]
      }
    } else if (u.isObj(output[key])) {
      output[key] = populateKeys({
        source: output[key],
        root, 
        localRoot
      })
    } else if (u.isArr(output[key])) {
      const copy = [...output[key]]
      output[key].length = 0
      for (let item of copy) {
        if (u.isObj(item)) {
          item = populateKeys({
            source: item,
            root, 
            localRoot
          })
        }
        output[key].push(item)
      }
    }

    // let test = true;
    // if(lookFor == '.') test = !key.startsWith("..");
    // if (key.startsWith('.')&&test) {
    //   let parent = {}
    //   let currKey = key

    //   if (key.startsWith('..')) {
    //     currKey = currKey.slice(1)
    //   }

    //   // let locationsLen = locations.length

    //   for (let location of locations) {
    //   // for(let i = 0;i < locationsLen; i++){
    //   //   let location = locations[i]
    //     try {
    //       let arr = currKey.split('.')
    //       let res: any

    //       try {
    //         res = arr.slice(1).reduce((o, key) => o[key], location)
    //       } catch (error) {
    //         throw new UnableToLocateValue(
    //           'Value not found',
    //           error instanceof Error ? error : new Error(String(error)),
    //         )
    //       }
    //       // NOTE: This block is only entered for root references
    //       if (res) parent = cloneDeep(res)
    //       // if(res) parent = deepCopy(res)
    //     } catch (error) {
    //       // if (error instanceof UnableToLocateValue) continue
    //       if (error instanceof UnableToLocateValue) {}
    //       else throw error
    //     }
    //   }

    //   if (u.keys(parent).length && output[key]) {
    //     const mergedObjects = mergeDeep(
    //       populateKeys({ source: parent, lookFor, locations: [...locations] }),
    //       populateKeys({
    //         source: output[key],
    //         lookFor,
    //         locations: [...locations],
    //       }),
    //     )
    //     output = { ...output, ...mergedObjects }
    //     delete output[key]
    //   } else if (u.keys(parent).length) {
    //     // TODO: test why it is undefined when .Edge:""
    //     // Check SignUp page
    //     delete parent[key]
    //     const mergedObjects = populateKeys({
    //       source: parent,
    //       lookFor,
    //       locations,
    //     })
    //     output = mergeDeep(mergedObjects, output)
    //     delete output[key]
    //   }
    // } else if (u.isObj(output[key])) {
    //   output[key] = populateKeys({
    //     source: output[key],
    //     lookFor,
    //     locations: [...locations],
    //   })
    // } else if (u.isArr(output[key])) {
    //   const copy = [...output[key]]
    //   output[key].length = 0
    //   for (let item of copy) {
    //     if (u.isObj(item)) {
    //       item = populateKeys({
    //         source: item,
    //         lookFor,
    //         locations: [...locations],
    //       })
    //     }
    //     output[key].push(item)
    //   }
    // }
    
  })
  return output
}



/**
 * Returns a function that is used to evalutate actionType evalObject.
 *
 * @param EvalStateArgs
 * @param EvalStateArgs.pageName
 * @param EvalStateArgs.updateObject
 * @param EvalStateArgs.dispatch
 * @returns Function that runs the series of operations detailed in the updateObject.
 *
 */
function evalState({
  pageName,
  updateObject,
  dispatch,
}: {
  pageName: string
  updateObject: Record<string, any>
  dispatch: Function
}): Function {
  async function onEvalState(a): Promise<void> {
    // REMINDER: evalObject (with actionType key) can be the result here
    // Another: '+1 8882465555'

    return dispatch({
      type: c.dispatchActionType.EVAL_OBJECT,
      payload: { pageName: a.pageName, updateObject: a.updateObject },
    })
  }

  // @ts-expect-error
  return onEvalState.bind(this, {
    pageName,
    updateObject,
    dispatch,
  })
}

/**
 * Replaces the eval object, if any, with a function that performs the the actions detailed in the actionType evalObject
 *
 * @param ReplaceEvalObjectArgs
 * @param ReplaceEvalObjectArgs.cadlObject
 * @param ReplaceEvalObjectArgs.dispatch
 * @returns Object with evalObject replaced by a function.
 *
 */
async function replaceEvalObject({
  pageName,
  cadlObject,
  dispatch,
  isSkip=false,
}: {
  pageName: string
  cadlObject: Record<string, any>
  dispatch: Function
  isSkip?: boolean
}): Promise<Record<string, any>> {
  const cadlCopy = cadlObject

  for (const key of u.keys(cadlCopy)) {
    if (key === 'object' && nt.Identify.action.evalObject(cadlCopy) && !isSkip) {
      const updateObject = cloneDeep(cadlCopy[key]) as Record<string, any>
      if(!u.isFnc(cadlCopy[key])) cadlCopy[key] = evalState({ pageName, updateObject, dispatch }) as any

      // Used to update global state after user signin
      if (
        pageName === 'SignIn' ||
        pageName === 'CreateNewAccount' ||
        pageName === 'SignUp'
      ) {
        await dispatch({
          type: c.dispatchActionType.ADD_FUNCTION,
          payload: {
            pageName,
            fn: evalState({ pageName, updateObject, dispatch }),
          },
        })
      }
    } else if (u.isObj(cadlCopy[key])) {
      if(!isSkip) isSkip = key==='emit'?true:false
      cadlCopy[key] = await replaceEvalObject({
        pageName,
        cadlObject: cadlCopy[key],
        dispatch,
        isSkip,
      })
    } else if (u.isArr(cadlCopy[key])) {
      const currentLength = cadlCopy[key].length
      for (let index = 0; index < currentLength; index++) {
        // if(!isEmit) isEmit = key==='emit'?true:false
        if(!isSkip){
          const isSkip = (key==='onMounted' || key==='if')?true:false
          cadlCopy[key][index] = await replaceEvalObject({
            pageName,
            cadlObject: cadlCopy[key][index],
            dispatch,
            isSkip,
          })
        }else{
          cadlCopy[key][index] = await replaceEvalObject({
            pageName,
            cadlObject: cadlCopy[key][index],
            dispatch,
            isSkip,
          })
        }
      }
    }
  }
  return cadlCopy
}

/**
 * Dereference values in an array data structure.
 *
 * @param PopulateArrayArgs
 * @param PopulateArrayArgs.source Object that has values that need to be replaced.
 * @param PopulateArrayArgs.lookFor Item to look for in object
 * @param PopulateArrayArgs.locations Array of objects that may contain the values for the source object
 * @param PopulateArrayArgs.path
 * @param PopulateArrayArgs.dispatch Function to change the state.
 * @param PopulateArrayArgs.pageName
 *
 * @returns Dereferenced array.
 */
function populateArray({
  source,
  lookFor,
  skip,
  locations,
  path,
  dispatch,
  pageName,
  shouldAttachRef,
  skipIf = true,
}: {
  source: any[]
  lookFor: string
  skip?: string[]
  locations: Record<string, any>[]
  path?: string[]
  dispatch?: Function
  pageName?: string
  shouldAttachRef?: ShouldAttachRefFn
  skipIf?: boolean
}): any[] {
  let sourceCopy = source
  if (path) {
    var previousKey = path[path.length - 1] || ''
  }
  const copy = [...sourceCopy]
  // debugger
  sourceCopy.length = 0
  let replacement = copy.reduce((acc, elem, i) => {
    let index = '[' + i + ']'
    if (u.isArr(elem)) {
      elem = populateArray({
        source: elem,
        skip,
        lookFor,
        locations: [...locations],
        path: path?.slice(0, -1).concat(previousKey + index),
        dispatch,
        pageName,
        shouldAttachRef,
        skipIf,
      })
    } else if (u.isObj(elem)) {
      if (
        !(
          ('actionType' in elem &&
            elem.actionType === 'evalObject' &&
            elem.object &&
            u.isObj(elem.object)) ||
          u.isArr(elem.object)
        ) || (
          lookFor === '$'
        )
      ) {
        elem = populateObject({
          source: elem,
          skip,
          lookFor,
          locations: [...locations],
          path: path?.slice(0, -1).concat(previousKey + index),
          dispatch,
          pageName,
          shouldAttachRef,
          skipIf,
        })
      }
    } else if (typeof elem === 'string') {
      elem = populateString({
        source: elem,
        skip,
        lookFor,
        locations: [...locations],
        path: path?.slice(0, -1).concat(previousKey + index),
        dispatch,
        shouldAttachRef,
        pageName,
      })
    }
    acc.push(elem)
    return acc
  }, [])
  sourceCopy.push(...replacement)
  // debugger
  copy.length = 0
  return sourceCopy
}

/**
 * De-references source object by looking for items in the given locations.
 *
 * @param PopulateObjectArgs
 * @param PopulateObjectArgs.source Object that has values that need to be replaced
 * @param PopulateObjectArgs.lookFor Item to look for in object
 * @param PopulateObjectArgs.locations Array of objects that may contain the values for the source object
 * @param PopulateObjectArgs.skip
 * @param PopulateObjectArgs.path
 * @param PopulateObjectArgs.dispatch
 * @param PopulateObjectArgs.pageName
 *
 * @returns Dereferenced object
 */
function populateObject({
  source = {},
  lookFor,
  locations,
  skip = [],
  path = [],
  dispatch,
  pageName,
  skipIf = true,
  shouldAttachRef,
}: {
  source: Record<string, any>
  lookFor: string | string[]
  locations: Record<string, any>[]
  skip?: string[]
  path?: string[]
  dispatch?: Function
  pageName?: string
  skipIf?: boolean
  shouldAttachRef?: ShouldAttachRefFn
}): Record<string, any> {
  let sourceCopy = source

  for (const key of u.keys(sourceCopy)) {
    let index = key
    let isBuiltIn = key.includes('builtIn')
    let shouldSkipIf = false
    let shouldSkipBuiltIn = false

    key === 'if' && skipIf && (shouldSkipIf = true)
    isBuiltIn && skip.includes('builtIn') && (shouldSkipBuiltIn = true)

    if (
      key !== 'dataKey' &&
      !skip.includes(key) &&
      !shouldSkipIf &&
      !shouldSkipBuiltIn
    ) {
      // if (key === 'listObject') debugger

      // for (const _lookFor of u.array(lookFor)) {
      //   const options = {
      //     source: sourceCopy[key],
      //     skip,
      //     lookFor: _lookFor,
      //     path: path.concat(index),
      //     dispatch,
      //     pageName,
      //   }

        if (u.isObj(sourceCopy[key])) {
          if (
            !(
              nt.Identify.action.evalObject(sourceCopy[key]) &&
              u.isObj(sourceCopy[key].object)
            ) ||
            u.isArr(sourceCopy[key]?.object)
          ) {
            sourceCopy[key] = populateObject({
              // ...options,
              source: sourceCopy[key],
              skip,
              lookFor: lookFor,
              path: path.concat(index),
              dispatch,
              pageName,
              locations: [...locations],
              skipIf,
              shouldAttachRef,
            })
            // TODO - These additional populateObject correctly resolves the `..` and
            // `.` reference in evalObject. We must find a proper way to do this since
            // this part seems to be doing a lot of unnecessary work.
            // See src/__tests__/if.test.ts

            // sourceCopy[key] = populateObject({
            //   ...options,
            //   lookFor: '..',
            //   locations: [...locations],
            //   skipIf,
            //   shouldAttachRef,
            // })

            // sourceCopy[key] = populateObject({
            //   ...options,
            //   lookFor: '.',
            //   locations: [...locations],
            //   skipIf,
            //   shouldAttachRef,
            // })
          }
        } else if (u.isArr(sourceCopy[key])) {
          for (const _lookFor of u.array(lookFor)){
            const options = {
              source: sourceCopy[key],
              skip,
              lookFor: _lookFor,
              path: path.concat(index),
              dispatch,
              pageName,
            }
            sourceCopy[key] = populateArray({
              ...options,
              locations: [...locations],
              skipIf,
              shouldAttachRef,
            })
          }
        } else if (u.isStr(sourceCopy[key])) {
          let startsWith = false
          let _lookFor_ = ``
          for (const _lookFor of u.array(lookFor)){
            if(_lookFor === '.' && !sourceCopy[key].includes('..')) {
              _lookFor_ = _lookFor
              startsWith = true
              break
            } else if(sourceCopy[key].includes(_lookFor)) {
              _lookFor_ = _lookFor
              startsWith = true
              break
            }
          }

          if(startsWith){
            if (nt.Identify.reference(key) && !key.startsWith('=.builtIn')) {
              if (!hasPropertyDescriptor(sourceCopy, key)) {
                setRefAccessor(key, sourceCopy, {
                  dispatch,
                  locations: [...locations],
                  lookFor: _lookFor_,
                  pageName,
                  path: path.concat(index),
                  skip,
                  _path_: path.concat(index).join('.'),
                  _ref_: key,
                })
              }
            } else {
              const isRef = nt.Identify.reference(sourceCopy[key])
              // Value is a reference
              if (
                isRef &&
                shouldAttachRef &&
                shouldAttachRef(key, sourceCopy[key], sourceCopy)
              ) {
                setRefAccessor(key, sourceCopy, {
                  dispatch,
                  locations: [...locations],
                  lookFor: _lookFor_,
                  pageName,
                  path: path.concat(index),
                  skip,
                  _path_: path.concat(index).join('.'),
                  _ref_: sourceCopy[key],
                })
              } else {
                if (isRef && pageName) {
                  const ref = sourceCopy[key]
                  if (!cache.refs[pageName]) cache.refs[pageName] = {}
                  if (!cache.refs[pageName][ref]) {
                    cache.refs[pageName][ref] = {
                      key,
                      ref,
                      path: path.concat(index).join('.'),
                      isLocal: nt.Identify.localReference(ref),
                    }
                  }
                }
                sourceCopy[key] = populateString({
                  dispatch,
                  locations: [...locations],
                  lookFor: _lookFor_,
                  pageName,
                  path: path.concat(index),
                  source: sourceCopy[key],
                  skip,
                  shouldAttachRef,
                })
              }
            }
          }

          // Key is a reference
          // if (nt.Identify.reference(key) && !key.startsWith('=.builtIn')) {
          //   if (!hasPropertyDescriptor(sourceCopy, key)) {
          //     setRefAccessor(key, sourceCopy, {
          //       dispatch,
          //       locations: [...locations],
          //       lookFor: _lookFor,
          //       pageName,
          //       path: path.concat(index),
          //       skip,
          //       _path_: path.concat(index).join('.'),
          //       _ref_: key,
          //     })
          //   }
          // } else {
          //   const isRef = nt.Identify.reference(sourceCopy[key])
          //   // Value is a reference
          //   if (
          //     isRef &&
          //     shouldAttachRef &&
          //     shouldAttachRef(key, sourceCopy[key], sourceCopy)
          //   ) {
          //     setRefAccessor(key, sourceCopy, {
          //       dispatch,
          //       locations: [...locations],
          //       lookFor: _lookFor,
          //       pageName,
          //       path: path.concat(index),
          //       skip,
          //       _path_: path.concat(index).join('.'),
          //       _ref_: sourceCopy[key],
          //     })
          //   } else {
          //     if (isRef && pageName) {
          //       const ref = sourceCopy[key]
          //       if (!cache.refs[pageName]) cache.refs[pageName] = {}
          //       if (!cache.refs[pageName][ref]) {
          //         cache.refs[pageName][ref] = {
          //           key,
          //           ref,
          //           path: path.concat(index).join('.'),
          //           isLocal: nt.Identify.localReference(ref),
          //         }
          //       }
          //     }
          //     sourceCopy[key] = populateString({
          //       dispatch,
          //       locations: [...locations],
          //       lookFor: _lookFor,
          //       pageName,
          //       path: path.concat(index),
          //       source: sourceCopy[key],
          //       skip,
          //       shouldAttachRef,
          //     })
          //   }
          // }
        }
      // }
    
    }
  }



  return sourceCopy
}

/**
 * De-reference source object by looking for multiple items in multiple locations.
 *
 * @param PopulateValsArgs
 * @param PopulateValsArgs.source Object that needs de-referencing.
 * @param PopulateValsArgs.lookFor An array of items to look for e.g ['.','..']
 * @param PopulateValsArgs.locations Locations to look for values.
 * @param PopulateValsArgs.skip Keys to skip in the de-referencing process.
 * @param PopulateValsArgs.pageName
 * @param PopulateValsArgs.dispatch Function to alter the state.
 * @returns
 */
function populateVals({
  source,
  lookFor,
  locations,
  skip,
  pageName,
  dispatch,
  shouldAttachRef,
}: {
  source: Record<string, any> | string
  lookFor: string[]
  skip?: string[]
  locations: any[]
  pageName?: string
  shouldAttachRef?: ShouldAttachRefFn
  dispatch?: Function
}): any {
  let sourceCopy = source

  for (let symbol of lookFor) {
    sourceCopy = (u.isStr(sourceCopy) ? populateString : populateObject)({
      // @ts-expect-error
      source: sourceCopy,
      lookFor: symbol,
      skip,
      locations: [...locations],
      pageName,
      dispatch,
      shouldAttachRef,
    })
  }

  return sourceCopy
}

/**
 * Replaces Uint8Array values with base64 values
 *
 * @param source Object that needs values replaced.
 * @returns Object that has had Uint8Array values mapped to base64.
 */
function replaceUint8ArrayWithBase64(
  source: Record<string, any> | any[],
): Record<string, any> {
  let sourceCopy = cloneDeep(source || '')
  if (u.isObj(source)) {
    Object.keys(sourceCopy).forEach((key) => {
      if (sourceCopy[key] instanceof Uint8Array) {
        sourceCopy[key] = store.level2SDK.utilServices.uint8ArrayToBase64(
          sourceCopy[key],
        )
      } else if (u.isObj(sourceCopy[key])) {
        sourceCopy[key] = replaceUint8ArrayWithBase64(sourceCopy[key])
      } else if (
        u.isArr(sourceCopy[key]) &&
        !(sourceCopy[key] instanceof Uint8Array)
      ) {
        sourceCopy[key] = sourceCopy[key].map((elem) =>
          replaceUint8ArrayWithBase64(elem),
        )
      }
    })
  } else if (u.isArr(source)) {
    
    // @ts-expect-error
    sourceCopy = source.map((elem) => replaceUint8ArrayWithBase64(elem))
  }
  return sourceCopy
}

function replaceVars({ vars, source }) {
  const withVals = populateObject({
    source,
    lookFor: '$',
    locations: [vars],
    skipIf: false,
  })
  return withVals
}

function getHandedCode(_handledCode) {
  let errorCodes: any[] = []
  if (_handledCode) {
    _handledCode = _handledCode?.toString()
    if (_handledCode === 'all') {
      errorCodes[0] = 'all'
    } else {
      let splitRes = _handledCode?.split(',')
      for (const re of splitRes) {
        errorCodes.push(parseInt(re))
      }
    }
  }

  // temp not showing error code 10316, 10317,3001 caused by 1031 for changing JWT, 2002 caused by 1031, 1005 caused by 1090
  const codeArray = [10316, 10317, 3001, 1005, 2002]
  for (const code of codeArray) {
    if (!errorCodes.includes(code)) {
      errorCodes.push(code)
    }
  }

  return errorCodes
}

function getParentSK(type){
	if (typeof window === 'undefined') return 
  switch(type){
    case 20:
      return window.localStorage?.getItem?.('sk')
    case 21:
      return window.localStorage?.getItem?.('facility_sk')
    case 30:
      return window.localStorage?.getItem?.('location_sk')
  }
}
