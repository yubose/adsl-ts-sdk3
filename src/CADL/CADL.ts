import * as u from '@jsmanifest/utils'
import * as nt from 'noodl-types'
import clone from 'lodash/clone'
import cloneDeep from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import produce, { Draft, setAutoFreeze } from 'immer'
import { isBrowser } from '../utils/common'
setAutoFreeze(false)
import store from '../common/store'
import { PopulateError, UnableToExecuteFn, UnableToLoadConfig } from '../errors'
import {
  populateObject,
  populateKeys,
  populateVals,
  populateArray,
  replaceEvalObject,
  replaceVars,
} from './utils'
import { createFuncAttacher } from './commonUtils'
import hasAbortPopup from '../utils/hasAbortPopup'
import getDispatcher from '../dispatcher'
import getEmitter from '../emit'
import fetchNoodlObject from '../utils/fetchNoodlObject'
import log from '../utils/log'
import isNoodlFunction from '../utils/isNoodlFunction'
import isPopulated from '../utils/isPopulated'
import mergeDeep from '../utils/mergeDeep'
import populateString from '../utils/populateString'
import builtInFns from './services/builtIn'
// import IndexRepository from '../db/IndexRepository'
import cache from '../cache'
import ActiveQueue from '../ActiveQueue'
import { _TEST_ } from '../utils/common'
import * as c from '../constants'
import * as t from '../types'
import { deepCopy } from '../deepClone'
import getNoodlObject from '../utils/getNoodlObject'

export default class CADL {
  #aspectRatio = 1
  #designSuffix = {} as Record<string, any>
  #config: nt.RootConfig | null = null
  #cadlBaseUrl: string | undefined
  #baseUrl = ''
  #assetsUrl = ''
  #dispatch: ReturnType<typeof getDispatcher>
  #emit: ReturnType<typeof getEmitter>
  #root: t.Root
  #state = {
    init: {
      initiating: false,
      done: false,
      error: null,
    },
  } as t.State
  #subscribers = {
    queue: [],
  } as t.ActiveQueueSubscribers
  #dbConfig: any
  // #indexRepository: IndexRepository
  #queue: ActiveQueue

  cadlEndpoint: nt.AppConfig | null = null
  cadlVersion: nt.Env
  initCallQueue = [] as any[]
  mountedCallQueue = [] as any
  myBaseUrl = ''
  verificationRequest = {
    timer: 0,
    phoneNumber: '',
  };

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return {
      assetsUrl: this.assetsUrl,
      cadlBaseUrl: this.cadlBaseUrl,
      cadlEndpoint: this.cadlEndpoint,
      cadlVersion: this.cadlVersion,
      myBaseUrl: this.myBaseUrl,
      state: this.getState(),
    }
  }

  constructor({
    configUrl,
    cadlVersion,
    aspectRatio,
    dbConfig,
    loglevel,
    SearchClient,
  }: {
    configUrl: string
    cadlVersion: nt.Env
    aspectRatio?: number
    loglevel?: keyof typeof log.levels
    dbConfig?: any
    SearchClient?: InstanceType<any> // See the interac
  }) {
    store.env = cadlVersion
    store.configUrl = configUrl
    store.noodlInstance = this
    if (loglevel) log.setLevel(loglevel)
    this.cadlVersion = cadlVersion
    if (aspectRatio) this.aspectRatio = aspectRatio
    this.#dbConfig = dbConfig
    // this.#indexRepository = new IndexRepository()
    this.#dispatch = getDispatcher(this)
    this.#emit = getEmitter<t.Root>(
      (callback) => (this.root = callback(this.root)),
    )
    this.#root = produce({} as t.Root, (draft) => {
      draft.actions = {}
      // draft.builtIn = builtInFns(this.dispatch.bind(this))
      draft.builtIn = builtInFns({
        dispatch: this.dispatch.bind(this),
        processPopulate: this.processPopulate.bind(this),
        getPage: this.getPage.bind(this),
        emit: this.emit.bind(this),
        // SearchClient,
      })
      draft.apiCache = {} as t.Root['apiCache']
    }) as t.Root
    this.#queue = new ActiveQueue()
  }

  get dispatch() {
    return this.#dispatch
  }

  get emit() {
    return this.#emit
  }

  // get indexRepository() {
  //   return this.#indexRepository
  // }

  get replaceEvalObject() {
    return replaceEvalObject
  }

  /**
   * Loads noodl config if not already loaded
   * Sets CADL version, baseUrl, assetsUrl, and root
   */
  async init({
    onFetchPreload,
    pageSuffix,
    use,
  }: {
    onFetchPreload?: (
      name: string,
      config: nt.RootConfig,
      cadlEndpoint: nt.AppConfig,
    ) => void
    pageSuffix?: string
    use?: {
      BaseDataModel?: Record<string, any>
      BaseCSS?: Record<string, any>
      BasePage?: Record<string, any>
      config?: nt.RootConfig
      cadlEndpoint?: nt.AppConfig
    } & { [pageName: string]: Record<string, any> }
  } = {}): Promise<void> {
    let config: nt.RootConfig

    try {
      config = (use?.config ||
        (await store.level2SDK.loadConfigData())) as nt.RootConfig
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      throw new UnableToLoadConfig(
        `An error occured while trying to load the config. ` +
          `Config settings: ${JSON.stringify({
            apiHost: store.apiHost,
            apiProtocol: store.level2SDK.apiProtocol,
            apiVersion: store.level2SDK.apiVersion,
            configUrl: store.configUrl,
            env: store.env,
          })}`,
        err,
      )
    }

    // Initialize sqlite db
    // await this.#indexRepository.getDataBase(this.#dbConfig)

    //get app curent position

    if (isBrowser() && config?.isGetPosition) {
      const opt = {
        enableHighAccuracy: true,
        timeout: 3000,
        maximumAge: 60 * 1000,
      }
      window.navigator?.geolocation?.getCurrentPosition?.(
        (position) => {
          const longitude = position.coords.longitude
          const latitude = position.coords.latitude
          store.currentLatitude = latitude
          store.currentLongitude = longitude

          window.localStorage?.setItem?.('longitude', JSON.stringify(longitude))
          window.localStorage?.setItem?.('latitude', JSON.stringify(latitude))
        },
        (error) => {
          let msg = ''
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'User rejects request to get geolocation.'
              break
            case error.POSITION_UNAVAILABLE:
              msg = 'Location information is not available.'
              break
            case error.TIMEOUT:
              msg = 'Requesting user geolocation timed out.'
              break
            default:
              msg = `Error: ${error.message || 'unknown error'}`
            // case error.UNKNOWN_ERROR:
            //     msg = "unknown error"
            //     break;
          }
          log.error(msg)
        },
        opt,
      )
    }

    const {
      web = { cadlVersion: '' },
      cadlBaseUrl = '',
      cadlMain = '',
      designSuffix = '',
      myBaseUrl = '',
    } = config || {}

    this.cadlVersion = (web.cadlVersion as any)[this.cadlVersion]
    this.#designSuffix = designSuffix
    this.cadlBaseUrl = cadlBaseUrl
    this.myBaseUrl = myBaseUrl

    let cadlEndpointUrl = `${this.cadlBaseUrl}${cadlMain}`

    const cadlMainArr = cadlMain.split('.')
    let format = cadlMainArr.pop()
    if (format !== 'json') format = 'yml'

    if (format === 'json') {
      this.cadlEndpoint =
        use?.cadlEndpoint ||
        (await getNoodlObject<nt.AppConfig>(cadlEndpointUrl))[0]
    } else {
      this.cadlEndpoint =
        use?.cadlEndpoint ||
        (await fetchNoodlObject<nt.AppConfig>(cadlEndpointUrl))[0]
    }

    const { baseUrl = '', assetsUrl = '', preload } = this.cadlEndpoint || {}

    this.baseUrl = baseUrl
    this.assetsUrl = assetsUrl
    this.#config = this.processPopulate({
      source: config,
      lookFor: ['.', '..', '=', '~'],
    }) as nt.RootConfig

    this.emit({
      type: c.emitType.SET_ROOT_PROPERTIES,
      payload: { properties: { Config: this.#config } },
    })

    const preloads = (preload || []) as string[]
    // for (const name of preloads) {
    // await Promise.all(
    //   preloads.map(async (name) => {
    //     let source = use?.[name]
    //     if (!source) {
    //       //@ts-ignore
    //       onFetchPreload?.(name, this.#config, this.cadlEndpoint)
    //       source = (await this.getPage(name, { pageSuffix }))?.[0]
    //     }
    //     if (use?.[name]) {
    //       this.emit({
    //         type: c.emitType.SET_ROOT_PROPERTIES,
    //         payload: {
    //           properties: this.processPopulate({
    //             source,
    //             skip: ['listObject', 'style'],
    //             lookFor: ['.', '..', '=', '~'],
    //           }),
    //         },
    //       })
    //     } else {
    //       this.emit({
    //         type: c.emitType.SET_ROOT_PROPERTIES,
    //         payload: {
    //           properties: this.processPopulate({
    //             source,
    //             skip: ['dataIn', 'listObject', 'style'],
    //             lookFor: ['.', '..', '=', '~'],
    //           }),
    //         },
    //       })
    //     }
    //     // }
    //   }),
    // )

    if (this.cadlEndpoint.isAnalyzed) {
      let source = (await this.getPage('BaseRoot', { pageSuffix }))?.[0]
      this.emit({
        type: c.emitType.SET_ROOT_PROPERTIES,
        payload: {
          properties: source,
        },
      })
    } else {
      await Promise.all(
        preloads.map(async (name) => {
          let source = use?.[name]
          if (!source) {
            //@ts-ignore
            onFetchPreload?.(name, this.#config, this.cadlEndpoint)
            source = (await this.getPage(name, { pageSuffix }))?.[0]
          }
          if (use?.[name]) {
            this.emit({
              type: c.emitType.SET_ROOT_PROPERTIES,
              payload: {
                properties: this.processPopulate({
                  source,
                  skip: ['listObject', 'style'],
                  lookFor: ['.', '..', '=', '~'],
                }),
              },
            })
          } else {
            this.emit({
              type: c.emitType.SET_ROOT_PROPERTIES,
              payload: {
                properties: this.processPopulate({
                  source,
                  skip: ['dataIn', 'listObject', 'style'],
                  lookFor: ['.', '..', '=', '~'],
                }),
              },
            })
          }
          // }
        }),
      )
    }

    // set Global object from localStorage
    // used to retain user data in case of browser reload
    let cachedGlobal = isBrowser() && window.localStorage?.getItem?.('Global')
    let cachedGlobalParsed: Record<string, any> | null = null
    if (cachedGlobal) {
      try {
        cachedGlobalParsed = JSON.parse(cachedGlobal)
        if (window.location.href.includes('store.aitmed.com')) {
          if (cachedGlobalParsed) {
            cachedGlobalParsed.formData.shopLink = true
          }
        }
      } catch (error) {
        log.error(error instanceof Error ? error : new Error(String(error)))
      }
      if (cachedGlobalParsed) {
        this.emit({
          type: c.emitType.SET_ROOT_PROPERTIES,
          payload: {
            properties: {
              Global: {
                ...cachedGlobalParsed,
                globalRegister: this.root.Global?.globalRegister,
              },
            },
          },
        })
        const currentUser = cachedGlobalParsed?.currentUser
        const userVertex = currentUser?.vertex
        const ls = u.isBrowser() ? window.localStorage : null

        if (ls) {
          if (!ls.getItem('jwt') && currentUser?.JWT) {
            ls.setItem('jwt', currentUser.JWT)
          }

          if (!ls.getItem('pk') && userVertex?.pk) {
            ls.setItem('pk', userVertex.pk)
          }

          if (!ls.getItem('sk') && userVertex?.sk) {
            ls.setItem('sk', userVertex.sk)
          }

          if (!ls.getItem('user_vid') && userVertex?.id) {
            ls.setItem('user_vid', userVertex.id)
          }
        }

        await this.dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName: 'builtIn',
            dataKey: 'builtIn.UserVertex',
            data: userVertex,
          },
        })
      }
    }
  }

  /**
   *
   * @param pageName
   * @param skip Denotes the keys to skip in the population process
   * @param options Object that takes in set of options for the page
   *
   * @throws {UnableToRetrieveYAML} -When unable to retrieve noodlYAML
   * @throws {UnableToParseYAML} -When unable to parse yaml file
   * @throws {UnableToExecuteFn} -When something goes wrong while executing any init function
   *
   * - initiates cadlObject for page specified
   */
  async initPage(
    pageArg:
      | string
      | {
          pageName: string
          cadlYAML: string
          cadlObject: Record<string, nt.PageObject>
        },
    skip: string[] = [],
    options: Pick<
      Parameters<CADL['runInit']>[0],
      'onBeforeInit' | 'onInit' | 'onAfterInit'
    > & {
      reload?: boolean //if true then the pageObject is replaced
      builtIn?: Record<string, any>
      onReceive?(obj: { [pageName: string]: any }): Promise<void> | void
      onAbort?(obj: { [pageName: string]: any }): Promise<void> | void
      onFirstProcess?(obj: { [pageName: string]: any }): Promise<void> | void
      onSecondProcess?(obj: { [pageName: string]: any }): Promise<void> | void
      onFetchPage?: (
        pageName: string,
        config: nt.RootConfig,
        cadlEndpoint: nt.AppConfig,
      ) => void
      pageSuffix?: string
      shouldAttachRef?: t.ShouldAttachRefFn
      wrapEvalObjects?: boolean
    } = {},
  ): Promise<void | { aborted: true }> {
    if (!this.cadlEndpoint) await this.init()

    const { builtIn, reload, wrapEvalObjects = true } = options
    u.isNil(reload) && (options.reload = true)

    if (builtIn && u.isObj(builtIn)) {
      this.emit({
        type: c.emitType.ADD_BUILTIN_FNS,
        payload: { builtInFns: { ...builtIn } },
      })
    }

    const cachePageIfNonExistent = (
      page: string,
      pageObject: Record<string, any>,
    ) => {
      if (pageObject && !cache.pages[page]) {
        cache.pages[page] = cloneDeep(pageObject[page] || pageObject)
      }
    }

    let pageName = ''
    let pageCADL: Record<string, nt.PageObject> | undefined

    if (u.isStr(pageArg)) {
      pageName = pageArg
    } else if (pageArg?.pageName) {
      cachePageIfNonExistent(
        (pageName = pageArg.pageName),
        (pageCADL = pageArg.cadlObject),
      )
    }

    if (reload === false && this.root[pageName]) {
      // Keep the current pageObject
      return
    } else {
      if (!pageCADL) {
        if (cache.pages[pageName]) {
          pageCADL = cloneDeep({ [pageName]: cache.pages[pageName] })
        } else {
          options?.onFetchPage?.(
            pageName,
            this.#config as nt.RootConfig,
            this.cadlEndpoint as nt.AppConfig,
          )
          cachePageIfNonExistent(
            pageName,
            (pageCADL = (
              await this.getPage(pageName, { pageSuffix: options?.pageSuffix })
            )[0]),
          )
        }
      }
      options?.onReceive && (await options?.onReceive?.(pageCADL as any))
    }

    if (this.root[pageName] && reload) {
      this.emit({ type: 'DELETE_PAGE', payload: { pageName } })
    }

    // The pageObject requires multiple processes
    // in order to dereference references that are dependent on other references
    /**
     * e.g =..pageName.object.edge.refid ---> =..pageName.object2.edge.id
     * here the reference "=..pageName.object.edge.refid" references
     * another reference "=..pageName.object2.edge.id"
     * to avoid this we process the object multiple times to make sure that
     * all references that exist are accounted for
     */

    let obj = pageCADL

    // obj = this.processPopulate({
    //   source: obj,
    //   lookFor: ['.', '..', '~'],
    //   skip: ['update', 'save', 'check', 'init', 'components',"lazyState", ...skip],
    //   withFns: true,
    //   pageName,
    //   shouldAttachRef: options?.shouldAttachRef,
    //   wrapEvalObjects,
    // }) as Record<string, nt.PageObject>

    options?.onFirstProcess && (await options.onFirstProcess?.(obj))
    obj = this.processPopulate({
      source: obj,
      lookFor: ['.', '..', '_', '~'],
      skip: [
        'update',
        'check',
        'init',
        'formData',
        'components',
        'lazyState',
        'updateState',
        ...skip,
      ],
      shouldAttachRef: options?.shouldAttachRef,
      withFns: true,
      pageName,
      wrapEvalObjects,
    }) as Record<string, nt.PageObject>

    options?.onSecondProcess && (await options.onSecondProcess?.(obj))

    this.emit({
      type: c.emitType.SET_ROOT_PROPERTIES,
      payload: { properties: obj },
    })

    let aborted = false
    let init = u.values(obj)[0]?.init

    const transformPage = async (
      obj: Record<string, nt.PageObject>,
      optsList?: Record<string, any>[],
      pageName = '',
      shouldAttachRef?: t.ShouldAttachRefFn,
    ) => {
      try {
        let currIndex = 0
        let skip = [
          'update',
          'check',
          'init',
          'formData',
          'dataIn',
          'style',
          'options',
          'placeholder',
          'message',
          'lazyState',
          'updateState',
        ] as string[]

        if (init) {
        } else {
          skip.push('style')
        }

        while (currIndex <= 1) {
          if (currIndex < 2) {
            skip.push('backgroundColor')
          } else {
            if (skip.includes('backgroundColor')) {
              skip.splice(skip.indexOf('backgroundColor'), 1)
            }
          }

          if (currIndex >= 1) {
            for (const kind of ['edge', 'document', 'vertex']) {
              if (!skip.includes(kind)) skip.push(kind)
            }
          }

          if (currIndex > 1) {
            if (init?.includes('style')) {
              init.splice(init.indexOf('style'), 1)
            }
          }

          if (!this.cadlEndpoint?.isAnalyzed) {
            obj = this.processPopulate({
              source: obj,
              lookFor: ['.', '..', '_', '~'],
              withFns: true,
              pageName,
              shouldAttachRef,
              ...optsList?.[currIndex],
              skip: [...skip, ...(optsList?.[currIndex]?.skip || [])],
              wrapEvalObjects: true,
            })
          }
          currIndex++
        }

        // obj = this.processPopulate({
        //   source: obj,
        //   lookFor: ['.', '..', '_', '~'],
        //   withFns: true,
        //   pageName,
        //   shouldAttachRef,
        //   ...optsList?.[currIndex],
        //   skip: [...skip, ...(optsList?.[currIndex]?.skip || [])],
        //   wrapEvalObjects: true,
        // })

        if (!_TEST_ && !(pageName in obj)) {
          if (cache[pageName]) {
            obj[pageName] = cloneDeep(cache[pageName])
          } else {
            obj[pageName] = {} as any
            log.warn(
              `%c"${pageName}" does not exist in the root or cache. An empty object was created instead`,
              `color:#ec0000;`,
              obj,
            )
          }
        }

        const components =
          populateArray({
            source: obj[pageName]?.components || [],
            lookFor: '=',
            pageName,
            locations: [obj[pageName], this.root],
            shouldAttachRef,
            ...optsList?.[currIndex],
            skip: [
              'update',
              'check',
              'edge',
              'document',
              'vertex',
              'init',
              'formData',
              'dataIn',
              'style',
              'options',
              ...(optsList?.[currIndex]?.skip || []),
            ],
          }) || []

        set(obj, [pageName, 'components'], components)

        if (wrapEvalObjects) {
          obj = await replaceEvalObject({
            pageName,
            cadlObject: obj,
            dispatch: this.dispatch.bind(this),
            ...optsList?.[++currIndex],
          })
        }
      } catch (error) {
        log.error(error)
      }
      return obj
    }

    if (init) {
      const page: { abort: boolean } | Record<string, nt.PageObject> =
        await this.runInit({
          pageObject: obj,
          onBeforeInit: options?.onBeforeInit,
          onInit: options?.onInit,
          onAfterInit: options?.onAfterInit,
        })

      if ('abort' in page) {
        if (page.abort) {
          aborted = true
          pageCADL && options?.onAbort && (await options?.onAbort?.(pageCADL))
        }
      }

      if (!aborted) {
        const consumerSkipKeys = skip || []
        this.emit({
          type: c.emitType.SET_ROOT_PROPERTIES,
          payload: {
            properties: await transformPage(
              page as Record<string, nt.PageObject>,
              consumerSkipKeys.map((key) => ({ skip: [key] })),
              pageName,
              options?.shouldAttachRef,
            ),
          },
        })
      }
    } else {
      const consumerSkipKeys = skip || []
      this.emit({
        type: c.emitType.SET_ROOT_PROPERTIES,
        payload: {
          properties: await transformPage(
            obj as Record<string, nt.PageObject>,
            [
              { skip: ['ecosObj', 'style', ...consumerSkipKeys] },
              { skip: ['ecosObj', 'style', ...consumerSkipKeys] },
              { skip: ['ecosObj', 'style', ...consumerSkipKeys] },
            ],
            pageName,
            options?.shouldAttachRef,
          ),
        },
      })
    }

    if (aborted) return { aborted }
  }

  /**
   * @param pageName
   * @returns { object }
   * @throws {UnableToRetrieveYAML} -When unable to retrieve cadlYAML
   * @throws {UnableToParseYAML} -When unable to parse yaml file
   */
  async getPage(
    pageName: string,
    { pageSuffix = '_en' }: { pageSuffix?: string } = {},
  ): Promise<[Record<string, nt.PageObject>, string]> {
    //TODO: used for local testing
    // if (pageName === 'AddDocuments') return cloneDeep(AddDocuments)
    // if (pageName === 'BaseDataModel') return cloneDeep(BaseDataModel)

    let pageCADL: Record<string, nt.PageObject>
    let pageYAML = ''
    let pageUrl = ''

    if (pageName.startsWith('~')) {
      pageUrl = !this.myBaseUrl ? this.baseUrl : this.myBaseUrl
      pageName = pageName.substring(2)
    } else {
      pageUrl = this.baseUrl
    }

    try {
      const cadlMainArr = this.config?.cadlMain.split('.') as Array<string>
      let format = cadlMainArr.pop()
      if (format !== 'json') format = 'yml'
      if (format === 'json') {
        let url = `${pageUrl}${pageName}${pageSuffix}.json`

        const [cadlObject, cadlJSON] = await getNoodlObject(url)
        pageCADL = cadlObject
        pageYAML = cadlJSON
      } else {
        let url = `${pageUrl}${pageName}${pageSuffix}.yml`
        const [cadlObject, cadlYAML] = await fetchNoodlObject(url)
        pageCADL = cadlObject
        pageYAML = cadlYAML
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      log.error(`Error occurred fetching "${pageName}"`, err)
      throw error
    }

    return [pageCADL, pageYAML]
  }

  /**
   * Used to populate the references of the noodl files.
   *
   * @param ProcessPopulateArgs
   * @param ProcessPopulateArgs.source  The item being de-referenced.
   * @param ProcessPopulateArgs.lookFor  Reference tokens to look for e.g ['.','..'].
   * @param ProcessPopulateArgs.pageName
   * @param ProcessPopulateArgs.skip Keys that should not be de-referenced e.g ['name','country'].
   * @param ProcessPopulateArgs.withFns Choose to attach ecos functions to the source
   *
   * @returns The processed/de-referenced object.
   *
   */
  processPopulate({
    source,
    lookFor,
    skip,
    pageName,
    shouldAttachRef,
    withFns = true,
    wrapEvalObjects = true,
  }: {
    source: Record<string, any>
    lookFor: string[]
    pageName?: string
    skip?: string[]
    shouldAttachRef?: t.ShouldAttachRefFn
    withFns?: boolean
    wrapEvalObjects?: boolean
  }): Record<string, any> {
    let sourceCopy = source
    let localRoot = pageName ? sourceCopy[pageName] : sourceCopy
    // let rootDeepCopy = cloneDeep(this.root)
    let rootDeepCopy = deepCopy(this.root)
    let localDeepCopy = clone(localRoot)

    // for (const [op, locations] of [
    //   ['.', [rootDeepCopy]],
    //   ['..', [localDeepCopy]],
    // ]) {
    let queueObject: t.ActiveQueueObject | undefined
    try {
      queueObject = this.#queue.create({
        type: 'populate',
        kind: 'keys',
        // location: locations[0] === rootDeepCopy ? 'root' : 'local',
        // operator: op as string,
        location: ['root', 'local'],
        operator: ['.', '..'],
        pageName,
      })
      // sourceCopy = populateKeys({
      //   source: sourceCopy,
      //   lookFor: op as string,
      //   locations: locations as any[],
      // })
      sourceCopy = populateKeys({
        source: sourceCopy,
        root: rootDeepCopy,
        localRoot: localDeepCopy,
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      queueObject && (queueObject.error = err)
      throw new PopulateError(err.message, 'keys')
    } finally {
      queueObject && this.#queue.remove(queueObject)
    }
    // }

    localRoot = pageName ? sourceCopy[pageName] : sourceCopy

    {
      let queueObject: t.ActiveQueueObject | undefined
      try {
        queueObject = this.#queue.create({
          type: 'populate',
          kind: 'values',
          location: ['root', 'local'],
          operator: lookFor,
          pageName,
        })
        sourceCopy = populateVals({
          source: sourceCopy,
          lookFor,
          skip,
          locations: [this, rootDeepCopy, localDeepCopy],
          pageName,
          dispatch: this.dispatch.bind(this),
          shouldAttachRef,
        })
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        queueObject?.kind === 'values' && (queueObject.error = err)
        throw new PopulateError(err.message, 'values')
      } finally {
        queueObject && this.#queue.remove(queueObject)
      }
    }

    localRoot = pageName ? sourceCopy[pageName] : sourceCopy

    let result: any

    {
      let queueObject: t.ActiveQueueObject | undefined
      try {
        queueObject = this.#queue.create({
          type: 'populate',
          kind: 'functions',
          location: ['object'],
          operator: lookFor,
          pageName,
        })
        result = withFns
          ? createFuncAttacher({
              cadlObject: sourceCopy,
              dispatch: this.dispatch.bind(this),
            })
          : sourceCopy
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        queueObject?.kind === 'functions' && (queueObject.error = err)
        throw new PopulateError(err.message, 'functions')
      } finally {
        queueObject && this.#queue.remove(queueObject)
      }
    }

    return result
  }

  /**
   *
   * @param HandleEvalStringArgs.stringArg The item being de-referenced
   * @param HandleEvalStringArgs.pageName
   *
   * Used as a helper function for emitCall --> evalObject
   */
  async handleEvalString({ stringArg, pageName }) {
    for (const op of ['..', '.', '=', '~']) {
      if (stringArg.startsWith(op)) {
        // if (/sugges/i.test(stringArg)) debugger
        return populateString({
          source: stringArg,
          lookFor: op,
          locations: op == '~' ? [this] : [this.root, this.root[pageName]],
        })
      }
    }
  }

  /**
   *
   * @example
   * ```js
   * await handleEvalObject({ object: { '.path@': 5, '.path2@': 6 }, pageName: 'SignIn })
   * ```
   * @param HandleEvalObject.object series of commands in object {key:val} format
   * @param HandleEvalObject.pageName
   *
   * Used as a helper function for emitCall --> evalObject
   */
  async handleEvalObject({
    object,
    pageName,
  }: {
    object: nt.EvalActionObject['object']
    pageName?: string
  }) {
    let results: any
    if (u.isObj(object)) {
      for (const key of u.keys(object)) {
        const result = await this.handleEvalCommands({
          commands: object,
          key,
          pageName,
        })
        if (!u.isUnd(result)) {
          if (!results) {
            results = result
            continue
          }
          if (!u.isArr(results)) results = []
          results.push(result)
          if (hasAbortPopup(result)) return results
        }
      }
    }

    return results
  }

  /**
   * @param HandleEvalArray.pageName
   *
   * Used as a helper function for emitCall --> evalObject
   *
   * @example
   * ```
   * const result = await handleEvalArray([
   * 	  { '.path@': 3 },
   *    { 'path2@': 5 },
   *    { if: ['.condition', ifTrue, ifFalse] }
   * ])
   * ```
   */
  async handleEvalArray({
    array,
    pageName = '',
    options,
  }: {
    array: any[]
    pageName?: string
    options?: {}
  }) {
    if (array === undefined) {
      return []
    }
    let results = [] as any[]
    for (const command of array) {
      /**
       * NOTE: object is being populated before running every command. This is done to ensure that the new change from a previous command is made available to the subsequent commands
       */
      let populatedCommand
      if (options?.['asyncThen']) {
        if (nt.Identify.action.any(command)) {
          populatedCommand = { actionType: command }
        } else {
          populatedCommand = command
        }
      } else if (
        nt.Identify.action.evalObject(command) &&
        !u.isStr(command['object'])
      ) {
        populatedCommand = { actionType: command }
      } else {
        populatedCommand = await this.dispatch({
          type: c.dispatchActionType.POPULATE_OBJECT,
          payload: { pageName, object: command, copy: true },
        })

        if (nt.Identify.action.any(populatedCommand)) {
          populatedCommand = { actionType: populatedCommand }
        }
      }

      if (u.isStr(populatedCommand)) {
        const result = await this.dispatch({
          type: c.dispatchActionType.EVAL_OBJECT,
          payload: { pageName: pageName, updateObject: populatedCommand },
        })
        results.push(result)
      }

      for (const key of u.keys(populatedCommand)) {
        const result = await this.handleEvalCommands({
          commands: populatedCommand,
          key,
          pageName,
        })

        /**
         * When a popUp is received (which 99% of the time is signaling to abort everything) we immediately return the results with the popUp action object to the client so they're able to stop this action chain
         */
        if (hasAbortPopup(result)) return [...results, result]
        results.push(result)
      }
    }

    return results
  }

  async handleAsyncEvalArray({
    array,
    pageName = '',
  }: {
    array: any[]
    pageName?: string
  }) {
    let results = [] as any[]
    let prolist: any = []
    for (const command of array) {
      /**
       * NOTE: object is being populated before running every command. This is done to ensure that the new change from a previous command is made available to the subsequent commands
       */
      let populatedCommand = await this.dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { pageName, object: command, copy: true },
      })

      if (nt.Identify.action.any(populatedCommand)) {
        populatedCommand = { actionType: populatedCommand }
      }
      const asynHandle = async () => {
        for (const key of u.keys(populatedCommand)) {
          const result = await this.handleEvalCommands({
            commands: populatedCommand,
            key,
            pageName,
          })
          /**
           * When a popUp is received (which 99% of the time is signaling to abort everything) we immediately return the results with the popUp action object to the client so they're able to stop this action chain
           */
          if (hasAbortPopup(result)) return [...results, result]
          results.push(result)
        }
        return results
      }
      prolist.push(asynHandle())
    }

    return Promise.all(prolist).then((res) => res)
  }
  async handleAsyncGlobalEvalArray({
    array,
    then,
    pageName = '',
  }: {
    array: any[]
    then: any[]
    pageName?: string
  }) {
    let results = [] as any[]
    let prolist: any = []
    let i = 0
    array.forEach(async (command) => {
      /**
       * NOTE: object is being populated before running every command. This is done to ensure that the new change from a previous command is made available to the subsequent commands
       */
      let populatedCommand = await this.dispatch({
        type: c.dispatchActionType.POPULATE_OBJECT,
        payload: { pageName, object: command, copy: true },
      })

      if (nt.Identify.action.any(populatedCommand)) {
        populatedCommand = { actionType: populatedCommand }
      }

      const asynHandle = async () => {
        for (const key of u.keys(populatedCommand)) {
          const result = await this.handleEvalCommands({
            commands: populatedCommand,
            key,
            pageName,
          })
          /**
           * When a popUp is received (which 99% of the time is signaling to abort everything) we immediately return the results with the popUp action object to the client so they're able to stop this action chain
           */
          if (hasAbortPopup(result)) return [...results, result]
          results.push(result)
        }
        return results
      }

      prolist.push(
        asynHandle().then(() => {
          i++
          if (i === array.length) {
            this.handleEvalArray({
              array: then,
              pageName,
              options: { asyncThen: true },
            })
          }
        }),
      )
    })

    return Promise.all(prolist).then((res) => res)
  }

async handleActionCommand({ action, pageName }) {
    if (action) {
      const consumerOptions = this.root.getConsumerOptions?.({
        page: pageName,
      })
      const opt = this.root.options
      const { actionType, funcName } = action
      let func = funcName
        ? this.root.extendedBuiltIn?.[funcName] || this.root.builtIn?.[funcName]
        : this.root.actions[actionType]
      let res
      if (u.isFnc(func)) {
        switch (actionType) {
          case 'builtIn':
            if(funcName === 'redrawCurrent'){
              res = await func?.(action, {
                ...consumerOptions,
                ...action,
                component: opt.component
              })
            }else{
              res = await func?.(action, {
                ...consumerOptions,
                ...action,
              })
            }
            
            break
          case 'updateObject':
          case 'saveObject':
            res = await func?.(action, {
              component: opt.component,
              ref: opt.ref,
            })
            break
          case 'popUp':
            func = this.root.builtIn['popUp']
            res = await func?.(action, {
              ...consumerOptions,
              ...action,
            })
            break
          case 'popUpDismiss':
            func = this.root.builtIn['popUpDismiss']
            res = await func?.(action, {
              ...consumerOptions,
              ...action,
            })
            break
          case 'toast':
          case 'refresh':
          case 'pageJump':
            res = await func?.(action)
            break
          case 'openCamera':
          case 'openDocumentManager':
          case 'openPhotoLibrary':
            res = await func?.(action, {
              ...consumerOptions,
              component: opt.component,
              ref: opt.ref,
            })
            break
          case 'setProgress':
          case 'getLocationAddress':
          case 'removeSignature':
          case 'scanCamera':
          case 'updateGlobal':
            res = await func?.(action, {
              ...consumerOptions,
              ...action,
            })
            break
          case 'redrawCurrent':
            res = await func?.(action, {
              ...consumerOptions,
              component: opt.component,
              ref: opt.ref,
            })
            break
          default:
            res = await func?.(action, consumerOptions)
        }
      }

      return res
    }
  }

  /**
   * @param HandleEvalCommandsArgs.commands Series of commands to evaluate
   * @param HandleEvalCommandsArgs.key Key to a specified command within commands
   *
   * Used as a helper function for emitCall --> evalObject
   */
  async handleEvalCommands({ commands, key, pageName }) {
    let results: any
    try{
      if (key === 'if') {
        const result = await this.handleIfCommand({
          pageName,
          ifCommand: { [key]: commands[key] } as nt.IfObject,
        })

        if (!u.isNil(result)) {
          if (u.isUnd(results)) results = result
          else if (u.isArr(results)) results.push(result)
          else results = [results, result]
        }
      } else if (key === 'switch') {
        const result = await this.handleSwitchCommand({
          pageName,
          switchCommand: { [key]: commands[key] },
        })

        if (!u.isNil(result)) {
          if (u.isUnd(results)) results = result
          else if (u.isArr(results)) results.push(result)
          else results = [results, result]
        }
      } else if (key === 'goto') {
        /**
         * object is being populated before running every command. This is done to ensure that the new change from a previous command is made available to the subsequent commands
         */
        const dataIn = commands[key]?.dataIn
        const shouldCopy =
          key.includes('builtIn') &&
          u.isObj(dataIn) &&
          !('object' in dataIn) &&
          !('array' in dataIn)

        const populatedCommand = await this.dispatch({
          type: c.dispatchActionType.POPULATE_OBJECT,
          payload: {
            pageName,
            object: { [key]: commands[key] },
            copy: shouldCopy,
          },
        })

        let gotoCommand: any

        if (u.isStr(populatedCommand[key])) {
          gotoCommand = {
            '=.builtIn.goto': {
              dataIn: { destination: populatedCommand[key] },
            },
          }
        } else if (u.isObj(populatedCommand[key])) {
          gotoCommand = {
            '=.builtIn.goto': populatedCommand[key],
          }
        }
        const result = await this.handleEvalFunction({
          command: gotoCommand,
          pageName,
          key: '=.builtIn.goto',
        })
        return {'abort': 'true'}
        // const result = { [key]: commands[key] }
        // if (!u.isNil(result)) {
        //   if (u.isUnd(results)) results = result
        //   else if (u.isArr(results)) results.push(result)
        //   else results = [results, result]
        // }
      } else if (key === 'actionType') {
        let result: any
        /**
         * commands ===
         * {actionType: { actionType: 'builtIn', funcName: 'disconnectMeeting' }}
         */
        if (nt.Identify.action.evalObject(commands?.actionType)) {
          const obj = commands.actionType?.object
          const then = commands.actionType?.then
          if (u.isFnc(obj)) {
            result = await obj()
          } else if (u.isArr(obj)) {
            if (commands.actionType?.async === 'global') {
              result = await this.handleAsyncGlobalEvalArray({
                array: obj,
                then: then,
                pageName,
              })
              // result.then(
              //   await this.handleAsyncGlobalEvalArray({
              //     array: then,
              //     pageName,
              //   })
              // )
            } else if (commands.actionType?.async === true) {
              result = await this.handleAsyncEvalArray({
                array: obj,
                pageName,
              })
            } else if (commands.actionType.callBack === true) {
              let count = 0
              const cycleTimes = commands.actionType?.cycleTimes
                ? commands.actionType?.cycleTimes
                : 1000
              const callBackTime = commands.actionType?.callBackTime
              const callBackTimerName = commands.actionType?.callBackTimerName
              const status = commands.actionType?.status
              const failObj = commands.actionType?.fail
              const successObj = commands.actionType?.success
              const isInterval = commands.actionType?.isInterval
              if (isInterval) {
                let isRun = false
                for (let i = 0; i < cycleTimes; i++) {
                  await this.handleEvalArray({
                    array: obj,
                    pageName,
                  })
                  const statueKey = await this.dispatch({
                    type: c.dispatchActionType.GET_DATA,
                    payload: {
                      dataKey: status,
                    },
                  })
                  if (statueKey === true || statueKey === 'true') {
                    await this.emitCall({
                      dataKey: {},
                      actions: successObj,
                      pageName,
                    })
                    isRun = true
                    break
                  } else if (statueKey === false || statueKey === 'false') {
                    await this.emitCall({
                      dataKey: {},
                      actions: failObj,
                      pageName,
                    })
                    isRun = true
                    break
                  }
                }

                if (!isRun) {
                  await this.emitCall({
                    dataKey: {},
                    actions: failObj,
                    pageName,
                  })
                }
              } else {
                const timer = setInterval(async () => {
                  if (count < cycleTimes) {
                    await this.handleEvalArray({
                      array: obj,
                      pageName,
                    })
                    const statueKey = await this.dispatch({
                      type: c.dispatchActionType.GET_DATA,
                      payload: {
                        dataKey: status,
                      },
                    })
                    if (statueKey === true || statueKey === 'true') {
                      await this.emitCall({
                        dataKey: {},
                        actions: successObj,
                        pageName,
                      })
                      timer &&
                        (window as any).app.cache.timer.remove(callBackTimerName)
                      clearInterval(timer)
                    } else if (statueKey === false || statueKey === 'false') {
                      await this.emitCall({
                        dataKey: {},
                        actions: failObj,
                        pageName,
                      })
                      timer &&
                        (window as any).app.cache.timer.remove(callBackTimerName)
                      clearInterval(timer)
                    }
                    count++
                  } else {
                    await this.emitCall({
                      dataKey: {},
                      actions: failObj,
                      pageName,
                    })
                    timer &&
                      (window as any).app.cache.timer.remove(callBackTimerName)
                    clearInterval(timer)
                  }
                }, callBackTime)

                timer &&
                  (window as any).app.cache.timer.set(callBackTimerName, {
                    type: 'Interval',
                    timer: timer,
                  })
              }
            } else {
              result = await this.handleEvalArray({
                array: obj,
                pageName,
              })
            }
          } else if (u.isObj(obj)) {
            const payload = { updateObject: obj, pageName }
            result = await this.dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload,
            })
          }
        } else if (commands?.actionType.actionType === 'startProgressBarTask') {
          const startProgressBarTask = commands.actionType
          const actions = startProgressBarTask.actions
          result = await this.emitCall({
            dataKey: {},
            actions: actions,
            pageName,
          })
        } else if (
          commands.actionType?.actionType &&
          !['startProgressBarTask'].includes(commands.actionType?.actionType)
        ) {
          result = await this.handleActionCommand({
            action: commands.actionType,
            pageName,
          })
        } else {
          result = commands[key]
        }

        if (!u.isNil(result)) {
          if (u.isUnd(results)) results = result
          else if (u.isArr(results)) results.push(result)
          else results = [results, result]
        }
      } else if (!key.startsWith('=')) {
        const dataIn = commands[key]?.dataIn
        const shouldCopy =
          key.includes('builtIn') &&
          u.isObj(dataIn) &&
          !('object' in dataIn) &&
          !('array' in dataIn)

        const payload = {
          pageName,
          object: { [key]: commands[key] },
          copy: shouldCopy,
        }

        const populatedCommand = await this.dispatch({
          type: c.dispatchActionType.POPULATE_OBJECT,
          payload,
        })
        await this.handleEvalAssignmentExpressions({
          pageName,
          command: populatedCommand,
          key,
        })
      } else if (key.startsWith('=')) {
        /**
         * object is being populated before running every command. This is done to ensure that the new change from a previous command is made available to the subsequent commands
         */
        const dataIn = commands[key]?.dataIn
        const shouldCopy =
          key.includes('builtIn') &&
          (u.isObj(dataIn) || u.isArr(dataIn)) &&
          !('object' in dataIn) &&
          !('array' in dataIn)

        const payload = {
          pageName,
          object: { [key]: commands[key] },
          copy: shouldCopy,
        }

        const populatedCommand = await this.dispatch({
          type: c.dispatchActionType.POPULATE_OBJECT,
          payload,
        })

        const result = await this.handleEvalFunction({
          command: populatedCommand,
          pageName,
          key,
        })

        if (!u.isNil(result)) {
          if (u.isUnd(results)) results = result
          else if (u.isArr(results)) results.push(result)
          else results = [results, result]
        }
      }
    }catch(error){
      log.info(error)
    }

    return results
  }

  /**
   *
   * @param HandleEvalAssignmentExpressionsArgs.command Assigment command of shape {'.path@':4}
   * @param HandleEvalAssignmentExpressionsArgs.pageName
   *
   * Used as a helper function for emitCall --> evalObject -->  handleEvalCommands
   */
  async handleEvalAssignmentExpressions({ pageName, command, key }) {
    //handles assignment expressions
    let trimPath = ''
    let val: any
    if (u.isArr(command[key])) {
      val = cloneDeep(command[key])
    } else {
      val = command[key]
    }
    let valTemp = u.cloneDeep(val)

    if (key.startsWith('..')) {
      trimPath = key.substring(2, key.length - 1)
      let pathArr = trimPath.split('.')
      let currValue = get(this.root, [pageName, ...pathArr]) || ''
      if (u.isObj(currValue)) val = mergeDeep(currValue, val)
      if (
        (u.isArr(valTemp) && valTemp.length === 0) ||
        (u.isStr(valTemp) && valTemp === '') ||
        (u.isObj(valTemp) && Object.keys(valTemp).length === 0)
      )
        val = u.cloneDeep(valTemp)

      if (nt.Identify.reference(val)) val = null
      val = u.cloneDeep(val)
      if (isNoodlFunction(val)) {
        val = await this.handleEvalFunction({
          pageName,
          key: u.keys(val)[0],
          command: val,
        })
      }
      const payload = { pageName, dataKey: pathArr, value: val }

      this.emit({ type: c.emitType.SET_VALUE, payload })
    } else if (key.startsWith('.')) {
      trimPath = key.substring(1, key.length - 1)
      let pathArr = trimPath.split('.')
      let currValue = get(this.root, [...pathArr]) || ''
      if (u.isObj(currValue)) val = mergeDeep(currValue, val)
      if (
        (u.isArr(valTemp) && valTemp.length === 0) ||
        (u.isStr(valTemp) && valTemp === '') ||
        (u.isObj(valTemp) && Object.keys(valTemp).length === 0)
      )
        val = u.cloneDeep(valTemp)
      if (nt.Identify.reference(val)) val = null
      val = u.cloneDeep(val)
      if (isNoodlFunction(val)) {
        val = await this.handleEvalFunction({
          pageName,
          key: u.keys(val)[0],
          command: val,
        })
      }
      this.emit({
        type: c.emitType.SET_VALUE,
        payload: { dataKey: pathArr, value: val },
      })
    }
  }

  /**
   *
   * @param HandleEvalFunctionArgs.key
   * @param HandleEvalFunctionArgs.pageName
   * @param HandleEvalFunctionArgs.command
   * Used as a helper function for emitCall --> evalObject -->  handleEvalCommands
   */
  async handleEvalFunction({
    key = '',
    pageName = '',
    command,
  }: {
    command: Record<string, any>
    key: string
    pageName?: string
  }) {
    key = key || ''
    pageName = pageName || ''

    let results: any

    try {
      let trimPath = key.substring(key.startsWith('=..') ? 3 : 2, key.length)
      let pathArr = trimPath.split('.')
      let func = get(this.root, pathArr) || get(this.root[pageName], pathArr)
      if (u.isObj(func)) {
        if ('dataKey' in func) {
          func = { ...func, dataIn: func.dataKey, dataOut: func.dataKey }
          delete func?.dataKey
        }

        let obj = func

        for (const op of ['.', '..', '=', '~']) {
          obj = populateObject({
            // TODO - Find out if we can just do "obj" and not "op === '.' ? func : obj"
            source: u.isObj(obj) ? { ...obj } : obj,
            lookFor: op,
            locations: op == '~' ? [this] : [this.root, this.root[pageName]],
          })
        }
        //Using force for Global object that needs to
        //be processed since functions cannot be serialized
        //in localstorage and Global is retrieved from localstorage on page refresh
        func = createFuncAttacher({
          cadlObject: u.isObj(obj) ? { ...obj } : obj,
          dispatch: this.dispatch.bind(this),
          force:
            obj?.dataIn?.includes?.('Global') ||
            obj?.dataIn?.includes?.('Firebase')
              ? true
              : false,
        })
      }

      if (u.isFnc(func)) {
        if (u.isObj(command[key])) {
          // Value is set to the path in dataOut if dataOut is provided
          let { dataIn, dataOut } = command[key]
          //find reference value
          if (u.isObj(dataIn)) {
            dataIn = await this.dispatch({
              type: c.dispatchActionType.POPULATE_OBJECT,
              payload: {
                pageName,
                object: dataIn,
              },
            })
          }
          // Returned value from the app level
          const result = await func(dataIn)
          if (dataOut) {
            if (u.isStr(dataOut)) {
              this.emit({
                type: c.emitType.SET_VALUE,
                payload: { dataKey: dataOut.split?.('.'), value: result },
              })
            } else if (u.isObj(dataOut)) {
              //
            }
            result && (results = result)
          } else if (dataIn && u.isUnd(dataOut)) {
            results = result
          }
        } else {
          // NOTE: command[key] may be an empty string here (which is ok)
          results = await func()
        }
      } else if (u.isArr(func)) {
        // shape --> ["FirebaseToken.response.name", () => {...}]
        // TODO - This is awkward. Find a better way to write this
        await func?.[1]?.()
      }
      key.includes('goto') && (results = { abort: true })
    } catch (error) {
      throw error
    }

    return results
  }
  /**
   * Evaluates switch objects of shape
   */
  async handleSwitchCommand({ pageName, switchCommand }) {
    let condResult: any
    let switchs = switchCommand?.switch
    let condExpr = switchs[0]
    let judgeLens = switchs.length
    let judgeCases = switchs.slice(1, judgeLens)

    if (nt.Identify.isBoolean(condExpr)) {
      condResult = condExpr
    } else if (u.isFnc(condExpr)) {
      condResult = await condExpr()
    } else if (
      u.isStr(condExpr) &&
      ['.', '='].some((op) => condExpr.startsWith(op))
    ) {
      // condExpr is a reference
      let lookFor = ['..', '.', '='].find((op) => condExpr.startsWith(op))
      let res: any
      if (
        nt.Identify.localReference(condExpr) ||
        nt.Identify.evalLocalReference(condExpr)
      ) {
        res = populateString({
          source: condExpr,
          locations: [this.root[pageName]],
          lookFor: lookFor as string,
        })
      } else if (['.', '=.'].some((op) => condExpr.startsWith(op))) {
        res = populateString({
          source: condExpr,
          locations: [this.root],
          lookFor: lookFor as string,
        })
      }
      if (u.isFnc(res)) {
        condResult = await res()
      } else if (res && res !== condExpr) {
        condResult =
          condResult === nt.Identify.isBooleanFalse(condResult) ? false : true
        if (nt.Identify.isBoolean(res)) {
          condResult = nt.Identify.isBooleanFalse(res) ? false : true
        }
      } else {
        condResult = false
      }
    } else if (u.isObj(condExpr) && u.keys(condExpr)[0]?.startsWith?.('=')) {
      // evalObject function evaluation
      condResult = await this.dispatch({
        type: c.dispatchActionType.EVAL_OBJECT,
        payload: { pageName, updateObject: condExpr },
      })
    } else {
      condResult = condExpr
    }

    let value: any
    for (const judgeCase of judgeCases) {
      const isDefaut = !!judgeCase?.default
      const condCase = judgeCase?.case || judgeCase?.default
      if (isDefaut) {
        value = condCase[0]
      } else {
        const condition = condCase[0]
        if (condition === condResult) {
          value = condCase[1]
          break
        }
      }
    }
    let isObj = u.isObj(value)
    let firstKeyIfObj = (isObj && u.keys(value)[0]) || ''
    let lookFor = ''

    if (isObj && nt.Identify.folds.goto(value)) {
      if (u.isFnc(this.root.builtIn?.goto)) {
        const fn = this.root.builtIn.goto as t.BuiltInConsumerGotoFn
        value = populateVals({
          source: value,
          pageName,
          lookFor: ['..', '.', '='],
          locations: [this.root, this.root[pageName]],
        })
        let goto = value?.goto
        await fn?.({ pageName, goto: u.isObj(goto) ? goto.dataIn : goto })
        return { abort: 'true' }
      }
    } else if (u.isFnc(value)) {
      await value()
      return
    } else if (
      isObj &&
      (firstKeyIfObj.includes('@') || firstKeyIfObj.startsWith('='))
    ) {
      if (
        u.isStr(value[firstKeyIfObj]) &&
        nt.Identify.reference(value[firstKeyIfObj])
      ) {
        value = populateVals({
          source: value,
          pageName,
          lookFor: ['..', '.', '='],
          locations: [this.root, this.root[pageName]],
        })
      }
      // evalObject is an assignment expression
      await this.handleEvalObject({
        object: value,
        pageName,
      })
      return
      // return void (await this.dispatch({
      //   type: c.dispatchActionType.EVAL_OBJECT,
      //   payload: { pageName, updateObject: value },
      // }))
    } else if (nt.Identify.action.evalObject(value)) {
      const res = await this.dispatch({
        type: c.dispatchActionType.EVAL_OBJECT,
        payload: { pageName, updateObject: value?.object },
      })
      return res
    } else if (nt.Identify.action.any(value) || u.isArr(value)) {
      // Unhandled object expressions handled by the client/UI
      if (value?.['actionType'] === 'builtIn') {
        const options = this.root.getConsumerOptions({
          page: pageName,
        })

        const funcName = value?.['funcName']
        funcName === 'redraw' && (options['viewTag'] = value?.['viewTag'])
        const builtInFn =
          this.root.extendedBuiltIn?.[funcName] ||
          this.root.extendedBuiltIn?.[funcName]
        u.isFnc(builtInFn) && (await builtInFn?.(value, options))
      } else if (
        value?.['actionType'] === 'popUp' ||
        value?.['actionType'] === 'popUpDismiss'
      ) {
        const res = await this.handleActionCommand({
          pageName,
          action: value as nt.ActionObject,
        })
        return res
      }
      return value
    } else if (u.isStr(value)) {
      lookFor = ['..', '.', '='].find((op) => value.startsWith(op)) || ''
    } else if (isObj && value?.if) {
      const res = await this.handleIfCommand({
        pageName,
        ifCommand: value as nt.IfObject,
      })
      return res
    }

    if (lookFor) {
      // References
      let res = populateString({
        source: value,
        locations: [this.root, this.root[pageName]],
        lookFor,
      })

      if (u.isFnc(res)) {
        // Function reference
        await res()
      } else if (u.isObj(res)) {
        // Object reference
        // Assuming it is an evalObject object function evaluation type
        const withFns = createFuncAttacher({
          cadlObject: res,
          dispatch: this.dispatch.bind(this),
        })
        const { dataIn, dataOut } = u.values(value)[0]
        if (u.isFnc(withFns)) {
          const result = dataIn ? await withFns(dataIn) : await withFns()

          if (dataOut) {
            this.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey: dataOut.split('.'), value: result },
            })
          }
          return result
        } else if (u.isArr(withFns) && u.isFnc(withFns[1])) {
          const result = dataIn ? await withFns[1](dataIn) : await withFns[1]()
          if (dataOut) {
            this.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey: dataOut.split('.'), value: result },
            })
          }
          return result
        } else {
          return res
        }
      } else if (u.isArr(res) && u.isFnc(res?.[1])) {
        const result = await res[1]()
        return result
      } else {
        return res
      }
    } else {
      return value
    }
  }
  /**
   * Evaluates if objects of shape
   */
  async handleIfCommand({
    pageName,
    ifCommand,
  }: {
    pageName: string
    ifCommand: nt.IfObject
  }) {
    let condResult: any
    let [condExpr, valIfTruthy, valIfFalsy] = ifCommand?.if || []
    if (nt.Identify.isBoolean(condExpr)) {
      condResult = condExpr
    } else if (u.isFnc(condExpr)) {
      condResult = await condExpr()
    } else if (
      u.isStr(condExpr) &&
      ['.', '='].some((op) => condExpr.startsWith(op))
    ) {
      // condExpr is a reference
      let lookFor = ['..', '.', '='].find((op) => condExpr.startsWith(op))
      let res: any
      if (
        nt.Identify.localReference(condExpr) ||
        nt.Identify.evalLocalReference(condExpr)
      ) {
        res = populateString({
          source: condExpr,
          locations: [this.root[pageName]],
          lookFor: lookFor as string,
        })
      } else if (['.', '=.'].some((op) => condExpr.startsWith(op))) {
        res = populateString({
          source: condExpr,
          locations: [this.root],
          lookFor: lookFor as string,
        })
      }
      if (u.isFnc(res)) {
        condResult = await res()
      } else if (u.isArr(res)) {
        condResult = !(res.length == 0)
      } else if (u.isObj(res)) {
        const arr = Object.keys(res)
        condResult = !(arr.length == 0) //true 为空， false 不为空
      } else if (res && res !== condExpr) {
        condResult =
          condResult === nt.Identify.isBooleanFalse(condResult) ? false : true
        if (nt.Identify.isBoolean(res)) {
          condResult = nt.Identify.isBooleanFalse(res) ? false : true
        }
      } else {
        condResult = false
      }
    } else if (u.isObj(condExpr) && u.keys(condExpr)[0]?.startsWith?.('=')) {
      // evalObject function evaluation
      condResult = await this.dispatch({
        type: c.dispatchActionType.EVAL_OBJECT,
        payload: { pageName, updateObject: condExpr },
      })
    } else {
      if (u.isStr(condExpr) && condExpr) {
        condResult = true
      }
    }

    let isTruthy = !nt.Identify.isBooleanFalse(condResult) && !!condResult
    let value = isTruthy ? valIfTruthy : valIfFalsy
    let isObj = u.isObj(value)
    let firstKeyIfObj = (isObj && u.keys(value)[0]) || ''
    let lookFor = ''

    if (isObj && nt.Identify.folds.goto(value)) {
      if (u.isFnc(this.root.builtIn?.goto)) {
        const fn = this.root.builtIn.goto as t.BuiltInConsumerGotoFn
        value = populateVals({
          source: value,
          pageName,
          lookFor: ['..', '.', '='],
          locations: [this.root, this.root[pageName]],
        })
        let goto = value?.goto

        await fn?.({
          pageName,
          goto: u.isObj(goto) ? goto.dataIn : goto,
          blank: value?.blank,
        })

        return { abort: 'true' }
      }
    } else if (u.isFnc(value)) {
      await value()
      return
    } else if (
      isObj &&
      (firstKeyIfObj.includes('@') || firstKeyIfObj.startsWith('='))
    ) {
      if (
        u.isStr(value[firstKeyIfObj]) &&
        nt.Identify.reference(value[firstKeyIfObj])
      ) {
        value = populateVals({
          source: value,
          pageName,
          lookFor: ['..', '.', '='],
          locations: [this.root, this.root[pageName]],
        })
      }
      // evalObject is an assignment expression
      return void (await this.dispatch({
        type: c.dispatchActionType.EVAL_OBJECT,
        payload: { pageName, updateObject: value },
      }))
    } else if (nt.Identify.action.evalObject(value)) {
      const res = await this.dispatch({
        type: c.dispatchActionType.EVAL_OBJECT,
        payload: { pageName, updateObject: value?.object },
      })
      return res
    } else if (nt.Identify.action.any(value) || u.isArr(value)) {
      // Unhandled object expressions handled by the client/UI
      if (value?.['actionType'] === 'builtIn') {
        const options = this.root.getConsumerOptions({
          page: pageName,
        })

        const funcName = value?.['funcName']
        funcName === 'redraw' && (options['viewTag'] = value?.['viewTag'])
        const builtInFn =
          this.root.extendedBuiltIn?.[funcName] ||
          this.root.extendedBuiltIn?.[funcName]
        u.isFnc(builtInFn) && (await builtInFn?.(value, options))
      } else if (
        value?.['actionType'] === 'popUp' ||
        value?.['actionType'] === 'popUpDismiss'
      ) {
        const res = await this.handleActionCommand({
          pageName,
          action: value as nt.ActionObject,
        })
        return res
      }
      return value
    } else if (u.isStr(value)) {
      lookFor = ['..', '.', '='].find((op) => value.startsWith(op)) || ''
    } else if (isObj && value?.if) {
      const res = await this.handleIfCommand({
        pageName,
        ifCommand: value as nt.IfObject,
      })
      return res
    }

    if (lookFor) {
      // References
      let res = populateString({
        source: value,
        locations: [this.root, this.root[pageName]],
        lookFor,
      })

      if (u.isFnc(res)) {
        // Function reference
        await res()
      } else if (u.isObj(res)) {
        // Object reference
        // Assuming it is an evalObject object function evaluation type
        const withFns = createFuncAttacher({
          cadlObject: res,
          dispatch: this.dispatch.bind(this),
        })
        const { dataIn, dataOut } = u.values(value)[0]
        if (u.isFnc(withFns)) {
          const result = dataIn ? await withFns(dataIn) : await withFns()

          if (dataOut) {
            this.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey: dataOut.split('.'), value: result },
            })
          }
          return result
        } else if (u.isArr(withFns) && u.isFnc(withFns[1])) {
          const result = dataIn ? await withFns[1](dataIn) : await withFns[1]()
          if (dataOut) {
            this.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey: dataOut.split('.'), value: result },
            })
          }
          return result
        } else {
          return res
        }
      } else if (u.isArr(res) && u.isFnc(res?.[1])) {
        const result = await res[1]()
        return result
      } else {
        return res
      }
    } else {
      return value
    }
  }
  /**
   * Used for the actionType 'updateObject'. It updates the value of an object at the given path.
   *
   * @param UpdateObjectArgs
   * @param UpdateObjectArgs.dataKey The path to the property being changed.
   * @param UpdateObjectArgs.dataObject The object that will be updated.
   * @param UpdateObjectArgs.dataObjectKey The specific key of the dataObject to be used as the new value.
   * @emits CADL#stateChanged
   *
   */
  async updateObject({
    dataKey,
    dataObject,
    dataObjectKey,
  }: t.UpdateObjectArgs) {
    if (dataKey instanceof Array) {
      for (let item = 0; item < dataKey.length; item++) {
        const element = dataKey[item]
        this.emit({
          type: c.emitType.SET_VALUE,
          payload: {
            dataKey: (element.startsWith('.')
              ? element.substring(1, element.length)
              : element
            ).split('.'),
            value: dataObjectKey ? dataObject[dataObjectKey] : dataObject,
            replace: true,
          },
        })
      }
    } else {
      this.emit({
        type: c.emitType.SET_VALUE,
        payload: {
          dataKey: (dataKey.startsWith('.')
            ? dataKey.substring(1, dataKey.length)
            : dataKey
          ).split('.'),
          value: dataObjectKey ? dataObject[dataObjectKey] : dataObject,
          replace: true,
        },
      })
    }
    await this.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
  }

  /**
   * Runs the init functions of the page matching the pageName.
   *
   * @param pageObject
   * @param onBeforeInit
   * @param onInit
   * @param onAfterInit
   */
  async runInit<Init extends any[]>({
    pageObject = {},
    onBeforeInit,
    onInit,
    onAfterInit,
  }: {
    pageObject: Record<string, any>
    onBeforeInit?(init: Init): Promise<void> | void
    onInit?(current: any, index: number, init: Init): Promise<void> | void
    onAfterInit?(error: null | Error, init: Init): Promise<void> | void
  }): Promise<Record<string, any>> {
    return new Promise(async (resolve) => {
      let page = pageObject
      let pageName = u.keys(page)[0]
      let init = u.values(page)[0].init as Init
      if (pageName === 'ChatMessage') {
        store.globalListChat = null
      }
      if (init) {
        onBeforeInit && (await onBeforeInit?.(init))
        this.initCallQueue = init.map((_command, index) => index)
        while (this.initCallQueue.length > 0) {
          try {
            const currIndex = this.initCallQueue.shift()
            const command: any = init[currIndex]

            onInit && (await onInit?.(command, currIndex, init))

            let populatedCommand: any
            let firstCmdKey = (u.isObj(command) && u.keys(command)[0]) || ''
            if (
              u.isObj(command) &&
              ['=', '@'].some((op) => firstCmdKey.includes(op))
            ) {
              await this.dispatch({
                type: c.dispatchActionType.EVAL_OBJECT,
                payload: { updateObject: command, pageName },
              })
            } else if (
              isPopulated(command) ||
              (command.actionType && command.actionType === 'evalObject')
            ) {
              populatedCommand = command
            } else {
              populatedCommand = populateVals({
                source: command,
                locations: [this.root, this.root[pageName]],
                lookFor: ['.', '..', '=', '~'],
              })
            }

            if (u.isFnc(populatedCommand)) {
              try {
                await populatedCommand()
              } catch (error) {
                const err =
                  error instanceof Error ? error : new Error(String(error))
                onAfterInit?.(err, init)
                throw new UnableToExecuteFn(
                  `An error occured while executing ${pageName}.init. Check command at index ${currIndex} under init`,
                  err,
                )
              }
            } else if (nt.Identify.action.any(populatedCommand)) {
              const { actionType, dataKey, dataObject, object, funcName } =
                populatedCommand

              switch (actionType) {
                case 'updateObject': {
                  await this.updateObject({ dataKey, dataObject })
                  break
                }
                case 'builtIn': {
                  if (funcName === 'videoChat') {
                    const videoChatFn = this.root.builtIn[funcName]
                    u.isFnc(videoChatFn) &&
                      (await videoChatFn?.(populatedCommand))
                  } else if (funcName === 'initExtend') {
                    const initExtendFn = this.root.builtIn[funcName]
                    u.isFnc(initExtendFn) &&
                      (await initExtendFn?.(populatedCommand))
                  } else if (funcName === 'initAutoDC') {
                    const initExtendFn = this.root.builtIn[funcName]
                    u.isFnc(initExtendFn) &&
                      (await initExtendFn?.(populatedCommand))
                  }
                  break
                }
                case 'evalObject': {
                  const payload = { pageName, updateObject: object }
                  await this.dispatch({
                    type: c.dispatchActionType.EVAL_OBJECT,
                    payload,
                  })

                  break
                }
                default: {
                  return
                }
              }
            } else if (nt.Identify.if(populatedCommand)) {
              //TODO: add the then condition
              const ifResult = await this.handleIfCommand({
                pageName,
                ifCommand: populatedCommand,
              })
              if (ifResult?.abort) resolve({ abort: true })
            } else if (u.isArr(populatedCommand)) {
              if (u.isFnc(populatedCommand[0][1])) {
                try {
                  await populatedCommand[0][1]()
                } catch (error) {
                  throw new UnableToExecuteFn(
                    `An error occured while executing ${pageName}.init`,
                    error instanceof Error ? error : new Error(String(error)),
                  )
                }
              }
            }

            let updatedPage = this.root[pageName]

            for (const op of ['..', '.']) {
              updatedPage = populateObject({
                source: updatedPage,
                lookFor: op,
                skip: ['update', 'check', 'components'],
                locations: [op == '..' ? this.root[pageName] : this.root],
              })
            }

            updatedPage = createFuncAttacher({
              cadlObject: { [pageName]: updatedPage },
              dispatch: this.dispatch.bind(this),
            })

            page = updatedPage
            init = u.values(updatedPage)[0].init

            const payload = { pageName, properties: u.values(updatedPage)[0] }
            this.emit({ type: c.emitType.SET_LOCAL_PROPERTIES, payload })
          } catch (error) {
            log.error(error)
          }
        }    
        await onAfterInit?.(null, init)
        await this.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
        resolve(page)
      }
    })
  }

  /**
   * Runs the mounted functions of the page matching the pageName.
   *
   * @param pageObject
   * @param onMounted
   * @param pageName
   */
  async runMounted<Init extends any[]>({
    pageObject = {},
    onMounted,
    pageName,
  }: {
    pageObject: Record<string, any>
    onMounted?(current: any, index: number, mounted: Init): Promise<void> | void
    pageName: string
  }): Promise<Record<string, any>> {
    return new Promise(async (resolve) => {
      let page = pageObject
      let mounted = pageObject.onMounted as Init
      if (mounted) {
        this.mountedCallQueue = mounted.map((_command, index) => index)
        while (this.mountedCallQueue.length > 0) {
          try {
            const currIndex = this.mountedCallQueue.shift()
            const command: any = mounted[currIndex]
            onMounted && (await onMounted?.(command, currIndex, mounted))
            let populatedCommand: any
            let firstCmdKey = (u.isObj(command) && u.keys(command)[0]) || ''
            if (
              u.isObj(command) &&
              ['=', '@'].some((op) => firstCmdKey.includes(op))
            ) {
              const response = await this.dispatch({
                type: c.dispatchActionType.EVAL_OBJECT,
                payload: { updateObject: command, pageName },
              })
              if (hasAbortPopup(response)) break
            } else if (
              isPopulated(command) ||
              (command.actionType && command.actionType === 'evalObject')
            ) {
              populatedCommand = command
            } else {
              populatedCommand = populateVals({
                source: command,
                locations: [this.root, this.root[pageName]],
                lookFor: ['.', '..', '=', '~'],
              })
            }

            if (u.isFnc(populatedCommand)) {
              try {
                const response = await populatedCommand()
                if (hasAbortPopup(response)) resolve({ abort: true })
              } catch (error) {
                const err =
                  error instanceof Error ? error : new Error(String(error))
                throw new UnableToExecuteFn(
                  `An error occured while executing ${pageName}.init. Check command at index ${currIndex} under init`,
                  err,
                )
              }
            } else if (nt.Identify.action.any(populatedCommand)) {
              const { actionType, dataKey, dataObject, object, funcName } =
                populatedCommand
              let response
              switch (actionType) {
                case 'updateObject': {
                  response = await this.updateObject({ dataKey, dataObject })
                  break
                }
                case 'popUp': {
                  response = await this.handleActionCommand({
                    pageName,
                    action: populatedCommand,
                  })
                }
                case 'popUpDismiss': {
                  response = await this.handleActionCommand({
                    pageName,
                    action: populatedCommand,
                  })
                }
                case 'builtIn': {
                  if (funcName === 'videoChat') {
                    const videoChatFn = this.root.builtIn[funcName]
                    u.isFnc(videoChatFn) &&
                      (await videoChatFn?.(populatedCommand))
                  } else if (funcName === 'initExtend') {
                    const initExtendFn = this.root.builtIn[funcName]
                    u.isFnc(initExtendFn) &&
                      (await initExtendFn?.(populatedCommand))
                  } else if (funcName === 'initAutoDC') {
                    const initExtendFn = this.root.builtIn[funcName]
                    u.isFnc(initExtendFn) &&
                      (await initExtendFn?.(populatedCommand))
                  } else if (populatedCommand?.funcName === 'redraw') {
                    const options = this.root.getConsumerOptions({
                      page: pageName,
                    })
                    options['viewTag'] = populatedCommand?.['viewTag']
                    const funcName = populatedCommand?.funcName
                    const builtInFn =
                      this.root.extendedBuiltIn?.[funcName] ||
                      this.root.extendedBuiltIn?.[funcName]
                    u.isFnc(builtInFn) &&
                      (await builtInFn?.(populatedCommand, options))
                  }
                  break
                }
                case 'evalObject': {
                  const payload = { pageName, updateObject: object }
                  response = await this.dispatch({
                    type: c.dispatchActionType.EVAL_OBJECT,
                    payload,
                  })

                  break
                }
                default: {
                  return
                }
              }
              if (hasAbortPopup(response)) resolve({ abort: true })
            } else if (nt.Identify.if(populatedCommand)) {
              //TODO: add the then condition
              const ifResult = await this.handleIfCommand({
                pageName,
                ifCommand: populatedCommand,
              })
              if (ifResult?.abort) resolve({ abort: true })
            } else if (u.isArr(populatedCommand)) {
              if (u.isFnc(populatedCommand[0][1])) {
                try {
                  await populatedCommand[0][1]()
                } catch (error) {
                  throw new UnableToExecuteFn(
                    `An error occured while executing ${pageName}.init`,
                    error instanceof Error ? error : new Error(String(error)),
                  )
                }
              }
            }
          } catch (error) {
            log.error(error)
          }
        }

        await this.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
        resolve(page)
      }
    })
  }

  //Running Life Cycle Functions
  async runLifeCycle<Init extends any[]>({
    pageObject = {},
    lifeCycle,
    pageName,
  }: {
    pageObject: Record<string, any>
    lifeCycle: string
    pageName: string
  }): Promise<Record<string, any>> {
    return new Promise(async (resolve) => {
      let lifeCycleFunc = pageObject?.[lifeCycle] as Init
      if (lifeCycleFunc) {
        let results: any[]
        try {
          results = await this.emitCall({
            dataKey: {},
            actions: lifeCycleFunc,
            pageName,
          })
          resolve(results)
        } catch (error) {
          log.error(error)
        }
        // await this.dispatch({ type: c.dispatchActionType.UPDATE_LOCAL_STORAGE })
      }
      resolve([])
    })
  }

  /**
   * Sets either the user or meetroom value from localStorage to the corresponding root value in memory
   *
   * @param key "user" | "meetroom"
   *
   */
  //TODO: ask Chris if he uses this
  async setFromLocalStorage(key: 'user' | 'meetroom') {
    let localStorageGlobal: any
    try {
      const Global = window.localStorage?.getItem?.('Global')
      if (Global) localStorageGlobal = JSON.parse(Global)
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error(String(error))
    }
    if (localStorageGlobal) {
      switch (key) {
        case 'user': {
          let user = localStorageGlobal.currentUser.vertex
          // this.emit({
          //   type: c.emitType.SET_VALUE,
          //   payload: { dataKey: 'Global.currentUser.vertex', value: user },
          // })
          break
        }
        case 'meetroom': {
          let currMeetroom = localStorageGlobal.meetroom.edge
          this.emit({
            type: c.emitType.SET_VALUE,
            payload: { dataKey: 'Global.meetroom.edge', value: currMeetroom },
          })
          break
        }
      }
    }
  }

  /**
   * Used to mutate the draft state.
   *
   * @param callback Function used to update the state
   */
  editDraft(callback: (draft: Draft<t.Root>) => void) {
    this.emit({ type: 'EDIT_DRAFT', payload: { callback } })
  }

  /**
   * Used to handle the emit syntax, where a series
   * of actions can be called given a common variable(s)
   * @param dataKey -object with variables e.g {var1:{name:'tom'}}
   * @param actions -an array of commands/actions to be performed
   * @param pageName
   * @returns { any[] }
   */
  async emitCall({
    dataKey,
    actions,
    pageName,
  }: t.EmitCallArgs): Promise<any[]> {
    const returnValues = {}
    const numActions = actions.length
    const queueObject = this.#queue.create({
      type: 'emit',
      kind: 'emit',
      pageName,
      numActions: actions?.length || 0,
    })

    try {
      for (let index = 0; index < numActions; index++) {
        let action = actions[index]
        // Handles explicit evalObject call
        if (u.isStr(action) && action.includes('=')) {
          action = { [action]: '' }
        }
        const clone = cloneDeep(action)
        const actionWithVals: Record<string, any> = replaceVars({
          vars: dataKey,
          source: clone,
        })
        if (nt.Identify.action.evalObject(action)) {
          let response
          if (u.isFnc(action?.object)) {
            try {
              response = await (action?.object as (...args: any[]) => any)?.()
            } catch (error) {
              log.error(error)
            }
          } else {
            response = await this.dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { pageName, updateObject: action?.object },
            })
          }

          returnValues[index] = response || ''
          if (hasAbortPopup(response)) break
        } else if (
          // Handles eval expressions associated to evalObject
          u.keys(action)[0].includes('@') ||
          u.keys(action)[0].startsWith('=')
        ) {
          const response = await this.dispatch({
            type: c.dispatchActionType.EVAL_OBJECT,
            payload: { pageName, updateObject: actionWithVals },
          })
          returnValues[index] = response || ''
          if (hasAbortPopup(response)) break
        } else if ('if' in action) {
          const populatedCommand = await this.dispatch({
            type: c.dispatchActionType.POPULATE_OBJECT,
            payload: {
              pageName,
              object: actionWithVals,
              copy: false,
            },
          })
          const response = await this.handleIfCommand({
            pageName,
            ifCommand: populatedCommand as nt.IfObject,
          })
          returnValues[index] = response || ''
          if (hasAbortPopup(response)) break
        } else if ('switch' in action) {
          const populatedCommand = await this.dispatch({
            type: c.dispatchActionType.POPULATE_OBJECT,
            payload: {
              pageName,
              object: actionWithVals,
              copy: false,
            },
          })
          const response = await this.handleSwitchCommand({
            pageName,
            switchCommand: populatedCommand,
          })
          returnValues[index] = response || ''
          if (hasAbortPopup(response)) break
        } else if (nt.Identify.folds.goto(action)) {
          const commands = actionWithVals
          const key = 'goto'
          const dataIn = commands[key]?.dataIn
          const shouldCopy =
            key.includes('builtIn') &&
            u.isObj(dataIn) &&
            !('object' in dataIn) &&
            !('array' in dataIn)

          const populatedCommand = await this.dispatch({
            type: c.dispatchActionType.POPULATE_OBJECT,
            payload: {
              pageName,
              object: { [key]: commands[key] },
              copy: shouldCopy,
            },
          })

          let gotoCommand: any

          if (u.isStr(populatedCommand[key])) {
            gotoCommand = {
              '=.builtIn.goto': {
                dataIn: { destination: populatedCommand[key] },
              },
            }
          } else if (u.isObj(populatedCommand[key])) {
            gotoCommand = {
              '=.builtIn.goto': populatedCommand[key],
            }
          }

          const result = await this.handleEvalFunction({
            command: gotoCommand,
            pageName,
            key: '=.builtIn.goto',
          })
          returnValues[index] = result || ''
          if (hasAbortPopup(result)) break
        } else if (action.actionType && action.actionType === 'builtIn') {
          const funcName = action.funcName
          const builtInFn = this.root.extendedBuiltIn?.[funcName]
          let options = this.root.getConsumerOptions({
            page: pageName,
          })
          funcName === 'redraw' && (options['viewTag'] = action?.['viewTag'])
          u.isFnc(builtInFn) && (await builtInFn?.(action, options))
        } else if (action.actionType && action.actionType === 'setProgress') {
          const funcName = action.actionType
          const builtInFn = this.root.actions?.[funcName]
          let options = this.root.getConsumerOptions({
            page: pageName,
          })
          u.isFnc(builtInFn) && (await builtInFn?.(action, options))
        } else if (
          action.actionType &&
          (action.actionType === 'popUp' || action.actionType === 'popUpDimiss')
        ) {
          const response = await this.handleActionCommand({
            pageName,
            action,
          })
          returnValues[index] = response || ''
          if (hasAbortPopup(response)) break
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(
        `Error occurred running emitCall in "${pageName}": [${err.name}] ${
          err.message
        }. (Datakey: ${JSON.stringify(dataKey)}, Actions: ${JSON.stringify(
          actions,
        )})`,
      )
      throw err
    } finally {
      this.#queue.remove(queueObject)
    }

    return u.values(returnValues)
  }

  getApiCache(): t.Root['apiCache']
  getApiCache(cacheIndex?: string | number): any
  getApiCache(cacheIndex?: unknown) {
    if (cacheIndex) return this.root.apiCache[String(cacheIndex)].data
    return this.root.apiCache
  }

  getState() {
    return {
      ...this.#state,
      ...this.#queue.getState(),
    }
  }

  getSubscribers() {
    return this.#subscribers
  }

  on(evt: t.ActiveQueueSubscribeEvent, callback: t.ActiveQueueSubscriber) {
    switch (evt) {
      case c.subscribe.QUEUE_START:
      case c.subscribe.QUEUE_END:
        return void this.#queue.on(evt, callback)
    }
  }

  get baseUrl() {
    return this.#baseUrl
  }

  set baseUrl(baseUrl) {
    if (this.cadlBaseUrl) {
      this.#baseUrl = baseUrl.replace('${cadlBaseUrl}', this.cadlBaseUrl)
    }
  }

  get cadlBaseUrl() {
    if (!this.#cadlBaseUrl) return undefined
    let withVersion = this.#cadlBaseUrl
    if (withVersion.includes('cadlVersion')) {
      withVersion = withVersion.replace('${cadlVersion}', this.cadlVersion)
    }
    if (withVersion.includes('designSuffix')) {
      withVersion = withVersion.replace('${designSuffix}', this.designSuffix)
    }
    return withVersion
  }

  set cadlBaseUrl(cadlBaseUrl) {
    this.#cadlBaseUrl = cadlBaseUrl
  }

  get assetsUrl() {
    return this.#assetsUrl
  }

  set assetsUrl(assetsUrl) {
    if (this.cadlBaseUrl) {
      this.#assetsUrl = assetsUrl.replace('${cadlBaseUrl}', this.cadlBaseUrl)
    }
  }

  get designSuffix() {
    const { greaterEqual, less, widthHeightRatioThreshold } = this.#designSuffix
    return this.aspectRatio >= widthHeightRatioThreshold ? greaterEqual : less
  }
  set designSuffix(designSuffix) {
    this.#designSuffix = designSuffix
  }

  get aspectRatio() {
    return this.#aspectRatio
  }

  set aspectRatio(aspectRatio) {
    this.#aspectRatio = aspectRatio
    if (this.cadlBaseUrl) this.#baseUrl = this.cadlBaseUrl
  }

  get root() {
    return this.#root
  }

  set root(root) {
    this.#root = root || {}
  }

  set apiVersion(apiVersion) {
    store.apiVersion = apiVersion
  }

  get apiVersion() {
    return store.apiVersion
  }

  get config() {
    return this.#config
  }
}
