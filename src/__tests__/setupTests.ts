import 'mock-local-storage'
import { JSDOM } from 'jsdom'
const { window } = new JSDOM('', {
  // Used to bypass cors in tests
  url: 'http://127.0.0.1:3000/',
  // pretendToBeVisual: true,
  resources: 'usable',
  runScripts: 'dangerously',
  beforeParse(win) {
    global.window = win as any
    global.addEventListener = win.addEventListener
    global.removeEventListener = win.removeEventListener
  },
})

// import axios from 'axios'
import chai from 'chai'
import cache from '../cache'
import nock from 'nock'
import sinonChai from 'sinon-chai'
import * as u from '@jsmanifest/utils'

chai.use(sinonChai)

// Bypasses the cross origin error
// axios.defaults.adapter = require('axios/lib/adapters/http')
global.XMLHttpRequest = require('xhr2')

before(() => {
  process.stdout.write('\x1Bc')
  nock.emitter.on('no match', (req) => {
    console.error(`[${u.red('no match for request')}]`, {
      method: req.method,
      protocol: req.protocol,
      host: req.host,
      hostname: req.hostname,
      port: req.port,
      path: req.path,
      pathname: req.pathname,
    })
  })
})

afterEach(() => {
  nock.cleanAll()
  window.document.head.innerHTML = ''
  window.document.body.innerHTML = ''
  Object.keys(cache.pages).forEach((key) => delete cache.pages[key])
  Object.keys(cache.refs).forEach((key) => delete cache.refs[key])
})

after(() => {
  nock.emitter.removeAllListeners()
  const memUsage = process.memoryUsage()
  const heapTotal = `${(memUsage.heapTotal / 1e6).toFixed(2)} MB`
  const heapUsed = `${(memUsage.heapUsed / 1e6).toFixed(2)} MB`
  console.log(`Heap used: ${u.magenta(heapUsed)}`)
  console.log(`Heap total: ${u.magenta(heapTotal)}`)
})
