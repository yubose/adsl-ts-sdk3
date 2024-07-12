import * as u from '@jsmanifest/utils'
import dot from 'dot-object'
import clone from 'lodash/clone'
import log from './log'
import store from '../common/store'
import isPopulated from './isPopulated'
import UnableToLocateValue from '../errors/UnableToLocateValue'
import type { ShouldAttachRefFn } from '../types'

/**
 * Used to de-reference a string by looking for value in locations.
 * @param PopulateStringArgs
 * @param PopulateStringArgs.source Object that has values that need to be replaced
 * @param PopulateStringArgs.lookFor Item to look for in object
 * @param PopulateStringArgs.locations Array of objects that may contain the values for the source object
 * @param PopulateStringArgs.path The path to the value that will be changed.
 * @param PopulateStringArgs.dispatch Function to change the state.
 * @param PopulateStringArgs.pageName
 *
 * @returns De-referenced object.
 */
function populateString({
  source,
  lookFor,
  skip,
  locations = [],
  path,
  dispatch,
  shouldAttachRef,
  pageName,
}: {
  source: string
  lookFor: string
  skip?: string[]
  locations: Record<string, any>[]
  path?: string[]
  dispatch?: Function
  shouldAttachRef?: ShouldAttachRefFn
  pageName?: string
}) {
  if (skip && skip.includes(source)) return source
  if (!source.startsWith(lookFor)) return source

  let currVal = source
  let replacement: any

  if (lookFor === '~') {
    currVal = '.myBaseUrl'
  } else if (lookFor === '_' && currVal.includes('.')) {
    let charArr = currVal.split('')
    let copyPath = clone(path) || []
    let currChar = charArr.shift()

    while (currChar !== '.' && charArr.length > 0) {
      if (currChar === '_') copyPath.pop()
      currChar = charArr.shift()
    }

    replacement = '.' + copyPath.concat(charArr.join('')).join('.')
    // NOTE: This is intentionally returning a referenced string, so this is not actually resolved yet and it is up to the caller to resolve this
    return replacement
    // return populateString({
    //   source: replacement,
    //   lookFor: '.',
    //   skip,
    //   locations: [...locations],
    //   path,
    //   pageName,
    //   dispatch,
    //   shouldAttachRef,
    // })
  } else if (lookFor === '..') {
    currVal = currVal.slice(1)
  } else if (lookFor === '=') {
    if (source.startsWith('=..')) currVal = currVal.slice(2)
    else if (source.startsWith('=.')) currVal = currVal.slice(1)
  }

  if (currVal.startsWith('.')) currVal = currVal.slice(1)
  if (currVal.startsWith('$')) currVal = currVal.slice(1)

  for (let location of locations) {
    try {
      replacement = dot.pick(currVal, location)

      // Defaults to baseUrl if myBaseUrl is not available
      if (currVal === '.myBaseUrl' && !replacement) {
        replacement = dot.pick('.baseUrl', location)
      }
      if (replacement && lookFor == '~') {
        replacement = replacement + source.substring(2)
        break
      } else if (
        (replacement || replacement === '' || replacement === 0 || (typeof(replacement) === 'boolean' && replacement===false)) &&
        replacement !== source
      ) {
        if (u.isStr(replacement) && replacement.startsWith(lookFor)) {
          return populateString({
            source: replacement,
            lookFor,
            skip,
            locations: [...locations],
            path,
            pageName,
            dispatch,
            shouldAttachRef,
          })
        } else {
          break
        }
      }
    } catch (error) {
      if (error instanceof UnableToLocateValue) continue
      else throw error
    }
  }

  if (!u.isUnd(replacement) && replacement !== source) {
    return replacement
  }
  if (!!isPopulated(source)) {
    if (process.env.NODE_ENV !== 'test' && store.env === 'test' && path) {
      log.info(
        `%cReference Not Found in ${pageName}`,
        'background: orange; color: black; display: block;',
        { [path.join('.')]: source },
      )
    }
    source = undefined as any
  }
  return source
}

export default populateString
