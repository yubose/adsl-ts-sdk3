import { Level2Ecos, Level2Error } from '../../ecos'
import type { Env } from 'noodl-types'
import AiTmedError, { getErrorCode } from '../AiTmedError'
import compareUint8Arrays from '../../utils/compareUint8Arrays'

export interface Utils {
  idToBase64: (id: Uint8Array | string) => string
  idToUint8Array: (id: Uint8Array | string) => Uint8Array
  compareUint8Arrays: (u8a1: Uint8Array, u8a2: Uint8Array) => boolean
}

export interface ResponseCatcher {
  (response: Response): Response | any
}

export interface ErrorCatcher {
  (error: Level2Error | any): void
}

export interface ConfigParams {
  apiVersion?: string
  env: Env
  apiHost?: string
  configUrl: string
}

const defaultResponseCatcher: ResponseCatcher = (response) => {
  return response
}

const defaultErrorCatcher: ErrorCatcher = (error) => {
  const code = getErrorCode(error.name)
  if (code === -1 && error.name !== 'UNKNOW_ERROR') {
    throw error
  } else {
    throw new AiTmedError({ code, message: error.message })
  }
}

export default class Store {
  public _env: Env
  public readonly level2SDK: Level2Ecos
  public readonly utils: Utils

  public responseCatcher: any = defaultResponseCatcher
  public errorCatcher: ErrorCatcher = defaultErrorCatcher
  public noodlInstance: any
  public currentLatitude: any
  public currentLongitude: any
  public drugbankToken: any
  public _globalListChat:any
  public notificationToken: any
  constructor({ apiVersion, apiHost, env, configUrl }: ConfigParams) {
    this._env = env
    const sdkEnv = env === 'test' ? 'development' : 'production'
    // @ts-expect-error
    this.level2SDK = new Level2Ecos({
      apiVersion,
      apiHost,
      env: sdkEnv,
      configUrl,
    })

    const idToBase64 = (id: Uint8Array | string): string => {
      if (typeof id === 'string') {
        return id
      } else {
        return this.level2SDK.utilServices.uint8ArrayToBase64(id)
      }
    }

    const idToUint8Array = (id: Uint8Array | string): Uint8Array => {
      if (typeof id === 'string') {
        return this.level2SDK.utilServices.base64ToUint8Array(id)
      } else {
        return id
      }
    }

    this.utils = {
      idToBase64,
      idToUint8Array,
      compareUint8Arrays,
    }
  }

  set apiVersion(value: string) {
    this.level2SDK.apiVersion = value
  }

  get apiVersion() {
    return this.level2SDK.apiVersion
  }

  set env(value: Env) {
    this._env = value
  }

  get env() {
    return this._env
  }

  get apiHost() {
    return this.level2SDK.apiHost
  }
  set apiHost(value: string) {
    this.level2SDK.apiHost = value
  }

  get configUrl() {
    return this.level2SDK.configUrl
  }

  set configUrl(value: string) {
    this.level2SDK.configUrl = value
  }

  public getConfig() {
    return this.level2SDK.getConfigData()
  }

  set globalListChat(value:any) {
    this._globalListChat = value
  }

  get globalListChat() {
    return this._globalListChat
  }
}
