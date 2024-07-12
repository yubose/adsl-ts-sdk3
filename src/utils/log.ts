import loglevel from 'loglevel'
import apiAxios from '../axios/proxyAxios'
loglevel.setDefaultLevel('debug')
loglevel.setLevel("debug")
if (process.env.NODE_ENV === 'production') {
  loglevel.setDefaultLevel('WARN')
  loglevel.setLevel("WARN")
}
export default loglevel

/**
 * 线上日志
 * @param body
 * @returns 
 */
export async function onlineLog(body:object|string){
    if(body){
      try{
        loglevel.info(
            '%cCreate onlineLog',
            'background: #D8BFD8; color: white; display: block;',
            body,
        )
        await apiAxios("proxy")({
          method: "post",
          url: `api/log`,
          data: body
        })
      }catch(error){
        loglevel.debug(error)
      }
    }
    return
  }

export async function adminBugLog(body: {
  feedback: string,
  currentUserId: string,
  pageInfo: string,
  other: Object
}) {
  try {
    if(body){
      loglevel.info(
          '%cCreate adminBugLog',
          'background: #D8BFD8; color: white; display: block;',
          body,
      )
      await apiAxios("proxy")({
        method: "post",
        url: `/api/adminBugLog`,
        data: body
      })
    }
  } catch (error) {
    loglevel.error(error)
  }
}

/**
 * save vertex's sk
 * @param userId 
 * @param sk 
 * @param other 
 */
export async function skLog(body: { userId: string, sk: string, other?: Object }) {
  try {
    if (body) {
      loglevel.info(
        '%cCreate skLog',
        'background: #D8BFD8; color: white; display: block;',
        body,
      )
      await apiAxios("proxy")({
        method: "post",
        url: `/api/sklog`,
        data: body
      })
    }
  } catch (error) {
    loglevel.error(error)
  }

}
