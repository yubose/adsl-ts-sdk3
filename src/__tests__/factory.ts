import m from 'noodl-test-utils'
import type CADL from '../CADL'
import { createFuncAttacher } from '../CADL/commonUtils'

export const builtIn = {
  string: {
    concat: (string1: string, string2: string, dataOut?: string) =>
      m.builtIn('string.concat', { string1, string2 }, dataOut),
    equal: (string1: string, string2: string, dataOut?: string) =>
      m.builtIn('string.equal', { string1, string2 }, dataOut),
  },
}

export function ecosRequestFn(cadl: CADL, apiObject: any) {
  return createFuncAttacher({
    cadlObject: { get: apiObject },
    dispatch: cadl.dispatch.bind(cadl),
  }).get[1] as () => Promise<any>
}

export function edgeRequestOptions(
  options?: Partial<
    Record<
      'bvid' | 'ctime' | 'evid' | 'id' | 'subtype' | 'tage' | 'type' | 'name',
      any
    >
  > &
    Record<string, any>,
) {
  return {
    // atime: 0,
    ctime: '',
    // etime: 0,
    // mtime: 0,
    // stime: 0,
    bvid: '',
    // deat: '',
    // eesak: '',
    evid: '',
    id: '',
    // refid: '',
    subtype: '',
    tage: '',
    ...options,
  }
}

export function signInCheck(destination = 'SignIn') {
  return m.ifObject([
    '=.Global.currentUser.vertex.sk',
    'continue',
    m.goto(destination),
  ])
}

export function uidLike(...args: Parameters<typeof m.str.uidLike>) {
  return m.str.uidLike(...(args as any[])).join()
}
