import * as nt from 'noodl-types'
import cloneDeep from 'lodash/cloneDeep'
import * as u from '@jsmanifest/utils'

/**
 * Returns true if a popUp action exists in the value.
 * If the value is an array it will return true if a popUp action exists in the list
 * @param value
 * @returns
 */
export default function hasAbortPopup(value: any) {
  if (value) {
    if (Array.isArray(value)) {
      const results = cloneDeep(value)
      while(results.length){
        let result = results.pop()
        while (u.isArr(result)) {
          results.push(...result)
          result = results.pop()
        }

        if((nt.Identify.action.popUp(result) && result.wait===true) || (result?.['abort'] && result['abort'] === 'true')){
          return true
        }
      }
      // return value.some((v) => nt.Identify.action.popUp(v) && v.wait===true)
    }
    if (typeof value === 'object') {
      return (nt.Identify.action.popUp(value) && value.wait===true) || (value?.['abort'] && value['abort'] === 'true')
    }
    return false
  }
  return false
}
