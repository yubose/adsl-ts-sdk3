import * as u from '@jsmanifest/utils'
import get from 'lodash/get'
import cloneDeep from 'lodash/cloneDeep'
import { Account } from '../../services'
import { isObject } from '../../utils'
import store from '../../common/store'
import encryptionServices from './ecc'
import stringServices from './string'
import indexdbServices from './indexdb'
import objectServices from './object'
import arrayServices from './array'
import csv from './csv'
import numberService from './number'
import dateService from './date'
import searchService from './search'
import elasticSearchService from "./elasticsearch"
import apiRequestService from './apiRequest'
import ecosRequestService from './ecosRequest'
import notificationServices from './notification'
import shippingServices from './shipping'
import ecos from './ecos'
import utils, { toast } from './utils'
import log, { skLog } from '../../utils/log'
import { _TEST_ } from '../../utils/common'
import typeCheck from './typeCheck'
import math from './math'
import FCM from './fcm'
import payment from './payment'
import Document from '../../services/Document'
import { retrieveEdge,retrieveDocument,retrieveVertex} from '../../common/retrieve'
import { chatDocumentToNote, documentToNote } from '../../services/Document/utils'
import * as c from '../../constants'
import type { Dispatch } from '../../types'
import { replaceUint8ArrayWithBase64 } from '../utils'
import Axios from 'axios'
import { deleteToken, sendNotification } from '../../utils/NotificationUtils'
import { debounce } from 'lodash'
// import PersonalIndexCtr from '../../db/utils/PersonalIndexCtr'
export { builtIn }

function builtIn({ pageName, apiObject, dispatch }) {
  //TODO: replace when builtInFns allows an argument for fn name
  const pathArr = apiObject.api.split('.').slice(1)
  const builtInFnsObj = builtInFns()
  const builtInFn = get(builtInFnsObj, pathArr)
  return async (input?: any) => {
    //@ts-ignore
    const { dataKey, dataIn, dataOut } = cloneDeep(apiObject || {})
    const currentVal = await dispatch({
      type: c.dispatchActionType.GET_DATA,
      payload: {
        dataKey: dataIn ? dataIn : dataKey,
        pageName,
      },
    })
    let res: any
    try {
      if (_TEST_) {
        log.info(
          `%cBuiltIn Fn:${pathArr} Request `,
          `background: purple; color: white; display: block;`,
          {
            ...currentVal,
            ...input,
          },
        )
      }
      //TODO: make signature more generic
      const data = await builtInFn({
        ...currentVal,
        ...input,
      })
      res = data
      if (_TEST_) {
        log.info(
          `%cBuiltIn Fn:${pathArr} Response`,
          `background: purple; color: white; display: block;`,
          res,
        )
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error(`Error occurred while invoking a builtIn function`, {
        apiObject,
        error: err,
        inputArgs: input,
        path: pathArr,
        pageName,
      })
      throw error
    }
    if ((Array.isArray(res) && res.length > 0) || isObject(res)) {
      await dispatch({
        type: c.dispatchActionType.UPDATE_DATA,
        //TODO: handle case for data is an array or an object
        payload: {
          pageName,
          dataKey: dataOut ? dataOut : dataKey,
          data: res,
        },
      })
    }
    return res
  }
}
/**
 * @param dispatch Function to change the state.
 * @returns Object of builtIn functions.
 */
//TODO: allow argument Fn name
//TODO: consider returning an interface instead
export default function builtInFns(
  args: {
    dispatch?: Function
    processPopulate?: Function
    getPage?: Function
    emit?: Function
    /**
     * Elastic search client
     *
     * See https://github.com/elastic/bower-elasticsearch-js/blob/master/elasticsearch.js
     */
    SearchClient?: InstanceType<any>
  } = {},
) {
  const { dispatch, processPopulate, getPage, emit, SearchClient } = args
  async function notifyMe() {
    if (!('Notification' in window)) {
      toast('Browser cannot support notifications', { type: 'default' })
    } else if (Notification.permission === 'granted') {
      return true
    } else if (Notification.permission === 'denied') {
      await Notification.requestPermission().then((permission) => {
        if (permission === 'granted') return true
      })
    }
    return false
  }
  /**
   * @function
   * @description judge whether a document is a notification
   * @param {document} doc
   * @returns {Document}
   */
  async function isNotification({ doc }) {
    let notifiId = -1
    if (!doc) return false
    let values
    if (dispatch) {
      values = await dispatch({
        type: c.dispatchActionType.GET_DATA,
        payload: { dataKey: 'NotificationMap.notificationDoc' },
      })
    }
    !values && (values = {})
    let timestap = new Date().getTime()
    if (values && u.isObj(values)) {
      if (values?.timeStamp && u.isNil(values.timeStamp)) {
        if (timestap - values.timestamp < 1000) {
          console.error('get double notification doc', doc)
          return false
        }
      }

      if (!doc?.subtype) return false
      let notificationInfo

      if (doc?.name) notificationInfo = doc.name
      let isNotification = doc.subtype?.notification
        ? doc.subtype.notification
        : false
      if (isNotification) {

        const permission = await notifyMe()
        if (permission) {
          let notification = new Notification(
            notificationInfo.notification.title,
            {
              body: notificationInfo.notification.body,
              icon: 'favicon.ico',
              tag: doc.id,
            },
          )
          notification.addEventListener('click', debounce(() => {
            window?.['app'].notification.emit('click', 'notificationDoc')
          },300))
          if (notification) {
            return {
              notificationDoc: {
                ...doc,
                timestap,
              },
            }
          }
        }
        return isNotification
      }
    }
    return false
  }
  const newNotificationService = {
    ...notificationServices,
    isNotification,
  }

  /**
   * @function
   * @description  Resolve the incoming doc ID into a path path and return it
   * @param {any} id
   * @returns {any}
   */
  async function prepareDocToPath(id:string,data?:Object | Blob,outBase64?:boolean) {
    let path
    let type
    let isOutBase64 = u.isNil(outBase64)? false : true
    if (id && typeof id == 'string' && !id.includes('.')) {
      let shouldPass = true
      let cacheIndex
      let base64data
      if (dispatch) {
        const cacheRes = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: {
            apiObject: {
              id,
              func: 'prepareDocToPath'
            },
          },
        })
        shouldPass = cacheRes.pass
        cacheIndex = cacheRes.cacheIndex
        if (!shouldPass) {
          const res = await dispatch({
            type: c.dispatchActionType.GET_CACHE,
            payload: { cacheIndex },
          })
          if (isOutBase64) {
            if (res.base64data) {
               const pageName = window['app'].initPage
               await dispatch({
                 type: c.dispatchActionType.UPDATE_DATA,
                 //TODO: handle case for data is an array or an object
                 payload: {
                   pageName: pageName,
                   dataKey: outBase64,
                   data: `data:image/png;charset=utf8;base64,${res.base64data}`,
                 },
               })
              return res
            }
          } else { 
            return res
          }
        }
      }

      if(data && data instanceof Blob){
        const file = data
        type = file?.type
        path = URL.createObjectURL(file)
      }else{
        const resp =  await retrieveDocument(id)
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        await documentToNote({ document }).then(
          async(note) => {
            if(!note?.name?.data) return
            let blob
            if(note?.name?.data instanceof Blob){
              blob  = note?.name?.data
            }else{
              blob = store.level2SDK.utilServices.base64ToBlob(
                note?.name?.data,
                note?.name?.type,
              )
              if(dispatch && isOutBase64 && note?.name?.data){
                const pageName = window['app'].initPage
                await dispatch({
                  type: c.dispatchActionType.UPDATE_DATA,
                  //TODO: handle case for data is an array or an object
                  payload: {
                    pageName: pageName,
                    dataKey: outBase64,
                    data: `data:image/png;charset=utf8;base64,${note?.name?.data}`,
                  },
                })
                base64data = note?.name?.data
              }
            }

            type = note?.name?.type
            path = URL.createObjectURL(blob)
          },
          (error) => {
            if (store.env === 'test') {
              log.error(error instanceof Error ? error : new Error(String(error)))
            }
          },
        )
      }

      if (dispatch && cacheIndex && path && base64data) {
        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: {
            data: {
              type: type,
              url: path,
              base64data,
            },
            cacheTime: 86400,
            cacheIndex,
          },
        })
      }
      return {
        type: type,
        url: path,
      }
    }else if(data && data instanceof Blob){
      const file = data
      type = file?.type
      path = URL.createObjectURL(file)
      return {
        type: type,
        url: path,
      }
    }
    return
  }

  /**
   * @function
   * @description  Resolve the incoming chat doc ID into a path path and return it
   * @param {string} id
   * @param {Blob} data
   * @returns {any}
   */
  async function prepareChatDocToPath(id:string,data?:Blob) {
    let path
    let type
    if (id && typeof id == 'string' && !id.includes('.')) {
      let shouldPass = true
      let cacheIndex
      if (dispatch) {
        const cacheRes = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: {
            apiObject: {
              id,
              func: 'prepareChatDocToPath'
            },
          },
        })
        shouldPass = cacheRes.pass
        cacheIndex = cacheRes.cacheIndex
        if (!shouldPass) {
          const res = await dispatch({
            type: c.dispatchActionType.GET_CACHE,
            payload: { cacheIndex },
          })
          return res
        }
      }

      if(data && data instanceof Blob){
        const file = data
        type = file?.type
        path = URL.createObjectURL(file)
      }else{
        const resp =  await retrieveDocument(id)
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        await chatDocumentToNote({ document,isToUrl:true}).then(
          (value) => {
            type = document?.name?.type
            path = value
          },
          (error) => {
            if (store.env === 'test') {
              log.error(error instanceof Error ? error : new Error(String(error)))
            }
          },
        )
      }
      
      

      if (dispatch && cacheIndex && path) {
        await dispatch({
          type: c.dispatchActionType.SET_CACHE,
          payload: {
            data: {
              type: type,
              url: path,
            },
            cacheTime: 86400,
            cacheIndex,
          },
        })
      }
      return {
        type: type,
        url: path,
      }
    }
    return
  }

  async function surgeryReportByChatGpt(
    { input,
      reportData,
      question1,
      question2,
      onReportStart,
      onReportAida,
      dataFormat,
      onReportComplete,
      onReportError
    }: {
      input: any,
      reportData: any,
      onReportStart: any,
      onReportAida: any,
      question1:any,
      question2:any,
      dataFormat: any,
      onReportComplete: any,
      onReportError: any
    }) {
      const pageName = window['app'].initPage
      const newPageName = window['app'].initPage
      try{
        if (onReportStart) {
          if (dispatch && newPageName === pageName) {
            log.debug("执行： onStart");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onReportStart, pageName },
            })
          }
        }
        const realQuestion1: string = question1.replace("\$userInput", input);
        let question1Resp: string = ""
        question1Resp = await utils.requestGpt({ chatList: [], userInput: realQuestion1});
        console.error('question1Resp');
        console.error(question1Resp);
        
        if (question1Resp.toLowerCase().includes('false')) {
          throw new Error('this description is not about a medical')
        }
        if (onReportAida) {
          if (dispatch && newPageName === pageName) {
            log.debug("执行： onAida");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onReportAida, pageName },
            })
          }
        }
        let result;
        const realQuestion2: string = question2.replace("\$dataFormat", dataFormat).replace("\$userInput", input);
        result = await utils.requestGpt({ chatList: [], userInput: realQuestion2 });
        if (!result.startsWith("{") || !result.endsWith("}")) {
          // if (onReportError) {
          //   if (dispatch && newPageName === pageName) {
          //     await dispatch({
          //       type: c.dispatchActionType.EVAL_OBJECT,
          //       payload: { updateObject: onReportError, pageName },
          //     })
          //   }
          // }
          // return;
          throw new Error('result is not json')
        }
        const blankText = "";
        // const blankText = "Not Provided";
        const keyList = [
          "dateOfSurgery", "cradinalSymptom", "preOperationDiagnosis", "postOperationDiagnosis",
          "surgicalProcedures", "nameOfSurgeon", "assistantSurgeon", "nameOfAnesthesiologist",
          "typeOfAnesthesia", "complicationsOfSurgery", "intraOperateBleeding", "psCollection",
          "descriptionOfSurgery", "disposition"
        ];
        const map: Record<string, string> = {
          "cradinalSymptom": "CardinalSymptom",
          "preOperationDiagnosis": "PreOpDiagnosis",
          "postOperationDiagnosis": "PostOpDiagnosis",
          "surgicalProcedures": "SurgicalProcedures",
          "typeOfAnesthesia": "TypeOfAnesthesia",
          "complicationsOfSurgery": "ComplicationsOfSurgery",
          "intraOperateBleeding": "IntraOpBleeding",
          "psCollection": "PathologySpecimensCollection",
          "indicationOfSurgery": "IndicationOfSurgery",
          "descriptionOfSurgery": "DescriptionOfSurgery",
          "postOpInstructionRecommendation": "PostOpInstructionRecommendation",
          "nameOfSurgeon": "NameofSurgeon",
          "assistantSurgeon": "AssistantSurgeon",
          "nameOfAnesthesiologist": "NameOfAnesthesiologis",
          "dateOfSurgery": "DateOfSurgery"
        };
        const new_reportData = reportData;
        const root = JSON.parse(result);
        if (root.error && root.error == '-20') {
          throw new Error('result is not a medical related description')
        }
        Object.entries(map).forEach(([key, value]) => {
          new_reportData[key] = root[value] || blankText;
        });
        const valueEmptyVerify = Object.values(new_reportData).every(value => {
          if (Array.isArray(value)) {
            return value.length === 0
          } else if (typeof value === 'string') {
            return value === ''
          } else {
            return true
          }
        }
        )
        if (valueEmptyVerify) {
          throw new Error('all field is empty')
        }
        const diagonsis: any = root?.["Diagnosis"] || blankText;
        new_reportData["diagnosis"]["descriptiveList"] = diagonsis;
        const ICD10: any = root?.["ICD10"]||[]
        for(let v of ICD10){
          let o = {"code": v.code,"description": v.description}
          new_reportData["ICD10"].push(o);
        }
        if (Array.isArray((root?.["DescriptionOfSurgery"])) && root?.["DescriptionOfSurgery"].length > 1 ) {
          new_reportData["descriptionOfSurgery"] = root?.["DescriptionOfSurgery"].join('\n\n')
        }
        if (Array.isArray((root?.["PostOpInstructionRecommendation"])) && root?.["PostOpInstructionRecommendation"].length > 1 ) {
          new_reportData["postOpInstructionRecommendation"] = root?.["PostOpInstructionRecommendation"].join('\n\n')
        }
        console.error('new_reportData');
        console.error(new_reportData);
        if (onReportComplete) {
          if (dispatch && newPageName === pageName) {
            log.debug("执行： onComplete");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onReportComplete, pageName },
            })
          }
        }
        return new_reportData;
      }catch(error){
        console.error(`error: ${error}`);
        if (onReportError) {
          if (dispatch && newPageName === pageName) {
            console.error("执行： onError");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onReportError, pageName },
            })
            // throw "执行： onError"
          }
        }
        return;
      }
  }
  async function patdAccountStatus(phoneNumber, cacheTime?: number) {
    let shouldPass: boolean = true
    let cacheIndex
    if (dispatch) {
      const cacheRes = await dispatch({
        type: c.dispatchActionType.SET_API_BUFFER,
        payload: {
          apiObject: {
            phoneNumber,
            funName: 'patdAccountStatus',
          },
        },
      })
      shouldPass = cacheRes.pass
      cacheIndex = cacheRes.cacheIndex
      if (!shouldPass) {
        const res = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        return res
      }
    }
    if (!phoneNumber) return 'Unregistered'
    const patdVertexResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [],
      options: {
        xfname: 'none',
        scondition: `uid like '%${phoneNumber}%'`,
        maxcount: 1,
      },
    })
    const re = patdVertexResp.data.vertex.length ? 'Active' : 'Unregistered'
    if (dispatch && cacheIndex) {
      await dispatch({
        type: c.dispatchActionType.SET_CACHE,
        payload: {
          data: re,
          cacheIndex,
          cacheTime,
        },
      })
    }
    return re
  }

  async function downloadChatDoc({doc,fileName}:{doc: object, fileName?: string}) {
    let downloadLink = ''
    try {
      let shouldPass
      let cacheIndex
      if (dispatch && doc?.['id']) {
        const cacheChatDocRes = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: {
            apiObject: {
              id:doc?.['id'],
              func: 'prepareChatDocToPath'
            },
          },
        })
        const cacheDocRes = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: {
            apiObject: {
              id:doc?.['id'],
              func: 'prepareDocToPath'
            },
          },
        })

        if (!cacheChatDocRes?.pass) {
          const res = await dispatch({
            type: c.dispatchActionType.GET_CACHE,
            payload: { cacheIndex: cacheChatDocRes.cacheIndex },
          })
          downloadLink = res.url
        }else if(!cacheDocRes.pass){
          const res = await dispatch({
            type: c.dispatchActionType.GET_CACHE,
            payload: { cacheIndex:cacheDocRes.cacheIndex },
          })
          downloadLink = res.url
        }else{
          const resp =  await retrieveDocument(doc['id'])
          const document = resp?.data?.document?.length
            ? resp?.data?.document[0]
            : null
            downloadLink = await chatDocumentToNote({ document,isToUrl:true})
        }
      }

      let a = document.createElement('a')
      downloadLink && (a.href = downloadLink)
  
      // Attempt to default to the original file name
      if (!fileName) {
        a.download = 'default.jpeg'
      } else {
        a.download = fileName
      }
  
      a.click()
      return true
      // a.remove()
    } catch (error) {
      throw error
    }
    return false
  }
  async function aiReportByGptAndTranscription(
    { 
      onTranscriptionStart,
      onTranscriptionComplete,
      onTranscriptionError
    }: {
      onTranscriptionStart: any,
      onTranscriptionComplete: any,
      onTranscriptionError: any
    }) {
      const pageName = window['app'].initPage
      const newPageName = window['app'].initPage
      try{
        if (onTranscriptionStart) {
          if (dispatch && newPageName === pageName) {
            log.debug("执行： onTranscriptionStart");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onTranscriptionStart, pageName },
            })
          }
        }
        if (onTranscriptionComplete) {
          if (dispatch && newPageName === pageName) {
            log.debug("执行： onTranscriptionComplete");
            await dispatch({
              type: c.dispatchActionType.EVAL_OBJECT,
              payload: { updateObject: onTranscriptionComplete, pageName },
            })
          }
        }
      }catch(error:any){
        if (onTranscriptionError) {
          if (dispatch && newPageName === pageName) {
            if(!error.message.includes("canceled")){
              console.error("执行： onTranscriptionError");
              await dispatch({
                type: c.dispatchActionType.EVAL_OBJECT,
                payload: { updateObject: onTranscriptionError, pageName },
              })
            }
            // throw "执行： onError"
          }
        }
        return;
      }
  }
  const newUtilsService = {
    ...utils,
    prepareDocToPath,
    prepareChatDocToPath,
    patdAccountStatus,
    surgeryReportByChatGpt,
    downloadChatDoc,
    aiReportByGptAndTranscription
  }


  async function countRoomOfFacility(facilityId: string, cacheTime?: number) {
    let shouldPass: boolean = true
    let cacheIndex
    if (dispatch) {
      const cacheRes = await dispatch({
        type: c.dispatchActionType.SET_API_BUFFER,
        payload: {
          apiObject: {
            facilityId,
            funName: 'countRoomOfFacility',
          },
        },
      })
      shouldPass = cacheRes.pass
      cacheIndex = cacheRes.cacheIndex
      if (!shouldPass) {
        const res = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        return res
      }
    }
    const locationResp =
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [facilityId],
        options: {
          type: 38401,
          xfname: 'ovid',
          maxcount: 1,
          obfname: 'mtime',
        },
      })
    // const note =
    const location = await documentToNote({
      document: locationResp?.data?.document[0],
    })
    const locationIDList = location?.name?.data?.allLocation.map(
      (locationObj) => locationObj.id,
    )
    const roomResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: locationIDList,
      options: {
        ObjType: 4,
        xfname: 'E.Bvid',
        scondition: 'E.type=1100 AND E.tage!=-2 AND V.type=30',
      },
    })
    const re = roomResp.data.vertex
      ? roomResp?.data?.vertex.length.toString()
      : 0
    if (dispatch && cacheIndex) {
      await dispatch({
        type: c.dispatchActionType.SET_CACHE,
        payload: {
          data: re,
          cacheIndex,
          cacheTime,
        },
      })
    }
    return re
  }
  async function countProviderOfFacility(
    facilityId: string,
    cacheTime?: number,
  ) {
    let shouldPass: boolean = true
    let cacheIndex
    if (dispatch) {
      const cacheRes = await dispatch({
        type: c.dispatchActionType.SET_API_BUFFER,
        payload: {
          apiObject: {
            facilityId,
            funName: 'countProviderOfFacility',
          },
        },
      })
      shouldPass = cacheRes.pass
      cacheIndex = cacheRes.cacheIndex
      if (!shouldPass) {
        const res = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        return res
      }
    }
    const providerResp =
      await store.level2SDK.documentServices.retrieveDocument({
        idList: [facilityId],
        options: {
          ObjType: 12,
          type: 35841,
          scondition:
            'E.type in (10002,-10002) AND E.subtype&0xf0000=0x30000 AND E.tage in (1,-5)',
          xfname: 'E.bvid|E.evid',
          maxcount: 1000,
          obfname: 'mtime',
        },
      })
    const re = providerResp.data.document
      ? providerResp?.data?.document.length.toString()
      : 0
    if (dispatch && cacheIndex) {
      await dispatch({
        type: c.dispatchActionType.SET_CACHE,
        payload: {
          data: re,
          cacheIndex,
          cacheTime,
        },
      })
    }
    return re
  }
  async function obtainAccountStatus(edgeID: string, cacheTime?: number) {
    let shouldPass: boolean = true
    let cacheIndex
    if (dispatch) {
      const cacheRes = await dispatch({
        type: c.dispatchActionType.SET_API_BUFFER,
        payload: {
          apiObject: {
            edgeID,
            funName: 'obtainAccountStatus',
          },
        },
      })
      shouldPass = cacheRes.pass
      cacheIndex = cacheRes.cacheIndex
      if (!shouldPass) {
        const res = await dispatch({
          type: c.dispatchActionType.GET_CACHE,
          payload: { cacheIndex },
        })
        return res
      }
    }
    let re = ''
    // get edge
    const edgeResp = await store.level2SDK.edgeServices.retrieveEdge({
      idList: [edgeID],
      options: {
        xfname: 'E.id',
        ObjType: 28,
        sfname: "{\"result\":\"E.*\", \"join\": \"INNER JOIN Vertex V on V.id=E.bvid OR V.id=E.evid\"}",
        scondition: "E.type in (10002, -10002, 1100, 1200) AND V.type=20",
        maxcount: 1
      },
    })
    const vertexID = await store.level2SDK.utilServices.uint8ArrayToBase64(
      edgeResp.data.edge?.[0].bvid,
    )
    let userID =
      vertexID === localStorage.getItem('facility_vid')?.toString()
        ? store.level2SDK.utilServices.uint8ArrayToBase64(
            edgeResp.data.edge?.[0].evid,
          )
        : store.level2SDK.utilServices.uint8ArrayToBase64(
            edgeResp.data.edge?.[0].bvid,
          )
    const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [userID],
      options: {
        xfname: 'id',
      },
    })
    if (vertexResp.data.vertex?.[0].type < 0) {
      re = 'Deleted'
    } else if (edgeResp.data.edge?.[0].type === 10000) {
      const connectEdge = await store.level2SDK.edgeServices.retrieveEdge({
        idList: [vertexID, localStorage.getItem('facility_vid')?.toString()],
        options: {
          ObjType: 28,
          sfname:
            '{"result":"E.*", "join": "INNER JOIN Vertex V on V.id = E.evid OR V.id = E.bvid"}',
          xfname: '(E.evid,E.bvid)|(E.bvid,E.evid)',
          type: 10002,
          obfname: 'E.mtime',
        },
      })
      re = connectEdge.data.edge?.[0]?.tage === -5 ? 'Inactive' : 'Active'
    } else {
      re = 'Active'
    }
    // const re = (vertexResp.data.vertex?.[0].type === 1) ? "Active" : "Deleted"
    // if (edgeResp.data.edge?.[0].type === 10000) {
    //   const connectEdge = await store.level2SDK.edgeServices.retrieveEdge({
    //     idList: [vertexID, localStorage.getItem("facility_vid")?.toString()],
    //     options: {
    //       ObjType: 28,
    //       sfname: "{\"result\":\"E.*\", \"join\": \"INNER JOIN Vertex V on V.id = E.evid OR V.id = E.bvid\"}",
    //       xfname: "(E.evid,E.bvid)|(E.bvid,E.evid)",
    //       type: 10002,
    //       obfname: "E.mtime",
    //     }
    //   })
    //   if (connectEdge.data.edge?.[0]?.tage === -5) return "Inactive"
    // }
    // get the vertex which is not facility
    // const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
    //   idList: [userID],
    //   options: {
    //     xfname: "id",
    //   },
    // })
    // const re = (vertexResp.data.vertex?.[0].type === 1) ? "Active" : "Deleted"
    if (dispatch && cacheIndex) {
      await dispatch({
        type: c.dispatchActionType.SET_CACHE,
        payload: {
          data: re,
          cacheIndex,
          cacheTime,
        },
      })
    }
    return re
  }

  function uploadChatImage({id,url,url2,sig,sig2,data,cpData}:{
    id:string,
    url:string,
    url2?: string
    sig:string,
    sig2?:string,
    data:string|Uint8Array,
    cpData?: string|Uint8Array,
  }){
      if(u.isStr(id) && id.startsWith('=')) return
      window['app'].uploadProgress.emitProgress(id,0)
      setTimeout(async()=>{
          try{
            await Axios({
                method: 'put',
                url: `${url2}?${sig2}`,
                data,
                onUploadProgress(progressEvent) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)*0.7
                    window['app'].uploadProgress.emitProgress(id,percentCompleted)
                    log.debug(`Upload Progress: ${percentCompleted}%`)
                },
            })

            await Axios({
              method: 'put',
              url: `${url}?${sig}`,
              data: cpData,
              onUploadProgress(progressEvent) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)*0.2+70
                window['app'].uploadProgress.emitProgress(id,percentCompleted)
                log.debug(`Upload Progress: ${percentCompleted}%`)
            },
            })

            const resp =  await retrieveDocument(id)
            const document = resp?.data?.document?.length
              ? resp?.data?.document[0]
              : null
            const newDoc = replaceUint8ArrayWithBase64(document)
            const subtypeValue  = document.subtype | (1 << 7)
            window['app'].uploadProgress.emitProgress(id,95)
            await store.level2SDK.documentServices.updateDocument({
              ...newDoc,
              id: newDoc.id,
              tage: -1,
              subtype: subtypeValue
        
            })
            const notification = newDoc?.name?.notification
            const ringToneNotify = !!(subtypeValue & (1 << 8))
            const uid = localStorage.getItem('user_vid')
            if(uid){
              const payload = {
                uuid: "",
                eid: newDoc?.eid,
                uid,
                message: {
                  did: JSON.stringify({...newDoc,subtype: subtypeValue}),
                  type: ringToneNotify?"ringtong":"message",
                  openApp: "true",
                  onClickLandingPage: notification?.onClickLandingPage?notification?.onClickLandingPage:"",
                  title: notification?.title?notification?.title:"",
                  // context: notification?.context,
                  body: notification?.body || notification?.context,
                  targetApp: newDoc?.fid,
                },
                delay: newDoc?.tage?newDoc?.tage:0
              }
              await sendNotification(payload)
            }
            
            window['app'].uploadProgress.emitProgress(id,101)

            if(dispatch){
              const updateChatInfoDoc = await dispatch({
                type: c.dispatchActionType.GET_DATA,
                payload: {
                  dataKey: 'ChatMessage.event.updateChatInfoDoc',
                },
              })

              await dispatch({
                type: c.dispatchActionType.EVAL_OBJECT,
                payload: { pageName: 'ChatMessage', updateObject: updateChatInfoDoc },
              })
            }
        
          }catch(error){
            console.error(error)
            window['app'].uploadProgress.emitProgress(id,101)
          }
                
      },0)
      
  }

  const newEcos = {
    ...ecos,
    countProviderOfFacility,
    countRoomOfFacility,
    obtainAccountStatus,
    uploadChatImage
  }

  async function minRingtoneVibrate({ delayTime = 50000, actions }) {
    const pageName = window['app'].initPage
    const timerId = setTimeout(async () => {
      const newPageName = window['app'].initPage
      if (dispatch && newPageName === pageName) {
        const result = await dispatch({
          type: c.dispatchActionType.EVAL_OBJECT,
          payload: { updateObject: actions, pageName },
        })
      }
      clearTimeout(timerId)
    }, delayTime)
  };

  function stopRingtone(){
    window['ringTong']?.stop?.()
  }

  return {
    string: stringServices,
    eccNaCl: encryptionServices,
    object: objectServices,
    indexdb: indexdbServices,
    array: arrayServices,
    csv: csv,
    number: numberService,
    date: dateService,
    search: searchService({ SearchClient }),
    elasticsearch: elasticSearchService,
    apiRequest: apiRequestService,
    ecosRequest: ecosRequestService,
    notification: newNotificationService,
    shipping: shippingServices({ dispatch: dispatch! as Dispatch }),
    typeCheck,
    ecos: newEcos,
    utils: newUtilsService,
    math,
    FCM,
    payment,
    phoneService: {
      minRingtoneVibrate,
      stopRingtone
    },
    async getRootNotebook(args) {
      let idList: string[] | Uint8Array[] = []

      const { id, maxcount, sCondition, type, ...populatedCurrentVal } = args
      let requestOptions = {
        ...populatedCurrentVal,
      }
      if (maxcount) {
        requestOptions.maxcount = parseInt(maxcount)
      }
      if (type) {
        requestOptions.type = parseInt(type)
      }
      if (sCondition) {
        requestOptions.scondition = sCondition
      }
      idList = Array.isArray(id) ? [...id] : [id]
      async function getRoot(idList, requestOptions) {
        const resp = await retrieveEdge(
          idList?.filter?.(Boolean) || [],
          requestOptions,
        )
        return resp?.data
      }
      let data = await getRoot(idList, requestOptions)
      while (data?.edge?.length == 0) {
        data = await getRoot(idList, requestOptions)
      }

      return data
    },
    async getCacheByKey(payload){
      if (dispatch) {
        const {pass,cacheIndex} = await dispatch({
          type: c.dispatchActionType.SET_API_BUFFER,
          payload: payload
        })
        if (!pass) {
          const res = await dispatch({
            type: c.dispatchActionType.GET_CACHE,
            payload: { cacheIndex },
          })
          return res
        }
      }
      return
    },
    async createNewAccount(args) {
      const { phoneNumber, password, userName, firstName, lastName, fullName,email } =
        args.name
      let validPhoneNumber
      if (phoneNumber.includes('-')) {
        validPhoneNumber = phoneNumber.replace(/-/g, '')
      } else {
        validPhoneNumber = phoneNumber
      }
      validPhoneNumber = args.name.countryCode + ' ' + validPhoneNumber
      const data = await Account.create(
        validPhoneNumber,
        password,
        args.name?.verificationCode,
        { userName, firstName, lastName, fullName,email,status: 0},
        args.type,
      )
      let sk = localStorage.getItem('sk')
      if (dispatch) {
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName: 'builtIn',
            dataKey: 'builtIn.UserVertex',
            data: { ...data, sk },
          },
        })
      }
      return data
    },
    async createNewAccountNoModifyKey(args) {
      const { phoneNumber, password, userName, firstName, lastName, fullName, email } =
        args.name
      let validPhoneNumber
      if (phoneNumber.includes('-')) {
        validPhoneNumber = phoneNumber.replace(/-/g, '')
      } else {
        validPhoneNumber = phoneNumber
      }
      validPhoneNumber = args.name.countryCode + ' ' + validPhoneNumber
      const data = await Account.createNoModifyKey(
        validPhoneNumber,
        password,
        args.name?.verificationCode,
        { userName, firstName, lastName, fullName, email },
        args.type,
      )
      let sk = localStorage.getItem('sk')
      if (dispatch) {
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName: 'builtIn',
            dataKey: 'builtIn.UserVertex',
            data: { ...data, sk },
          },
        })
      }
      return data
    },
    async signIn({ phoneNumber, password, verificationCode }) {
      log.debug(`[builtIn.signIn]`, arguments[0])
      let validPhoneNumber
      if (phoneNumber.includes('-')) {
        validPhoneNumber = phoneNumber.replace(/-/g, '')
      } else {
        validPhoneNumber = phoneNumber
      }
      const data = await Account.login(
        validPhoneNumber,
        password,
        verificationCode,
      )
      let sk = localStorage.getItem('sk')
      if (dispatch) {
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName: 'builtIn',
            dataKey: 'builtIn.UserVertex',
            data: { ...data, sk },
          },
        })
      }
      return data
    },
    async loginByPassword(password) {
      const data = await Account.loginByPassword(password)
      let sk = localStorage.getItem('sk')
      if (dispatch) {
        log.debug(`[builtIn.loginByPassword]`, {
          password: arguments[0],
          data,
          sk,
        })
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            pageName: 'builtIn',
            dataKey: 'builtIn.UserVertex',
            data: { ...data, sk },
          },
        })
      }
    },
    async storeCredentials({ pk, sk, esk, userId, facilityId }) {
      if (!u.isBrowser()) return
      sk && localStorage.setItem('sk', sk)
      pk && localStorage.setItem('pk', pk)
      esk && localStorage.setItem('esk', esk)
      userId && localStorage.setItem('user_vid', userId)
      if(userId && sk){
        skLog({
          userId,
          sk,
          other: {
            platform: 'web',
            from: 'login'
          }
        })
      }
      if (userId && dispatch) {
        const eskSign = await dispatch({
          type: c.dispatchActionType.GET_DATA,
          payload: {
            dataKey: 'Global.currentUser.vertex.name.eskSign',
          },
        })
        const pkSign = await dispatch({
          type: c.dispatchActionType.GET_DATA,
          payload: {
            dataKey: 'Global.currentUser.vertex.name.pkSign',
          },
        })
        if (eskSign) {
          localStorage.setItem('eskSign', eskSign)
          localStorage.setItem('pkSign', pkSign)
        }
        await dispatch({
          type: c.dispatchActionType.PULL_INDEX_TABLE,
          payload: {},
        })
        return
      }
      return
    },
    async storeCredential({ key, value }) {
      localStorage.setItem(key, value)
      if (key === 'facility_vid' && value && dispatch) {
        await dispatch({
          type: c.dispatchActionType.PULL_INDEX_TABLE,
          payload: { isAdmin: true },
        })
      }
    },
    currentDateTime: (() => Date.now())(),

    async SignInOk(): Promise<boolean> {
      const status = await Account.getStatus()
      if (status.code !== 0) {
        return false
      }
      return true
    },
    async uploadDocument({
      title,
      tags = [],
      content,
      type,
      dataType = 0,
    }): Promise<Record<string, any>> {
      const globalStr = localStorage.getItem('Global')
      const globalParse = globalStr !== null ? JSON.parse(globalStr) : null

      if (!globalParse) {
        throw new Error('There was no rootNotebook found.Please sign in.')
      }
      const edge_id = globalParse.rootNotebook.edge.id

      const res = await Document.create({
        edge_id,
        title,
        tags,
        content,
        type,
        dataType,
      })
      if (res) {
        // @ts-expect-error
        return { docName: res?.name?.title, url: res?.deat?.url }
      }
      return res
    },
    isIOS() {
      // if (typeof window !== 'undefined') {
      //   const userAgent = window.navigator.userAgent || window.navigator.vendor
      //   if (/iPad|iPhone|iPod/i.test(userAgent) && !('MSStream' in window)) {
      //     return true
      //   }
      // }
      return false
    },
    isAndroid() {
      // if (typeof window !== 'undefined') {
      //   const userAgent = window.navigator.userAgent || window.navigator.vendor
      //   if (/android/i.test(userAgent)) {
      //     return true
      //   }
      // }
      return false
    },
    isIOSBrowser() {
      if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent || window.navigator.vendor
        if (/iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window)) {
          return true
        }
      }
      return false
    },
    isAndroidBroswer() {
      if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent || window.navigator.vendor
        if (/android/i.test(userAgent)) {
          return true
        }
      }
      return false
    },
    isAndroidBrowser() {
      if (typeof window !== 'undefined') {
        const userAgent = window.navigator.userAgent || window.navigator.vendor
        if (/android/i.test(userAgent)) {
          return true
        }
      }
      return false
    },
    stringCompare(string1: string, string2: string) {
      return string1 === string2
    },
    toCSV(value: Record<string, any> | any[]) {
      const getField = (obj: Record<string, any>) => {
        let fields = Object.keys(obj)
        let replacer = function (key, value) {
          return value === null ? '' : value
        }
        let csv = [obj].map(function (row) {
          return fields
            .map(function (fieldName) {
              return JSON.stringify(row[fieldName], replacer)
            })
            .join(',')
        })
        csv.unshift(fields.join(',')) // add header column
        return csv.join('\r\n')
      }
      if (u.isArr(value)) return value.map(getField)
      if (u.isObj(value)) return getField(value)
      return String(value)
    },
    async downloadFromS3(url) {
      const response =
        await store.level2SDK.documentServices.downloadDocumentFromS3({ url })
      return response?.data
    },
    async cleanLocalStorage() {
      if (!u.isBrowser()) return
      const firebaseAuthSignOut = get(window,'app.root.builtIn.thirdPartyRequest.firebaseAuthSignOut')
      if(firebaseAuthSignOut) await firebaseAuthSignOut()
      const jwt = localStorage.getItem("jwt")
      if(('serviceWorker' in window.navigator) && jwt){
        await deleteToken()
      }
      store.level2SDK.Account.logoutClean()
      localStorage.removeItem('Global')
      let cadlEndpoint: any
      let config
      if('serviceWorker' in window.navigator){
        await window['app'].notification.deleteToken?.()
      }
      if (dispatch) {
        const res = ' '
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            dataKey: 'Global',
            data: res,
          },
        })
        await dispatch({
          type: c.dispatchActionType.CLEAR_ROOT,
          //TODO: handle case for data is an array or an object
          payload: {},
        })

        cadlEndpoint = await dispatch({
          type: c.dispatchActionType.GET_CADLENDPOINT,
          payload: {},
        })
        config = await dispatch({
          type: c.dispatchActionType.GET_DATA,
          payload: {
            dataKey: 'Config',
          },
        })
        // await dispatch({
        //   type: c.dispatchActionType.PUSH_INDEX_TABLE,
        //   payload: {},
        // })
      }

      if (processPopulate && getPage && emit && cadlEndpoint && config) {
        const { preload } = cadlEndpoint || {}
        const preloads = (preload || []) as string[]
        await Promise.all(
          preloads.map(async (name) => {
            let source = (await getPage(name, {}))?.[0]
            emit({
              type: c.emitType.SET_ROOT_PROPERTIES,
              payload: {
                properties: processPopulate({
                  source,
                  skip: ['dataIn', 'listObject'],
                  lookFor: ['.', '..', '=', '~'],
                }),
              },
            })

            // }
          }),
        )
        localStorage.setItem('config', JSON.stringify(config))
      }

      return
    },
    async onlyCleanLocalStorage() {
      if (!u.isBrowser()) return
      localStorage.removeItem('Global')
      localStorage.removeItem('jwt')
      return
    },
    async cleanLocalStorageSearch() {
      if (!u.isBrowser()) return
      if (dispatch) {
        const config = await dispatch({
          type: c.dispatchActionType.GET_DATA,
          payload: {
            dataKey: 'Config',
          },
        })
        store.level2SDK.Account.logoutClean()
        localStorage.removeItem('Global')
        const res = ' '
        await dispatch({
          type: c.dispatchActionType.UPDATE_DATA,
          //TODO: handle case for data is an array or an object
          payload: {
            dataKey: 'Global',
            data: res,
          },
        })

        await dispatch({
          type: c.dispatchActionType.PUSH_INDEX_TABLE,
          payload: {},
        })
        localStorage.setItem('config', JSON.stringify(config))
      }

      if (processPopulate && getPage && emit) {
        const processed = processPopulate({
          source: (await getPage('BaseDataModel'))?.[0],
          lookFor: ['.', '..', '=', '~'],
        })
        emit({
          type: c.emitType.SET_ROOT_PROPERTIES,
          payload: { properties: processed },
        })

        localStorage.setItem('Global', JSON.stringify(processed?.['Global']))
      }

      return
    },
    async searchCache({ key }: { key: string }) {
      if (dispatch && key) {
        const searchResponse = await dispatch({
          type: c.dispatchActionType.SEARCH_CACHE,
          payload: { key },
        })
        return searchResponse
      }
      return []
    },
    isBrowser(): boolean {
      if (typeof window !== 'undefined') {
        return true
      }
      return false
    },
    stop() {
      return { abort: 'true' }
    },
    async base58ToUTF8({object}: {object: {}}) {
      let uint8Array = await store.level2SDK.utilServices.base58ToUint8Array(object['phoneNumber'])
      return store.level2SDK.utilServices.uint8ArrayToUTF8(uint8Array)
    },
    async reSignIn({vertexId,sk}){
      const base58Tobase64 = (key): string =>{
        let uint8Array = store.level2SDK.utilServices.base58ToUint8Array(key)
        return store.level2SDK.utilServices.uint8ArrayToBase64(uint8Array)
      }
      if(vertexId && sk && !vertexId.startsWith('=') && !sk.startsWith('=')){
        const _vertexId = base58Tobase64(vertexId)
        const _sk = base58Tobase64(sk)
        const resp1030 = await store.level2SDK.edgeServices.createEdge({
          bvid: _vertexId,
          type: 1030
        })
        const resp = await retrieveVertex(_vertexId)
        const vertex = resp.data.vertex[0]
        const {pk,esk,id} = vertex
        _sk && localStorage.setItem('sk', _sk)
        pk && localStorage.setItem('pk', pk)
        esk && localStorage.setItem('esk', esk)
        _vertexId && localStorage.setItem('user_vid', _vertexId)
        if(dispatch){
          await dispatch({
            type: c.dispatchActionType.UPDATE_DATA,
            payload: {
              dataKey: 'Global.currentUser.vertex',
              data: {
                ...vertex,
                sk: _sk
              }
            }
          })
          await dispatch({
            type: c.dispatchActionType.UPDATE_DATA,
            payload: {
              dataKey: 'Global.rootNotebookID',
              data: vertex.deat?.rnb64ID
            }
          })
        }
      }
    }
  }
}
