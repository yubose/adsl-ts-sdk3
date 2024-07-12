import * as u from '@jsmanifest/utils'
import cloneDeep from 'lodash/cloneDeep'

/**
 * Checks whether or not an object has been de-referenced.
 *
 * @param item
 * @returns true if the object has already been dereferenced and false otherwise.
 *
 */
export default function isPopulated(
  item: string | Record<string, any>,
): boolean {
  if (typeof item === 'function') return true
  let itemCopy = cloneDeep(item)
  let isPop: boolean = true
  if (u.isObj(itemCopy)) {
    for (let key of Object.keys(itemCopy)) {
      if (!isPop) return isPop
      if (u.isObj(itemCopy[key])) {
        isPop = isPopulated(itemCopy[key])
      } else if (Array.isArray(itemCopy[key])) {
        for (let elem of itemCopy[key]) {
          if (u.isObj(elem)) {
            isPop = isPopulated(elem)
          } else if (typeof elem === 'string') {
            if (elem.startsWith('.') || elem.startsWith('..')) {
              isPop = false
            }
            isPop = true
          } else {
            isPop = true
          }
        }
      } else if (typeof itemCopy[key] === 'string') {
        const currVal = itemCopy[key].toString()
        if (
          currVal.startsWith('.') ||
          currVal.startsWith('..') ||
          currVal.startsWith('=.') ||
          currVal.startsWith('~')
        ) {
          isPop = false
        }
      }
    }
  } else if (typeof item === 'string') {
    if (
      item.startsWith('.') ||
      item.startsWith('..') ||
      item.startsWith('=.') ||
      item.startsWith('~')
    ) {
      isPop = false
    }
  }
  return isPop
}
