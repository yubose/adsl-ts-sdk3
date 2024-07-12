import { expect } from 'chai'
import partial from 'lodash/partial'
import nock from 'nock'
import store from '../common/store'
import * as h from './helpers'

const interceptGET = partial(h.intercept, 'get')

describe(`helpers`, () => {
  it(`[getCADL] should apply the config key`, () => {
    let cadl = h.getCADL('www')
    expect(store.configUrl).to.eq(`${h.baseUrl}www.yml`)
    cadl = h.getCADL('abc')
    expect(store.configUrl).to.eq(`${h.baseUrl}abc.yml`)
  })

  it(`[createRootConfig] should set the minimal required defaults without args`, () => {
    const rootConfig = h.createRootConfig()
    expect(rootConfig.apiHost).not.to.be.empty
    expect(rootConfig.apiPort).not.to.be.empty
    expect(rootConfig.webApiHost).not.to.be.empty
    expect(rootConfig.appApiHost).not.to.be.empty
    expect(rootConfig.web).not.to.be.empty
    expect(rootConfig.cadlBaseUrl).not.to.be.empty
    expect(rootConfig.cadlMain).not.to.be.empty
  })

  it(`[createCadlEndpoint] should set the minimal required defaults without args`, () => {
    const cadlEndpoint = h.createCadlEndpoint()
    expect(cadlEndpoint.assetsUrl).not.to.be.empty
    expect(cadlEndpoint.baseUrl).not.to.be.empty
    expect(cadlEndpoint.preload).to.be.an('array')
    expect(cadlEndpoint.page).to.be.an('array')
    expect(cadlEndpoint.languageSuffix).to.be.an('object')
    expect(cadlEndpoint.fileSuffix).not.to.be.empty
    expect(cadlEndpoint).to.have.property('startPage')
  })

  describe(`[intercept]`, () => {
    it(`should intercept all of cadl.init()`, async () => {
      nock.disableNetConnect()

      const cadl = h.getCADL('www')
      const scope = nock(h.baseUrl)

      const rootConfig = h.createRootConfig()
      const appConfig = h.createCadlEndpoint({
        preload: ['BaseCSS', 'BaseDataModel'],
        pages: ['SignIn'],
      })
      const baseCss = { Style: '' }
      const baseDataModel = { Global: { currentUser: { vertex: null } } }

      interceptGET('/www.yml', scope, rootConfig)
      interceptGET('/cadlEndpoint.yml', scope, appConfig)
      interceptGET('/BaseCSS_en.yml', scope, baseCss)
      interceptGET('/BaseDataModel_en.yml', scope, baseDataModel)

      await cadl.init()
    })

    it(`should intercept cadl.initPage()`, async () => {
      nock.disableNetConnect()

      const cadl = h.getCADL('www')
      const scope = nock(h.baseUrl)
      const rootConfig = h.createRootConfig()
      const appConfig = h.createCadlEndpoint({ pages: ['SignIn'] })
      const signInPage = { SignIn: {} }

      interceptGET('/www.yml', scope, rootConfig)
      interceptGET('/cadlEndpoint.yml', scope, appConfig)
      interceptGET('/SignIn_en.yml', scope, signInPage)

      await cadl.initPage('SignIn')
    })
  })
})
