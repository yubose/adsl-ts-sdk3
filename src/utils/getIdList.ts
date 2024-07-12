import type { LiteralUnion } from 'type-fest'
import * as u from '@jsmanifest/utils'
import { Identify as is } from 'noodl-types'
import log from './log'

function getIdList(
  value?:
    | string
    | Uint8Array
    | (string | Uint8Array)[]
    | Record<LiteralUnion<'id' | 'ids', string>, any>
    | null,
) {
  if (!value) return []
  if (u.isStr(value) || u.isArr(value)) {
    return u.reduce(
      u.array(value),
      (acc, val) => {
        if (u.isStr(val)) {
          if (is.reference(val) || val.startsWith('$')) {
            log.error(
              `%c[Lvl3 - getIdList] A reference "${value}" was being passed to idList. It will not be included in the request`,
              `color:#ec0000;font-weight:bold;`,
            )
            return acc
          }
        }
        return val ? acc.concat(val) : acc
      },
      [] as (Uint8Array | string)[],
    )
  }
  if (u.isObj(value)) {
    if ('id' in value || 'ids' in value) {
      return getIdList([value.ids || (value as any).id].filter(Boolean))
    }
  }
  return u.array(value).filter(Boolean)
}

export default getIdList
