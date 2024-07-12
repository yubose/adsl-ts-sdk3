import moment from 'moment'
import sha256 from 'crypto-js/sha256'
import Base64 from 'crypto-js/enc-base64'
import store from '../common/store'
import log from '../utils/log'

export default function setAPIBuffer(apiObject: Record<string, any>) {
  try {
    let limit
    if (store.env === 'test') {
      limit = 3
    } else {
      limit = 3
    }
    const apiDispatchBufferString = typeof window === 'undefined' ? null : window.localStorage?.getItem?.('api-dispatch-buffer')
    const hash: string = Base64.stringify(sha256(JSON.stringify(apiObject)))
    const hashSub = hash.substring(0, 8)
    const currentTimestamp = moment(Date.now())
    let apiDispatchBufferObject
    if (apiDispatchBufferString !== null) {
      apiDispatchBufferObject = JSON.parse(apiDispatchBufferString)
    } else {
      apiDispatchBufferObject = {}
    }
    let apiDispatchBufferStringUpdate
    let pass
    if (!(hashSub in apiDispatchBufferObject)) {
      apiDispatchBufferObject[hashSub] = currentTimestamp.toString()
      apiDispatchBufferStringUpdate = JSON.stringify(apiDispatchBufferObject)
      localStorage.setItem('api-dispatch-buffer', apiDispatchBufferStringUpdate)
      pass = true
    } else {
      const oldTimestamp = moment(apiDispatchBufferObject[hashSub])
      const timeDiff = currentTimestamp.diff(oldTimestamp, 'seconds')
      if (timeDiff > limit) {
        apiDispatchBufferObject[hashSub] = currentTimestamp.toString()
        pass = true
      } else {
        apiDispatchBufferObject[`${hashSub}FAILED_REPEAT`] =
          currentTimestamp.toString()
        pass = false
      }
    }
    //remove old values
    for (let [key, val] of Object.entries(apiDispatchBufferObject)) {
      //@ts-ignore
      const timeDiff = currentTimestamp.diff(val, 'seconds')
      if (timeDiff > limit) {
        delete apiDispatchBufferObject[key]
      }
    }
    apiDispatchBufferStringUpdate = JSON.stringify(apiDispatchBufferObject)
		if (typeof window === 'undefined') return pass
    window.localStorage?.setItem?.('api-dispatch-buffer', apiDispatchBufferStringUpdate)
    return pass
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)))
  }
}
