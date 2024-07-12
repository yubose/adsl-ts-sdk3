// @ts-nocheck
import IndexRepository from './'
import store from '../../common/store'
import FuzzyIndexCreator from '../utils/FuzzyIndexCreator'

describe('IndexRepository', () => {
  let docId1 = store.level2SDK.utilServices.uint8ArrayToBase64(
    new Uint8Array([
      29, 164, 186, 209, 158, 40, 65, 115, 81, 170, 1, 201, 161, 10, 219, 16,
    ]),
  )
  let docId2 = store.level2SDK.utilServices.uint8ArrayToBase64(
    new Uint8Array([
      137, 233, 149, 162, 86, 51, 79, 174, 70, 117, 236, 109, 213, 32, 243, 57,
    ]),
  )
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
    id: docId1,
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
    id: docId2,
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
  const input = 'hello'
  const fuzzyCreator = new FuzzyIndexCreator()
  const initMapping = fuzzyCreator.initialMapping(input)
  const fuzzyInd = fuzzyCreator.toFuzzyHex(initMapping)
  const fkey = fuzzyCreator.toFuzzyInt64(initMapping)

  const input2 = 'walrus'
  const initMapping2 = fuzzyCreator.initialMapping(input2)
  const fuzzyInd2 = fuzzyCreator.toFuzzyHex(initMapping2)
  const fkey2 = fuzzyCreator.toFuzzyInt64(initMapping2)
  let ind1 = {
    id: 1,
    fkey,
    ins_hex: fuzzyInd,
    fuzzyKey: initMapping,
    initMapping: initMapping,
    kText: 'hello',
    docId: docId1,
    docType: 'fdsf',
    score: 9,
  }
  let ind2 = {
    id: 2,
    fkey,
    ins_hex: fuzzyInd,
    fuzzyKey: initMapping,
    initMapping: initMapping,
    kText: 'walrus',
    docId: docId2,
    docType: 'fdsf',
    score: 9,
  }
  let ind3 = {
    id: 3,
    fkey: fkey2,
    ins_hex: fuzzyInd2,
    fuzzyKey: initMapping2,
    initMapping: initMapping2,
    kText: 'walrus',
    docId: 'olol',
    docType: 'fdsf',
    score: 9,
  }
  let indexRepository
  beforeEach(async () => {
    const config = {
      locateFile: (filename) => {
        return `./node_modules/sql.js/dist/${filename}`
      },
    }
    indexRepository = new IndexRepository()
    await indexRepository.getDataBase(config)
  })

  describe('indexTableIsEmpty', () => {
    it('should return true if index_table is empty', () => {
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(true)
    })
    it('should return false if index_table is not empty', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
    })
  })
  describe('insertIndexData', () => {
    it('should successfully insert index in table', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
    })
  })
  describe('getTypeById', () => {
    it('should return the type of the doc based on the given id', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
      const res1 = indexRepository.getTypeById('olol')
      expect(res1[0].values[0][0]).toEqual('fdsf')
    })
  })
  describe('deleteIndexByDocId', () => {
    it('should delete index from index_table given the docId', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
      indexRepository.deleteIndexByDocId('olol')
      const res1 = indexRepository.indexTableIsEmpty()
      expect(res1).toEqual(true)
    })
  })
  describe('getPIByDocId', () => {
    it('should return PI from index_table given the docId', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
      const res1 = indexRepository.getPIByDocId('olol')

      expect(res1[0].values[0][0][0]).toEqual('1')
    })
  })

  describe('getkTextByDid', () => {
    it('should get kText of the index given the docId', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
      const res1 = indexRepository.getPIByDocId('olol')

      expect(res1[0].values[0][4]).toEqual('lloo')
    })
  })
  describe('getAllDocId', () => {
    it('should get the docId of the docs in the index', () => {
      indexRepository.insertIndexData(ind1)
      const res = indexRepository.indexTableIsEmpty()
      expect(res).toEqual(false)
      const res1 = indexRepository.getPIByDocId('olol')

      expect(res1[0].values[0][0]).toEqual('1')
    })
  })
  describe('cacheDoc', () => {
    it('should successfully insert doc in doc_table', () => {
      indexRepository.cacheDoc(doc)
      const res = indexRepository.getDocById(doc.id)
      expect(res[0]).toBeTruthy()
    })
  })
  describe('deleteCachedDocById', () => {
    it('should successfully delete the doc from the cache', () => {
      indexRepository.cacheDoc(doc)
      const res = indexRepository.getDocById(doc.id)
      expect(res[0]).toBeTruthy()
      indexRepository.deleteCachedDocById(doc.id)
      const res1 = indexRepository.getDocById(doc.id)
      expect(res1[0]).toBeFalsy()
    })
  })
  describe('getDocsByIds', () => {
    it('should return all docs with given ids', () => {
      indexRepository.cacheDoc(doc)
      const res = indexRepository.getDocsByIds([[doc.id]])
      expect(res[0][0]).toBeTruthy()
    })
  })
  describe('search', () => {
    it('should return all docs with given input', () => {
      indexRepository.indexTablesDao.insertAll(ind1)
      indexRepository.indexTablesDao.insertAll(ind2)
      indexRepository.indexTablesDao.insertAll(ind3)
      indexRepository.cacheDoc(doc)
      indexRepository.cacheDoc(doc2)
      const res = indexRepository.search('walrus')
      expect(res[0].id).toEqual('iemVolYzT65Gdext1SDzOQ==')
    })
  })
})
