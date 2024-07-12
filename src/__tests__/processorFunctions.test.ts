import { expect } from 'chai'
import y from 'yaml'
import m from 'noodl-test-utils'
import * as u from '@jsmanifest/utils'
import * as nt from 'noodl-types'
import nock from 'nock'
import sinon from 'sinon'
import fs from 'fs-extra'
import path from 'path'
import type CADL from '../CADL'
import * as tu from './helpers'
import {
  populateArray,
  populateKeys,
  populateObject,
  populateString,
  populateVals,
  replaceEvalObject,
  replaceVars,
} from '../CADL/utils'
import { createFuncAttacher } from '../CADL/commonUtils'
import stringBuiltInFns from '../CADL/services/string'
import * as c from '../constants'

let appNocker: tu.NockAppBuilder
let baseUrl = ''
let cadlVersion = ''
let cadlBaseUrl = ''
let configKey = ''
let configUrl = ''
let host = 'd2bbkxkl9sogfu.cloudfront.net'

xdescribe(`processor functions`, () => {
  let apiHost = 'ecosapiprod.aitmed.io'
  let apiPort = '443'

  beforeEach(async () => {
    configKey = 'admin'
    cadlBaseUrl = `https://${host}/cadl/www\${cadlVersion}/`
    cadlVersion = '14.44.5'
    configUrl = `https://public.aitmed.com/config/${configKey}.yml`
    baseUrl = `https://${host}/cadl/www${cadlVersion}/`

    appNocker = tu
      .createAppNocker()
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

  describe(`handleActionCommand`, () => {
    describe(`builtIn`, () => {
      xit(`should try to call getConsumerOptions on the root object and include the result as args to the underlying fn call`, async () => {
        //
      })
    })

    xit(`should handle saveObject and updateObject the same`, async () => {
      //
    })

    for (const actionType of ['popUp', 'popUpDismiss']) {
      describe(actionType, () => {
        xit(`[${actionType}] should try to call root.builtIn.${actionType}`, () => {
          //
        })
      })
    }
  })

  describe(`handleIfCommand`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleSwitchCommand`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalString`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalObject`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalFunction`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalCommands`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalArray`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleAsyncEvalArray`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleAsyncGlobalEvalArray`, () => {
    xit(``, async () => {
      //
    })
  })

  describe(`handleEvalAssignmentExpressions`, () => {
    xit(``, async () => {
      //
    })
  })
})
