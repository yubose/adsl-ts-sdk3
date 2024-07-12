export default (db) => {
  return {
    getApiResult,
    insertApiResult,
    deleteApiResult,
  }
  function getApiResult(apiInputHash) {
    const sqlstr =
      'SELECT resultId FROM api_hash_table WHERE api_input_hash = :api_input_hash'
    const params = {
      ':api_input_hash': apiInputHash,
    }
    let res = db.exec(sqlstr, params)
    if (res.length) {
      res = res[0].values[0]
    }
    return res
  }
  function insertApiResult(apiInputHash, apiResult) {
    const sqlstr =
      'INSERT INTO api_hash_table VALUES (:api_input_hash, :api_result );'
    const params = {
      ':api_input_hash': apiInputHash,
      ':api_result': apiResult,
    }

    const res = db.exec(sqlstr, params)
    return res
  }

  function deleteApiResult(apiInputHash) {
    const sqlstr =
      'DELETE FROM api_hash_table WHERE api_input_hash = :api_input_hash'
    const params = {
      ':api_input_hash': apiInputHash,
    }
    let res = db.exec(sqlstr, params)
    if (res.length) {
      res = res[0].values[0][0]
    }
    return res
  }
}
