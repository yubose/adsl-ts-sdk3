import axios from 'axios'
import apiAxios from '../../axios/proxyAxios'
import store from '../../common/store'
import log from '../../utils/log'

const aitmedApiHost = 'https://api.aitmed.io/'
const drugBankHost = 'https://api-js.drugbank.com/v1/us'
const dataBankHost = 'http://rest.eprax.de/dit'

/**
 * @function
 * @description generate drugbank api token with a maximum of 2 hours being replaced by databank
 * @returns {any}
 */
function generateDrugBankToken() {
  const url = '/drugbank-token/'
  let date = new Date()
  // axios({
  //   url: url,
  //   baseURL: aitmedApiHost,
  //   method: 'get',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  // })
  apiAxios("proxy")({
    url: url,
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      if (response['status'] == 200) {
        store.drugbankToken = response['data']['token']
        window?.localStorage?.setItem?.(
          'expiredTime',
          (date.getTime() + 2 * 60 * 60 * 1000).toString(),
        )
        window?.localStorage?.setItem?.('drugbankToken', response['data']['token'])
        log.debug('test', response['data'])
      }
    })
    .catch((error) => {
      if (store.env === 'test') {
				log.error(error instanceof Error ? error : new Error(String(error)))
      }
    })
}

/**
 * @function
 * @description help function for drugbank to get data according to drugbank api.being replaced by databank
 * @param {String} query query text
 * @param {String} drugbank_pcid pcid
 * @param {String} type Route | Strength
 * @returns {Promise}
 */
async function getDrugs(query, drugbank_pcid, type) {
  let currentDateTime = new Date().getTime()
  let expired = window?.localStorage?.getItem?.('expiredTime')
  let expiredTime = typeof expired == 'string' ? parseInt(expired) : 0
  if (currentDateTime >= expiredTime) {
    //maxium hours=2h，reget token after it expired
    await generateDrugBankToken()
  }
  const drugbankToken = window?.localStorage?.getItem?.('drugbankToken')
  log.debug(drugbankToken)
  let url = '/product_concepts'
  if (type == 'Route') {
    url = '/product_concepts/' + drugbank_pcid + '/routes'
  } else if (type == 'Strength') {
    url = '/product_concepts/' + drugbank_pcid + '/strengths'
  }
  let params = {}
  if (query) {
    params = {
      // region: 'us,ca',
      q: query,
    }
  }
  return new Promise((res, rej) => {
    axios({
      url: url,
      baseURL: drugBankHost,
      method: 'get',
      params: params,
      headers: {
        Authorization: 'Bearer ' + drugbankToken,
      },
    })
      .then((response) => {
        if (response['status'] == 200) {
          res(response['data'])
        }
      })
      .catch((error) => {
        rej(error)
      })
  })
}

/**
 * @function
 * @description Get the list of medicines from the back-end api
 * @param {String} queryName query text
 * @returns {Promise}
 */
async function getDrugList(queryName) {
  // const UCI = 'F19F1A544F6E49B097A289862244DB3'
  // let url = dataBankHost + '/drugsbyname/' + UCI
  // //let params = {}
  // if (queryName) {
  //     url = url + '/' + queryName
  // }
  let params = {}
  if (queryName) {
    params = {
      q: queryName,
    }
  }
  return new Promise((res, rej) => {
    // axios({
    //   url: 'https://api.aitmed.io/api/drug/',
    //   method: 'get',
    //   params: params,
    // })
    apiAxios("proxy")({
      method: "get",
      url: "/api/drug",
      params: params
    })
      .then((response) => {
        if (store.env === 'test') {
          log.info(
            '%cGet Drug response Detail',
            'background: purple; color: white; display: block;',
            response['data'],
          )
        }
        res(response['data']['DrugList'])
      })
      .catch((error) => {
        rej(error)
      })
  })
}

/**
 * @function
 * @description Obtain the drug CPT from the back-end api
 * @param {String} query query texxt
 * @returns {Promise}
 */
async function getCPT(query) {
  const CPTUrl = 'https://clinicaltables.nlm.nih.gov/api/hcpcs/v3/search'

  return new Promise((res, rej) => {
    axios({
      url: CPTUrl,
      method: 'get',
      params: {
        authenticity_token: '',
        terms: query,
      },
    })
      .then((response) => {
        if (store.env === 'test') {
          log.info(
            '%cGet CPT response',
            'background: purple; color: white; display: block;',
            response['data'],
          )
        }
        res(response['data'])
      })
      .catch((error) => {
        rej(error)
      })
  })
}

export default {
  /**
   * TODO: not use now
   * @function
   * @description Obtain drug-related information.(being replaced by databank)
   * @param {String} query query text
   * @param {String} id drug id
   * @param {string} type 'Drug' | 'Route' | 'Strength'
   * @returns {Array}
   */
  async drugBank({
    query,
    id,
    type,
  }: {
    query: string | null
    id: string | null
    type: 'Drug' | 'Route' | 'Strength'
  }) {
    let response: any = []
    await getDrugs(query, id, type).then(
      (data) => {
        if (store.env === 'test') {
          log.info(
            '%cGet Drug response',
            'background: purple; color: white; display: block;',
            { data },
          )
        }
        response = data
      },
      (error) => {
        log.error(error instanceof Error ? error : new Error(String(error)))
      },
    )
    return response
  },

  /**
   * @function
   * @description Obtain drug-related information
   * @param {String} query query text
   * @returns {Array}
   */
  async dataBank({ query }: { query: string | null }) {
    let response: any = []
    await getDrugList(query).then(
      (data) => {
        if (store.env === 'test') {
          log.info(
            '%cGet Drug response all',
            'background: purple; color: white; display: block;',
            { data },
          )
        }
        let preData: any = data
        let result: any = []
        let drugNameSet: any = new Set()
        for (let item of preData) {
          let drugName: string = item['DrugName']
          if (!drugNameSet.has(drugName)) {
            drugNameSet.add(drugName)
            result.push(item)
          }
        }
        if (store.env === 'test') {
          log.info(
            '%cGet Drug response',
            'background: purple; color: white; display: block;',
            { result },
          )
        }
        response = result
      },
      (error) => {
				log.error(error instanceof Error ? error : new Error(String(error)))
      },
    )
    return response
  },

  /**
   * @function
   * @description Obtain drug CPT information
   * @param {String} query query text
   * @returns {Array}
   */
  async queryCPT({ query }) {
    let response: any = []
    await getCPT(query).then(
      // @ts-expect-error
      (data: Array<string>) => {
        if (store.env === 'test') {
          log.info(
            '%cGet Drug response',
            'background: purple; color: white; display: block;',
            { data },
          )
        }
        response = data[3]
      },
      (error) => {
				log.error(error instanceof Error ? error : new Error(String(error)))
      },
    )
    return response
  },
  /**
   * start\stop twilio video room recorder
   * @param status  'include'|'exclude'
   * @returns boolean
   */
  async controlTranscription({status }){
    const cloudRecord = window['app'].meeting?.cloudRecord
    if (cloudRecord) {
        try{
          cloudRecord(status)
          return true
        }catch(error){
          log.info(error)
        }
        
        return false
    }
    return false
  },
  /**
   * generate aireport
   * @param body 
   * @returns boolean
   */
  async aiReport({body}){
    if(body){
      body['notification']['platform'] = 'web'
      body['notification']['token'] = JSON.parse(localStorage.getItem('Global') || '{}')['firebaseToken']
      try{
        const res = await apiAxios("proxy")({
          method: "post",
          url: `api/aireport/generate`,
          data: body
        })
        if(res?.status === 200) return true
      }catch(error){
        log.info(error)
      }
    }
    return false
  }
}
