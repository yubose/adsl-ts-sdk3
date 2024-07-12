import { abortRingTone, notificationApi } from "../../utils/NotificationUtils";

export default {
    /**
     * @function
     * @description
     * @param {number|string}
     * @returns {number}
     */
    delayCalculation({ stime,period }: { stime: number|string ,period: number}):number {
        const delay = +stime - Math.trunc(Date.now()/1000) - +period
        if(delay < 5){
            return 5
        }
        return delay
    
    },
    async abortRing({uid,type,targetApp}:{uid:string,type: "responded" | "rejected" | "timeout",targetApp:string}){
        const payload = {
            type,
            targetApp,
            uid
        }
        return abortRingTone(payload)
    },
    async cancelDelay({uuid}:{uuid:string}) {
        if(uuid){
            return notificationApi({payload:{uuid},url:'/cancelDelay'})
        }
    }
}