import type { LiteralUnion } from 'type-fest'
import type { ReferenceString } from 'noodl-types'
import { Identify } from 'noodl-types'
import cache from '../cache'
import populateString from './populateString'

export interface RefObject {
  key: string
  ref: LiteralUnion<ReferenceString, string> | undefined
  path: string | undefined
  isLocal: boolean
  result: any
  parent: any
}

export interface RefSubscriber {
  (refObject: RefObject): void
}

const subscribers = [] as RefSubscriber[]

export function subscribeToRefs(fn: RefSubscriber) {
  subscribers.push(fn)
  return function unsubscribe() {
    subscribers.splice(subscribers.indexOf(fn), 1)
  }
}

function notifySubscribers(refObject: RefObject) {
  subscribers.forEach((fn) => fn(refObject))
}

export interface Options {
  lookFor: string
  locations: Record<string, any>[]
  skip?: string[]
  path?: string[]
  dispatch?: Function
  pageName?: string
  skipIf?: boolean
  _path_?: string
  _ref_?: string
}

function defineRef(ref: string, parent: Record<string, any>, get) {
  Object.defineProperty(parent, ref, {
    configurable: true,
    enumerable: true,
    get,
    set() {},
  })
}

function setRefAccessor(
  key: string,
  parent: Record<string, any>,
  options: Options,
) {
  const { _path_, _ref_, ...rest } = options
  const value = parent[key]
  const isLocal = Identify.localReference(_ref_)
  defineRef(key, parent, () => {
    const result = populateString({ ...rest, source: value })
    notifySubscribers({
      key,
      path: _path_,
      ref: _ref_,
      result,
      isLocal,
      parent,
    })
    return result
  })

  if (options.pageName && _ref_) {
    if (!cache.refs[options.pageName]) {
      cache.refs[options.pageName] = {}
    }
    if (!cache.refs[options.pageName][_ref_]) {
      cache.refs[options.pageName][_ref_] = {
        key,
        ref: _ref_,
        path: _path_,
        isLocal,
      }
    }
  }

  if (!Object.getOwnPropertyDescriptor(parent, '_ref_')) {
    defineRef('_key_', parent, () => key)
    if (_path_) defineRef('_path_', parent, () => _path_)
    if (_ref_) defineRef('_ref_', parent, () => _ref_)
  }
}

export default setRefAccessor
