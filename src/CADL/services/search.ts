import * as u from '@jsmanifest/utils'
import concat from 'lodash/concat'
import unset from 'lodash/unset'
import cloneDeep from 'lodash/cloneDeep'
import axios from 'axios'
import set from 'lodash/set'
import trimEnd from 'lodash/trimEnd'
import store from '../../common/store'
import differenceBy from 'lodash/differenceBy'
import uniq from 'lodash/uniq'
import take from 'lodash/take'
import log from '../../utils/log'
import { toast } from './utils'
import slice from 'lodash/slice'
import apiAxios from '../../axios/proxyAxios'

//query index
const Index_doc = 'doctors_dev'
const Index_Exter = 'externaldoctor_v0.1'
const Index_room = 'room_dev'
const Index_facility = 'facility_dev'
const Index_All = 'doctors_dev,room_dev'
const Index_users = 'doctors_dev,externaldoctor_v0.1'
const Index_Providers = 'provider_dev'
// const mapboxHost = 'api.mapbox.com'
const mapboxToken =
  'pk.eyJ1IjoiamllamlleXV5IiwiYSI6ImNrbTFtem43NzF4amQyd3A4dmMyZHJhZzQifQ.qUDDq-asx1Q70aq90VDOJA'
const mapboxHost = 'https://api.mapbox.com/'

interface LatResponse {
  center: any[]
}
/**
 *
 * @param key the key in the config yaml
 * @param defaultValue the default result want to response when dont write in config
 * @returns
 */
const getItemOfConfig = (key: string, defaultValue: string) => {
  if (!u.isBrowser()) return
  const config: any = localStorage?.getItem('config')
  const value = JSON.parse(config)?.hasOwnProperty(key)
    ? JSON.parse(config)[key]
    : defaultValue
  return value
}
const elasticClient = getItemOfConfig(
  'elasticClient',
  'https://elasticd.aitmed.io',
)
/**
 *
 * @param id  user id
 * @param type the type of document/edge want to sync
 * @returns sync result
 */
 const updateEs = (id, type, bvid) => {
  // convert document type to url
  const esSyncHost = getItemOfConfig('syncHost', 'https://syncd.aitmed.io')
  let urlConvert = new Map([
    ['40000', '/avail/'],
    ['35841', '/docProfile/'],
    ['79360', '/rsnForVst/'],
    ['655363', '/room/'],
    ['97280', '/insurance/'],
    ['273921', '/deleteRoom/'],
    ['35840', '/deleteDoc/'],
    ['10002','/deleteFacilityPro/'],
    ['271361','/facProfile/'],
  ])
  let url = urlConvert.get(type)
  let data:any = (type === '40000'||type ==='79360'||type==='10002') ? { vid: id, bvid: bvid } : { vid: id }
  if(type === '97280'){
    data = {bvid: bvid}
  }
  return new Promise((res, rej) => {
    axios({
      url: url,
      baseURL: esSyncHost,
      method: 'put',
      data: data,
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((data) => {
        if (store.env === 'test') {
          log.info(
            '%cGet mapbox address response',
            'background: purple; color: white; display: block;',
            { data , url},
          )
        }

        if (data.status == 200) {
          res(data)
        }

      })
      .catch((error) => {
        if(data.status === 500){
          toast(`${data.status}: The search error!!! `, { type: 'error' })
        }
        rej(error);
      })
  })
}


/**
 * Load similar addresses based on input text
 * Help function for suggestaddress
 * @param query
 * @returns
 */
const GetQuery = (query,types="") => {
  const url = '/geocoding/v5/mapbox.places/' + query + '.json'
  return new Promise((res, rej) => {
    axios({
      url: url,
      baseURL: mapboxHost,
      method: 'get',
      params: {
        country: 'US',
        limit: 10,
        access_token: mapboxToken,
        types: types
      },
    })
      .then((data) => {
        if (store.env === 'test') {
          log.info(
            '%cGet mapbox address response',
            'background: purple; color: white; display: block;',
            { data },
          )
        }
        if (data.status == 200) {
          res(data)
        }
      })
      .catch((error) => {
        rej(error)
      })
  })
}

let Description = (query) => {
  let promise = new Promise((res, rej) => {
    let path =
      '/api/icd10cm/v3/search?sf=code,name&df=code,name&maxList=20&terms=' +
      query
    let options = {
      host: 'clinicaltables.nlm.nih.gov',
      path: path,
    }
		axios.get(`https://${options.host}${path}`)
			.then((resp) => res({center:resp.data}))
			.catch(rej)
  })
  return promise
}


/**
   * @function
   * @description The latitude and longitude is converted into a trigonometric function in the form of a mid-degree minute table.
   * @param {number} d
   * @returns {number}
   *
   */
 const getDistance = (pos1,pos2) => {
  const url = '/directions-matrix/v1/mapbox/driving/' + pos1 + ";" + pos2
  return new Promise((res, rej) => {
    axios({
      url: url,
      baseURL: mapboxHost,
      method: 'get',
      params: {
        approaches: 'curb;curb',
        access_token: mapboxToken,
      },
    })
      .then((data) => {
        if (store.env === 'test') {
          log.info(
            '%cGet mapbox address response',
            'background: purple; color: white; display: block;',
            { data },
          )
        }
        if (data.status == 200) {
          res(data)
        }
      })
      .catch((error) => {
        rej(error)
      })
  })
}
/**
 * @param { object } opts
 * @param { Constructor } opts.SearchClient
 */
export default function getSearchBuiltIns({
  SearchClient,
}: {
  SearchClient?: any
} = {}) {
  return {
    async updateEsData({
      id,
      type,
      bvid = null,
    }: {
      id: string
      type: string
      bvid: string | null
    }) {
      let response: any
      updateEs(id, type, bvid).then(
        (data: any) => {
          response = data['data']
        },
        (error) => {
          log.error(error instanceof Error ? error : new Error(String(error)))

        },
      )
    },

    /**
     * Get the latitude and longitude of the most similar address based on the address input
     * @param query
     * @returns
     */
    async transformGeo({ query }) {
      let arr: any[] = []
      query = query.replace('#', '')
      if (query) {
        // let address
        await GetQuery(query).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data?.['data']?.['features']?.[0]
            arr = data.center
            if (store.env === 'test') {
              log.debug(data)
            }
          },
          (err) => {
            if (store.env === 'test') {
              log.debug(err)
            }
          },
        )
        // arr = address
        return arr
      }
      return
    },
    async queryCode({ query }) {
      let arr: any[] = []
      let arrNew: any[][] = []
      if (query) {
        await Description(query).then(
          // @ts-expect-error
          (data: LatResponse) => {
            arr[0] = data.center[3]
            for (let j = 0; j < arr[0].length; j++) {
              arrNew.push([])
            }
            for (let i = 0; i < arr[0].length; i++) {
              let arrStr: string = arr[0][i][0] + arr[0][i][1]
              let a: (string | number)[] = concat(arr[0][i], arrStr)
              arrNew[i].push(a)
            }
          },
          (error) => {
            log.error('query error', error instanceof Error ? error : new Error(String(error)))
          },
        )
        return arrNew
      }
      return []
    },
    /**
     * query Insurance ： (popular and all) plans carriers
     * @param id
     * @returns
     */
    async queryInsurance({ id }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let template: any = {
        query: {
          match: {
            _id: id,
          },
        },
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: 'ins_all',
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: '/api/esproxy/search',
        data: {
          config: elasticClient,
          index: 'ins_all',
          body: template,
        }
      })
      const body  = respdata.data
      return body['hits']['hits']
    },
    async queryIns({ ins }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let template: any = {
        _source: false,
        suggest: {
          ins: {
            prefix: ins,
            completion: {
              field: 'carries',
              size: 1000,
              skip_duplicates: true,
            },
          },
        },
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: 'ins',
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: 'ins',
          body: template,
        }
      })
      const body = respdata.data
      return body
    },
    async queryAllCarriers({ object }) {
      object.forEach((index) => {
        index['text'] = index['carrier']
      })
      return object
    },
    /**
     * 根据地址获取经纬度
     * @param address
     * @returns {latitude,longitude}
     */
    async getCoordinatesFromAddress({ address }) {
      const apiKey = mapboxToken;
      const encodedAddress = encodeURIComponent(address);
      const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}`;
      try {
        const response = await axios.get(apiUrl);
    
        if (response.data.features.length > 0) {
          const coordinates = response.data.features[0].center;
          return {
            latitude: coordinates[1],
            longitude: coordinates[0]
          };
        }
    
        return null;
      } catch (error) {
        console.error('Error retrieving data from Mapbox API:', error);
        return null;
      }
    },
    /**
     * 根据经纬度获取zipcode
     * @param address
     * @returns {latitude,longitude}
     */
    async getZipCodeFromCoordinates({ latitude, longitude }) {
      const apiKey = mapboxToken;
      const apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${apiKey}`;
    
      try {
        const response = await axios.get(apiUrl);
    
        if (response.data.features.length > 0) {
          const addressComponents = response.data.features[0].context;
          const zipCodeContext = addressComponents.find(context =>
            context.id.startsWith('postcode')
          );
    
          if (zipCodeContext) {
            return zipCodeContext.text;
          }
        }
    
        return "";
      } catch (error) {
        console.error('Error retrieving data from Mapbox API:', error);
        return "";
      }
    },
    /**
     * Get all related addresses of query
     * @param query
     * @returns
     */
    async suggestAddress({ query,types="" }) {
      // let arr: any[] = []
      query = query.replace('#', '')
      let response: any = []
      if (query) {
        // let address
        await GetQuery(query,types).then(
          (data: any) => {
            response = data?.['data']?.['features']
          },
          (error) => {
            log.error('query error', error instanceof Error ? error : new Error(String(error)))
          },
        )
        // arr = address
        if (response == null || typeof response == undefined) {
          return []
        }
        return response
      }
      return []
    },
    /**
     * 以prefix为前缀查询搜索建议，返回doctor_suggestion: []，speciality_suggestion 分别是推荐的医生姓名和科室名
     * 数据无重复，最大10条
     * @param prefix
     * @returns {Promise<{doctor_suggestion: [], speciality_suggestion: []}>}
     */
    async suggest({ prefix }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      log.debug('test suggest', prefix)
      let TEXT_INDEX = 'search_field_suggestion'
      let uniq_sug: any[] = []
      let spe_sug: any[] = []
      let sym_sug: any[] = []
      let template = {
        suggest: {
          speciality_suggestion: {
            text: prefix,
            completion: {
              field: 'specialty',
              skip_duplicates: true,
              size: 5,
            },
          },
          symptom_suggestion: {
            text: prefix,
            completion: {
              field: 'symptom',
              skip_duplicates: true,
              size: 10,
            },
          },
        },
        sort: [
          {
            weight: {
              order: 'desc',
            },
          },
        ],
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: TEXT_INDEX,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: TEXT_INDEX,
          body: template,
        }
      })
      let body = respdata.data
      function compare(property1, property2) {
        return function (a, b) {
          let value1 = a?.[property1]?.[property2]
          let value2 = b?.[property1]?.[property2]
          return value2 - value1
        }
      } //sort排序降序
      for (let s of body?.['suggest']?.['speciality_suggestion']?.[0]?.[
        'options'
      ].sort(compare('_source', 'weight'))) {
        spe_sug.push(s)
      }
      for (let s of body?.['suggest']?.['symptom_suggestion']?.[0]?.['options'].sort(
        compare('_source', 'weight'),
      )) {
        sym_sug.push(s)
        uniq_sug.push(s["text"].trim().toLowerCase())
      }
      uniq_sug = uniq(uniq_sug)
      if(uniq_sug.length>5){
        uniq_sug = take(uniq_sug, 5)
      }
      if(sym_sug.length>5){
        sym_sug = take(sym_sug, 5)
      }
      log.debug('test suggest', {
        uniqSym_suggestion: uniq_sug,
        speciality_suggestion: spe_sug,
        symptom_suggestion: Array.from(new Set(sym_sug)),
      })
      return {
        uniqSym_suggestion: uniq_sug,
        speciality_suggestion: spe_sug,
        symptom_suggestion: Array.from(new Set(sym_sug)),
      }
    },

    /**
     * Process the data into the data type used by the map
     * @param object
     * @returns
     */
    GetAllLonAndLat({ object }) {
      if (u.isArr(object)) {
        let re: Record<string, any> = []
        object.forEach((obj) => {
          let st =
            obj?.['_source']?.['availByLocation']?.[0]?.['location']?.['geoCode'].split(
              ',',
            )
          let address =
            obj?.['_source']?.['availByLocation']?.[0]?.['location']?.['address']?.[
              'street'
            ] +
            ' ' +
            obj?.['_source']?.['availByLocation']?.[0]?.['location']?.['address']?.[
              'city'
            ] +
            ' ' +
            obj?.['_source']?.['availByLocation']?.[0]?.['location']?.['address']?.[
              'state'
            ] +
            ' ' +
            obj?.['_source']?.['availByLocation']?.[0]?.['location']?.['address']?.[
              'zipCode'
            ]
          let Lon = parseFloat(st[1])
          let Lat = parseFloat(st[0])
          re.push({
            data: [Lon, Lat],
            information: {
              address: address,
              name: obj?.['_source']?.['fullName'] + ' ' + obj?.['_source']?.['title'],
              phoneNumber: obj?.['_source']?.['phone'],
              speciality: obj?.['_source']?.['specialty'],
              title: obj?.['_source']?.['title'],
            },
          })
        })
        log.debug('test transform', re)
        return re
      }
      return
    },

    /**
     * Process the Speciality in the data
     * @param object
     * @returns
     */
    SortBySpeciality({ object }) {
      if (u.isArr(object)) {
        let re: Record<string, any> = []
        let map = new Map()
        let index = 0
        object.forEach((obj) => {
          let specialities = obj?.['_source']?.['specialty']
            ? obj?.['_source']?.['specialty']
            : [obj?.['_source']?.['service']]
          for (let j = 0; j < specialities.length; j++) {
            if (map.get(specialities[j]) === undefined) {
              let item = {
                Speciality: specialities[j],
                num: 1,
                data: [obj],
              }
              // item.data.push(obj)
              re.push(item)
              map.set(specialities[j], index++)
            } else {
              let i = parseInt(map.get(specialities[j]))
              log.debug('test', { obj, i })
              re[i]['num'] = re?.[i]?.['num'] + 1
              re[i]['data'].push(obj)
            }
          }
        })

        return re
      }
      return
    },

    /**
     * Process data to facilitate the use of page UI
     * @param object
     * @returns
     */
    processingSearchData({ object }) {
      let path = ['avatar1.png', 'avatar2.png', 'avatar3.png', 'avatar4.png']
      let re: Record<string, any> = []
      if (u.isArr(object)) {
        object.forEach((obj) => {
          let map = new Map()
          for (let i = 0; i < obj?.['_source']?.['availByLocation']?.length; i++) {
            let location = obj?.['_source']?.['availByLocation']?.[i]?.['location']
            let key =
              obj?.['_source']?.['availByLocation']?.[i]?.['location']?.['geoCode']
            if (map.has(key)) {
              map.set(key, map.get(key))
            } else {
              map.set(key, 1)
              let item = obj
              let randomNumber = Math.ceil(Math.random() * 10)
              if (randomNumber >= 0 && randomNumber < 2.5) {
                randomNumber = 0
              } else if (randomNumber < 5 && randomNumber >= 2.5) {
                randomNumber = 1
              } else if (randomNumber >= 5 && randomNumber < 7.5) {
                randomNumber = 2
              } else {
                randomNumber = 3
              }
              item['path'] = path[randomNumber]
              item['fullName'] =
                item?.['_source']?.['fullName'] + ', ' + item?.['_source']?.['title']
              item['address'] =
                location?.['address']?.['city'] +
                ', ' +
                location?.['address']?.['state'] +
                ' ' +
                location?.['address']?.['zipCode']
              item['street'] = location?.['address']?.['street']
              if (obj?.['_source']?.['specialty'] == null) {
                obj['_source']['specialty'] = 'unknown'
              }
              re.push(item)
            }
          }
        })
        let obj = {}
        re = re.reduce((item, next) => {
          if (!obj[next._id]) {
            item.push(next)
            obj[next._id] = true
          }
          return item
        }, [])
        return re
      }
      return
    },
    ComputeObjectFieldCount({ objArr, strOne, strTwo }) {
      let subTpOne: number = 0
      let subTpTwo: number = 0
      let arr: number[] = []
      objArr.map((obj) => {
        if (obj['subtype'] === strOne) {
          subTpOne++
        } else if (obj['subtype'] === strTwo) subTpTwo++
      })
      arr.push(subTpOne)
      arr.push(subTpTwo)
      return arr
    },
    ModifyObjectField({ objArr, str }) {
      return objArr.map((values) =>
        set(values, 'place_name', trimEnd(values['place_name'], str)),
      )
    },
    CountObj({ objArr }) {
      let newArr: {}[] = []
      let newArrObj: { [key: string]: any }[] = []
      objArr.forEach((valuesObj) => {
        if ((valuesObj?.['_source']?.['availByLocation'] as [])?.length >= 1) {
          let len: number = valuesObj?.['_source']?.['availByLocation']?.length
          newArr = valuesObj?.['_source']?.['availByLocation']
          unset(objArr, valuesObj?.['_source']?.['availByLocation'])
          for (let i = 0; i < len; i++) {
            let obj = cloneDeep(valuesObj)
            obj['_source']['availByLocation'] = new Array(newArr[i])
            newArrObj.push(obj)
          }
        }
      })
      return newArrObj
    },
    pickByArr({ objArr }) {
      let arrOffice: any = []
      let arrTel: any = []
      objArr?.forEach((objItem) => {
        if (objItem?.['_source']?.['visitType'] === 'Office Visits' || objItem?.['_source']?.['service'] === 'COVID-19 Testing'
            || objItem?.['_source']?.['service'] === 'COVID-19 Vaccine' || objItem?.['_source']?.['service'] === 'Flu Shot') {
          arrOffice.push(objItem)
        } else if (objItem?.['_source']?.['visitType'] === 'Telemedicine') {
          arrTel.push(objItem)
        }
      })
      let doubArr: {}[] = []
      doubArr.push(arrOffice)
      doubArr.push(arrTel)

      return doubArr
    },
    /**
     *
     * @param param0 cond  =>search term
     * @returns
     * @author =>cmq'code
     */
    async queryProviders({ cond = null }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let template: any = {
        query: {
          multi_match: {
            query: cond,
            type: 'best_fields',
            fields: ['fullName^2', 'facilityName^2', 'specialty'],
            fuzziness: 'AUTO',
            max_expansions: 200,
          },
        },
        size: 100,
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: Index_Providers,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: Index_Providers,
          body: template,
        }
      })
      const body = respdata.data
      return body['hits']['hits']
    },
    GetAllLonAndLatNew({ object }) {
      const noName = ''
      if (u.isArr(object)) {
        let re: Record<string, any> = []
        let address = ""
        let st = []
        object.forEach((obj) => {
          if(obj?.['_source']?.['practiceLocation']){
            if(obj?.['_source']?.['practiceLocation']?.['geoCode']){
              st = obj?.['_source']?.['practiceLocation']?.['geoCode'].split(',')
              if (obj?.['_source']?.['practiceLocation']?.['fullAddress']){
                address = obj?.['_source']?.['practiceLocation']?.['fullAddress']
              }else if(obj?.['_source']?.['practiceLocation']?.['firstLine']){
                address =
                `${obj?.['_source']?.['practiceLocation']?.['firstLine']?obj?.['_source']?.['practiceLocation']?.['firstLine']:"" +
                '.' +
                obj?.['_source']?.['practiceLocation']?.['secondLine']?obj?.['_source']?.['practiceLocation']?.['secondLine']:"" +
                ',' +
                obj?.['_source']?.['practiceLocation']?.['city']?obj?.['_source']?.['practiceLocation']?.['city']:"" +
                ',' +
                obj?.['_source']?.['practiceLocation']?.['state']?obj?.['_source']?.['practiceLocation']?.['state']:"" +
                ' ' +
                obj?.['_source']?.['practiceLocation']?.['zipCode']?obj?.['_source']?.['practiceLocation']?.['zipCode']:""}`
              }else{
                address = "address..."
              }
              let Lon = parseFloat(st[1])
              let Lat = parseFloat(st[0])
              re.push({
                data: [Lon, Lat],
                information: {
                  address: address,
                  name: `${
                    obj?.['_source']?.['fullName']
                      ? obj?.['_source']?.['titleName']
                      : obj?.['_source']?.['roomName']
                      ? obj?.['_source']?.['roomName']
                      : noName
                  }`,
                  phoneNumber: obj?.['_source']?.['phoneNumber'],
                  speciality: `${
                    obj?.['_source']?.['specialty']
                      ? obj?.['_source']?.['specialty']
                      : obj?.['_source']?.['service']
                      ? obj?.['_source']?.['service']
                      : noName
                  }`,
                },
              })
            }
          }

        })
        return re
      }
      return
    },
    GetFacilityLat({ object }) {
      if (u.isArr(object)) {
        let re: Record<string, any> = []
        object.forEach((obj) => {
          let st = obj?.['name']?.['data']?.['basicInfo']?.['geoCode']
          let address =
            obj?.['name']?.['data']?.['basicInfo']?.['address'] +
            ' ' +
            obj?.['name']?.['data']?.['basicInfo']?.['city'] +
            ' ' +
            obj?.['name']?.['data']?.['basicInfo']?.['state'] +
            ' ' +
            obj?.['name']?.['data']?.['basicInfo']?.['zipCode']
          let Lon = parseFloat(st[0])
          let Lat = parseFloat(st[1])
          re.push({
            data: [Lon, Lat],
            information: {
              address: address,
            },
          })
        })

        return re
      }
      return
    },
    ChooseCarrier({ object, cond }) {
      for (let i = 0; i < Array.from(object).length; i++) {
        if (object[i].carrier == cond) {
          return object[i].plan[1]
        } else {
          continue
        }
      }
    },
    jugeSame({ object, cond, name }) {
      for (let i = 0; i < Array.from(object).length; i++) {
        if (object[i][name] == cond) {
          return true
        } else {
          continue
        }
      }
      return false
    },
    DeleteCarrier({ object, carreir, plans, len }) {
      for (let i = 0; i < Array.from(object).length; i++) {
        if (object[i].carrier == carreir) {
          object[i].plans = plans
          object[i].planLength = len
          return object
        } else {
          continue
        }
      }
    },
    /**
     *
     * @param cond   => Search term
     * @param distance =>  Query range
     * @param pos => address
     * @param stime => start time
     * @param etime  => end stime
     * @returns =>providers and rooms
     * @author => cmq'code
     */
    async queryByAllDate({
      cond = null,
      distance = 30,
      pos = 92805,
      stime,
      etime,
      isSplitCurrent = false,
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data?.['data']?.['features']?.[0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error))
              )
            }
          },
        )
      }
      if (
        typeof stime == 'string' ||
        typeof etime == 'string' ||
        typeof stime == 'number' ||
        typeof etime == 'number'
      ) {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if (isSplitCurrent) {
          let newStime = (new Date().getTime() / 1000).toFixed()
          if (stime <= newStime) {
            stime = newStime
          }
        } else {
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }

      }
      let template: any = {
        query: {
          bool: {
            must: [{
              function_score: {
                query: {
                  multi_match: {
                    query: cond,
                    type: 'best_fields',
                    fields: [
                      'specialty^2',
                      'fullName^1',
                      'service^2',
                      'facilityName^1',
                    ],
                    fuzziness: 'AUTO',
                    max_expansions: 200,
                    prefix_length: 2,
                  },
                },
              },
            },],
            filter: [
              {
                range: {
                  avail: {
                    gte: stime,
                    lt: etime,
                    relation: 'intersects',
                  },
                },
              },
              {
                geo_distance: {
                  distance: distance + 'mi',
                  'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                },
              }
            ],
          },
        },
        size: 100,
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: Index_All,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: Index_All,
          body: template,
        }
      })
      const body = respdata.data
      return body['hits']['hits']
    },
    /**
     *
     * @param cond   => Search term
     * @param distance =>  Query range
     * @param pos => address
     * @param stime => start time
     * @param etime  => end stime
     * @returns =>providers and rooms
     * @author => cmq'code
     */
    // 搜索所有已注册过的用户
    async queryAllUser({
      cond = null,
      distance = 30,
      pos = 92805,
      stime,
      etime,
      isSplitCurrent = false,
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data['data']['features'][0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error))
              )
            }
          },
        )
      }
      if (typeof stime == 'string' || typeof etime == 'string' || typeof stime == 'number' || typeof etime == 'number') {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if(isSplitCurrent){
          let newStime = (new Date().getTime()/1000).toFixed()
          if(stime <= newStime){
            stime = newStime
          }
        }else{
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }

      }
      let template: any = {
        query: {
          bool: {
            must: [
              {
                function_score: {
                  query: {
                    multi_match: {
                      query: cond,
                      type: 'best_fields',
                      fields: [
                        'specialty^2',
                        'fullName^1',
                        'service^2',
                        'facilityName^1',
                      ],
                      fuzziness: 'AUTO',
                      max_expansions: 200,
                      prefix_length: 2,
                    }
                  }
                }
              },
              {
                range: {
                  avail: {
                    gte: stime,
                    lt: etime,
                    relation: 'intersects',
                  }
                }
              },
              {
                geo_distance: {
                  distance: distance + 'mi',
                  'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                }
              }
            ]
          }
        },
        size: 1000,
      }
      let template1: any = {
        query: {
          bool: {
            must: [{
              function_score: {
                query: {
                  multi_match: {
                    query: cond,
                    type: 'best_fields',
                    fields: [
                      'specialty^2',
                      'fullName^1',
                      'service^2',
                      'facilityName^1',
                    ],
                    fuzziness: 'AUTO',
                    max_expansions: 200,
                    prefix_length: 2
                  }
                }
              }
            }],
          }
        },
        size: 1000,
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: Index_All,
      //     body: template,
      //   }
      // })
      // const respdata1 = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: Index_doc,
      //     body: template1,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: Index_All,
          body: template,
        }
      })
      const respdata1 = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: Index_doc,
          body: template1,
        }
      })
      const body = respdata.data
      const body1 = respdata1.data
      body['hits']['hits'].push(...(differenceBy(body1?.['hits']?.['hits'],body?.['hits']?.['hits'],"_id")));

      if (store.env === 'test') {
				log.info(
          '%cGet Search response',
          'background: purple; color: white; display: block;',
          { index: Index_All, response: body?.['hits']?.['hits'] },
        )
      }
      return body?.['hits']?.['hits']
    },
    /**
     *
     * @param cond   => Search term
     * @param distance =>  Query range
     * @param pos => address
     * @param stime => start time
     * @param etime  => end stime
     * @returns =>providers and rooms
     * @author => cmq'code
     */
    // 搜索所有系统内和系统外部的用户
    async queryUsers({
      cond = null,
      distance = 30,
      pos = 92805,
      lan = "",
      ins = "",
      stime,
      etime,
      isSplitCurrent = false,
      pages = 1,
      total = [],
      isType = false,
      type = 0
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data?.['data']?.['features']?.[0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error))
              )
            }
          },
        )
      }
      if (typeof stime == 'string' || typeof etime == 'string' || typeof stime == 'number' || typeof etime == 'number') {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if(isSplitCurrent){
          let newStime = (new Date().getTime()/1000).toFixed()
          if(stime <= newStime){
            stime = newStime
          }
        }else{
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }

      }
      //分页
      const indexList = ['Index_All','Index_doc','Index_Exter']
      let query = (count,page)=>{
          let mapArray:any = []   // 把count 映射成 一个数组对象，包含了 索引，以及 postion
          let indexRangeStart =  (page-1)*10
          let indexRangeEnd = indexRangeStart + 9
          let queryArray:any = []   // 最终返回
          // 初始化对照数组 目的是为了根据start end 获取 所在索引的位置
          for(let i = 0 ; i<count.length;i++){
              for(let j = 0 ;j<count[i];j++){
                  mapArray.push({
                      key: i,
                      position: j,
                      index: indexList[i]
                  })
              }
          }
          // 获取 开始索引 结束索引。
          // 1. 开始 == 结束 ， 不需要跨越索引 from = start.postion  length = end-start postion || 10
          // 2. 开始不等于结束, 跨越索引 ， 第一个索引，postion--> end, length = end-postion
          // 最后一个索引 0->postion
          // 中间索引 全部
          let start = mapArray[indexRangeStart]
          let end = indexRangeEnd >= mapArray.length?mapArray[mapArray.length-1]:mapArray[indexRangeEnd]
          if(end.key>start.key) {
              for (let i = start.key ; i<=end.key;i++) {
                  if(i==start.key) {
                      queryArray.push({
                          index: start.index,
                          start: start.position,
                          length: count[start.key] -start.position
                      })
                  }else if (i==end.key){
                          queryArray.push({
                              index: end.index,
                              start: 0,
                              length: end.position + 1
                          })
                  }else {
                      if(count[i]!=0) {
                          queryArray.push({
                          index: indexList[i],
                          start: 0,
                          length: count[i]
                        })
                      }
                  }
              }
          }else{
              queryArray.push({
                  index: start.index,
                  start: start.position,
                  length: (end.position + 1) -start.position
              })
          }
          return queryArray
      }

      let resArr = query(total,pages)
      let request1 = {from:0,size:0}
      let request2 = {from:0,size:0}
      let request3 = {from:0,size:0}
      resArr.forEach(element => {
        if(element.index == "Index_All"){
          request1.from = element.start
          request1.size = element.length
        }
        if(element.index == "Index_doc"){
          request2.from = element.start
          request2.size = element.length
        }
        if(element.index == "Index_Exter"){
          request3.from = element.start
          request3.size = element.length
        }
      });
      let template: any
      let index: any
      let EnglishObj = {
        match_phrase: {
          language: lan
        }
      }
      let insuranceObj = {
        match_phrase: {
          insurance: ins
        }
      }
      let shouldLan = {term: {language: lan}}
      let res = 0
      for(let i = 0;i<total.length;i++){
        res += total[i]
      }
      if(res != 0){
        if(isType){
          if(type==196609){
              template = {
                  query: {
                      bool: {
                          must: [
                          {
                              function_score: {
                                  query: {
                                  multi_match: {
                                      query: cond,
                                      type: 'best_fields',
                                      fields: [
                                      'specialty^2',
                                      'fullName^1',
                                      ],
                                      fuzziness: 'AUTO',
                                      max_expansions: 200,
                                      prefix_length: 2,
                                  },
                                  },
                              },
                          }
                          ],
                          filter: [
                          {
                              range: {
                                  avail: {
                                      gte: stime,
                                      lt: etime,
                                      relation: 'intersects',
                                  }
                              }
                          },
                          {
                              geo_distance: {
                                  distance: distance + 'mi',
                                  'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                              }
                          },
                          {
                              term: {
                                  subtype: type,
                              },
                          }
                          ]
                      }
                  },
                  from: request1["from"],
                  size: request1["size"]
              }
              if(lan != "" && ins === ""){
                  template["query"]["bool"]["must"].push(EnglishObj)
              }else if(ins != "" && lan === ""){
                  template["query"]["bool"]["must"].push(insuranceObj)
              }else if(lan != ""&& ins != ""){
                  template["query"]["bool"]["must"].push(EnglishObj)
                  template["query"]["bool"]["must"].push(insuranceObj)
              }
              index = Index_doc
          }else{
              template = {
                  query: {
                      bool: {
                          must: [
                          {
                              function_score: {
                                  query: {
                                  multi_match: {
                                      query: cond,
                                      type: 'best_fields',
                                      fields: [
                                      'specialty^2',
                                      'fullName^1',
                                      'service^2',
                                      'facilityName^1',
                                      ],
                                      fuzziness: 'AUTO',
                                      max_expansions: 200,
                                      prefix_length: 2,
                                  },
                                  },
                              }
                          }
                          ],
                          filter: [
                          {
                              range: {
                              avail: {
                                  gte: stime,
                                  lt: etime,
                                  relation: 'intersects',
                              }
                              }
                          },
                          {
                              geo_distance: {
                                  distance: distance + 'mi',
                                  'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                              }
                          }
                          ],
                          should: [
                              {term: {subtype: 131073}},
                              {term: {_index: "room_dev"}}
                          ],
                          minimum_should_match: 1
                      }
                  },
                  from: request1["from"],
                  size: request1["size"]
              }
              if(ins != ""){
                  template["query"]["bool"]["must"].push(insuranceObj)
              }
              if(lan != ""){
                  template["query"]["bool"]["should"].push(shouldLan)
                  template["query"]["bool"]['minimum_should_match'] = 2
              }
              index = Index_All
          }
        }else{
            template = {
            query: {
                bool: {
                must: [
                    {
                    function_score: {
                        query: {
                        multi_match: {
                            query: cond,
                            type: 'best_fields',
                            fields: [
                            'specialty^2',
                            'fullName^1',
                            'service^2',
                            'facilityName^1',
                            ],
                            fuzziness: 'AUTO',
                            max_expansions: 200,
                            prefix_length: 2,
                        }
                        }
                    }
                    },
                    {
                    range: {
                        avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                        }
                    }
                    },
                    {
                    geo_distance: {
                        distance: distance + 'mi',
                        'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                    }
                    }
                ]
                }
            },
            from: request1["from"],
            size: request1["size"]
            }
    
            if(lan != "" && ins === ""){
            template["query"]["bool"]["must"].push(EnglishObj)
            }else if(ins != "" && lan === ""){
            template["query"]["bool"]["must"].push(insuranceObj)
            }else if(lan != ""&& ins != ""){
            template["query"]["bool"]["must"].push(EnglishObj)
            template["query"]["bool"]["must"].push(insuranceObj)
            }
            index = Index_All
        }
        const elasticClient = getItemOfConfig(
          'elasticClient',
          'https://elasticd.aitmed.io',
        )
        // const respdata = await axios({
        //   method: "post",
        //   url: url,
        //   data: {
        //     config: elasticClient,
        //     index: index,
        //     body: template,
        //   }
        // })
        const respdata = await apiAxios("proxy")({
          method: "post",
          url: "/api/esproxy/search",
          data: {
            config: elasticClient,
            index: index,
            body: template,
          }
        })
        const body = respdata.data
        if(request2.size != 0){
          let templateDoc: any
          if(isType){
            templateDoc = {
                query: {
                    bool: {
                        must: [
                        {
                            function_score: {
                                query: {
                                multi_match: {
                                    query: cond,
                                    type: 'best_fields',
                                    fields: [
                                    'specialty^2',
                                    'fullName^1'
                                    ],
                                    fuzziness: 'AUTO',
                                    max_expansions: 200,
                                    prefix_length: 2
                                }
                                }
                            }
                        },
                        {
                            geo_distance: {
                            distance: distance + 'mi',
                            'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                            }
                        }
                        ],
                        must_not: [
                        {
                            range: {
                            avail: {
                                gte: stime,
                                lt: etime,
                                relation: 'intersects',
                            }
                            }
                        }
                        ],
                        filter: [
                        {
                            term: {
                            subtype: type
                            }
                        }
                        ]
                    }
                },
                from: request2["from"],
                size: request2["size"]
            }
            if(lan != "" && ins === ""){
                templateDoc["query"]["bool"]["must"].push(EnglishObj)
            }else if(ins != "" && lan === ""){
                templateDoc["query"]["bool"]["must"].push(insuranceObj)
            }else if(lan != ""&& ins != ""){
                templateDoc["query"]["bool"]["must"].push(EnglishObj)
                templateDoc["query"]["bool"]["must"].push(insuranceObj)
            }
          }else{
          templateDoc = {
              query: {
                  bool: {
                      must: [
                      {
                  function_score: {
                      query: {
                      multi_match: {
                          query: cond,
                          type: 'best_fields',
                          fields: [
                          'specialty^2',
                          'fullName^1'
                          ],
                          fuzziness: 'AUTO',
                          max_expansions: 200,
                          prefix_length: 2
                      }
                      }
                  }
                      },
                      {
                          geo_distance: {
                          distance: distance + 'mi',
                          'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                          }
                      }
                      ],
                      must_not: [
                      {
                          range: {
                          avail: {
                              gte: stime,
                              lt: etime,
                              relation: 'intersects',
                          }
                          }
                      }
                      ]
                  }
              },
              from: request2["from"],
              size: request2["size"]
          }
          if(lan != "" && ins === ""){
              templateDoc["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
              templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
              templateDoc["query"]["bool"]["must"].push(EnglishObj)
              templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }
          }
          // const respdataDoc = await axios({
          //   method: "post",
          //   url: url,
          //   data: {
          //     config: elasticClient,
          //     index: Index_doc,
          //     body: templateDoc,
          //   }
          // })
          const respdataDoc = await apiAxios("proxy")({
            method: "post",
            url: "/api/esproxy/search",
            data: {
              config: elasticClient,
              index: Index_doc,
              body: templateDoc,
            }
          })
          const bodyDoc = respdataDoc.data
          if(body['hits']['hits'].length < 10){
            body['hits']['hits'].push(...(bodyDoc['hits']['hits']))
          }
        }

        if(lan === "" && ins === ""){
          if(request3.size != 0){
            let templateExter: any = {
              query: {
                  bool: {
                      must: [
                      {
                      function_score: {
                          query: {
                          multi_match: {
                              query: cond,
                              type: 'best_fields',
                              fields: [
                              'specialty^2',
                              'fullName^1'
                              ],
                              fuzziness: 'AUTO',
                              max_expansions: 200,
                              prefix_length: 2
                          }
                          }
                      }
                      }
                      ],
                  }
              },
              from: request3["from"],
              size: request3["size"]
            }
            // const respdataExter = await axios({
            //   method: "post",
            //   url: url,
            //   data: {
            //     config: elasticClient,
            //     index: Index_Exter,
            //     body: templateExter,
            //   }
            // })
            const respdataExter = await apiAxios("proxy")({
              method: "post",
              url: "/api/esproxy/search",
              data: {
                config: elasticClient,
                index: Index_Exter,
                body: templateExter,
              }
            })
            const bodyExter = respdataExter.data
            if(body['hits']['hits'].length < 10){
              body['hits']['hits'].push(...(bodyExter['hits']['hits']))
            }
          }
        }
        return body['hits']['hits']
      }else{
        let body:any
        body['hits']['hits'] = []
        return body['hits']['hits']
      }
    },

    /**
     * @function
     * @description Query the data respectively according to the three indexes and package it into an array to return
     * @param {null} cond
     * @param {number} distance
     * @param {number} pos
     * @param {string|number} stime
     * @param {string|number} etime
     * @param {boolean} isSplitCurrent
     * @param {boolean} isType
     * @param {number} type
     * @param {string} lan
     * @returns {Array}
    */
    async querySpecialty({
      cond = null,
      distance = 30,
      pos = 92805,
      stime,
      etime,
      isSplitCurrent = false,
      isType = false,
      type = 0,
      lan = "",
      ins = ""
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data?.['data']?.['features']?.[0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error))
              )
            }
          },
        )
      }
      if (typeof stime == 'string' || typeof etime == 'string' || typeof stime == 'number' || typeof etime == 'number') {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if(isSplitCurrent){
          let newStime = (new Date().getTime()/1000).toFixed()
          if(stime <= newStime){
            stime = newStime
          }
        }else{
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }

      }

      let template: any
      let index: any
      let EnglishObj = {
        match_phrase: {
          language: lan
        }
      }
      let insuranceObj = {
        match_phrase: {
          insurance: ins
        }
      }
      let shouldLan = {term: {language: lan}}
      if(isType){
        if(type==196609){
          template = {
            query: {
              bool: {
                must: [{
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      },
                    },
                  },
                },],
                filter: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      },
                    },
                  },
                  {
                    geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                    },
                  },
                  {
                    term: {
                      subtype: type,
                    },
                  },
                ]
              },
            },
            _source: [
              "specialty",
              "service"
            ],
            size: 1000
          }
          if(lan != "" && ins === ""){
            template["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            template["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            template["query"]["bool"]["must"].push(EnglishObj)
            template["query"]["bool"]["must"].push(insuranceObj)
          }
          index = Index_doc
        }else{
          template = {
            query: {
              bool: {
                must: [{
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                          'service^2',
                          'facilityName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      },
                    },
                  },
                },],
                filter: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      },
                    },
                  },
                  {
                    geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                    },
                  }
                ],
                should: [
                  {term: {subtype: 131073}},
                  {term: {_index: "room_dev"}},

                ],
                minimum_should_match: 1
              },
            },
            _source: [
              "specialty",
              "service"
            ],
            size: 1000
          }
          if(ins != ""){
            template["query"]["bool"]["must"].push(insuranceObj)
          }
          if(lan != ""){
            template["query"]["bool"]["should"].push(shouldLan)
            template["query"]["bool"]['minimum_should_match'] = 2
          }
          index = Index_All
        }
      }else{
        template = {
          query: {
            bool: {
              must: [
                {
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                          'service^2',
                          'facilityName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      }
                    }
                  }
                },
                {
                  range: {
                    avail: {
                      gte: stime,
                      lt: etime,
                      relation: 'intersects',
                    }
                  }
                },
                {
                  geo_distance: {
                    distance: distance + 'mi',
                    'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                  }
                }
              ]
            }
          },
          _source: [
            "specialty",
            "service"
          ],
          size: 1000
        }
        if(lan != "" && ins === ""){
          template["query"]["bool"]["must"].push(EnglishObj)
        }else if(ins != "" && lan === ""){
          template["query"]["bool"]["must"].push(insuranceObj)
        }else if(lan != ""&& ins != ""){
          template["query"]["bool"]["must"].push(EnglishObj)
          template["query"]["bool"]["must"].push(insuranceObj)
        }
        index = Index_All
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: index,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: index,
          body: template,
        }
      })
      const body = respdata.data
      if(body["hits"]["hits"].length < 30){
        let sizeValue = 30 - body["hits"]["hits"].length
        let templateDoc: any
        if(isType){
          templateDoc = {
            query: {
              bool: {
                must: [
                  {
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1'
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2
                      }
                    }
                  }
                  },
                  {
                      geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                      }
                  }

              ],
                must_not: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      }
                    }
                  }
                ],
                filter: [
                  {
                    term: {
                      subtype: type,
                    },
                  },
                ]
              },
            },
            _source: [
              "specialty",
              "service"
            ],
            size: sizeValue
          }
          if(lan != "" && ins === ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }
        }else{
          templateDoc = {
            query: {
              bool: {
                must: [
                  {
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1'
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2
                      }
                    }
                  }
                  },
                  {
                      geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                      }
                  }

              ],
                must_not: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      }
                    }
                  }
                ]
              }
            },
            _source: [
              "specialty",
              "service"
            ],
            size: sizeValue
          }
          if(lan != "" && ins === ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }
        }
        // const respdataDoc = await axios({
        //   method: "post",
        //   url: url,
        //   data: {
        //     config: elasticClient,
        //     index: Index_doc,
        //     body: templateDoc,
        //   }
        // })
        const respdataDoc = await apiAxios("proxy")({
          method: "post",
          url: "/api/esproxy/search",
          data: {
            config: elasticClient,
            index: Index_doc,
            body: templateDoc,
          }
        })
        const bodyDoc = respdataDoc.data
        if(body['hits']['hits'].length < 10){
          body['hits']['hits'].push(...(bodyDoc['hits']['hits']))
        }
      }

      if(lan === "" && ins === ""){
        if(body["hits"]["hits"].length < 30){
          let sizeValue = 30 - body["hits"]["hits"].length
          let templateExter: any = {
            query: {
              bool: {
                must: [{
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1'
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2
                      }
                    }
                  }
                }],
              }
            },
            _source: [
              "specialty",
              "service"
            ],
            size: sizeValue
          }
          // const respdataExte = await axios({
          //   method: "post",
          //   url: url,
          //   data: {
          //     config: elasticClient,
          //     index: index,
          //     body: template,
          //   }
          // })
          const respdataExte = await apiAxios("proxy")({
            method: "post",
            url: "/api/esproxy/search",
            data: {
              config: elasticClient,
              index: index,
              body: template,
            }
          })
          const bodyExter = respdataExte.data
          if(body['hits']['hits'].length < 10){
            body['hits']['hits'].push(...(bodyExter['hits']['hits']))
          }
        }
      }
      let specialities = []
      body['hits']['hits'].forEach(element => {
        specialities = uniq(specialities.concat(element["_source"]["specialty"]))
      });
      return specialities
    },
    /**
     * @function
     * @description Query the data with only specialty according to the three indexes, remove the duplicate and package it into an array for return
     * @param {null} cond
     * @param {number} distance
     * @param {number} pos
     * @param {string|number} stime
     * @param {string|number} etime
     * @param {boolean} isSplitCurrent
     * @param {boolean} isType
     * @param {number} type
     * @param {string} lan
     * @returns {Array}
    */
    async queryTotals({
      cond = null,
      distance = 30,
      pos = 92805,
      stime,
      etime,
      isSplitCurrent = false,
      isType = false,
      type = 0,
      lan = "",
      ins = ""
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/count/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data?.['data']?.['features']?.[0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error))
              )
            }
          },
        )
      }
      if (typeof stime == 'string' || typeof etime == 'string' || typeof stime == 'number' || typeof etime == 'number') {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if(isSplitCurrent){
          let newStime = (new Date().getTime()/1000).toFixed()
          if(stime <= newStime){
            stime = newStime
          }
        }else{
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }

      }

      let template: any
      let index: any
      let EnglishObj = {
        match_phrase: {
          language: lan
        }
      }
      let insuranceObj = {
        match_phrase: {
          insurance: ins
        }
      }
      let shouldLan = {term: {language: lan}}
      if(isType){
        if(type==196609){
          template = {
            query: {
              bool: {
                must: [{
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      },
                    },
                  },
                },],
                filter: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      },
                    },
                  },
                  {
                    geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                    },
                  },
                  {
                    term: {
                      subtype: type,
                    },
                  },
                ]
              },
            }
          }
          if(lan != "" && ins === ""){
            template["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            template["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            template["query"]["bool"]["must"].push(EnglishObj)
            template["query"]["bool"]["must"].push(insuranceObj)
          }
          index = Index_doc
        }else{
          template = {
            query: {
              bool: {
                must: [{
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                          'service^2',
                          'facilityName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      },
                    },
                  },
                },],
                filter: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      },
                    },
                  },
                  {
                    geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                    },
                  }
                ],
                should: [
                  {term: {subtype: 131073}},
                  {term: {_index: "room_dev"}},
                ],
                minimum_should_match: 1
              },
            }
          }
          if(ins != ""){
            template["query"]["bool"]["must"].push(insuranceObj)
          }
          if(lan != ""){
            template["query"]["bool"]["should"].push(shouldLan)
            template["query"]["bool"]['minimum_should_match'] = 2
          }
          index = Index_All
        }
      }else{
        template = {
          query: {
            bool: {
              must: [
                {
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1',
                          'service^2',
                          'facilityName^1',
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2,
                      }
                    }
                  }
                },
                {
                  range: {
                    avail: {
                      gte: stime,
                      lt: etime,
                      relation: 'intersects',
                    }
                  }
                },
                {
                  geo_distance: {
                    distance: distance + 'mi',
                    'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                  }
                }
              ]
            }
          }
        }
        if(lan != "" && ins === ""){
          template["query"]["bool"]["must"].push(EnglishObj)
        }else if(ins != "" && lan === ""){
          template["query"]["bool"]["must"].push(insuranceObj)
        }else if(lan != ""&& ins != ""){
          template["query"]["bool"]["must"].push(EnglishObj)
          template["query"]["bool"]["must"].push(insuranceObj)
        }
        index = Index_All
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: index,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/count",
        data: {
          config: elasticClient,
          index: index,
          body: template,
        }
      })
      const body = respdata.data
      let Paging:any[] = []
      Paging[0] = body["count"]
      // 第一次判断是append无预约时间的User
      if (body["count"] < 30){
        let sizeDoc = 30 - body["count"]
        let templateDoc: any
        if(isType){
          templateDoc = {
            query: {
              bool: {
                must: [
                  {
                    function_score: {
                      query: {
                        multi_match: {
                          query: cond,
                          type: 'best_fields',
                          fields: [
                            'specialty^2',
                            'fullName^1'
                          ],
                          fuzziness: 'AUTO',
                          max_expansions: 200,
                          prefix_length: 2
                        }
                      }
                    }
                  },
                  {
                      geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                      }
                  }
                ],
                must_not: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      }
                    }
                  }
                ],
                filter: [
                  {
                    term: {
                      subtype: type,
                    },
                  },
                ]
              },
            }
          }
          if(lan != "" && ins === ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }
        }else{
          templateDoc = {
            query: {
              bool: {
                must: [
                  {
                  function_score: {
                    query: {
                      multi_match: {
                        query: cond,
                        type: 'best_fields',
                        fields: [
                          'specialty^2',
                          'fullName^1'
                        ],
                        fuzziness: 'AUTO',
                        max_expansions: 200,
                        prefix_length: 2
                      }
                    }
                  }
                  },
                  {
                      geo_distance: {
                      distance: distance + 'mi',
                      'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                      }
                  }  
                ],
                must_not: [
                  {
                    range: {
                      avail: {
                        gte: stime,
                        lt: etime,
                        relation: 'intersects',
                      }
                    }
                  }
                ]
              }
            }
          }
          if(lan != "" && ins === ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
          }else if(ins != "" && lan === ""){
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }else if(lan != ""&& ins != ""){
            templateDoc["query"]["bool"]["must"].push(EnglishObj)
            templateDoc["query"]["bool"]["must"].push(insuranceObj)
          }
        }
        // const respdataDoc = await axios({
        //   method: "post",
        //   url: url,
        //   data: {
        //     config: elasticClient,
        //     index: Index_doc,
        //     body: templateDoc,
        //   }
        // })
        const respdataDoc = await apiAxios("proxy")({
          method: "post",
          url: "/api/esproxy/count",
          data: {
            config: elasticClient,
            index: Index_doc,
            body: templateDoc,
          }
        })
        const bodyDoc = respdataDoc.data
        if(lan === "" && ins === ""){
          if(bodyDoc["count"] < sizeDoc){
            Paging[1] = bodyDoc["count"]
            let sizeValue = sizeDoc - bodyDoc["count"]
            let templateExter: any = {
              query: {
                bool: {
                  must: [{
                    function_score: {
                      query: {
                        multi_match: {
                          query: cond,
                          type: 'best_fields',
                          fields: [
                            'specialty^2',
                            'fullName^1'
                          ],
                          fuzziness: 'AUTO',
                          max_expansions: 200,
                          prefix_length: 2
                        }
                      }
                    }
                  }],
                }
              }
            }
            // const respdataExter = await axios({
            //   method: "post",
            //   url: url,
            //   data: {
            //     config: elasticClient,
            //     index: Index_Exter,
            //     body: templateExter,
            //   }
            // })
            const respdataExter = await apiAxios('proxy')({
              method: "post",
              url: "/api/esproxy/count",
              data: {
                config: elasticClient,
                index: Index_Exter,
                body: templateExter,
              }
            })
            const bodyExter = respdataExter.data
            if(bodyExter["count"] - sizeValue >= 0){
              Paging[2] = sizeValue
            }else{
              Paging[2] = bodyExter["count"]
            }

          }else{
            Paging[1] = sizeDoc
          }
        }
      }
      return Paging
    },
    async call({ telephone }) {
			if (u.isBrowser()) window.location.href = 'tel:' + telephone
    },

    // 根据subtype query
    /**
     *
     * @param cond   => Search term
     * @param distance =>  Query range
     * @param pos => address
     * @param stime => start time
     * @param etime  => end stime
     * @returns =>providers and rooms
     * @author => cmq'code
     */
     async queryDataByType({
      cond,
      distance = '25',
      pos = 92805,
      stime,
      etime,
      type,
      isSplitCurrent = false,
      size = 10,
      from = 0,
      lastArray = []
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data['data']['features'][0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error)),
              )
            }
          },
        )
      }
      if (
        typeof stime == 'string' ||
        typeof etime == 'string' ||
        typeof stime == 'number' ||
        typeof etime == 'number'
      ) {
        var d = new Date()
        var dateObject = new Date()
        dateObject.setMonth(d.getMonth() + 1)
        dateObject.setDate(d.getDate())
        dateObject.setFullYear(d.getFullYear())
        dateObject.setHours(0)
        dateObject.setMinutes(0)
        dateObject.setSeconds(0)
        if (isSplitCurrent) {
          let newStime = (new Date().getTime() / 1000).toFixed()
          if (stime <= newStime) {
            stime = newStime
          }
        } else {
          stime = Date.parse(dateObject.toString()) / 1000
          etime = stime + 86400
        }
      }
      let template: any
      let index: any
      if(type==196609){
        template = {
          query: {
            bool: {
              must: [{
                function_score: {
                  query: {
                    multi_match: {
                      query: cond,
                      type: 'best_fields',
                      fields: [
                        'specialty^2',
                        'fullName^1',
                      ],
                      fuzziness: 'AUTO',
                      max_expansions: 200,
                      prefix_length: 2,
                    },
                  },
                },
              },],
              filter: [
                {
                  range: {
                    avail: {
                      gte: stime,
                      lt: etime,
                      relation: 'intersects',
                    },
                  },
                },
                {
                  geo_distance: {
                    distance: distance + 'mi',
                    'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                  },
                },
                {
                  term: {
                    subtype: type,
                  },
                },
              ],
            },
          },
          sort: [
            {
              _geo_distance: {
                'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                order : 'asc',
                unit : 'mi',
                distance_type : 'arc',
                ignore_unmapped: true
              }
            }
          ],
          from: from,
          size: size,
        }
        index = Index_doc
      }else{
        template = {
          query: {
            bool: {
              must: [{
                function_score: {
                  query: {
                    multi_match: {
                      query: cond,
                      type: 'best_fields',
                      fields: [
                        'specialty^2',
                        'fullName^1',
                        'service^2',
                        'facilityName^1',
                      ],
                      fuzziness: 'AUTO',
                      max_expansions: 200,
                      prefix_length: 2,
                    },
                  },
                },
              },],
              filter: [
                {
                  range: {
                    avail: {
                      gte: stime,
                      lt: etime,
                      relation: 'intersects',
                    },
                  },
                },
                {
                  geo_distance: {
                    distance: distance + 'mi',
                    'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                  },
                }
              ],
              should: [
                {term: {subtype: 131073}},
                {term: {_index: "room_dev"}}
              ],
              minimum_should_match: 1
            },
          },
          sort: [
            {
              _geo_distance: {
                'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                order : 'asc',
                unit : 'mi',
                distance_type : 'arc',
                ignore_unmapped: true
              }
            }
          ],
          from: from,
          size: size,
        }
        index = Index_All
      }
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: index,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: index,
          body: template,
        }
      })
      let loading:boolean = true
      let body:any = respdata.data
      if(body['hits']['hits'].length == 0 || body['hits']['hits'].length <= size-1){
        loading = false
      }
      if(lastArray.length != 0){
        body['hits']['hits'] = lastArray.concat(body['hits']['hits'])
      }
      for(let index = 0;index < body?.['hits']?.['hits']?.length;index++){
      //   let distance = body?.['hits']?.['hits']?.[index]?.['sort']?.[0]
      //   distance = (+distance).toFixed(2)+' miles'
      //   body['hits']['hits'][index]["_source"]["practiceLocation"]["distance"] = distance
        if(loading){
          body['hits']['hits'][index]["loading"] = true
        }else{
          body['hits']['hits'][index]["loading"] = false
        }
      }
      return body['hits']['hits']
    },

    // 搜索facility
    /**
     *
     * @param cond   => Search term
     * @param distance =>  Query range
     * @param pos => address
     * @returns =>locations
     * @author => cmq'code
     */
    async queryLocations({
      cond,
      distance = '50',
      pos = 92805,
      from = 0,
      size = 8,
      lastArray = []
    }) {
      const url = 'https://api.aitmed.io/api/esproxy/search/'
      let arr: any[] = []
      if (pos) {
        // let address
        await GetQuery(pos).then(
          // @ts-expect-error
          (data: LatResponse) => {
            data = data['data']['features'][0]
            arr[0] = data.center[0]
            arr[1] = data.center[1]
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                '%cError',
                'background: purple; color: white; display: block;',
                error instanceof Error ? error : new Error(String(error)),
              )
            }
          },
        )
      }
      let template: any
      let index: any
      let NameObj = {
        function_score: {
          query: {
            multi_match: {
              query: cond,
              type: 'best_fields',
              fields: [
                'medicalFacilityName^2'
              ],
              fuzziness: 'AUTO',
              max_expansions: 200,
              prefix_length: 2,
            }
          }
        }
      }
      template = {
        query: {
          bool: {
            must: [],
            filter: [
              {
                geo_distance: {
                  distance: distance + 'mi',
                  'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
                },
              }
            ]
          }
        },
        sort: [
          {
            _geo_distance: {
              'practiceLocation.geoCode': arr[1] + ' , ' + arr[0],
              order : 'asc',
              unit : 'mi',
              distance_type : 'arc',
              ignore_unmapped: true
            }
          }
        ],
        from: from,
        size: size
      }
      if(cond != ""){
        template["query"]["bool"]["must"].push(NameObj)
      }
      index = Index_facility
      const elasticClient = getItemOfConfig(
        'elasticClient',
        'https://elasticd.aitmed.io',
      )
      // const respdata = await axios({
      //   method: "post",
      //   url: url,
      //   data: {
      //     config: elasticClient,
      //     index: index,
      //     body: template,
      //   }
      // })
      const respdata = await apiAxios("proxy")({
        method: "post",
        url: "/api/esproxy/search",
        data: {
          config: elasticClient,
          index: index,
          body: template,
        }
      })
      let loading:boolean = true
      let body:any = respdata.data
      if(body['hits']['hits'].length == 0 || body['hits']['hits'].length <= size-1){
        loading = false
      }
      if(lastArray.length != 0){
        body['hits']['hits'] = lastArray.concat(body['hits']['hits'])
      }
      for(let index = 0;index < body?.['hits']?.['hits']?.length;index++){
        let distance = body?.['hits']?.['hits']?.[index]?.['sort']?.[0]
        distance = (+distance).toFixed(1)+' mi'
        body['hits']['hits'][index]["_source"]["practiceLocation"]["distance"] = distance
        if(loading){
          body['hits']['hits'][index]["loading"] = true
        }else{
          body['hits']['hits'][index]["loading"] = false
        }
      }
      return body['hits']['hits']
    },

    /**
     * @description 根据关键词、路径模糊检索Map返回id数组
     * @param index   => Index Map
     * @param keywords =>  keywords
     * @param path => key
     * @returns => Id List
     * @author => TongShi
     */
    searchPatient({index, keywords, path}):Array<Object>{
      // let indexMap = new Map(Object.entries(index))
      let keywordsReplaced = keywords.replace(/[\s\/\-]/g,'');
      let keywordsRegExp = new RegExp(keywordsReplaced,'i');
      let result = new Array<string>()
      index.forEach((item)=>{
        
          if(item[path] && keywordsRegExp.test(item[path].replace(/[\s\/\-]+/g, ""))) {
            result.push(item)
          }
          // if(keywordsRegExp.test(item[path].replace(/[\s\/\-]+/g, "")))
          // {
             
          // }
      })
      return result;
  },
  /**
   * @description ECOSSearch搜索結果展示在地圖中
   * @param object 
   * @returns 
   */
  ShowAllLonAndLatInMap({ object }) {
    const noName = ''
    if (u.isArr(object)) {
      let re: Record<string, any> = []
      let address = ""
      object.forEach((obj) => {
        if(obj?.['PracticeLocation']){
          if(obj?.['PracticeLocation']?.['geoCode']){
            let geoArray = obj?.['PracticeLocation']?.['geoCode']
            let Lon = parseFloat(geoArray[0])
            let Lat = parseFloat(geoArray[1])
            // st = obj?.['PracticeLocation']?.['geoCode'].split(',')
            if (obj?.['PracticeLocation']?.['FullAddress']){
              address = obj?.['PracticeLocation']?.['FullAddress']
            }else if(obj?.['PracticeLocation']?.['addressFirstLine']){
              address =
              `${obj?.['PracticeLocation']?.['addressFirstLine']?obj?.['PracticeLocation']?.['addressFirstLine']:"" +
              ',' +
              obj?.['PracticeLocation']?.['city']?obj?.['PracticeLocation']?.['city']:"" +
              ',' +
              obj?.['PracticeLocation']?.['state']?obj?.['PracticeLocation']?.['state']:"" +
              ' ' +
              obj?.['PracticeLocation']?.['zipCode']?obj?.['PracticeLocation']?.['zipCode']:""}`
            }else{
              address = "Address..."
            }
            
            re.push({
              data: [Lon, Lat],
              information: {
                address: address,
                name: `${
                  obj?.['fullName']
                    ? obj?.['TitleName']
                    : obj?.['RoomName']
                    ? obj?.['RoomName']
                    : noName
                }`,
                phoneNumber: obj?.['PhoneNumber'],
                speciality: `${
                  obj?.['specialty']
                    ? obj?.['specialty']
                    : obj?.['Service']
                    ? obj?.['Service']
                    : noName
                }`,
              },
            })
          }
        }

      })
      return re
    }
    return
  },
  /**
   * @description ECOSSearch搜索結果分页展示
   * @param object 
   * @returns 
   */
  PagingEcosSearch({ object ,page}){
    let start = 0
    let end = 0
    // 每页展示的数量
    let showLen = 10
    // object的长度
    let len = parseInt(object.length)
    if ((page-1) <= 0){
      start = 0
    }else{
      start = (page - 1) * showLen
    }
    if (len > 10) {
      end = start + showLen
    }
    else {
      end = len
    }
    return slice(object,start,end)
  }
  }
}

