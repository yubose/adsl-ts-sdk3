import apiAxios from "../../axios/proxyAxios";
import store from "../../common/store";
import log from '../../utils/log'
import axios from "axios";
import * as u from '@jsmanifest/utils'

type PROVIDER_STATUS = "Active" | "Inactive" | "Deleted" | "All"

const mapboxToken =
  "pk.eyJ1IjoiamllamlleXV5IiwiYSI6ImNrbTFtem43NzF4amQyd3A4dmMyZHJhZzQifQ.qUDDq-asx1Q70aq90VDOJA"
const mapboxHost = "https://api.mapbox.com/"

const getCoordinatesFromZipCode = async({ 
    zipCode
}: {
    zipCode: string | number
}) => {
    const apiKey = mapboxToken;
    const apiUrl = `/geocoding/v5/mapbox.places/${zipCode}.json`;
    try {
      const response = await axios({
        url: apiUrl,
        baseURL: mapboxHost,
        method: "GET",
        params: {
            country: "US",
            limit: 10,
            access_token: apiKey,
            types: ""
        }
      });
  
      if (response.data.features.length > 0) {
        const coordinates = response.data.features[0].center;
        return `${coordinates[1]},${coordinates[0]}`
      }
      return "";
    } catch (error) {
      console.error("Error retrieving data from Mapbox API:", error);
      return "";
    }
}

const generateWeightsMap = (...args: Array<number>) => {
    let len = args.length
    const map = new Map<number, number>()
    let index = 0
    for(let e = 0; e < len; e++) {
        for(let i = 0; i < args[e]; i++) {
            map.set(index, e)
            index++
        }
    }
    return map
}

const queryDoctorAndRoomAndExternal = async ({
    key,
    zip,
    radius = 50,
    startTime,
    endTime,
    subtype,
    count = false,
    pageNumber = 1,  // 目标页页码
    limit = 10,
    language,
    insurance,
    status = "Active",
}: {
    key: string
    zip: string | number
    radius?: number
    startTime: number
    endTime: number
    subtype?: number
    count?: boolean
    pageNumber?: number
    limit?: number
    language?: string
    insurance?: string
    status?: PROVIDER_STATUS
}) => {
    const coordinate = await getCoordinatesFromZipCode({
        zipCode: zip
    })
    let count_doctor = 0
    let count_room = 0
    let count_internal = 0
    let count_doctor_noavail = 0
    let count_room_noavail = 0
    let count_noavail = 0
    let count_external = 0
    const count_doctor_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableDoctor",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            startTime: startTime,
            endTime: endTime,
            subtype: subtype,
            method: "count",
            status: status,
            language,
            insurance
        }
    })
    count_doctor = count_doctor_resp.data.data
    const count_room_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableRoom",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            startTime: startTime,
            endTime: endTime,
            method: "count",
            language
        }
    })
    count_room = count_room_resp.data.data
    count_internal = count_doctor + count_room
    if(count_internal > 30) {
        if(count)
            return count_internal
    } else {
        const count_doctor_noavail_resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getDocrotNoAvailable",
            data: {
                keyWord: key,
                coordinate: coordinate,
                radius: radius,
                startTime: startTime,
                endTime: endTime,
                subtype: subtype,
                method: "count",
                status: status,
                language,
                insurance
            }
        })
        count_doctor_noavail = count_doctor_noavail_resp.data.data
        const count_room_noavail_resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getRoomNoAvailable",
            data: {
                keyWord: key,
                coordinate: coordinate,
                radius: radius,
                startTime: startTime,
                endTime: endTime,
                method: "count",
                language
            }
        })
        count_room_noavail = count_room_noavail_resp.data.data
        count_noavail = count_doctor_noavail + count_room_noavail

        if(count_internal + count_noavail > 30) {
            if(count)
                return count_internal + count_noavail
        } else {
            const count_external_resp = await apiAxios("elastic")({
                method: "post",
                url: "/search/externaldoctor",
                data: {
                    keyWord: key,
                    coordinate: coordinate,
                    radius: radius,
                    method: "count"
                }
            })
            count_external = count_external_resp.data.data
            if(count)
                return count_internal + count_noavail + count_external
        }
    }
    const map = generateWeightsMap(count_doctor, count_room, count_doctor_noavail, count_room_noavail, count_external)
    log.info(count_doctor, count_room, count_doctor_noavail, count_room_noavail, count_external)
    log.info(map)
    const startIndex = (pageNumber - 1) * limit
    // const endIndex = pageNumber * limit
    log.info("WEIGHT", map.get(startIndex))
    if(map.get(startIndex) !== undefined ) {
        let data = new Array()
        let length = limit
        let start = startIndex
        if(start >= count_internal + count_noavail) {
            start = start - (count_internal + count_noavail)
        } else if(start >= count_internal + count_doctor_noavail) {
            start = start - (count_internal + count_doctor_noavail)
        } else if(start >= count_internal) {
            start = start - count_internal
        } else if(start >= count_doctor) {
            start = start - count_doctor
        }
        log.info("START", start)
        switch(map.get(startIndex)) {
            case 0: 
                log.info("CASE 0", start)
                const search_doctor_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getAvailableDoctor",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        subtype: subtype,
                        skip: start,
                        limit: length,
                        status: status,
                        language,
                        insurance
                    }
                })
                const data_doctor = search_doctor_resp.data.data
                data = data.concat(data_doctor)
                log.info("DATA 0", data)
                if(data.length >= limit) {
                    return data.slice(0, limit)
                }
                length -= data_doctor.length
                start = 0
            case 1: 
                log.info("CASE 1")
                const search_room_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getAvailableRoom",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        skip: start,
                        limit: length
                    }
                })
                const data_room = search_room_resp.data.data
                data = data.concat(data_room)
                log.info("DATA 1", data)
                if(data.length >= limit) {
                    return data.slice(0, limit)
                }
                length -= data_room.length
                start = 0
            case 2:
                log.info("CASE 2")
                const search_doctor_noavail_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getDocrotNoAvailable",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        subtype: subtype,
                        status: status,
                        language,
                        insurance,
                        skip: start,
                        limit: length
                    }
                })
                const data_doctor_noavail = search_doctor_noavail_resp.data.data
                data = data.concat(data_doctor_noavail)
                log.info("DATA 2", data)
                if(data.length >= limit) {
                    return data.slice(0, limit)
                }
                length -= data_doctor_noavail.length
                start = 0
            case 3: 
                log.info("CASE 3")
                const search_room_noavail_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getRoomNoAvailable",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        language,
                        skip: start,
                        limit: length
                    }
                })
                const data_room_noavail = search_room_noavail_resp.data.data
                data = data.concat(data_room_noavail)
                log.info("DATA 3", data)
                if(data.length >= limit) {
                    return data.slice(0, limit)
                }
                length -= data_room_noavail.length
                start = 0
            case 4:
                log.info("CASE 4")
                if(count_external !== 0) {
                    log.info("Search External")
                    const search_external_resp = await apiAxios("elastic")({
                        method: "post",
                        url: "/search/externaldoctor",
                        data: {
                            keyWord: key,
                            coordinate: coordinate,
                            radius: radius,
                            skip: start,
                            limit: length
                        }
                    })
                    const data_external = search_external_resp.data.data
                    data = data.concat(data_external)
                    log.info("DATA 4", data)
                    if(data.length >= limit) {
                        return data.slice(0, limit)
                    }
                } else {
                    log.info("Ignore External")
                }
            default:
                log.info("CASE DEFAULT")
                log.info("DATA DEFAULT", data)
                return data
        }
    } else {
        return []
    }
}

const queryDoctorAndExternal = async ({
    key,
    zip,
    radius = 50,
    startTime,
    endTime,
    subtype,
    status = "Active",
    count = false,
    pageNumber = 1,  // 目标页页码
    limit = 10,
    language,
    insurance
}: {
    key: string
    zip: string | number
    radius?: number
    startTime: number
    endTime: number
    subtype: number
    status?: PROVIDER_STATUS
    count?: boolean
    pageNumber?: number
    limit?: number
    language?: string
    insurance?: string
}) => {
    const coordinate = await getCoordinatesFromZipCode({
        zipCode: zip
    })
    let count_doctor = 0
    let count_internal = 0
    let count_doctor_noavail = 0
    let count_noavail = 0
    let count_external = 0
    const count_doctor_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableDoctor",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            startTime: startTime,
            endTime: endTime,
            subtype: subtype,
            status: status,
            method: "count",
            language,
            insurance
        }
    })
    count_doctor = count_doctor_resp.data.data
    count_internal = count_doctor
    if(count_internal > 30) {
        if(count)
            return count_internal
    } else {
        const count_doctor_noavail_resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getDocrotNoAvailable",
            data: {
                keyWord: key,
                coordinate: coordinate,
                radius: radius,
                startTime: startTime,
                endTime: endTime,
                subtype: subtype,
                method: "count",
                status: status,
                language,
                insurance,
            }
        })
        count_doctor_noavail = count_doctor_noavail_resp.data.data
        count_noavail = count_doctor_noavail
        if(count_noavail + count_internal > 30) {
            if(count)
                return count_internal + count_noavail
        } else {
            const count_external_resp = await apiAxios("elastic")({
                method: "post",
                url: "/search/externaldoctor",
                data: {
                    keyWord: key,
                    coordinate: coordinate,
                    radius: radius,
                    method: "count"
                }
            })
            count_external = count_external_resp.data.data
            if(count)
                return count_internal + count_noavail + count_external
        }
        
    }
    const map = generateWeightsMap(count_internal, count_noavail, count_external)
    log.info(count_internal, count_noavail, count_external)
    log.info(map)
    const startIndex = (pageNumber - 1) * limit
    // const endIndex = pageNumber * limit
    log.info("WEIGHT", map.get(startIndex))
    if(map.get(startIndex) !== undefined ) {
        let data = new Array()
        let length = limit
        let start = startIndex
        if(start >= count_internal + count_noavail) {
            start = start - (count_internal + count_noavail)
        }
        if(start >= count_internal) {
            start = start - count_internal
        }
        log.info("START", start)
        switch(map.get(startIndex)) {
            case 0: 
                log.info("CASE 0")
                const search_doctor_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getAvailableDoctor",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        subtype: subtype,
                        status: status,
                        skip: start,
                        limit: length,
                        language,
                        insurance,
                    }
                })
                const data_doctor = search_doctor_resp.data.data
                data = data.concat(data_doctor)
                if(data.length >= limit) {
                    log.info("DATA 0", data)
                    return data.slice(0, limit)
                }
                length -= data_doctor.length
                start = 0
            case 1:
                log.info("CASE 1")
                const search_doctor_noavail_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getDocrotNoAvailable",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        subtype: subtype,
                        status: status,
                        language,
                        insurance,
                        skip: start,
                        limit: length
                    }
                })
                const data_doctor_noavail = search_doctor_noavail_resp.data.data
                data = data.concat(data_doctor_noavail)
                if(data.length >= limit) {
                    log.info("DATA 1", data)
                    return data.slice(0, limit)
                }
                length -= data_doctor_noavail.length
                start = 0
            case 2:
                log.info("CASE 2")
                if(count_external !== 0) {
                    log.info("Search External")
                    const search_external_resp = await apiAxios("elastic")({
                        method: "post",
                        url: "/search/externaldoctor",
                        data: {
                            keyWord: key,
                            coordinate: coordinate,
                            radius: radius,
                            skip: start,
                            limit: length
                        }
                    })
                    const data_external = search_external_resp.data.data
                    data = data.concat(data_external)
                    if(data.length >= limit) {
                        log.info("DATA 2", data)
                        return data.slice(0, limit)
                    }
                } else {
                    log.info("Ignore External")
                }
            default:
                log.info("CASE DEFAULT")
                log.info("DATA DEFAULT", data)
                return data
        }
    } else {
        return []
    }
}

const queryDoctorAndRoom = async ({
    key,
    zip,
    radius = 50,
    startTime,
    endTime,
    subtype,
    status = "Active",
    count = false,
    pageNumber = 1,  // 目标页页码
    limit = 10
}: {
    key: string
    zip: string | number
    radius?: number
    startTime: number
    endTime: number
    subtype?: number
    status?: PROVIDER_STATUS
    count?: boolean
    pageNumber?: number
    limit?: number
}) => {
    const coordinate = await getCoordinatesFromZipCode({
        zipCode: zip
    })
    let count_doctor = 0
    let count_room = 0
    const count_doctor_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableDoctor",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            status: status,
            startTime: startTime,
            endTime: endTime,
            subtype: subtype,
            method: "count"
        }
    })
    count_doctor = count_doctor_resp.data.data
    const count_room_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableRoom",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            startTime: startTime,
            endTime: endTime,
            method: "count"
        }
    })
    count_room = count_room_resp.data.data
    const count_internal = count_doctor + count_room
    if(count)
        return count_internal
    const map = generateWeightsMap(count_doctor, count_room)
    log.info(count_doctor, count_room)
    log.info(map)
    const startIndex = (pageNumber - 1) * limit
    // const endIndex = pageNumber * limit
    log.info("WEIGHT", map.get(startIndex))
    if(map.get(startIndex) !== undefined ) {
        let data = new Array()
        let length = limit
        let start = startIndex
        if(start >= count_doctor) {
            start = start - count_doctor
        }
        log.info("START", start)
        switch(map.get(startIndex)) {
            case 0: 
                log.info("CASE 0")
                const search_doctor_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getAvailableDoctor",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        status: status,
                        startTime: startTime,
                        endTime: endTime,
                        subtype: subtype,
                        skip: start,
                        limit: length
                    }
                })
                const data_doctor = search_doctor_resp.data.data
                data = data.concat(data_doctor)
                if(data.length >= limit) {
                    log.info("DATA 0", data)
                    return data.slice(0, limit)
                }
                length -= data_doctor.length
                start = 0
            case 1: 
                log.info("CASE 1")
                const search_room_resp = await apiAxios("elastic")({
                    method: "post",
                    url: "/search/getAvailableRoom",
                    data: {
                        keyWord: key,
                        coordinate: coordinate,
                        radius: radius,
                        startTime: startTime,
                        endTime: endTime,
                        skip: start,
                        limit: length
                    }
                })
                const data_room = search_room_resp.data.data
                data = data.concat(data_room)
                if(data.length >= limit) {
                    log.info("DATA 1", data)
                    return data.slice(0, limit)
                }
            default:
                log.info("CASE DEFAULT")
                log.info("DATA DEFAULT", data)
                return data
        }
    } else {
        return []
    }
}

const queryDoctor = async ({
    key,
    zip,
    radius = 50,
    startTime,
    endTime,
    subtype,
    status = "Active",
    count = false,
    pageNumber = 1,  // 目标页页码
    limit = 10
}: {
    key: string
    zip: string | number
    radius?: number
    startTime: number
    endTime: number
    subtype?: number
    status?: PROVIDER_STATUS
    count?: boolean
    pageNumber?: number
    limit?: number
}) => {
    const coordinate = await getCoordinatesFromZipCode({
        zipCode: zip
    })
    let count_doctor = 0
    const count_doctor_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableDoctor",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            status: status,
            startTime: startTime,
            endTime: endTime,
            subtype: subtype,
            method: "count"
        }
    })
    count_doctor = count_doctor_resp.data.data
    if(count)
        return count_doctor
    const startIndex = (pageNumber - 1) * limit
    // const endIndex = pageNumber * limit
    const search_doctor_resp = await apiAxios("elastic")({
        method: "post",
        url: "/search/getAvailableDoctor",
        data: {
            keyWord: key,
            coordinate: coordinate,
            radius: radius,
            status: status,
            startTime: startTime,
            endTime: endTime,
            subtype: subtype,
            skip: startIndex,
            limit: limit
        }
    })
    return search_doctor_resp.data.data
}

const isSplitCurrent = (time: number) => {
    const curretnTime = Math.floor(new Date().getTime() / 1000)
    if(time < curretnTime) {
        return curretnTime
    } else {
        return time
    }
}

// search 查询预约insurance需要忽略的字段
const ignoreInsurance = new Set([
    "I'm paying for myself",
    "I'll choose my insurance later"
])

export default  {
    /* 查询医生 */
    async queryProvider({
        providerName,
        status = "Active",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        providerName: string
        status?: PROVIDER_STATUS
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            providerName: providerName,
            status: status
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getProvider",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryProviderInfo({
        providerName,
        status = "Active",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        providerName: string
        status: PROVIDER_STATUS
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            providerName: providerName,
            status: status
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getProviderInfo",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryFacility({
        facilityName,
        zip,
        radius = 50,
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        facilityName?: string
        zip: string
        radius?: number
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const coordinate = await getCoordinatesFromZipCode({
            zipCode: zip
        })
        const data = {
            coordinate: coordinate,
            radius: radius
        }
        if(facilityName) {
            data["facilityName"] = facilityName
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getFacility",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryAppointmentAvailable({
        key,
        zip,
        radius = 50,
        startTime,
        endTime,
        subtype,
        status = "Active",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        key: string
        zip: string | number
        radius?: number
        startTime: number
        endTime: number
        subtype?: number
        status?: PROVIDER_STATUS
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        startTime = isSplitCurrent(startTime)
        try {
            switch (subtype) {
                case 196609: {
                    const data = await queryDoctor({
                        key,
                        zip,
                        radius,
                        startTime,
                        endTime,
                        subtype,
                        status,
                        count,
                        pageNumber,
                        limit
                    })
                    return data
                }
                case 131073: {
                    const data = await queryDoctorAndRoom({
                        key,
                        zip,
                        radius,
                        startTime,
                        endTime,
                        subtype,
                        status,
                        count,
                        pageNumber,  // 目标页页码
                        limit
                    })
                    return data
                }
                default:
                    return []
            }
        } catch (error) {
            log.error(error)
            return []
        }
    },
    /* 查询可预约医生、Room 仅用于search项目 */
    async queryAppointmentAvailableForSearch({
        key,
        zip,
        radius = 50,
        startTime,
        endTime,
        subtype,
        status = "Active",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10,
        language,
        insurance
    }: {
        key: string
        zip: string | number
        radius?: number
        startTime: number
        endTime: number
        subtype?: number
        status?: PROVIDER_STATUS
        count?: boolean
        pageNumber?: number
        limit?: number
        language?: string
        insurance?: string
    }) {
        if(insurance && ignoreInsurance.has(insurance)) {
            insurance = ""
        }
        startTime = isSplitCurrent(startTime)
        try {
            switch(subtype) {
                case 196609: {
                    const data = await queryDoctorAndExternal({
                        key,
                        zip,
                        radius,
                        startTime,
                        endTime,
                        subtype,
                        status,
                        count,
                        pageNumber,
                        limit,
                        language,
                        insurance
                    })
                    return data
                }
                case 131073: 
                default: {
                    const data = await queryDoctorAndRoomAndExternal({
                        key,
                        zip,
                        radius,
                        startTime,
                        endTime,
                        subtype,
                        status,
                        count,
                        pageNumber,
                        limit,
                        language,
                        insurance
                    })
                    return data
                }
            }
        } catch (error) {
            log.error(error)
            return []
        }
    },
    async queryStoreProducts({
        facilityId,
        docType,
        tage,
        productionName,
        type,
        status,
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        facilityId: string
        docType: Array<number>
        tage: Array<number>
        productionName?: string
        type?: string
        status?: string
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            facilityId: facilityId,
            docType: docType,
            tage: tage
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(productionName) {
            data["productionName"] = productionName
        }
        if(status) {
            data["status"] = status
        }
        if(type) {
            data["type"] = type
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getStoreProducts",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    /* 保险搜索 */
    async queryInsurance({
        text
    }: {
        text: string
    }) {
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/insuranceSearch",
            data: {
                text: text
            }
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    /* 提词器 */
    async teleprompter({
        text
    }: {
        text: string
    }) {
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/teleprompter",
            data: {
                text: text
            }
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return {}
        }
    },
    async queryPatient({
        facilityId,
        key,
        status = "all",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        facilityId: string
        key?: string
        status?: string
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            facilityId: facilityId
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        if(status) {
            data["status"] = status
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getPatient",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryProcedureCode({
        facilityId,
        key,
        reid,
        count = false,
        pageNumber = 1,
        limit = 10
    }: {
        facilityId: string,
        key: string,
        reid: string,
        count?: boolean,
        pageNumber?: number,
        limit?: number
    }) {
        const data = {
            facilityId: facilityId
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        if(reid) {
            data["reid"] = reid
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getProcedureCode",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryPayer({
        facilityId,
        key,
        payerType,
        count = false,
        pageNumber = 1,
        limit = 10
    }: {
        facilityId: string
        key?: string
        payerType?: string
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            facilityId: facilityId
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        if(payerType) {
            data["payerType"] = payerType
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getPayer",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryRecommed({
        facilityId,
        key,
        startTime,
        endTime,
        count = false,
        pageNumber = 1,
        limit = 10
    }: {
        facilityId: string
        key?: string
        startTime?: number
        endTime?: number
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            facilityId: facilityId
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        if(startTime && endTime) {
            data["startTime"] = startTime
            data["endTime"] = endTime
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/recommed",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryTemplate({
        eid,
        key,
        count = false,
        pageNumber = 1,
        limit = 10
    }: {
        eid: string
        key?: string
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            eid: eid
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/template",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryAdminProvider({
        facilityId,
        key,
        status = "all",
        count = false,
        pageNumber = 1,  // 目标页页码
        limit = 10
    }: {
        facilityId: string
        key?: string
        status?: string
        count?: boolean
        pageNumber?: number
        limit?: number
    }) {
        const data = {
            facilityId: facilityId
        }
        if(count) {
            data["method"] = "count"
        } else {
            data["skip"] = (pageNumber - 1) * limit
            data["limit"] = limit
        }
        if(key) {
            data["keyWord"] = key
        }
        if(status) {
            data["status"] = status
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getAdminProvider",
            data: data
        })
        if(resp.status === 200) {
            log.info("DATA", resp.data.data)
            return resp.data.data
        } else {
            return []
        }
    },
    async queryFacilityByName({facilityName}:{facilityName:string}){
        if(facilityName){
            const { data } = await apiAxios("elastic")({
                method: "post",
                url: "/search/getFacilityByName",
                data: {
                    facilityName,
                    limit: 100,
                }
            })
            if (store.env === 'test') {
                log.info(
                    '%cPost queryFacilityByName response Detail',
                    'background: purple; color: white; display: block;',
                    data,
                )
            }
            return data['data']
        }
    },
    async queryDoctorInFacility({
        facilityId,
        status = "Active"
    }: {
        facilityId: string
        status?: PROVIDER_STATUS
    }) {
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getDoctorInFacility",
            data: {
                facilityId: facilityId,
                status: status,
                skip: 0,
                limit: 1000
            }
        })
        return resp.data.data
    },
    async queryRoomInFacility({
        locationId
    }: {
        locationId: string
    }) {
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/getRoomInFacility",
            data: {
                locationId: locationId,
                skip: 0,
                limit: 1000
            }
        })
        return resp.data.data
    },
    async queryProviderAllInfo(
        {
            providerName,
            pageNumber,
            limit,
            count,
            countList
        }
        :{
            providerName:string,
            pageNumber:number,
            limit:number,
            count?:boolean
            countList: any[]
        }
    ){

        const payload = {
            providerName,  
        }
        if(count){
            payload["method"] = "count"
        }else{
            payload['skip'] = (pageNumber-1)*limit
            payload['limit'] = limit
            payload['method'] = 'search'
            payload['count_lists'] = countList
        }
        const resp = await apiAxios("elastic")({
            method: "post",
            url: "/search/queryProviderAndExternal",
            data: payload
        })

        return resp.data.data
    },
    async queryProviderAllAiReport(options){
        try{
            if(u.isNil(options?.providerId)) return
            const providerId = options?.providerId || ''
            const pageNumber = options?.pageNumber || 1
            const limit = options?.limit || 10
            const startTime = options?.startTime || 0
            const endTime = options?.endTime || 0
            const keyWord = options?.keyWord || ''
            const sortMethod = options?.sortMethod || ''
            const typeArr = options?.type || []
            const parameters = {
                providerId,
                skip: (pageNumber-1)*limit,
                limit
            }
            if(startTime !==0 && endTime !==0){
                parameters['startTime'] = startTime
                parameters['endTime'] = endTime
            }
            if(keyWord){
                parameters['keyWord'] = keyWord
            }
            if(typeArr.length !==0){
                parameters['type'] = typeArr
            }
            if(sortMethod){
                parameters['sortMethod'] = sortMethod
            }
            const resp = await apiAxios("elastic")({
                method: "post",
                url: "/search/getAIReport",
                data: parameters
            })
            return resp.data.data
        }catch(error){
            log.error(error)
            return
        }
    },
    async phoneValidate({
        friendlyName,
        phoneNumber,
        docId,
        extension
    }:{
        friendlyName:string
        phoneNumber:string
        docId:string
        extension:number
    }){
        const _friendlyName = friendlyName || ''
        const _docId = docId || ''
        const _phoneNumber = phoneNumber || ''
        const _extension = extension || 0
        try {
const resp = await apiAxios()({
            method: "post",
            url: "/api/twilio/validate",
            data: {
                friendlyName: _friendlyName,
                phoneNumber: _phoneNumber,
                docId: _docId,
                extension: _extension
            }
        })
        console.log('resp', resp)
        return resp.data.data
        } catch (error) {
            return ""
        }
    },
    async getAccessToken({id}:{id:string}){
        if(!id) return
        const resp = await apiAxios()({
            method: "post",
            url: "/api/twilio/assesstoken",
            data: {
                identity: id
            }
        })
        return resp.data.data
    },
    async removeCallerId({phoneNumber}:{phoneNumber:string}){
        const resp = await apiAxios()({
            method: "post",
            url: "/api/twilio/remove",
            data: {
                phoneNumbers: phoneNumber
            }
        })
        return resp.data.data
    },
    async recordCall({callSid,recordSid,status}){
        try{
            const resp = await apiAxios()({
                method: "post",
                url: "/api/twilio/record",
                data: {
                    callSid: callSid || '',
                    recordSid: recordSid || '',
                    status: status || false
                }
            })
            return resp.data.data
        }catch(error){
            log.error(error)
        }
    }

}