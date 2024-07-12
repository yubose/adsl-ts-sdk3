import moment from 'moment'
import humanizeDuration from 'humanize-duration'
import { AnyArray } from 'immer/dist/internal'
import store from '../../common/store'
import get from 'lodash/get'
import log from '../../utils/log'
import set from 'lodash/set'
import * as u from '@jsmanifest/utils'
import { App } from '../../constants'

/**
 * @function
 * @description The latitude and longitude is converted into a trigonometric function in the form of a mid-degree minute table.
 * @param {number} d
 * @returns {number}
 */
function Rad(d) {
  return d * Math.PI / 180.0;
}
/**
 * @function
 * @description calculate Distance By Position
 * @param {number[]} point1
 * @param {number[]} point2
 * @returns {string} 
 */
function calculateDistanceByPosition(point1, point2 = [39.2946, -76.6252]) {
  if (point2 && point1) {
    let radLat1 = Rad(point1[0])
    let radLat2 = Rad(point2[0])
    let a = radLat1 - radLat2
    let b = Rad(point1[1]) - Rad(point2[1])
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)))
    s = s * 6378.137 // EARTH_RADIUS
    s = Math.round(s * 10000) / 10000 //输出为公里
    return s.toFixed(2) + " km"
  }
  return "0km"

}
export default {
  /**
   * @function
   * @description Format the time to output the format of hour, minute and second (example: 08:02:14)
   * @param {number} time
   * @returns {string}
   *
   */
  formatTimer(time: number, type: string = 'HH:mm:ss') {
    return moment(time).format(type)
  },
  /**
   * @function
   * @description Format and output the difference from Greenwich mean time
   * (for example: 51 years, 7 months, 2 weeks, 3 days, 5 hours, 8 minutes, 33.604 seconds)
   * @param {number} unixTime
   * @returns {string}
   *
   */
  formatUnixtimeSecond(unixTime: number) {
    return unixTime ? moment(unixTime * 1000).format('L hh:mm:ss A') : '--'
  },
  formatUnixtime(unixTime: number) {
    return moment(unixTime * 1000).format('L hh:mm A')
  },
  /**
   * @function
   * @description Format time (for example: Nov 23, 2021 10:01 AM)
   * @param {number} unixTime (millisecond)
   * @returns {string}
   *
   */
  formatNowTime() {
    return moment().format('lll')
  },
  /**
   * @function
   * @description Format time (for example: Nov 23, 2021 10:01 AM)
   * @param {number} unixTime (second)
   * @returns {string}
   *
   */

  formatUnixtime_en(unixTime: number | string): any {
    return unixTime !== '--'
      ? moment((unixTime as number) * 1000).format('lll')
      : '--'
  },
  /**
   * @function
   * @description Format time (for example: 7/12/2021)
   * @param {number} unixTime (second)
   * @returns {string}
   *
   */
  formatUnixtimeL_en(unixTime: number) {
    return unixTime ? moment(unixTime * 1000).format('MM/DD/YYYY') : ''
  },
  /**
   * @function
   * @description Format time (for example: 5:20 PM)
   * @param {number} unixTime (second)
   * @returns {string}
   *
   */
  formatUnixtimeLT_en(unixTime: number) {
    return moment(unixTime * 1000).format('LT')
  },
  /**
   * @function
   * @description Format time (for example: 51 years, 10 months, 3 weeks, 23 hours, 12 minutes, 3.212 seconds)
   * @param {number} unixTime (second)
   * @returns {string}
   *
   */
  formatDurationInSecond(unixTime: number) {
    return humanizeDuration(unixTime * 1000)
  },
  /**
   * @function
   * @description Format time (for example: Nov 23, 2021 10:13 AM)
   * @param {number} unixTime (millisecond)
   * @returns {string}
   *
   */
  formatDurationInMicroSecond(unixTime: number) {
    return moment(unixTime).format('lll')
  },
  /**
   * @function
   * @description Concatenation character array
   * @param {array} stringArr
   * @returns {string}
   *
   */
  concat(stringArr: string[]): string {
    if (Array.isArray(stringArr)) {
      return stringArr.join('')
    }
    return ''
  },
  /**
   * @function
   * @description Concatenate character arrays, excluding spaces
   * @param {array} stringArr
   * @returns {string}
   *
   */
  concatTrim(strValue: string[]): string {
    if (Array.isArray(strValue)) {
      return strValue
        .filter((start) => {
          if (start) return start
        })
        .join('')
    }
    return ''
  },
  concatTrimBySign({ strArray, sign }: { strArray: string[]; sign: string }) {
    if (Array.isArray(strArray)) {
      return strArray
        .filter((strEach) => {
          if (strEach) return strEach
        })
        .join(sign)
    }
    return ''
  },
  /**
   * @function
   * @description Splice two arrays, divide the values in the string with length of 16 equally
   *  and output them (for example: ['ABSN', 'DMLD', 'KIPO', 'lsdf'])
   * @param {string} key
   * @returns {string[]}
   *
   */
  split16DkeytoArray(key: string): string[] {
    if (key.length !== 16) return []
    let keyArray: string[] = []
    return keyArray.concat(
      key.substring(0, 4),
      key.substring(4, 8),
      key.substring(8, 12),
      key.substring(12),
    )
  },
  /**
   * @function
   * @description Cut the value in the string with length of 16 and output it
   * (example: please let your friend enter this code on their side: ABSN DMLD KIPO lsdf)
   * @param {string} Dkey
   * @returns {string}
   *
   */
  split16Dkey(Dkey: string): string {
    if (Dkey.length !== 16) return Dkey + ' length:' + Dkey.length
    return (
      'Please let your friend enter this code on their side: ' +
      Dkey.substring(0, 4) +
      '-' +
      Dkey.substring(4, 8) +
      '-' +
      Dkey.substring(8, 12) +
      '-' +
      Dkey.substring(12)
    )
  },
  /**
   * @function
   * @description Judge whether two strings are equal (example: 2 == "2","a" == "a")
   * @param {string} string1
   * @param {string} string2
   * @returns {boolean}
   *
   */
  equal({ string1, string2 }: { string1: string; string2: string }): boolean {
    // log.debug(`[string-equal]`,{string1,string2})
    return string1 == string2
  },
  /**
   * @function
   * @description Gets the first letter of the string and converts it to uppercase
   * @param {string} value
   * @returns {string|void}
   *
   */
  getFirstChar({ value }: { value: string }): string | void {
    if (value) {
      return value.charAt(0).toUpperCase()
    }
    return ''
  },
  /**
   * @function
   * @description Get string length
   * @param {string} str
   * @returns {number}
   *
   */
  getLength(str: any): number {
    return str.toString().length
  },
  /**
   * @param { string } str
   * @returns { string }
   */
  lowercase(str: string) {
    return String(str).toLowerCase()
  },
  /**
   * @function
   * @description Convert characters to numbers
   * @param {string} value
   * @returns {number}
   *
   */
  retainNumber({ value }: { value: any }): number {
    return Number.parseFloat(value)
  },

  /**
   * @function
   * @description Verify whether the number is correct and return the Boolean value
   * @param {string} countryCode country code of phone number
   * @param {string} phoneNumber phone number
   * @returns {boolean}
   */
  phoneVerification({
    countryCode,
    phoneNumber,
  }: {
    countryCode: string
    phoneNumber: number | string
  }) {
    log.debug('test phoneVerificatio', {
      countryCode: countryCode,
      phoneNumber: phoneNumber,
    })
    const phonesRegex = {
      'zh-CN': /^(\+?0?86\-?)?1[345789]\d{9}$/,
      'zh-TW': /^(\+?886\-?|0)?9\d{8}$/,
      'ar-KW': /^(\+?965)[569]\d{7}$/,
      'en-US': /^(\+?1)?[2-9]\d{2}[2-9](?!11)\d{6}$/,
      'es-MX': /^(\+?52)?\d{6,12}$/,
      'en-NZ': /^(\+?64)?[28]\d{7,8}$/,
      'en-PH': /^(\+?63)?9\d{9}$/,
    }
    if (countryCode && phoneNumber) {
      phoneNumber = phoneNumber.toString(10)
      countryCode = countryCode.trim()
      phoneNumber = phoneNumber.trim()
      phoneNumber = phoneNumber.toString().replace(/[^\d.]/g, '')
      let re
      if (countryCode === '+86') {
        phoneNumber = countryCode + '' + phoneNumber
        re = phoneNumber.match(phonesRegex['zh-CN'])
      } else if (countryCode === '+1') {
        if ((phoneNumber.substring(0, 3) === '888'|| phoneNumber.substring(0, 3) === '886' || phoneNumber.substring(0, 3) === '887')  && phoneNumber.length === 10) {
          return true
        }
        phoneNumber = countryCode + '' + phoneNumber
        re = phoneNumber.match(phonesRegex['en-US'])
      } else if (countryCode === '+965') {
        phoneNumber = countryCode + '' + phoneNumber
        re = phoneNumber.match(phonesRegex['ar-KW'])
      } else if (countryCode === '+52') {
        phoneNumber = countryCode + '' + phoneNumber
        re = phoneNumber.match(phonesRegex['es-MX'])
      } else if (countryCode === '+63') {
        phoneNumber = countryCode + '' + phoneNumber
        re = phoneNumber.match(phonesRegex['es-PH'])
      }
      if (re != null) {
        return true
      }
    }
    return false
  },
  /**
   * @function
   * @description Cut the string according to the sign parameter
   * @param {number} phonenumber
   * @param {string} sign
   * @returns {array}
   */
  phoneNumberSplit({
    phoneNumber,
    sign,
  }: {
    phoneNumber: number
    sign: string
  }): AnyArray {
    if (phoneNumber == null) return []
    return String(phoneNumber).toString().split(sign)
  },
  /**
   * @function
   * @description judge whether all string equal
   * @param {string[]} stringArr
   * @returns {boolean}
   */
  judgeMultipleEqual(stringArr: string[]) {
    for (let i = 1; i < stringArr.length; i++)
      if (stringArr[i - 1] !== stringArr[i]) return false
    return true
  },
  /**
   * @function
   * @description Cut the string according to the sign parameter, judge whether the
   * value in the character array has a value starting with the $symbol, and return a Boolean value
   * @param {string[]} stringArr
   * @returns {boolean}
   */
  judgeSelectTime(stringArr: string[]) {
    for (let i = 0; i < stringArr.length; i++) {
      if (stringArr[i].startsWith('$')) {
        return false
      }
    }
    return true
  },
  /**
   * @function
   * @description judge whether all the request textfield is filled in
   * @param {string[]} stringArr
   * @returns {boolean}
   */
  judgeFillinAll(stringArr: string[]) {
    if (stringArr.length === 0) return true
    for (let i = 0; i < stringArr.length; i++)
      if (
        stringArr[i] == '' ||
        stringArr[i] == '-- --' ||
        stringArr[i] == 'Select'
      )
        return true
    return false
  },
  /**
   * @function
   * @description Judge whether the array is all empty. If it is all empty, return true; otherwise, return false
   * @param {string[]} stringArr
   * @returns {boolean}
   */
  judgeIsAllEmpty(stringArr: string[]) {
    log.debug(stringArr)

    for (let i = 0; i < stringArr.length; i++)
      if (stringArr[i] != '') return false
    return true
  },
  /**
   * @function
   * @description Splice string
   * @param {string} str1
   * @param {string} str2
   * @param {string} str
   * @returns {string}
   */
  judgeAllTrue({
    str1,
    str2,
    str3,
  }: {
    str1: string
    str2: string
    str3: string
  }) {
    return str1 && str2 && str3
  },
  /**
   * @function
   * @description Determines whether the object property is empty (only two levels of depth) and returns a Boolean value
   * @param {object} object
   * @returns {string}
   */
  judgesFillinAll(object) {
    let isEmpty = false
    Object.keys(object).forEach((x) => {
      if (object[x] !== null && object[x] !== '') {
        // log.debug(Object.keys(object[x]))
        Object.keys(object[x]).forEach((y) => {
          if (object[x][y] == null || object[x][y] == '') {
            log.debug(object[x][y])
            isEmpty = true
            // return false
          }
        })
      }
    })
    if (isEmpty) {
      return false
    }
    return true
  },
  /**
   * @function
   * @description Manipulate the value of the object, add spaces and commas, and return the spliced string
   * @param {any} obj
   * @returns {string}
   */
  strLenx({ obj }: { obj: {} }): string {
    let newStr: string = ''
    let len: number = 0
    for (let val of (Object as any).values(obj)) {
      if (val !== '') {
        len++
        if (len === 2 || len === 4) {
          newStr += val + ' '
          continue
        }
        newStr += val + ','
      }
    }
    if (newStr === '') {
      return ''
    }
    return newStr.substr(0, newStr.length - 1)
  },
  /**
   * @function
   * @description Calculate the distance based on the longitude and latitude obtained by this software
   * and the incoming longitude and latitude
   * @param {array} point => longitude and latitude parameters
   * @returns {string|void}
   */
  distanceByPosition(point) {
    if (point != null || typeof point != 'undefined') {
      let currentLatitude = store.currentLatitude
      let currentLongitude = store.currentLongitude
      if (
        currentLatitude == null ||
        currentLongitude == null ||
        typeof currentLongitude == 'undefined' ||
        typeof currentLatitude == 'undefined'
      ) {
        return
      }
      let radLat1 = Rad(currentLatitude)
      let radLat2 = Rad(point[0])
      let a = radLat1 - radLat2
      let b = Rad(currentLongitude) - Rad(point[1])
      let s =
        2 *
        Math.asin(
          Math.sqrt(
            Math.pow(Math.sin(a / 2), 2) +
              Math.cos(radLat1) *
                Math.cos(radLat2) *
                Math.pow(Math.sin(b / 2), 2),
          ),
        )
      s = s * 6378.137 // EARTH_RADIUS
      s = Math.round(s * 10000) / 10000 //输出为公里
      return s.toFixed(2) + ' km'
    }
    return
  },
  /**
   * @function
   * @description Parse the address data obtained by mapbox
   * @param {object} object => mapbox daddress data
   * @returns {object}
   */
  getAddress({ object }: { object: { [key in string]: any } }) {
    let res = {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      location: '',
      geoCode: [],
      country: '',
      county: '',
      firsLine: '',
      SecondLine: '',
      distance: '',
    }
    if (object) {
      let context = object['context']
      context.forEach((element) => {
        let prefix = element.id.split('.')[0]
        log.debug(prefix)
        switch (prefix) {
          case 'postcode':
            res.zipCode = element.text
            break
          case 'place':
            res.city = element.text
            break
          case 'region':
            // res.state = element.text
            res.state = element.short_code.split('-')[1]
            break
          case 'country':
            res.country = element.text
            break
          case 'district':
            res.county = element.text
            break
        }
      })
      res.distance = calculateDistanceByPosition(object?.center)
      res.geoCode = object.center
      res.location = object.place_name
      if (object?.properties?.address) {
        res.address = object.text + ', ' + object.properties.address
      } else {
        res.address = object.text
      }
      res.address = object.address
        ? object.address + ' ' + res.address
        : res.address

      if (
        object?.place_type[0] == 'poi' ||
        object?.place_type[0] == 'address'
      ) {
        res.firsLine = object.text
        if (object.properties.address) {
          res.SecondLine = object?.properties?.address
        } else {
          res.SecondLine = ''
        }
      } else {
        res.firsLine = ''
        res.SecondLine = ''
      }
      if (object?.place_type[0] == 'place') {
        res.city = object.text
        res.address = ''
      }

      if (object?.place_type[0] == 'region') {
        res.state = object.text
        res.address = ''
      }
      if (object?.place_type[0] == 'postcode') {
        res.zipCode = object.text
        res.address = ''
      }

      if (object?.place_type[0] == 'district') {
        res.county = object.text
        res.address = ''
      }

      return res
    }
    return res
  },

  /**
   * @function
   * @description  Cut and splice the string ID
   * @param {string} facilityID =>facilityID
   * @param {string} locationID =>local loaction's ID
   * @param {string} roomID =>local room's ID
   * @returns {string}
   */
  generateID({
    facilityID,
    locationID,
    roomID,
  }: {
    facilityID: string
    locationID: string
    roomID: string | number
  }) {
    if (roomID != '') {
      // rid: Remove spaces from the string and convert to lowercase, keeping only 6 digits
      let rid = roomID
        .toString()
        .toLowerCase()
        .replace(/\s*/g, '')
        .substring(0, 6)
      // return locationId splice rid,keeping the length of locationId is only 25 digits and the finished stitched string less than 32 digits
      return locationID.substring(0, 25).concat('_').concat(rid)
    } else if (locationID != '') {
      let lid = locationID
        .toString()
        .toLowerCase()
        .replace(/\s*/g, '')
        .substring(0, 8)
      return facilityID.substring(0, 16).concat('_').concat(lid)
    } else {
      let fid = facilityID
        .toString()
        .toLocaleLowerCase()
        .replace(/\s*/g, '')
        .substring(0, 16)
      return fid
    }
  },
  /**
   * @function
   * @description  Returns the size of the document and formats the result
   * @param {string} bitNum
   * @returns {string}
   */
  bitFormatting(bitNum: number): string {
    if (bitNum === 0) return '0 B'
    let k = 1024,
      sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      i = Math.floor(Math.log(bitNum) / Math.log(k))
    let num = bitNum / Math.pow(k, i)
    return num.toFixed(2) + ' ' + sizes[i]
  },
  /**
   * @function
   * @description  Judge whether two given strings have substrings of the same length
   * @param {string} stringOne
   * @param {string} stringTwo
   * @param {number} len
   * @returns {boolean}
   */
  equalsLenString({
    stringOne,
    stringTwo,
    len,
  }: {
    stringOne: string
    stringTwo: string
    len: number
  }): boolean {
    for (let i = 0; i < len; i++) {
      if (stringOne[i] !== stringTwo[i]) {
        return false
      }
    }
    return true
  },
  /**
   * @function
   * @description  Splice and match according to the entered $ format
   * @param {number|string} fund
   * @returns {string}
   */
  dollarFormat(fund: any) {
    fund = String(fund)
    if (/^(\-?)\d+(\.\d+)?$/.test(fund)) {
      // judge that if fund is num
      if (/[\.]/.test(fund)) {
        //judge that if fund has "." .if has , return fund .if not , return fund/100
        return fund.startsWith('-') ? '-' + '$' + fund.substring(1) : '$' + fund
      } else {
        return fund.startsWith('-')
          ? '-' + '$' + (fund.substring(1) / 100).toFixed(2)
          : '$' + (fund / 100).toFixed(2)
      }
    } else return fund
  },
  /**
   * @function
   * @description parse Splice String
   * @param {number | string} value
   * @param {object[]} objArr
   * @param {string} path
   * @param {string} pathItem
   * @returns {string}
   */
  parseSpliceString({
    value,
    objArr,
    path = 'text',
    pathItem = 'specialty',
  }: {
    value: string | number
    objArr: { [key in string]: any }[]
    path?: string
    pathItem?: string
  }): string {
    let strValue: string = ''
    objArr?.forEach((objItem: { [key in string]: any }) => {
      if (new RegExp(String(value), 'ig').test(get(objItem, path))) {
        strValue += get(objItem, pathItem) + '\u0020'
      }
    })
    strValue += value
    return strValue.trim()
  },
  /**
   * @function
   * @description Summation function
   * @param {number} value1
   * @param {number} value2
   * @returns {number}
   */
  addValue({ value1, value2 }) {
    return value1 + value2
  },
  matchString({
    stringOrigin,
    stringMatch,
  }: {
    stringOrigin: string
    stringMatch: string
  }) {
    if (stringOrigin.search(stringMatch) == -1) return false
    return true
  },
  interceptChar({
    chars,
    path,
    start,
    len,
  }: {
    chars: { [key in string]: any }[]
    path: string
    start: number
    len: number
  }) {
    let arr: string[] = []
    chars.forEach((ele) => {
      arr.push(get(ele, path).substring(start, len))
    })
    return arr
  },
  isContainSpace({ value }: { value: string }): boolean {
    if (typeof value === 'string') return value.includes(' ')
    return false
  },
  numberProtection({ string }: { string: string }) {
    if (typeof string === 'string') {
      let reg = /(?<=\s).*(?=\d{4})/
      return string.replace(
        reg,
        '*'.repeat(string.match(reg)?.[0].length as number),
      )
    }
  },
  pageChangeButton({
    pagecount,
    currentPage,
  }: {
    pagecount: number | string
    currentPage: number | string
  }) {
    if (pagecount == 1) {
      console.error('1')

      return {
        left: 'none',
        right: 'none',
      }
    } else if (currentPage == 1) {
      return {
        left: 'none',
        right: 'block',
      }
    } else if (currentPage == pagecount) {
      return {
        left: 'block',
        right: 'none',
      }
    } else {
      return {
        left: 'block',
        right: 'block',
      }
    }
  },
  getServiceType(subtype: string | number) {
    const serviceList = [
      'Business General (B)',
      'Medical Facility (M)',
      'Pharmacy (M)',
      'Employer (B)',
      'Medical Supplier (M)',
      'Law Office (B)',
      'Image Center (M)',
      'Lab (M)',
      'Insurance (B)',
    ]
    let index =
      typeof subtype === 'string' ? parseInt(subtype) / 10 : subtype / 10
    return serviceList[index] || ''
  },
  statementStatus(tag: number) {
    let status = ''
    switch (tag) {
      case 1:
        status = 'New'
        break
      case 2:
        status = 'Printed'
        break
      case 3:
        status = 'Paid with Balance'
        break
      case 4:
        status = 'Paid'
        break
      case 5:
        status = 'Bill Patient'
        break
      case 6:
        status = 'Secondary Insurance'
        break
      case 7:
        status = 'Settled'
        break
      case 8:
        status = 'Past Due'
        break
    }
    return status
  },
  coverageType(edgeTag: number) {
    let status = ''
    const binaryStr = edgeTag.toString(2).padStart(16, '0')
    const subStr = binaryStr.slice(-16, -12)
    if (subStr === '0000') status = 'No Selected'
    if (subStr === '0001') status = 'Medical Insurance'
    if (subStr === '0010') status = 'Workers Comp'
    if (subStr === '0011') status = 'Personal Injury'
    if (subStr === '0100') status = 'Self Pay'
    return status
  },
  billingStatus(edgeTag: number) {
    let status = ''
    const binaryStr = edgeTag.toString(2).padStart(22, '0')
    const subStr = binaryStr.slice(-22, -18)
    if (subStr === '0000') status = 'Not Create'
    if (subStr === '0001') status = 'New'
    if (subStr === '0010') status = 'Printed'
    if (subStr === '0011') status = 'Paid with balance'
    if (subStr === '1001') status = 'Paid'
    if (subStr === '0100') status = 'Bill to Patient'
    if (subStr === '0101') status = 'Settled'
    if (subStr === '0110') status = 'Secondary Insurance'
    if (subStr === '0111') status = 'Personal Injury'
    if (subStr === '1000') status = 'WC Bill Direct'
    return status
  },
  orderStatus(tage: number) {
    let status = '',
      statusTag
    if (Object.prototype.toString.call(tage) === '[object Number]')
      statusTag = tage
    else if (Object.prototype.toString.call(tage) === '[object Object]')
      statusTag = tage['tage']
    if ((statusTag & 0x0001) == 1) status = 'Placed'
    if ((statusTag & 0x0002) === 2) status = 'Preparing'
    if ((statusTag & 0x0008) === 8) status = 'Shipped'
    if ((statusTag & 0x0010) === 16) status = 'Ready for Pickup'
    if ((statusTag & 0x80) === 128) status = 'Cancelled'
    if ((statusTag & 0x4000) === 16384) status = 'Pending'
    if ((statusTag & 0x8000) === 32768) status = 'Completed'

    return status
  },
  setGoodListStatus({
    goodList,
    statusPath,
  }: {
    goodList: {}[]
    statusPath: string
  }) {
    return goodList.map((good) => {
      switch (get(good, statusPath)) {
        case 0:
          set(good, 'isShowPurchased', 'none')
          set(good, 'isShowDelete', 'block')
          break
        case 4:
          set(good, 'isShowPurchased', 'none')
          set(good, 'isShowDelete', 'block')
          break
        case 2:
          set(good, 'isShowPurchased', 'block')
          set(good, 'isShowDelete', 'none')
          break
        case 6:
          set(good, 'isShowPurchased', 'block')
          set(good, 'isShowDelete', 'none')
          break
      }
      return good
    })
  },
  getDaysSinceTimestamp(timestamp) {
    const now = Date.now()
    const timeDiff = now - timestamp * 1000
    const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000))
    if (days == 0) return 'Today'
    else if (days == 1) return '1 day'
    else return days + ' days'
  },
  completionStr({
    value,
    digit,
    character,
    direction = 'front',
  }: {
    value: string | number
    digit: number
    character: string
    direction: string
  }) {
    if (direction == 'front') return value.toString().padStart(digit, character)
    else if (direction == 'back')
      return value.toString().padEnd(digit, character)
  },
  duration(seconds: number) {
    let [h, m, s] = [
      Math.floor(seconds / 3600) || '',
      Math.floor((seconds % 3600) / 60),
      seconds % 60,
    ]
    return (
      (h ? ((h as number) < 10 ? '0' + h : h) + ':' : '') +
      ('0' + m).slice(-2) +
      ':' +
      ('0' + s).slice(-2)
    )
  },
  meetTime(mtime: string | number) {
    const currentTimestamp: number = Math.floor(Date.now() / 1000)
    const parsedTimestamp: number =
      typeof mtime === 'string' ? parseInt(mtime, 10) : mtime
    const elapsedSeconds: number = currentTimestamp - parsedTimestamp
    const elapsedMinutes: number = Math.floor(elapsedSeconds / 60)
    return `Waiting ${elapsedMinutes < 1 ? 1 : elapsedMinutes} Mins`
  },
  meetDurationTime(info: {}) {
    const startTime = info['etime'] - info['deat']
    return moment(startTime * 1000).format('LT')
  },
  timeInterval(time: object) {
    const options: any = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }
    const end = +time['etime']
    if (!end) {
      return `${Intl.DateTimeFormat('en-US', options).format(
        +time['ctime'] * 1000,
      )}- --`
    }
    const start = end - +time['deat']

    const formattedStartTime = Intl.DateTimeFormat('en-US', options).format(
      start * 1000,
    )
    let formattedEndTime = Intl.DateTimeFormat('en-US', options).format(
      end * 1000,
    )
    if (!time['etime'] && !(window as App).app.meeting?.['room']) {
      formattedEndTime = Intl.DateTimeFormat('en-US', options).format(
        new Date().getTime(),
      )
    }
    const formattedTimeRange = `${formattedStartTime}-${formattedEndTime}`
    return formattedTimeRange
  },
  extractSingleStringFromCharacter({ string }: { string: string }) {
    const regex = /'(\w+)'/
    log.debug(string)
    const res = string.match(regex)
    if (res && res[1]) return res[1]
    return ''
  },
  getOrderOptionalStatus({
    firstTitle,
    secondTitle,
  }: {
    firstTitle: string
    secondTitle: string
  }) {
    const adminIncomplete = ['Placed', 'Preparing', 'Shipped', 'Completed']
    const adminPending = ['Preparing', 'Shipped', 'Completed']
    const adminComplete = []
    const patientIncomplete = [
      'Placed',
      'Preparing',
      'Ready for Pickup',
      'Completed',
    ]
    const patientComplete = []
    log.debug(firstTitle)
    log.debug(secondTitle)
    if (firstTitle === 'Admin') {
      if (secondTitle === 'Incomplete') return adminIncomplete
      else if (secondTitle === 'Pending') return adminPending
      else if (secondTitle === 'Completed') return adminComplete
    } else if (firstTitle === 'Patient') {
      if (secondTitle === 'Incomplete') return patientIncomplete
      else if (secondTitle === 'Completed') return patientComplete
    }
  },
  multEqual({
    target,
    conditionList,
  }: {
    target: string
    conditionList: string[]
  }) {
    return conditionList.some((condition) => target === condition)
  },
  isBank({ string }: { string: string }) {
    if (string) {
      if (u.isStr(string)) string = string.trim()
      if (!u.isNil(string)) return false
    }
    return true
  },
  parseUSAddress({
    address,
    addressArray,
  }: {
    address: string
    addressArray: {}[]
  }) {
    const parts = address.toString().split(',')
    let addressLine, secondLine, city, state, zipCode
    addressLine = parts[0].trim() || ''
    secondLine = parts[1].trim() || ''
    city = parts[2].trim() || ''
    let match = parts[3].match(/([^0-9]+)([0-9]+)/)
    if (match) {
      zipCode = match[2]
    }
    for (const addressData of addressArray) {
      if (addressData['id'].startsWith('region')) {
        const regionParts = addressData['short_code'].split('-')
        state = regionParts[1].toUpperCase()
      }
    }
    return {
      addressLine,
      secondLine,
      city,
      state,
      zipCode,
    }
  },
  formatAddress({ address }: { address: any }) {
    const { context, properties, text, place_name } = address
    const formatObj = {
      addressLine: '',
      addressSecondLine: '',
      city: '',
      county: '',
      state: '',
      zipCode: '',
    }
    formatObj.city =
      context.filter((item) => item.id.split('.')[0] === 'place')[0]?.text || ''
    formatObj.zipCode =
      context.filter((item) => item.id.split('.')[0] === 'postcode')[0]?.text ||
      ''
    formatObj.county =
      context.filter((item) => item.id.split('.')[0] === 'district')[0]?.text ||
      ''
    formatObj.state =
      context
        .filter((item) => item.id.split('.')[0] === 'region')[0]
        ?.short_code.split('-')[1] || ''
    formatObj.addressLine = place_name.split(',')[0]
    formatObj.addressSecondLine = ''
    return formatObj
  },
  getCorrectAddress({ addressArray }: { addressArray: string }) {
    let line = '',
      secondLine = '',
      state = '',
      zipCode = '',
      city = '',
      county = ''
    for (const addressData of addressArray) {
      if (addressData['id'].startsWith('neighborhood')) {
        line = addressData['text'] || ''
      } else if (addressData['id'].startsWith('postcode')) {
        zipCode = addressData['text'] || ''
      } else if (addressData['id'].startsWith('locality')) {
        secondLine = addressData['text'] || ''
      } else if (addressData['id'].startsWith('place')) {
        city = addressData['text'] || ''
      } else if (addressData['id'].startsWith('district')) {
        county = addressData['text'] || ''
      } else if (addressData['id'].startsWith('region')) {
        const regionParts = addressData['short_code'].split('-')
        state = regionParts[1].toUpperCase()
      }
    }
    return {
      line,
      secondLine,
      state,
      zipCode,
      city,
      county,
    }
  },
  formatISOTimestamp(ISOTime: string) {
    return moment(ISOTime).format('MM/DD/YYYY hh:mm')
  },
  slice({ str, start, end }: { str: string; start?: number; end?: number }) {
    if (start?.toString() && end?.toString()) {
      return str.slice(start, end)
    } else {
      const params = start?.toString() || end?.toString() || '0'
      return str.slice(+params)
    }
  },
  payerSummarizeInsuranceType(tage: number) {
    switch (tage) {
      case 0:
        return 'All Payers'
      case 1:
        return 'Medicare'
      case 2:
        return 'Medicaid'
      case 3:
        return 'TRICARE'
      case 4:
        return 'CHAMPVA'
      case 5:
        return 'Group Health Plan'
      case 6:
        return 'FECA BLKLung'
      case 7:
        return 'Other'
    }
  },
  splitPhone({ str }: { str: string }) {
    return (
      str &&
      str
        .split(/(\+\d+)/)
        .filter(Boolean)
        .map((item) => item.replace(' ', ''))
    )
  },
  showchiefComplaint(obj: object) {
    switch (obj['name']['title']) {
      case 'Surgery Report':
      case 'Surgery Report-A':
        return obj['name']['data']['reportData']['descriptionOfSurgery'] || ''
      case 'Provider’s SOAP Note':
      case 'Provider’s Initial Report-A':
        return obj['name']['data']['reportInfo']['chiefComplaint'] || ''
      case 'Progress Report-A':
        return obj['name']['title'] || ''
      default:
        return '-- --'
    }
  },
  getCurrentDateFormatted() {
    // YYYYMMDD
    let currentDate = new Date()
    let year = currentDate.getFullYear()
    let month = String(currentDate.getMonth() + 1).padStart(2, '0')
    let day = String(currentDate.getDate()).padStart(2, '0')

    let formattedDate = year + month + day
    return formattedDate
  },
  /**
   *
   * @param apiHost
   */
  copyAdmin({
    apiHost,
    phoneNumber,
  }: {
    apiHost: string
    phoneNumber: string
  }) {
    if (apiHost && phoneNumber) {
      let uint8Array = new Buffer(phoneNumber)
      let value = store.level2SDK.utilServices.uint8ArrayToBase58(uint8Array)
      if (apiHost === 'ecosapiprod.aitmed.io') {
        return `https://admin.aitmed.com/index.html?SignIn&phoneNumber=${value}`
      } else {
        return `https://admind.aitmed.io/index.html?SignIn&phoneNumber=${value}`
      }
    }
  },
  /**
   * generate jump link
   * @param apiHost
   * @param type
   * @returns
   */
  generateJumpLink({ apiHost, type }: { apiHost: string; type: string }) {
    const urlMap = {
      'ecosapiprod.aitmed.io': {
        admin: `https://admin.aitmed.com/index.html?SignIn`,
        patient: `https://patient.aitmed.com/index.html?SignIn`,
      },
      'testserver.aitmed.io': {
        admin: `https://admind.aitmed.io/index.html?SignIn`,
        patient: `https://patd.aitmed.io/index.html?SignIn`,
      },
    }
    if (apiHost) {
      switch (apiHost) {
        case 'testserver.aitmed.io':
          return urlMap[apiHost][type]
        case 'ecosapiprod.aitmed.io':
          return urlMap[apiHost][type]
      }
    }
  },
  newPhoneNumberFormat(phoneNumber) {
    if (phoneNumber.length != 10) {
      log.error('Phone number must be exactly 10 digits')
    }

    // Extract the parts of the phone number
    const areaCode = phoneNumber.substring(0, 3)
    const centralOfficeCode = phoneNumber.substring(3, 6)
    const lineNumber = phoneNumber.substring(6)

    // Format the phone number
    return `(${areaCode}) ${centralOfficeCode}-${lineNumber}`
  },
  formatPhoneNumber({ str }: { str: any }) {
    return str.replace(/[^\d]/g, '')
  },

  callDuration(options) {
    let etime = options.etime || 0
    let stime = options.stime || 0
    const seconds = etime - stime
    let [h, m, s] = [
      Math.floor(seconds / 3600) || '',
      Math.floor((seconds % 3600) / 60),
      seconds % 60,
    ]
    return (
      (h ? ((h as number) < 10 ? '0' + h : h) + ':' : '') +
      ('0' + m).slice(-2) +
      ':' +
      ('0' + s).slice(-2)
    )
  },
  handleOldCodeInCms({ codeList }: { codeList: Array<any> }) {
    if (codeList.length === 0) return []
    const newResp = codeList.map((item) => {
      if (!item.id) {
        return item
      } else {
        item.originCharge = item.charge
        return item
      }
    })
    return newResp
  },
}

