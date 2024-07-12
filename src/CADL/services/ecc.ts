import store from '../../common/store'
import AiTmedError from '../../common/AiTmedError'
import { sha256 } from 'hash.js'
import { retrieveEdge, retrieveVertex } from '../../common/retrieve'
import { documentToNote } from '../../services/Document'
import Document from '../../services/Document'
import { isArr } from '@jsmanifest/utils'
import { replaceUint8ArrayWithBase64 } from '../utils'
import log from '../../utils/log'
function decryptSK(password:string,message:string){
  let skBase64
  if(password && message){
    const secretKeyUInt8Array = store.level2SDK.utilServices.normalizeStringTo32BitArray(password)
    const encryptedDataUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(message)

    const sk = store.level2SDK.utilServices.sKeyDecrypt(
      secretKeyUInt8Array,
      encryptedDataUInt8Array,
    )
    skBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sk as Uint8Array)
  }
  return skBase64
}
function generateSkAndPk(parentSK:string,id:string){
  const pw = `${parentSK}${id}`
  const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
  const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithParentSK({
    secretKey,
    password: pw,
  })
  const pk = store.level2SDK.utilServices.uint8ArrayToBase64(publicKey)
  const sk = store.level2SDK.utilServices.uint8ArrayToBase64(secretKey)
  const esk = store.level2SDK.utilServices.uint8ArrayToBase64(encryptedSecretKey)
  return {sk,pk,esk}
}
async function updateAdminByFacility(
    id:string,
    saveLocalstorage:boolean
  ) {
  const ownerPk = localStorage.getItem('pk')
  const ownerSk = localStorage.getItem('sk')
  const ownerId = localStorage.getItem('user_vid')
  const facilityResponse = await retrieveVertex(id)
  const currentFacility = facilityResponse.data.vertex[0]
  if(ownerPk && ownerSk && ownerId){
    //change jwt to owner
    await store.level2SDK.edgeServices.createEdge({
      bvid: ownerId,
      type: 1030,
    })

    //update facility sk,pk and esk
    const {...options} = currentFacility
    const {sk,pk,esk} = generateSkAndPk(ownerSk,id)
    options['pk'] = pk
    options['esk'] = esk
    const {data} = await store.level2SDK.vertexServices.updateVertex({
      ...options,
      id,
    })
    log.debug(`%c[update facility]`, `color:#e50087;`,data)
    if(saveLocalstorage){
      localStorage.setItem('facility_sk',sk)
      localStorage.setItem('facility_pk',pk)
    }

    //change jwt to facility
    await store.level2SDK.edgeServices.createEdge({
      bvid: id,
      type: 1030,
    })
    
    //get edge 1200
    const edge1200Options = {
      type: 1200,
      xfname: 'bvid',
    }
    const edge1200Response = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [id],
      options: edge1200Options
    })
    const edge1200s = edge1200Response.data.edge

    //update edge 12000 beesak and bbseak
    const key = `${ownerSk}${id}`
    const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: key})
    let halfkey = store.level2SDK.utilServices.base64ToUint8Array(password)
    let pkOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
    let skOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
    await Promise.all(
      edge1200s.map(async(edge)=>{
        const evidVertexresp = await retrieveVertex(edge?.evid)
        const evidVertex = evidVertexresp?.data?.vertex?.[0]
        let pkOfStaffToUint8Array = evidVertex?.pk
        if(halfkey){
          const eesak = store.level2SDK.utilServices.aKeyEncrypt(
            pkOfStaffToUint8Array,
            skOfFacilityToUint8Array,
            halfkey
          )
          const besak = store.level2SDK.utilServices.aKeyEncrypt(
            pkOfFacilityToUint8Array,
            skOfFacilityToUint8Array,
            halfkey
          )
          
          const {data} = await store.level2SDK.edgeServices.updateEdge({
            id: edge.eid,
            type: 1200,
            eesak,
            besak,
            name: edge.name,
          })
          log.debug(`%c[update 1200 edge]`, `color:#e50087;`,data)
        }
      })
    )

    //get locations vertex 
    const locationOptions = {
      ObjType: 4,
      xfname: 'E.bvid',
      scondition: "E.type=1100 AND V.type!=20"
    }
    const locationResponse = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [id],
      options: locationOptions
    })
    const locations = locationResponse.data.vertex
    
    //update locations sk,pk and esk
    const locationAll = await Promise.all(
      locations.map(async(location)=>{
        const {...locationOptions} = location
        const locationId = store.level2SDK.utilServices.uint8ArrayToBase64(locationOptions?.id)
        const locationData = generateSkAndPk(sk,locationId)
        locationOptions['pk'] = locationData.pk
        locationOptions['esk'] = locationData.esk
        const {data} = await store.level2SDK.vertexServices.updateVertex({
          ...locationOptions,
          id: locationId,
        })
        log.debug(`%c[update Location]`, `color:#e50087;`,data)


        //change jwt to location
        await store.level2SDK.edgeServices.createEdge({
          bvid: locationId,
          type: 1030,
        })
        //get room vertex
        const roomOptions = {
          ObjType: 4,
          xfname: 'E.bvid',
          scondition: "E.type=1100 AND V.type!=21"
        }
        const roomResponse = await store.level2SDK.vertexServices.retrieveVertex({
          idList: [locationId],
          options: roomOptions
        })
        const rooms = roomResponse.data.vertex

        //update room pk,sk and esk
        for(const room of rooms){
          const {...roomOptions} = room
          const roomId = store.level2SDK.utilServices.uint8ArrayToBase64(roomOptions?.id)
          const roomData = generateSkAndPk(locationData.sk,roomId)
          roomOptions['pk'] = roomData.pk
          roomOptions['esk'] = roomData.esk
          await store.level2SDK.edgeServices.createEdge({
            bvid: locationId,
            type: 1030,
          })
          const {data} = await store.level2SDK.vertexServices.updateVertex({
            ...roomOptions,
            id: roomId,
          })
          log.debug(`%c[update Room]`, `color:#e50087;`,data)
        }
        return {
          pk: locationData.pk,
          esk: locationData.esk,
          id: locationId,
          location: location.name.basicInfo.location,
          locationID: location.name.basicInfo.locationID,
          medicalFacilityName: location.name.basicInfo.medicalFacilityName,
          phoneNumber: location.name.basicInfo.phoneNumber,
        }

      })
    )

    //change jwt to facility
    await store.level2SDK.edgeServices.createEdge({
      bvid: id,
      type: 1030,
    })
    //get 38401 doc
    const docOptions = {
      type: 38401,
      xfname: 'ovid',
      maxcount: 1
    }
    const docResponse = await store.level2SDK.documentServices.retrieveDocument({
      idList: [id],
      options: docOptions,
    })
    const doc38401 = docResponse.data.document[0]
    if(doc38401){
      const decryptedDoc = await documentToNote({ document: doc38401 })
      const {
        id: docId,
        eid,
        name,
        subtype: dTypeProps,
        ...restOfDocOptions
      } = decryptedDoc
      name.data.allLocation = locationAll 
      const response = await Document.update(docId, {
        edge_id: decryptedDoc.eid,
        content: name?.data,
        mediaType: name?.type,
        title: name?.title,
        targetRoomName: name?.targetRoomName,
        tags: name?.tags,
        user: name?.user,
        sesk: name?.sesk,
        sfname: name?.sfname,
        aesk: name?.aesk,
        tage: restOfDocOptions?.tage,
        type: restOfDocOptions?.type,
        fid: restOfDocOptions?.fid,
        reid: restOfDocOptions?.reid,
        jwt: restOfDocOptions?.jwt,
        dTypeProps,
      })
      log.debug(`%c[update 38401 Doc]`, `color:#e50087;`,response)
    }
    

  }

}

async function updateRoom(
  id:string,
  esk:string
) {
  const ownerSk = localStorage.getItem('sk')
  if(id && esk && ownerSk){
    const facilityKey = `${ownerSk}${id}`
    const facilityPassword = store.level2SDK.utilServices.generatePasswordWithParentSK({password: facilityKey})
    const facilitySK = decryptSK(facilityPassword,esk)

    await store.level2SDK.edgeServices.createEdge({
      bvid: id,
      type: 1030,
    })
    //get locations vertex 
    const locationOptions = {
      ObjType: 4,
      xfname: 'E.bvid',
      scondition: "E.type=1100 AND V.type!=20"
    }
    const locationResponse = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [id],
      options: locationOptions
    })
    const locations = locationResponse.data.vertex
    if(isArr(locations) && facilitySK){
      const locationAll = await Promise.all(
        locations.map(async(location)=>{
          const {...locationOptions} = location
          const locationId = store.level2SDK.utilServices.uint8ArrayToBase64(locationOptions?.id)
          const locationEsk = store.level2SDK.utilServices.uint8ArrayToBase64(locationOptions?.esk)
          const locationPk = store.level2SDK.utilServices.uint8ArrayToBase64(locationOptions?.pk)
          let locationSK
          if(locationEsk){
            const locationKey = `${facilitySK}${locationId}`
            const locationPassword = store.level2SDK.utilServices.generatePasswordWithParentSK({password: locationKey})
            locationSK = decryptSK(locationPassword,locationEsk)
          }

          
          //change jwt to location
          await store.level2SDK.edgeServices.createEdge({
            bvid: locationId,
            type: 1030,
          })
          //get room vertex
          const roomOptions = {
            ObjType: 4,
            xfname: 'E.bvid',
            scondition: "E.type=1100 AND V.type!=21"
          }
          const roomResponse = await store.level2SDK.vertexServices.retrieveVertex({
            idList: [locationId],
            options: roomOptions
          })
          const rooms = roomResponse.data.vertex
          //update room pk,sk and esk
          if(isArr(rooms) && locationSK){
            for(const room of rooms){
              const {...roomOptions} = room
              const roomId = store.level2SDK.utilServices.uint8ArrayToBase64(roomOptions?.id)
              const roomData = generateSkAndPk(locationSK ,roomId)
              roomOptions['pk'] = roomData.pk
              roomOptions['esk'] = roomData.esk
              await store.level2SDK.edgeServices.createEdge({
                bvid: locationId,
                type: 1030,
              })
              const {data} = await store.level2SDK.vertexServices.updateVertex({
                ...roomOptions,
                id: roomId,
              })
              console.error(roomId);
              log.debug(`%c[update Room]`, `color:#e50087;`,data)
            }
          }   
          
          return {
            pk: locationPk,
            esk: locationEsk,
            id: locationId,
            location: location.name.basicInfo.location,
            locationID: location.name.basicInfo.locationID,
            medicalFacilityName: location.name.basicInfo.medicalFacilityName,
            phoneNumber: location.name.basicInfo.phoneNumber,
          }

        })
      )

      //change jwt to facility
      await store.level2SDK.edgeServices.createEdge({
        bvid: id,
        type: 1030,
      })
      //get 38401 doc
      const docOptions = {
        type: 38401,
        xfname: 'ovid',
        maxcount: 1
      }
      const docResponse = await store.level2SDK.documentServices.retrieveDocument({
        idList: [id],
        options: docOptions,
      })
      const doc38401 = docResponse.data.document[0]
      if(doc38401){
        const decryptedDoc = await documentToNote({ document: doc38401 })
        const {
          id: docId,
          eid,
          name,
          subtype: dTypeProps,
          ...restOfDocOptions
        } = decryptedDoc
        name.data.allLocation = locationAll 
        const response = await Document.update(docId, {
          edge_id: decryptedDoc.eid,
          content: name?.data,
          mediaType: name?.type,
          title: name?.title,
          targetRoomName: name?.targetRoomName,
          tags: name?.tags,
          user: name?.user,
          sesk: name?.sesk,
          sfname: name?.sfname,
          aesk: name?.aesk,
          tage: restOfDocOptions?.tage,
          type: restOfDocOptions?.type,
          fid: restOfDocOptions?.fid,
          reid: restOfDocOptions?.reid,
          jwt: restOfDocOptions?.jwt,
          dTypeProps,
        })
        log.debug(`%c[update 38401 Doc]`, `color:#e50087;`,response)
      }
    }

    

  }

}
let publicKey:Uint8Array
let secretKey:Uint8Array
let pkSign:Uint8Array
let skSign:Uint8Array
export default {
  signature({ message, eskSign, sk }: { message: any; eskSign: any; sk: any }) {
    let sig: string = ''
    //yuhan 7/2/2021 without esksign cannot generate sig
    if (!eskSign || eskSign.length < 100) {
      return sig
    }
    log.debug('test',{eskSign})
    sig = store.level2SDK.utilServices.signature({ message, eskSign, sk })
    return sig
  },
  verifySignature(signature: string, pkSign: string): boolean {
    const isValid = store.level2SDK.utilServices.verifySignature(
      signature,
      pkSign,
    )
    return isValid
  },

  generate16Dkey(): string {
    const max: number = 9999999999999999
    const key: number = Math.floor(Math.random() * max)
    return String(key).toString()
  },
  async updateStaffEdge( { facilityid, pk, esk } ) {
      const ownerSk = localStorage.getItem('sk')
      //change jwt to facility
      await store.level2SDK.edgeServices.createEdge({
        bvid: facilityid,
        type: 1030,
      })
      //get edge 1200
      const edge1200Options = {
        type: 1200,
        xfname: 'bvid',
      }
      const edge1200Response = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [facilityid],
        options: edge1200Options
      })
      const edge1200s = edge1200Response.data.edge
      console.error(edge1200s);
      //update edge 12000 beesak and bbseak
      const facilityKey = `${ownerSk}${facilityid}`
      const facilityPassword = store.level2SDK.utilServices.generatePasswordWithParentSK({password: facilityKey})
      const facilitySK = decryptSK(facilityPassword,esk)
      console.error(facilitySK);
      let halfkey = store.level2SDK.utilServices.base64ToUint8Array(facilityPassword)
      let pkOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
      let skOfFacilityToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(facilitySK)      
      await Promise.all(
        edge1200s.map(async(edge)=>{
          if (edge.eesak) {
            return
          }
          const evidVertexresp = await retrieveVertex(edge?.evid)
          const evidVertex = evidVertexresp?.data?.vertex?.[0]
          let pkOfStaffToUint8Array = evidVertex?.pk
          if(halfkey){
            const eesak = store.level2SDK.utilServices.aKeyEncrypt(
              pkOfStaffToUint8Array,
              skOfFacilityToUint8Array,
              halfkey
            )
            const besak = store.level2SDK.utilServices.aKeyEncrypt(
              pkOfFacilityToUint8Array,
              skOfFacilityToUint8Array,
              halfkey
            )
            
            const {data} = await store.level2SDK.edgeServices.updateEdge({
              id: edge.eid,
              type: 1200,
              eesak,
              besak,
              name: edge.name,
            })
            log.debug(`%c[update 1200 edge]`, `color:#e50087;`,data)
          }
        })
      )
  },
  async updateLocationDoc(
    id:string,
  ) {
    const ownerPk = localStorage.getItem('pk')
    const ownerSk = localStorage.getItem('sk')
    const ownerId = localStorage.getItem('user_vid')
    const facilityResponse = await retrieveVertex(id)
    const currentFacility = facilityResponse.data.vertex[0]
    if(ownerPk && ownerSk && ownerId){

      //change jwt to facility
      await store.level2SDK.edgeServices.createEdge({
        bvid: id,
        type: 1030,
      })
      
      //get locations vertex 
      const locationOptions = {
        ObjType: 4,
        xfname: 'E.bvid',
        scondition: "E.type=1100 AND V.type!=20"
      }
      const locationResponse = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [id],
        options: locationOptions
      })
      const locations = locationResponse.data.vertex
      
      //update locations sk,pk and esk
      const locationAll = await Promise.all(
        locations.map(async(location)=>{
          const {...locationOptions} = location
          const locationId = store.level2SDK.utilServices.uint8ArrayToBase64(locationOptions?.id)
    
          return {
            pk: location.pk,
            esk: location.esk,
            id: locationId,
            location: location.name.basicInfo.location,
            locationID: location.name.basicInfo.locationID,
            medicalFacilityName: location.name.basicInfo.medicalFacilityName,
            phoneNumber: location.name.basicInfo.phoneNumber,
          }

        })
      )

      //change jwt to facility
      await store.level2SDK.edgeServices.createEdge({
        bvid: id,
        type: 1030,
      })
      //get 38401 doc
      const docOptions = {
        type: 38401,
        xfname: 'ovid',
        maxcount: 1
      }
      const docResponse = await store.level2SDK.documentServices.retrieveDocument({
        idList: [id],
        options: docOptions,
      })
      const doc38401 = docResponse.data.document[0]
      if(doc38401){
        const decryptedDoc = await documentToNote({ document: doc38401 })
        const {
          id: docId,
          eid,
          name,
          subtype: dTypeProps,
          ...restOfDocOptions
        } = decryptedDoc
        name.data.allLocation = locationAll 
        const response = await Document.update(docId, {
          edge_id: decryptedDoc.eid,
          content: name?.data,
          mediaType: name?.type,
          title: name?.title,
          targetRoomName: name?.targetRoomName,
          tags: name?.tags,
          user: name?.user,
          sesk: name?.sesk,
          sfname: name?.sfname,
          aesk: name?.aesk,
          tage: restOfDocOptions?.tage,
          type: restOfDocOptions?.type,
          fid: restOfDocOptions?.fid,
          reid: restOfDocOptions?.reid,
          jwt: restOfDocOptions?.jwt,
          dTypeProps,
        })
        log.debug(`%c[update 38401 Doc]`, `color:#e50087;`,response)
      }
      

    }

  },
  decryptAES({ key, message }) {
    const secretKeyUInt8Array =
      store.level2SDK.utilServices.normalizeStringTo32BitArray(key)
    const encryptedDataUInt8Array =
      store.level2SDK.utilServices.base64ToUint8Array(message)

    const sk = store.level2SDK.utilServices.sKeyDecrypt(
      secretKeyUInt8Array,
      encryptedDataUInt8Array,
    )

    let skBase64
    if (sk instanceof Uint8Array) {
      skBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sk)
    }
    return skBase64
  },
  async decryptFacilityAES({ id,pk,message,saveLocalstorage =false}) {
    
    const currentUserId = localStorage.getItem('user_vid')
    const currentUserSk = localStorage.getItem('sk')
    let rootEdge
    let password
    if(currentUserId && id){
      const idList = [currentUserId,id]
      const requestOptions = {
        xfname: 'evid,bvid',
        type: 1200,
        maxcount: 1,
      }
      const rootEdgeresp = await retrieveEdge(idList, requestOptions)
      rootEdge = rootEdgeresp?.data?.edge?.[0]
    }

    if(!rootEdge && !pk && !message){
      await updateAdminByFacility(id,saveLocalstorage)
      return
    }

    // await updateRoom(id,message)

    if(rootEdge && !pk && !message ){
      return 
    }
  
    if(rootEdge && rootEdge.eesak && currentUserSk && pk){
      const recvSecretKey = store.level2SDK.utilServices.base64ToUint8Array(currentUserSk)
      const sendPublicKey = store.level2SDK.utilServices.base64ToUint8Array(pk)
      let eData = new Uint8Array(rootEdge?.eesak)
      let halfkey = store.level2SDK.utilServices.aKeyDecrypt(
        sendPublicKey,
        recvSecretKey,
        eData,
      )
      if(halfkey){
        password = store.level2SDK.utilServices.uint8ArrayToBase64(halfkey)
      }
    }else{
      const key = `${localStorage.getItem('sk')}${id}`
      password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: key})
    }
    if(password){
      const secretKeyUInt8Array =
        store.level2SDK.utilServices.normalizeStringTo32BitArray(password)
      const encryptedDataUInt8Array =
        store.level2SDK.utilServices.base64ToUint8Array(message)

      const sk = store.level2SDK.utilServices.sKeyDecrypt(
        secretKeyUInt8Array,
        encryptedDataUInt8Array,
      )

      let skBase64
      if (sk instanceof Uint8Array) {
        skBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sk)
      }
      if(saveLocalstorage && skBase64 && pk){
        localStorage.setItem('facility_sk',skBase64)
        localStorage.setItem('facility_pk',pk)
      }
      return skBase64
    }
    return
  },
  decryptLocationAES({ id,type, message,saveLocalstorage =false}) {
    let key
    if(type == 20){
      key = `${localStorage.getItem('sk')}${id}`
    }else if(type === 21){
      key = `${localStorage.getItem('facility_sk')}${id}`
    }else if(type === 30){
      key = `${localStorage.getItem('location_sk')}${id}`
    }
    if(message && key){
      const password = store.level2SDK.utilServices.generatePasswordWithParentSK({password: key})
      const secretKeyUInt8Array =
        store.level2SDK.utilServices.normalizeStringTo32BitArray(password)
      const encryptedDataUInt8Array =
        store.level2SDK.utilServices.base64ToUint8Array(message)

      const sk = store.level2SDK.utilServices.sKeyDecrypt(
        secretKeyUInt8Array,
        encryptedDataUInt8Array,
      )

      let skBase64
      if (sk instanceof Uint8Array) {
        skBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sk)
      }
      if(saveLocalstorage){
        if(type == 20){
          localStorage.setItem('facility_sk',skBase64)
        }else if(type === 21){
          localStorage.setItem('location_sk',skBase64)
        }else if(type === 30){
          localStorage.setItem('room_sk',skBase64)
        }
      }
      return skBase64
    }
  },
  encryptAES({ key, message }) {
    const secretKeyUInt8Array =
      store.level2SDK.utilServices.normalizeStringTo32BitArray(key)
    const encryptedDataUInt8Array =
      store.level2SDK.utilServices.base64ToUint8Array(message)
    const sk = store.level2SDK.utilServices.sKeyEncrypt(
      secretKeyUInt8Array,
      encryptedDataUInt8Array,
    )
    let skBase64
    if (sk instanceof Uint8Array) {
      skBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(sk)
    }
    return skBase64
  },

  decryptASK({ sendPk, recvSk, eData }) {
    const pkUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(sendPk)
    const skUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(recvSk)

    return store.level2SDK.utilServices.aKeyDecrypt_str(
      pkUInt8Array,
      skUInt8Array,
      eData,
    )
  },
  encryptASK({ recvPk, sendSk, data }) {
    const pkUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(recvPk)
    const skUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(sendSk)

    return store.level2SDK.utilServices.aKeyEncrypt_str(
      pkUInt8Array,
      skUInt8Array,
      data,
    )
  },

  skCheck({ pk, sk }) {
    let pkUInt8Array = pk
    let skDataUInt8Array = sk
    let isValid

    if (typeof pk === 'string') {
      try {
        pkUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
      } catch (error) {
        isValid = false
      }
    }
    if (typeof sk === 'string') {
      try {
        skDataUInt8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
      } catch (error) {
        isValid = false
      }
    }
    try {
      isValid = store.level2SDK.utilServices.aKeyCheck(
        pkUInt8Array,
        skDataUInt8Array,
      )
    } catch (error) {
      isValid = false
    }

    return isValid
  },

  /**
   *
   * @param sk
   *
   * Generates an esak that can be used as the besak or eesak 
   of an edge
   */
  generateESAK({ pk }: { pk: string }): string {
    const secretKey = localStorage.getItem('sk')
    if (pk === null) {
      throw new AiTmedError({
        name: 'ERROR_CREATING_ESAK',
      })
    }
    if (secretKey === null) {
      throw new AiTmedError({
        name: 'LOGIN_REQUIRED',
        message:
          'There is no secretKey present in localStorage. Please log In.',
      })
    }

    let pkToUint8Array
    if (typeof pk === 'string') {
      pkToUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
    } else {
      pkToUint8Array = pk
    }
    const skToUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(secretKey)
    const symmetricKey = store.level2SDK.utilServices.generateSKey()
    const partialKey = symmetricKey.slice(0, 16)

    const esak = store.level2SDK.utilServices.aKeyEncrypt(
      pkToUint8Array,
      skToUint8Array,
      partialKey,
    )
    const esakBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(esak)
    return esakBase64
  },

  /**
   *
   * @param {esak, publicKey, data}
   *
   * Decrypts data using assymetric decryption and the esak provided
   */
  decryptData({
    esak,
    publicKey,
    secretKey,
    data,
  }: {
    esak: Uint8Array | string
    publicKey: string
    secretKey: string
    data: Uint8Array
  }): Uint8Array {
    if (publicKey === null) {
      throw new AiTmedError({
        name: 'LOGIN_REQUIRED',
        message:
          'There is no publicKey present in localStorage. Please log In.',
      })
    }
    if (secretKey === null) {
      throw new AiTmedError({
        name: 'LOGIN_REQUIRED',
        message:
          'There is no secretKey present in localStorage. Please log In.',
      })
    }
    let esakUint8Array: Uint8Array
    if (typeof esak === 'string') {
      esakUint8Array = store.level2SDK.utilServices.base64ToUint8Array(esak)
    } else {
      esakUint8Array = esak
    }
    const pkToUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(publicKey)
    const skToUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(secretKey)
    const partialKey = store.level2SDK.utilServices.aKeyDecrypt(
      pkToUint8Array,
      skToUint8Array,
      esakUint8Array,
    )
    const sak = sha256().update(partialKey).digest()
    const sakUint8Array = new Uint8Array(sak)
    const decryptedDataUint8Array = store.level2SDK.utilServices.sKeyDecrypt(
      sakUint8Array,
      data,
    )
    if (decryptedDataUint8Array !== null) {
      return decryptedDataUint8Array
    } else {
      throw new AiTmedError({ name: 'ERROR_DECRYPTING_DATA' })
    }
  },

  /**
   *
   * @param {esak, publicKey, secretKey}
   *
   * Assymetrically decrypts the besak || eesak
   */
  decryptESAK({
    esak,
    publicKey,
    secretKey,
  }: {
    esak: Uint8Array | string
    publicKey: string
    secretKey: string
  }): string {
    if (publicKey === null) {
      throw new AiTmedError({
        name: 'LOGIN_REQUIRED',
        message:
          'There is no publicKey present in localStorage. Please log In.',
      })
    }
    if (secretKey === null) {
      throw new AiTmedError({
        name: 'LOGIN_REQUIRED',
        message:
          'There is no secretKey present in localStorage. Please log In.',
      })
    }
    let esakUint8Array: Uint8Array
    if (typeof esak === 'string') {
      esakUint8Array = store.level2SDK.utilServices.base64ToUint8Array(esak)
    } else {
      esakUint8Array = esak
    }
    const pkToUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(publicKey)
    const skToUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(secretKey)
    const partialKey = store.level2SDK.utilServices.aKeyDecrypt(
      pkToUint8Array,
      skToUint8Array,
      esakUint8Array,
    )
    const sak = sha256().update(partialKey).digest()
    const sakUint8Array = new Uint8Array(sak)
    const sakBase64 =
      store.level2SDK.utilServices.uint8ArrayToBase64(sakUint8Array)
    return sakBase64
  },
  /**
   *
   * @param {id}
   *
   * Checks whether an edge is encrypted or not.
   */
  async isEdgeEncrypted({ id }: { id: string }): Promise<boolean> {
    const resp = await retrieveEdge(id)
    const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

    if (edge?.besak || edge?.eesak) return true
    return false
  },

  async getSAKFromEdge({ id }: { id: string }): Promise<string> {
    const resp = await retrieveEdge(id)
    const edge = resp?.data?.edge?.length ? resp.data.edge[0] : null
    if (!edge) throw new AiTmedError({ name: 'EDGE_DOES_NOT_EXIST' })

    //WIP:
    //Should return the sak from the edge associated with the given id.

    return ''
  },
  // 生成 pk 和 sk 
  generateKeyPair(): {
    pk: string,
    sk: string
  } {
    const { publicKey, secretKey } = store.level2SDK.utilServices.generateAKey()
    return {
      pk: store.level2SDK.utilServices.uint8ArrayToBase64(publicKey),
      sk: store.level2SDK.utilServices.uint8ArrayToBase64(secretKey)
    }
  },
  // 用自己的sk 和 对方的pk 来解密 sk， 起始就是把 sk当作halfkey
  encryptSk ({pk, sk}:{
    pk: string,
    sk: string
  }) {
    const pkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
    const skUint8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
    const esak = store.level2SDK.utilServices.aKeyEncrypt( pkUint8Array, skUint8Array, skUint8Array )
    return store.level2SDK.utilServices.uint8ArrayToBase64(esak)
  },
  // 对方的 pk 自己临时生成的sk ， 去解密 esak
  decryptSk({pk,sk,esak}: {
    pk:  string, 
    sk: string,
    esak: string
  }) {
    const pkUint8Array = store.level2SDK.utilServices.base64ToUint8Array(pk)
    const skUint8Array = store.level2SDK.utilServices.base64ToUint8Array(sk)
    const esakUint8Array = store.level2SDK.utilServices.base64ToUint8Array(esak)
    const key = store.level2SDK.utilServices.aKeyDecrypt(
      pkUint8Array,
      skUint8Array,
      esakUint8Array,
    )
    return store.level2SDK.utilServices.uint8ArrayToBase64(key!)
  },
  async updateEskSign({sk,vertex}){
    if(sk && vertex){
      const edgeOptions = {
        bvid: vertex,
        type: 1030
      }
      const edgeObj = await store.level2SDK.edgeServices.createEdge(edgeOptions)
      const { data } = await store.level2SDK.vertexServices.retrieveVertex(vertex)
      const vertexObj = replaceUint8ArrayWithBase64(data.vertex[0])
      log.debug('test9',vertexObj)
      if(!vertexObj.name.eskSign){
        const { pkSign, skSign } = store.level2SDK.utilServices.generateSignatureKeyPair()
        const secretKey = store.level2SDK.utilServices.base64ToUint8Array(sk)
        const eskSign = store.level2SDK.utilServices.sKeyEncrypt(secretKey, skSign) 
        const pkSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(pkSign)
        const eskSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(eskSign)
        const content = {
          ...vertexObj.name,
          pkSign: pkSignBase64,
          eskSign: eskSignBase64
        }
        vertexObj.name = content
        const { data } = await store.level2SDK.vertexServices.updateVertex({
          ...vertexObj,
          id: vertex
        })
        localStorage.removeItem('jwt')
        localStorage.removeItem('vcjwt')
        return [data.vertex]
      }
    }
    return
  },
  generateAKey(){
    const res1 = store.level2SDK.utilServices.generateAKey()
    publicKey = res1.publicKey
    secretKey = res1.secretKey
    const res2 = store.level2SDK.utilServices.generateSignatureKeyPair()
    pkSign = res2.pkSign
    skSign = res2.skSign
  },
  generatePK(){
    if(publicKey) {
      return store.level2SDK.utilServices.uint8ArrayToBase64(publicKey)
    }
  },
  generatESK({key}){
    if(key && secretKey){
      const encryptedSecretKey = store.level2SDK.utilServices.encryptSecretKeyWithPassword({
        password: key,
        secretKey,
      })
      return store.level2SDK.utilServices.uint8ArrayToBase64(encryptedSecretKey)
    }
  },
  generateESKSign(){
    if(secretKey && skSign){
      const eskSign = store.level2SDK.utilServices.sKeyEncrypt(secretKey, skSign)
      return store.level2SDK.utilServices.uint8ArrayToBase64(eskSign)
    }
  },
  generatPKSign(){
    if(pkSign) {
      return store.level2SDK.utilServices.uint8ArrayToBase64(pkSign)
    }
  }
}
