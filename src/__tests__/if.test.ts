import { expect } from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import y from 'yaml'
import type CADL from '../CADL'
import {
  baseUrl,
  getCADL,
  createCadlEndpoint,
  createRootConfig,
  intercept,
} from './helpers'
import objectBuiltIns from '../CADL/services/object'
import stringBuiltIns from '../CADL/services/string'
import * as tu from './helpers'

let cadl: CADL
let config = 'meetd2'
let pageName = 'IfTest'
let pages = [pageName] as string[]

let IfTestYml = `
${pageName}:
  abc:
    fruit: you caught me
  tomatoValue: tomato
  components:
    - type: button
      text: Hello
      onClick:
        - actionType: evalObject
          object:
            - if:
              - =.builtIn.object.has:
                  dataIn:
                    object: ..abc
                    key: fruit
              - actionType: evalObject
                object:
                  - if:
                    - =.builtIn.string.equal:
                        dataIn:
                          string1: ..abc.fruit
                          string2: you caught me
                    - ..abc.fruit@: ..tomatoValue
                    - continue
              - continue`

xdescribe(`if`, () => {
  beforeEach(() => {
    cadl = getCADL(config)
    const scope = nock(baseUrl)
    intercept(
      'get',
      new RegExp(`${config}\\.yml`),
      scope,
      y.stringify(createRootConfig()),
    )
    intercept('get', /cadlEndpoint/, scope, y.stringify(createCadlEndpoint()))
    intercept('get', new RegExp(pageName), scope, IfTestYml)
  })

  xit(`should deref "..abc" before being passed in as dataIn to =.builtIn.object.has`, async () => {
    const spy = sinon.spy(objectBuiltIns, 'has')
    await cadl.initPage(pageName)
    const onClick = cadl.root[pageName].components[0].onClick
    const objectFn = onClick[0].object
    await objectFn()
    expect(spy.firstCall.args[0]).to.have.deep.property('object', {
      fruit: 'you caught me',
    })
  })

  it(`should deref "..abc.fruit" before being passed in as dataIn to =.builtIn.string.equal`, async () => {
    const spy = sinon.spy(stringBuiltIns, 'equal')
    await cadl.initPage(pageName)
    const onClick = cadl.root[pageName].components[0].onClick
    const objectFn = onClick[0].object
    await objectFn()
    expect(spy.firstCall.args[0]).to.have.property('string1', 'you caught me')
  })

  it(`should apply the value to the awaiting reference`, async () => {
    await cadl.initPage(pageName)
    const onClick = cadl.root[pageName].components[0].onClick
    const objectFn = onClick[0].object
    expect(cadl.root[pageName].abc).to.have.property('fruit', 'you caught me')
    await objectFn()
    expect(cadl.root[pageName].abc).to.have.property('fruit', 'tomato')
  })

  it(`should run the actions in nested evalObject objects`, async () => {
    const yml = `
A:
  components:
    - type: button
      onClick:
        - actionType: evalObject
          object:
            - if:
                - =.builtIn.string.equal:
                    dataIn:
                      string1: 'test1'
                      string2: 'test1'
                - actionType: evalObject
                  object:
                    - if:
                        - =.builtIn.string.equal:
                            dataIn:
                              string1: 'test2'
                              string2: 'test2'
                        - actionType: evalObject
                          object:
                            - actionType: builtIn
                              funcName: disconnectMeeting
                            - actionType: updateObject # updateObject(dataKey, dataObject, dataObjectKey)
                              dataKey: Global.roomInfoDoc.document
                              dataObject: {}
                            - actionType: evalObject
                              object:
                                - .Global.timer@: 0
                                - .Global.micOn@: true
                                - .Global.cameraOn@: 'true'
                            - actionType: evalObject
                              object:
                                .Global._nonce@:
                                  =.builtIn.math.random: ''
                            - actionType: popUp
                              popUpView: test1Tag
                            # - goto: Index
                        - continue
                - continue
`
    nock(baseUrl).get(/A/).reply(200, yml)
    await cadl.initPage('A')
    const onClick = cadl.root.A.components[0].onClick[0].object
    expect(cadl.root.Global?.micOn).to.be.undefined
    expect(cadl.root.Global?.cameraOn).to.be.undefined
    await onClick()
    expect(cadl.root.Global.micOn).to.be.true
    expect(cadl.root.Global.cameraOn).to.eq('true')
  })
})
