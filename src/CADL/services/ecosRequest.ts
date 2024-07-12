import ecosAxios from '../../axios/ecosAxios'
import * as u from '@jsmanifest/utils'
import log from '../../utils/log'
import { get } from 'lodash';
function parseCADL(data:any){
    if(u.isArr(data)){
        data.forEach(item=>{
            item = parseCADL(item)
        })
    }else if(u.isStr(data)){
        let _data = data
        if(data.endsWith('=')) return data
        try {
            _data = JSON.parse(data)
        } catch (error) {
            return data
        }
        return _data
    }else if(u.isObj(data)){
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key]
                data[key] = parseCADL(value)
            }
        }
    }
    return data
}
async function ecosRequest(url, requestData) {
    log.log('url', url)
    log.log('requestData', requestData)
    try {
        const instance = ecosAxios();
        const resp = await instance?.({
            method: 'POST',
            url,
            data: requestData,
        });
        if (resp && resp?.status === 200) return resp['data']['data'];
    } catch (error) {
        log.error('Ecos request error', error);
    }
}
export default {
    async request(
        {
          method,
          url,
          data,
          code = false
        }:
        {
          method: 'get' | 'post',
          url: string,
          data: Object | null,
          code: boolean
        }
    ){
        try{
            const payload = {
                url,
                method,
                params: method=='get'?data:null,
                data: method=='post'?data:null,
            }
            let instance = ecosAxios()
            if(u.isObj(payload) && url === '/user/thirdPartyLogin'){
                // @ts-expect-error
                payload.data['client'] = 'web'
            }
            const res = await instance?.(payload)
            if(res && res?.status===200){
                if(res['data']['jwt']){
                    localStorage.setItem('jwt',res['data']['jwt'])
                }
                const _data = res['data']['data']
                const data = parseCADL(_data)
                log.info(
                    "%cecoRequest Response",
                    "background: purple;color: white; display: block;",
                    data
                )
                if(code){
                    return {
                        ...res['data'],
                        data
                    }
                }
                return data
            }
        }catch(error){
            log.error(error)
        }
        return 
    },
    async getFacilityListById({userId}:{userId: string}) {
        try{
            const instance = ecosAxios()
            const resp = await instance?.({
                method: 'POST',
                url: "/user/getFacilityList",
                data: {
                    userId: userId
                }
            })
            if(resp && resp?.status===200){
                const facilityList = resp['data']['data']
                facilityList.unshift({})
                return  facilityList.map(item => ({...item, "borColor": "#ffffff"}))
                
            }
        }catch(error){
            log.error('get facilityList error',error)
        }
    },
    async getStaffList({ facilityId } : { facilityId: string }){
        try{
            const instance = ecosAxios()
            const resp = await instance?.({
                method: 'POST',
                url: "/user/getStaffList",
                data: {
                    facilityId
                }
            })
            if(resp && resp?.status===200){
                return get(resp,"data.data")
            }
        }catch(error){
            log.error('get staffList error',error)
        }
    },
    /**
     * @description 获取claim列表
     * @param 
     * @returns 
     */
    async getClaimByFacilityLocationId({facilityIdList, locationIdList, maxcount, offset=0, searchDetail={}}:
        { facilityIdList: string[], locationIdList: string[], maxcount: number, offset: number, searchDetail: {} }) {
        offset = offset == 0 ? 0 : (offset - 1) * maxcount
        return await ecosRequest("/ecommerce/getClaimList", {
            facilityIdList,
            locationIdList,
            maxcount,
            offset,
            searchDetail,
        });
    },
    async getClaimLengthByFacilityLocationId({facilityIdList, locationIdList, maxcount}:{facilityIdList: string[], locationIdList: string[], maxcount: number}) {
        return await ecosRequest("/ecommerce/getClaimListLength", {
            facilityIdList,
            locationIdList,
            maxcount,
        });
    },
    /**
     * @description 获取statement列表
     * @param payerInsuranceIdList payerDoc id
     * @returns 
     */
    async getStatementByPayerDocId({payerInsuranceIdList, maxcount, offset=0, searchDetail={}}:
        { payerInsuranceIdList: string[], maxcount: number, offset: number, searchDetail: {} }) {
        offset = offset == 0 ? 0 : (offset - 1) * maxcount
        return await ecosRequest("/ecommerce/getStatmentList", {
            payerInsuranceIdList,
            maxcount,
            offset,
            searchDetail
        });
    },
    async getStatementLengthByPayerDocId({payerInsuranceIdList, maxcount}:{payerInsuranceIdList: string[], maxcount: number}) {
        return await ecosRequest("/ecommerce/getStatmentListLength", {
            payerInsuranceIdList,
            maxcount,
        });
    },
    async getApplyRecordByPayerDocId({claimRecordIdList}:{claimRecordIdList: string[]}) {
        return await ecosRequest("/ecommerce/getApplyRecordList", {
            claimRecordIdList,
        });
    },
    /**
     * @description 获取用户状态 https://app.apifox.com/link/project/4038059/apis/api-151476976
     * @param userId 用户id 
     * @returns 
     */
    async getUserStatus({userId}:{userId: string}) {
        return await ecosRequest("/user/getUserStatus", {
            userId,
        });
    },
    async saveZoomSessionId(
      {
          sessionId,
          appointmentId
      }:{
          sessionId: string
          appointmentId: string
      }
    ){
      try{
          const instance = ecosAxios()
          await instance?.({
            url: '/appointment/saveZoomSessionId',
            method: 'post',
            data: {
              sessionId,
              appointmentId,
            }
          })

      }catch(error){
          log.error(error)
      }
      return 
    },
    async getPaymentReport(
        {
            dateType,
            startDate,
            endDate,
            facilityIdList,
            locationIdList,
            providerIdList,
            groupBy
        }:{
            dateType: string
            startDate: string
            endDate: string
            facilityIdList: string[]
            locationIdList: string[]
            providerIdList: string[]
            groupBy: string
        }
      ){
        return await ecosRequest("/ecommerce/getPaymentReport", {
            dateType,
            startDate,
            endDate,
            facilityIdList,
            locationIdList,
            providerIdList,
            groupBy
        });
      },
    async getInviteRecord({stime, etime, pageNumber, searchContent, pageSize, role}:{stime:number, etime:number, pageNumber:number, searchContent:string, pageSize: number, role:string})  {
        const resp = await ecosRequest("/user/getInviteRecordList", {
            startTime: stime,
            endTime: etime,
            offset: (pageNumber-1)*pageSize-1,
            maxcount: pageSize,
            searchContent: searchContent,
            role: role === 'All' ? 0 : (role === 'Provider' ? 524288 : 524289)
        })
        return {   
            inviteRecordList: resp.inviteRecordList,
            totalPage: Math.ceil(resp.totalCount / pageSize)
        }

    } 
}