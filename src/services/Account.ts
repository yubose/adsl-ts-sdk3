import * as u from '@jsmanifest/utils'
import store from '../common/store'
import { Status } from '../ecos'
import { UnableToMakeAnotherRequest } from '../errors'
import { retrieveVertex } from '../common/retrieve'
import decodeUID from '../utils/decodeUID'
import log from '../utils/log'

/**
 * @param phone_number: string
 * @throws {UnableToMakeAnotherRequest} When the same request is made within 60secs
 * @returns Promise<string>
 */
export const requestVerificationCode = async (phone_number: string) => {
  if (store.noodlInstance) {
    if (
      store.noodlInstance.verificationRequest.timer > 0 &&
      store.noodlInstance.verificationRequest.phoneNumber === phone_number
    ) {
      throw new UnableToMakeAnotherRequest(
        'User must wait 60 sec to make another verification code request.',
      )
    } else {
      store.noodlInstance.verificationRequest.timer = 60
      store.noodlInstance.verificationRequest.phoneNumber = phone_number
      const interval = setInterval(() => {
        if (store.noodlInstance.verificationRequest.timer === 0) {
          clearInterval(interval)
        } else {
          store.noodlInstance.verificationRequest.timer--
        }
      }, 1000)
    }
  }
  const response = await store.level2SDK.Account.requestVerificationCode({
    phone_number,
  })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
  return Number(response?.data?.verification_code)
}

/**
 * @param phone_number: string
 * @param password: string
 * @param verification_code: string
 */
export const create = async (
  phone_number: string,
  password: string,
  verification_code: number,
  userInfo: Record<string, any>,
  type = 1,
) => {
  // const { code: statusCode, ...rest } = await getStatus()
  let userVertex

  // if (statusCode === 3) {
  //   // @ts-expect-error
  //   const { data } = await store.level2SDK.Account.createInvitedUser({
  //     id: rest?.data.user_id,
  //     phone_number,
  //     password,
  //     userInfo: { ...userInfo, phoneNumber: phone_number },
  //   })
  //     .then(store.responseCatcher)
  //     .catch(store.errorCatcher)
  //   userVertex = data
  // } else {
    // Create User
    // @ts-expect-error
    const { data } = await store.level2SDK.Account.createUser({
      phone_number,
      password,
      verification_code: Number(verification_code),
      userInfo: { ...userInfo, phoneNumber: phone_number },
      type: typeof type === 'string' ? parseInt(type) : type,
    })
      .then(store.responseCatcher)
      .catch(store.errorCatcher)
    userVertex = data
  // }

  return userVertex
}
export const createNoModifyKey = async (
  phone_number: string,
  password: string,
  verification_code: number,
  userInfo: Record<string, any>,
  type = 1,
) => {
  const { code: statusCode, ...rest } = await getStatus()
  let userVertex
  //@ts-ignore
  const { data } = await store.level2SDK.Account.createUserNoModifyKey({
    phone_number,
    password,
    verification_code: Number(verification_code),
    userInfo: { ...userInfo, phoneNumber: phone_number },
    type: typeof type === 'string' ? parseInt(type) : type,
  })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
  userVertex = data
  return userVertex
}
/**
 *
 * @param phone_number: string
 * @param verification_code: string
 * @param password: string
 */
export const login = async (
  phone_number: string,
  password: string,
  verification_code: number,
) => {
  const res = await loginByVerificationCode(phone_number, verification_code)
  if (res instanceof Status) {
    await store.level2SDK.Account.login()
    return res
  }
  const user = await loginByPassword(password)
  //TODO: edit when user profile is more standardized
  if (user.id) {
    const resp = await retrieveVertex(user.id)
    const userVertex = resp?.data?.length ? resp.data[0] : null
    if (userVertex?.name?.username) {
      userVertex.name.userName = userVertex.name.username
      delete userVertex.name.username
    }
    return userVertex
  } else {
    return user
  }
}

/**
 * This method is only able to be used after login new device (loginByVerificationCode)
 * @param password: string
 */
export const loginByPassword = async (password: string) => {
  await store.level2SDK.Account.login({ password })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)

  const {
    data: { user_id },
  } = await getStatus()
  let user
  if (user_id) {
    const resp = await retrieveVertex(user_id)
    const userVertex = resp?.data?.length ? resp.data[0] : null
    if (userVertex?.name?.username) {
      userVertex.name.userName = userVertex.name.username
      delete userVertex.name.username
    }
    user = userVertex
  }
  return user
}

/**
 * @param phone_number: string
 * @param verification_code: string
 */
export const loginByVerificationCode = async (
  phone_number: string,
  verification_code: number,
) => {
  return await store.level2SDK.Account.loginNewDevice({
    phone_number,
    // @ts-expect-error
    verification_code: Number(verification_code),
  })
    .then(store.responseCatcher)
    .catch(store.errorCatcher)
}

/**
 * @returns Status
 * Status.code:
 *  0 - LOGGED_IN
 *  1 - LOGGED_OUT
 */
export const logout = async (clean = false) => {
  if (!u.isBrowser()) return
  if (clean) {
    store.level2SDK.Account.logoutClean()
    localStorage.removeItem('Global')
  } else {
    const status = await getStatus()
    if (status.code === 1) return status
    store.level2SDK.Account.logout()
    localStorage.removeItem('Global')
  }
  const latestStatus = await getStatus()
  return latestStatus
}

/**
 * @returns Status
 * Status.code:
 *  0 - LOGGED_IN
 *  1 - LOGGED_OUT
 *  2 - NEW_DEVICE
 *  3 = TEMP_ACCOUNT
 * Status.userId: string
 * Status.code: string
 */
export const getStatus = async (): Promise<
  Status & {
    userId: string
    phone_number: string
  }
> => {
  if (!store.configUrl) {
    // TODO - Remove this hardcode and try to get the configUrl provided to constructor
    store.configUrl = `https://public.aitmed.com/config`
  }
  const status = await store.level2SDK.Account.getStatus()
  try {
    const uid = localStorage.getItem('uid')
    if (uid === null) throw new Error('uid is null')
    const utf8Uid = store.level2SDK.utilServices.base64ToUTF8(uid)
    const { userId, phone_number } = decodeUID(utf8Uid)
    return { ...status, userId, phone_number }
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)))
    return { ...status, userId: '', phone_number: '' }
  }
}
