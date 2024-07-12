import sha256 from 'crypto-js/sha256'

export default class ObjectCacheCtr {
  public retrieveDocFromCache(indexRepository, dataInStr: string) {
    let retrieveResult: Record<string, any>[] = []

    let api_input_sha = sha256(dataInStr).toString()
    let api_Result = indexRepository.ApiHashTableDao.getApiResult(api_input_sha)

    for (let docId of api_Result) {
      let cachedDoc = indexRepository.DocTableDao.getDocById(docId)
      if (cachedDoc !== null) {
        retrieveResult.push(cachedDoc)
      }
    }
    return retrieveResult
  }
}
