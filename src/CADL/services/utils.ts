import * as u from '@jsmanifest/utils'
import store from '../../common/store'
import { cloneDeep, find, get, isArray, pick, set, uniq } from 'lodash'
import { chatDocumentToNote, documentToNote } from '../../services/Document/utils'
import { retrieveDocument } from '../../common/retrieve'
import isPopulated from '../../utils/isPopulated'
import log from '../../utils/log'
import { createToast, Toast } from 'vercel-toast'
import fcm from './fcm'
import { Document } from '../../services'
import { customAlphabet } from 'nanoid'
import { retrieveVertex } from '../../common/retrieve'
import {Uint8ArrayToString, getPropertyPath} from '../utils'
import axios from 'axios'
import moment from 'moment'
import apiAxios from '../../axios/proxyAxios'
import jszip from "jszip"
import html2canvas from 'html2canvas'
import jspdf from 'jspdf'

function uint8ArrayToBase32(uint8Array) {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of uint8Array) {
    // Convert each byte to a 8-bit binary string
    const binary = byte.toString(2).padStart(8, "0");
    bits += binary;
  }

  // Group the binary string into 5-bit chunks
  const chunks:any[] = [];
  for (let i = 0; i < bits.length; i += 5) {
    chunks.push(bits.slice(i, i + 5));
  }

  // Pad the last chunk if necessary with zeros
  if (chunks[chunks.length - 1].length < 5) {
    chunks[chunks.length - 1] = chunks[chunks.length - 1].padEnd(5, "0");
  }

  // Convert each 5-bit chunk to its corresponding Base32 character
  const base32Chars = chunks.map((chunk) => ALPHABET[parseInt(chunk, 2)]);

  // Add padding characters ('=' in Base32)
  while (base32Chars.length % 8 !== 0) {
    base32Chars.push("=");
  }

  return base32Chars.join("");
}
const getScreenDpi = () => {
  const tmpNode = document.createElement('DIV')
  tmpNode.style.cssText =
    'width:1in;height:1in;position:absolute;left:0px;top:0px;z-index:99;visibility:hidden'
  document.body.appendChild(tmpNode)
  const dpi = tmpNode.offsetWidth
  tmpNode.parentNode!.removeChild(tmpNode)
  return dpi
}
const prepareDocToPath = async (id) => {
  let path
  let type
  if (id && typeof id == 'string' && !id.includes('.')) {
    const resp = await retrieveDocument(id)
    const document = resp?.data?.document?.length
      ? resp?.data?.document[0]
      : null
    await documentToNote({ document }).then(
      (note) => {
        let blob = store.level2SDK.utilServices.base64ToBlob(
          note?.name?.data,
          note?.name?.type,
        )
        type = note?.name?.type
        path = URL.createObjectURL(blob)
      },
      (error) => {
        if (store.env === 'test') {
          log.error(error instanceof Error ? error : new Error(String(error)))
        }
      },
    )
    if (type === 'application/pdf') {
      return {
        type: type,
        url: path,
      }
    }
    return {
      type: type,
      url: path,
    }
  }
  return
}
export default {
  /**
   * @function
   * @description  Parse the incoming Base64 data into blobs.
   * @param {string} data
   * @param {string} type
   * @returns {string}
   */
  base64ToBlob({
    data,
    type = 'application/pdf',
  }: {
    data: string
    type: string
  }) {
    if (!data) return
    if (typeof data !== 'string') return
    if (!isPopulated(data)) return
    const blob = store.level2SDK.utilServices.base64ToBlob(data, type)
    console.dir(blob)
    const blobUrl = URL.createObjectURL(blob)
    return blobUrl
  },
  /**
   * @function
   * @description  Verify that the value passed in is empty
   * @param {Record<any, any>} args
   * @returns {boolean}
   */
  exists(args: Record<any, any>) {
    for (let val of Object.values(args)) {
      if (val === '' || val === undefined || val === null) {
        return false
      }
    }
    return true
  },
  /**
   * @function
   * @description  Print data information
   * @param {any} value
   * @returns {void}
   */
  log({ value }: { value: any }) {
    log.debug(value)
    return
  },
  /**
   * @function
   * @description  Decrypt the incoming document
   * @param {Record<string, any>} doc
   * @returns {any}
   */
  async prepareDoc({ doc }: { doc: Record<string, any> }) {
    let note
    if (typeof doc == 'string') return
    if (u.isObj(doc.subtype)) {
      note = doc
    } else {
      note = await documentToNote({ document: doc })
    }
    const { name } = note
    if (!name?.data) return doc
    if (typeof name?.data !== 'string') return doc
    if (!isPopulated(name?.data)) return doc
    //checking that the string is not base64 encoded
    const CHUNK_SIZE = 1000 // set the size of each chunk
    if (typeof name?.data === 'string') {
      let i = 0
      while (i < name.data.length) {
        const chunk = name.data.slice(i, i + CHUNK_SIZE)
        if (
          !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(
            chunk,
          )
        ) {
          return note
        }
        i += CHUNK_SIZE
      }
    }
    const blob = store.level2SDK.utilServices.base64ToBlob(
      name?.data,
      name?.type,
    )
    const blobUrl = URL.createObjectURL(blob)
    name.data = blobUrl
    return note
  },

  /**
   * @function
   * @description  Decrypt the incoming document
   * @param {Record<string, any>} doc
   * @returns {any}
   */
  async prepareChatDoc({ doc }: { doc: Record<string, any> }) {
    let note
    if (typeof doc == 'string') return
    if (u.isObj(doc.subtype)) {
      note = doc
    } else {
      note = await chatDocumentToNote({ document: doc })
    }
    const { name } = note
    if (!name?.data) return doc
    if (typeof name?.data !== 'string') return doc
    if (!isPopulated(name?.data)) return doc
    //checking that the string is not base64 encoded
    const CHUNK_SIZE = 1000 // set the size of each chunk
    if (typeof name?.data === 'string') {
      let i = 0
      while (i < name.data.length) {
        const chunk = name.data.slice(i, i + CHUNK_SIZE)
        if (
          !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(
            chunk,
          )
        ) {
          return note
        }
        i += CHUNK_SIZE
      }
    }
    const blob = store.level2SDK.utilServices.base64ToBlob(
      name?.data,
      name?.type,
    )
    const blobUrl = URL.createObjectURL(blob)
    name.data = blobUrl
    return note
  },
  
  /**
   * @function
   * @description  Resolve the incoming doc ID into a path path and return it
   * @param {any} id
   * @returns {any}
   */
  async prepareDocToPath(id) {
    let path
    let type
    if (id && typeof id == 'string' && !id.includes('.')) {
      const resp = await retrieveDocument(id)
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      await documentToNote({ document }).then(
        (note) => {
          let blob = store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
          type = note?.name?.type
          path = URL.createObjectURL(blob)
        },
        (error) => {
          if (store.env === 'test') {
            log.error(error instanceof Error ? error : new Error(String(error)))
          }
        },
      )
      if (type === 'application/pdf') {
        return {
          type: type,
          url: path,
        }
      }
      return {
        type: type,
        url: path,
      }
    }
    return
  },
  async prepareFacAvatar(id) {
    let path
    let type
    if (id && typeof id == 'string' && !id.includes('.')) {
      const resp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [id],
        options: {
          type: 263680,
          xfname: "ovid",
          maxcount: 1,
          obfname: "mtime"
        }
      })
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      if(!document) return
      await documentToNote({ document }).then(
        (note) => {
          let blob = store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
          type = note?.name?.type
          path = URL.createObjectURL(blob)
        },
        (error) => {
          if (store.env === 'test') {
            log.error(error instanceof Error ? error : new Error(String(error)))
          }
        },
      )
      if (type === 'application/pdf') {
        return {
          type: type,
          url: path,
        }
      }
      return {
        type: type,
        url: path,
      }
    }
    return
  },  
  async prepareIdToImg({id}:{id: string}) {
    let path
    let type
    if (id && typeof id == 'string' && !id.includes('.')) {
      const resp = await retrieveDocument(id)
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      await documentToNote({ document }).then(
        (note) => {
          let blob = store.level2SDK.utilServices.base64ToBlob(
            note?.name?.data,
            note?.name?.type,
          )
          type = note?.name?.type
          path = URL.createObjectURL(blob)
        },
        (error) => {
          if (store.env === 'test') {
            log.error(error instanceof Error ? error : new Error(String(error)))
          }
        },
      )
      return path
    }
    return
  },
  async requireBase64({ids}:{ids: string[]}) {
    let prev:any = []
    for(let ele of ids){
      const resp = await retrieveDocument(ele)
      const document = resp?.data?.document?.length
        ? resp?.data?.document[0]
        : null
      await documentToNote({ document }).then(
        (note) => {
          prev.push(`data:${note?.name?.type};charset=utf8;base64,${note?.name?.data}`);
        },
        (error) => {
          if (store.env === 'test') {
            log.error(error instanceof Error ? error : new Error(String(error)))
          }
        },
      )
    }
    return prev;
  },
  /**
   * @function
   * @description  Prompt pop-up effect in browser
   * @param {any} toastMessage
   * @returns {void}
   */
  toaster({ toastMessage }: { toastMessage: any }) {
    toast(`${toastMessage}`, { type: 'error' })
    return
  },
  /**
   * @function
   * @description  Splits the incoming string into spaces and returns the first item
   * @param {string} num
   * @returns {string}
   */
  getCountryCode({ uid }: { uid: string }): string {
    return uid.split(' ')[0]
  },
  /**
   * @function
   * @description  Splits the incoming string into spaces and returns the second item
   * @param {string} num
   * @returns {string}
   */
  getPhoneNumber({ uid }: { uid: string }): string {
    return uid.split(' ')[1]
  },
  /**
   * @function
   * @description  Gets the value of the current localstorage store
   * @param {void}
   * @returns {any}
   */
  getTempParams() {
    if (!u.isBrowser()) return 
    let tempParams: any = localStorage.getItem('tempParams')
    tempParams = typeof tempParams == 'string' ? JSON.parse(tempParams) : {}
    return tempParams
  },
  /**
   * @function
   * @description  Set key value pairs for localstorage storage
   * @param {any} Object
   * @returns {any}
   */
  setTempParams({ Object }) {
    if (Object) {
      let tempParams: any = localStorage.getItem('tempParams')
      tempParams = typeof tempParams == 'string' ? JSON.parse(tempParams) : {}
      let keys = Object.keys(Object)
      for (let i = 0; i < keys.length; i++) {
        tempParams[keys[i]] = Object[keys[i]]
      }
      localStorage.setItem('tempParams', JSON.stringify(tempParams))
    }
  },
  /**
   * @function
   * @description  Set synchronization blocking delay effect
   * @param {number} timeUnix
   * @returns {void}
   */
  setTimer({ timeUnix }: { timeUnix: number }) {
    let start = new Date().getTime()
    while (new Date().getTime() - start < timeUnix) {
      continue
    }
  },
  /**
   * @function
   * @description  Remove keys from localstorage storage
   * @param {void}
   * @returns {void}
   */
  removeTempParams() {
    localStorage.removeItem('tempParams')
  },
  /**
   * @function
   * @description  Remove the value stored in localstorage through the key
   * @param {string} key
   * @returns {void}
   */
  removeKeyTempParams({ key }) {
    let tempParams: any = localStorage.getItem('tempParams')
    tempParams = typeof tempParams == 'string' ? JSON.parse(tempParams) : {}
    delete tempParams[key]
    localStorage.setItem('tempParams', JSON.stringify(tempParams))
  },
  /**
   * @function
   * @description  Get file size
   * @param {object} object
   * @param {string} units
   * @returns {number}
   */
  getFileSize({
    object,
    units = 'kb',
  }: {
    object: object
    units: 'kb' | 'mb' | 'b'
  }) {
    let objectSize: number = parseFloat(object['size'])
    if (objectSize && units) {
      switch (units) {
        case 'b':
          return objectSize.toFixed(1)
        case 'kb':
          return (objectSize / 1024).toFixed(1)
        case 'mb':
          return (objectSize / (1024 * 1024)).toFixed(1)
      }
    }
    return 0
  },
  /**
   * @function
   * @description  Get file name
   * @param {object} object
   * @returns {string}
   */
  getFileName({ object }: { object: object }) {
    return object['name']
  },
  /**
   * @function
   * @description  copy to clipboard
   * @param {object} object
   * @returns {number}
   */
  copyToClip({ object }: { object: object }) {
    if (!u.isBrowser()) return 1
    log.debug(`copy to clipboard!! ${object}`)
    let text = `${object}`
    let dummy = document.createElement('textarea')
    // to avoid breaking orgain page when copying more words
    // cant copy when adding below this code
    // dummy.style.display = 'none'
    document.body.appendChild(dummy)
    //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text
    dummy.select()
    document.execCommand('copy')
    document.body.removeChild(dummy)
    return 1
  },

  /**
   *
   * @function
   * @description set LocalStorage item
   * @param {string}key lcoalstorage key
   * @param {string}value lcoalstorage value
   * @returns {void}
   */
  setLocalStorage({ key, value }: { key: string; value: string }) {
    if (!u.isBrowser()) return
    const ls = window.localStorage
    ls.setItem(key, value)
  },
  /**
   *
   * @function
   * @description get LocalStorage item
   * @param {string} key
   * @return {string}
   */
  getLocalStorage({ key }: { key: string }) {
    const ls = window.localStorage
    return ls.getItem(key)
  },
  /**
   * @function
   * @description Depth assignment function
   * @param {any} data
   * @return {any}
   */
  cloneDeepData({ data }: { data: any }): any {
    return cloneDeep(data)
  },
  /**
   * @function
   * @description Get the URL of the current page
   * @return {string}
   */
  getUrl(): string {
    if (u.isBrowser()) return window.location.href
    return ''
  },
  /**
   * @function
   * @description Validate input variables
   * @param {string} username
   * @return {boolean}
   */
  usernameCheck({ username }: { username: string }): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]{6,16}$/.test(username)
  },
  /**
   * @function
   * @description Judge that all values are equal
   * @param {string|number} value
   * @param {string|number} index
   * @return {boolean}
   */
  judgeAll({
    value,
    index,
    equal = true,
  }: {
    value: (string | number)[]
    index: string | number
    equal?: boolean
  }): boolean {
    return equal
      ? value.some((val) => {
          if (val === index) return true
        })
      : value.some((val) => {
          if (val !== index) return true
        })
  },
  /**
   * @function
   * @description Judge whether two objects are identical
   * @param {any} data
   * @param {any} comData
   * @return {boolean}
   */
  areTheyIdentical({ data, comData }: { data: any; comData: any }): boolean {
    return JSON.stringify(data) === JSON.stringify(comData)
  },

  /**
   * @function
   * @description judge image
   * @param file
   * @return {boolean}
   */
  isImageFile({ file }: { file: string }): boolean {
    if (file) {
      if (file.startsWith('image')) return true
    }
    return false
  },
  /**
   * @function
   * @description Array summation
   * @param {number[]} array
   * @return {number}
   */
  addArrayValue({ array }: { array: any }) {
    let res = 0
    for (let i = 0; i < array.length; i++) {
      res += +array[i]
    }
    return res
  },
  /**
   * @function
   * @description OCR recognized as true
   * @param {any} image
   * @return {boolean}
   */
  AWSOCR({ image }: { image: any }) {
    return {
      DATE_OF_BIRTH: '',
      FIRST_NAME: '',
      LAST_NAME: '',
      MIDDLE_NAME: '',
      CITY_IN_ADDRESS: '',
      COUNTY: '',
      ADDRESS: '',
      ADDRESS_SECOND_LINE: '',
      STATE_IN_ADDRESS: '',
      ZIP_CODE_IN_ADDRESS: '',
      DOCUMENT_NUMBER: '',
      ID_TYPE: '',
    }
  },
  /**
   * @function
   * @description Get the hashcode of an object combination
   * @param {string[]} hashFields
   * @param {Date} hashtime
   * @return {string}
   */
  gethashCode({
    hashFields,
    hashtime = Date.now(),
  }: {
    hashFields: string[]
    hashtime?: number
  }): string {
    return fcm.getAPPID({ appName: [...hashFields, hashtime].join(',') })
  },
  /**
   * @function
   * @description Set to null
   * @param {any[]} variable
   * @param {string} identifier
   * @return {string}
   */
  setEmpty({
    variable,
    identifier,
  }: {
    variable: any[]
    identifier: string
  }): any[] | undefined {
    if (identifier === 'object') {
      return variable.map((item) => {
        return (item = new Object())
      })
    } else if (identifier === 'array') {
      return variable.map((item) => {
        return (item = new Array())
      })
    }
    return
  },
  /**
   * @function
   * @description download pdf
   * @param {string} viewTag
   * @param {number} scaleX
   * @param {number} scaleY
   * @param {number} originX
   * @param {number} originY
   * @return {undefined}
   */
  downloadPDF({
    viewTag,
    titleName,
    margin = 0,
    size,
  }: // scaleX = 0.7,
  // scaleY = 0.7,
  // originX = -0.1,
  // originY = -0.1,
  // zoom = 1,
  {
    viewTag: string
    titleName?: string
    margin?: number
    size: number
    // scaleX?: string | number
    // scaleY?: string | number
    // originX?: string | number
    // originY?: string | number
    // zoom?: string | number
  }) {
    if (!u.isBrowser()) return
    window.scrollTo(0, 0)
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    let ele = document.querySelector(`[data-viewtag=${viewTag}]`) as HTMLElement
    const printELe = ele
    // 遍历所有的图片 获取所有高度在根据比例算出所有的渲染高度
    let imgList = printELe.querySelectorAll('img')
    imgList.forEach((item) => {
      const trulyHeight = item.naturalHeight
      const trulyWidth = item.naturalWidth
      const width = item.width
      item.style.height = `${width * (trulyHeight / trulyWidth)}px`
    })
    // 获取分辨率
    // const sW = window.screen.width
    // const sH = window.screen.height
    const dpi = getScreenDpi()
    const px2cm = 25.4 / dpi // mm
    const iframeWidth = ele.style.width
    const iframHeight = ele.scrollHeight
    // const iframeHeight = ele.style.height
    console.groupCollapsed('屏幕的各项属性')


    // console.error(iframeHeight);
    // 获取缩放比例
    // A4
    const letterW = 210
    const letterH = 297

    let scaleX1 = letterW / (parseFloat(iframeWidth.split('px')[0]) * px2cm)
    let scaleY1 = letterH / (iframHeight * px2cm)
    console.groupEnd()

    // create iframe to
    const iframe = document.createElement('IFRAME') as HTMLIFrameElement
    // iframe.style.width = iframeWidth
    // iframe..style.height = `${iframHeight}px`
    iframe.setAttribute('id', 'printIframe')
    let doc: HTMLElement | undefined
    iframe.setAttribute(
      'style',
      `position:absolute;width:0px;height:800px;padding:0px;margin:0px;`,
    )
    document.body.appendChild(iframe)
    const styleOuter = document.createElement('style') as HTMLStyleElement
    scaleY1 = scaleY1 - 0.1
    const styleTemplete: string = `
      *{margin: 0;padding: 0;}
      body img{ 
        height: auto;
      }
      header nav, footer, video, audio, object, embed {
        display: none;
      }
      body {
        height: ${iframHeight}px;
        width: ${iframeWidth};
        -webkit-transform-origin: 0 0;
        zoom: ${+scaleX1};
      }
      @media print{
        body {
          padding: 0in;
          margin: ${margin}in;
        }
      }
      body img{
        height: auto;
      }
      .label {
        white-space: pre-wrap;
      }
    `
    //@ts-ignore
    if (styleOuter?.styleSheet) {
      //@ts-ignore
      styleOuter.styleSheet.cssText = styleTemplete
    } else {
      styleOuter.innerHTML = styleTemplete
    }
    let nameTarget: string | null = ''
    let title: HTMLTitleElement
    if (titleName) {
      title = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(title.textContent)
      title.textContent = titleName
    }
    iframe.contentWindow!.onbeforeprint = () => {
      log.debug('start')
    }
    iframe.contentWindow!.onafterprint = () => {
      title.textContent = nameTarget
      setTimeout(() => {
        document.body.removeChild(iframe)
      });
    }
    doc = iframe.contentWindow?.document.documentElement
    let virtualDom = document.createElement('div')
    virtualDom.innerHTML = printELe.innerHTML
    if(size){
      Array.from(virtualDom.getElementsByClassName('label')).forEach(element=> {
        if (element) {
          if((element as any).style.fontWeight == 600) (element as any).style.fontSize = (size-2) + 'px'
          else (element as any).style.fontSize = size + 'px'
        }
      });
    }
    // doc?.appendChild(virtualDom) 
    // doc!.innerHTML = printELe.innerHTML;
    virtualDom.style.height = '100px'
    doc!.getElementsByTagName('head')[0].appendChild(styleOuter)
    doc!.getElementsByTagName('body')[0].appendChild(virtualDom)
    
    let timer
    const waitIframe = async() => {
      const images = iframe.contentDocument?.images;
      let loadedImagesCount = 0;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.complete) {
            loadedImagesCount++;
          } else {
            img.onload = () => {
              loadedImagesCount++;
              if (loadedImagesCount === images.length) {
                // 所有图片加载完成，开始打印
                setTimeout(() => {
                  iframe.contentWindow?.print();
                });
              }
            };
          }
        }
    
        // 如果所有图片已经加载完成，直接打印
        if (loadedImagesCount === images.length) {
          setTimeout(() => {
            iframe.contentWindow?.print();
          });
        }
      }
    }
    waitIframe()
    
    // iframe.contentWindow?.print()
  },
  // 适用于将文件导出在一张pdf的情况，没有cms1500和 ub04这么精确，所以依赖缩放来实现
  downloadPDFFullPage({
    viewTag,
    titleName,
    scaleX,
    paddingLeft,
    removeTag,
  }: {
    viewTag: string
    titleName?: string
    scaleX?: string
    paddingLeft?: string
    removeTag?: Array<string>
  }) {
    if (!u.isBrowser()) return
    window.scrollTo(0, 0)
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    let ele = document.querySelector(`[data-viewtag=${viewTag}]`) as HTMLElement
    const printELe = ele

    let imgList = printELe.querySelectorAll('img')
    imgList.forEach((item) => {
      const trulyHeight = item.naturalHeight
      const trulyWidth = item.naturalWidth
      const width = item.width
      item.style.height = `${width * (trulyHeight / trulyWidth)}px`
    })
    // 获取分辨率
    // const sW = window.screen.width
    // const sH = window.screen.height
    const dpi = getScreenDpi()
    const px2cm = 25.4 / dpi // mm
    const iframeWidth = ele.style.width
    const iframHeight = ele.scrollHeight
    // const iframeHeight = ele.style.height
    const letterW = 210
    const letterH = 297
    // 先使用 zoom 缩放到1张纸在使用 scale
    let scaleX1 = letterW / (parseFloat(iframeWidth.split('px')[0]) * px2cm)
    let scaleY1 = letterH / (iframHeight * px2cm)

    // create iframe to
    const iframe = document.createElement('IFRAME') as HTMLIFrameElement
    // iframe.style.width = iframeWidth
    // iframe..style.height = `${iframHeight}px`
    iframe.setAttribute('id', 'printIframe')
    let doc: HTMLElement | undefined
    iframe.setAttribute(
      'style',
      `position:absolute;width:0px;height:800px;padding:0px;margin:0px;`,
    )
    document.body.appendChild(iframe)
    const styleOuter = document.createElement('style') as HTMLStyleElement
    if (+scaleY1 > 1) {
      scaleY1 = 1
    }
    scaleY1 = scaleY1 - 0.05

    const styleTemplete: string = `
      *{margin: 0;padding: 0;}
      body img{ 
        height: auto;
      }
      header nav, footer, video, audio, object, embed {
        display: none;
      }
      body {
        height: ${iframHeight}px;
        width: ${iframeWidth};
        -webkit-transform-origin: 0 0;
        zoom: ${+scaleY1};
        transform: scaleX(${scaleX ? scaleX : 1});
        padding-left: ${paddingLeft ? paddingLeft : '0px'}
      }
      #mainV{
      }
      body img{
        height: auto;
      }
    `
    //@ts-ignore
    if (styleOuter?.styleSheet) {
      //@ts-ignore
      styleOuter.styleSheet.cssText = styleTemplete
    } else {
      styleOuter.innerHTML = styleTemplete
    }
    let nameTarget: string | null = ''
    let title: HTMLTitleElement
    if (titleName) {
      title = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(title.textContent)
      title.textContent = titleName
    }
    iframe.contentWindow!.onbeforeprint = () => {
      log.debug('start')
    }
    iframe.contentWindow!.onafterprint = () => {
      title.textContent = nameTarget
      document.body.removeChild(iframe)
    }
    doc = iframe.contentWindow?.document.documentElement
    let virtualDom = document.createElement('div')
    virtualDom.setAttribute('id', 'mainV')
    virtualDom.innerHTML = printELe.innerHTML
    // doc?.appendChild(virtualDom)
    // doc!.innerHTML = printELe.innerHTML;
    virtualDom.style.height = '100px'
    virtualDom.style.width = 'auto'
    doc!.getElementsByTagName('head')[0].appendChild(styleOuter)
    doc!.getElementsByTagName('body')[0].appendChild(virtualDom)
    if (removeTag) {
      removeTag.forEach((item) => {
        const e = doc!.querySelector(`[data-viewtag=${item}]`) as HTMLElement
        if (e) {
          e.style.display = 'none'
        }
      })
    }
    const waitIframe = async() => {
      const images = iframe.contentDocument?.images;
      let loadedImagesCount = 0;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.complete) {
            loadedImagesCount++;
          } else {
            img.onload = () => {
              loadedImagesCount++;
              if (loadedImagesCount === images.length) {
                // 所有图片加载完成，开始打印
                setTimeout(() => {
                  iframe.contentWindow?.print();
                });
              }
            };
          }
        }
    
        // 如果所有图片已经加载完成，直接打印
        if (loadedImagesCount === images.length) {
          setTimeout(() => {
            iframe.contentWindow?.print();
          });
        }
      }
    }
    waitIframe()
  },
  downloadPDFOnepage({
    viewTag,
    titleName,
  }: {
    viewTag: string
    titleName?: string
  }) {
    if (!u.isBrowser()) return
    // await new Promise((res, rej) => {
    //   if (!u.isBrowser()) return;
    window.scrollTo(0, 0)
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    let ele = document.querySelector(`[data-viewtag=${viewTag}]`) as HTMLElement
    const hasBackgroundImage = window
      .getComputedStyle(ele)
      .getPropertyValue('background-image')
    const printELe = ele
    // 遍历所有的图片 获取所有高度在根据比例算出所有的渲染高度
    let imgList = printELe.querySelectorAll('img')
    imgList.forEach((item) => {
      const trulyHeight = item.naturalHeight
      const trulyWidth = item.naturalWidth
      const width = item.width
      item.style.height = `${width * (trulyHeight / trulyWidth)}px`
    })
    // 获取分辨率
    const sW = window.screen.width
    const sH = window.screen.height
    const dpi = getScreenDpi()
    const px2cm = 25.4 / dpi // mm
    const iframeWidth = ele.getBoundingClientRect().width
    const iframHeight = ele.scrollHeight
    // latter 纸的大小 英寸
    const letterW = 8.5
    const letterH = 11
    // 当前区域的实际英寸大小
    const trulyInhWidth = iframeWidth / dpi
    const trulyInhHeight = iframHeight / dpi
    // 缩放比例
    let scaleX1 = letterW / trulyInhWidth
    let scaleY1 = letterH / trulyInhHeight
    // create iframe to
    const iframe = document.createElement('IFRAME') as HTMLIFrameElement
    // iframe.style.width = iframeWidth
    // iframe..style.height = `${iframHeight}px`
    iframe.setAttribute('id', 'printIframe')

    let doc: HTMLElement | undefined
    iframe.setAttribute(
      'style',
      `position:absolute;width:0px;height:800px;padding:0px;margin:0px;`,
    )
    document.body.appendChild(iframe)
    const styleOuter = document.createElement('style') as HTMLStyleElement
    scaleY1 = scaleY1
    const styleTemplete: string = `
      body {
        height: 11in;
        width: 8.5in;
        padding: 0px;
        margin: 0px;
      }
      @media print{
        body {
          padding: 0in;
          margin: 0in;
        }
      }
      @page{
        margin: 0;
        padding: 0;
      }
    `
    //@ts-ignore
    if (styleOuter?.styleSheet) {
      //@ts-ignore
      styleOuter.styleSheet.cssText = styleTemplete
    } else {
      styleOuter.innerHTML = styleTemplete
    }
    let nameTarget: string | null = ''
    let title: HTMLTitleElement
    if (titleName) {
      title = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(title.textContent)
      title.textContent = titleName
    }
    iframe.contentWindow!.onbeforeprint = () => {
      log.debug('start')
    }
    iframe.contentWindow!.onafterprint = () => {
      title.textContent = nameTarget
      document.body.removeChild(iframe)
    }
    doc = iframe.contentWindow?.document.documentElement
    let virtualDom = document.createElement('div')
    virtualDom.innerHTML = printELe.innerHTML
    // doc?.appendChild(virtualDom)
    // doc!.innerHTML = printELe.innerHTML;
    virtualDom.style.height = '11in'
    if (hasBackgroundImage) {
      virtualDom.style.backgroundImage = hasBackgroundImage
      virtualDom.style.backgroundSize = 'cover'
    }
    doc!.getElementsByTagName('head')[0].appendChild(styleOuter)
    doc!.getElementsByTagName('body')[0].appendChild(virtualDom)
    // printELe.innerHTML.
    // document.head.appendChild(st)
    // iframe.contentWindow?.focus();
    // iframe.contentWindow?.print()
    const waitIframe = async() => {
      const images = iframe.contentDocument?.images;
      let loadedImagesCount = 0;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.complete) {
            loadedImagesCount++;
          } else {
            img.onload = () => {
              loadedImagesCount++;
              if (loadedImagesCount === images.length) {
                // 所有图片加载完成，开始打印
                setTimeout(() => {
                  iframe.contentWindow?.print();
                });
              }
            };
          }
        }
    
        // 如果所有图片已经加载完成，直接打印
        if (loadedImagesCount === images.length) {
          setTimeout(() => {
            iframe.contentWindow?.print();
          });
        }
      }
    }
    waitIframe()
  },
  downloadPdfInpages({
    viewTag,
    titleName,
    pagingThreshold = 6,
    listViewTag = 'procedureCodeTag',
  }: // scaleX = 0.7,
  // scaleY = 0.7,
  // originX = -0.1,
  // originY = -0.1,
  // zoom = 1,
  {
    viewTag: string
    titleName?: string
    listViewTag?: string
    pagingThreshold?: number
    // scaleX?: string | number
    // scaleY?: string | number
    // originX?: string | number
    // originY?: string | number
    // zoom?: string | number
  }) {
    if (!u.isBrowser()) return
    window.scrollTo(0, 0)
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    let ele = document.querySelector(`[data-viewtag=${viewTag}]`) as HTMLElement
    const hasBackgroundImage = window
      .getComputedStyle(ele)
      .getPropertyValue('background-image')
    let ulContainer = ele.querySelector(
      `[data-viewtag=${listViewTag}]`,
    ) as HTMLUListElement
    let domContainer = document.createElement('div')
    let pagingNumber = Math.ceil(
      ulContainer.childElementCount / pagingThreshold,
    )
    for (let i = 0; i < pagingNumber; i++) {
      let newCloneNode = ele.cloneNode(true)
      //@ts-ignore
      let ulContainerInner = newCloneNode.querySelector(
        `[data-viewtag=${listViewTag}]`,
      )
      let ulCount = ulContainerInner!.childElementCount
      let startCount = i * pagingThreshold
      let endCount =
        (i + 1) * pagingThreshold > ulCount
          ? ulCount
          : (i + 1) * pagingThreshold
      ulContainerInner!.innerHTML = ``
      for (let j = 0; j < ulCount; j++) {
        if (j >= startCount && j < endCount) {
          ulContainerInner?.append(
            document.importNode(ulContainer!.childNodes[j], true),
          )
        }
      }
      domContainer.append(newCloneNode)
    }
    const printELe = domContainer
    log.debug('aaa', printELe)

    // 遍历所有的图片 获取所有高度在根据比例算出所有的渲染高度
    let imgList = printELe.querySelectorAll('img')
    imgList.forEach((item) => {
      const trulyHeight = item.naturalHeight
      const trulyWidth = item.naturalWidth
      const width = item.width
      item.style.height = `${width * (trulyHeight / trulyWidth)}px`
    })
    const dpi = getScreenDpi()
    const px2cm = 25.4 / dpi // mm
    const iframeWidth = ele.getBoundingClientRect().width
    const iframHeight = ele.scrollHeight
    // 获取缩放比例
    // latter 纸的大小
    const letterW = 216
    const letterH = 279

    let scaleX1 = letterW / (iframeWidth * px2cm)
    let scaleY1 = letterH / (iframHeight * px2cm)
    // log.debug(scaleX1,scaleY1);
    // console.groupEnd()
    const iframe = document.createElement('IFRAME') as HTMLIFrameElement
    iframe.setAttribute('id', 'printIframe')
    let doc: HTMLElement | undefined
    iframe.setAttribute(
      'style',
      `position:absolute;width:0px;padding:0px;margin:0px;`,
    )
    document.body.appendChild(iframe)
    const styleOuter = document.createElement('style') as HTMLStyleElement
    scaleY1 = scaleY1 + 0.102
    const styleTemplete: string = `
    body img{
      height: auto;
    }
    body{
        padding: 0in;
        margin: 0in;
    }
    div[data-viewtag='mainView']{
      height: 11in;
      width: 8.5in;
      padding: 0px;
      margin: 0px;
      break-inside: avoid
    }

    @media print{
      
      header nav, footer, video, audio, object, embed {
        display: none;
      }
      body, div, img,dl, dt, dd, ul, ol, li, h1, h2, h3, h4, h5, h6, pre, code, form, fieldset, legend, input, button, textarea, p, blockquote, table, th, td {margin:0; padding:0;}  
      div[data-viewtag='mainView']{
        height: 14in;
        width: 8.5in;
        padding: 0px;
        margin: 0px;
      }
      body img{
        height: auto;
      }
    }
    `
    //@ts-ignore
    if (styleOuter?.styleSheet) {
      //@ts-ignore
      styleOuter.styleSheet.cssText = styleTemplete
    } else {
      styleOuter.innerHTML = styleTemplete
    }
    let nameTarget: string | null = ''
    let title: HTMLTitleElement
    if (titleName) {
      title = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(title.textContent)
      title.textContent = titleName
    }
    iframe.contentWindow!.onbeforeprint = () => {
      log.debug('start')
    }
    iframe.contentWindow!.onafterprint = () => {
      title.textContent = nameTarget
      document.body.removeChild(iframe)
    }
    doc = iframe.contentWindow?.document.documentElement
    let virtualDom = document.createElement('div')
    virtualDom.innerHTML = printELe.innerHTML
    virtualDom.style.height = '11in'
    if (hasBackgroundImage) {
      virtualDom.style.backgroundImage = hasBackgroundImage
      virtualDom.style.backgroundSize = 'cover'
    }
    doc!.getElementsByTagName('head')[0].appendChild(styleOuter)
    doc!.getElementsByTagName('body')[0].appendChild(virtualDom)
    // log.debug(virtualDom, 'mmmmm')
    // iframe.contentWindow?.print()
    const waitIframe = async() => {
      const images = iframe.contentDocument?.images;
      let loadedImagesCount = 0;
      if (images) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.complete) {
            loadedImagesCount++;
          } else {
            img.onload = () => {
              loadedImagesCount++;
              if (loadedImagesCount === images.length) {
                // 所有图片加载完成，开始打印
                setTimeout(() => {
                  iframe.contentWindow?.print();
                });
              }
            };
          }
        }
    
        // 如果所有图片已经加载完成，直接打印
        if (loadedImagesCount === images.length) {
          setTimeout(() => {
            iframe.contentWindow?.print();
          });
        }
      }
    }
    waitIframe()
  },
  downloadCHCFiles({
    data,
    titleName,
  }:{
    data: any[],
    titleName?: string
  }) {
    if (!u.isBrowser()) return
    let zip = new jszip();
    let folder =  zip.folder("EHI Export");
    // for(let ele of data){
    for(let i = 0; i < data.length; i++ ){
      let ele = data[i]
      let domString: {[key in string]}={
        patientString: '',
        encountersString: '',
      }
      const { 
        allergies, pastMedicalHistory, procedures, familyHistory, 
        insuranceProviders, immunizations, results, vitalSign,
        encounters, socialHistory
      } = ele
      let tr = '<tr>', trEnd = '</tr>', th = `<th>`, thEnd = '</th>', td = '<td>', tdEnd = '</td>';
      let trTh = tr + th, tdTrEnd = tdEnd + trEnd, thEndTd = thEnd + td;
      // patient Summary
      let patientInfo = get(ele, 'patientHealthSummary.patientInfo')
      const labels = {
        patientName: 'Patient Name',
        dob: 'Date of Birth',
        sex: 'Sex',
        // race: 'Race',
        // ethnicity: 'Ethnicity',
        contactInfo: 'Contact Info',
        patientId: 'Patient ID',
        documentId: 'Document ID',
        ctime: 'Document Created',
        performer: 'Performer',
        author: 'Author',
        socialSecurity: 'Social Security #',
        email: 'Email',
        identificationTypeNumber: 'Identification Type & Number',
        // identificationType: 'identificationType',
        // identificationNumber: 'identificationNumber',
      };
      const encountersLabel={
        timeSlot: 'Time',
        location: 'Location',
        provider: 'Provider',
        careTeamMember: 'Care team member',
        reason: 'Reason for visit',
        encounterType: 'Encounter type',
        encounterStatus: 'Encounter status',
      }
      for (let key in labels) {
        domString.patientString += trTh + labels[key] + thEndTd + patientInfo[key] + tdTrEnd;
      }
      let encountersTableLabel='<table style="margin: 20px 40px 0px;" class="patientDocumentTable borderNone"><tbody>',
      encountersTableEndLabel='</tbody></table>', 
      trThBorderNone = '<tr><th style="width: 100px;" class="borderNone">',
      thEndTdBorderNone = '</th><td class="borderNone">'
      encounters.forEach(en => {
        domString.encountersString += encountersTableLabel
        for (let key in encountersLabel) {
          domString.encountersString += 
            trThBorderNone + encountersLabel[key] + thEndTdBorderNone + en[key] + tdTrEnd;
        }
        domString.encountersString += encountersTableEndLabel
      })
      
      const allergyKeys = ['substance', 'reaction', 'status'];
      const problemKeys = ['problem', 'problemStatus'];
      const proceduresKeys = ['code', 'startTime', 'status'];
      const familyHistoryKeys = ['diagnosis'];
      const immunizationsKeys = ['vaccine', 'status'];
      const insuranceProvidersKeys = ['payerName', 'policyType', 'policyID', 'policyHolder'];
      const vitalSignKeys = ['measurementDate', 'height', 'weight', 'bloodPressure', 'heartRate', 'o2Sat', 'respRate', 'temp', 'bmi'];
      const socialHistoryKeys = ['name', 'status', 'detail'];
      domString.allergiesString = generateTable(allergies, allergyKeys);
      domString.problem = generateTable(pastMedicalHistory, problemKeys);
      domString.procedures = generateTable(procedures, proceduresKeys);
      domString.familyHistory = generateTable(familyHistory, familyHistoryKeys);
      domString.immunizations = generateTable(immunizations, immunizationsKeys);
      domString.insuranceProviders = generateTable(insuranceProviders, insuranceProvidersKeys);
      domString.vitalSign = generateTable(vitalSign, vitalSignKeys);
      domString.results = generateList(results);
      domString.socialHistory = generateTable(socialHistory, socialHistoryKeys);

      log.debug(domString);

      // 生成tr
      function generateTable(data, keys) {
        return data?.map(item => {
          const rowContent = keys?.map(key => {
            const value = get(item, key)??"";
            return `${td}${value}${tdEnd}`;
          }).join('');
          return `${tr}${rowContent}${trEnd}`;
        }).join('');
      }
      // 生成li
      function generateList(data) {
        return data?.map(item => {
          return `<li>${item['code']}</li>`;
        }).join('');
      }

      folder?.file(`${patientInfo.patientName}.html`, `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
          <style>
          *{
              margin: 0;
              padding: 0;
          }
          html{
            scroll-behavior: smooth
          }
          div.allergiesTable {
              text-align: center;
          }
  
          table {
              border-collapse: collapse;
              width: 1020px;
              margin: auto;
          }
  
          table, th, td {
              border: 1px solid black;
              background-color: white;
          }
          th, td {
              /* padding: 10px; */
              text-align: center;
              padding-left: 15px;
          }
  
          th {
              background-color: #f4f4f4;
              height: 27px;
              font-size: 14px;
              text-align: left;
          }
          td{
              height: 27px;
          }
          tr:nth-child(odd) {
              background-color: #f9f9f9;
          }
          tr:nth-child(even) {
              background-color: #e5e5e5;
          }
          #totalContent{
              width: 1130px;
              height: auto;
              margin: auto;
          }
          #patientSummaryHeader{
          }
          .patientDocumentTable th,td{
              text-align: left;
              background-color: #ffffff;
              vertical-align: top;
              width: 600px;
              word-break: break-all;
          }
          .patientDocumentTable th{
              width:207px;
          }
          .patientDocumentTable td{
              box-sizing: border-box;
          }
          .labelInterval{
              margin-left: 55px;
          }
          .tableHeaderLabel{
              margin-left: 55px;
              font-weight: 600;
              font-size: 20px;
          }
          .tableInterval{
              margin-top: 20px;
          }
          .directoryLabel{
              color:#005795 ;
          }
          .directoryLabel li{
             margin-bottom: 8px;
             font-weight: 600;
          }
          .secondTitle{
              color:#005795 ;
              font-weight: 600;
          }
          .problemTable{
  
          }
          .resultLabel li{
             margin-bottom: 8px;
          }
          .borderNone{
            border: none; 
          }
          a {
            color: #005795;
          }
      </style>

      </head>
      <body>
      <div id="totalContent" style="border: 1px solid #ffffff;">
          <div id="patientSummaryHeader tableInterval">
              <div style="margin-top: 50px;">
                <label class="tableHeaderLabel" for="">
                  Patient Health Summary
                </label>
              </div>
              
              <table style="margin-top: 20px;" class="patientDocumentTable"><tbody>${domString.patientString}</tbody></table>
          </div>
          <!-- Table of Contents -->
          <div id="patientSummaryHeader tableInterval">
              <div style="margin-top: 30px;"><label class="tableHeaderLabel" for="">Table of Contents</label></div>
              <div style="margin-top: 10px;">
                  <ul class="directoryLabel labelInterval " style="margin-left: 75px;">
                      <li><a href="#Allergies">Allergies, Adverse, Reactions, Alrets</a></li>
                      <li><a href="#Encounters">Encounters</a></li>
                      <!-- <li><a href="#Prescription">Prescription</a></li> -->
                      <li><a href="#Problems">Problems</a></li>
                      <li><a href="#Procedures">Procedures</a></li>
                      <li><a href="#Results">Results</a></li>
                      <li><a href="#FamilyHistory">Family History</a></li>
                      <li><a href="#Immunizations">Immunizations</a></li>
                      <li><a href="#InsuranceProviders">Insurance Providers</a></li>
                      <li><a href="#SocialHistory">Social History</a></li>
                      <li><a href="#VitalSign">Vital Sign</a></li>
                </ul>
              </div>
          
          </div>
          <!-- Allergies -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="Allergies" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Allergies, Adverse, Reactions, Alrets</label>
              </div>
              <div class="allergiesTable tableInterval">
                  <table>
                      <tr>
                          <th>Substance</th>
                          <th>Reaction</th>
                          <th>Status</th>
                      </tr>
                      ${domString.allergiesString}
                  </table>
              </div>
          </div>
          <!-- Encounters -->
          <div id="patientSummaryHeader tableInterval Encounters">
            <div id="Encounters" style="margin-top: 50px;"><label class="tableHeaderLabel" for="">Encounters</label></div>
              ${domString.encountersString}
          </div>
          <!-- Problems -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="Problems" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Problems</label>
              </div>
              <div class="problemTable tableInterval">
                  <table>
                      <tr>
                          <th >Problem</th>
                          <th style="width: 200px;">Problem Status</th>
                      </tr>
                      ${domString.problem}
                  </table>
              </div>
          </div>
          <!-- Procedures -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="Procedures" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Procedures</label>
              </div>
              <div class="proceduresTable tableInterval">
                  <table>
                      <tr>
                          <th >Procedure</th>
                          <th >Date</th>
                          <th>Status</th>
                      </tr>
                      ${domString.procedures}
                  </table>
              </div>
          </div>
          <!-- Results -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="Results" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Results</label>
              </div>
              <div style="margin-top: 10px;">
                <ul class="resultLabel " style="margin-left: 55px;list-style: none;">
                  ${domString.results}
                </ul>
              </div>
          </div>
          <!-- Family History -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="FamilyHistory" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Family History</label>
              </div>
              <div class="problemTable tableInterval">
                  <table>
                      <tr>
                          <th >Diagnosis</th>
                      </tr>
                      ${domString.familyHistory}
                  </table>
              </div>
          </div>
          <!-- Immunizations -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="Immunizations" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Immunizations</label>
              </div>
              <div class="proceduresTable tableInterval">
                  <table>
                      <tr>
                          <th >Vaccine</th>
                          <th style="width: 200px;">Status</th>
                      </tr>
                      ${domString.immunizations}
                  </table>
              </div>
          </div>
          <!-- Insurance Providers -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="InsuranceProviders" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Insurance Providers</label>
              </div>
              <div class="allergiesTable tableInterval">
                  <table>
                      <tr>
                          <th>Payer Name</th>
                          <th>policy type/Coverage type</th>
                          <th>Policy ID</th>
                          <th>Policy Holder</th>
                      </tr>
                      ${domString.insuranceProviders}
                  </table>
              </div>
          </div>
          <!-- Social History -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="SocialHistory" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Social History</label>
              </div>
              <div class="proceduresTable tableInterval">
                  <table>
                      <tr>
                          <th >Social History Element</th>
                          <th >Status</th>
                          <th>Detail</th>
                      </tr>
                      ${domString.socialHistory}
                  </table>
              </div>
          </div>
          <!-- Vital Sign -->
          <div id="patientSummaryHeader tableInterval ">
              <div id="VitalSign" style="margin-top: 30px;">
                  <label class="tableHeaderLabel" for="">Vital Sign</label>
              </div>
              <div class="allergiesTable tableInterval">
                  <table>
                      <tr>
                          <th>Measurement Date</th>
                          <th>Height</th>
                          <th>Weight</th>
                          <th>Blood Pressure</th>
                          <th>Heart Rate</th>
                          <th>O2 Sat</th>
                          <th>Resp Rate</th>
                          <th>Temp</th>
                          <th>BMI</th>
                      </tr>
                      ${domString.vitalSign}
                  </table>
              </div>
          </div>

      </div>
  
  </body>
      
      </html>
      `);
    }
   
    zip.generateAsync({
        type: 'blob',// 压缩类型
        compression: "DEFLATE", // STORE：默认不压缩 DEFLATE：需要压缩
        compressionOptions: {
            level: 9 // 压缩等级1~9 1压缩速度最快，9最优压缩方式
        }
    }).then(function(content) {
        let filename = 'EHI Export';
        let eleLink = document.createElement('a');
        eleLink.download = filename;
        eleLink.style.display = 'none';
        eleLink.href = URL.createObjectURL(content);
        document.body.appendChild(eleLink);
        eleLink.click();
        document.body.removeChild(eleLink);

    });
  },
  async getPDFBase64({
    type,
    data
  }: {
    type: string
    data: Record<string, any>
  }) {
    const resp = await apiAxios("proxy")({
      method: "POST",
      url: "/api/html2pdf",
      data: {
        type: type,
        data: data,
        platform: "web"
      }
    })
    return resp.data.data
  },
  downloadPDFByBase64({
    base64,
    title
  }: {
    base64: string
    title: string
  }) {
    if (!u.isBrowser()) return
    const content = store.level2SDK.utilServices.base64ToUTF8(base64)
    const iframe = document.createElement("iframe")
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print()
      });
    }
    iframe.style.cssText = `
      position: absolute;
      width: 0px;
      height: 800px;
      margin: 0;
      padding: 0;
      border: none;
    `
    iframe.setAttribute('id', 'printIframe')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument as Document
    doc.open()
    doc.write(content)
    doc.close()
    const style = doc.createElement("style")
    style.innerHTML = `
      @page {
        margin: 40 60 40 60;
      }
      body * {
        -webkit-print-color-adjust:exact; 
        -moz-print-color-adjust:exact; 
        -ms-print-color-adjust:exact; 
        print-color-adjust:exact; 
      }
    `
    doc.head.appendChild(style)
    let titleDom: HTMLTitleElement
    let nameTarget: string | null
    if (title) {
      titleDom = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(titleDom.textContent)
      titleDom.textContent = title
    }
    iframe.contentWindow?.addEventListener("beforeprint", () => {
      log.info("START")
    })
    iframe.contentWindow?.addEventListener("afterprint", () => {
      log.info("END")
      if(titleDom)
        titleDom.textContent = nameTarget
      setTimeout(() => {
        iframe.remove()
      })
    })
  },
  async downloadStringToPdf({data,facilityInfo, imgId}: { data: {[key in string]}[], facilityInfo: {[key in string]}, imgId: string}){
    let dom, img: any = ''
    if(imgId) img = await prepareDocToPath(imgId)
    function getDateRange(start, end){
      return moment(start * 1000).format('MM/DD/YYYY') + ' - ' + 
      moment(end * 1000).format('MM/DD/YYYY')
    }
    function getGenerateDate(ctime){
      return moment(ctime * 1000).format('MM/DD/YYYY')
    }
    function getInsuranceType(tage){
      switch (tage) {
        case 0:
          return 'All Payers';
        case 1:
          return 'Medicare';
        case 2:
          return 'Medicaid';
        case 3:
          return 'TRICARE';
        case 4:
          return 'CHAMPVA';
        case 5:
          return 'Group Health Plan';
        case 6:
          return 'FECA BLKLung';
        case 7:
          return 'Other';
      }
    }
    function generateList(data) {
      if(!data) return '';
      return data?.map(item => {
        return `<li style="width: 670.6px; height: auto; overflow: hidden; margin-top: 9.66px; position: relative; outline: none; list-style: none;">
        <div class="label" style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: 412.68px; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
        ${item.payerInfo.name}</div>
        <div class="label" style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: 168.51px; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
        ${item.count}</div>
        <div class="label" style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: auto; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
        ${item.type}</div>
        </li>`;
      }).join('');
    }
    dom = `
    <div 
    style="margin: 0px 20px 0px; width: 670.6px; position: relative; outline: none; height: auto;">
    <div  class="label"
        style="margin-top: 43.47px; font-size: 21.5279px; font-weight: 700; width: 670.6px; height: 44.92px; color: rgb(0, 87, 149); border-color: rgb(0, 87, 149); border-width: 2px; text-align: left; position: relative; outline: none; display: flex; align-items: center; justify-content: flex-start; border-radius: 0px; border-style: none none solid;">
        List of Summarize Payers(Date Range)</div>
    <div  class="scroll-view"
        style="margin-top: 9.66px; width: 670.6px; height: 593.12px; position: relative; outline: none; display: block;">
        <div 
            style="margin-top: 19.32px; display: flex; position: relative; outline: none; height: auto;"><img
                
                data-name="businessLogo" data-src="../admin/admin/assets/office-building.svg"
                data-value="[object Promise]" src="${img.url??''}"
                style="margin-top: 24.15px; width: 47.39px; height: 51.2px; position: relative; outline: none; object-fit: contain;">
            <div 
                style="margin-left: 25.79px; position: relative; outline: none; height: auto; margin-top: 0px;">
                <div class="label"
                    style="color: rgb(51, 51, 51); font-size: 17.8654px; font-weight: 600; word-break: keep-all; margin-top: 0px; position: relative; outline: none; height: auto;">
                    ${facilityInfo.name.basicInfo.medicalFacilityName}</div>
                <div
                    class="label"
                    style="color: rgb(51, 51, 51); font-size: 12.5178px; font-weight: 500; word-break: keep-all; margin-top: 9.66px; position: relative; outline: none; height: auto;">
                    ${facilityInfo.name.basicInfo.location}</div>
                <div 
                    style="margin-top: 0.97px; display: flex; position: relative; outline: none; height: auto;">
                    <div style="margin-top: 0.97px; width: 223.53px; position: relative; outline: none; height: auto;">
                        <div  class="label"
                            style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            Main #</div>
                        <div class="label"
                            style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            ${facilityInfo.name.basicInfo.phoneNumber}</div>
                    </div>
                    <div style="margin-top: 0.97px; position: relative; outline: none; height: auto;">
                        <div  class="label"
                            style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            Email</div>
                        <div class="label"
                            style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            ${facilityInfo.name.basicInfo.email}</div>
                    </div>
                </div>
                <div 
                    style="margin-top: 0.97px; display: flex; position: relative; outline: none; height: auto;">
                    <div 
                        style="margin-top: 0.97px; width: 223.53px; position: relative; outline: none; height: auto;">
                        <div  class="label"
                            style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            Fax #</div>
                        <div class="label" style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            ${facilityInfo.name.basicInfo.fax}</div>
                    </div>
                    <div 
                        style="margin-top: 0.97px; position: relative; outline: none; height: auto;">
                        <div class="label"
                            style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            Website</div>
                        <div class="label"
                            style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                            ${facilityInfo.name.basicInfo.website}</div>
                    </div>
                </div>
            </div>
        </div>
        <div  style="margin-top: 24.15px; position: relative; outline: none; height: auto;">
            <div  style="margin-top: 0.97px; position: relative; outline: none; height: auto;">
                <div  class="label"
                    style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    Generate Date</div>
                <div class="label"
                    style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    ${getGenerateDate(get(data, 'ctime'))}</div>
            </div>
            <div  style="margin-top: 0.97px; position: relative; outline: none; height: auto;">
                <div class="label"
                    style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    Date Range</div>
                <div class="label"
                    style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    ${getDateRange(get(data, 'name.title'), get(data, 'name.user'))}</div>
            </div>
            <div  style="margin-top: 0.97px; position: relative; outline: none; height: auto;">
                <div id="_skij3i4e2" class="label"
                    style="display: inline-block; vertical-align: middle; font-size: 10.7468px; color: rgb(102, 102, 102); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    Insurance Type</div>
                <div class="label"
                    style="display: inline-block; vertical-align: middle; margin-left: 7.91px; font-size: 11.585px; font-weight: 600; color: rgb(51, 51, 51); word-break: keep-all; position: relative; outline: none; height: auto; margin-top: 0px;">
                    ${getInsuranceType(get(data, 'tage'))}</div>
            </div>
        </div>
        <div
            style="margin-top: 24.15px; background-color: rgb(222, 222, 222); width: 670.6px; height: 6.76px; position: relative; outline: none;">
        </div>
        <div
            style="width: 670.6px; position: relative; outline: none; height: auto; margin-top: 0px;">
            <div style="height: 28.98px; box-sizing: border-box; margin-top: 19.32px; position: relative; outline: none;">
                <div class="label"
                    style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: 412.68px; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
                    Payer Name</div>
                <div class="label"
                    style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: 168.51px; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
                    Patient Count</div>
                <div class="label"
                    style="font-size: 13.24px; font-weight: 600; color: rgb(51, 51, 51); box-sizing: border-box; width: auto; display: inline-block; position: relative; outline: none; height: auto; vertical-align: top; margin-top: 0px;">
                    Type</div>
            </div>
            <ul style="padding: 0px;">
              ${generateList(get(data, 'deat'))}
            </ul>
        </div>
    </div>
</div>
    `;
    let ele: any = document.createElement("iframe")
    document.body.appendChild(ele)
    let doc = ele.contentWindow?.document.documentElement
    doc!.getElementsByTagName('body')[0].appendChild(document.createElement("div"))
    doc!.getElementsByTagName('body')[0].innerHTML = dom
    // document.body.appendChild(ele);
    ele.style.zIndex = '-100'
    ele.style.position = 'absolute'
    ele.style.left = '200px'
    const opts = {
      scale: 12, // 缩放比例，提高生成图片清晰度
      useCORS: true, // 允许加载跨域的图片
      allowTaint: false, // 允许图片跨域，和 useCORS 二者不可共同使用
      tainttest: true, // 检测每张图片已经加载完成
      logging: true, // 日志开关，发布的时候记得改成 false
    };
    html2canvas(doc.getElementsByTagName('div')[0], opts)
        .then((canvas) => {
          let contentWidth = canvas.width;
          let contentHeight = canvas.height;
          // 一页pdf显示html页面生成的canvas高度;
          let pageHeight = (contentWidth / 592.28) * 841.89;
          // 未生成pdf的html页面高度
          let leftHeight = contentHeight;
          // 页面偏移
          let position = 0;
          // a4纸的尺寸[595.28,841.89]，html页面生成的canvas在pdf中图片的宽高
          let imgWidth = 595.28 - 40;
          let imgHeight = (592.28 / contentWidth) * contentHeight;
          let pageData = canvas.toDataURL("image/jpeg", 1.0);
          // a4纸纵向，一般默认使用；new JsPDF('landscape'); 横向页面
          let PDF = new jspdf("p", "pt", "a4");
          // 当内容未超过pdf一页显示的范围，无需分页
          if (leftHeight < pageHeight) {
            // addImage(pageData, 'JPEG', 左，上，宽度，高度)设置
            PDF.addImage(pageData, "JPEG", 20, 0, imgWidth, imgHeight);
          } else {
            // 超过一页时，分页打印（每页高度841.89）
            while (leftHeight > 0) {
              PDF.addImage(pageData, "JPEG", 0, position, imgWidth, imgHeight);
              leftHeight -= pageHeight;
              position -= 841.89;
              if (leftHeight > 0) {
                PDF.addPage();
              }
            }
          }
          PDF.save('List of Summarize Payers' + ".pdf");
          document.body.removeChild(ele)
        })
        .catch((error) => {
          log.debug("打印失败", error);
        });
  },

  async exportMultiplePagesPdf({
    pages,
    timeOut = 0,
    timeDeno = 1000,
    holeOption,
    fileName,
  }: {
    pages?: object[]
    fileName?: string
    timeOut?: number
    holeOption?: string
    timeDeno?: number
  }) {
    if (!u.isBrowser()) return
    window.scrollTo(0, 0)
    window.pageYOffset = 0
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    // let ele = document.querySelector(`[data-viewtag=${viewTag}]`) as HTMLElement;
    let ele: HTMLElement = document.querySelector(
      `[data-viewtag=${pages?.[0]?.['viewTag']}]`,
    ) as HTMLElement
    let ifr = document.createElement('IFRAME') as HTMLIFrameElement
    let divDom = document.createElement('div') as HTMLDivElement
    let printDom: HTMLDivElement | null = document.createElement(
      'div',
    ) as HTMLDivElement
    printDom.innerHTML = ele.innerHTML
    printDom.style.cssText = ele.style.cssText
    let nameTarget: string | null = ''
    let title: HTMLTitleElement
    if (fileName) {
      title = document.getElementsByTagName('title')[0]
      nameTarget = cloneDeep(title.textContent)
      title.textContent = fileName
    }
    if (pages?.length) {
      let createIfr = (index: number) => {
        let loc = location.href
        let newAddress =
          loc.lastIndexOf('-') != -1
            ? loc.replace(/(-)\w+$/, `-${pages?.[index]?.['pageName']}`)
            : loc + `-${pages?.[index]?.['pageName']}`
        ifr.style.cssText = ele?.parentElement?.style.cssText as string
        ifr.style.zIndex = '-1'
        ifr.style.position = 'absolute'
        ifr.src = newAddress
        ele.appendChild(ifr)
        return ifr
      }
      let opp = async function (index: number) {
        try {
          return await new Promise((res) => {
            let you = setInterval(() => {
              let yourBody = document
                .getElementsByTagName('iframe')[0]
                .contentDocument?.querySelector(
                  `[data-viewtag=${pages?.[index]?.['viewTag']}]`,
                )
              if (yourBody) {
                setTimeout(() => {
                  res(yourBody)
                }, timeOut)
                clearInterval(you)
              }
            }, 100)
          })
        } catch {
          log.debug(
            '%c error -> %c Error downloading pdf ',
            'background:red ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
            'background: #ff0101; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
          )
        }
      }
      let removeIfrm = async function (ifrm) {
        try {
          return new Promise((res) => {
            let you = setTimeout(() => {
              res('Ifram node deleted successfully')
              clearTimeout(you)
              ele.removeChild(ifrm)
              window.history.back()
            }, 350)
          })
        } catch {
          log.debug(
            '%c error -> %c Error downloading pdf ',
            'background:red ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
            'background: #ff0101; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
          )
        }
      }
      for (let i = 1; i < pages!.length; i++) {
        let ifrm = createIfr(i)
        let reainDom = await opp(i)
        let removeStatus = await removeIfrm(ifrm)
        divDom.innerHTML = (reainDom as HTMLIFrameElement).innerHTML
        divDom.style.cssText = ele.style.cssText
        let y = printDom.getElementsByClassName('scroll-view')
        if (holeOption?.length === pages!.length - 1) {
          ;(y.item(i - 1) as HTMLDivElement).style.height =
            parseFloat((y.item(i - 1) as HTMLDivElement).style.height) +
            holeOption[i - 1] +
            'px'
        }
        printDom.innerHTML += divDom.innerHTML
      }
    }
    // 获取分辨率
    const dpi = getScreenDpi()
    const px2cm = 25.4 / dpi // mm
    log.debug(ele.getBoundingClientRect().width, 'mmmm')
    const iframeWidth = ele.getBoundingClientRect().width
    const iframHeight = ele.scrollHeight
    // 获取缩放比例
    // latter 纸的大小
    const letterW = 210
    const letterH = 297
    let scaleX1 = letterW / (ele.getBoundingClientRect().width * px2cm)
    let scaleY1 = letterH / (iframHeight * px2cm)
    const printELe = printDom
    let iframe = document.createElement('IFRAME') as HTMLIFrameElement
    iframe.setAttribute('id', 'printIframe')
    let doc: HTMLElement | undefined
    iframe.setAttribute(
      'style',
      `position:absolute;width:0px;padding:0px;margin:0px;`,
    )
    document.body.appendChild(iframe)
    const styleOuter = document.createElement('style') as HTMLStyleElement
    scaleY1 = scaleY1 - 0.02
    const styleTemplete: string = `
    body img{
      height: auto;
    }
    @media print{
      
      header nav, footer, video, audio, object, embed {
        display: none;
      }
      body, div, img,dl, dt, dd, ul, ol, li, h1, h2, h3, h4, h5, h6, pre, code, form, fieldset, legend, input, button, textarea, p, blockquote, table, th, td {margin:0; padding:0;}  
      body{
        height: ${iframHeight}px;
        width: ${iframeWidth}px;
        zoom: ${+scaleX1}
      }
      body img{
        height: auto;
      }
    }
    `
    log.debug(iframHeight, iframeWidth, scaleX1)
    //@ts-ignore
    if (styleOuter?.styleSheet) {
      //@ts-ignore
      styleOuter.styleSheet.cssText = styleTemplete
    } else {
      styleOuter.innerHTML = styleTemplete
    }
    iframe.contentWindow!.onbeforeprint = () => {
      log.debug('start')
    }
    iframe.contentWindow!.onafterprint = () => {
      document.body.removeChild(iframe as HTMLIFrameElement)
      title.textContent = nameTarget
    }
    doc = iframe.contentWindow?.document.documentElement
    let virtualDom = document.createElement('div')
    virtualDom.innerHTML = printELe.innerHTML
    virtualDom.style.height = '100px'
    doc!.getElementsByTagName('head')[0].appendChild(styleOuter)
    doc!.getElementsByTagName('body')[0].appendChild(virtualDom)
    setTimeout(() => {
      printDom?.remove()
      printDom = null
      iframe?.contentWindow?.print()
      document.body.removeChild(iframe as HTMLIFrameElement)
      title.textContent = nameTarget
    }, timeDeno)
  },
  codeCompile({ param, codeSnip }: { param: any; codeSnip: string }) {
    let fun = new Function(...Object.keys({ param }), codeSnip)
    return fun(...Object.values({ param }))
  },
  async getImgByDocIds({ ids }: { ids: string[] }) {
    let path
    let type
    let newArr: { [key in string]: any }[] = []
    if (!ids.length) {
      log.error('Get the ID array of the picture is empty')
      return []
    }
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] && typeof ids[i] == 'string' && !ids[i].includes('.')) {
        const resp = await retrieveDocument(ids[i])
        const document = resp?.data?.document?.length
          ? resp?.data?.document[0]
          : null
        await documentToNote({ document }).then(
          (note) => {
            if (!(note?.name?.data == String(undefined)) && note?.name?.data) {
              let blob = store.level2SDK.utilServices.base64ToBlob(
                note?.name?.data,
                note?.name?.type,
              )
              type = note?.name?.type
              path = URL.createObjectURL(blob)
              newArr.push({ type: type, path: path })
            } else {
              log.error(new Error('Error in obtaining picture data'))
            }
          },
          (error) => {
            if (store.env === 'test') {
              log.error(
                error instanceof Error ? error : new Error(String(error)),
              )
            }
          },
        )
      }
    }

    return newArr
  },
  getPreviousPageName() {
    let startPage
    let url = window.location.href
    const urlParts = url.split('/')
    const pathname = urlParts[urlParts.length - 1]
    const pageParts = pathname.split('?')[1]
    const baseArr = pageParts.split('-')
    if (baseArr.length >= 2 && baseArr[baseArr.length - 2] !== '') {
      startPage = baseArr[baseArr.length - 2]
    }
    return startPage
  },
  getPageNames() {
    let url = window.location.href
    const urlParts = url.split('/')
    const pathname = urlParts[urlParts.length - 1]
    const pageParts = pathname.split('?')[1]
    const baseArr = pageParts.split('-')
    if (baseArr.length >= 1) {
      return baseArr
    }
    return []
  },
  exportCSV({
    data,
    titleName,
    fileName,
  }: {
    data: { [key in string]: any }[]
    titleName: string[]
    fileName: string
  }) {
    if (!u.isBrowser()) return
    let toCsv = () => {
      let row: string = '',
        csvData: string = ''
      for (const title of titleName) {
        row += '"' + title + '",'
      }
      csvData += row + '\r\n'
      for (const item of data) {
        row = ''
        for (let i = 0; i < titleName.length; i++) {
          row += '"' + item[titleName[i]] + '",'
        }
        csvData += row + '\r\n'
      }
      if (!csvData) return
      return csvData
    }

    let alink = document.createElement('a')
    let csvData = toCsv()
    if (window.Blob && window.URL) {
      const csvDataBlob = new Blob(['\uFEFF' + csvData], {
        type: 'text/csv',
      })
      alink.href = URL.createObjectURL(csvDataBlob)
    }
    document.body.appendChild(alink)
    alink.setAttribute('download', fileName)
    alink.click()
    document.body.removeChild(alink)
  },
  async getOrderStatus(orderId) {
    let status: string = ''
    if (orderId && typeof orderId == 'string' && !orderId.includes('.')) {
      const resp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [orderId],
        options: {
          xfname: 'eid',
          type: 3001,
        },
      })
      const document = resp.data.document[0]
      if (document) {
        const note = await documentToNote({ document })
        const orderStatus = get(note, 'name.data.orderStatus')
        const orderStatusColor = get(note, 'name.data.orderStatusColor')
        status = `<font color=${orderStatusColor}>${orderStatus}</font>`
      }
    }
    return status
  },
  async getSquareID(id) {
    let squareID: string = ''
    if (id) {
      const resp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [id],
        options: {
          xfname: 'eid',
          type: 3001,
          maxcount: 1,
          obfname: 'ctime',
        },
      })
      const document = resp.data.document[0]
      if (document) {
        const note = await documentToNote({ document })
        squareID = get(note, 'deat.squareID')
      }
    }
    return '#' + squareID
  },
  async getPaymentStatus(obj) {
    let status: string = ''
    if (obj['id']) {
      const resp = await store.level2SDK.documentServices.retrieveDocument({
        idList: [obj['id']],
        options: {
          ObjType: 28,
          xfname: 'E2.id',
          sfname:
            '{"result":"D.*", "join":"INNER JOIN Edge E on D.eid = E.id INNER JOIN Edge E2 on E2.id = E.refid"}',
          scondition:
            'E.type = 1113 AND E2.type=40000 AND D.type in (2001,2002,2006)',
        },
      })
      
      const document = resp.data.document[0]
      let paymentStatus: string, paymentStatusColor: string
      if (document) {
        const note = await documentToNote({ document })
        log.debug(note);
        if (get(note, 'type') == 2001) {
          if (get(note, 'deat.state') == 'COMPLETED') {
            paymentStatus = 'Paid'
            paymentStatusColor = '#2fb355'
            status = `<p style="color:${paymentStatusColor}">${paymentStatus}</p>`
          }else if(get(note, 'deat.state') == 'DRAFT'){
            paymentStatus = 'DRAFT'
            paymentStatusColor = '#8f959e'
            status = `<p style="color:${paymentStatusColor}">${paymentStatus}</p>`
          }
        } else if (get(note, 'type') == 2002) {
          paymentStatus = 'Refund'
          paymentStatusColor = '#F8AE29'
          status = `<p style="color:${paymentStatusColor}">${paymentStatus}</p>`
        } else if (get(note, 'type') == 2006) {
          paymentStatus = 'Paid'
          paymentStatusColor = '#2fb355'
          status = `<p style="color:${paymentStatusColor}">${paymentStatus}</p>`
        }
      } else {
        paymentStatus = 'Unpaid'
        paymentStatusColor = '#E24445'
        status = `<p style="color:${paymentStatusColor}">${paymentStatus}</p>`
      }
    }
    return status
  },
  setLockScreen({
    names,
    values,
  }: {
    names: string[]
    values: (string | number)[]
  }) {
    for (let i = 0; i < names.length; i++) {
      localStorage.setItem(names[i], values[i] + '')
    }
  },
  async createAuditLog({
    actionTypeCode,
    recordTypeCode,
    eid,
    user,
    userId,
    targetUserId,
    date,
    accessPort,
    amendment = '',
    targetUser,
    amendmentId = '',
    directDetails = '',
  }: {
    actionTypeCode: number
    recordTypeCode: number
    eid: string
    user: string
    date: number | string
    userId: string
    accessPort: string
    targetUserId: string
    targetUser: string
    amendment?: string
    amendmentId?: string
    directDetails?: string
  }) {
    if (eid && eid.startsWith('=')) {
      return 
    }    
    const type = (+actionTypeCode << 24) + +recordTypeCode
    const action = [
      'Add',
      'Cancel',
      'Change',
      'Create',
      'Delete',
      'Download',
      'Edit',
      'Finish',
      'Invite',
      'Print',
      'Replace',
      'Send',
      'Update',
      'Upload',
      'View',
      'Copy',
      'Recover',
      'Transcribe',
    ] as string[]
    const recordType: { [key: number]: string } = {
      2305: 'Absence/Excuse Note',
      1: 'Account',
      189441: 'CMS1500',
      1537: 'Blank Note',
      168961: 'Confidential Morbidity Report',
      238081: 'COVID19 PCR Test Results',
      138241: 'COVID19 Results & Flu A&B Results',
      107521: 'COVID19 Testing Constent  New Patient',
      110081: 'COVID19 Testing Constent Form',
      130561: 'DWC Form RFA',
      1793: 'Evaluation Note',
      174081: 'Financial Responsibility Form',
      176641: 'Flu Vaccination Consent Form',
      135681: 'Initial Evaluation Report',
      163841: 'Local Document',
      204801: 'Medical Recommendation',
      117761: 'Moderna Vaccine Form - First Dose',
      120321: 'Moderna Vaccine Form - Second Dose',
      94721: 'New Patient Forms',
      131075: 'Office Visit Appointment',
      131081: 'Office Visit Unscheduled Appointment',
      1053: 'Participants',
      65536: 'Patient',
      25601: 'Medical History',
      156161: 'Patient Consent Form  HIPPA',
      102401: 'Patient Profile',
      112641: 'PfizerBioNTech Vaccine  First Dose',
      115201: 'PfizerBioNTech Vaccine  Second Dose',
      125441: 'PR1',
      128001: 'PR2',
      2049: 'Prescription',
      140801: 'Progress Report',
      393219: 'Service Room Appointment',
      393225: 'Service Room Unscheduled Appointment',
      1200: 'Staff',
      289280: 'Staff Permission',
      184321: 'Superbill',
      187137: 'Meeting Transcription',
      133121: 'Surgery Authorization',
      196611: 'Telemedicine Appointment',
      196619: 'Telemedicine Unscheduled Appointment',
      192001: 'UB04',
      30721: 'Visit Questionnaire',
      28161: 'Vital Signs',
      122881: 'Work Status Form',
      9216: 'Macro',
      10000: 'Medical Document Trash',
      348161: 'Physical TherapyReport',
      363521: 'Referral Note',
      440321: 'Document Template',
      768001: "Provider's SOAP Note",
      770561: "Patient Instructions",
      773121: "Transcription Summary",
      499201: "Surgery Report",
      501761: "EHI Export"
    }
    let result: any
    let docu: object = {
      date: date ? (date as number) / 1000 : Date.now() / 1000,
      record: recordType[recordTypeCode],
      user: `${user}: ${userId}`,
      action: action[actionTypeCode - 1],
      accessDevice: `web-${accessPort}`,
      targetUserId: `${targetUser}: ${targetUserId}`,
      amendment: amendment,
      amendmentId: amendmentId,
      dateEnd: Date.now() / 1000,
      details: directDetails ? directDetails : date ? 'block' : 'none',
    }
    try {
      log.info(
        '%cCreate Document Request',
        'background: purple; color: white; display: block;',
        {
          title: '',
          content: docu,
          type: type as number,
          edge_id: eid,
        },
      )
      result = await Document.create({
        title: '',
        content: docu,
        type: type as any,
        edge_id: eid,
      })
      log.info(
        '%cCreate Document Response',
        'background: purple; color: white; display: block;',
        result,
      )
    } catch (error) {
      throw error
    }
    return result
  },
  /**
   * Creates a new document expecting metrics for "slowness".
   */
  createSlownessMetric({
    edge_id,
    title = '',
    content = {},
    ...createDocumentOptions
  }: Partial<Parameters<typeof Document.create>[0]> = {}) {
    return Document.create({
      type: 10101,
      title,
      content,
      mediaType: 'application/json',
      edge_id: edge_id as string,
      ...createDocumentOptions,
    })
  },
  /**
   * Creates a new document expecting memory usage metrics.
   */
  createMemoryUsageMetric({
    edge_id,
    title = '',
    content = {},
    ...createDocumentOptions
  }: Partial<Parameters<typeof Document.create>[0]>) {
    return Document.create({
      type: 10100,
      title,
      content,
      mediaType: 'application/json',
      edge_id: edge_id as string,
      ...createDocumentOptions,
    })
  },
  getTypes({
    actionTypeCode,
    recordTypeCode,
  }: {
    actionTypeCode: number[]
    recordTypeCode: number[]
  }): string {
    let str: string = ''
    let i = 0
    actionTypeCode.forEach((itemO) => {
      recordTypeCode.forEach((itemT) => {
        let type = (itemO << 24) + itemT
        str += type + ','
      })
    })
    return str.slice(0, -1)
  },
  getJumpPage(): string[] {
    // history.go(-(history.length- +(localStorage.getItem("keepingLockStateNumbers") as string)));
    return JSON.parse(localStorage.getItem('lockPreUrl') as string)
  },
  escapeSeq({ str }: { str: {} }): string {
    return JSON.stringify(str)
  },
  showAppointmentStatus(appointmentStatus: any): string {
    // 如果会议已经结束
    if ((appointmentStatus['tage'] & 0x100) === 0x100) return 'Completed'
    else if ((appointmentStatus['tage'] & 0x800) === 0x800) return ''
    // 根据会议的subtype显示不同的文字
    else
      switch (appointmentStatus['subtype'] & 0xff) {
        case 11:
          return 'Canceled'
        case 15:
          return 'Changed'
        case 17:
          return 'Replaced'
        default:
          return 'Scheduled'
      }
  },
  selectAppointmentStatus({arr,type}:{arr:Array<Object>,type:string}){
    const result:unknown[] = []
    if(type='All'){
      return arr
    }else{
      arr.forEach(item=>{
        if(this.showAppointmentStatus(item) === type){
          result.push(item)
        }
      })
      return result
    }
  },
  async sendCHC({
    method,
    url,
    token,
    data,
  }: {
    method: string
    url: string
    token: string
    data: {files: [any],request: any}
    }) {
    let form = new FormData();
    form.append('files', data.files[0])
    form.append("request", JSON.stringify(data.request))
    log.debug('form', form);
    return await fetch(url, {
      mode: 'cors',
      method: method,
      headers: {
        Authorization: token,
      },
      body: form,
    })
      .then((response) => response.json())
      .catch((error) => {
        log.debug('Authorization failed: ' + error.message)
        return (error as any).response.data
      })
  },
  async sendRestfulAPI({
    method,
    url,
    token,
    data,
  }: {
    method: string
    url: string
    token: string
    data: {}
  }) {
    let headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Accept', 'application/*')
    headers.append('Authorization', token)
    headers.append('Origin', 'http://localhost:3000')
    let resp
    await fetch(url, {
      mode: 'cors',
      method: method,
      headers: headers,
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((json) => {
        resp = json
        log.debug(json)
      })
      .catch((error) => log.debug('Authorization failed: ' + error.message))
    return resp
  },
  async sendClaimToCHC({
    url,
    token,
    data,
  }: {
    method: string
    url: string
    token: string
    data: {}
  }) {
    let headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Accept', 'application/*')
    headers.append('Authorization', token)
    headers.append('Origin', 'http://localhost:3000')

    let resp
    try {
      const chcresp = await axios.post(url, data, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `${token}`,
            },
      })
      console.error('chcresp', chcresp)
      resp = chcresp;
      return resp.data
    } catch (error) {
      let resp = (error as any).response.data
      resp.status = "FAIL"
      return resp.data
    }

  },
  operationFun({
    operation,
    operator,
  }: {
    operation: {
      valOne: number
      valTwo: number
      result: number
    }
    operator: string
  }) {
    return new Function(
      ...Object.keys(operation),
      `return ((valOne ${operator} valTwo) === result);`,
    )(...Object.values(operation))
  },
  setStorage({ key, value }: { key: string; value: any }) {
    return localStorage.setItem(key, JSON.stringify(value))
  },
  getStorage({ key }: { key: string }) {
    let value = localStorage.getItem(key) as string
    try {
      value = JSON.parse(value)
      return value
    } catch {
      return value
    }
  },
  removeStorage({ key }: { key: string }) {
    return localStorage.removeItem(key)
  },
  /**
   * @param alphabet Alphabet used to generate the ID.
   * @param size Size of the ID.
   * @returns A random string generator.
   */
  customAlphabet({
    alphabet,
    size,
  }: {
    alphabet: string
    size: number
  }): string {
    return customAlphabet(alphabet, size)()
  },
  base58Tobase64({ key }: { key: string }): string {
    let uint8Array = store.level2SDK.utilServices.base58ToUint8Array(key)
    return store.level2SDK.utilServices.uint8ArrayToBase64(uint8Array)
  },
  base58ToKey({ key }: { key: string }):string{
    let uint8Array = store.level2SDK.utilServices.base58ToUint8Array(key)
    return Uint8ArrayToString(uint8Array)
  },
  base64Tobase58({ key }: { key: string }): string {
    let uint8Array = store.level2SDK.utilServices.base64ToUint8Array(key)
    return store.level2SDK.utilServices.uint8ArrayToBase58(uint8Array)
  },
  base64Tobase32({key}){
    let uint8Array = store.level2SDK.utilServices.base64ToUint8Array(key)
    return uint8ArrayToBase32(uint8Array)
  },
  async updateEdgeEvid({ rootEdge, evid }: { rootEdge: any; evid: string }) {
    const currentUserPk = localStorage.getItem('facility_pk')
      ? localStorage.getItem('facility_pk')
      : localStorage.getItem('pk')
    const currentUserSk = localStorage.getItem('facility_sk')
      ? localStorage.getItem('facility_sk')
      : localStorage.getItem('sk')
    let rootEdgeBesak = rootEdge?.besak
    const besakU8 = store.level2SDK.utilServices.base64ToUint8Array(
      rootEdgeBesak!,
    )
    const currentUserPkUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(currentUserPk!)
    const currentUserSkUint8Array =
      store.level2SDK.utilServices.base64ToUint8Array(currentUserSk!)
    log.debug(currentUserPkUint8Array)
    log.debug(currentUserSkUint8Array)

    const halfkey = store.level2SDK.utilServices.aKeyDecrypt(
      currentUserPkUint8Array,
      currentUserSkUint8Array,
      besakU8,
    )
    const eVertex = await retrieveVertex(rootEdge.evid)
    const eVertexPk = eVertex.data.vertex[0].pk
    const eesak = store.level2SDK.utilServices.aKeyEncrypt(
      eVertexPk,
      currentUserSkUint8Array,
      halfkey!,
    )
    const options = {
      type: rootEdge.type,
      bvid: rootEdge.bvid,
      evid: evid,
      eesak,
      name: rootEdge.name,
    }
    await store.level2SDK.edgeServices.updateEdge({
      id: rootEdge.id,
      ...options,
    })
  },
  replaceAppTage({
    oldTage,
    isUnschedule,
    oldReasonDoc,
    newReasonDoc,
  }: {
    oldTage: number
    isUnschedule: boolean
    oldReasonDoc: string[]
    newReasonDoc: string[]
  }): number {
    let newTage = 1
    // 判断reason里的doc是否改变,改变第2位为1
    if (newReasonDoc.length) {
      let reasonChangeStatus: boolean = true
      for (let i = 0; i < newReasonDoc.length; i++) {
        if (!oldReasonDoc.includes(newReasonDoc[i])) {
          reasonChangeStatus = false
          break
        }
      }
      if (reasonChangeStatus) newTage = newTage | (1 << 1)
    } else {
      // 如果newReasonDoc 为空则继承oldTage的第2位
      newTage = newTage | (((oldTage >> 1) & 1) << 1)
    }
    // 判断是否是unscheduleApp，是则改变第12位为1,以及第4位
    if (isUnschedule) {
      newTage = newTage | (1 << 11)
      newTage = newTage | (1 << 3)
    } else {
      newTage = newTage | (0 << 11)
      newTage = newTage | (0 << 3)
    }
    // 获取第五位的值 (newTage>>4)&1
    // 改变第5,13,14,15,16位的值
    let bitArr = [4, 12, 13, 14, 15]
    for (let i = 0; i < bitArr.length; i++) {
      newTage = newTage | (((oldTage >> bitArr[i]) & 1) << bitArr[i])
    }
    return newTage
  },
  delPayRecordStats(tage) {
    switch (tage) {
      case 0:
        return 'Unpaid'
      case 1:
        return 'Paid'
      case 2:
        return 'Unpaid'
      case 3:
        return 'Unpaid'
      case 4:
        return 'Refund'
      case 5:
        return 'Past Due'
      case 6:
        return 'Paid'
      default:
        break
    }
  },
  clearTimerCache({ name, delay = 0 }: { name: string; delay: number }) {
    const timer = setTimeout(() => {
      ;(window as any).app.cache.timer.remove(name)
      clearTimeout(timer)
    }, delay)
  },
  calOffline(payObj: {}) {
    return (
      '$' +
      (
        (get(payObj, 'deat.revenue', 0) - get(payObj, 'deat.revenueFromSquare', 0)) /
        100
      ).toFixed(2)
    )
  },
  // 生成一个随机的号码 
  async generateTempPhone({prefix,totalLength}:{prefix:number|string,totalLength:number|string}){
    async function phoneRepeat(){
      let tempPhone = `${prefix.toString()}${customAlphabet("0123456789",(+totalLength)-(prefix.toString().length))()}`
      const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
        idList: [],
        options: {
          scondition: `uid like '%+1 ${tempPhone}'`,
          type: 1,
          xfname: "none"
        }
      })
      if(vertexResp?.data?.vertex.length){
        phoneRepeat()
      }else{
        return tempPhone
      }
    }
    return await phoneRepeat()
  },
  getWebAppConfig(){
    return {
      configVersion:  JSON.parse(localStorage.getItem("config") as string)?.["web"]?.["cadlVersion"],
      //@ts-ignore
      timeStamp: window?.build.timestamp,
      //@ts-ignore
      version:  window?.build.version
    }
  },
  getFollowupData({arr,number}:{arr:any[],number:string|number}){
    return arr.slice(-+number);
  },

  setEditorMapData({ data, map }) {
    Object.keys(data).forEach(key => {
      data[key] = getPropertyPath(map,key) ? get(map,getPropertyPath(map,key)) : data[key]
    })
    return data
  },

  cloneObjectNoParse({ data }) {
    return get(window["app"]["root"], data);
  },
  assignObject({ obj1, obj2 }) {
    return Object.assign(obj1, obj2)
  },
  chartData({type,dayData,remoteHealthData}: {
    type: string,
    dayData: Array<any>,
    remoteHealthData: Object
  }) {

    if (type == 'BloodPressure') {
      let returnData = {
        "normalData": {
          "systolic": {
            "start": 0,
            "end": 0
          },
          "diastolic": {
            "start": 0,
            "end": 0
          }
        },
        "measuredRange": {
          "systolic": {
            "min": 0,
            "max": 0
          },
          "diastolic": {
            "min": 0,
            "max": 0
          }

        }
      }
      // 血压返回数据格式有差别
      returnData["normalData"]["systolic"]["start"] = remoteHealthData['BloodPressure']["systolic"].Goal[0].start
      returnData["normalData"]["systolic"]["end"] = remoteHealthData['BloodPressure']["systolic"].Goal[0].end
      returnData["normalData"]["diastolic"]["start"] = remoteHealthData['BloodPressure']["diastolic"].Goal[0].start
      returnData["normalData"]["diastolic"]["end"] = remoteHealthData['BloodPressure']["diastolic"].Goal[0].end
      // 获取血压数据中低压的最大值最小值 以及高压最大值最小值
      if (dayData.length>0) {
        let systolicValueMax = dayData[0].name.data.heightBloodPressure  // 高压
        let systolicValueMin = dayData[0].name.data.heightBloodPressure  // 高压
        let diastolicValueMax = dayData[0].name.data.lowBloodPressure // 低压
        let diastolicValueMin = dayData[0].name.data.lowBloodPressure // 低压
        dayData.forEach(item => {
          if (item.name.data.heightBloodPressure > systolicValueMax) {
            systolicValueMax = item.name.data.heightBloodPressure
          } else if (item.name.data.heightBloodPressure < systolicValueMin) {
            systolicValueMin = item.name.data.heightBloodPressure
          }
          if (item.name.data.lowBloodPressure > diastolicValueMax) {
            diastolicValueMax = item.name.data.lowBloodPressure
          } else if (item.name.data.lowBloodPressure < diastolicValueMin) {
            diastolicValueMin = item.name.data.lowBloodPressure
          }
        })
        returnData["measuredRange"]["systolic"]["min"] = systolicValueMin
        returnData["measuredRange"]["systolic"]["max"] = systolicValueMax
        returnData["measuredRange"]["diastolic"]["min"] = diastolicValueMin
        returnData["measuredRange"]["diastolic"]["max"] = diastolicValueMax
      }
      return returnData
    } else {
      let returnData = {
        "normalData": {
            "start": 0,
            "end": 0
        },
        "measuredRange": {
            "min": 0,
            "max": 0
        }
      }
      let max = parseInt(dayData[0]['name']['data']['showData'])
      let min = parseInt(dayData[0]['name']['data']['showData'])
      dayData.forEach(item => {
        log.debug(parseInt(item.name.data['showData']))
        if ( parseInt(item.name.data['showData']) > max) {
          max = parseInt(item.name.data['showData'])
        }else if (parseInt(item.name.data['showData']) < min) {
          min = parseInt(item.name.data['showData'])
        }
      })
      returnData["measuredRange"]["min"] = min
      returnData["measuredRange"]["max"] = max
      returnData["normalData"]["start"] = remoteHealthData[type].Goal[0].start
      returnData["normalData"]["end"] = remoteHealthData[type].Goal[0].end
      return returnData
    }
  },
  searchRequired({ required, data }: { required: Array<any>, data: Object }) {
    let len = required.length
    const newArr: Array<string> = []
    for(let i = 0; i < len; i++) {
      const require = required[i]
      const key = require.key
      const item = get(data, key)
      if(isArray(item)) {
        if(item.length === 0) {
          newArr.push(require.title)
        }
      } else if(!item) {
        newArr.push(require.title)
      }
    }
    return newArr
  },
  financialAutoFill({target,source}: {target: any,source: any}) {  
      const relationship = ["","Self"]
      const {medicalInsurance,medicalVisitInfo,patientInfo,personalInjury,selfPay,workersComp
      } =  source
      const patientInfoFullAddress = patientInfo.Address.fullAddress || `${patientInfo.Address.line},${patientInfo.Address.secondLine},${patientInfo.Address.city},${patientInfo.Address.county},${patientInfo.Address.state},${patientInfo.Address.zipCode}`.replace(/^,+/g, "").replace(/,+/g, ",")
      // ? 当前保险类型
      target.InsuranceType = medicalVisitInfo.visitType
      // ? Insured ID #
      switch (medicalVisitInfo.visitType) {
        case 'Medical Insurance':
          target.InsuredIdNumber = medicalInsurance.defaultInsurance.ID
          target.HealthPlanId = medicalInsurance.defaultInsurance.ID
          // ? Relationship to Patient 是否为self
          if (!relationship.includes(medicalInsurance.defaultInsurance.relationship.select)) {
            target.InsuredName = medicalInsurance.defaultInsurance.relationship.name 
            target.PatientRelationshipToInsured = medicalInsurance.defaultInsurance.relationship.select
            target.InsuredAddress = medicalInsurance.defaultInsurance.relationship.Address.fullAddress
            target.InsuredSDateOfBirth = medicalInsurance.defaultInsurance.relationship.dateOfBirth
            target.InsuredSSex = medicalInsurance.defaultInsurance.relationship.gender
          } else {
            target.InsuredName = patientInfo.fullName
            target.PatientRelationshipToInsured = "Self"
            target.InsuredAddress = patientInfoFullAddress  
  
            target.InsuredSDateOfBirth = patientInfo.dateOfBirth
            target.InsuredSSex = patientInfo.gender
          }
          // ? 是否选择第二保险
          if (medicalInsurance.isSecondary) {
            // ? Relationship to Patient 是否为self
            if (!relationship.includes(medicalInsurance.secondaryInsurance.relationship.select)) {
              target.OtherInsuredName = medicalInsurance.secondaryInsurance.relationship.name
              target.SecondaryInsuredName = medicalInsurance.secondaryInsurance.relationship.name
            } else {
               target.OtherInsuredName = patientInfo.fullName
               target.SecondaryInsuredName = patientInfo.fullName
            }
            target.OtherInsuredSPolicyOrGroupNumber = medicalInsurance.secondaryInsurance.group
            target.SecondaryInsuranceGroupNumber = medicalInsurance.secondaryInsurance.group
            target.SecondaryInsurancePlanNameOrProgramName = medicalInsurance.secondaryInsurance.plan 
            target.SecondaryInsuranceCompanyName = medicalInsurance.secondaryInsurance.companyName //?new
          }
          target.InsurancePlanNameOrProgramName = medicalInsurance.defaultInsurance.plan  
          target.InsuranceCompanyName= medicalInsurance.defaultInsurance.companyName // ?new
          target.GroupName = medicalInsurance.defaultInsurance.plan 
          target.InsuredPolicyGroupOrFecaNumber = medicalInsurance.defaultInsurance.group
          target.InsuranceGroupNo = medicalInsurance.defaultInsurance.group
          target.AccidentState = ""
          target.SubscriberInformation = `${patientInfo.fullName },${patientInfoFullAddress}`
          target.Occupation = ""
          target.PayerAddress = medicalInsurance.defaultInsurance.claimsAddress.fullAddress
          break;
        case 'Workers Comp':
          target.InsuredIdNumber = workersComp.insurance.claim
          target.HealthPlanId = workersComp.insurance.claim 
          target.InsuredName = patientInfo.fullName
          target.PatientRelationshipToInsured = "Self"
          target.InsuredAddress = workersComp.employmentInfo.address.fullAddress
          target.InsuredAddress = patientInfoFullAddress 
          target.InsuredSDateOfBirth = patientInfo.dateOfBirth
          target.InsuredSSex = patientInfo.gender
          target.OtherInsuredName = ""
          target.SecondaryInsuredName = ""
          target.OtherInsuredSPolicyOrGroupNumber = ""
          target.SecondaryInsuranceGroupNumber = ""
          target.SecondaryInsurancePlanNameOrProgramName = ""
          target.GroupName = ""
          target.InsuredPolicyGroupOrFecaNumber = ""
          target.InsuranceGroupNo = ""
          target.AccidentState = ""
          target.SubscriberInformation = `${patientInfo.fullName },${patientInfoFullAddress}`
          target.Occupation = workersComp.employmentInfo.occupation
          
          target.DateOfInjury = workersComp.dateOfInjury
          target.AttorneyName = workersComp.attorneyInfo.name
          target.PayerPhoneNumber = workersComp.insurance.adjusterPhone
          target.PayersFaxNumber = workersComp.insurance.adjusterFax
          target.AdjusterName = workersComp.insurance.claimsAdjuster
          target.AdjusterPhoneNumber = workersComp.insurance.adjusterPhone
          target.EmployerName = workersComp.employmentInfo.name
          target.EmployersAddress = workersComp.employmentInfo.address.fullAddress
          target.EmployersPhone = workersComp.employmentInfo.telephone
          target.PayerAddress = workersComp.insurance.address.fullAddress
          target.InsuranceCompanyName= workersComp.insurance.companyName // ?new

          break;
        case 'Personal Injury':
          if (personalInjury.isPrimary) {
            target.InsuredIdNumber = personalInjury.primaryInsurance.ID
            target.HealthPlanId = personalInjury.primaryInsurance.ID
            // ? Relationship to Patient 是否为self
            if (!relationship.includes(personalInjury.primaryInsurance.relationship.select)) {
              target.InsuredName = personalInjury.primaryInsurance.relationship.name
              target.PatientRelationshipToInsured = personalInjury.primaryInsurance.relationship.select
              target.InsuredAddress = personalInjury.primaryInsurance.relationship.Address.fullAddress
              target.InsuredSDateOfBirth = personalInjury.primaryInsurance.relationship.dateOfBirth
              target.InsuredSSex = personalInjury.primaryInsurance.relationship.gender
            } else {
              target.InsuredName = patientInfo.fullName
              target.PatientRelationshipToInsured = "Self"
              target.InsuredAddress = patientInfoFullAddress
              target.InsuredSDateOfBirth = patientInfo.dateOfBirth
              target.InsuredSSex = patientInfo.gender
            }
            // ? 是否选择第二保险
            if (personalInjury.isSecondary) {
              // ? Relationship to Patient 是否为self
              if (!relationship.includes(personalInjury.secondaryInsurance.relationship.select)) {
                target.OtherInsuredName = personalInjury.secondaryInsurance.relationship.name
                target.SecondaryInsuredName = personalInjury.secondaryInsurance.relationship.name
              } else {
                 target.OtherInsuredName = patientInfo.fullName
                 target.SecondaryInsuredName = patientInfo.fullName
              }
              target.OtherInsuredSPolicyOrGroupNumber = personalInjury.secondaryInsurance.group
              target.SecondaryInsuranceGroupNumber = personalInjury.secondaryInsurance.group
              target.SecondaryInsurancePlanNameOrProgramName = personalInjury.secondaryInsurance.plan 
              target.SecondaryInsuranceCompanyName = personalInjury.secondaryInsurance.companyName //?new
            }
            target.InsurancePlanNameOrProgramName = personalInjury.primaryInsurance.plan 
            target.InsuranceCompanyName= personalInjury.primaryInsurance.companyName // ?new
            target.GroupName = personalInjury.primaryInsurance.plan 
            target.InsuredPolicyGroupOrFecaNumber = personalInjury.primaryInsurance.group
            target.InsuranceGroupNo = personalInjury.primaryInsurance.group
          }
          target.AccidentState = personalInjury.accidentState
          target.SubscriberInformation = `${patientInfo.fullName },${patientInfoFullAddress}`
          target.Occupation = ""
          target.DateOfInjury = personalInjury.dateOfInjury
          target.AttorneyName = personalInjury.attorneyInfo.name
          target.PayerPhoneNumber = personalInjury.attorneyInfo.phone
          target.PayersFaxNumber = personalInjury.attorneyInfo.fax
          target.PayerAddress = personalInjury.attorneyInfo.address.fullAddress
          break;
        case 'Self Pay':
          target.AccidentState = ""
          target.SubscriberInformation = `${patientInfo.fullName },${patientInfoFullAddress}`
          target.Occupation = ""
          break;
        default:
          break;
      }
  
      return target
  },
  medicalHistoryAutoFill({target,source}: {target:any,source: any}) {
    const {pastMedicalHistory,allergies,currentMedications,immunizations,hospitalizations,surgicalHistory,familyHistory,socialHistory} = source
 
    target.PastMedicalHistory = pastMedicalHistory.join(';\r\n')
    // ? allergies
    target.Allergies = allergies.status === "Yes" ? allergies.allergiesList.map(item=> Object.keys(item).map(i=>item[i]).join('-')).join(';\r\n') : allergies.status
 
    // ? Current Medications
    target.CurrentMedications = currentMedications.status === "Yes" ? currentMedications.currentMedicationsList.map(item=> Object.keys(item).map(i=>item[i]).join('-')).join(';\r\n') : currentMedications.status
 
    // ? Immunizations
    target.Immunizations = immunizations.status === "Yes" ? immunizations.immunizationsList.map(item=> Object.keys(item).map(i=>item[i]).join('-')).join(';\r\n') : immunizations.status
 
    // ? Hospitalizations
    target.Hospitalizations = hospitalizations.status === "Yes" ? hospitalizations.hospitalizationsList.map(item=> Object.keys(item).map(i=>item[i]).join('-')).join(';\r\n') : hospitalizations.status
 
    // ? Surgical History
    target.SurgicalHistory = surgicalHistory.status === "Yes" ? surgicalHistory.surgicalHistoryList.map(item=> Object.keys(item).map(i=>item[i]).join('-')).join(';\r\n') : surgicalHistory.status
 
    // ? Family History
    target.FamilyHistory = familyHistory.join(';\r\n')
 
    // ? Social History
    const {personalSafety,...res} = socialHistory
    target.SocialHistory = Object.keys(res).map(key=>res[key].display).join(';\r\n')
    
    return target
  },
  syncGlobal():void {
    const global = window["app"]["root"]["Global"]
    localStorage.setItem('Global',JSON.stringify(global))
  },
  isOnPage(pageName){
    if(pageName){
      //@ts-expect-error
      const currentPage = window.app.initPage
      if(currentPage && currentPage === pageName) return true
    }
    return false
  },
  setPickupValue({originArray,compareArray}:{originArray:{}[],compareArray:{}[]}){
    const value = originArray.map(eachOrigin=>{
      find(compareArray,eachCompare => get(eachOrigin,"id")===get(eachCompare,"fid")) ? set(eachOrigin,"isSelected",true) : set(eachOrigin,"isSelected",false)
      return eachOrigin
    })
    return value
  },
  setOrdertage({status,originTage}: {status: string, originTage: number}){
    let newStatus:number
    const mask = originTage&100 // B(1100100)
    switch(status) {
      case "Placed":
        newStatus = parseInt(Math.pow(10,0).toString(),2)|mask
        break
      case "Preparing": 
        newStatus = parseInt(Math.pow(10,1).toString(),2)|mask
        break
      case "Shipped":
      newStatus = parseInt(Math.pow(10,3).toString(),2)|mask
      break
      case "Ready for Pickup":
      newStatus = parseInt(Math.pow(10,4).toString(),2)|mask
      break
      case "Cancelled":
      newStatus = parseInt(Math.pow(10,7).toString(),2)|mask
      break
      case "Completed": 
        newStatus = parseInt(Math.pow(10,15).toString(),2)|mask
        break
      default:
        newStatus = originTage
    }
    return newStatus
  },
  async patdAccountStatus(phoneNumber){
    if(!phoneNumber) return "Unregistered"
    const patdVertexResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [],
      options: {
        xfname: "none",
        scondition: `uid like '%${phoneNumber}%'`,
        maxcount: 1
      }
    })
    return patdVertexResp.data.vertex.length ? "Active" : "Unregistered"
  },
  handleAiReport({airesult,initialData}:{airesult:string,initialData: object}):Object{
    try {
      let obj =  JSON.parse(airesult)
      let result = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = key.replace(/\s/g, '');
          result[newKey] = obj[key];
        }
      }
      return result
    } catch (error) {
      return initialData
    }
   
  },
  async patdAccountOperate(phoneNumber){
    if(!phoneNumber) return "Create Account"
    const patdVertexResp = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [],
      options: {
        xfname: "none",
        scondition: `uid like '%${phoneNumber}%'`,
        maxcount: 1
      }
    })
    return patdVertexResp.data.vertex.length ? "Add to Patient List":"Create Account"
  },
  productStatus(tage){
    switch (tage) {
      case 0:
        return "Draft"
      case 1:
        return "Active"
      case 2:
        return "Archived"
    }
  },
  async requestGpt({
    chatList,
    userInput
  }: {
    chatList: Array<{
      role: "user" | "system"
      content: string
    }>
    userInput: string
  }) {
    const config = JSON.parse(localStorage.getItem('config') as string)
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-3.5-turbo",
      messages: chatList.concat({
        role: "user",
        content: userInput
      })
    }, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${config.openaiKey}`
      },
    })
    if (response.hasOwnProperty('data')) {
      return response.data.choices[0].message.content
    }
    // @ts-ignore
    if (isArray(response?.choices)) {
    // @ts-ignore
      return response.choices[0].message.content 
    }
    // @ts-ignore
    return response.choices.message.content 
    
  },
  async encryptSN({
    id
  }: {
    id: string
  }) {
    if (id.length != 11 && id.length != 12) return ''
    if (id.length == 11) id += "F"
    const paddedId = id + "0000c000000000000000"
    let bytes: Array<number> = [];

    for(let i = 0; i < paddedId.length; i += 2) {
      let byte = parseInt(paddedId.substr(i, 2), 16)
      bytes.push(byte)
    }
    let binary = ''
    for(let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  },
  async check4GDeviceStatus({
    id
  }: {
    id: string
  }) {
    try {
      const response = await axios.get(`https://api.connect.mio-labs.com/v1/devices/${id}/`, {
        headers: {
          "x-api-key": "PbqZqTyVK9689oglCDoNP5WX8bXJYXoN477AHDCj"
        },
      })
      const serialNumber = response.data?.serialNumber
      return response.data
    } catch (error) {
      log.error(error)
      return false 
    }
  },
  async getFourgDeviceById({
    id
  }: {
    id: string
  }) {
    // const response = await axios.get(`https://api.aitmed.io:443/api/fourg/getByDeviceId?deviceId=${id}`)
    const response = await apiAxios("proxy")({
      method: "get",
      url: "/api/fourg/getByDeviceId",
      params: {
        deviceId: id
      }
    })
    // const response = await axios.get(`http://127.0.0.1:5001/api/fourg/getByDeviceId?deviceId=${id}`)
    // log.debug(response)
    if (response.hasOwnProperty('data')) {
      return response.data
    }
    return response
  },
  async queryCpt({
    code
  }:{
    code: string
  }):Promise<void | any[]>{
    // return await fetch(`https://api.aitmed.io:443/api/cpt/query?q=${code}`)
    // .then(async res=> 
    //   (JSON.parse(await res.text()) as {})?.["data"] as any[],
    // rej=>console.error(rej))
    try {
      const res = await apiAxios("proxy")({
        method: "get",
        url: "/api/cpt/query",
        params: {
          q: code
        }
      })
      if(res.status === 200) {
        return res.data.data
      } else {
        console.error(res.data)
      }
    } catch (error) {
      console.error(error)
    }
  },
  async getSeller(id){
    const superadmin = "Aitmed";
    const getResponse = await store.level2SDK.vertexServices.retrieveVertex({
      idList: [id],
      options: {
        xfname: "id",
        maxcount: 1,
        type: 20,
      }
    })
    if(getResponse.data.vertex[0]){
      return get(getResponse.data.vertex[0],"name.basicInfo.medicalFacilityName")
    }else{
      return superadmin
    }
    
  },
  // clearDom({id}:{id: string}):void {
  //   const ele = document.getElementById(id)
  //   ele?.parentNode?.removeChild(ele)
  // }
  async chat(
    {
    chatMessage,
    selfId
    }:{
      chatMessage:any[],
      selfId:string
  }){
    if(u.isArr(chatMessage) && selfId){
      const result = chatMessage.filter(message=>message.deat?.text)
      let res:any[] = []
      if(u.isArr(result)){
        for(let resultItem of result){
          try{
            const info = resultItem.deat?.info
            if(u.isArr(info)){
              info.forEach(item=>{
                item = JSON.parse(item)
                if(item.id !== selfId){
                  set(resultItem,'name.title',item)
                }
              })
              resultItem.deat?.info.forEach(item=>{
                item = JSON.parse(item)
              })
            }

            if(resultItem.deat.text === '' || resultItem.deat.text === '[img]'){
              set(resultItem,'name.text','[img]')
            }else{
              set(resultItem,'name.text',JSON.parse(resultItem.deat.text))
            }
            set(resultItem,'name.info',resultItem.deat.info)

            const idList = [resultItem.id,selfId]
            const options = {
              xfname: 'eid,fid',
              type: 486401,
              obfname: 'mtime',
              maxcount: 1,
            }
            const docResponse = await store.level2SDK.documentServices.retrieveDocument({
              idList,
              options,
            })
            if(docResponse.data.document.length>0){
              const ecosConnection = docResponse.data.document[0]
              const note = await documentToNote({document: ecosConnection})
              const latestTime = note.mtime
              const queryDocOptions = {
                  edge_id: resultItem.id,
                  type: 4009,
                  tags: [`SELECT COUNT(*) FROM Doc WHERE eid = from_base64('${resultItem.id}') AND type in (769,1026) AND ctime > ${latestTime}`],
                  content: '',
                }
              const response = await Document.create(queryDocOptions)
              if(response?.['doc']){
                const num = get(response,'doc.deat.0')
                const messageNumber = u.isNil(num) ? 0 : num
                if(messageNumber == 0){
                  set(resultItem,'unReadNum',0)
                  set(resultItem,'unReadDisplay','none')
                }else{
                  set(resultItem,'unReadNum',messageNumber)
                  set(resultItem,'unReadDisplay','')
                }
              }
              res.push(resultItem)
            }
          }catch(error){
            log.debug(error)
          }

        }
        return res
        
      }
    }
    return []
  },
  generatePlateformLink({linkObject,key}){
    if (!u.isBrowser()) return
    const plateform = key === 'Provider'?'Provider':'Patient'
    if(linkObject){
      if (/(iPhone|iPad|iPod|iOS)/i.test(window.navigator.userAgent)) {
        //ios
        return {
          applink: linkObject['ios'][plateform]['applink'],
          storelink: linkObject['ios'][plateform]['storelink']
        }
      } else if (/(Android)/i.test(window.navigator.userAgent)) {
        //android
        return {
          applink: linkObject['android'][plateform]['applink'],
          storelink: linkObject['android'][plateform]['storelink']
        }
      } else {
        //pc
        return {
        }
      }
      
    }
    
  },
  parseVertexStatus({status}){
    const getBit = (target:number,bit:number)=>{
      return !!(target & (1 << bit)) ? 1 : 0
    }
    if(u.isNum(status)){
      /*
      0-3 公共部分
      0 email 

      4-7 病人
      4 病人Profile

      8-11 医生
      8 医生Profile
      9 医生Facility
      */
      const isEmail = getBit(status,0)
      const isPatientProfile = getBit(status,4)
      const isProviderProfile = getBit(status,8)
      const isProviderFacility = getBit(status,9)
      return {
        isEmail: !!isEmail,
        isPatientProfile: !!isPatientProfile,
        isProviderProfile: !!isProviderProfile,
        isProviderFacility: !!isProviderFacility,
      }
    }
    return {
      isEmail: false,
      isPatientProfile: false,
      isProviderProfile: false,
      isProviderFacility: false
    }
  },
  computeVertexStatus(
    {status,obj}:
    {
      status: number
      obj:Record<string, any>
    }
  ){
    const setBit = (target: number, value: boolean, bit: number) => {
      return value ? target | (1 << bit) : target & ~(1 << bit)
    }
    const mapping = {
      isEmail: 0,
      isPatientProfile: 4,
      isProviderProfile: 8,
      isProviderFacility: 9
    }
    let result = status
    for(const [key,value] of Object.entries(obj)){
      result = setBit(result,!!value,mapping[key])
    }
    return result
  },
  generateResetEmailContent(
    { userName,
      link,
      expireTime=7200,
      id
    }:
    {
      userName: string,
      link: string,
      expireTime: number,
      id:string
    }){
    const currentTime = new Date().getTime()
    if(userName && link && id){
      let uint8Array = store.level2SDK.utilServices.base64ToUint8Array(id)
      const encryId = store.level2SDK.utilServices.uint8ArrayToBase58(uint8Array)
      const tolink = `${link}/index.html?ResetPassword&id=${encryId}&expireTime=${currentTime+expireTime*1000-20*1000}`
      return `<p style="font-size: 14px;font-family: Proxima Nova-Regular, Proxima Nova;font-weight: 400;color: #4B4B4B;line-height: 26px;">Hello ${userName},</p><p style="font-size: 14px;font-family: Proxima Nova-Regular, Proxima Nova;font-weight: 400;color: #4B4B4B;line-height: 26px;">Someone has requested a password reset. Click the link below to reset your account password:</p><p style="font-size: 14px;font-family: Proxima Nova-Regular, Proxima Nova;font-weight: 400;color: #4B4B4B;line-height: 26px;"><a href="${tolink}" target="_blank">${tolink}</a></p> <p style="font-size: 14px;font-family: Proxima Nova-Regular, Proxima Nova;font-weight: 400;color: #4B4B4B;line-height: 26px;">lf this was a mistake, just ignore this email and nothing will happen.</p> <p><br/></p>`
    }
  },
  generateVerifyEmailContent({userName,link,id}){
    if(id && userName && link){
      let uint8Array = store.level2SDK.utilServices.base64ToUint8Array(id)
      const encryId = store.level2SDK.utilServices.uint8ArrayToBase58(uint8Array)
      const tolink = `${link}/index.html?VerifySuccess&id=${encryId}`
      const body = `<p style="font-size: 14px;font-weight: 400;line-height: 26px;color: #4B4B4B;">Thank you for choosing AiTmed,</p><p style="font-size: 14px;font-weight: 400;line-height: 26px;color: #4B4B4B;">Please confirm this is your email address by clicking on the button below or use this link: <a href="${tolink}"  target="_blank"> ${tolink} </a></p><p style="font-size: 14px;font-weight: 400;line-height: 26px;color: #4B4B4B;">If you cannot open this link, please try to use Google Chrome to open it.</p><p style="display: flex;align-items: center;flex-wrap: nowrap;"><a href="${tolink}" target="_blank" style="text-decoration: none;text-align: center;line-height: 44px;border-width:0px;width: 200px;height: 44px;background-color:#2988E6; background: linear-gradient(90deg, #649FFF 0%, #2988E6 100%);border-radius: 22px 22px 22px 22px;opacity: 1;font-weight: 600;color: #FFFFFF;font-size: 16px;font-family: Proxima Nova-Semibold, Proxima Nova;">Verify Your Email</a><p>`
      return body
    }
  },
  transformJwtToVcJwt(){
    const jwt = localStorage.getItem('jwt')
    if(jwt){
      localStorage.setItem('vcjwt',jwt)
    }
  },
  async generateSignForOlderUser({
    sk
  }: {
    sk: string
  }){
    //generate keyPair for signature
    const { pkSign, skSign } = store.level2SDK.utilServices.generateSignatureKeyPair()
    //symmetrically encrypt skSign with sk from credentials
    const eskSign = store.level2SDK.utilServices.sKeyEncrypt(store.level2SDK.utilServices.base64ToUint8Array(sk), skSign)
    const pkSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(pkSign)
    const eskSignBase64 = store.level2SDK.utilServices.uint8ArrayToBase64(eskSign)
    return {
      pkSign: pkSignBase64,
      eskSign: eskSignBase64
    }
  },
  clearAPICache(){
  //@ts-ignore
    window.app.root.apiCache = {}
  },
  setNotification(){
    return false
  },
  console({type = 'log', text}: {type:string, text: any}) {
    console[type](text);
    return
  },
  async calibrateAccount({vendorObj}:{vendorObj:{}}){
    let result:{
      error: boolean
      phoneNumber:any[],
      email:any[],
    } = {
      error: false,
      phoneNumber: [],
      email: []
    }
    let phoneList = (get(vendorObj,"name.staffList", []).map(each => get(each,"phoneNumber"))).concat(get(vendorObj,"name.basicInfo.phoneNumber", []))
    let emailList = (get(vendorObj,"name.staffList", []).map(each => get(each,"email"))).concat(get(vendorObj,"name.basicInfo.email", []))
    // 验证号码是否都注册过
    result.phoneNumber = (await Promise.all(
      phoneList.map(
        async phone => {
          const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
            idList: [],
            options: {
              xfname: "none",
              scondition: `uid like '%${phone}%'`,
              maxcount: 1,
              type: 2,
            }
          })
          return vertexResp.data.vertex.length ? phone : ""
        }
      )
    )).filter(item => item)
    // 验证有效是否都注册过
    result.email = (await Promise.all(
      emailList.map(
        async email => {
          const vertexResp = await store.level2SDK.vertexServices.retrieveVertex({
            idList: [],
            options: {
              xfname: "none",
              scondition: `name like '%${email}%'`,
              maxcount: 1,
              type: 2,
            }
          })
          return vertexResp.data.vertex.length ? email : ""
        }
      )
    )).filter(item => item)
    
    // 判断数组里是否重复
    for (let i = 0; i < phoneList.length; i++) {
      if(phoneList[i]===phoneList[i-1]) {
        result.phoneNumber.push(phoneList[i])
      }     
    }
    for (let i = 0; i < emailList.length; i++) {
      if(emailList[i]===emailList[i-1]) {
        result.email.push(emailList[i])
      }     
    }   
    result.phoneNumber = uniq(cloneDeep(result.phoneNumber))
    result.email = uniq(cloneDeep(result.email))

    // 如果有注册过的号码或者邮箱，则直接返回
    if( result.email.length || result.phoneNumber.length ) return {...result,error: true }
    return  {...result,error: false }
  },
  changeShipText(txt){
    return ["Ship to me","Shopping"].includes(txt) ? "Shipping" : txt
  },
  recommendName(object) {
    const {goodsList,goodNameList} = get(object,'name.data')
    const nameList = goodsList.filter(item=>item?.title).map(t=>t?.title).join(',')
    return  nameList ? nameList : goodNameList.join(',')
  },

  objectToSearchParams({parmas,pageName}){
    const searchQuery = new URLSearchParams(parmas).toString();  
    return `${pageName}&${searchQuery}`
  },

  orderStatus(tage) {
   const orderStatusTemp = [
    {
        "bitPosition": 0,
        "orderStatus": "Placed",
        "orderStatusColor": "#dec900"
    },
    {
        "bitPosition": 1,
        "orderStatus": "Preparing",
        "orderStatusColor": "#f88f00"
    },
    {
        "bitPosition": 3,
        "orderStatus": "Shipped",
        "orderStatusColor": "#2988e6"
    },
    {
        "bitPosition": 4,
        "orderStatus": "Ready for Pickup",
        "orderStatusColor": "#2988e6"
    },
    {
        "bitPosition": 7,
        "orderStatus": "Cancelled",
        "orderStatusColor": "#ed2c2c"
    },
    {
        "bitPosition": 14,
        "orderStatus": "Pending",
        "orderStatusColor": "#E24445"
    },
    {
        "bitPosition": 15,
        "orderStatus": "Complete",
        "orderStatusColor": "#2fb355"
    }
   ]
   const statusList = orderStatusTemp.filter(status=> tage.toString(2).split('').reverse()[status.bitPosition]==='1')
   const {orderStatus,...statusAttribute} = statusList.slice(-1)[0]
   return orderStatus
  },
  matchPatientIndex({ indexArr }:{ indexArr: {}[] }):{}[]{
    if(!indexArr.length) return []
    return cloneDeep(indexArr).map(
      item => ({
        '10002id': get(item,"_source.id10002"),
        'id':  get(item,"_source.id"),
        'fullName':  get(item,"_source.fullName"),
        'dateOfBirth': get(item,"_source.dateOfBirth"),
        'phoneNumber': get(item,"_source.phoneNumber"), 
        'gender': get(item,"_source.gender"),
        'status': get(item,"_source.status"),
        'patientId': get(item,"_source.patientId"),
        'facilityId': get(item,"_source.facilityId"),
        'email': get(item,"_source.email"),
      })
    )
  },
  matchProviderIndex({ indexArr }:{ indexArr: {}[] }):{}[]{
    if(!indexArr.length) return []
    return cloneDeep(indexArr).map(
      item => {
        return {
          id: get(item,"id"),
          eid: get(item,"eid"),
          bsig: get(item,"prodId"),
          facilityId: get(item,"facilityId"),
          status: get(item,"status"),
          name: {
            data: {
              avatar: get(item,"avatar"),
              title: get(item,"title"), 
              fullName: get(item,"fullName"),
              DEA: get(item,"dea"),
              NPI: get(item,"npi"),
              email: get(item,"email"),
              phone: get(item,"phoneNumber"),
              selectedSpecialty: get(item,"selectedSpecialty"),
              userName: get(item,"userName"),
              gender: get(item,"gender"),
              MedicalLicense: get(item,"medicalLicense"),
              myEmail: get(item,"email")
            }
          } 
        }
      }  
    )
  },
  matchPayerIndex({ indexArr }:{ indexArr: {}[] }):{}[]{
    if(!indexArr.length) return []
    return cloneDeep(indexArr).map(
      item => ({
        'address1': get(item,"_source.address1"), 
        'address2': get(item,"_source.address2"),
        'billingType': get(item,"_source.billingType"),
        'city': get(item,"_source.city"),
        'contact': get(item,"_source.contact"),
        'county': get(item,"_source.county"),
        'email': get(item,"_source.email"),
        'fax': get(item,"_source.fax"),
        'fullAddress': get(item,"_source.fullAddress"),
        'id': get(item,"_source.id"),
        'insuranceProgram': get(item,"_source.insuranceProgram"),
        'insuranceType': get(item,"_source.insuranceType"),
        'payerID':  get(item,"_source.payerID"),
        'payerName': get(item,"_source.payerName"),
        'payerType': get(item,"_source.payerType"),
        'phone':  get(item,"_source.phone"),
        'state': get(item,"_source.state"),
        'type': get(item,"_source.type"),
        'zip': get(item,"_source.zip"),

      })
    )
  },
  matchTemplateIndex({ indexArr }:{ indexArr: {}[] }):{}[]{
    log.debug('DIONIM',indexArr);
    
    if(!indexArr.length) return []
    return cloneDeep(indexArr).map(
      item => ({
        // 'backgroundColor': get(item,"_source.backgroundColor"),
        'creator': get(item,"_source.creator"),
        'description':  get(item,"_source.description"),
        'documentName': get(item,"_source.documentName"),
        'documentType': get(item,"_source.documentType"), 
        'id':  get(item,"_source.id"),
        'tab': get(item,"_source.tab"),
        'type': get(item,"_source.type"),
      })
    )
  },
  async callPhone(
    {token, from ,to}:
    {
    token: string
    from: string
    to:string
    }){
      // @ts-expect-error
      const callFunc = window.app.root.builtIn?.['callPhone']
      if(u.isFnc(callFunc)){
        await callFunc({accessToken: token, from ,to})
      }
  },
  getPhoneCallSid (options){
    const calling = window?.['app']?.calling
    const callSid = calling?.call?.parameters?.CallSid
    if(callSid){
      return callSid
    }
  }


}
export function toast(message: string | number, options?: Toast['options']) {
  if (message) {
    const container = document.getElementsByClassName('toast-container')[0]
    // This is a better version of destroyAllToasts from the lib
    if (container?.childNodes?.length) {
      for (const childNode of container.children) childNode.remove()
    }
    return createToast?.(String(message), {
      cancel: 'Close',
      timeout: 8000,
      ...options,
    })
  }
}
export function removeKeyFromObject(obj, keyPath) {
  const keys = keyPath.split('.');

  function removeKeyRecursively(obj, keys) {
    const key = keys.shift();

    if (keys.length === 0) {
      delete obj[key];
    } else {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        removeKeyRecursively(obj[key], keys);
      }
    }
  }

  const newObj = { ...obj };
  removeKeyRecursively(newObj, keys);
  return newObj;
}
export function generateOrderNumber() {
  // ! 应产品要求改成 D/V/P/S+ 订单日期230101 + 6位随机数，此处不处理D/V/P/S
  const currentDate = moment().format("YYMMDD");
  const randomDigits = customAlphabet("0123456789",6)()
  return currentDate + randomDigits.toString();
}
/**
 * Check if two objects have the same type.
 *
 * @param {any} obj1 - The first object to compare.
 * @param {any} obj2 - The second object to compare.
 * @return {boolean} Returns true if the objects have the same type, otherwise false.
 */
export function equalType(obj1: any, obj2: any): boolean {
	// 忽略基本类型
	if (typeof obj1 !== 'object' && typeof obj1 !== 'function') return false
	return getType(obj1) === getType(obj2)
}

/**
 * Returns the type of the given object.
 *
 * @param {any} obj - The object to determine the type of.
 * @return {string} The type of the object.
 */
export function getType(obj: any): string {
	if (typeof obj !== 'object' && typeof obj !== 'function') return typeof obj
	const _toString: Function = Object.prototype.toString
	return _toString.call(obj).slice(8, -1)
}

/**
 * Generates a new diff object by comparing the properties of an old object and a new object.
 * Recursively iterates over the properties of the old object and new object, and populates the
 * result object with the differences. If a property value is an object, the function is called
 * recursively on that property.
 *
 * @param {any} result - The result object to populate with the differences.
 * @param {any} oldObject - The old object to compare.
 * @param {any} newObject - The new object to compare.
 * @return {void} No return value.
 */
export function newDiffObject(result: any, oldObject: any, newObject: any): void {
	const _obj2: any = cloneDeep(newObject)
	for (let key in oldObject) {
		if (equalType(oldObject[key], newObject[key])) {
			result[key] = result[key] ? result[key] : {}
			newDiffObject(result[key], oldObject[key], newObject[key])
			delete _obj2[key]
			continue
		}
		if ((newObject[key] || newObject[key] === '' ) && oldObject[key] !== newObject[key]) {
			result[key] = newObject[key],
			delete _obj2[key]
			continue
		}    
		delete _obj2[key]
	}
	for (let key in _obj2) {
		result[key] = newObject[key]
  }
}
/**
 * Calculates the detailed difference between two objects and updates the result object.
 *
 * @param {any} result - The result object that will be updated with the differences.
 * @param {any} oldObject - The original object to compare against.
 * @param {any} newObject - The new object to compare with.
 * @return {void} This function does not return a value.
 */
export function detailDiffObject(result: any, oldObject: any, newObject: any): void {
	const _obj2: any = cloneDeep(newObject)
	for (let key in oldObject) {
      if (!_obj2.hasOwnProperty(key)) {
          result[key] = {
              _type: 'delete',
              _detail: {
                  _old: oldObject[key],
                  _new: null,
              },
          };
          continue;
      }

      if (JSON.stringify(oldObject[key]) === JSON.stringify(newObject[key])) {
          delete _obj2[key];
          continue;
      }

      if (typeof oldObject[key] === 'object' && typeof newObject[key] === 'object') {
          result[key] = result[key] || {};
          detailDiffObject(result[key], oldObject[key], newObject[key]);
          if (Object.keys(result[key]).length === 0) {
              delete result[key];
          }
          delete _obj2[key];
          continue;
      }

      if (oldObject[key] !== newObject[key]) {
          result[key] = {
              _type: 'modify',
              _detail: {
                  _old: oldObject[key],
                  _new: newObject[key],
              },
          };
          delete _obj2[key];
          continue;
      }
      delete _obj2[key];
  }

  for (let key in _obj2) {
      result[key] = {
          _type: 'add',
          _detail: {
              _old: null,
              _new: newObject[key],
          },
      };
  }
}
/**
 * Generates a formatted detail diff object based on the given input.
 *
 * @param {any} obj - The input object to generate the formatted diff from.
 * @param {object} matchingKey - The matching key object to map the keys from the input object to.
 * @param {any[]} initData - The initial data array to start with (optional, default is an empty array).
 * @return {object} The formatted detail diff object.
 */
export function formatDetailDiff(obj: any,matchingKey: object, initData: any[] = []):object {
  const imgkey:string[] = ['imageId','avatar','front_InsuranceCardId',"back_InsuranceCardId"]
	let result: any[] = initData
	Object.keys(obj).map((key) => {
		const item: object = obj[key]
		if (item.hasOwnProperty('_type')) {
			const formatObj: any = {}
			const formatSecondObj: any = {}
			const type = get(item, '_type')!
			set(formatObj, 'isList', 'none')
      if (imgkey.includes(key)) {
        set(formatObj, 'isLabel', 'none')
        set(formatObj, 'isImg', 'block')
      } else {
        set(formatObj, 'isLabel', 'block')
        set(formatObj, 'isImg', 'none')
      }
			set(formatObj, 'value', item)
			switch (type) {
				case 'modify':
					set(formatObj, 'color', '#2988e6')
					break
				case 'add':
					set(formatObj, 'color', '#008000')
					break
				case 'delete':
					set(formatObj, 'color', '#ff0000')
					break
				default:
					set(formatObj, 'color', '#2988e6')
					break
			}

			const pathList: string[] | undefined = getPropertyPath(
				matchingKey,
				key,
			)?.split('.')

			if (pathList && pathList.length > 1) {
				const secondListKey = pathList[pathList.length - 2]
				const secondListTitleKey = matchingKey[secondListKey]['_title']
					? matchingKey[secondListKey]['_title']
					: secondListKey
				const targetkey = matchingKey[secondListKey][key]
					? matchingKey[secondListKey][key]
					: key
				set(formatObj, 'key', targetkey)
				const secondList = result.filter(
					(i) => get(i, 'key') === secondListTitleKey
				)
				if (secondList.length) {
					secondList[0]['value'].push(formatObj)
				} else {
					set(formatSecondObj, 'key', secondListTitleKey)
          set(formatSecondObj, 'isLabel', 'none')
          if (imgkey.includes(key)) {
            set(formatSecondObj, 'isImg', 'block')
          } else {
            set(formatSecondObj, 'isImg', 'none')
          }
          set(formatSecondObj, 'isList', 'block')
					set(formatSecondObj, 'value', [])
					formatSecondObj['value'].push(formatObj)
					result.push(formatSecondObj)
				}
			} else {
				const formatKey = matchingKey[key] ? matchingKey[key] : key
				set(formatObj, 'key', formatKey)
				result.push(formatObj)
			}
		} else {
			result = formatDetailDiff(item, matchingKey,result) as any[]
		}
	})
	return result
}
/**
 * Formats the given insurance list by removing specified attributes.
 *
 * @param {any[]} insuranceList - The list of insurance items to be formatted.
 * @param {any[]} reomveAttribute - The list of attributes to be removed from each insurance item.
 * @param {boolean} [detail=true] - Indicates whether detailed information should be included in the formatted list. Defaults to true.
 * @return {any[]} The formatted insurance list.
 */
export function formatInsuranceList(insuranceList:any[],detail=true ){


  const resultList = insuranceList.map(item=>{
    const tage = get(item,'tage')
    const data = JSON.parse(JSON.stringify(item.name.data))

    let pickKeyList: string[] = []
    let pickObject: object
    switch (tage) {
      /* Medical Insurance */
      case 0:
        pickKeyList = [
         'back_InsuranceCardId',
         'claims',
         'companyName',
         'front_InsuranceCardId',
         'gender',
         'groupNumber',
         'insuranceInfo',
         'memberId',
         'memberName',
         'planOrMedicalGroup',
         'relation',
         'relationAddress',
         'relationBirth',
         'relationName'
        ]
        pickObject = pick(data,pickKeyList)
        const claimsAddress = {...get(data,'claims.address')}
        set(data,'claims.address',{})
        set(data,'claims.address.claimsFullAddress',get(claimsAddress,'fullAddress') || "")
        set(data,'claims.address.claimsLine',get(claimsAddress,'line') || "")
        set(data,'claims.address.claimsSecondLine',get(claimsAddress,'secondLine') || "")
        set(data,'claims.address.claimsState',get(claimsAddress,'state') || "")
        set(data,'claims.address.claimsZipCode',get(claimsAddress,'zipCode') || "")
        set(data, 'claims.address.claimsCity', get(claimsAddress, 'city') || "")
        
        item.name.data = pickObject
        break;
      /* Workers Comp */
      case 2: 
        pickKeyList = [
          'attorneyInfo',
          'dateOfInjury',
          'employmentInfo',
          'insurance',
          'insuranceInfo',
          'sendReportTo'
        ]
        pickObject = pick(data,pickKeyList)
        const attorneyAddress = {...get(data,'attorneyInfo.address')}
        set(data,'attorneyInfo.address',{})
        set(data,'attorneyInfo.address.attorneyFullAddress',get(attorneyAddress,'fullAddress') || "")
        set(data,'attorneyInfo.address.attorneyLine',get(attorneyAddress,'line') || "")
        set(data,'attorneyInfo.address.attorneySecondLine',get(attorneyAddress,'secondLine') || "")
        set(data,'attorneyInfo.address.attorneyState',get(attorneyAddress,'state') || "")
        set(data,'attorneyInfo.address.attorneyZipCode',get(attorneyAddress,'zipCode') || "")
        set(data,'attorneyInfo.address.attorneyCity',get(attorneyAddress,'city') || "")

        const employmentAddress = {...get(data,'employmentInfo.address')}
        set(data,'employmentInfo.address',{})
        set(data,'employmentInfo.address.employmentFullAddress',get(employmentAddress,'fullAddress') || "")
        set(data,'employmentInfo.address.employmentLine',get(employmentAddress,'line') || "" )
        set(data,'employmentInfo.address.employmentSecondLine',get(employmentAddress,'secondLine') || "")
        set(data,'employmentInfo.address.employmentState',get(employmentAddress,'state') || "")
        set(data,'employmentInfo.address.employmentZipCode',get(employmentAddress,'zipCode') || "")
        set(data,'employmentInfo.address.employmentCity',get(employmentAddress,'city') || "")

        const insuranceAddress = {...get(data,'insurance.address')}
        set(data,'insurance.address',{})
        set(data,'insurance.address.insuranceFullAddress',get(insuranceAddress,'fullAddress') || "")
        set(data,'insurance.address.insuranceLine',get(insuranceAddress,'line') || "")
        set(data,'insurance.address.insuranceSecondLine',get(insuranceAddress,'secondLine') || "")
        set(data,'insurance.address.insuranceState',get(insuranceAddress,'state') || "")
        set(data,'insurance.address.insuranceZipCode',get(insuranceAddress,'zipCode') || "")
        set(data,'insurance.address.insuranceCity',get(insuranceAddress,'city') || "")

        item.name.data = pickObject
       break;
      /* personal injury */
      case 4: 
        pickKeyList = [
          'attorneyInfo',
          'dateOfInjury',
          'memberName'
        ]
        pickObject = pick(data,pickKeyList)
        item.name.data = pickObject
       break;
      default: 
        pickKeyList = [
          'attorneyInfo',
          'dateOfInjury',
          'memberName'
        ]
        pickObject = pick(data,pickKeyList)
        item.name.data = pickObject
       break; 
    }


    return item
  })

  return detail
    ? resultList
    : resultList.map((doc) => ({
        tage: doc.tage,
        content: doc.name.data,
        nonce: doc.name.nonce,
      })) 
}
export function addressTransformInsuranceList(insuranceList: any[],isCreate: boolean){
    
  return insuranceList.map(item=>{
    const tage = get(item,'tage')
    const data = isCreate ? get(item,'content') : get(item,'name.data') 

    let pickKeyList: string[] = []
    let pickObject: object
    switch (tage) {
      /* Medical Insurance */
      case 0:
        const claimsAddress = {...get(data,'claims.address')}
        set(data,'claims.address',{})
        set(data,'claims.address.fullAddress',get(claimsAddress,'claimsFullAddress') || "")
        set(data,'claims.address.line',get(claimsAddress,'claimsLine') || "" )
        set(data,'claims.address.secondLine',get(claimsAddress,'claimsSecondLine') || "")
        set(data,'claims.address.state',get(claimsAddress,'claimsState') || "" )
        // set(data,'claims.address.county',get(claimsAddress,'claimsCounty'))
        set(data,'claims.address.zipCode',get(claimsAddress,'claimsZipCode') || "" )
        set(data,'claims.address.city',get(claimsAddress,'claimsCity') || "")
        isCreate  ? set(item,'content',data) : set(item,'name.data',data)
        return item
      /* Workers Comp */
      case 2: 
        pickKeyList = [
          'attorneyInfo',
          'dateOfInjury',
          'employmentInfo',
          'insurance',
          'insuranceInfo',
          'sendReportTo'
        ]
        pickObject = pick(data,pickKeyList)
        const attorneyAddress = {...get(data,'attorneyInfo.address') || "" }
        set(data,'attorneyInfo.address',{})
        set(data,'attorneyInfo.address.fullAddress',get(attorneyAddress,'attorneyFullAddress') || "")
        set(data,'attorneyInfo.address.line',get(attorneyAddress,'attorneyLine') || "" )
        set(data,'attorneyInfo.address.secondLine',get(attorneyAddress,'attorneySecondLine') || "" )
        set(data,'attorneyInfo.address.state',get(attorneyAddress,'attorneyState') || "")
        // set(data,'attorneyInfo.address.county',get(attorneyAddress,'attorneyCounty'))
        set(data,'attorneyInfo.address.zipCode',get(attorneyAddress,'attorneyZipCode') || "" )
        set(data,'attorneyInfo.address.city',get(attorneyAddress,'attorneyCity') || "" )

        const employmentAddress = {...get(data,'employmentInfo.address')}
        set(data,'employmentInfo.address',{})
        set(data,'employmentInfo.address.fullAddress',get(employmentAddress,'employmentFullAddress') || "")
        set(data,'employmentInfo.address.line',get(employmentAddress,'employmentLine') || "")
        set(data,'employmentInfo.address.secondLine',get(employmentAddress,'employmentSecondLine') || "")
        set(data,'employmentInfo.address.state',get(employmentAddress,'employmentState') || "" )
        // set(data,'employmentInfo.address.county',get(employmentAddress,'employmentCounty'))
        set(data,'employmentInfo.address.zipCode',get(employmentAddress,'employmentZipCode') || "" )
        set(data,'employmentInfo.address.city',get(employmentAddress,'employmentCity') || "" )

        const insuranceAddress = {...get(data,'insurance.address')}
        set(data,'insurance.address',{})
        set(data,'insurance.address.fullAddress',get(insuranceAddress,'insuranceFullAddress') || "")
        set(data,'insurance.address.line',get(insuranceAddress,'insuranceLine') || "")
        set(data,'insurance.address.secondLine',get(insuranceAddress,'insuranceSecondLine') || "")
        set(data,'insurance.address.state',get(insuranceAddress,'insuranceState') || "")
        // set(data,'insurance.address.county',get(insuranceAddress,'insuranceCounty'))
        set(data,'insurance.address.zipCode',get(insuranceAddress,'insuranceZipCode') || "")
        set(data,'insurance.address.city',get(insuranceAddress,'insuranceCity') || "")
        isCreate  ? set(item,'content',data) : set(item,'name.data',data)
        return item
      /* personal injury */
      case 4: 
        return item
      default: 
        return item
    }
  })

    
}
export function checkTypeFalse(obj) {
  for (let key in obj) {
      if (typeof obj[key] === 'object') {
        if (obj[key]?._type && obj[key]?._type !== "delete") {
            return false;
        }
        if (!checkTypeFalse(obj[key])) {
            return false;
        }
      }
  }
  return true;
}
export function removeDiffKeys(obj,keys) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && !obj[key]?._type) {
      removeDiffKeys(obj[key], keys);
    } else {
      if (keys.includes(key)) {
        delete obj[key];
      }
    }
  }
  return obj;
}




