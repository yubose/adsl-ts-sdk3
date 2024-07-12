import * as u from '@jsmanifest/utils'
import store from '../common/store'

export const _TEST_ = process.env.NODE_ENV === 'development'

export function defineProperty(
  obj: Record<string, any>,
  key = '',
  get: () => any,
  set?: (key: string, value?: any) => void,
) {
  let value = get()
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: true,
    get() {
      return value
    },
    set() {
      value = get()
    },
  })
}

export function hasPropertyDescriptor(
  obj: Record<string, any>,
  key = '',
  method = 'get' as 'get' | 'set',
) {
  return !!(u.isObj(obj) && Object.getOwnPropertyDescriptor(obj, key)?.[method])
}

export function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * Returns true if the first letter is capitalized
 * @param s
 * @returns { boolean }
 */
export function isCapitalized(s = '') {
  return !!(s && u.isStr(s) && s[0] === s[0].toUpperCase())
}

/**
 * If the value is undefined, it uses the return value of the callback (if provided) instead
 * @param value
 * @param callback
 */
export function bridge(value: any, callback?: () => any) {
  if (!u.isUnd(value)) return value
  return u.isFnc(callback) ? callback() : value
}

export function isBooleanFalse(cond: unknown):boolean{
  return !!(u.isNil(cond) || cond === 0 || cond === false || cond === '')
}

export async function getNewJwt() {
  const currentUserId = localStorage.getItem('facility_vid')
    ? localStorage.getItem('facility_vid')
    : localStorage.getItem('user_vid')
  const obj = {
    bvid: currentUserId,
    type: 1030,
  }
  const {data} = await store.level2SDK.edgeServices.createEdge(obj)
  return data?.['jwt']
}
