import apiAxios from '../axios/proxyAxios'
import log from './log'
import store from '../common/store'

interface storeTokenPayload {
    uid?: string
    token: string
    platform: 'web'|'ios'|'android'|string
    target: 'provider' | 'patient'|string
}

interface sendNotificationPayload {
    uuid: string
    uid?: string
    eid?: string
    message: {
        did: string
        title: string
        body: string
        onClickLandingPage: string
        type: "message" | "ringtong" | string
        production?: "true" | "false" | string
    }
    time?: number
    delay?: number
}

interface abortRingTonePayload {
    uid?: string
    type: 'responded' | 'rejected' | 'timeout'
    exclude?: string
}

interface deleteTokenPayload {
    token: string[]
}

interface cancelDelayPayload{
    uuid: string
}

async function notificationApi(
    {payload,url}:{
        payload: Record<string,any>
        url:string
    }
){
    return new Promise((resolve, reject) => {
        try{
            apiAxios("notification")({
                method: "post",
                url: url,
                data: payload,
              }).then((response)=>{
                const data = response['data']
                if (store.env === 'test') {
                    log.info(
                        '%cPost Notification',
                        'background: purple; color: white; display: block;',
                        data
                    )
                }
                resolve(data)
              })
        }catch(error){
            log.error(error)
            reject(error)
        }
    })
}
async function storeToken(payload:storeTokenPayload) {
    const uid = localStorage.getItem('user_vid')
    store.notificationToken = payload.token
    localStorage.setItem('notification',payload.token)
    return notificationApi({payload:{...payload,uid},url:'/storeToken'})
}

async function sendNotification(payload: sendNotificationPayload){
    return notificationApi({payload,url:'/sendMsg'})
}

async function abortRingTone(payload:abortRingTonePayload){
    const uid = payload?.uid?payload?.uid:localStorage.getItem('user_vid')
    const token = localStorage.getItem('notification')
    if(uid && token){
        payload = {
            ...payload,
            uid,
            exclude: token,
        }
        return notificationApi({payload,url:'/abortRing'})
    }
}

async function deleteToken(){
    const payload = {
        tokens: [store.notificationToken]
    }
    return notificationApi({payload,url:'/deleteToken'})
}


export {
    notificationApi,
    storeToken,
    sendNotification,
    abortRingTone,
    deleteToken
}