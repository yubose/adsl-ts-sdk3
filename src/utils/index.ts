import pako from 'pako'
import store from '../common/store'

export function ecosObjType(id: string | Uint8Array): string {
  if (typeof id === 'string') {
    id = store.utils.idToUint8Array(id)
  }
  const identifier = (id?.[8] & 0xc0) >> 6

  switch (identifier) {
    case 0:
      return 'VERTEX'
    case 1:
      return 'DOCUMENT'
    case 2:
      return 'EDGE'
    case 3:
      return 'FILE'
    default:
      return 'UNKNOWN'
  }
}

export const gzip = (data: Uint8Array) => {
  return pako.gzip(data)
}

export const ungzip = (data: Uint8Array) => {
  return pako.ungzip(data)
}

/**
 *
 * @param item any
 * @returns    boolean
 * - checks if given value is a valid object {}
 */
export function isObject(item: any): boolean {
  if (item === null) return false
  if (item === undefined) return false
  return item && typeof item === 'object' && !Array.isArray(item)
}

export function mergeDeep(target, source) {
  let output = target
  // let output = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          // Object.assign(output, { [key]: source[key] })
          output[key] = source[key]
        } else if (isObject(target[key])) {
          output[key] = mergeDeep(target[key], source[key])
        } else {
          output[key] = source[key]
        }
      } else if (source[key] === null && target[key] !== null) {
        output[key] = target[key]
      } else {
        // Object.assign(output, { [key]: source[key] })
        output[key] = source[key]
      }
    })
  }
  if (source === undefined && isObject(target)) {
    output = source
  }
  return output
}
