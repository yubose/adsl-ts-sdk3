import * as u from '@jsmanifest/utils'
import IndexJson from './IndexJson'
import log from '../../../utils/log'
export default class PItoS3Helper{
    private indexTablesDao
    constructor(indexTablesDao) {
        this.indexTablesDao = indexTablesDao
    }
    public DBStoJSON() {
        const objectArray = new Array()
        const res = this.indexTablesDao?.getAllDocId()
        if(res && res?.length){
            const {columns,values} = res[0]
            for(const value of values){
                const docId = value[0]
                const kTextRes = this.indexTablesDao.getAllkTextByDid(docId)
                const docTypeRes = this.indexTablesDao.getTypeById(docId)
                // const mTimeRes = this.indexTablesDao.getmTimeById(docId)
                const kText:any[] = u.reduce(
                    kTextRes[0]['values'],
                    (acc,it)=>(acc.concat(it)),
                    [] as any[],
                )
                const docType = docTypeRes[0]['values'][0][0]
                // const mTime = mTimeRes[0]['values'][0][0]
                objectArray.push({
                    docType: docType,
                    id: docId,
                    kText: kText,
                })
            }
            const jsonArray = JSON.stringify(objectArray)
            return jsonArray
        }
        return 
    }

    public converS3ToDBS(arr){
        try{
            if(u.isArr(arr)){
                for(let i = 0; i < arr.length; i++){
                    let personalIndex = arr[i]
                    const indexJson = new IndexJson(personalIndex['id'],personalIndex['kText'],personalIndex['docType'])
                    const piList:any[] = indexJson.convertIdxToDoc()
                    for(const pi of piList){
                        this.indexTablesDao.insertAll(pi)
                    } 
                }
                return true
            }

        } catch (error) {
            log.error(error)
        }
        return false

    }

}