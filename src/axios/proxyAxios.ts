import axios from "axios"
import { AxiosRequestConfig } from "axios"
import store from "../common/store"
import { gzip, ungzip } from "../utils"
import log from "../utils/log"

type apiType = "noauth" | "proxy" | "elastic"| 'notification'

const getTimeZone = () => {
    const date = new Date()
    const offsetMinutes = date.getTimezoneOffset()
    const offsetHours = Math.abs(offsetMinutes / 60)
    const timeZone = offsetMinutes > 0 ? -offsetHours : offsetHours
    return timeZone
}

const apiAxios = (type: apiType = "proxy") => {
    const api = JSON.parse(localStorage.getItem("config") as string)["apiHost"]
    let baseURL = `https://gateway.aitmed.io/gateway/${type}`
    let TimeZone = getTimeZone()
    if(api === "testserver.aitmed.io") {
        baseURL = `https://testgateway.aitmed.io/gateway/${type}`
        // TimeZone = 8
    }
    const config: AxiosRequestConfig = {
        baseURL,
        headers: {
            TimeZone: TimeZone,
            "Content-Type": "application/base64"
        },
        transformRequest: (data, headers) => {
            log.debug('gateway api request : data')
            log.debug(data)
            const bs64 = store.level2SDK.utilServices.objectToBase64(data)
            const u8 = store.level2SDK.utilServices.base64ToUint8Array(bs64)
            const zip = gzip(u8)
            const zip_bs64 = store.level2SDK.utilServices.uint8ArrayToBase64(zip)
            return zip_bs64
        },
        transformResponse: (data, headers) => {
            const u8 = store.level2SDK.utilServices.base64ToUint8Array(data)
            const unzip = ungzip(u8)
            const str = store.level2SDK.utilServices.uint8ArrayToUTF8(unzip)
            const json = JSON.parse(str)
            return json
        }
    }
    try {
        if(type !== "noauth") {
            const jwt = localStorage.getItem("jwt")
            config.headers.GatewayAuthorization = `${api} ${jwt}`
        }
        return axios.create(config) 
    } catch (error) {
        return axios.create({
            baseURL: `https://gateway.aitmed.io/${type}`
        })
    }
}

export default apiAxios