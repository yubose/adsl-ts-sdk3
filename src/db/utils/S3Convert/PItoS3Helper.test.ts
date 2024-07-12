// @ts-nocheck
import { expect } from "chai"
import FrontEndDB from "../../FrontEndDB"
import PItoS3Helper from "./PItoS3Helper"

describe('PItoS3Helper', () => {
    let doc = [
        {"docType":102401,"id":"XYE3UwAAAABLgAJCrBIABQ==","kText":["applicationjson","2","Drive","License","jnyi020822","yi","Joseph","1","8881230922"],"mTime":1645036602},
        {"docType":102401,"id":"XYE3UwAAAABBwAJCrBIABQ==","kText":["applicationjson","2","yi","Joseph","1","8881230922","asap020922","Drive","License"],"mTime":1645036602},
        {"docType":102401,"id":"XXxrpgAAAABFxAJCrBIABQ==","kText":["applicationjson","2","jnyi020822","02112006","brother","yi","Joseph","Drive","License","1"],"mTime":1645036602},
    ]
    let frontEndDb: FrontEndDB
    let indexTablesDao
    let pItoS3Helper:pItoS3Helper
    beforeEach(async () => {
        const config = {
            locateFile: (filename) => {
                // return `https://cdn.jsdelivr.net/npm/sql.js@1.6.2/dist/sql-wasm.wasm`
                return './src/db/utils/S3Convert/sql-wasm.wasm'
            },
        }
        frontEndDb = new FrontEndDB()
        await frontEndDb.getDatabase(config)
        indexTablesDao = frontEndDb.IndexTablesDao
        pItoS3Helper = new PItoS3Helper(indexTablesDao)
        // this.PersonalIndexCtr = new PersonalIndexCtr(this.indexTablesDao)
        
    })
    describe('PItoS3Helper', () => {
        it('should successfully convert s3Doc to DB', () => {
            const res = pItoS3Helper.converS3ToDBS(doc)
            expect(res).to.be.ok
        })

        it('should successfully convert DB to s3Doc', () => {
            pItoS3Helper.converS3ToDBS(doc)
            const res2 = pItoS3Helper.DBStoJSON()
            expect(res2).not.to.be.empty
        })
    })


})