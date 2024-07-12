import store from '../../common/store'
import { sha256 } from 'hash.js'
import { deleteToken, storeToken } from '../../utils/NotificationUtils'

export default {
  getFCMToken({ token }) {
    return token
  },
  getAPPID({ appName }) {
    const appNameSHA256 = sha256().update(appName).digest()
    const appNameUint8Array = new Uint8Array(appNameSHA256)
    const appNameSHA256Slice = appNameUint8Array.slice(0, 16)
    const appNameSHA256SliceB64 = store.level2SDK.utilServices.uint8ArrayToBase64(
      appNameSHA256Slice
    )

    return appNameSHA256SliceB64
  },
  getFCMTokenSHA256Half({ token }) {
    const tokenSHA256 = sha256().update(token).digest()
    const tokenSHA256Uint8Array = new Uint8Array(tokenSHA256)
    const tokenSHA256Slice = tokenSHA256Uint8Array.slice(0, 16)
    const tokenSHA256SliceB64 = store.level2SDK.utilServices.uint8ArrayToBase64(
      tokenSHA256Slice
    )

    return tokenSHA256SliceB64
  },
  getAPNsToken({token}){
    return
  },
  getVoIPToken({token}){
    return
  },
}
