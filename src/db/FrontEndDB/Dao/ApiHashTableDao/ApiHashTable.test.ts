// @ts-nocheck
import FrontEndDB from '../../'
import store from '../../../../common/store'
import sha256 from 'crypto-js/sha256'

describe('ApiHasTable', () => {
  let doc = {
    atime: 1619137372,
    atimes: 1,
    bsig: new Uint8Array([
      236, 47, 28, 214, 219, 91, 67, 56, 51, 118, 176, 50, 203, 232, 217, 107,
    ]),
    ctime: 1619137372,
    deat: null,
    eid: new Uint8Array([
      5, 73, 170, 68, 94, 86, 79, 173, 156, 152, 124, 184, 106, 113, 66, 89,
    ]),
    esig: new Uint8Array([
      116, 223, 65, 231, 201, 253, 75, 37, 167, 16, 34, 102, 157, 213, 210, 48,
    ]),
    fid: '',
    id: store.level2SDK.utilServices.uint8ArrayToBase64(
      new Uint8Array([
        29, 164, 186, 209, 158, 40, 65, 115, 81, 170, 1, 201, 161, 10, 219, 16,
      ]),
    ),
    mtime: 1619137372,
    name: {
      data: 'dW5kZWZpbmVk',
      tags: [],
      targetRoomName: 'ewewe',
      title: 'fwf',
      type: 'application/json',
      user: 'fred wesd',
    },
    size: 9,
    subtype: 134217761,
    tage: 0,
    type: 1025,
  }

  let doc2 = {
    atime: 1619132498,
    atimes: 1,
    bsig: new Uint8Array([
      236, 47, 28, 214, 219, 91, 67, 56, 51, 118, 176, 50, 203, 232, 217, 107,
    ]),
    created_at: 1619132498000,
    ctime: 1619132498,
    deat: null,
    eid: new Uint8Array([
      116, 223, 65, 231, 201, 253, 75, 37, 167, 16, 34, 102, 157, 213, 210, 48,
    ]),
    esig: new Uint8Array([
      116, 223, 65, 231, 201, 253, 75, 37, 167, 16, 34, 102, 157, 213, 210, 48,
    ]),
    fid: '',
    id: store.level2SDK.utilServices.uint8ArrayToBase64(
      new Uint8Array([
        137, 233, 149, 162, 86, 51, 79, 174, 70, 117, 236, 109, 213, 32, 243,
        57,
      ]),
    ),
    modified_at: 1619132498000,
    mtime: 1619132498,
    name: {
      data: 'dW5kZWZpbmVk',
      tags: [],
      targetRoomName: 'ewewe',
      title: 'gdgdfg',
      type: 'application/json',
      user: 'fred wesd',
    },
    size: 9,
    subtype: 134217761,
    tage: 0,
    type: 1025,
  }
  let frontEndDb: FrontEndDB
  let db
  beforeEach(async () => {
    var config = {
      locateFile: (filename) => {
        return `./node_modules/sql.js/dist/${filename}`
      },
    }
    frontEndDb = new FrontEndDB()
    db = await frontEndDb.getDatabase(config)
  })
  describe('insert', () => {
    it('should successfully insert a doc into the api_hash_table', () => {
      const apiInputHash = sha256(JSON.stringify(doc)).toString()
      const res = frontEndDb.ApiHashTableDao.insertApiResult(
        apiInputHash,
        doc.id,
      )
      expect(res).toBeTruthy()
    })
  })
  describe('getApiResult', () => {
    it('should successfully retrieve a doc from the api_hash_table by apiInputHash', () => {
      const apiInputHash = sha256(JSON.stringify(doc)).toString()
      frontEndDb.ApiHashTableDao.insertApiResult(apiInputHash, doc.id)
      let res = frontEndDb.ApiHashTableDao.getApiResult(apiInputHash)
      expect(res).toEqual(doc.id)
    })
  })

  describe('deleteApiResult', () => {
    it('should successfully delete doc from the api_hash_table by apiInputHash', () => {
      const apiInputHash = sha256(JSON.stringify(doc)).toString()
      frontEndDb.ApiHashTableDao.insertApiResult(apiInputHash, doc.id)
      frontEndDb.ApiHashTableDao.deleteApiResult(apiInputHash)
      const res = frontEndDb.ApiHashTableDao.getApiResult(apiInputHash)
      expect(res.length).toEqual(0)
    })
  })
})
