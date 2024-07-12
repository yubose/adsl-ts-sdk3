import store from '../../../../common/store'
import * as u from '@jsmanifest/utils'
import { orderBy } from 'lodash'
import wuzzy from 'wuzzy'
export default (db) => {
  return {
    getCount,
    extendAndFuzzySearch,
    getPIByDocId,
    deleteIndexByDocId,
    getAllDocId,
    getAllkTextByDid,
    getAllScoreByDid,
    getmTimeById,
    getTypeById,
    insertAll,
    getPI_mtime,
    getLatestDocId,
    getAllDoc,
    indexTableIsEmpty,
  }
  // Austin's suggestion, can both fuzzy search and extened search at the same time
  //select distinct kText from KeyID where (TO_HEX(fKey) like '%ins_hex%')   <- fuzzy search
  // OR (kText like 'kInput%')  <- extened search
  // order by accessTimes desc ;

  function getCount() {
    let sqlstr = 'SELECT COUNT(*) FROM index_tables'
    const res = db.exec(sqlstr)
    return res[0].values[0][0]
  }

  function insertAll(indexTableEntry) {
    let sqlstr =
      // 'INSERT INTO index_tables VALUES (:id, :fKey , :fuzzyKey, :initMapping , :kText , :docId , :docType , :score, :fKeyHex );'
      'INSERT INTO index_tables VALUES (:fKey , :kText , :docId , :docType , :score);'
    let params = {}
    for (let [key, val] of Object.entries(indexTableEntry)) {
      if (val instanceof Uint8Array) {
        params[`:${key}`] = store.level2SDK.utilServices.uint8ArrayToBase64(val)
      } else {
        params[`:${key}`] = val
      }
    }
    let res = db.exec(sqlstr, params)
    return res
  }

  function extendAndFuzzySearch({
    kInput,
    ins_hex,
    docType,
    docTypeLow,
    docTypeHigh,
  }: {
    kInput: string
    ins_hex: string
    docType: number
    docTypeLow: number
    docTypeHigh: number
  }) {
    let sqlstr =
      'SELECT * FROM index_tables WHERE' +
      //'SELECT' + " docId " + 'FROM index_tables WHERE' +
      " printf('%X', fKey) LIKE '%'|| :ins_hex ||'%'" +
      " OR kText LIKE :kInput || '%'"
    let params = { ':ins_hex': ins_hex, ':kInput': kInput }
    if (docType) {
      sqlstr =
        'SELECT * FROM index_tables WHERE' +
        ' docType = :docType' +
        ' AND (' +
        "printf('%X', fKey) LIKE '%'|| :ins_hex ||'%'" +
        ' OR ' +
        "kText LIKE :kInput || '%'  )"
      params = {
        //@ts-ignore
        ':docType': docType,
        ':ins_hex': ins_hex,
        ':kInput': kInput,
      }
    } else if (docTypeLow && docTypeHigh) {
      sqlstr =
        'SELECT * FROM index_tables WHERE' +
        ' docType BETWEEN :docTypeLow AND :docTypeHigh' +
        ' AND (' +
        "printf('%X', fKey) LIKE '%'|| :ins_hex ||'%'" +
        ' OR ' +
        "kText LIKE :kInput || '%'  )"
      params = {
        //@ts-ignore
        ':docTypeLow': docTypeLow,
        ':docTypeHigh': docTypeHigh,
        ':ins_hex': ins_hex,
        ':kInput': kInput,
      }
    }
    const res = db.exec(sqlstr, params)
    if(res && u.isArr(res) && res?.length){
        const { columns, values } = res[0]
        //ngram
        for(const value of values){
          value[4] = wuzzy.jarowinkler(
            kInput,
            value[1]
          ,1)
        }
        //sort
        const sortValues = orderBy(values,function(arr) { return arr[4]; },'desc')
        let newValues:any[] = []
        for(const sortValue of sortValues ){
          newValues.push([sortValue[2]])
        }
        let newColumns = [columns[2]]
        res[0] = {columns: newColumns,values:newValues}
    }

    
    
    return res
  }

  function getPIByDocId(did) {
    const sqlstr = 'SELECT * FROM index_tables WHERE docId = :did'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }

  function deleteIndexByDocId(did) {
    const sqlstr = 'DELETE FROM index_tables WHERE docId = :did'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }

  /*** for update to S3
   */
  function getAllDocId() {
    const sqlstr = 'SELECT DISTINCT docId FROM index_tables'
    const res = db.exec(sqlstr)
    return res
  }

  function getAllkTextByDid(did) {
    const sqlstr =
      'SELECT kText FROM index_tables WHERE docId = :did ORDER BY score'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }
  function getAllScoreByDid(did) {
    const sqlstr =
      'SELECT score FROM index_tables WHERE docId = :did ORDER By score'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }

  function getTypeById(did) {
    const sqlstr = 'SELECT DISTINCT docType FROM index_tables WHERE docId = :did'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }
  function getmTimeById(did) {
    const sqlstr = 'SELECT DISTINCT mTime FROM index_tables WHERE docId = :did'
    const params = {
      ':did': did,
    }
    const res = db.exec(sqlstr, params)
    return res
  }

  function getPI_mtime() {
    const sqlstr = 'SELECT mTime FROM index_tables ORDER BY mtime desc LIMIT 1'
    const res = db.exec(sqlstr)
    if(res.length){
      const {columns,values} = res[0]
      return values[0][0]
    }
    return 0
  }
  function getLatestDocId() {
    const sqlstr = 'SELECT docId FROM index_tables LIMIT 1'
    const res = db.exec(sqlstr)
    if(res.length){
      const {columns,values} = res[0]
      return values[0][0]
    }
    return 
  }

  function getAllDoc(){
    const sqlstr = 'SELECT * FROM index_tables'
    const res = db.exec(sqlstr)
    return res
  }

  function indexTableIsEmpty(){
    let sqlstr = 'SELECT COUNT(*) FROM index_tables'
    const res = db.exec(sqlstr)
    const count = res[0].values[0][0]
    if(count){
      return false
    }
    return true
  }
}
