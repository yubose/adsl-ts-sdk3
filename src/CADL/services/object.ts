import * as u from '@jsmanifest/utils'
import get from 'lodash/get'
import set from 'lodash/set'
import merge from 'lodash/merge'
import assignIn from 'lodash/assignIn'
import cloneDeep from 'lodash/cloneDeep'
import {isEmpty, orderBy} from 'lodash'
// import { cloneDeep, forEach, transform ,assignIn} from 'lodash'
// import { isEqual,omitBy } from 'lodash'
// import { isObject } from 'lodash'
import unset from 'lodash/unset'
import zipObject from 'lodash/zipObject'
import log from '../../utils/log'
import moment from 'moment'
import * as number from './number'
import {removeKeyFromObject, equalType, getType ,newDiffObject,detailDiffObject,formatDetailDiff,formatInsuranceList,checkTypeFalse, removeDiffKeys} from './utils'
import { pateintProfileKey } from './constant'
type keyValue = {
  key: string
  value: string
}
/**
 * @description week to number : Sunday -->0 Monday --->1
 * @param week 
 * @returns 
 */
const mapWeek = (week: Array<string>) => {
  // 把周几转换成 0-6
  const weekArray = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  let startIndex = weekArray.indexOf(week[0].replace(/(^\s*)|(\s*$)/g, ""))
  let endIndex = weekArray.indexOf(week[1].replace(/(^\s*)|(\s*$)/g, ""))
  let arr: Array<number> = []
  for (let index = startIndex; index <= endIndex; index++) {
    arr.push(index)
  }
  return arr
}
const tranTo24 = (time: String) => {
  // 把时间点对应为分钟数
  const t = time.replace(/(^\s*)|(\s*$)/g, "").split(" ")[0].replace(/(^\s*)|(\s*$)/g, "")
  const format = time.replace(/(^\s*)|(\s*$)/g, "").split(" ")[1].replace(/(^\s*)|(\s*$)/g, "")
  const h = parseInt(t.split(":")[0])
  const m = parseInt(t.split(":")[1])
  return format == "AM" ? h * 60 + m : (h + 12) * 60 + m
}
const transTime = (day: number, hour: number, minutes: number) => {
  return day * 1440 + hour * 60 + minutes
}
const mapTime = (time: Array<string>) => {
  // 把一天分为1440 分钟 返回开始分钟 和结束分钟
  const startTime = tranTo24(time[0])
  const endTime = tranTo24(time[1])
  let arr: Array<number> = []
  arr.push(startTime, endTime)
  return arr
}
const timeSeg = (weekDays: Array<any>, mimutes: Array<any>) => {
  // 把一项 转换为 开始时间 和 结束时间 （周日0点 为 0 ， 周六晚上24点为 1440*7）
  let arr: Array<{ "start": number, "end": number }> = []
  weekDays.forEach(item => {
    arr.push({
      "start": item * 1440 + mimutes[0],
      "end": item * 1440 + mimutes[1]
    })
  })
  return arr
}

const isAsc = (arr)=> {
  let Arr:Array<boolean> = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < arr[i + 1]) {
      Arr.push(true)
    } else {
      Arr.push(false)
    }
  }
  if (Arr.every(item => item === true)) {
    return true
  } else {
    return false
  }
}
const transWeek = (data: { "dayConcat": String, "HourConcat": String }) => {
  let dayArray = data.dayConcat.split('-')
  let timeArray = data.HourConcat.split('-')
  let weekDays = mapWeek(dayArray)
  let minutes = mapTime(timeArray)
  if (!(isAsc(weekDays) && isAsc(minutes))) {
    return false
  }
  let timeS = timeSeg(weekDays, minutes)
  return timeS
}
const sortTime = (first: { start: number, end: number }, second: { start: number, end: number }) => {
  return first.start - second.start
}
const transToSeg = (time: Array<{ "dayConcat": String, "HourConcat": String }>) => {
  // 把传入的对象 合并成 一维数组, 并排序
  let time1 = time.map(item => transWeek(item))
  const combine = Array.prototype.concat.apply([], time1)
  return combine.sort(sortTime)
}
const judgeTimeSlot = (time: { start: number, end: number }, timeSpace: Array<{ start: number, end: number }>) => {
  for (let index = 0; index < timeSpace.length; index++) {
    if (time.start <= timeSpace[index].start && time.end > timeSpace[index].start
      || time.start > timeSpace[index].start && time.start < timeSpace[index].end) {
      return false
    } else {
      continue
    }
  }
  return true
}
export default {
  /**
   * @function
   * @description Remove key value pairs from objects through properties
   * @param {object} object
   * @param {string} key
   * @returns {void}
   */
  remove({ object, key }: { object: {}; key: string }) {
    if (u.isObj(object)) {
      unset(object, key)
    }
    return
  },
  /**
   * @function
   * @description Assign the value of an attribute of an object to null
   * @param {object} object
   * @param {string} key
   * @returns {void}
   */
  clear({ object, key }: { object: {}; key: string }) {
    if (u.isObj(object)) {
      object[key] = ''
    }
    return
  },
  /**
   * @function
   * @description Set key value pairs for objects
   * @param {object} object
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  set({ object, key, value }: { object: {}; key: string; value: any }) {
    if (u.isObj(object)) {
      set(object, key, value)
    }
    return
  },
  /**
   * @function
   * @description Set key value pairs for each item in the object array
   * @param {array} objectArr
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  setObjectKey({
    objectArr,
    key,
    value,
  }: {
    objectArr: {}[]
    key: string
    value: any
  }): {}[] {
    Array.from(objectArr).forEach((object) => {
      if (u.isObj(object)) {
        set(object, key, value)
      }
    })
    return objectArr
  },
  /**
   * @function
   * @description Gets a value of an object
   * @param {array} objectArr
   * @param {string} key
   * @returns {any}
   */
  get({ object, key }: { object: {}; key: string }) {
    if (u.isObj(object)) {
      if (object[key] == '') object[key] = ' '
      return object[key]
    }
    return
  },
  /**
   * @function
   * @description Determine whether there is an attribute in the object
   * @param {object} object
   * @param {string} key
   * @returns {boolean}
   */
  has({ object, key }: { object: {}; key: string }) {
    // log.debug(`[object-has]`,{object,key})
    if (u.isObj(object)) {
      if (key in object && !!object[key]) {
        return true
      }
      return false
    }
    return
  },
  /**
   * @function
   * @description Loop to determine whether the value of an object under a path is equal to false.
   * If yes, it returns true, and if no, it returns false
   * @param {array} objArr
   * @param {string} valPath
   * @returns {boolean}
   */
  objectHasValue({
    objArr,
    valPath,
  }: {
    objArr: { [key: string]: {} }[]
    valPath: string
  }): boolean {
    let objBool = false
    Array.from(objArr).forEach((obj) => {
      if (obj[valPath] !== false) {
        objBool = true
        return objBool
      }
      return objBool
    })

    return objBool
  },

  /**
   * @function
   * @description clears one key of all items of object, and set one item，for list radio
   * @param {array} object
   * @param {array} item
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  clearAndSetKey({
    object,
    item,
    key,
    value,
  }: {
    object: { [key in string]: any }[]
    item: {}
    key: string
    value: any
  }) {
    if (u.isArr(object)) {
      for (let i = 0; i < object.length; i++) {
        object[i][key] = ''
      }
      item[key] = value
    }
    return
  },
  /**
   * @function
   * @description Extract an item from multiple arrays
   * @param {array} array
   * @param {string} field
   * @returns {array}
   */
  extract({ array, field }: { array: any[]; field: string }) {
    let result: any[] = [];
    if (u.isArr(array)) {
      array.forEach((item) => {
        result.push(get(item, field))
      })
    }
    return result
  },
  /**
   * @function
   * @description Convert the two passed in arrays into object arrays according to the corresponding properties
   * @param {array} obj
   * @param {array} arr
   * @returns {array}
   */
  extractArray({ obj, arr }: { obj: any[]; arr: any[] }) {
    if (u.isArr(obj)) {
      let res = new Array()
      obj.forEach((objItem) => {
        let resArray: any = {}
        arr.forEach((element: any) => {
          let _data = objItem
          if (element.indexOf('.') === -1) {
            resArray[element] = _data.hasOwnProperty(element)
              ? _data[element]
              : ''
          } else {
            let subtitle: any[] = element.split('.')
            subtitle.forEach((item) => {
              _data = _data.hasOwnProperty(item) ? _data[item] : ''
            })
            if (_data) {
              resArray[subtitle[subtitle.length - 1]] = _data.toString()
            }
          }
        })
        res.push(resArray)
      })

      return res
    }
    return ''
  },
  /**
   * @function
   * @description Sets the value of the subtype of another object property
   * according to one object property and returns the numeric array type
   * @param {array} auth
   * @param {array} authList
   * @returns {array}
   */
  authToSubType({
    auth,
    authList,
  }: {
    auth: { [key in string]: any }
    authList: { [key in string]: any }
  }) {
    let result: number[] = []
    Object.keys(auth).forEach((key: any) => {
      let authType = 0
      Object.keys(authList).forEach((arr) => {
        if (key === arr) {
          authType = authList[arr] * 10000
        }
      })
      if (auth?.[key]?.['create'] === true) authType += 4
      if (auth?.[key]?.['edit'] === true) authType += 2
      if (auth?.[key]?.['review'] === true) authType += 1
      result.push(parseInt(authType.toString(), 16))
    })
    return result
  },
  /**
   * @function
   * @description Set the true value of the object's property according to the true value of the
   * object's specific property, and return the object
   * @param {object} object
   * @returns {object}
   *
   */
  findTrue({ object }: { object: { [key in string]: any } }) {
    let auth = {
      Settings: false,
      UserManagement: false,
      Schedule: false,
    }
    Object.keys(object).forEach((key) => {
      Object.keys(object[key]).forEach((key1) => {
        if ((key === 'MFI' || key === 'TDT') && object[key][key1] === true) {
          auth.Settings = true
          return
        }
        if (
          (key === 'staff' || key === 'patient' || key === 'provider') &&
          object[key][key1] === true
        ) {
          auth.UserManagement = true
          return
        }
        if (
          (key === 'scheduleInfo' || key === 'PAT') &&
          object[key][key1] === true
        ) {
          auth.Schedule = true
          return
        }
      })
    })
    return auth
  },
  /**
   * @function
   * @description Set the values of all properties of the object to true (only two levels of depth),
   *  and return the object
   * @param {object} object
   * @returns {object}
   *
   */
  setAuthAllTrue({ object }: { object: { [key in string]: any } }) {
    Object.keys(object).forEach((key) => {
      Object.keys(object[key]).forEach((key1) => {
        object[key][key1] = true
      })
    })
    return object
  },
  /**
   * @function
   * @description Judge whether the object is empty
   * @param {object} object
   * @returns {boolean}
   *
   */
  isEmpty({ object }: { object: any }) {
    if (object === '') return true
    return false
  },
  /**
   * @function
   * @description Set the value of the object whose attribute is key to value
   * @param {object} object
   * @param {string} key
   * @param {any} value
   * @returns {void}
   *
   */
  setByKey({
    object,
    key,
    value,
  }: {
    object: { [key in string]: any }
    key: any
    value: any
  }) {
    Object.keys(object).forEach((item) => {
      if (key === item) object[item] = value
    })
    return
  },
  /**
   * @function
   * @description The key and value of an object are obtained according to the attribute value of an object,
   * and encapsulated into an object return
   * @param {object} objects
   * @param {array} objStr
   * @returns {object}
   *
   */
  getObjValueAndKey({
    objects,
    objStr,
  }: {
    objects: { [key in string]: any }
    objStr: any
  }): Object {
    let arr: Array<any> = Object.keys(objects)
    let objNew: { [k: string]: any } = {}
    for (let index = 0; index < arr.length; index++) {
      if (objStr[index] in objects) {
        objNew[objStr[index]] = objects[objStr[index]]
      }
    }
    return objNew
  },
  /**
   * @function
   * @description Get the key of the object and return
   * @param {object} objects
   * @returns {array}
   *
   */
  getObjKey({
    objects,
  }: {
    objects: { [key in string]: any }
  }): string[] | null {
    if (objects) {
      return Object.keys(objects)
    }
    return []
  },
  /**
   * @function
   * @description Get the key of the object, return the key and value
   * of the split object, encapsulate each item of the object into a separate object, put it into the array and return
   * @param {object} object
   * @returns {array}
   *
   */
  getObjWithKV({ object }: { object: any[] }) {
    var arr: keyValue[] = []
    let o: keyValue
    for (let i in object) {
      o = {
        key: i,
        value: object[i],
      }
      arr.push(o)
    }
    return arr
  },
  /**
   * @function
   * @description Compare the passed in property values,
   * set the property values of related objects, and return the object
   * @param {object} obj
   * @param {string} label
   * @param {string} text
   * @param {string[]} arr
   * @param {string[]} valueArr
   * @param {string[]} valueArr
   * @returns {object}
   *
   */
  setProperty({
    obj,
    label,
    text,
    arr,
    valueArr,
    errorArr,
  }: {
    obj: { [key: string]: any }[]
    label: string
    text: string
    arr: string[]
    valueArr: string[]
    errorArr: string[]
  }) {
    for (let index = 0; index < obj.length; index++) {
      for (let i in arr) {
        if (obj?.[index]?.[label] === text) {
          obj[index][arr[i]] = valueArr[i]
        } else {
          obj[index][arr[i]] = errorArr[i]
        }
      }
    }
    return obj
  },
  /**
   * @function
   * @description Judge whether the object is visitreason or telemedicine, and color it
   * @param {array} obj
   * @returns {array}
   */
  setTimeProperty({ obj }: { obj: { [key: string]: any }[] }) {
    let objClone: any = JSON.parse(JSON.stringify(obj))
    objClone.forEach((item) => {
      let temp: any = item['subtype']
      let checkTemp: any = ((temp & 0xf0000) >> 16) % 2
      if (checkTemp === 0 && item['name'].hasOwnProperty('visitReason')) {
        set(item, "name.backgroundColor", "0xfff7e3")
        set(item, "name.borderColor", "0xfff7e3")
        set(item, "name.fontColor", "0xf8ae29")
      } else if (
        checkTemp === 1 &&
        item['name'].hasOwnProperty('visitReason')
      ) {
        set(item, "name.backgroundColor", "0xe4f5e9")
        set(item, "name.borderColor", "0xe4f5e9")
        set(item, "name.fontColor", "0x17a05d")
      } else {
        set(item, "name.visitReason", "Avaliable")
        set(item, "name.visitType", "")
        set(item, "name.backgroundColor", "0xffffff")
        set(item, "name.borderColor", "0xeeeeee")

      }
    })

    return objClone
  },
  /**
   * @function
   * @description Empty the incoming object
   * @param {object} objects
   * @returns {void}
   *
   */
  clearAll({ object }: { object: { [key in string]: any } }) {
    Object.keys(object).forEach((item) => {
      if (u.isArr(object[item])) object[item] = []
      else object[item] = ' '
    })
  },
  /**
   * @function
   * @description Format the object array according to the passed path
   * and Boolean value. If bool is true, the attributes of the array
   * object will be capitalized. If bool is false, the operation will
   * not be carried out (as the filtering function of the address book)
   * @param {array} objArrs
   * @param {string[]} pathObj
   * @param {boolean} bool
   * @returns {array}
   *
   */
  extractingFeatureStrings({
    objArrs,
    pathObj,
    bool,
  }: {
    objArrs: {}[]
    pathObj: string[]
    bool?: boolean
  }): string | { [key: string]: string[] }[] {
    let objArr: any[] = [],
      objArrData: any[] = [],
      itemName: string[] = [],
      objNameArr: {}[] = [],
      hj: { [key: string]: {}[] } = {},
      newArr: string[] = []
    if (objArrs.length === 0) {
      return []
    }
    objArrs.forEach((o: {}) => {
      pathObj.forEach((item) => {
        itemName.push(item.split('.')[item.split('.').length - 1])
        objArrData.push(get(o, item, 'default'))
      })
      objArr.push(get(o, pathObj[0], 'default'))
      objNameArr.push(zipObject(itemName, objArrData))
    })

    if (objArr.length === 0) {
      return 'The array is empty'
    }
    if (bool) {
      objArr.map((value, index, arr) => {
        arr[index] = value[0].toLocaleUpperCase() + value.slice(1)
        objArr = arr
      })
    }
    objArr.sort()
    for (let arr of objArr) {
      if (!(arr in newArr) && /[a-zA-Z]+/.test(arr.charAt(0))) {
        newArr.push(arr.charAt(0))
      }
    }
    let newArrLen: number = newArr.length
    let objValues: any[] = []
    for (let newArrIn = 0; newArrIn < newArrLen; newArrIn++) {
      hj[newArr[newArrIn]] = new Array()
      objNameArr.forEach((item) => {
        if (
          (item[itemName[0]].charAt(0) as string).toLocaleUpperCase() ===
          newArr[newArrIn] &&
          /[a-zA-Z]+/.test(item[itemName[0]].charAt(0))
        ) {
          hj[newArr[newArrIn]].push(item)
        }
      })
    }
    objNameArr.forEach((item) => {
      if (!/[a-zA-Z]+/.test(item[itemName[0]].charAt(0))) {
        objValues.push(item)
      }
    })
    objArr = []
    for (let [key, value] of Object.entries(hj)) {
      objArr.push(zipObject(['index', 'data'], [key, value]))
    }
    if (objValues.length !== 0) {
      objArr.unshift(zipObject(['index', 'data'], ['#', objValues]))
    }
    return objArr
  },
  /**
   * @function
   * @description Add key and value values to each object
   * @param {object} object
   * @param {string} key
   * @param {any} value
   * @returns {void}
   *
   */
  addKey({ object, key, value }: { object: {}[]; key: string; value: any }) {
    object.forEach((index) => {
      index[key] = value
    })
    return object
  },
  /**
   * @function
   * @description Delete key value pair
   * @param {object} object
   * @param {string[]} path
   * @returns {object}
   *
   */
  deleteKey({ object, path }: { object: {}; path: string[] }): {} {
    path.forEach((element) => {
      unset(object, element)
    })
    return object
  },
  /**
   * @function
   * @description Determine whether there are native attributes
   * @param {object} object
   * @param {string[]} keyArr
   * @returns {boolean}
   */
  hasMultipleKeys({ object, keyArr }: { object: {}, keyArr: string[] }) {
    if (u.isObj(object)) {
      for (let i = 0; i < keyArr.length; i++) {
        if (object.hasOwnProperty(keyArr[i]) === false) {
          return false
        }
      }
    }
    return true
  },
  /**
   * @function
   * @description Judge the status according to the type value
   * @param {object} object
   * @param {string} type
   * @param {string} state
   * @returns {string}
   */
  transformStatus(
    object: { [key in string]: any },
    type = "type",
    state = "deat.state"
  ): string {
    if (object) {
      if (get(object, type) === 2002) {
        if (get(object, state) === "COMPLETED") {
          return get(object,"tage")==0 ? "Refund":"Deleted"
        }
        else if (get(object, state) === "PENDING") {
          return "Refund Pending"
        } else {
          return "Refunded fail";
        }
      } else if ([2001,2006,3001,3006,3008].includes(get(object, type))) {
        if (get(object, state) === "COMPLETED") {
          return "Paid";
        } else if(get(object, state) === "APPROVED"){
          return "Paid";
        }
        else {
          return "Paid Fail";
        }
      } else if (get(object, type) === 2003) {
        return "Cash Out";
      } else if (get(object, type) === 2004) {
        return "Adjustment";
      }
    }
    return "Unpaid";
  },
  /**
   * @function
   * @description Judge whether the attribute value of the incoming object contains false
   * @param {object} object
   * @param {string} type
   * @param {string} state
   * @returns {string}
   */
  judgeAllTrue({ object }: { object: { [key in string]: any } }) {
    let isAllTrue: boolean = true
    Object.keys(object).forEach((key) => {
      Object.keys(object?.[key]).forEach((key1) => {
        if (object?.[key]?.[key1] === false) {
          isAllTrue = false
        }
      })
    })
    return isAllTrue
  },
  /**
   * @function
   * @description Set multiple attribute values on the array
   * @param {object[]} obj
   * @param {string} label
   * @param {any} checkValue
   * @param {string[]} arr
   * @param {string[]} valueArr
   * @param {string[]} errorArr
   * @returns {object}
   */
  setMultipleProperty({
    obj,
    label,
    checkValue,
    arr,
    valueArr,
    errorArr,
  }: {
    obj: { [key: string]: any }[]
    label: string
    checkValue: any
    arr: string[]
    valueArr: string[]
    errorArr: string[]
  }) {
    let cloneObj = JSON.parse(JSON.stringify(obj))
    if (checkValue.hasOwnProperty(label)) {
      for (let index = 0; index < cloneObj.length; index++) {
        for (let key in arr) {
          if (cloneObj?.[index]?.[label] === checkValue[label]) {
            if (cloneObj[index].hasOwnProperty(arr[key])) {
              if (cloneObj?.[index]?.[arr?.[key]] === valueArr[key]) {
                cloneObj[index][arr[key]] = errorArr[key]
              } else {
                cloneObj[index][arr[key]] = valueArr[key]
              }
            } else {
              cloneObj[index][arr[key]] = valueArr[key]
            }
          }
        }
      }
    } else {
      for (let i = 0; i < cloneObj.length; i++) {
        for (let j in arr) {
          cloneObj[i][arr[j]] = errorArr[j]
        }
      }
    }

    return cloneObj
  },
  /**
   * @function
   * @description Encapsulate the passed in object array with specific attribute values
   * @param {object[]} originalObjArr
   * @param {string[]} pathArr
   * @returns {object[]}
   */
  eEncapsulatedObj({ originalObjArr, pathArr }: { originalObjArr: { [key in string]: any }[], pathArr: string[] }): { [key in string]: any }[] {
    let arrValuesObj: { [key in string]: any }[] = [];
    let arrValues: string[] = [];
    let pickArr: (string | undefined)[] = pathArr.map((item) => {
      if (item.includes(".")) {
        return ((item as string).split(".") as any).at(-1);
      } return item;
    })
    originalObjArr.forEach((element) => {
      pathArr.forEach((item) => {
        arrValues.push(get(element, item))
        log.debug(arrValues)
      });
      arrValuesObj.push(zipObject(pickArr as string[], arrValues))
      arrValues = []

    });
    return arrValuesObj;
  },
  /**
   * @function
   * @description Encapsulate the incoming object as CSV
   * @param {object} arrObj
   * @returns {object|string}
   */
  toCsvFormat({ arrObj }: { arrObj: { [key in string]: any } }) {
    if (u.isArr(arrObj)) {
      let strCvg: string = ""
      arrObj.forEach((element) => {
        let csvRow: string = Object.values(element).toString();
        strCvg = `${csvRow}\r\n` + strCvg;
      })
      return strCvg
    }
    return arrObj
  },
  /**
   * @function
   * @description Match the fields you want to search
   * @param {object[]} objArr
   * @param {string[]} paths
   * @param {string | number} value
   * @returns {object[]}
   */
  matchSearchValue({ objArr, paths, value }:
    { objArr: { [key in string] }[], paths: string[], value: string | number }): { [key in string] }[] {
    let arrCom: { [x: string]: any }[] = [];
    let valueNew = (value as string).split("");
    valueNew.forEach((val, index) => {
      valueNew[index] = /\W/.test(val) ? ("\\" + val) : val;
    })
    objArr?.forEach((objItem: { [key in string]: any }) => {
      paths.forEach((path: string) => {
        if (new RegExp(valueNew.join(""), 'ig').test(get(objItem, path))) {
          arrCom.push(objItem)
        }
      })
    })
    return arrCom;
  },
  /**
   * @function
   * @description Delete object field
   * @param {object} obj
   * @returns {undefined}
   */
  clearObject({ obj }: { obj: object }) {
    if(Object.keys(obj).length){
      for (var key in obj) {
        delete obj[key]
      }
    }
    return
  },
  /**
   * @function
   * @description Find the changed object field and encapsulate it
   * @param {object} object
   * @param {object} baseObject
   * @returns {Array}
   */
   difference({ object, baseObject }:
    {
      object: { [key in string]: any },
      baseObject: { [key in string]: any }
    }): { [key in string]: any } {
    let arrIndex: { [key in string]: { [x: string]: any; }[] } = {};
    let itemArr: { [key in string]: any }[] = []

    const matchingKey: { [key: string]: string } = {
      'avatar': "Avatar",
      'firstName': "First Name",
      'middleName': "Middle Name",
      'lastName': "Last Name",
      'dateOfBirth': "Date of Birth",
      'gender': "Gender",
      'socialSecurity': "Social Security #",
      'alternatePhone': "Alternate Phone #",
      'email': "Email",
      'relation': 'Relation',
      'countryCode': "Country Code",
      'phoneNumber': "Phone #",
      'employerName': "Employer Name",
      'dept': "Dept.",
      'NatureBusiness': "Nature of Business",
      'Occupation': "Occupation",
      'Telephone': "Telephone #",
      'fax': "Fax #",
      'name': "Attorneys Name",
      'phone': "Phone #",
      'line': "Address Line",
      'secondLine': "Address Second Line",
      'city': "City",
      'county': "County",
      'state': "State",
      'zipCode': "Zip code",
      'fullAddress': "Full Address",
      'myEmail': 'Email'
    }

    let foo = (obj: { [key in string]: any }, base: { [key in string]: any }, item: string) => {
      for (let i in obj) {
        if (typeof obj[i] === "object") {
          foo(obj[i], base[i], item);
        } else {
          if (!((item === 'basicInfo') && (['fullName'].includes(i)))) {
            if (typeof obj[i] === "number" || typeof obj[i] === "string" || typeof obj[i] === "boolean") {
              if (obj[i] !== base[i]) {
                let t = i
                if(item === 'contactInfo' && i === 'phoneNumber') t = 'alternatePhone'
                itemArr.push({ "key": matchingKey[t], "value": obj[i] })
              }
            }
          }

        }
      }

    }
    let joinArr: string[] = ["basicInfo", "contactInfo", "emergencyContact", "employment","attorneysInfo"];
    joinArr.forEach((item) => {
      foo(object[item], baseObject[item], item);
      itemArr.length ? (arrIndex[item] = cloneDeep(itemArr)) : arrIndex[item] = [];
      itemArr.length = 0;
    })
    return arrIndex;
  },
  /**
   * @function
   * @description modify Object Properties
   * @param {obj} object
   * @param {string[]} keyArr
   * @param {boolean} bool
   * @returns {Array}
   */
  modifyObjectProperties({ obj, keyArr, bool }: { obj: object, keyArr: string[], bool: boolean }) {
    let strObj: string = JSON.stringify(obj);
    keyArr.forEach((item) => {
      strObj = strObj.replace(new RegExp(`"${item}":(false|true)`, "g"), `"${item}":${bool}`);
    })
    return JSON.parse(strObj);
  },
  /**
   * @function
   * @description set Object Display And Color
   * @param {obj} object
   * @returns {object}
   */
  setObjDisplayAndColor({ obj }: { obj: object }): object {
    let objView: object = {};
    const strVar: string[] = ["patient","provider","prodAppSchedule", "roomAppSchedule", "documentNotes", "paymentSetting", "mailMessage"]
    let strJson: string = JSON.stringify(obj);
    strVar.forEach((item) => {
      if ((new RegExp(`"${item}":{\{1\}"view":(false)[a-zA-Z:",]*}\{1\}`, "g")).test(strJson)) {
        objView[`${item}`] = "none";
      }
      else if ((new RegExp(`"${item}":{\{1\}"view":(true)[a-zA-Z:",]*}\{1\}`, "g")).test(strJson)) {
        objView[`${item}`] = "block"
      }
    })
    strJson = JSON.parse(strJson
      .replace(new RegExp(`{\{1\}"view":(false)[a-zA-Z:",]*}\{1\}`, "g"), `"0xf4f4f4"`)
      .replace(new RegExp(`{\{1\}"view":(true)[a-zA-Z:",]*}\{1\}`, "g"), `"0xffffff"`));
    return { "controlColor": strJson, "controlDisplay": objView }
  },
  /**
   * @function
   * @description judge Time Overlap
   * @param {object} time
   * @param {object[]} timeSpace
   * @returns {Array}
   */
  judgeTimeOverlap({ time, timeSpace }: { time: { "dayConcat": String, "HourConcat": String }, timeSpace: Array<{ "dayConcat": String, "HourConcat": String }> }) {
    const getTime = transWeek(time)
    if (getTime == false) {
      return false
    }
    let orderRes = transToSeg(timeSpace)
    let arr: Array<boolean> = []
    getTime.forEach(item => {
      arr.push(judgeTimeSlot(item, orderRes))
    })
    let res = arr.every(x => x)
    return res
  },
  judgeCurrentTimeInSpace({ timeSpace }: { timeSpace: Array<{ "dayConcat": String, "HourConcat": String }> }) {
    let orderRes = transToSeg(timeSpace)
    const t = new Date()
    const day = t.getDay()
    const hour = t.getHours()
    const min = t.getMinutes()
    const _timeStamp = transTime(day, hour, min)
    const currentTime = {
      "start": _timeStamp,
      "end": _timeStamp
    }
    return !(judgeTimeSlot(currentTime, orderRes))
  },
  /**
   * @function
   * @description judge the Status
   * @param {object} obj
   * @param {boolean} reg
   * @returns {boolean}
   */
  judgeStatus({ obj, reg }: { obj: {}, reg: boolean }): boolean {
    return !(new RegExp(`":(${!reg})`, "g")).test(JSON.stringify(obj));

  },
  concatObjectAttr({ obj }: { obj: {} }): string {
    //@ts-ignore
    return JSON.stringify(obj).replaceAll(",", ";").slice(1, -1).replaceAll("\"", "");
  },
  judgeAllValue({ obj }: { obj: object }) {
    return Object.values(obj).every(Boolean);
  },
  clearValue({obj}:{obj:{}}){
    let clear = (obj)=>{
      Object.keys(obj).forEach(key => {
        if (Object.prototype.toString.call(obj[key]).includes('Object')){
            clear(obj[key]);
        }else if(Object.prototype.toString.call(obj[key]).includes('Array')){
        obj[key]= [];
        }
        else {
            obj[key]='';
        }
    });
    }
    clear(obj);
    
  return obj;
},
  handleAuditDate(date){
    if(/^(\-|\+)?\d+(.\d+)?$/.test(date)){
      return moment(date * 1000).format('L hh:mm:ss A')
    }else{
      return date
    }
  },
  handleAuditDetail(object){
    if(["block","none"].includes(get(object,"name.data.details"))){
      let dateStart = moment(object?.["name"]?.["data"]?.["date"] * 1000).format('L hh:mm:ss A')
      let dateEnd = moment(object?.["name"]?.["data"]?.["dateEnd"] * 1000).format('L hh:mm:ss A')      
      return `Range Start: ${dateStart} Range End: ${dateEnd}`
    }else{
      return get(object,"name.data.details")
    }
  },
  handlePaymentFee({paymentObject,fee}:{paymentObject:{},fee:string}){
    let obtainValue:{} = {}
    if(get(paymentObject,"type")==2002){
      obtainValue["status"] = true
      if(get(paymentObject,"deat.state")=="COMPLETED"){
        obtainValue["color"]="0xF8AE29"
        obtainValue["currentFee"]="0.00"
        return obtainValue
      }else{
        obtainValue["color"]="0x2fb355"
        obtainValue["currentFee"]=get(paymentObject,"name.title")
        return obtainValue
      }
    }else{
      obtainValue["status"] = false
      if(get(paymentObject,"deat.state")=="COMPLETED"){
        obtainValue["color"]="0x2fb355"
        obtainValue["currentFee"]="0.00"
        return obtainValue
      }else{
        obtainValue["color"]="0xE24445"
        obtainValue["currentFee"]=fee
        return obtainValue
      }
    }
  },
  setAppointmentStatus({
    obj,
    localArr,
    binaryArr,
    attr,
    valueArr,
    errorArr,
  }: {
    obj: {[key in string]: any}[],
    localArr: number[]
    binaryArr: number[]
    attr: string[]
    valueArr: string[]
    errorArr: string[]
  }){
    if (obj == null) {
      return []
    }
    if (obj.length === 0) {
      return []
    }
   let cloneObj = cloneDeep(obj)   
   cloneObj.forEach(item=>{
     if (number?.default?.typeIsValid(
      {
        docType: item?.tage,
        localArr,
        binaryArr
      }
     )) {
      for (let index = 0; index < attr.length; index++) {
        item[attr[index]] = valueArr[index]
      }
     } else {
      for (let index = 0; index < attr.length; index++) {
        item[attr[index]] = errorArr[index]
      }
     }
  })
   return cloneObj  
  },
  specifyReplaceObject({
    target,
    source,
    filterPath
  }: {
    target: any
    source: any
    filterPath?: string[]
  }) {
    const targetClone = cloneDeep(target)
    const sourceClone = cloneDeep(source)
    const {
      classTag,
      statusTag,
      userInfo,
      facilityInfo,
      patientInfo,
      providerInfo,
      signatureId,
      ...res
    } = sourceClone
    const filterPathClone = cloneDeep(filterPath)
    let filterObj = cloneDeep(res)
    if (filterPath) {
      filterPathClone?.forEach(targetPath=>{   
        filterObj = removeKeyFromObject(filterObj,targetPath)
      })     
    }
    return assignIn(targetClone, filterObj)
  },
  setMeetingCallStatus({
    obj,
    label,
    textArr,
    arr,
    resultArr
  }:{
    obj:{[key in string]:any}[],
    label:string,
    textArr: number[],
    arr:string[],
    resultArr: string[][]
  }){
    obj.forEach((val)=>{
        for(let n =0;n<textArr.length;n++){
          if(get(val,label) === textArr[n]){
            for(let i =0;i<arr.length;i++){
              val[arr[i]] = resultArr[n][i]
            }
          }
        }
    })
    return obj;
  },
  logChanges({
    source,
    target
  }: {
    source: Record<string, any>,
    target: Record<string, any>
  }) {
    const result: Record<string, any> = {}
    const getChangeKey = (keyStr: string = '') => {
      if(keyStr === '') {
        Object.keys(source).forEach(key => {
          getChangeKey(`${key}`)
        })
      } else {
        const s = get(source, keyStr)
        const t = get(target, keyStr)
        if(u.isObj(s)) {
          Object.keys(s).forEach(key => {
            getChangeKey(`${keyStr}.${key}`)
          })
        } else if (u.isArr(s)) {
          s.forEach((item, index) => {
            getChangeKey(`${keyStr}.${index}`)
          })
        } else {
          if(s !== t) {
            set(result, keyStr, t)
          }
        }
      }
    }
    getChangeKey()
    return result
  },
  validateCreditCard({creditCardInformation}: {creditCardInformation: {[key in string]: any}}){
    const {cardNumber, date, cvv} = creditCardInformation
    let cardNumberStatus, dataStatus, cvvStatus
    validateCreditCard(cardNumber, date, cvv)
    function validateCreditCard(cardNumber, date, cvv) {
      if (validateCardNumber(cardNumber) && validateExpiryDate(date) && validateCVV(cvv)) {
          log.debug("Valid credit card information!");
      } else {
          log.debug("Invalid credit card information. Please check your input.");
      }
    }
    function validateCardNumber(cardNumber) {
      // 检查是否为数字且长度在合理范围内
      return /^\d{13,16}$/.test(cardNumber);
    }
    function validateExpiryDate(expiryDate) {
      // 检查是否符合 MM/YY 格式
      return /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate);
    }
    function validateCVV(cvv) {
      // 检查是否为数字且长度在合理范围内
      return /^\d{3,4}$/.test(cvv);
    }
    return {
      cardNumberStatus, dataStatus, cvvStatus
    }
  },
  /**
   * @function
   * @description 用于提取financial form和 patient profile 数据进行对比 
   * @param {object} financialForm  financialForm name.data 
   * @param {object} patientProfile  patientProfile name.data 
   */
  formatFinAndPatProfileData({
    financialForm,
    patientProfile,
  }: {
    financialForm: object,
    patientProfile: object
  }) {

    const defaultAddress = {
      "line": "",
      "secondLine": "",
      "city": "",
      "state": "",
      "zipCode": "",
      "fullAddress": ""
    }
    const patientProfileFormat:object = {}
    set(patientProfileFormat,'identification.imageId',get(patientProfile,'identification.imageId') ?? '')
    set(patientProfileFormat,'basicInfo.fullName',get(patientProfile,'basicInfo.fullName') ?? '')
    set(patientProfileFormat,'basicInfo.firstName',get(patientProfile,'basicInfo.firstName') ?? '')
    set(patientProfileFormat,'basicInfo.middleName',get(patientProfile,'basicInfo.middleName') ?? '')
    set(patientProfileFormat,'basicInfo.lastName',get(patientProfile,'basicInfo.lastName') ?? '')
    set(patientProfileFormat,'basicInfo.dateOfBirth',get(patientProfile,'basicInfo.dateOfBirth') ?? '')
    set(patientProfileFormat,'identification.type',get(patientProfile,'identification.type') ?? '')
    set(patientProfileFormat,'identification.id',get(patientProfile,'identification.id') ?? '')
    set(patientProfileFormat,'basicInfo.gender',get(patientProfile,'basicInfo.gender') ?? '')
    set(patientProfileFormat,'contactInfo.address',get(patientProfile,'contactInfo.address') ?? defaultAddress)
    const financialFormat:object = {}
    set(financialFormat,'identification.imageId',get(financialForm,'patientInfo.uploadedId') ?? '' )
    set(financialFormat,'basicInfo.fullName',get(financialForm,'patientInfo.fullName') ?? '')
    set(financialFormat,'basicInfo.firstName',get(financialForm,'patientInfo.firstName') ?? '')
    set(financialFormat,'basicInfo.middleName',get(financialForm,'patientInfo.middleName') ?? '')
    set(financialFormat,'basicInfo.lastName',get(financialForm,'patientInfo.lastName') ?? '' )
    set(financialFormat,'basicInfo.dateOfBirth',get(financialForm,'patientInfo.dateOfBirth') ?? '')
    set(financialFormat,'identification.type',get(financialForm,'patientInfo.IDType') ?? '')
    set(financialFormat,'identification.id',get(financialForm,'patientInfo.ID') ?? '')
    set(financialFormat,'basicInfo.gender',get(financialForm,'patientInfo.gender') ?? '')
    set(financialFormat,'contactInfo.address',get(financialForm,'patientInfo.Address') ?? defaultAddress)
    return {
      patientProfileFormat,
      financialFormat
    }
  } ,
  /**
   * @function
   * @description Diff
   * @param {object} oldObject
   * @param {object} newObject
   * @returns
   * Object {
   *   [key | index]: {
   *     _type: modify | add | delete,
   *     _detail: {
   *       _old: any,
   *       _new: any
   *     }
   *   }
   * }
   */
  diff({oldObject,newObject,detail = false}:{oldObject: Object, newObject: Object,detail: boolean}) {
    const result: any = {
      _type: getType(newObject),
      data: {},
      success: true,
    }
    
    if (typeof oldObject !== typeof newObject) {
      result.success = false
      result.errorMsg = 'different basic types of data'
      return result
    }

    if (!equalType(oldObject, newObject)) {
      result.success = false
      result.errorMsg = 'different data types'
      return result
    }

    detail ? detailDiffObject(result.data, oldObject, newObject) : newDiffObject(result.data, oldObject, newObject)
    
    return result
  },
  /**
   * Formats a detail diff object.
   *
   * @param {any} obj - The object to format.
   * @param {object} matchingKey - The matching key object.
   * @param {any[]} initData - The initial data array.
   * @return {any} The formatted detail diff object.
   */
  formatDetailDiffObject({obj,initData = []}:{obj: any,initData: any[]}) {
     return  orderBy(formatDetailDiff(obj,pateintProfileKey,initData),['key'],['asc'])
  },
/** 
 * @function
 * @param {object} profileObject patient Profile name.data
 * @param {object} detailDiffObject financial diff patient Profile 
 * @returns
  */
  mergePatProfile({profileObject,newDiffObject}: {profileObject: object,newDiffObject: object}){
    const mergeObject:any = merge(profileObject,newDiffObject)
    // set(mergeObject,'contactInfo.address.fullAddress','')
    // const contactInfoFullAddress = Object.values(get(mergeObject,'contactInfo.address') ?? {}).filter(Boolean).join(', ')
    // set(mergeObject,'contactInfo.address.fullAddress',contactInfoFullAddress)
    return mergeObject
  },
  /**
   * Retrieves the formatted insurance list.
   *
   * @param {any[]} insuranceList - The array of insurance objects.
   * @param {string[]} reomveAttribute - The array of attributes to be removed from each insurance object.
   * @param {boolean} [detail=true] - Optional. Indicates whether to include detailed information in the formatted list. Defaults to true.
   * @return {any[]} The formatted insurance list.
   */
  getFormatInsuranceList({insuranceList,reomveAttribute,detail=true}: {insuranceList: any[],reomveAttribute:string [],detail:boolean} ){
    return formatInsuranceList(insuranceList,detail)
  },
  formatPatientProfile({data,reomveAttribute}: {data: object[],reomveAttribute: string[]}){
    let res= data
    for (const keyPath of reomveAttribute) {
      res = removeKeyFromObject(res,keyPath)
    } 
    const {emergencyContact,basicInfo} = res as any
    const {countryCode,phoneNumber,...otherInfo} = basicInfo

    set(res,'basicInfo',{})
    set(res,'basicInfo',otherInfo)

    if (!isEmpty(emergencyContact)) {
      const emergencyObject = {...emergencyContact}
      set(res,'emergencyContact',{})
      const firstName = get(emergencyObject,'firstName') 
      const middleName = get(emergencyObject,'middleName')
      const lastName = get(emergencyObject,'lastName') 
      const relation = get(emergencyObject,'relation')
      set(res,'emergencyContact.emergencyFirstName',firstName || "")
      set(res,'emergencyContact.emergencyMiddleName',middleName || "")
      set(res,'emergencyContact.emergencyLastName',lastName || "")
      set(res,'emergencyContact.relation',relation || "")
      if (!isEmpty(get(emergencyObject,'phone'))) {
        const countryCode = get(emergencyObject,'phone.countryCode')
        const phoneNumber = get(emergencyObject,'phone.phoneNumber')
        const fullPhone  = get(emergencyObject,'phone.fullPhone')
        set(res,'emergencyContact.phone.emergencyCountryCode',countryCode || "+1")
        set(res,'emergencyContact.phone.emergencyPhoneNumber',phoneNumber || "")
        set(res,'emergencyContact.phone.emergencyFullPhone', fullPhone || "+1")
      }
    }


    return res
  },
  patProfileKeyTransform({data}: {data: object[]}){
    const {emergencyContact } = data as any
    if (!isEmpty(emergencyContact)) {
      const emergencyObject = {...emergencyContact}
      set(data,'emergencyContact',{})
      const firstName = get(emergencyObject,'emergencyFirstName')
      const middleName = get(emergencyObject,'emergencyMiddleName') 
      const lastName = get(emergencyObject,'emergencyLastName') 

      const relation = get(emergencyObject,'relation')
      if (firstName || firstName === '') {
        set(data,'emergencyContact.firstName',firstName || "")
      }
      if (middleName || middleName === '') {
        set(data,'emergencyContact.middleName',middleName || "")
      }
      if (lastName || lastName === '') {
        set(data,'emergencyContact.lastName',lastName || "")
      }
      if (relation || relation === '') {
        set(data,'emergencyContact.relation',relation || "")
      }
      if (!isEmpty(get(emergencyObject,'phone'))) {
        const countryCode = get(emergencyObject,'phone.emergencyCountryCode') 
        const phoneNumber = get(emergencyObject,'phone.emergencyPhoneNumber') 
        const fullPhone  = get(emergencyObject,'phone.emergencyFullPhone')
        if (countryCode || countryCode === '') {
          set(data,'emergencyContact.phone.countryCode',countryCode || "+1")
        }
        if (phoneNumber || phoneNumber === '') {
          set(data,'emergencyContact.phone.phoneNumber',phoneNumber || "")
        }
        if (fullPhone || fullPhone === '') {
          set(data,'emergencyContact.phone.fullPhone', fullPhone || "+1")
        }
      }
    }
    return data
  },
  checkProfileType({obj}: {obj: Object}) {
    return checkTypeFalse(obj)
  },
  reomveProperty({object,reomveKeyArray}: {object: Object,reomveKeyArray: string[]}) {
    const cloneObject = cloneDeep(object)
    return removeDiffKeys(cloneObject,reomveKeyArray)
  }
} 
