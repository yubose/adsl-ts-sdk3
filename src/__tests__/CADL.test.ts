import { expect } from 'chai'
import y from 'yaml'
import m from 'noodl-test-utils'
import cloneDeep from 'lodash/cloneDeep'
import set from 'lodash/set'
import partial from 'lodash/partial'
import * as u from '@jsmanifest/utils'
import * as nt from 'noodl-types'
import nock from 'nock'
import { isDraft } from 'immer'
import sinon from 'sinon'
import fs from 'fs-extra'
import path from 'path'
import type CADL from '../CADL'
import * as f from './factory'
import {
  type NockAppBuilder,
  _defaults,
  createAppNocker,
  getAbsFilePath,
  getCADL,
  getGenderList,
  mockYmlPageResponse,
} from './helpers'
import {
  populateArray,
  populateKeys,
  populateObject,
  populateString,
  populateVals,
  replaceEvalObject,
  replaceVars,
} from '../CADL/utils'
import { createFuncAttacher, createFuncAttacher2 } from '../CADL/commonUtils'
import store from '../common/store'
import stringBuiltInFns from '../CADL/services/string'
import ecosObjectsFixtures from './fixtures/ecosObjects.json'
import * as c from '../constants'

const { ref } = m.str

const topoEvalRef = partial<[string], 'Topo', `=.${string}`>(ref.eval, 'Topo')
const globalEvalRef = partial<[string], 'Global', `=.${string}`>(
  ref.eval,
  'Global',
)

let appNocker: NockAppBuilder
let baseUrl = ''
let cadlVersion = ''
let cadlBaseUrl = ''
let configKey = ''
let configUrl = ''
let host = 'd2bbkxkl9sogfu.cloudfront.net'

describe(`CADL`, () => {
  let apiHost = 'ecosapiprod.aitmed.io'
  let apiPort = '443'

  beforeEach(async () => {
    configKey = 'admin'
    cadlBaseUrl = `https://${host}/cadl/www\${cadlVersion}/`
    cadlVersion = '14.44.5'
    configUrl = `https://public.aitmed.com/config/${configKey}.yml`
    baseUrl = `https://${host}/cadl/www${cadlVersion}/`

    appNocker = createAppNocker()
      .setApiHost(apiHost)
      .setApiPort(apiPort)
      .setCadlBaseUrl(cadlBaseUrl)
      .setCadlVersion(cadlVersion)
      .setConfigUrl(configUrl)
      .setMyBaseUrl(baseUrl)
      .setViewWidthHeightRatio(1.78)

    // nock.disableNetConnect()
  })

  afterEach(async () => {
    baseUrl = ''
    cadlVersion = ''
    cadlBaseUrl = ''
    configKey = ''
    configUrl = ''
    // nock.enableNetConnect()
  })

  xit(``, async function () {
    appNocker.setPage('Topo', {
      Topo: {
        params: f.edgeRequestOptions({
          type: 1010,
          name: { phone_number: `+1 8872234567` },
        }),
        edgeAPI: {
          get: {
            api: 'ce',
            dataIn: 'Topo.params',
            dataOut: 'Topo.response',
          },
        },
        init: [{ [ref.eval('edgeAPI.get')]: '' }],
      },
    })
    appNocker.nock(baseUrl)
    const cadl = getCADL(configUrl)
    await cadl.initPage('Topo')
    // const fn = cadl.root.Topo.edgeAPI.get
    // console.log(await fn())
    console.log(cadl.root.Topo.response)
    console.log(cadl.config)
  })

  describe(`init`, () => {
    it(`should run ".SignInCheck"`, async () => {
      const cadl = getCADL(configUrl)
      appNocker.setPage('Topo', { Topo: { init: ['.SignInCheck'] } })
      appNocker.setPreload('BaseDataModel', {
        SignInCheck: f.signInCheck(),
      })
      appNocker.nock(baseUrl)
      const goto = sinon.spy()
      await cadl.initPage('Topo', [], { builtIn: { goto } })
      expect(goto).to.be.calledOnce
      const arg = goto.firstCall.args[0]
      expect(arg).to.have.property('goto', 'SignIn')
    })

    it(`should initiate cadl instance props`, async () => {
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      expect(cadl.assetsUrl).to.be.empty
      expect(cadl.cadlBaseUrl).to.be.undefined
      expect(cadl.cadlEndpoint).to.be.null
      expect(cadl.myBaseUrl).to.be.empty
      await cadl.init()
      expect(cadl.assetsUrl).to.eq(`${baseUrl}assets/`)
      expect(cadl.cadlBaseUrl).to.eq(baseUrl)
      expect(cadl.cadlEndpoint).to.be.an('object')
      expect(cadl.cadlEndpoint).to.have.property('assetsUrl')
      expect(cadl.cadlEndpoint).to.have.property('baseUrl')
      expect(cadl.cadlEndpoint).to.have.property('preload')
      expect(cadl.cadlEndpoint).to.have.property('page')
      expect(cadl.cadlEndpoint).to.have.property('startPage')
      expect(cadl.cadlVersion).to.eq(cadlVersion)
      expect(cadl.myBaseUrl).to.eq(baseUrl)
    })

    describe(`ecos requests`, () => {
      describe(`api objects`, () => {
        it(`should set the response to the dataOut path`, async () => {
          nock.enableNetConnect()
          appNocker.setPage('Topo', {
            Topo: {
              edgeOptions: f.edgeRequestOptions({
                type: 1010,
                name: { phone_number: `+1 8872234567` },
              }),
              edgeAPI: {
                get: {
                  api: 'ce',
                  dataIn: 'Topo.edgeOptions',
                  dataOut: 'Topo.request',
                },
              },
              init: [{ [ref.eval('edgeAPI.get')]: '' }],
            },
          })
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          expect(cadl.root.Topo).to.have.property('request').not.to.be.undefined
          expect(cadl.root.Topo.request.error).to.eq('')
          expect(cadl.root.Topo.request.jwt).to.exist
          expect(cadl.root.Topo.request.edge).to.be.an('object')
          expect(cadl.root.Topo.request.code).to.eq(0)
        })
      })
    })

    xit(`should set the response to the override path`, async () => {
      appNocker.setPage('Topo', {
        Topo: {
          edgeOptions: f.edgeRequestOptions({
            type: 1010,
            name: { phone_number: `+1 8872234567` },
          }),
          edgeAPI: {
            get: { api: 'ce', dataIn: 'Topo.edgeOptions' },
          },
          request: null,
          init: [
            m.override('Topo', 'request', {
              [ref.eval('edgeAPI.get')]: '',
            }),
          ],
        },
      })
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Topo')
      expect(cadl.root.Topo).to.have.property('request').not.to.be.undefined
    })

    describe(`builtin functions`, () => {
      it(`should set the result to the dataOut path`, async () => {
        const cadl = getCADL(configUrl)
        const Topo = {
          Topo: {
            init: [
              m.builtIn(
                'string.concat',
                m.str.uidLike(
                  ref.eval('formData.countryCode'),
                  ref.eval('formData.phoneNumber'),
                ),
                'Topo.rvCondition',
              ),
            ],
          },
        } as any
        appNocker.setPreload('BaseDataModel', `fix:BaseDataModel_en.yml`)
        appNocker.setPage('Topo', Topo)
        appNocker.setStartPage('Topo')
        appNocker.nock(baseUrl)
        await cadl.init()
        await cadl.initPage('Topo')
        expect(cadl.root.Topo)
          .to.have.property('rvCondition')
          .to.eq("uid like '%=..formData.countryCode =..formData.phoneNumber'")
      })
    })

    for (const overrideReference of [
      ref.override('..retrieveVertex.id'),
      // ref.override('=..retrieveVertex.id'),
    ]) {
      const id = 'TzAgiLambwoa3nmzImwmmyy=='
      it(`should handle { '${overrideReference}': '${id}' }`, async () => {
        appNocker.setStartPage('Topo')
        appNocker.setPreload('BaseDataModel', `fix:BaseDataModel_en.yml`)
        appNocker.setPage('Topo', {
          Topo: { init: [{ [`${overrideReference}`]: id }] },
        })
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        await cadl.initPage('Topo')
        expect(cadl.root.Topo)
          .to.have.property('retrieveVertex')
          .to.be.an('object')
          .to.have.property('id')
          .to.eq(id)
      })
    }

    for (const [type, secretProperty, expectedDestination] of [
      ['truthy', 'sk', 'Cereal'],
      ['falsey', 'esk', 'Beach'],
    ]) {
      it(`should run the ${type} condition`, async () => {
        appNocker.setStartPage('Topo')
        appNocker.setPreload('BaseDataModel', {
          Global: { currentUser: { vertex: { [secretProperty]: 'mysk' } } },
        })
        appNocker.setPage('Topo', {
          Topo: {
            init: [
              m.ifObject([
                ref.eval('Global', 'currentUser.vertex.sk'),
                m.goto('Cereal'),
                m.evalObject([
                  m.ifObject([
                    ref.eval('Global', 'currentUser.vertex.esk'),
                    m.goto('Beach'),
                    'continue',
                  ]),
                ]),
              ]),
            ],
          },
        })
        appNocker.nock(baseUrl)
        const goto = sinon.spy()
        const cadl = getCADL(configUrl)
        await cadl.initPage('Topo', [], { builtIn: { goto: goto } })
        expect(goto).to.be.calledOnce
        const arg = goto.args[0][0]
        expect(arg).to.be.an('object')
        expect(arg).to.have.property('pageName', 'Topo')
        expect(arg).to.have.property('goto', expectedDestination)
      })
    }

    it(`should run a series of actions in an evalObject to the end`, async () => {
      appNocker.setStartPage('Topo')
      appNocker.setPreload('BaseDataModel', {
        Global: {
          currentUser: { vertex: { sk: 'mysk' } },
          locationAll: [
            { medicalFacilityName: 'Pigeon', id: '4242-4242-4242-4242' },
          ],
        },
        SignInCheck: f.signInCheck(),
      })
      appNocker.setPage('Topo', {
        Topo: {
          getScheduleOfficeVisit: {
            edgeReq: { id: [] },
            schedule: { edge: [{ id: 'sunny05' }] },
          },

          getScheduleTelemedicine: {
            schedule: {
              edge: [
                {
                  id: 'my_edge_id123',
                  name: {
                    setting: {
                      day: [{}],
                    },
                  },
                },
              ],
            },
          },
          init: [
            '.SignInCheck',
            m.override('Global', '_nonce', {
              [ref.eval('builtIn', 'math.random')]: '',
            }),
            m.override('Global', 'currentSchedule', []),
            m.builtIn(
              'array.selectOneToArr',
              { arr: globalEvalRef('locationAll'), key: 'medicalFacilityName' },
              'Topo.addressName',
            ),
            m.builtIn(
              'array.matchInArray',
              {
                arr: globalEvalRef('locationAll'),
                value: ref.eval('addressName.0'),
                key: 'medicalFacilityName',
                key1: 'id',
              },
              'Topo.locationId',
            ),
            m.builtIn('array.add', {
              object: ref.eval('getScheduleOfficeVisit.edgeReq.id'),
              value: ref.eval('locationId'),
            }),
            m.override(
              'formDataTelemedicine',
              ref.eval('getScheduleTelemedicine.schedule.edge.0'),
            ),
            m.override(
              'formDataOfficeVisit',
              ref.eval('getScheduleOfficeVisit.schedule.edge.0'),
            ),
            m.ifObject([
              topoEvalRef('getScheduleTelemedicine.schedule.edge.0.id'),
              m.builtIn(
                'array.WeekSchedule',
                {
                  planObject: topoEvalRef(
                    'getScheduleTelemedicine.schedule.edge.0.name.setting.day',
                  ),
                },
                'Topo.dayTelemedicine',
              ),
              'continue',
            ]),
            m.ifObject([
              topoEvalRef('getScheduleOfficeVisit.schedule.edge.0.id'),
              m.builtIn(
                'array.WeekSchedule',
                {
                  planObject: topoEvalRef(
                    'getScheduleOfficeVisit.schedule.edge.0.name.setting.day',
                  ),
                },
                'Topo.dayOfficeVisit',
              ),
              'continue',
            ]),
            m.ifObject([
              ref.eval(
                'Global',
                'formData.staffAuthorization.name.data.roleControlLevel.scheduleManagement.prodAvailability.edit',
              ),
              m.override('formData.isEditDis', 'inline-block'),
              m.override('formData.isEditDis', 'none'),
            ]),
          ],
        },
      })
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      const goto = sinon.spy()
      await cadl.initPage('Topo', [], { builtIn: { goto } })
      expect(cadl.root.Global).to.have.property('_nonce').to.be.a('number')
      expect(cadl.root.Global.currentSchedule).to.deep.eq([])
      expect(cadl.root.Topo)
        .to.have.property('addressName')
        .to.deep.eq(['Pigeon'])
      expect(cadl.root.Topo).to.have.property(
        'locationId',
        '4242-4242-4242-4242',
      )
      expect(cadl.root.Topo.getScheduleOfficeVisit.edgeReq.id).to.deep.eq([
        '4242-4242-4242-4242',
      ])
      expect(cadl.root.Topo.formDataTelemedicine)
        .to.be.an('object')
        .to.have.property('id', 'my_edge_id123')
      expect(cadl.root.Topo.formDataOfficeVisit)
        .to.be.an('object')
        .to.have.property('id', 'sunny05')
      expect(cadl.root.Topo)
        .to.have.property('dayTelemedicine')
        .to.deep.eq([
          { info: ['No Settings'], weekDay: 'Sunday' },
          { info: ['No Settings'], weekDay: 'Monday' },
          { info: ['No Settings'], weekDay: 'Tuesday' },
          { info: ['No Settings'], weekDay: 'Wednesday' },
          { info: ['No Settings'], weekDay: 'Thursday' },
          { info: ['No Settings'], weekDay: 'Friday' },
          { info: ['No Settings'], weekDay: 'Saturday' },
        ])
      expect(cadl.root.Topo)
        .to.have.property('formData')
        .to.be.an('object')
        .to.have.property('isEditDis')
        .to.eq('none')
    })
  })

  describe(`components`, () => {
    it(`should only invoke the constructed eval builtIn func once when called`, async () => {
      appNocker.setPage('Topo', {
        Topo: {
          components: [
            m.textField({ onChange: [m.evalObject([m.builtIn('topo')])] }),
          ],
        },
      })
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      const spy = sinon.spy()
      cadl.root.builtIn.topo = spy
      await cadl.initPage('Topo')
      await cadl.root.Topo.components?.[0].onChange?.[0]?.object()
      expect(spy).to.be.calledOnce
    })

    it(
      `should merge incoming items by using the builtIn as the ` +
        `implementation keep the same list data`,
      async () => {
        const iteratorVar = 'itemObject'
        appNocker.setPage('Topo', {
          Topo: {
            condition: { cond: '' },
            suggest: {
              suinfo: {
                doctor_suggestion: [],
                specialty_suggestion: [{}],
                symptom_suggestion: [],
              },
            },
            components: [
              m.scrollView({
                children: [
                  m.list({
                    contentType: 'listObject',
                    iteratorVar,
                    listObject: '=..suggest.suinfo.specialty_suggestion',
                    children: [
                      m.listItem({
                        [iteratorVar]: '',
                        children: [
                          m.textField({
                            onInput: [
                              m.evalObject([
                                m.builtIn(
                                  'search.mockSuggest',
                                  '',
                                  'Topo.suggest.suinfo',
                                ),
                              ]),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        })
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        const getDoctorSuggestions = () => [{ name: 'Mike' }]
        const getSpecialtySuggestions = () => ['chiropractor']
        const getSymptomSuggestions = () => ['stuffy nose']
        cadl.root.builtIn.search['mockSuggest'] = () => ({
          doctor_suggestion: [
            ...cadl.root.Topo.suggest.suinfo.doctor_suggestion,
            ...getDoctorSuggestions(),
          ],
          specialty_suggestion: [
            ...cadl.root.Topo.suggest.suinfo.specialty_suggestion,
            ...getSpecialtySuggestions(),
          ],
          symptom_suggestion: [
            ...cadl.root.Topo.suggest.suinfo.symptom_suggestion,
            ...getSymptomSuggestions(),
          ],
        })
        await cadl.initPage('Topo')
        const getTextField = () =>
          cadl.root.Topo.components?.[0].children?.[0].children?.[0]
            ?.children?.[0]
        const getListComponent = () =>
          cadl.root.Topo.components?.[0].children?.[0]
        expect(getListComponent())
          .to.have.property('listObject')
          .to.be.an('array')
          .with.lengthOf(1)
        await getTextField().onInput?.[0].object()
        expect(getListComponent())
          .to.have.property('listObject')
          .to.be.an('array')
          .with.lengthOf(2)
        const updatedListObject = getListComponent().listObject
        expect(updatedListObject[0]).to.deep.eq({})
        expect(updatedListObject[1]).to.eq('chiropractor')
      },
    )

    describe(`list component`, () => {
      describe(`when listObject is a reference`, () => {
        it(`should hold the same value from local reference as the one in the page object`, async () => {
          const newData = ['hello']
          appNocker.setPage('Topo', {
            Topo: {
              data: [...getGenderList()],
              components: [
                m.list({
                  listObject: '..data',
                  iteratorVar: 'itemObject',
                  children: [
                    m.listItem({
                      itemObject: '',
                      children: [m.label('itemObject.value')],
                      onClick: [
                        m.evalObject({
                          object: [{ [ref.override('..data')]: newData }],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            },
          })
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
          await cadl.root.Topo.components[0].children[0].onClick[0].object()
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
        })

        it(`should hold the same value from root reference as the one in the page object`, async () => {
          const newData = ['hello']
          appNocker.setPage('Topo', {
            Topo: {
              data: [...getGenderList()],
              components: [
                m.list({
                  listObject: '..data',
                  iteratorVar: 'itemObject',
                  children: [
                    m.listItem({
                      itemObject: '',
                      children: [m.label('itemObject.value')],
                      onClick: [m.evalObject([m.override('data', newData)])],
                    }),
                  ],
                }),
              ],
            },
          })
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
          await cadl.root.Topo.components[0].children[0].onClick[0].object()
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
        })

        it(`should hold the same value from eval reference as the one in the page object`, async () => {
          const newData = ['hello']
          appNocker.setPage('Topo', {
            Topo: {
              data: [...getGenderList()],
              test: '',
              components: [
                m.list({
                  listObject: ref.eval('data'),
                  iteratorVar: 'itemObject',
                  children: [
                    m.listItem({
                      itemObject: '',
                      children: [m.label('itemObject.value')],
                      onClick: [
                        m.evalObject({
                          object: [
                            { [ref.override('data')]: newData },
                            {
                              [ref.override('test')]: ref.eval('data'),
                            },
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            },
          })
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
          await cadl.root.Topo.components[0].children[0].onClick[0].object()
          expect(cadl.root.Topo.components[0].listObject).to.eq(
            cadl.root.Topo.data,
          )
        })

        it(`should still hold the same values`, async () => {
          appNocker.setPage('Topo', {
            Topo: {
              data: [...getGenderList()],
              test: '',
              components: [
                m.list({
                  listObject: ref.eval('data'),
                  iteratorVar: 'itemObject',
                  children: [
                    m.listItem({
                      itemObject: '',
                      children: [m.label('itemObject.value')],
                      onClick: [
                        m.evalObject({
                          object: [
                            m.override('data', ref.eval('data')),
                            m.override('test', ref.eval('data')),
                            m.override('tes', ref.eval('data')),
                            m.override('te', ref.eval('data')),
                            m.override('t', ref.eval('data')),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            },
          })
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          expect(cadl.root.Topo.data).to.have.lengthOf(3)
          expect(cadl.root.Topo.data[0]).to.deep.eq({
            key: 'gender',
            value: 'Female',
          })
          expect(cadl.root.Topo.components[0].listObject).to.have.lengthOf(3)
          expect(cadl.root.Topo.components[0].listObject[0]).to.deep.eq({
            key: 'gender',
            value: 'Female',
          })
          await cadl.root.Topo.components[0].children[0].onClick[0].object()
          expect(cadl.root.Topo.data).to.have.lengthOf(3)
          expect(cadl.root.Topo.data[0]).to.deep.eq({
            key: 'gender',
            value: 'Female',
          })
          expect(cadl.root.Topo.components[0].listObject).to.have.lengthOf(3)
          expect(cadl.root.Topo.components[0].listObject[0]).to.deep.eq({
            key: 'gender',
            value: 'Female',
          })
        })
      })

      it(`should return the updated listObject when accessing the getter`, async () => {
        const genderList = ['Female', 'Male', 'Other']
        const page = {
          Topo: {
            components: [
              m.list({
                listObject: genderList,
                iteratorVar: 'itemObject',
                children: [
                  m.listItem({
                    itemObject: '',
                    children: [m.label('itemObject.value')],
                  }),
                ],
              }),
            ],
          },
        }
        appNocker.setPage('Topo', page)
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        await cadl.initPage('Topo')
        const o = page.Topo.components[0]
        expect(page.Topo.components[0].listObject).to.have.lengthOf(3)
        expect(page.Topo.components[0].listObject).to.eq(genderList)
        expect(o.listObject).to.eq(genderList)
        page.Topo.components[0].listObject = [{ key: 'Momo', value: 'Unknown' }]
        expect(page.Topo.components[0].listObject).to.have.lengthOf(1)
        expect(o.listObject).to.have.lengthOf(1)
        expect(o)
          .to.have.property('listObject')
          .to.eq(page.Topo.components[0].listObject)
      })
    })
  })

  describe(`emitCall`, () => {
    it.only(`should be able to run the last action`, async () => {
      appNocker.setPreload('BaseMessage', 'fix:BaseMessage_en.yml')
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      const refid = '8lszMBpJs3xb2xK2HzQzmA=='
      const evid = 'L2XDULFy7ozRA9UrBm0h5Q=='
      const subtype = 2
      await cadl.init()
      await cadl.initPage('Abc')
      cadl.root.FirebaseToken.edge.refid = refid
      cadl.root.FirebaseToken.edge.evid = evid
      cadl.root.FirebaseToken.edge.subtype = subtype
      const token =
        'd33OZCm8mFstw3uecLKrkF:APA91bGFOfUDJaZFlve8filWKWvuSi14yL4bFp0cKCscLrZGcYYZ9cHm4lFpEEa7zgkQqGfMaKQ66Rf9FC5jyZSsNtaaUD_9cB4smIagIcOf9Ub_A9GErgASjjfGt97WeCjMtpWiaOMa'
      const videoChatAccessToken =
        'fi6YkDA4ywhIqL-nxL9sAJ:APA91bFO73nXGLIwpKEaN_EX4rIq1cY1pHE9ctN2dnoeStrhDfpOkpk_7wYtfaRJFl3BHysec-CGN9MbT7yFLrMoFqF3x1VHep6JZs8774EwcPBZcUWI_Ps4HIhWdYsxHI4qgncftyt4'
      const registerComponent = m.register({
        onEvent: 'FCMOnTokenReceive',
        ...m.emit({
          dataKey: { var: token },
          actions: [
            m.builtIn(
              'FCM.getFCMToken',
              { token: '$var' },
              'FirebaseToken.edge.name.accessToken',
            ),
            m.builtIn(
              'FCM.getFCMgetAPPIDToken',
              { appName: '=.AppName' },
              'FirebaseToken.edge.evid',
            ),
            {
              [ref.eval('builtIn', 'FCM.getFCMTokenSHA256Half')]: {
                dataIn: { token: '$var' },
                dataOut: 'FirebaseToken.edge.refid',
              },
            },
            ref.eval('FirebaseToken', 'edgeAPI.store'),
          ],
        }),
      })
      cadl.root.FirebaseToken.edge.name.accessToken = videoChatAccessToken
      const emitParams = {
        pageName: 'Abc',
        dataKey: token,
        actions: registerComponent.emit!.actions,
      } as any
      expect(cadl.root.FirebaseToken.response).to.eq('')
      await cadl.emitCall(emitParams)
      expect(cadl.root.FirebaseToken.response).not.to.eq('')
      expect(cadl.root.FirebaseToken.response).to.be.an('object')
    })

    const getNotificationClickRegisterComponent = () =>
      m.register({
        onEvent: 'onNotificationClicked',
        emit: m.emit({
          actions: [
            m.builtIn(
              'string.concat',
              [
                '=',
                '.',
                'NotificationMap.',
                '$var',
                '.name',
                '.notification',
                '.onClickLandingPage',
              ],
              'NotificationMap.notificationGoto',
            ),
          ],
          dataKey: { var: 'notificationID' },
        }).emit,
      })

    it(`should pass the value from $var where its referenced in dataIn`, async () => {
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      const registerComponent = getNotificationClickRegisterComponent()
      expect(cadl.root.NotificationMap).to.be.undefined
      const varValue = 'abc123'
      const result = await cadl.emitCall({
        dataKey: { var: varValue },
        actions: registerComponent.emit!.actions,
        pageName: 'Global',
      })
      expect(result[0]).to.eq(
        `.NotificationMap.${varValue}.name.notification.onClickLandingPage`,
      )
      expect(cadl.root.NotificationMap)
        .to.be.an('object')
        .to.have.property('notificationGoto')
      expect(cadl.root.NotificationMap.notificationGoto).to.eq(
        `.NotificationMap.${varValue}.name.notification.onClickLandingPage`,
      )
    })

    it(`should use an empty string when the raw reference value isn't found`, async () => {
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      const registerComponent = getNotificationClickRegisterComponent()
      expect(cadl.root.NotificationMap).to.be.undefined
      const result = await cadl.emitCall({
        dataKey: { var: '' },
        actions: registerComponent.emit!.actions,
        pageName: 'Global',
      })
      expect(result[0]).to.eq(
        `.NotificationMap..name.notification.onClickLandingPage`,
      )
    })
  })

  describe(`handleEvalArray`, () => {
    it(`should return an array`, async () => {
      const cadl = getCADL(configUrl)
      expect(await cadl.handleEvalArray({ array: [] })).to.be.an('array')
    })

    it(`should have applied the side effects expectedly`, async () => {
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.init()
      cadl.root.Abc = { genderList: getGenderList() }
      await cadl.handleEvalArray({
        array: [
          ref.eval('genderList'),
          ref.eval('Abc', 'genderList'),
          m.override('Global', 'id', ref.eval('genderList')),
        ],
        pageName: 'Abc',
      })
      expect(cadl.root.Global)
        .to.have.property('id')
        .to.be.an('array')
        .to.have.lengthOf(3)
      cadl.root.Global.id.forEach((obj: any, index) => {
        expect(obj)
          .to.be.an('object')
          .to.have.property('value', cadl.root.Abc.genderList[index].value)
      })
    })

    it(`should return the expected results`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      const result = await cadl.handleEvalArray({
        array: [
          m.builtIn('array.concat', { array1: ['he'], array2: [1] }),
          m.builtIn('string.concat', ['hello', '_', 'goodbye']),
          m.builtIn('string.concat', ['hello', '_', 'goodbye']),
        ],
        pageName: 'Abc',
      })
      expect(result).to.be.an('array').to.have.lengthOf(3)
      expect(result[0]).to.have.lengthOf(2)
      expect(result[0][0]).to.eq('he')
      expect(result[0][1]).to.eq(1)
      expect(result[1]).to.be.a('string').to.eq('hello_goodbye')
      expect(result[2]).to.be.a('string').to.eq('hello_goodbye')
    })

    xdescribe(`when receiving a popUp action object as a result`, () => {
      let cadl: CADL
      let evalObject: nt.EvalActionObject

      beforeEach(async () => {
        cadl = getCADL(configUrl)
        await cadl.init()
        cadl.root.Abc = { genderList: getGenderList() }
        evalObject = m.evalObject([
          m.ifObject([
            f.builtIn.string.equal('1', '1'),
            m.popUp({ popUpView: 'errorView', wait: true }),
            'continue',
          ]),
          m.override('formDataTemp.testData', '2'),
        ])
      })

      xit(`should immediately stop further iterations and return the results with the popUp object as the most recent action`, async () => {
        cadl.root.Abc.genderList = getGenderList()
        const result = await cadl.handleEvalArray({
          array: [
            ...(evalObject.object as any[]),
            ...(m.evalObject([m.override('Global', 'id', '=..genderList')])
              .object as any[]),
            ref.eval('Abc', 'genderList'),
            ref.eval('genderList'),
            m.builtIn('string.concat', { array1: ['1'], array2: [{}] }),
          ],
          pageName: 'Abc',
        })
        const lastItem = result[result.length - 1]
        expect(result).to.be.an('array').to.have.lengthOf(1)
        expect(lastItem)
          .to.be.an('object')
          .to.have.property('actionType')
          .to.eq('popUp')
        expect(cadl.root.Global).not.to.have.property('id')
      })

      xit(`should immediately stop further iterations and return the results with the popUp object as the most recent action`, async () => {
        mockYmlPageResponse(baseUrl, 'Topo', {
          Topo: {
            formDataTemp: { booleanTest: true, testData: '1' },
            components: [
              m.label({
                onClick: [
                  m.evalObject([
                    m.ifObject([
                      ref.eval('formDataTemp.booleanTest'),
                      m.evalObject([
                        m.ifObject([
                          f.builtIn.string.equal('1', '1'),
                          m.popUp({ popUpView: 'errorView', wait: true }),
                          'continue',
                        ]),
                      ]),
                      'continue',
                    ]),
                    m.override('formDataTemp.testData', '2'),
                  ]),
                ],
              }),
            ],
          },
        })
        await cadl.initPage('Topo')
        const component = cadl.root.Topo.components?.[0]
        expect(cadl.root.Topo.formDataTemp?.testData).to.eq('1')
        await component.onClick?.[0].object()
        expect(cadl.root.Topo.formDataTemp?.testData).not.to.eq('2')
        expect(cadl.root.Topo.formDataTemp?.testData).to.eq('1')
      })
    })
  })

  describe(`handleEvalFunction`, () => {
    describe(
      `evalObject using an if object that is evaluating its condition` +
        ` using a =.builtIn func along with a popUp action object that ` +
        `uses "actionType"`,
      () => {
        xit(`should return the correct results in order`, async () => {
          const page = {
            Topo: {
              init: [
                m.builtIn(
                  'string.concat',
                  f.uidLikeList(
                    ref.eval('formData.countryCode'),
                    ref.eval('formData.phoneNumber'),
                  ),
                  'Topo.rvCondition',
                ),
              ],
              formData: { countryCode: '+1', phoneNumber: '8882465555' },
              getVertex: {
                vertex: {
                  '.Vertex': '',
                  xfname: 'none',
                  type: 1,
                  sCondition: ref.eval('rvCondition'),
                },
              },
              rvCondition: '',
              save: [
                m.builtIn(
                  'string.concat',
                  f.uidLikeList(
                    topoEvalRef('formData.countryCode'),
                    topoEvalRef('formData.phoneNumber'),
                  ),
                  'Topo.apiData.phoneNumber',
                ),
              ],
              components: [
                m.button({
                  onClick: [
                    m.evalObject([m.builtIn('string.concat', ['hello'])]),
                    m.evalObject(
                      m.ifObject([
                        ref.eval('getVertex.vertex.xfname'),
                        'cocacola',
                        m.override('Global', 'newAccountFlag', '1'),
                      ]),
                    ),
                    m.evalObject({ object: '..save' }),
                  ],
                }),
              ],
            },
          }

          appNocker.setPage('Topo', page)
          appNocker.nock(baseUrl)
          const cadl = getCADL(configUrl)
          await cadl.initPage('Topo')
          const component = cadl.root.Topo.components[0]
          const onClick = component.onClick as any[]
          const evalObject1 = onClick?.[0]
          const evalObject2 = onClick?.[1]
          const evalObject3 = onClick?.[2]
          const res1 = await evalObject1?.object()
          const res2 = await evalObject2?.object()
          const res3 = await evalObject3?.object()
          expect(res1).to.deep.eq(['hello'])
          expect(res2).to.be.an('array').to.have.members(['cocacola'])
          expect(res3?.[0]).to.deep.eq("uid like '%+1 8882465555'")
        })
      },
    )
  })

  describe(`handleIfCommand`, () => {
    it(`should evaluate builtIn funcs`, async () => {
      const cadl = getCADL(configUrl)
      const ifObject = m.ifObject([
        f.builtIn.string.equal('Bob', 'Bob'),
        'food',
        'not food',
      ])
      let result = await cadl.handleIfCommand({
        pageName: 'Abc',
        ifCommand: ifObject,
      })
      expect(result).to.eq('food')
      ifObject.if[0][ref.eval('builtIn', 'string.equal')].dataIn.string1 = '.'
      result = await cadl.handleIfCommand({
        pageName: 'Abc',
        ifCommand: ifObject,
      })
      expect(result).to.eq('not food')
    })

    it(`should only call the builtIn func once`, async () => {
      const cadl = getCADL(configUrl)
      const spy = sinon.spy()
      cadl.root.builtIn.string['topo'] = spy
      const obj = {
        '=.builtIn.string.topo': { dataIn: { string1: 'Bob', string2: 'Bob' } },
      }
      await cadl.handleIfCommand({
        pageName: 'Abc',
        ifCommand: m.ifObject([obj, 'food', 'not food']),
      })
      expect(spy).to.be.calledOnce
    })

    it(`should be able to evaluate using return values from non builtIn funcs`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject([() => true, 'abc', 'def']),
        }),
      ).to.eq('abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject([() => false, 'abc', 'def']),
        }),
      ).to.eq('def')
    })

    it(`should be able to evaluate using true, 'true', false, and 'false'`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject([true, 'abc', 'def']),
        }),
      ).to.eq('abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['true', 'abc', 'def']),
        }),
      ).to.eq('abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject([false, 'abc', 'def']),
        }),
      ).to.eq('def')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['false', 'abc', 'def']),
        }),
      ).to.eq('def')
    })

    it(`should be able to evaluate using root referenced value of 'false`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['.Abc.thisIsFalse', 'abc', 'def']),
        }),
      ).to.eq('def')
    })

    it(`should be able to evaluate using local root referenced value of 'false`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['..thisIsFalse', 'abc', 'def']),
        }),
      ).to.eq('def')
    })

    it(`should be able to evaluate using local root references`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['..thisIsTrue', 'abc', 'def']),
        }),
      ).to.eq('abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['..thisIsAlsoTrue', 'abc', 'def']),
        }),
      ).to.eq('abc')
      expect(
        await cadl.handleIfCommand({
          pageName: 'Abc',
          ifCommand: m.ifObject(['..thisIsAlsoFalse', 'abc', 'def']),
        }),
      ).to.eq('def')
    })

    it(`should set the value on dataOut afterwards`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      cadl.root.builtIn.abcTest = { prepare: () => ({ myGender: 'Male' }) }
      await cadl.handleIfCommand({
        pageName: 'Abc',
        ifCommand: m.ifObject([
          ref.eval('genderList.0'),
          {
            [ref.eval('builtIn', 'abcTest.prepare')]: {
              dataIn: { doc: '=..genderList.0' },
              dataOut: 'Abc.tempProfile.gender',
            },
          },
          'continue',
        ]),
      })
      expect(cadl.root.Abc.tempProfile.gender)
        .to.be.an('object')
        .to.have.property('myGender', 'Male')
    })

    it(`should pass in the value of dataIn to the builtIn func`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      const spy = sinon.spy()
      cadl.root.builtIn.abcTest = { prepare: spy }
      await cadl.handleIfCommand({
        pageName: 'Abc',
        ifCommand: m.ifObject([
          ref.eval('genderList.0'),
          {
            [ref.eval('builtIn', 'abcTest.prepare')]: {
              dataIn: { doc: ref.eval('genderList.0') },
              dataOut: 'Abc.tempProfile.gender',
            },
          },
          'continue',
        ]),
      })
      expect(spy.firstCall.args[0])
        .to.have.property('doc')
        .to.have.property('value', 'Female')
    })

    it(`should set the eval root referenced value on the "@" reference`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      const ifObject = m.ifObject([
        false,
        'abc',
        {
          [ref.override('..tempProfile.firstName')]: ref.eval(
            'Abc',
            'shop.name',
          ),
        },
      ])
      await cadl.handleIfCommand({ pageName: 'Abc', ifCommand: ifObject })
      expect(cadl.root.Abc.tempProfile.firstName).to.eq('walmart')
    })

    it(`should set the eval local root referenced value on the "@" reference`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      const ifObject = m.ifObject([
        false,
        'abc',
        {
          [ref.override('..tempProfile.firstName')]: ref.eval('shop.name'),
        },
      ])
      await cadl.handleIfCommand({ pageName: 'Abc', ifCommand: ifObject })
      expect(cadl.root.Abc.tempProfile.firstName).to.eq('walmart')
    })

    it(`should set the non-referenced value on the "@" reference`, async () => {
      appNocker.setPage('Abc', 'fix:Abc_en.yml')
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.initPage('Abc')
      const ifObject = m.ifObject([
        false,
        'abc',
        { [ref.override('..tempProfile.firstName')]: 'false' },
      ])
      await cadl.handleIfCommand({ pageName: 'Abc', ifCommand: ifObject })
      expect(cadl.root.Abc.tempProfile.firstName).to.eq('false')
    })
  })

  describe(`populateKeys`, () => {
    let cadl: CADL

    beforeEach(() => {
      cadl = getCADL(baseUrl)
    })

    describe(`when keys are references`, () => {
      beforeEach(() => {
        cadl.root.Mobo = {
          formData: { user: { email: 'pfftd@gmail.com', password: '123' } },
        }
      })

      it(`should merge the root object and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: { spaceCraft: { '.Mobo': null } },
        })
        expect(spaceCraft).not.to.have.property('.Mobo')
        expect(spaceCraft)
          .to.have.property('formData')
          .to.be.an('object')
          .to.have.property('user')
          .to.have.property('email')
      })

      it(`should merge the local root object and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: { spaceCraft: { '..formData.user': null } },
        })
        expect(spaceCraft).not.to.have.property('..formData.user')
        expect(spaceCraft).to.have.property('email', 'pfftd@gmail.com')
        expect(spaceCraft).to.have.property('password', '123')
      })

      it(`should merge the root object in a nested object and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: {
            spaceCraft: {
              info: { consultations: { orgs: { '.Mobo': null } } },
            },
          },
        })
        expect(spaceCraft)
          .to.have.property('info')
          .to.have.property('consultations')
          .to.have.property('orgs')
        const { orgs } = spaceCraft.info.consultations
        expect(orgs).not.to.have.property('.Mobo')
        expect(orgs)
          .to.have.property('formData')
          .to.have.property('user')
          .to.have.property('email')
      })

      it(`should merge the root object in a nested array and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: {
            spaceCraft: [
              {
                info: [{ consultations: { orgs: [{ '.Mobo': null }] } }],
              },
            ],
          },
        })
        expect(spaceCraft[0]).to.have.property('info').to.be.an('array')
        const { info } = spaceCraft[0]
        expect(info[0])
          .to.be.an('object')
          .to.have.property('consultations')
          .to.have.property('orgs')
          .to.be.an('array')
        const { orgs } = info[0].consultations
        expect(orgs[0]).to.be.an('object').not.to.have.property('.Mobo')
        expect(orgs[0]).to.have.property('formData').to.be.an('object')
      })

      it(`should merge the local root object in a nested object and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: {
            spaceCraft: {
              info: { consultations: { orgs: { '..formData.user': null } } },
            },
          },
        })
        expect(spaceCraft)
          .to.have.property('info')
          .to.have.property('consultations')
          .to.have.property('orgs')
        const { orgs } = spaceCraft.info.consultations
        expect(orgs).not.to.have.property('..formData.user')
        expect(orgs).to.have.property('email', 'pfftd@gmail.com')
        expect(orgs).to.have.property('password', '123')
      })

      it(`should merge the local root object in a nested array and delete the referenced key`, () => {
        const { spaceCraft } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: {
            spaceCraft: [
              {
                info: [
                  { consultations: { orgs: [{ '..formData.user': null }] } },
                ],
              },
            ],
          },
        })
        expect(spaceCraft[0]).to.have.property('info').to.be.an('array')
        const { info } = spaceCraft[0]
        expect(info[0])
          .to.be.an('object')
          .to.have.property('consultations')
          .to.have.property('orgs')
          .to.be.an('array')
        const { orgs } = info[0].consultations
        expect(orgs[0])
          .to.be.an('object')
          .not.to.have.property('..formData.user')
        expect(orgs[0]).to.have.property('email', 'pfftd@gmail.com')
      })

      it(`should override the merging object's keys that collide`, () => {
        cadl.root.Hello = {
          profile: { '.Mobo.formData.user': null, email: 'some@gmail.com' },
        }
        const { profile } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: { profile: cadl.root.Hello.profile },
        })
        expect(profile)
          .to.be.an('object')
          .to.have.property('email', 'some@gmail.com')
      })

      it(`should merge the merging object's key/values and still retain  the rest of its current key/values`, () => {
        cadl.root.Hello = {
          profile: {
            '.Mobo.formData.user': null,
            email: 'some@gmail.com',
            greeting: 'hi',
          },
        }
        const { profile } = populateKeys({
          localRoot: cadl.root.Mobo,
          root: cadl.root,
          source: { profile: cadl.root.Hello.profile },
        })
        expect(profile)
          .to.be.an('object')
          .to.have.property('email', 'some@gmail.com')
        expect(profile).to.have.property('password', '123')
        expect(profile).to.have.property('greeting', 'hi')
      })

      it(`should retain its key/value if lookFor does not find any matchings for ".."`, () => {
        const { spaceCraft } = populateKeys({
          source: { spaceCraft: { '.Mobo': null } },
        } as any)
        expect(spaceCraft).to.have.property('.Mobo').to.be.null
        expect(spaceCraft).not.to.have.property('formData')
      })

      it(`should retain its key/value if lookFor does not find any matchings for "."`, () => {
        const { spaceCraft } = populateKeys({
          source: { spaceCraft: { '..formData.user': null } },
        } as any)
        expect(spaceCraft).to.have.property('..formData.user').to.be.null
        expect(spaceCraft).not.to.have.property('user')
      })
    })
  })

  describe(`populateString`, () => {
    it(`should be able to populate by "~" references (myBaseUrl)`, async () => {
      appNocker.nock(baseUrl)
      const cadl = getCADL(configUrl)
      await cadl.init()
      expect(
        populateString({
          source: '~/abc.png',
          lookFor: '~',
          locations: [cadl],
        }),
      ).to.eq(baseUrl + 'abc.png')
    })

    it(`should return the correct reference path from "_" (traverse) or "." references`, async () => {
      const cadl = getCADL(configUrl)
      cadl.root.Popcorn = {
        components: [],
        shop: {
          traverseMe: {
            children: [
              {
                type: 'view',
                greeting: 'good morning!',
                children: [
                  {
                    type: 'scrollView',
                    children: [{ type: 'label', text: '___.greeting' }],
                  },
                ],
              },
            ],
          },
        },
      }
      expect(
        populateString({
          source: `___.greeting`,
          lookFor: '_',
          locations: [cadl, cadl.root, cadl.root.Popcorn],
          path: [
            'Popcorn',
            'shop',
            'traverseMe',
            'children[0]',
            'children[0]',
            'children[0]',
            'text',
          ],
          pageName: 'Popcorn',
        }),
      ).to.eq('.Popcorn.shop.traverseMe.children[0].greeting')
    })

    describe(`when populating ".." (local) references`, () => {
      it(`should be able to populate when given a page the page object with or without the page name`, () => {
        const cadl = getCADL(configUrl)
        cadl.root.Pop = {
          formData: { user: { email: 'pff@gmail.com', password: 'form' } },
        }
        const result = populateString({
          source: '..formData.user',
          locations: [cadl.root.Pop],
          lookFor: '..',
        })
        expect(result).to.be.an('object').to.eq(cadl.root.Pop.formData.user)
      })

      xit(`should be able to populate when given the page name and the root object but no page object`, () => {
        //
      })

      xit(`should be able to resolve when given the page object and without the page name`, () => {
        //
      })
    })

    describe(`when populating "." (root) references`, () => {
      it(`should be able to populate when given the root object`, () => {
        const cadl = getCADL(configUrl)
        cadl.root.Pop = {
          formData: { user: { email: 'pff@gmail.com', password: 'form' } },
        }
        const result = populateString({
          source: '.Pop.formData.user',
          locations: [cadl.root],
          lookFor: '.',
        })
        expect(result).to.be.an('object').to.eq(cadl.root.Pop.formData.user)
      })
    })

    //
    ;['=.', '=..'].forEach((op) => {
      it(`should be able to retrieve the referenced value even with the = in front of "${op}"`, () => {
        expect(
          populateString({
            source: `${op}builtIn.string.equal`,
            locations: [
              { builtIn: { string: { equal: stringBuiltInFns.equal } } },
            ],
            lookFor: '=',
          }),
        )
          .to.be.a('function')
          .to.eq(stringBuiltInFns.equal)
      })
    })

    it(`should be able to populate by "$" var references`, () => {
      const cadl = getCADL(configUrl)
      cadl.root.Pop = {
        formData: { user: { email: 'pff@gmail.com', password: 'form' } },
      }
      const result = populateString({
        source: '$var1.pageName',
        locations: [cadl.root, cadl.root.Pop, { var1: { pageName: 'Pop' } }],
        lookFor: '$',
      })
      expect(result).to.be.a('string').to.eq('Pop')
    })
  })

  xdescribe(`populateVals`, () => {
    let TreePage

    beforeEach(async () => {
      const cadl = getCADL(configUrl)
      cadl.root.Tree = {
        genderList: getGenderList(),
        tempProfile: {
          firstName: 'Bob',
          age: 30,
          gender: '.LeftBackButton.children.0.path',
        },
        shop: {
          name: 'walmart',
          location: '..shop.tempLocation',
          tempLocation: '..shop.actions.0.emit.dataKey.var1',
          numEmployees: 18,
          traverseMe: {
            children: [
              {
                type: 'view',
                greeting: 'good morning!',
                children: [
                  {
                    type: 'scrollView',
                    children: [{ type: 'label', text: '___.greeting' }],
                  },
                ],
              },
            ],
          },
          actions: [
            {
              emit: {
                actions: [],
                dataKey: { var1: '..shop.actions.1.funcName' },
              },
            },
            { actionType: 'builtIn', funcName: 'beach' },
          ],
        },
        items: [{ type: 'shirt', tag: '.Abc.shop.location' }],
        labelText: '..items.0.tag',
        components: [
          { '.BaseHeader3': null },
          { '.HeaderLeftButton': null },
          { type: 'label', text: '.Abc.labelText' },
        ],
      }

      nock(baseUrl)
        .get(/Tree/)
        .reply(200, y.stringify({ Tree: cadl.root.Tree }, { indent: 2 }))

      await cadl.init()
    })

    it(`should retrieve .BaseHeader3 component`, async () => {
      const cadl = getCADL(configUrl)
      await cadl.initPage('Tree', [], {})
      TreePage = populateVals({
        lookFor: ['.', '..', '_', '~'],
        locations: [cadl.root, cadl.root.Tree],
        source: cadl.root.Tree,
        dispatch: cadl.dispatch.bind(this),
      })
      const component = TreePage?.components?.[0]
      expect(component).to.be.an('object').to.have.property('type', 'header')
      expect(component).to.have.property('children').to.be.an('array')
    })

    it(`should retrieve the .HeaderLeftButton component`, async () => {
      const cadl = getCADL(configUrl)
      await cadl.initPage('Tree', [], {})
      TreePage = populateVals({
        lookFor: ['.', '..', '_', '~'],
        locations: [cadl.root, cadl.root.Tree],
        source: cadl.root.Tree,
        dispatch: cadl.dispatch.bind(this),
      })
      const component = TreePage?.components?.[1]
      expect(component).to.be.an('object').to.have.property('type', 'button')
      expect(component).to.have.property('onClick').to.be.an('array')
    })

    xit(`should populate the text value ".Abc.labelText"`, () => {
      const component = TreePage?.components?.[2]
      expect(component).to.have.property('text', 'goBack')
    })

    xit(`should populate Tree.labelText`, () => {
      expect(TreePage.labelText).to.eq('goBack')
    })

    xit(`should populate Tree.items.0.tag`, () => {
      expect(TreePage.items[0].tag).to.eq('goBack')
    })

    it(`should populate Tree.tempProfile.gender`, () => {
      expect(TreePage.tempProfile.gender).to.eq('backWhiteArrow.png')
    })

    it(`should populate Tree.shop.location`, () => {
      expect(TreePage.shop.location).to.eq('beach')
    })

    it(`should populate Tree.shop.tempLocation`, () => {
      expect(TreePage.shop.location).to.eq('beach')
    })

    xit(`should populate Tree.shop.traverseMe.children[0].children[0].children[0].text`, () => {
      expect(
        TreePage.shop.traverseMe.children[0].children[0].children[0].text,
      ).to.eq('beach')
    })
  })

  xdescribe(`replaceEvalObject`, () => {
    xit(`should replace the object prop with a function and can be sequentially awaited in async`, async () => {
      const cadl = getCADL(configUrl)
      const evalObject = await replaceEvalObject({
        pageName: 'Abc',
        cadlObject: {
          actionType: 'evalObject',
          object: {
            '=.builtIn.string.equal': {
              dataIn: { string1: '', string2: 'hello' },
              dataOut: '',
            },
          },
        },
        dispatch: cadl.dispatch.bind(cadl),
      })
    })
  })

  xdescribe(`replaceVars`, () => {
    let varStuff

    beforeEach(() => {
      varStuff = { pageName: 'MyPageName' }
      cadl.root.Egg = {
        varStuff,
        formData: {
          emit: {
            actions: [
              '$var1.pageName',
              { '$var1.pageName': ['$var1.pageName'] },
            ],
            dataKey: { var1: varStuff },
          },
          if: [
            f.builtIn.string.equal('$var1.pageName', 'MyPageName'),
            true,
            false,
          ],
        },
      }
    })

    it(`should populate var placeholders`, () => {
      const cadl = getCADL(configUrl)
      const vars = { var1: varStuff }
      const source = cadl.root.Egg.formData
      expect(replaceVars({ vars, source }))
        .to.have.property('emit')
        .to.have.property('actions')
        .to.be.an('array')
      const { actions } = source.emit
      expect(actions[0]).to.be.a('string').eq('MyPageName')
      expect(actions[1]).to.be.an('object')
      // NOTE: Change this to have key "MyPageName" once replacing key vars is supported
      expect(actions[1]['$var1.pageName'][0]).to.eq('MyPageName')
    })

    it(`should not skip "if" objects`, () => {
      const cadl = getCADL(configUrl)
      const vars = { var1: varStuff }
      const source = cadl.root.Egg.formData
      expect(replaceVars({ vars, source }))
        .to.have.property('if')
        .to.be.an('array')
      const ifObject = cadl.root.Egg.formData.if
      expect(ifObject[0]['=.builtIn.string.equal'])
        .to.have.property('string1')
        .eq('MyPageName')
    })

    xit(`should replace vars for keys`, () => {
      //
    })
  })

  describe(`emit`, () => {
    describe(c.emitType.ADD_BUILTIN_FNS, () => {
      it(`should add builtIn functions to the root builtIn object`, async () => {
        const cadl = getCADL(configUrl)
        const gotoSpy = sinon.spy()
        const exportPdfSpy = sinon.spy()
        const checkFieldSpy = sinon.spy()
        cadl.emit({
          type: c.emitType.ADD_BUILTIN_FNS,
          payload: {
            builtInFns: {
              checkField: checkFieldSpy,
              goto: gotoSpy,
              EcosObj: { exportPdf: exportPdfSpy },
            },
          },
        })

        expect(cadl.root.builtIn).to.have.property('checkField', checkFieldSpy)
        expect(cadl.root.builtIn).to.have.property('goto', gotoSpy)
        expect(cadl.root.builtIn).to.have.property('checkField', checkFieldSpy)
        expect(cadl.root.builtIn)
          .to.have.property('EcosObj')
          .to.have.property('exportPdf', exportPdfSpy)
      })
    })

    describe(c.emitType.DELETE_PAGE, () => {
      it(`should delete the page object`, async () => {
        appNocker.setPage('Abc', 'fix:Abc_en.yml')
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        await cadl.initPage('Abc')
        expect(cadl.root).to.have.property('Abc')
        cadl.emit({
          type: c.emitType.DELETE_PAGE,
          payload: { pageName: 'Abc' },
        })
        expect(cadl.root).not.to.have.property('Abc')
      })
    })

    describe(c.emitType.EDIT_DRAFT, () => {
      it(`should receive an immer draft as args`, () => {
        appNocker.setPage('Abc', 'fix:Abc_en.yml')
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        return cadl
          .initPage('Abc')
          .then(() => {
            let isDraftArg = false
            const spy = sinon.spy((draft) => void (isDraftArg = isDraft(draft)))
            cadl.emit({
              type: c.emitType.EDIT_DRAFT,
              payload: { callback: spy },
            })
            return expect(isDraftArg).to.be.true
          })
          .catch((error) => {
            if (error instanceof Error) throw error
            throw new Error(String(error))
          })
      })
    })

    describe(c.emitType.SET_VALUE, () => {
      describe(`when setting objects`, () => {
        describe(`when the object contains doc(s)`, () => {
          let doc = ecosObjectsFixtures.docs[0]
          let prevDoc = { ...doc }
          let obj: any
          let Abc: any
          let dataKey = 'Abc.docs.0'
          let cadl: CADL

          beforeEach(() => {
            cadl = getCADL(configUrl)
            obj = { id: 123, doc: prevDoc }
            Abc = { docs: [obj] }
            cadl.root.Abc = Abc
          })

          it(`should set the doc and keep its reference to the surrounding object when payload.replace === true`, () => {
            expect(cadl.root.Abc.docs[0]).to.eq(Abc.docs[0])
            expect(cadl.root.Abc.docs[0].doc).to.eq(prevDoc)
            cadl.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey, value: { ...obj, doc }, replace: true },
            })
            expect(cadl.root.Abc.docs[0].doc).to.not.eq(prevDoc)
            expect(cadl.root.Abc.docs[0].doc).to.eq(doc)
          })

          it(`should set the doc and NOT keep its reference to the surrounding object when payload.replace !== true`, () => {
            expect(cadl.root.Abc.docs[0]).to.eq(Abc.docs[0])
            expect(cadl.root.Abc.docs[0].doc).to.eq(prevDoc)
            cadl.emit({
              type: c.emitType.SET_VALUE,
              payload: { dataKey, value: { ...obj, doc } },
            })
            expect(cadl.root.Abc.docs[0].doc).to.eq(prevDoc)
            expect(cadl.root.Abc.docs[0].doc).not.to.eq(doc)
          })

          it(
            `should change its data type (a single doc) to an array of docs if incoming ` +
              `value is an array of docs`,
            () => {
              expect(cadl.root.Abc.docs[0].doc).not.to.be.an('array')
              cadl.emit({
                type: c.emitType.SET_VALUE,
                payload: { dataKey, value: { ...obj, doc: [doc] } },
              })
              expect(cadl.root.Abc.docs[0].doc).to.be.an('array')
              expect(cadl.root.Abc.docs[0].doc[0]).to.eq(doc)
            },
          )
        })
      })

      describe(`when setting arrays`, () => {
        xit(`should not change its reference after setting`, () => {
          const cadl = getCADL(configUrl)
          cadl.emit({
            type: c.emitType.SET_VALUE,
            payload: { dataKey: '', value: '', pageName: '' },
          })
        })
      })

      xit(`should directly set the value at path from root if no page name is given`, () => {
        //
      })

      xit(`should set the value at path from local root if page name is given`, () => {
        //
      })
    })
  })

  xit(`should concatenate and merge var references`, async () => {
    appNocker.setPreload('BaseMessage', 'fix:BaseDataModel_en.yml')
    appNocker.nock(baseUrl)

    const cadl = getCADL(configUrl)
    await cadl.init()
    const { globalRegister } = cadl.root.Global
    const onNotificationClickedRegisterComponent = globalRegister![0]
    await cadl.handleEvalFunction({
      command: onNotificationClickedRegisterComponent.emit!.actions[0],
      key: u.keys(
        onNotificationClickedRegisterComponent.emit!.actions[0],
      )[0] as string,
      pageName: 'Global',
    })
    const expectedResult = `=.NotificationMap.$var.name.notification.onClickLandingPage`
  })

  xdescribe(`components`, () => {
    xit(`should skip parsing styles on components if passed into "skip"`, () => {
      //
    })
  })

  describe(`memoization`, () => {
    describe(`getPage`, () => {
      it(`should not call getPage again when getting the same page`, async () => {
        appNocker.setPage('Abc', 'fix:Abc_en.yml')
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        await cadl.init()
        const spy = sinon.spy(cadl, 'getPage')
        await cadl.initPage('Abc')
        await cadl.initPage('Abc', [], { reload: true })
        await cadl.initPage('Abc', [], { reload: false })
        await cadl.initPage('Abc')
        expect(spy).to.be.calledOnce
        spy.restore()
      })
    })

    const test1 = (cadlObject) => {
      console.time('Test1')
      createFuncAttacher({ cadlObject, dispatch: cadl.dispatch.bind(cadl) })
      console.timeEnd('Test1')
    }

    const test2 = (cadlObject) => {
      console.time('Test2')
      createFuncAttacher2({ cadlObject, dispatch: cadl.dispatch.bind(cadl) })
      console.timeEnd('Test2')
    }

    const traverse = async (obj, cb, path = []) => {
      if (u.isObj(obj)) {
        for (const [key, value] of u.entries(obj)) {
          cb(key, value, obj)
          await traverse(value, cb, path.concat(key))
        }
      } else if (u.isArr(obj)) {
        const numChildren = obj.length
        for (let index = 0; index < numChildren; index++) {
          const o = obj[index]
          await traverse(o, cb, path.concat(index))
        }
      }
    }
    const deat = { rnb64ID: 'vP4mkyGpT3GTl6mgWKDuyQ==', oldpwdsig: null }
    const phoneNumber = '8882465555'
    const countryCode = '+1'
    const password = '142251'
    const esk =
      'C7XdU2pe8bEVEY8zsvkU3IePLVQlDKK56sgmSqumO29QzNbtpGid8Es4PJHFbkllxCpNExffm+c3msn8Ab+xMeATgT0ohtD1'
    const id = 'R497epiwTUcRDlxYldlYQw=='
    // name: {userName: 'NoName', firstName: 'John', lastName: 'Smith', fullName: 'John Smith', pkSign: undefined, …}
    const pk = '9PFeLcwys0vBalKYf0HluOpQ7BrmGx9bNiDbJpO3FWc='
    const sk = 'C6T3rc9hMVcgEGGNoL3dofTIjD2JmJp/ayS4QKrrnRQ='
    const uid = '+1 8882465555'
    const user_vid = 'R497epiwTUcRDlxYldlYQw=='

    describe(`processPopulate`, () => {
      it(`should not transform evalObject action objects if wrapEvalObjects is false`, async () => {
        appNocker.setPage('Topo', {
          Topo: {
            init: [],
            components: [
              m.button({
                text: 'Click me',
                onClick: [
                  m.evalObject({
                    object: {
                      '=.builtIn.string.equal': {
                        dataIn: { string1: 'hello', string2: 'bye' },
                        dataOut: 'Topo.formData.eq',
                      },
                    },
                  }),
                ],
              }),
            ],
          },
        })
        appNocker.nock(baseUrl)
        const cadl = getCADL(configUrl)
        await cadl.initPage('Topo', [], { wrapEvalObjects: false })
        const component = cadl.root.Topo.components?.[0]
        expect(component.onClick?.[0])
          .to.have.property('object')
          .not.to.be.a('function')
      })

      xit(`should not call getPage again when getting the same page`, async () => {
        console.clear()
        const SignInYml = await fs.readFile(
          getAbsFilePath('src/__tests__/fixtures/SignIn.yml'),
          'utf8',
        )
        const pageObject = y.parse(SignInYml).SignIn

        const getPageObject = () =>
          cloneDeep({
            ...pageObject,
            abc: {
              ...pageObject,
              ...{ asd: { abc: { ...{ asd: pageObject } } } },
            },
            abc2: {
              ...pageObject,
              ...{
                asd: {
                  abc: {
                    ...{ asd3: { abc: { ...{ asd: pageObject } } } },
                    ...{ asd: pageObject },
                  },
                },
              },
            },
            abc3: {
              ...pageObject,
              ...{
                asd: {
                  asd: {
                    abc: {
                      ...{ asd3: { abc: { ...{ asd: pageObject } } } },
                      ...{ asd: pageObject },
                    },
                  },
                  abc: { ...{ asd: pageObject } },
                },
              },
            },
          })

        // console.log(await cadl.initPage('SignIn'))

        test1(getPageObject())
        test1(getPageObject())
        test1(getPageObject())
        test1(getPageObject())
        test1(getPageObject())
        u.newline()
        test2(getPageObject())
        test2(getPageObject())
        test2(getPageObject())
        test2(getPageObject())
        test2(getPageObject())
      })
    })
  })

  it(`should run emit objects without dataKey with expected behavior`, async () => {
    const imageComponent1 = m.image({
      viewTag: 'select',
      onClick: [
        m.emit({
          actions: [
            m.ifObject([
              topoEvalRef('formData.target'),
              { [ref.override('.Topo.formData.target')]: false },
              { [ref.override('.Topo.formData.target')]: true },
            ]),
          ],
        }),
        { actionType: 'builtIn', funcName: 'redraw', viewTag: 'select' },
      ],
      path: m.emit({
        actions: [
          m.ifObject([
            topoEvalRef('formData.target'),
            'selectOn.svg',
            'selectOff.svg',
          ]),
        ],
      }),
    })

    const imageComponent2 = m.image({
      viewTag: 'select',
      onClick: [
        m.emit({
          actions: [
            m.ifObject([
              topoEvalRef('formData.tar'),
              { [ref.override('.Topo.formData.tar')]: false },
              { [ref.override('.Topo.formData.tar')]: true },
            ]),
          ],
        }),
        { actionType: 'builtIn', funcName: 'redraw', viewTag: 'select' },
      ],
      path: m.emit({
        actions: [
          m.ifObject([
            topoEvalRef('formData.tar'),
            'selectOnBlue.svg',
            'selectOffBlue.svg',
          ]),
        ],
      }),
    })
    const component = m.view({
      style: { height: '0.12' },
      children: [imageComponent1, imageComponent2],
    })

    appNocker.setPage('Topo', {
      Topo: { components: [component, m.divider()] },
    })
    appNocker.nock(baseUrl)

    delete imageComponent1.onClick?.[0].emit.dataKey
    delete (imageComponent1.path as any)!.emit!.dataKey
    delete imageComponent2.onClick![0].emit.dataKey
    delete (imageComponent2.path as any)!.emit.dataKey

    const imageComponent1Path = imageComponent1.path as any
    const imageComponent2Path = imageComponent2.path as any

    const cadl = getCADL(configUrl)
    await cadl.initPage('Topo')

    expect(cadl.root.Topo).not.to.have.property('formData')
    await cadl.emitCall(imageComponent1.onClick![0].emit)
    expect(cadl.root.Topo)
      .to.have.property('formData')
      .to.have.property('target').to.be.true
    expect((await cadl.emitCall(imageComponent1Path.emit))[0]).to.eq(
      'selectOn.svg',
    )
    await cadl.emitCall(imageComponent1.onClick![0].emit)
    expect(cadl.root.Topo.formData.target).to.be.false
    await cadl.emitCall(imageComponent1.onClick![0].emit)
    expect(cadl.root.Topo.formData.target).to.be.true
    expect((await cadl.emitCall(imageComponent1Path.emit))[0]).to.eq(
      'selectOn.svg',
    )
    expect((await cadl.emitCall(imageComponent1Path.emit))[0]).to.eq(
      'selectOn.svg',
    )
    await cadl.emitCall(imageComponent2.onClick![0].emit)
    expect(cadl.root.Topo).to.have.property('formData').to.have.property('tar')
      .to.be.true
    expect((await cadl.emitCall(imageComponent2Path.emit))[0]).to.eq(
      'selectOnBlue.svg',
    )
    expect((await cadl.emitCall(imageComponent2Path.emit))[0]).to.eq(
      'selectOnBlue.svg',
    )
    await cadl.emitCall(imageComponent2.onClick![0].emit)
    expect((await cadl.emitCall(imageComponent2Path.emit))[0]).to.eq(
      'selectOffBlue.svg',
    )
  })
})

// xdescribe('handleEvalCommands', () => {

//   describe('should handle assignment commands', () => {
//     it('with provided value', () => {
//       return cadl['handleEvalCommands']({
//         commands: { '.TestPage.testObj.red@': 4 },
//         pageName: 'TestPage',
//         key: '.TestPage.testObj.red@',
//       }).then(() => {
//         expect(cadl.root.TestPage.testObj.red).toEqual(4)
//       })
//     })
//   })
//   describe('should handle if commands', () => {
//     it('should handle if commands with assignment expressions if true', () => {
//       return cadl['handleEvalCommands']({
//         commands: {
//           if: [
//             '.TestPage.testObj.red',
//             { '.TestPage.testObj.red@': 10 },
//             false,
//           ],
//         },
//         pageName: 'TestPage',
//         key: 'if',
//       }).then(() => {
//         expect(cadl.root.TestPage.testObj.red).toEqual(10)
//       })
//     })
//     it('should handle if commands with assignment expressions if false', () => {
//       return cadl['handleEvalCommands']({
//         commands: {
//           if: [
//             '.TestPage.testObj.purple',
//             false,
//             { '.TestPage.testObj.red@': 11 },
//           ],
//         },
//         pageName: 'TestPage',
//         key: 'if',
//       }).then(() => {
//         expect(cadl.root.TestPage.testObj.red).toEqual(11)
//       })
//     })
//   })
//   describe('should handle function evaluations', () => {
//     it('should handle evaluation of builtIn function', () => {
//       return cadl['handleEvalCommands']({
//         commands: {
//           '=.builtIn.string.equal': {
//             dataIn: {
//               string1: 'male',
//               string2: 'female',
//             },
//           },
//         },
//         pageName: 'TestPage',
//         key: '=.builtIn.string.equal',
//       }).then((res) => {
//         expect(res).toEqual(false)
//       })
//     })
//     it('should handle evaluation of ecos api function objects', () => {
//       return cadl['handleEvalCommands']({
//         commands: {
//           '=.TestPage.edge.get': '',
//         },
//         pageName: 'TestPage',
//         key: '=.TestPage.edge.get',
//       }).then(() => {
//         expect(edgeServices.get.mock.calls.length).toBe(1)
//       })
//     })
//   })
// })
