import store from '../../../../common/store'
import * as u from '@jsmanifest/utils'
import { isObject } from '../../../../utils'
import log from '../../../../utils/log'

export default (
  db
): {
  getDocById: (did: string) => any
  getDocByIds
  insertDoc
  deleteDocById
  getDocsByPageId
  getLastestDocsByType
  getAllDocsByType
} => {
  return { getDocById, getDocByIds, insertDoc, deleteDocById, getDocsByPageId,getLastestDocsByType,getAllDocsByType }
  function getDocById(did,sCondition=undefined) {
    let sqlstr = `SELECT * FROM ecos_doc_table WHERE id = :did ${sCondition? 'AND '+ sCondition: ''} LIMIT 1`
    let params = { ':did': did }
    let res = db.exec(sqlstr, params)
    return res
  }
  function getDocByIds(dids) {
    let sqlstr = 'SELECT * FROM ecos_doc_table WHERE id IN('
    let params = {}
    dids.forEach((did, index) => {
      const key = `:did${index}`
      sqlstr += key + (index === dids.length - 1 ? ')' : ',')
      params[key] = did
    })
    let res = db.exec(sqlstr, params)
    return res
  }

  //Todo: save by id and object
  function insertDoc(doc) {
    let sqlstr =
      'INSERT INTO ecos_doc_table VALUES (:ctime, :mtime, :atime, :atimes, :id, :name, :deat, :size, :fid, :eid, :bsig, :esig, :subtype, :type, :tage);'
    let params = {}
    //yuhan
		log.debug('insertdoc!!', doc)
    for (let [key, val] of Object.entries(doc)) {
      if (val instanceof Uint8Array) {
        params[`:${key}`] = store.level2SDK.utilServices.uint8ArrayToBase64(val)
      } else if (isObject(val)) {
        params[`:${key}`] = JSON.stringify(val)
      } else {
        params[`:${key}`] = val
      }
    }

    let res = db.exec(sqlstr, params)
    return res
  }

  function deleteDocById(did) {
    let sqlstr = `DELETE FROM ecos_doc_table WHERE id = :did`
    let params = {
      [':did']: did,
    }
    let res = db.exec(sqlstr, params)
    return res
  }

  function getDocsByPageId(pageId) {
    let sqlstr = `SELECT * FROM ecos_doc_table WHERE pageId = ${pageId}`
    let res = db.exec(sqlstr)
    return res
  }


  function getLastestDocsByType(type){
    let sqlstr = `SELECT id FROM ecos_doc_table WHERE type = ${type} LIMIT 1 `
    let res = db.exec(sqlstr)
    // res = convertSqlToObject(res)
    return res
  }

  function getAllDocsByType(type){
    let sqlstr = `SELECT * FROM ecos_doc_table WHERE type = ${type}`
    let res = db.exec(sqlstr)
    res = convertSqlToObject(res)
    return res
  }

  function convertSqlToObject(doc){
    let returnDocs: any[] = []
    if (doc.length) {
      // const obj: any = {}
      const { columns, values } = doc[0]
      for(const value of values){
        const obj = {}
        for(let i =0;i<value.length;i++){
          obj[columns[i]] = value[i]
        }
        returnDocs.push(obj)
      }
      return returnDocs    
    }
    return
    
  }
}
