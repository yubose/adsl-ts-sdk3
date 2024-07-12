import store from '../../common/store'
import { retrieveEdge, retrieveVertex } from '../../common/retrieve'
import get from 'lodash/get'
import set from 'lodash/set'
import has from 'lodash/has'
import { SHA256 } from 'crypto-js'
import log, { onlineLog } from '../../utils/log'
/**
 * @description 获取 halfkey,
 * 三种情况：
 * 1. bvid
 * 2. evid 
 * 3. 1053 evid 
 * @param rootEdge 
 * @param currentUserId 
 * @returns halfkey 
 */

const getHalfkey = async (rootEdge: any, currentUserId: any, callback: boolean = false) => {
  try{
    const eid = store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.eid)
    const currentId = currentUserId.toString()
    const key = SHA256(`${eid}${currentId}`).toString()
    const facilityId = localStorage.getItem('facility_vid')
    log.debug("GETHALFKEY", key)
    if(has(window['app']['root'], `halfkeyCache['${key}']`)) {
      log.debug(
        `%cUsing Cached Data for HalfKey`,
        'background:#7268A6; color: white; display: block;',
        key,
        eid,
        currentId
      )
      const halfkey = get(window['app']['root'], `halfkeyCache['${key}']`)
      onlineLog({
        userId: currentId,
        facilityId: facilityId,
        rootEdgeId: eid,
        halfKey: halfkey?store.level2SDK.utilServices.uint8ArrayToBase64(halfkey):halfkey,
        other: {
          platform: "web",
          from: 'halfkeyCache'
        }
      })
      console.error('halfkey')
      console.error(halfkey)
      return halfkey
    } else {
      const currentUserPk = localStorage.getItem('facility_pk') ? localStorage.getItem('facility_pk') : localStorage.getItem('pk')
      const currentUserSk = localStorage.getItem('facility_sk') ? localStorage.getItem('facility_sk') : localStorage.getItem('sk')
      let rootEdgeBesak = rootEdge?.besak
      let rootEdgeEesak = rootEdge?.eesak
      if (!rootEdge?.besak) {
        // if rootEdge without besak, generate besak and eesak and update the edge.
        ({ rootEdgeBesak, rootEdgeEesak } = await updateRootEdge(rootEdge, currentUserPk!, currentUserSk!, currentUserId))
      }
      let currentUserPkUint8Array: any
      let currentUserSkUint8Array: any
      // get the pk and sk
      if (currentUserPk && currentUserSk) {
        currentUserPkUint8Array =
          store.level2SDK.utilServices.base64ToUint8Array(currentUserPk)
        currentUserSkUint8Array =
          store.level2SDK.utilServices.base64ToUint8Array(currentUserSk)
      } else {
        console.error('lose key');
      }
      let halfkey: Uint8Array | null = new Uint8Array()
      if (currentUserId === store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.bvid)) {
        halfkey = store.level2SDK.utilServices.aKeyDecrypt(
          currentUserPkUint8Array,
          currentUserSkUint8Array,
          rootEdgeBesak,
        )
        log.debug(`%cGet Halfkey from Besak`, `background:#7268A6; color: white; display: block;`, `halfkey: ${halfkey}`)
      } else if (currentUserId === store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.evid)) {
        if(rootEdge.type === 40000 && !!(rootEdge.tage & (1 << 22))){
          halfkey = store.level2SDK.utilServices.aKeyDecrypt(
            currentUserPkUint8Array,
            currentUserSkUint8Array,
            rootEdgeEesak,
          )
        }else{
          const roomOwner = await retrieveVertex(rootEdge.bvid)
          const roomOwnerPk = roomOwner.data.vertex[0].pk
          halfkey = store.level2SDK.utilServices.aKeyDecrypt(
            roomOwnerPk,
            currentUserSkUint8Array,
            rootEdgeEesak,
          )
        }
        log.debug(`%cGet Halfkey from Eesak`, `background:#7268A6; color: white; display: block;`, `halfkey: ${halfkey}`)
      } else {
        const idList: any[] = [
          store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.eid ? rootEdge.eid : rootEdge.id),
          currentUserId
        ]
        const requestOptions = {
          // type: 1053,
          xfname: 'refid,evid',
          sCondition: "type in (1053,-1053)"
        }
        const edge1053 = await retrieveEdge(idList, requestOptions)

        if (!(edge1053.data.edge.length == 0)) {
          const eesak = edge1053.data.edge[0].eesak
          const inviter = await retrieveVertex(edge1053.data.edge[0].bvid)
          const inviterPk = inviter.data.vertex[0].pk
          halfkey = store.level2SDK.utilServices.aKeyDecrypt(
            inviterPk,
            currentUserSkUint8Array,
            eesak,
          )
        } else if (!callback) {
          // 加callback 参数 避免无限循环
          // 这种情况表示这是一个related appt ，所以自己可能在任意一个 1053或者40000 上面上面，所以rootEdge从当前 localstorage里面获取,
          // 方法2 通过当前的根边 获取到所有的related的bian，并找到属于自己的边，可能是40000 也可能是 1053
          // let currentRoomId = localStorage.getItem('facility_pk') ? JSON.parse(localStorage.getItem('Global')!).formData.appointment.id : JSON.parse(localStorage.getItem('Global')!).roomInfo.edge.id
          // const resp = await retrieveEdge(currentRoomId)
          // const currentRoomInfo = resp?.data?.edge?.[0] || null
          // halfkey = await getHalfkey(currentRoomInfo, currentUserId, true)
          const selfRootEdge = await getSelfRootEdge(rootEdge,currentUserId)
          if (selfRootEdge) {
            halfkey = await getHalfkey(selfRootEdge, currentUserId, true)
          }
        }
        log.debug(`%cGet Halfkey from 1053`, `background:#7268A6; color: white; display: block;`, `halfkey: ${halfkey}`)
      }
      if(halfkey){
        set(window['app']['root'], `halfkeyCache['${key}']`, halfkey);
        log.debug(
          `%cSeting Cached Data for HalfKey`,
          'background:#7268A6; color: white; display: block;',
          key,
        )
      }
      onlineLog({
        userId: currentId,
        facilityId: facilityId,
        rootEdgeId: eid,
        halfKey: halfkey?store.level2SDK.utilServices.uint8ArrayToBase64(halfkey):halfkey,
        other: {
          platform: "web",
        }
      })
      return halfkey
    }
  }catch(e){
    log.debug('error',e)
    return
  }
}
const updateRootEdge = async (rootEdge: any, currentUserPk: string, currentUserSk: string, currentUserId: string) => {
  // 解决 minor 创建 besak的问题
  // const isMonir = JSON.parse(localStorage.getItem('Global') || '{}')['formData']['role'] === 'minor'? true : false 
  // if (isMonir) {
  //   const minorid = JSON.parse(localStorage.getItem('Global') || '{}')['currentUser']['vertex']['id']
  //   currentUserId =  minorid
  // }
  if (currentUserId === store.level2SDK.utilServices.uint8ArrayToBase64(rootEdge.bvid)) {
    const edgeType = rootEdge.type
    const besak = store.level2SDK.commonServices.generateEsak(currentUserPk)
    if (edgeType === 10000) {
      // 10000 only need update besak 
      const options = {
        type: rootEdge.type,
        bvid: rootEdge.bvid,
        besak,
        name: rootEdge.name,
      }
      await store.level2SDK.edgeServices.updateEdge({
        id: rootEdge.eid,
        ...options
      })
      return {
        rootEdgeBesak: besak
      }
    } else {
      // generate eesak 
      let currentUserPkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserPk)
      let currentUserSkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk)
      const halfkey = store.level2SDK.utilServices.aKeyDecrypt(
        currentUserPkUint8Array,
        currentUserSkUint8Array,
        besak,
      )
      const eVertex = await retrieveVertex(rootEdge.evid)
      const eVertexPk = eVertex.data.vertex[0].pk
      // 如果是没有注册的用户
      if (!eVertexPk) {
        console.error('user not register');
      }
      const eesak = store.level2SDK.utilServices.aKeyEncrypt(
        eVertexPk,
        currentUserSkUint8Array,
        halfkey!
      )
      const jwtUser = localStorage.getItem('facility_vid')
        ? localStorage.getItem('facility_vid')
        : localStorage.getItem('user_vid')
      // switch jwt to update rootedge , add besak and eesak?
      await store.level2SDK.edgeServices.createEdge({
        type: 1030,
        bvid: rootEdge.bvid,
      })
      const options = {
        type: rootEdge.type,
        bvid: rootEdge.bvid,
        besak,
        eesak,
        name: rootEdge.name,
      }
      await store.level2SDK.edgeServices.updateEdge({
        id: rootEdge.eid,
        ...options
      })
      onlineLog({
        userId: jwtUser,
        facilityId: localStorage.getItem('facility_vid'),
        rootEdgeId: rootEdge.eid,
        halfKey: halfkey?store.level2SDK.utilServices.uint8ArrayToBase64(halfkey):halfkey,
        other: {
          platform: "web",
          op:"updateRootEdge"
        }
      })
      jwtUser &&
        (await store.level2SDK.edgeServices.createEdge({
          type: 1030,
          bvid: jwtUser,
        }))
      return {
        rootEdgeBesak: besak,
        rootEdgeEesak: eesak
      }
    }

  } else {
    console.error('current is not the owner of current, but need to create besak');
    return {
      rootEdgeBesak: "",
      rootEdgeEesak: ""
    }
  }
}
const getPkOfEdgeEvid = (edge: any) => {
  const pkOfInvitee = edge.deat.evPK
    ? edge.deat.evPK
    : edge.deat.eePK
  const pkOfInviteeToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pkOfInvitee)
  return pkOfInviteeToUint8Array
}
const getSelfRootEdge = async (currentRootEdge: any, currentUserId: any) => {
  // step1: 获取到当前房间下的tag 284160
  const docOptions: any = {
    type: 284160,
    xfname: 'eid',
    maxcount: "1",
    obfname: "mtime"
  }
  const relatedTagResp = await store.level2SDK.documentServices.retrieveDocument({
    idList: [currentRootEdge.eid],
    options: docOptions,
  })
  // step2: 获取根会议
  const relatedTag = relatedTagResp.data.document[0]
  let rootAppt = currentRootEdge
  if (relatedTag.eid != relatedTag.esig) {
    const resp = await retrieveEdge(relatedTag.esig!)
    rootAppt = resp?.data?.edge?.[0] || null
  }
  //step3 根据根会议获取所有关联预约
  const allRelateAppDocOptions: any = {
    type: 284160,
    xfname: 'reid',
    obfname: "mtime"
  }
  const relatedTagListResp = await store.level2SDK.documentServices.retrieveDocument({
    idList: [rootAppt.eid],
    options: allRelateAppDocOptions,
  })
  const relatedTagList = relatedTagListResp.data.document
  const apptIdList:any = relatedTagList.map((item)=>{
    return item.eid
  })
  //step4 获取所有的房间边 , 看自己在不在40000、或者下属的1053上
  const allRoom = await retrieveEdge(apptIdList)
  for (let index = 0; index < allRoom.data.edge.length; index++) {
    const selfRootEdge = await getrootEdge(allRoom.data.edge[index],currentUserId)
    if (selfRootEdge) {
      return allRoom.data.edge[index]
    }
  }
  return false

}
const getrootEdge = async (currentRootEdge: any, currentUserId: any)=>{
  if (currentUserId == store.level2SDK.utilServices.uint8ArrayToBase64(currentRootEdge.bvid) || currentUserId == store.level2SDK.utilServices.uint8ArrayToBase64(currentRootEdge.evid)) {
    return currentRootEdge
  }
  // 获取当前40000下的所有的1053
  const requestOptions = {
    type: 1053,
    xfname: 'refid,evid'
  }
  const edge1053 = await retrieveEdge([store.level2SDK.utilServices.uint8ArrayToBase64(currentRootEdge.eid),currentUserId], requestOptions)
  if (edge1053.data.edge.length == 0) {
    return false
  } else {
    return currentRootEdge
  }
}
export {
  getHalfkey,
  getPkOfEdgeEvid,
  updateRootEdge
}