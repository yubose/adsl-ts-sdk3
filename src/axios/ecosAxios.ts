import axios from "axios"
import { AxiosRequestConfig } from "axios"
import * as u from '@jsmanifest/utils'
import store from "../common/store"
import log from "../utils/log"
import { getNewJwt } from "../utils/common"

function parseData(data:string){
    const u8 = store.level2SDK.utilServices.base64ToUint8Array(data)
    const str = store.level2SDK.utilServices.uint8ArrayToUTF8(u8)
    console.log('parseDataStr', str)
    let json = ""
    if (typeof str === 'string') {
        try {
          json = JSON.parse(str)
        } catch (error) {
          json = str
        }
    } else if (Array.isArray(str)) {
        json = str
    }
    return  json
}
let limit = 0
async function handleJwtExpire(config,instance) {
    const newJwt = await getNewJwt()
    if(limit < 3){
        if(newJwt){
            config.headers.jwt = `${newJwt}`
            config.data = parseData(config.data)
            const { data } = await instance(config)
            limit = 0
            return data
        }else {
            limit++
            return await handleJwtExpire(config,instance)
        }
    }
    
}
const ecosAxios = () => {
    if (!u.isBrowser()) return
    const api = JSON.parse(localStorage.getItem("config") as string)["apiHost"]
    let baseURL = `https://testserverhttp.aitmed.io`
    if (api) {
        if (api === 'ecosapiprod.aitmed.io') {
            baseURL = 'https://ecosapiprodhttp.aitmed.io'
        } else if (api === 'testserver.aitmed.io') {
            baseURL = 'https://testserverhttp.aitmed.io'
        }
    }
   
    const config: AxiosRequestConfig = {
        baseURL,
        headers: {
            "Content-Type": "application/json"
        },
        transformRequest: (data, headers) => {
            if(data){
                const bs64 = store.level2SDK.utilServices.objectToBase64(data)
                const u8 = store.level2SDK.utilServices.base64ToUint8Array(bs64)
                const zip_bs64 = store.level2SDK.utilServices.uint8ArrayToBase64(u8)
                return zip_bs64
            }
            return
        },
    }
    try {
        const jwt = localStorage.getItem("jwt")
        config.headers.jwt = jwt || ''
        const instance = axios.create(config) 
        instance.interceptors.response.use(
            async (response) => {
                const { data,config } = response
                if(data){
                    const json = parseData(data)
                    log.debug('respData', json)
                    if(json['code'] === 111){
                        response.data = await handleJwtExpire(config,instance)
                    }else{
                        response.data = json
                    }
                }
              return response;
            },
            error => {
              // 对错误情况进行处理...
            }
        )
        return instance
    } catch (error) {
        return axios.create({
            baseURL,
        })
    }
}

export default ecosAxios