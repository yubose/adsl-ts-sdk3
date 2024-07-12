import { expect } from 'chai'
import partial from 'lodash/partial'
import nock from 'nock'
import fs from 'fs-extra'
import m from 'noodl-test-utils'
import path from 'path'
import sinon from 'sinon'
import type CADL from '../CADL'
import * as f from './factory'
import * as h from './helpers'

const interceptGET = partial(h.intercept, 'get')

const readFromFixture = (fileName: string) =>
  fs.readFile(h.getPathFromTestDir(`fixtures/${fileName}`), 'utf8')

const readAbcPage = () => readFromFixture('Abc_en.yml')

xdescribe(`main tests`, () => {
  describe(`init`, () => {
    let cadl: CADL
    let scope: nock.Scope

    beforeEach(async () => {
      nock.disableNetConnect()
      cadl = h.getCADL('patient')
      scope = nock(h.baseUrl)
      const rootConfig = h.createRootConfig()
      const appConfig = h.createCadlEndpoint({
        preload: ['BasePage'],
        pages: ['Abc'],
      })

      interceptGET('/patient.yml', scope, rootConfig)
      interceptGET('/cadlEndpoint.yml', scope, appConfig)
      // interceptGET('/BaseCSS_en.yml', scope, await readFromFixture('BaseCSS.yml'))
      interceptGET(
        '/BasePage_en.yml',
        scope,
        await readFromFixture('BasePage_en.yml'),
      )
      interceptGET('/Abc_en.yml', scope, await readAbcPage())
    })

    it(`should set the cadlVersion`, () => {
      expect(cadl.cadlVersion).to.eq('test')
    })

    it(`should set the cadlEndpoint object`, async () => {
      await cadl.init()
      expect(cadl)
        .to.have.property('cadlEndpoint')
        .to.be.an('object')
        .to.have.property('assetsUrl', h.assetsUrl)
      expect(cadl.cadlEndpoint).to.have.property('baseUrl', h.baseUrl)
      expect(cadl.cadlEndpoint).to.have.property('page')
      expect(cadl.cadlEndpoint).to.have.property('preload')
    })

    it(`should set the Config root object`, async () => {
      await cadl.init()
      expect(cadl.root).to.have.property('Config').to.be.an('object')
    })

    it(`should populate \$\{cadlBaseUrl\} on assetsUrl`, async () => {
      await cadl.init()
      expect(cadl.assetsUrl).to.eq(`${cadl.cadlBaseUrl}assets/`)
    })

    it(`should retrieve + merge object keys that are references`, async () => {
      await cadl.initPage('Abc')
      const { items } = cadl.root.Abc
      expect(items[0]).to.have.property('tag', 'goBack')
      expect(items[0]).to.have.property('type', 'shirt')
      expect(items[0]).to.have.property('actionType', 'builtIn')
      expect(items[0]).to.have.property('funcName', 'goBack')
      expect(items[0]).to.have.property('wait', true)
    })

    it(`should populate object values that are references`, async () => {
      await cadl.initPage('Abc')
      const { components, items, shop } = cadl.root.Abc
      expect(components[0])
        .to.be.an('object')
        .to.have.property('type', 'header')
      expect(components[1])
        .to.be.an('object')
        .to.have.property('type', 'button')
      expect(shop).to.be.an('object')
      expect(shop).to.have.property('location', 'goBack')
      expect(shop).to.have.property('tempLocation', 'goBack')
      expect(
        shop.traverseMe.children[0].children[0].children[0],
      ).to.have.property('text', 'good morning!')
      expect(items[0].tag).to.not.eq('.Abc.shop.location')
      expect(items[0].tag).to.eq('goBack')
    })

    it(`should be able to populate initial properties by looking into the root`, async () => {
      await cadl.initPage('Abc')
      const baseHeaderComponent = cadl.root.Abc.components[0]
      const headerLeftButtonComponent = cadl.root.Abc.components[0].children[0]
      expect(baseHeaderComponent).not.to.eq('.BaseHeader3')
      expect(baseHeaderComponent).to.have.property('type', 'header')
      expect(headerLeftButtonComponent).to.have.property('type', 'button')
    })

    for (const label of ['reference', 'non-reference']) {
      it(`should set the ${label} value on the path referenced by "@"`, async () => {
        await cadl.initPage('Abc')
        const lastKey = label == 'reference' ? 'id' : 'id2'
        expect(cadl.root.Abc.retrieveVertex[lastKey]).to.eq(
          'TzAgiLambwoa3nmzImwmmyy==',
        )
      })
    }

    it(`should parse the eval referenced listObject in components`, async () => {
      h.intercept('get', `/Topo_en.yml`, scope, {
        Topo: {
          data: [1],
          components: [
            m.view({
              children: [
                m.list({
                  iteratorVar: 'itemObject',
                  listObject: '=..data' as any,
                  children: [m.listItem('itemObject')],
                }),
              ],
            }),
          ],
        },
      })
      await cadl.initPage('Topo')
      expect(cadl.root.Topo.components[0].children[0])
        .to.have.property('listObject')
        .to.be.an('array')
    })
  })

  describe(`[handleEvalArray]`, () => {
    let cadl: CADL

    beforeEach(async () => {
      cadl = h.getCADL('patient')
    })

    it(`should be able to set resolved values using dataOut`, async () => {
      await cadl.handleEvalArray({
        array: [
          {
            '=.builtIn.string.concat': {
              dataIn: [
                "uid like '%",
                '=..formData.countryCode',
                ' ',
                '=..formData.phoneNumber',
                "'",
              ],
              dataOut: 'Topo.rvCondition',
            },
          },
        ],
        pageName: 'Topo',
      })
      expect(cadl.root.Topo)
        .to.have.property('rvCondition')
        .to.eq("uid like '%=..formData.countryCode =..formData.phoneNumber'")
    })

    it(`should only call evalObject object functions and eval builtIn functions once`, async () => {
      cadl.root.builtIn.topo = sinon.spy()
      await cadl.handleEvalArray({
        array: [
          m.evalObject({
            object: {
              '=.builtIn.topo': { dataIn: {} },
            },
          }),
        ],
      })
      expect(cadl.root.builtIn.topo).to.be.calledOnce
    })
  })
})
