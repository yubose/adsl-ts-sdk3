// @ts-nocheck
import FrontEndDB from './FrontEndDB'

describe('FrontEndDB tests', () => {
  describe('Testing initialization of db and tables', () => {
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
    it('should initialize db', async () => {
      expect(db).toBeTruthy()
    })
    it('should create the ecos_doc_table', () => {
      let sqlstr = 'SELECT * FROM ecos_doc_table'
      const result = db.run(sqlstr)
      expect(result).toBeTruthy()
    })
    it('should create the index_tables', () => {
      let sqlstr = 'SELECT * FROM index_tables'
      const result = db.run(sqlstr)
      expect(result).toBeTruthy()
    })
    it('should assign the docTableDao', () => {
      const result = frontEndDb.DocTableDao
      expect(result).toBeTruthy()
    })
    it('should assign the indexTablesDao', () => {
      const result = frontEndDb.IndexTablesDao
      expect(result).toBeTruthy()
    })
    it('should return true if initialized', () => {
      const isInitialized = frontEndDb.initialized
      expect(isInitialized).toEqual(true)
    })
  })
})
