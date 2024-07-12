import type { LiteralUnion } from 'type-fest'
import fs, { pathExists } from 'fs-extra'
import m from 'noodl-test-utils'
import path from 'path'
import nock from 'nock'
import partial from 'lodash/partial'
import type { Interceptor } from 'nock'
import set from 'lodash/set'
import * as u from '@jsmanifest/utils'
import * as nt from 'noodl-types'
import GlobalObjectFixture from './fixtures/Global.json'
import CADL from '../CADL'
import y from 'yaml'
import { toYml } from '../utils/yaml'
import { CommonTypes } from '../ecos'
import type * as t from '../types'

export let baseUrl = 'http://127.0.0.1:3000/'
export let assetsUrl = baseUrl + 'assets/'

export let _defaults = {
  apiHost: 'albh3.aitmed.io',
  apiPort: '443',
  assetsUrl,
  baseUrl,
  cadlMain: 'cadlEndpoint.yml',
}
export let ui = {}

export function createMockDoc() {
  const doc = new CommonTypes.Doc()
  return { ...doc }
}

export function getPathFromTestDir(...paths: string[]) {
  return u.unixify(path.join(__dirname, ...paths))
}

export function getAbsFilePath(...paths: t.FilePath[]) {
  return u.unixify(path.resolve(path.join(process.cwd(), ...paths)))
}

/**
 * @example
 * ```js
 * getCADL('patient')
 * getCADL('https://public.aitmed.com/config/patient.yml')
 * getCADL({ configUrl: 'https://public.aitmed.com/config/patient.yml' })
 * ```
 * @param configOptsOrUrlOrKey
 */
export function getCADL(
  configOptsOrUrlOrKey: Partial<ConstructorParameters<typeof CADL>[0]> | string,
) {
  let options = { cadlVersion: 'test' } as ConstructorParameters<typeof CADL>[0]

  if (u.isObj(configOptsOrUrlOrKey)) {
    u.assign(options, configOptsOrUrlOrKey)
  } else {
    options.configUrl = configOptsOrUrlOrKey.startsWith('http')
      ? configOptsOrUrlOrKey
      : `${baseUrl}${configOptsOrUrlOrKey}.yml`
  }

  return new CADL(options)
}

export function createRootConfig({
  apiPort = '443',
  apiHost = _defaults.apiHost,
  cadlBaseUrl = baseUrl,
  timestamp = '5272021',
  version = '1.0',
  viewWidthHeightRatio = { min: 0.56, max: 0.7 },
  ...rest
}: Partial<nt.RootConfig> &
  Record<string, any> & {
    version?: string | { stable?: string; test?: string }
  } = {}) {
  const rootConfig = { ...rest } as nt.RootConfig

  rootConfig.apiPort = apiPort
  rootConfig.apiHost = apiHost
  rootConfig.webApiHost = 'apiHost'
  rootConfig.appApiHost = 'apiHost'
  rootConfig.cadlBaseUrl = cadlBaseUrl
  rootConfig.cadlMain = _defaults.cadlMain
  rootConfig.timestamp = timestamp
  rootConfig.viewWidthHeightRatio = viewWidthHeightRatio

  if (u.isStr(version) || u.isNum(version)) {
    set(rootConfig, 'web.cadlVersion.stable', version)
    set(rootConfig, 'web.cadlVersion.test', version)
  } else {
    const { stable = '1.0', test = '1.0' } = version || {}
    set(rootConfig, 'web.cadlVersion.stable', stable)
    set(rootConfig, 'web.cadlVersion.test', test)
  }

  return rootConfig
}

export function createCadlEndpoint({
  assetsUrl = '${cadlBaseUrl}assets/',
  baseUrl = '${cadlBaseUrl}',
  preload = [],
  pages = [],
  startPage = '',
}: {
  assetsUrl?: string
  baseUrl?: string
  preload?: string[]
  pages?: string[]
  startPage?: string
} = {}) {
  const cadlEndpoint = {} as nt.AppConfig

  cadlEndpoint.assetsUrl = assetsUrl
  cadlEndpoint.baseUrl = baseUrl
  cadlEndpoint.preload = preload
  cadlEndpoint.page = pages
  cadlEndpoint.languageSuffix = { unknown: '_en' }
  cadlEndpoint.fileSuffix = '.yml'
  cadlEndpoint.startPage = startPage

  return cadlEndpoint
}

export function loadFixture(...paths: string[]) {
  return fs.readFile(getPathFromTestDir('fixtures', ...paths), 'utf8')
}

loadFixture.sync = (...paths: string[]) =>
  fs.readFileSync(getPathFromTestDir('fixtures', ...paths), 'utf8')

/**
 * Random boilerplate data to use in our tests
 */

export function getGenderList() {
  return [
    { key: 'gender', value: 'Female' },
    { key: 'gender', value: 'Male' },
    { key: 'gender', value: 'Unknown' },
  ]
}

export function intercept(
  method: LiteralUnion<'get' | 'post', string>,
  pathname: `/${string}` | RegExp | ((uri: string) => boolean),
  scope: nock.Scope,
  body?: any,
) {
  const interceptor = scope[method](pathname) as Interceptor

  if (u.isObj(body) && u.isStr(pathname) && pathname.endsWith('.yml')) {
    try {
      body = y.stringify(body)
    } catch (error) {
      console.error(
        `[intercept]: `,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  interceptor.reply(200, body)
}

/**
 * Adds a new endpoint to the current {@link nock.Scope}
 */
export function nockYAMLFile(
  scope: nock.Scope,
  fileName: string,
  response: LiteralUnion<`fix:${string}`, string> | Record<string, any>,
) {
  const route = (fileName.startsWith('/') ? fileName : `/${fileName}`).replace(
    /\/\//g,
    '/',
  )

  if (u.isStr(response)) {
    if (response.startsWith('fix')) {
      const pathname = response.substring(4)
      response = fs.readFileSync(
        getPathFromTestDir('fixtures', ...pathname.split('/')),
        'utf8',
      )
    }
  } else if (u.isObj(response)) {
    response = y.stringify(response)
  }

  return scope.get(route).reply(200, response)
}

export interface NockAppOptions {
  /**
   * The base URL used as the prefix for all nocked endpoints.
   * This value should not have any placeholders and is used for nock.
   *
   * To use a `cadlBaseUrl` as a noodl value in the mocked app files, provide it inside `config.cadlBaseUrl`
   */
  baseUrl: string
  /**
   * The base URL used as the prefix for fetching the {@link nt.RootConfig}.
   * The last path of this url should be the file name of the config file.
   * @example
   * ```js
   * const configUrl = `https://public.aitmed.com/config/patient.yml` // config key === 'patient.yml'
   * ```
   */
  configUrl: string
  config?: LiteralUnion<`fix:${string}`, string> | nt.RootConfig
  cadlEndpoint?: LiteralUnion<`fix:${string}`, string> | nt.AppConfig
  preloads?: Record<
    string,
    LiteralUnion<`fix:${string}`, string> | Record<string, any>
  >
  pages?: Record<string, LiteralUnion<`fix:${string}`, string> | nt.PageObject>
}

export function nockApp({
  baseUrl,
  configUrl,
  config,
  cadlEndpoint: cadlEndpointProp,
  preloads = {},
  pages = {},
}: NockAppOptions) {
  function toJSON(value: any) {
    if (u.isStr(value)) {
      if (value.startsWith('fix:')) {
        value = value.substring(4)
        value = loadFixture.sync(...value.split('/'))
      }
      return y.parse(value)
    }
    return value
  }

  function _toYAML(value: any) {
    if (u.isObj(value)) return y.stringify(value)
    if (u.isStr(value)) {
      if (value.startsWith('fix:')) {
        value = value.substring(4)
        return loadFixture.sync(...value.split('/'))
      }
    }
    return u.isStr(value) ? value : String(value)
  }

  const appURL = new URL(baseUrl)
  const configURL = new URL(configUrl)

  let appScope: nock.Scope
  let configScope: nock.Scope
  let configKey = configURL.pathname
    .substring(configURL.pathname.lastIndexOf('/') + 1)
    .replace(/\.(json|yml)/i, '')

  if (appURL.host === configURL.host) {
    appScope = nock(appURL.origin)
    configScope = appScope
  } else {
    appURL.pathname = new URL(baseUrl).pathname
    appScope = nock(appURL.origin)
    configScope = nock(configURL.origin)
  }

  const cadlEndpoint = { preload: [], page: [], ...toJSON(cadlEndpointProp) }
  const configYml = _toYAML(config)
  const preloadNames = u.keys(preloads)
  const pageNames = u.keys(pages)
  const preloadAndPageKeys = [...preloadNames, ...pageNames]
  const preloadsAndPageYmls = preloadAndPageKeys.reduce(
    (acc, name) => {
      const value = preloads[name] || pages[name]
      const response = _toYAML(value)
      const route = `/${name}_en.yml`
      acc[route] = response
      return acc
    },
    {} as Record<string, string>,
  )

  for (const [names, key] of [
    [preloadNames, 'preload'],
    [pageNames, 'page'],
  ] as const) {
    for (const name of names) {
      if (!cadlEndpoint[key].includes(name)) cadlEndpoint[key].push(name)
    }
  }

  const cadlEndpointYml = _toYAML(cadlEndpointProp)
  const configPathName = `/config/${configKey}.yml`
  const cadlEndpointPathName = `${appURL.pathname}cadlEndpoint.yml`
  const cadlEndpointEndpoint = `${appURL.origin}${cadlEndpointPathName}`

  configScope.get(configPathName).reply(200, configYml)
  appScope.get(cadlEndpointPathName).reply(200, cadlEndpointYml)

  const endpoints = [configURL.toString(), cadlEndpointEndpoint] as string[]

  nockYAMLFile(configScope, configPathName, configYml)
  nockYAMLFile(appScope, cadlEndpointPathName, cadlEndpointYml)

  u.entries(preloadsAndPageYmls).forEach(([route, response]) => {
    route = `${appURL.pathname}${route}`.replace(/\/\//g, '/')
    const endpoint = appURL.origin + route
    nockYAMLFile(appScope, route, response)
    endpoints.push(endpoint)
  })

  return {
    appScope,
    config,
    cadlEndpoint,
    configScope,
    configKey,
    endpoints,
  }
}

export type NockAppBuilder = ReturnType<typeof createAppNocker>
type PageResponseInput =
  | LiteralUnion<`fix:${string}`, string>
  | Record<string, any>
  | any[]

export function createAppNocker() {
  let _config = createRootConfig()
  let _cadlEndpoint = createCadlEndpoint()
  let _cadlVersion = ''
  let _configUrl = ''
  let _responses = new Map<string, string>()

  _config.cadlMain = 'cadlEndpoint.yml'
  _cadlEndpoint.baseUrl = '${cadlBaseUrl}'
  _cadlEndpoint.assetsUrl = '${cadlBaseUrl}assets/'
  _cadlEndpoint.fileSuffix = '.yml'
  _cadlEndpoint.languageSuffix = { unknown: 'en' }

  function _toYAML(value: unknown) {
    if (u.isStr(value)) {
      if (value.startsWith('fix:')) {
        value = value.substring(4)
        return loadFixture.sync(...(value as string).split('/'))
      }
      return value
    }
    if (u.isObj(value) || u.isArr(value)) return y.stringify(value)
    return value == null ? '' : String(value)
  }

  function _setAppFile(
    type: 'preload' | 'page',
    name: string,
    response?: PageResponseInput,
  ) {
    _cadlEndpoint[type].push(name)
    if (response !== undefined) setFileResponse(name, response)
  }

  function setFileResponse(name: string, response: PageResponseInput) {
    _responses.set(name, _toYAML(response))
  }

  const o = {
    getFileName(name: string, withLanguageSuffix = true) {
      let fileName = `${name}`
      if (withLanguageSuffix) {
        fileName += `_${_cadlEndpoint.languageSuffix.unknown}`
      }
      fileName += _cadlEndpoint.fileSuffix
      return fileName
    },
    setApiHost: (apiHost: string) => {
      _config.apiHost = apiHost
      return o
    },
    setApiPort: (apiPort: string | number) => {
      _config.apiPort = apiPort
      return o
    },
    setCadlBaseUrl: (cadlBaseUrl: string) => {
      _config.cadlBaseUrl = cadlBaseUrl
      return o
    },
    setMyBaseUrl: (myBaseUrl: string) => {
      _config.myBaseUrl = myBaseUrl
      return o
    },
    setCadlVersion: (cadlVersion: string | number) => {
      _cadlVersion = String(cadlVersion)
      for (const deviceType of ['web', 'android', 'ios']) {
        for (const env of ['stable', 'test']) {
          const paths = [deviceType, 'cadlVersion', env]
          set(_config, paths, _cadlVersion)
        }
      }
      return o
    },
    setConfigUrl: (configUrl: string) => {
      _configUrl = configUrl
      return o
    },
    setCadlMain: (cadlMain: LiteralUnion<'cadlEndpoint.yml', string>) => {
      _config.cadlMain = cadlMain
      return o
    },
    setFileSuffix: (value: LiteralUnion<'.json' | '.yml', string>) => {
      _cadlEndpoint.fileSuffix = value
      return o
    },
    setLanguageSuffix: (
      key: LiteralUnion<'unknown', string>,
      value: string,
    ) => {
      _cadlEndpoint.languageSuffix[key] = value
      return o
    },
    setViewWidthHeightRatio: (min: number, max?: number) => {
      _config.viewWidthHeightRatio = { min, max: u.isUnd(max) ? min : max }
      return o
    },
    setPreload: partial(_setAppFile, 'preload'),
    setPage: partial(_setAppFile, 'page'),
    setStartPage: (startPage: string) => {
      _cadlEndpoint.startPage = startPage
      return o
    },
    nock: (baseUrl: string) => {
      function createResponseMapByName(names: string[]) {
        const result = {} as Record<string, string>
        for (const name of names) set(result, name, _responses.get(name))
        return result
      }

      if (!baseUrl) {
        throw new Error(`baseUrl is required.`)
      }

      const nockedApp = nockApp({
        baseUrl,
        configUrl: _configUrl,
        config: _config,
        cadlEndpoint: _cadlEndpoint,
        preloads: createResponseMapByName(_cadlEndpoint.preload),
        pages: createResponseMapByName(_cadlEndpoint.page),
      })

      return nockedApp
    },
  }

  return o
}

export function mockYmlPageResponse<
  PageName extends string,
  O extends Record<PageName, any>,
>(base = baseUrl, pageName: PageName, pageObject: O) {
  nock(base).get(new RegExp(pageName)).reply(200, toYml(pageObject))
}

export function setSignedInValues(
  root: CADL['root'],
  opts: {
    id?: string
    countryCode?: string
    password: string
    phoneNumber: string
    pk: string
    sk: string
    esk: string
    user_vid: string
    jwt?: string
    vcjwt?: string
    verificationCode: string | number
  },
) {
  const id = opts.id || 'XVGuMAAAAACOrwJCrBIABQ=='
  const verificationCode = String(opts.verificationCode)
  const phone = `${opts.countryCode} ${opts.phoneNumber}`
  const rvCondition = `uid like '%${verificationCode} ${opts.phoneNumber}'`
  const jwt = opts.jwt || 'XVGuMgAAAABLmgJCrBIABQ=='
  const vcjwt = opts.vcjwt || 'XVGuMgAAAABLmgJCrBIABQ=='
  set(root.SignIn, 'apiData.phoneNumber', phone)
  set(root.SignIn, 'formData.checkMessage', 'no message')
  set(root.SignIn, 'formData.checkOk', true)
  set(root.SignIn, 'formData.code', verificationCode)
  set(root.SignIn, 'formData.countryCode', opts.countryCode || '+1')
  set(root.SignIn, 'formData.phoneNumber', opts.phoneNumber)
  set(root.SignIn, 'formData.pass', true)
  set(root.SignIn, 'formData.password', opts.password)
  set(root.SignIn, 'formData.sk', opts.sk)
  set(root, 'Global.currentUser.vertex.sk', opts.sk)
  set(root, 'Global.currentUser.vertex.esk', opts.esk)
  set(root, 'rvCondition', rvCondition)
  set(root, 'verificationCode.response.code', verificationCode)
  set(root, 'verificationCode.response.edge', {
    error: '',
    jwt,
    edge: {
      ctime: 1641686338,
      mtime: 1641686338,
      atime: 1641686338,
      atimes: 1,
      bvid: '',
      type: 1010,
      name: {
        phone_number: phone,
      },
      evid: '',
      subtype: 0,
      stime: 0,
      etime: 0,
      refid: '',
      besak: '',
      eesak: '',
      sig: '',
      tage: Number(opts.countryCode),
      deat: {
        phone_number: phone,
        verification_code: verificationCode,
      },
      id,
    },
    code: 0,
  })
  cadl.root.Global = GlobalObjectFixture
  localStorage.setItem('Global', JSON.stringify(GlobalObjectFixture))
  localStorage.setItem('jwt', jwt)
  localStorage.setItem('vcjwt', vcjwt)
  localStorage.setItem('sk', opts.sk)
  localStorage.setItem('pk', opts.pk)
  localStorage.setItem('user_vid', opts.user_vid)
  localStorage.setItem('esk', opts.esk)
}

export function getMockRequestVerificationCodeResponse(
  phoneNumber = '',
  verificationCode = '' as string | number,
) {
  return {
    code: 0,
    name: 'SUCCESS',
    message: 'success',
    data: {
      phone_number: phoneNumber,
      verification_code: Number(verificationCode),
    },
  }
}
