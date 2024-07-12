// @ts-nocheck
import FrontEndDB from '../../'
import FuzzyIndexCreator from '../../../utils/FuzzyIndexCreator'
describe('IndexTableDao', () => {
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
    docId: 'olol',
    docType: 'fdsf',
    score: 9,
  }
  let ind2 = {
    id: 2,
    fkey,
    ins_hex: fuzzyInd,
    fuzzyKey: initMapping,
    initMapping: initMapping,
    kText: 'hello',
    docId: 'olol',
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

  describe('getCount', () => {
    it('should get the count of the items in the index_tables', () => {
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(0)
    })
  })

  describe('insertAll', () => {
    it('should successfully insert an index entry into the index_tables', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res2 = frontEndDb.IndexTablesDao.getCount()
      expect(res2).toEqual(1)
    })
  })

  describe('getPIByDocId', () => {
    it('should get the index entry using the docId', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getPIByDocId('olol')
      expect(res[0].values[0][5]).toEqual('olol')
    })
  })
  describe('deleteIndexByDocId', () => {
    it('should delete the index entry using the docId', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(1)
      frontEndDb.IndexTablesDao.deleteIndexByDocId('olol')
      const res2 = frontEndDb.IndexTablesDao.getCount()
      expect(res2).toEqual(0)
    })
  })
  describe('getAllDocId', () => {
    it('should get all docIds of the index entries', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(1)
      const res2 = frontEndDb.IndexTablesDao.getAllDocId()
      expect(res2[0].values[0][0]).toEqual('olol')
    })
  })

  describe('getAllkTextByDid', () => {
    it('should get all kTexts of the index entries', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(1)
      const res2 = frontEndDb.IndexTablesDao.getAllkTextByDid(ind1.docId)
      expect(res2[0].values[0][0]).toEqual('lloo')
    })
  })
  describe('getAllScoreByDid', () => {
    it('should get all scores of the index entries', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(1)
      const res2 = frontEndDb.IndexTablesDao.getAllScoreByDid(ind1.docId)
      expect(res2[0].values[0][0]).toEqual(9)
    })
  })
  describe('getTypeById', () => {
    it('should get the docType of the doc with given id', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(1)
      const res2 = frontEndDb.IndexTablesDao.getTypeById(ind1.docId)
      expect(res2[0].values[0][0]).toEqual('fdsf')
    })
  })

  describe('extendAndFuzzySearch', () => {
    it('should get the docType of the doc with given id', () => {
      frontEndDb.IndexTablesDao.insertAll(ind1)
      frontEndDb.IndexTablesDao.insertAll(ind2)
      frontEndDb.IndexTablesDao.insertAll(ind3)
      const res = frontEndDb.IndexTablesDao.getCount()
      expect(res).toEqual(3)
      const input = 'hello'
      const fuzzyCreator = new FuzzyIndexCreator()
      const initMapping = fuzzyCreator.initialMapping(input)
      const fuzzyInd = fuzzyCreator.toFuzzyHex(initMapping)

      const input2 = 'walrus'
      const initMapping2 = fuzzyCreator.initialMapping(input2)
      const fuzzyInd2 = fuzzyCreator.toFuzzyHex(initMapping2)
      const res2 = frontEndDb.IndexTablesDao.extendAndFuzzySearch({
        kInput: 'walrus',
        ins_hex: fuzzyInd2,
      })
      // const res2 = frontEndDb.IndexTablesDao.extendAndFuzzySearch({
      //   kInput: 'hello',
      //   ins_hex: fuzzyInd,
      // })
      expect(res2).toEqual(1)
    })
  })
})
