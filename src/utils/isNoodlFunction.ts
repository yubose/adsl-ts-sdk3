import * as u from '@jsmanifest/utils'

export default function isNoodlFunction(object: Record<string, any>): boolean {
  return u.isObj(object) && u.keys(object)[0]?.startsWith?.('=')
}
