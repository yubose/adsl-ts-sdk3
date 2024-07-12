import * as u from '@jsmanifest/utils'
import split from 'lodash/split'
import get from 'lodash/get'
import log from '../../utils/log'

import moment from 'moment'
import store from '../../common/store'
import _, { toNumber } from 'lodash'
interface splitTime {
  showTime: string
  stime: number
  etime: number
  refid: string
  bvid: string
}
function differentFormatsDateSplit(date) {
  let splitArr: string[] = []
  if (date) {
    if (date.indexOf('-') !== -1) {
      splitArr = date.split('-');
      splitArr = [splitArr[1], splitArr[2], splitArr[0]]
    }
    if (date.indexOf('/') !== -1) {
      splitArr = date.split('/');
    }
  } else return ['', '', '']
  return splitArr
}
export default {
  /**
   * @function
   * @description Returns the number of milliseconds between January 1, 1970
   * @returns {Number}
   */
  currentDateTime() {
    return Date.now()
  },

  /**
   * @function
   * @description Get the current day date
   * @returns {Number}
   */
  getDate() {
    return new Date().getDate()
  },

  /**
   * @function
   * @description Get the current month
   * @returns {Number}
   */
  getMonth() {
    return new Date().getMonth() + 1
  },

  /**
   * @function
   * @description Get the current year
   * @returns {Number}
   */
  getYear() {
    return new Date().getFullYear()
  },

  /**
   * @function
   * @description Returns the time difference between UTC and local time
   * @returns {String}
   */
  getTimezoneOffset() {
    return new Date().getTimezoneOffset().toString()
  },

  /**
   * @function
   * @description Returns the number of milliseconds between January 1, 1970
   * @returns {Number}
   */
  getNowLocalTime() {
    return new Date(new Date().toLocaleDateString()).getTime()
  },

  /**
   * @function
   * @description Returns the number of seconds since January 1, 1970 00:00:00 (UTC) to the current time
   * @returns {Number}
   */
  getNowLocalUnixTime() {
    return Math.ceil(new Date().getTime() / 1000)
  },

  /**
   * @function
   * @description Returns the number of seconds since January 1, 1970 00:00:00 (UTC) to the current time
   * @returns {Number}
   */
  getTime() {
    let date = new Date().toString()
    let stamp = Date.parse(date) / 1000
    return stamp
  },
  /**
   * @function
   * @description timestamp converted to date
   * @param {Number} timeStamp
   * @returns {Number}
   */
  stampToDate(timeStamp) {
    return new Date(parseInt(timeStamp) * 1000)
  },
  /**
   * @function
   * @description Timestamp is converted to hours, similar to 2:00AM
   * @param {Number} timeStamp
   * @returns {String}
   */
  stampToTime(timeStamp) {
    if (timeStamp) {
      let time = new Date(parseInt(timeStamp) * 1000).toString()
      let timeArray = time.split(' ')[4].split(':')
      return parseInt(timeArray[0]) < 12
        ? `${timeArray[0]}:${timeArray[1]}AM`
        : `${parseInt(timeArray[0]) - 12}:${timeArray[1]}PM`
    }
    return 'timeStamp is null'
  },
  /**
   * @function
   * @description timestamp--> year,month,day
   * @param timeStamp
   * @returns {Object}
   */
  stampToDay({ timeStamp }) {
    if (!timeStamp) return
    timeStamp = parseInt(timeStamp)
    let date = new Date(timeStamp * 1000)
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
  },
  /**
   * @function
   * @description Returns the time stamp interval of a day  (s)
   * @param {string} date
   * @return {Number}
   */
  getTimeStampOfDate({ date }) {
    //   convert time to YYYY-MM-DD
    let timeStamp = {
      start: 0,
      end: 0,
    }
    let dateObject: Date;
    if (date.indexOf("-") === -1) {
      let dateArray = date.split('/')
      dateArray[0] = parseInt(dateArray[0]) - 1
      dateObject = new Date(dateArray[2], dateArray[0], dateArray[1])
    }
    else {
      let dateArray = date.split('-')
      dateArray[1] = parseInt(dateArray[1]) - 1
      dateObject = new Date(dateArray[0], dateArray[1], dateArray[2])
    }
    timeStamp.start = Date.parse(dateObject.toString()) / 1000
    timeStamp.end = timeStamp.start + 86400
    return timeStamp
  },
  getStartAndEndWithStamp({date}: {date:number|string}) {
    return {
      start: new Date(+date*1000).setHours(0, 0, 0, 0)/1000,
      end: new Date(+date*1000).setHours(24, 0, 0, 0)/1000
    }
  },
  /**
   * @function
   * @description Divide 24h into intervals
   * @param {Number} span
   * @returns {Array}
   */
  LoopToGenerate({ span }) {
    let fotmat = (n: number) => {
      if (n < 13 * 60) {
        let h = Math.floor(n / 60)
        let m = n % 60
        if (h == 12) {
          return `${`${h}`.slice(-2)}:${`0${m}`.slice(-2)}PM`
        }
        return `${`0${h}`.slice(-2)}:${`0${m}`.slice(-2)}AM`
      } else {
        let h = Math.floor((n - 12 * 60) / 60)
        let m = (n - 12 * 60) % 60
        if (h == 12) {
          return `${`0${h}`.slice(-2)}:${`0${m}`.slice(-2)}AM`
        }
        return `${`0${h}`.slice(-2)}:${`0${m}`.slice(-2)}PM`
      }
    }
    let i: number = 0
    let arr: any[] = []
    while (i <= 24 * 60) {
      arr.push(fotmat(i))
      i += parseInt(span)
    }
    arr[arr.length - 1] = '11:59PM'
    return arr
  },
  /**
   * @function
   * @description Get all dates of the current month based on year, month, and day
   * @param {Number} year
   * @param {Number} month
   * @param {Number} today
   * @returns {Array}
   */
  calendarArray({ year, month, today, blockPastTime = "false", pastTimeColor = '#C1C1C1', pastTimeBackgroundColor = '#ffffff', oldData, firstLoad = false }) {
    if (year && month && today) {
      year = parseInt(year)
      month = parseInt(month)
      const todayDate = new Date(year, month - 1, today)
      const currentDate = new Date()
      currentDate.setHours(0)
      currentDate.setSeconds(0)
      currentDate.setMinutes(0)
      currentDate.setUTCMilliseconds(0)
      oldData = _.cloneDeep(oldData)
      const newblockPastTime: boolean = blockPastTime === "true" ? true : false
      if (!firstLoad && newblockPastTime && (currentDate.getTime() > todayDate.getTime())) return oldData
      // if(blockPastTime && )
      let dataObject: Record<string, any> = []
      let isLeapYear =
        (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? true : false
      let days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      days[1] = isLeapYear ? 29 : 28
      let dataArray = new Array(42).fill(0)
      // What day is the first day of the month
      let day = new Date(year, month - 1, 1).getDay()
      for (let i = day, j = 1; i < day + days[month - 1]; i++, j++) {
        dataArray[i] = j
      }
      // let frontMonth = month == 1 ? days[11] : days[month - 2]
      //  fill other day
      for (let i = day - 1, j = 0; i >= 0; i--, j++) {
        if (day == 0) break
        else {
          // dataArray[i] = frontMonth - j
          dataArray[i] = ''
        }
      }
      for (let i = day + days[month - 1], j = 1; i < 42; i++, j++) {
        // dataArray[i] = j
        dataArray[i] = ''
      }
      //  convert dataarray to jsononject
      const selectedDate = new Date(year, month - 1, today)
      const todatDate = new Date(year, month - 1, today)
      for (let i = 0; i < dataArray.length; i++) {
        if (!dataArray[i]) {
          dataObject.push({
            key: dataArray[i],
            color: '#333333',
            backgroundColor: '#ffffff',
          })
          continue
        }
        selectedDate.setDate(dataArray[i])
        if (
          (!newblockPastTime || (blockPastTime && todatDate.getTime() >= currentDate.getTime())) &&
          selectedDate.getTime() === todatDate.getTime()
        ) {
          dataObject.push({
            key: dataArray[i],
            color: '#003d68',
            backgroundColor: '#d7e2ea',
          })
        } else if (newblockPastTime && selectedDate.getTime() < currentDate.getTime()) {
          dataObject.push({
            key: dataArray[i],
            color: pastTimeColor,
            backgroundColor: pastTimeBackgroundColor,
          })
        } else {
          dataObject.push({
            key: dataArray[i],
            color: '#333333',
            backgroundColor: '#ffffff',
          })
        }
      }
      // let dataJson = chunk(dataArray, 7);
      return dataObject
    }
  },
  /**
   * @function
   * @description Divide the time period according to the edge's stime, etime and timeSlot
   * @param {Array} object2
   * @param {Number} timeSlot
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @returns {Array}
   */
  splitByTimeSlot({ object2, timeSlot, year, month, day }) {
    let date = new Date(year, month - 1, day)
    // date.setFullYear(year)
    // date.setMonth(month - 1)
    // date.setDate(day)
    // date.setHours(0)
    // date.setMinutes(0)
    // date.setSeconds(0)
    // date.setUTCMilliseconds(0)
    let anotherDay = date.getTime() / 1000 + 86400
    let splitTimeItem: splitTime
    let array: any = {
      morning: [],
      afternoon: [],
    }
    //@ts-ignore
    let nowtime = new Date().valueOf() / 1000
    if (u.isArr(object2)) {
      object2.forEach((obj) => {
        if (u.isObj(obj)) {
          if (
            obj['stime'] < date.getTime() / 1000 &&
            obj['etime'] > date.getTime() / 1000
          )
            obj['stime'] = date.getTime() / 1000
          if (obj['stime'] < anotherDay && obj['etime'] > anotherDay)
            obj['etime'] = anotherDay
          if (timeSlot) {
            let i = 0
            do {
              splitTimeItem = {
                stime: obj['stime'] + i * timeSlot * 60,
                etime: obj['stime'] + (i + 1) * timeSlot * 60,
                showTime: moment(
                  (obj['stime'] + i * timeSlot * 60) * 1000,
                ).format('LT'),
                refid: obj['id'],
                bvid: obj['bvid'],
              }
              log.debug(date.getTime())
              if (obj['etime'] - splitTimeItem['stime'] < timeSlot * 60) {
                continue
              } else {
                // if (splitTimeItem['stime'] >= nowtime) {
                if (splitTimeItem['showTime'].indexOf('AM') != -1) {
                  array.morning.push(splitTimeItem)
                } else {
                  array.afternoon.push(splitTimeItem)
                }
                // }
                i += 1
              }
            } while (
              splitTimeItem['etime'] <= obj['etime'] &&
              splitTimeItem['etime'] <= anotherDay
            )
          }
        }
      })
      return array
    }
    return array
  },
  /**
   * @function
   * @description Divide the time period according to the edge's stime, etime and timeSlot.
   * And according to whether the isSplitCurrent removes the time period between the current time
   * @param {Array} object2
   * @param {Number} timeSlot
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @param {Boolean} isSplitCurrent
   * @returns {Array}
   */
  splitTime({ object2, timeSlot, year, month, day, isSplitCurrent = false, delayTime }) {
    log.debug('test splitTime', {
      object2,
      timeSlot,
      year,
      month,
      day,
      isSplitCurrent,
    })
    let currentDate
    let currentTime
    if (isSplitCurrent) {
      currentDate = new Date()
      currentTime = currentDate.getTime() / 1000
    }
    if (delayTime) {
      currentTime = currentTime + parseInt(delayTime)
    }

    let date = new Date(year, month - 1, day)
    let anotherDay = date.getTime() / 1000 + 86400
    let splitTimeItem: splitTime
    let array: any = []
    if (u.isArr(object2)) {
      object2.forEach((obj) => {
        if (u.isObj(obj)) {
          if (
            obj['stime'] < date.getTime() / 1000 &&
            obj['etime'] > date.getTime() / 1000
          )
            obj['stime'] = date.getTime() / 1000
          if (obj['stime'] < anotherDay && obj['etime'] > anotherDay)
            obj['etime'] = anotherDay
          if (timeSlot) {
            let i = 0
            do {
              splitTimeItem = {
                stime: obj['stime'] + i * timeSlot * 60,
                etime: obj['stime'] + (i + 1) * timeSlot * 60,
                showTime: moment(
                  (obj['stime'] + i * timeSlot * 60) * 1000,
                ).format('LT'),
                refid: obj['id'],
                bvid: obj['bvid'],
              }
              if (obj['etime'] - splitTimeItem['stime'] < timeSlot * 60) {
                continue
              } else {
                if (splitTimeItem['showTime'].indexOf('AM') != -1) {
                  if (isSplitCurrent) {
                    if (splitTimeItem['stime'] > currentTime)
                      array.push(splitTimeItem)
                  } else {
                    array.push(splitTimeItem)
                  }
                } else {
                  if (isSplitCurrent) {
                    if (splitTimeItem['stime'] > currentTime)
                      array.push(splitTimeItem)
                  } else {
                    array.push(splitTimeItem)
                  }
                }
                i += 1
              }
            } while (
              splitTimeItem['etime'] <= obj['etime'] &&
              splitTimeItem['etime'] <= anotherDay
            )
          }
        }
      })
      return array
    }
    return array
  },
  /**
   * @function
   * @description According to stime, etime displays date start and end similar to 9:17 AM-7:04 PM
   * @param {Object} object
   * @returns {String}
   */
  ShowTimeSpan(object) {
    if (u.isObj(object)) {
      if (object.hasOwnProperty('stime') && object.hasOwnProperty('etime')) {
        let start_date = moment(object['stime'] * 1000).format('LT')
        let end_date = moment(object['etime'] * 1000).format('LT')
        let duration_date = start_date + ' - ' + end_date
        return duration_date
      }
      return
    }
    return
  },
  /**
   * @function
   * @description According to stime, etime displays the date similar to 2021-08-20
   * @param {Object} object
   * @returns {String}
   */
  ShowTimeDate(object) {
    if (u.isObj(object)) {
      if (object.hasOwnProperty('stime') && object.hasOwnProperty('etime')) {
        let date = new Date(object['stime'] * 1000)
        let y = date.getFullYear()
        let m =
          date.getMonth() + 1 > 9
            ? date.getMonth() + 1
            : '0' + (date.getMonth() + 1)
        let d = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`
        let duration_date = m + '-' + d + '-' + y
        return duration_date
      }
      return
    }
    return
  },
  /**
   * @function
   * @description According to stime, etime displays the date similar to 2021-08-20
   * @param {Object} object
   * @returns {String}
   */
  ShowTimeDateUS(object) {
    if (u.isObj(object)) {
      if (object.hasOwnProperty('stime') && object.hasOwnProperty('etime')) {
        let date = new Date(object['stime'] * 1000)
        let y = date.getFullYear()
        let m =
          date.getMonth() + 1 > 9
            ? date.getMonth() + 1
            : '0' + (date.getMonth() + 1)
        let d = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`
        let duration_date = m + '-' + d + '-' + y
        return duration_date
      }
      return
    }
    return
  },
  /**
   * @function
   * @description According to stime, etime displays the date similar to 08-20-2021 9:17 AM-7:04 PM
   * @param {Object} object
   * @returns {Array}
   */
  ShowTimeSpanFormat_us(object) {
    if (u.isObj(object)) {
      if (object.hasOwnProperty('stime') && object.hasOwnProperty('etime')) {
        let date = new Date(object['stime'] * 1000)
        let y = date.getFullYear()
        let m =
          date.getMonth() + 1 >= 10
            ? date.getMonth() + 1
            : '0' + (date.getMonth() + 1)
        let d = date.getDate() < 10 ? `0${date.getDate()}` : `${date.getDate()}`
        let start_date = moment(object['stime'] * 1000).format('LT')
        let end_date = moment(object['etime'] * 1000).format('LT')
        let duration_date =
          m + '-' + d + '-' + y + ' ' + start_date + '-' + end_date
        return duration_date
      }
      return
    }
    return
  },
  // minicalendarArray({ year, month, today, middleDay, span, color, backgroundColor, todayColor, todayBackgroundColor }) {
  //   log.debug("test minicalendarArray", {
  /**
   * @function
   * @description Get all dates of the current month based on year, month, and day
   * @param {Number} year
   * @param {Number} month
   * @param {Number} today
   * @param {Number} middleDay
   * @param {Number} span
   * @param {String} color
   * @param {String} backgroundColor
   * @param {String} todayColor
   * @param {String} todayBackgroundColor
   * @returns {Array}
   */
  minicalendarArray({
    year,
    month,
    today,
    middleDay,
    span,
    color,
    backgroundColor,
    todayColor,
    todayBackgroundColor,
  }) {
    log.debug('test minicalendarArray', {
      year: year,
      month: month,
      today: today,
      middleDay: middleDay,
      span: span,
    })
    middleDay = parseInt(middleDay)
    span = parseInt(span)
    year = parseInt(year)
    month = parseInt(month)
    month = month
    let weeks = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    let dataObject: Record<string, any> = []
    let isLeapYear =
      (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 ? true : false
    let days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    days[1] = isLeapYear ? 29 : 28
    let index = Math.ceil(-(span / 2))
    for (let i = 1; i <= span; i++) {
      let d = middleDay + index
      if (today == d) {
        let date = new Date(year, month, d)
        let day = weeks[date.getDay()]
        dataObject.push({
          key: today,
          week: day,
          color: todayColor,
          backgroundColor: todayBackgroundColor,
        })
      } else if (d < 1) {
        d = d + days[month - 1]
        let date = new Date(year, month, d)
        let day = weeks[date.getDay()]
        dataObject.push({
          key: d,
          week: day,
          color: color,
          backgroundColor: backgroundColor,
        })
      } else if (d > days[month - 1]) {
        d = d - days[month - 1]
        let date = new Date(year, month, d)
        let day = weeks[date.getDay()]
        dataObject.push({
          key: d,
          week: day,
          color: color,
          backgroundColor: backgroundColor,
        })
      } else {
        let date = new Date(year, month, d)
        let day = weeks[date.getDay()]
        dataObject.push({
          key: d,
          week: day,
          color: color,
          backgroundColor: backgroundColor,
        })
      }
      index = index + 1
    }
    return dataObject
  },
  /**
   * @function
   * @description Add and subtract months
   * @param {Number} month
   * @param {Number} step
   * @returns {Number}
   */
  loopMonth({ month, step }) {
    month = parseInt(month)
    step = parseInt(step)
    if (month && step) {
      let newmonth = month + step
      if (newmonth > 12) {
        newmonth = newmonth - 12
      } else if (newmonth < 1) {
        newmonth = newmonth + 12
      }
      return newmonth
    }
    return
  },

  /**
   * @function
   * @description Get all dates of the current Week based on year, month, and day
   * @param {Number} year input year
   * @param {Number} month input month
   * @param {Number} today input today,this can generate today font color and backgroundcolor
   * @param {Number} markDay Generate week time according this param
   * @param {String} color   font color of common date
   * @param {String} backgroundColor  background color of common date
   * @param {String} todayColor  font color of today
   * @param {String} todayBackgroundColor background color of today
   * @returns {Array}
   * return data formate:
   * [{year: 2021,month: 3,day: 28,weekDay: 'Su',color: '#000000', backgroundColor: '#ffffff'}]
   */
  miniWeeklyCalendarArray({
    year,
    month,
    today,
    markDay,
    color,
    backgroundColor,
    todayColor,
    todayBackgroundColor,
    currentDateTime,
    pastTimeColor = null,
    includeToday
  }) {
    if (
      typeof year == 'string' ||
      typeof month == 'string' ||
      typeof today == 'string' ||
      typeof markDay == 'string'
    ) {
      return
    }
    if (year && month && today && markDay) {
      today = parseInt(today)
      year = parseInt(year)
      month = parseInt(month)
      markDay = parseInt(markDay)
      let dataObject: Record<string, any> = []
      let weeks = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
      const date = new Date(year, month - 1, markDay)
      let currenWeekDay = date.getDay()
      let d = new Date(date.getTime() - currenWeekDay * 24 * 60 * 60 * 1000)
      let currentDay, currentYear, currentMonth
      if (currentDateTime) {
        const splitTime = currentDateTime.split('-')
        currentYear = parseInt(splitTime[0])
        currentMonth = parseInt(splitTime[1])
        currentDay = parseInt(splitTime[2])
      }
      let todayDate
      pastTimeColor && (
        todayDate = new Date((new Date).getFullYear(), (new Date).getMonth(), (new Date).getDate())
      )
      for (let i = 0; i < 7; i++) {
        let item = {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
          weekDay: weeks[d.getDay()],
          color: color,
          backgroundColor: backgroundColor,
        }
        pastTimeColor && todayDate && (includeToday ? todayDate?.getTime() >= d?.getTime() : todayDate?.getTime() > d?.getTime()) && (
          item.color = pastTimeColor
        )
        !currentDateTime && d?.getDate() == today &&
          (item.color = todayColor) &&
          (item.backgroundColor = todayBackgroundColor)

        currentDateTime && d?.getDate() == currentDay &&
          d.getMonth() + 1 == currentMonth &&
          d.getFullYear() == currentYear &&
          (item.color = todayColor) &&
          (item.backgroundColor = todayBackgroundColor)


        dataObject.push(item)
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
      }
      return dataObject
    }
    return
  },
  /**
   * @function
   * @description Get the next week's date based on the current date
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @returns {Object}
   */
  NextWeek({ year, month, day }) {
    log.debug('test NextWeek2', {
      year: year,
      month: month,
      day: day,
    })
    let date = new Date(year, month - 1, day)
    date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    let res = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
    log.debug('test NextWeek2', res)
    return res
  },
  /**
   * @function
   * @description Get the last week's date based on the current date
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @returns {Object}
   */
  LastWeek({ year, month, day }) {
    log.debug('test lastweek1', {
      year: year,
      month: month,
      day: day,
    })
    let date = new Date(year, month - 1, day)
    date = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    let res = {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
    log.debug('test lastweek2', res)
    return res
  },

  /**
   * @function
   * @description Add a height attribute to each item below the array
   * @param {Array} object
   * @returns {Array}
   */
  AddHeightByTimeSpan({ object }) {
    if (u.isArr(object)) {
      log.debug('test AddHeightByTimeSpan', object)
      // let heights = [30, 40, 50, 60, 70]
      object.forEach((obj) => {
        let span = (parseInt(obj.etime) - parseInt(obj.stime)) / 60
        span = span * 1.5 < 20 ? 20 : span * 1.5
        if (span >= 100) {
          span = 100
        }
        obj.height = span + 'px'
      })
      return object
    }
    return
  },
  /**
   * @function
   * @description The default date format is week month day, year (such as Saturday April 10, 2021)
   * customized to YMD (year, month, day), and place the corresponding year, month,
   * and day according to the position of YMD (such as "YMD" corresponds to "2021 -04-10")
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @param {String} formatType
   * @returns {String}
   */
  ShowRightTime({ year, month, day, formatType = '' }) {
    if (
      typeof year == 'string' ||
      typeof month == 'string' ||
      typeof day == 'string'
    ) {
      return
    }
    if (year && month && day) {
      if (formatType == '' || typeof formatType == undefined) {
        year = parseInt(year)
        month = parseInt(month)
        day = parseInt(day)
        let strTime = year + '-' + month + '-' + day
        let dayStart = new Date(strTime)
        let stime = dayStart.valueOf()
        let eday = year + '-' + month + '-' + (day + 1)
        let etime = new Date(eday).valueOf()
        let s = parseInt(stime.toString().substr(0, 10))
        let e = parseInt(etime.toString().substr(0, 10))
        return [s, e]
      } else if (typeof formatType == 'string') {
        if (day < 10) {
          day = '0' + day
        }
        if (month < 10) {
          month = '0' + month
        }
        formatType.toUpperCase()
        let re = formatType.replace('Y', year)
        re = re.replace('M', month)
        re = re.replace('D', day)

        return re
      }
    }
    return
  },
  /**
   * @function
   * @description The default date format is week month day, year (such as Saturday April 10, 2021)
   * customized to YMD (year, month, day), and place the corresponding year, month,
   * and day according to the position of YMD (such as "YMD" corresponds to "2021 -04-10")
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @param {String} formatType
   * @returns {String}
   */
  ShowLeftTime({ year, month, day, formatType = '' }) {
    if (
      typeof year == 'string' ||
      typeof month == 'string' ||
      typeof day == 'string'
    ) {
      return
    }
    if (year && month && day) {
      if (formatType == '' || typeof formatType == undefined) {
        year = parseInt(year)
        month = parseInt(month)
        day = parseInt(day)
        let strTime = year + '-' + month + '-' + day
        let dayStart = new Date(strTime)
        let stime = dayStart.valueOf()
        let eday = year + '-' + month + '-' + (day + 1)
        let etime = new Date(eday).valueOf()
        let s = parseInt(stime.toString().substring(0, 10))
        let e = parseInt(etime.toString().substr(0, 10))
        return [s, e]
      } else if (typeof formatType == 'string') {
        if (day < 10) {
          day = '0' + day
        }
        if (month < 10) {
          month = '0' + month
        }
        formatType.toUpperCase()
        let re = formatType.replace('Y', year)
        re = re.replace('M', month)
        re = re.replace('D', day)

        return re
      }
    }
    return
  },
  /**
   * @function
   * @description The default date format is week month day, year (such as Saturday April 10, 2021)
   * customized to YMD (year, month, day), and place the corresponding year, month,
   * and day according to the position of YMD (such as "YMD" corresponds to "2021 -04-10")
   * @param {Number} year
   * @param {Number} month
   * @param {Number} day
   * @param {String} formatType
   * @returns {String}
   */
  ShowDateByNumber({ year, month, day, formatType = '', abbreBool = false }) {
    if (store.env === 'test') {
      log.debug('test ShowDateByNumber', { year, month, day })
    }
    year = toNumber(year)
    month = toNumber(month)
    day = toNumber(day)
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day)
    ) {
      return
    }
    if (year && month && day) {
      if (formatType == '' || typeof formatType == undefined) {
        year = parseInt(year)
        month = parseInt(month)
        day = parseInt(day)
        let date = new Date(year, month - 1, day)
        let months = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        let weeks = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ]
        return (
          weeks[date.getDay()] +
          ' ' +
          ((!abbreBool) ? months[month - 1] : (months[month - 1].slice(0, 3))) +
          ' ' +
          day +
          ',' +
          year
        )
      } else if (typeof formatType == 'string') {
        if (day < 10) {
          day = '0' + day
        }
        if (month < 10) {
          month = '0' + month
        }
        formatType.toUpperCase()
        let re = formatType.replace('Y', year)
        re = re.replace('M', month)
        re = re.replace('D', day)

        return re
      }
    }
    return
  },

  /**
   * @function
   * @description Options for generating echart week time chart
   * @param {Array} object
   * @returns {Object}
   */
  TransformWeekDate({ object }) {
    if (u.isArr(object)) {
      log.debug('test TransformWeekDate', object)
      let dataObject: Record<string, any> = []
      object.forEach((obj) => {
        let date = new Date()
        let year = date.getFullYear()
        let month = date.getMonth()
        let day = date.getDay()
        let start_time, end_time
        let workdays = obj.duration.split('-')
        workdays.forEach((d, index) => {
          if (d.indexOf('AM') != -1) {
            d = d.replace('AM', '')
            let split_date = d.split(':')
            let form_date
            if (parseInt(split_date[0]) == 12) {
              form_date = parseInt(split_date[0]) + 12
            } else {
              form_date = parseInt(split_date[0])
            }
            d = form_date + ':' + split_date[1]
          } else if (d.indexOf('PM') != -1) {
            d = d.replace('PM', '')
            let split_date = d.split(':')
            let form_date
            if (parseInt(split_date[0]) == 12) {
              form_date = parseInt(split_date[0])
            } else {
              form_date = parseInt(split_date[0]) + 12
            }
            d = form_date + ':' + split_date[1]
          }

          if (index == 0) {
            start_time = year + '/' + month + '/' + day + ' ' + d
          } else {
            end_time = year + '/' + month + '/' + day + ' ' + d
          }
        })
        let item: any = {
          itemStyle: { normal: { color: '#2988E65f' } },
          value: [],
        }
        item.value[0] = 6 - obj.index
        item.value[1] = start_time
        item.value[2] = end_time
        dataObject.push(item)
      })
      let option = {
        legend: {
          bottom: '1%',
          selectedMode: false,
          textStyle: {
            color: '#000',
          },
        },
        grid: {
          left: '3%',
          right: '3%',
          top: '1%',
          bottom: '10%',
          containLabel: true,
        },
        xAxis: {
          type: 'time',
          interval: 3600 * 1000,
          axisLabel: {
            formatter: function (value) {
              var date = new Date(value)
              if (date.getHours() % 4 == 0) {
                return date.getHours() + ':' + getzf(date.getMinutes())
              }
              return
              function getzf(num) {
                if (parseInt(num) < 10) {
                  num = '0' + num
                }
                return num
              }
            },
          },
        },
        yAxis: {
          data: ['SA', 'FR', 'TH', 'WE', 'TU', 'MO', 'SU'],
        },
        series: [
          {
            type: 'custom',
            renderItem: function (params, api) {
              var categoryIndex = api.value(0)
              var start = api.coord([api.value(1), categoryIndex])
              var end = api.coord([api.value(2), categoryIndex])
              var height = 24
              return {
                type: 'rect',
                //@ts-ignore
                shape: echarts.graphic.clipRectByRect(
                  {
                    x: start[0],
                    y: start[1] - height / 2,
                    width: end[0] - start[0],
                    height: height,
                  },
                  {
                    // 当前坐标系的包围盒。
                    x: params.coordSys.x,
                    y: params.coordSys.y,
                    width: params.coordSys.width,
                    height: params.coordSys.height,
                  },
                ),
                style: api.style(),
              }
            },
            encode: {
              x: [1, 2],
              y: 0,
            },
            data: dataObject,
          },
        ],
      }
      return option
    }
    return
  },
  /**
   * @function
   * @description Convert numeric month to text month
   * @param {Number} month
   * @param {Number} flag
   * @returns {String}
   */
  transformMonth({ month, flag = 1 }) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const monthName = {
      Jan: 1,
      Feb: 2,
      Mar: 3,
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12,
    }

    if (flag == 2) {
      return monthName[month]
    } else {
      return months[month - 1]
    }
  },
  /**
   * @function
   * @description transform year to int type
   * @param {String} year
   * @returns {Number}
   */
  transformYear({ year }) {
    return parseInt(year)
  },
  /**
   * @function
   * @description Get the distance between stime and etime in minutes
   * @param {Number} stime
   * @param {Number} etime
   * @returns {Number}
   */
  getDurationByMinute({ stime, etime }) {
    return (etime - stime) / 60
  },
  /**
   * @function
   * @description Determine whether the current time is within 15 minutes before stime
   * @param {Number} stime
   * @returns {Boolean}
   */
  startMeeting({ stime }) {
    // Temporary notes for test conveniently
    if ((stime - 900) * 1000 <= new Date().getTime()) return true
    return false
  },
  /**
   * @function
   * @description According to the current array, generate the selected time within a week
   * @param {Array} object
   * @returns {Object}
   */
  transformSelectWeek({ object }) {
    if (u.isArr(object)) {
      let selectWeek: Record<string, any> = []
      let addWeek: Record<string, any> = []
      let weeks = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']
      for (let i = 0; i < 7; i++) {
        if (object[i]) {
          if (
            !(
              (Object.keys(object[i]).length === 0 &&
                object[i].constructor === Object) ||
              (object[i].length === 0 && object[i]?.constructor === Array)
            )
          ) {
            selectWeek.push({
              index: i,
              key: weeks[i],
              availableTime: {
                timeStart: '',
                timeEnd: '',
              },
            })
            object[i].forEach((obj) => {
              addWeek.push({
                duration: obj,
                location: '',
                index: i,
                key: weeks[i],
              })
            })
          }

        }

      }
      return {
        selectWeek: selectWeek,
        addWeek: addWeek,
      }
    }
    return
  },
  /**
   * @function
   * @description Determine whether the current parameter is of the specified type
   * @param {any} parameter
   * @param {String} type
   * @returns {Boolean}
   */
  isType({ parameter, type }) {
    log.debug('test isType', {
      parameter: parameter,
      type: type,
    })
    if (typeof parameter == type) {
      return true
    }
    return false
  },
  /**
   * @function
   * @description Get thr month that the current Quarter starts
   * @param {Number} now
   * @returns {Number}
   */
  getQuarterStartMonth(now: number) {
    let quarterStartMonth = 0
    if (new Date(now).getMonth() < 3 || new Date(now).getMonth() == 12) {
      quarterStartMonth = 0
    }
    if (2 < new Date(now).getMonth() && new Date(now).getMonth() < 6) {
      quarterStartMonth = 3
    }
    if (5 < new Date(now).getMonth() && new Date(now).getMonth() < 9) {
      quarterStartMonth = 6
    }
    if (new Date(now).getMonth() > 8) {
      quarterStartMonth = 9
    }
    return quarterStartMonth
  },
  /**
   * @function
   * @description Get the date of the last day of the current week in getTime
   * @param {Number} getTime
   * @returns {Number}
   */
  getWeekEndDate(getTime: number) {
    let now: Date = new Date(getTime)
    let weekEndDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (7 - (now.getDay() === 0 ? 7 : now.getDay())),
    )
    return weekEndDate.valueOf() / 1000
  },
  /**
   * @function
   * @description Get the date of the last day of the current month in getTime
   * @param {Number} getTime
   * @returns {Number}
   */
  getMonthEndDate(getTime: number) {
    let now: Date = new Date(getTime * 1000)
    let monthEndDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      new Date(now.getFullYear(), now.getMonth(), 0).getDate(),
    )
    return monthEndDate.valueOf() / 1000
  },

  /**
   * @function
   * @description Get thr month that the current Quarter ends
   * @param {Number} getTime
   * @returns {Number}
   */
  getQuarterEndDate(getTime: number) {
    let quarterStartMonth = 0
    let now: Date = new Date(getTime * 1000)
    let monthTime: number = new Date(now).getMonth() + 1
    let yearTime: number = now.getFullYear()
    log.debug(monthTime)
    if (monthTime < 3) {
      quarterStartMonth = 0
    }
    if (2 < monthTime && monthTime < 6) {
      quarterStartMonth = 3
    }
    if (5 < monthTime && monthTime < 9) {
      quarterStartMonth = 6
    }
    if (monthTime > 8 && monthTime <= 11) {
      quarterStartMonth = 9
    }
    if (monthTime === 12) {
      quarterStartMonth = 0
      yearTime++
    }
    let quarterEndMonth = quarterStartMonth + 2
    log.debug(quarterStartMonth)
    let quarterStartDate = new Date(
      yearTime,
      quarterEndMonth - 1,
      new Date(now.getFullYear(), quarterEndMonth, 0).getDate(),
    )
    return quarterStartDate.valueOf() / 1000
  },

  /**
   * @function
   * @description Determine startTime is less than endTime
   * @param {Number} startTime
   * @param {Number} endTime
   * @returns {Boolean}
   */
  compareTime({ startTime, endTime }) {
    var date = new Date()
    let stTime = startTime.split(/[A-Z]{2}/)[0].split(':')
    let edTime = endTime.split(/[A-Z]{2}/)[0].split(':')
    return (
      date.setHours(stTime[0], stTime[1]) < date.setHours(edTime[0], edTime[1])
    )
  },
  /**
   * @function
   * @description Determine startTime is less than endTime
   * @param {Number} startTime
   * @param {Number} endTime
   * @returns {Boolean}
   */
  DateCompare({ startTime, endTime }: { startTime: string; endTime: string }) {
    let date: Date = new Date()
    let sEndStr = startTime.substr(-2, 2),
      eEndStr = endTime.substr(-2, 2),
      sTimeArr: string[] = split(
        startTime.substring(0, startTime.length - 2),
        ':',
        2,
      ),
      eTimeArr: string[] = split(
        endTime.substring(0, endTime.length - 2),
        ':',
        2,
      )
    log.debug(eTimeArr, sTimeArr)
    if (sEndStr === eEndStr) {
      if (sEndStr === 'AM') {
        return (
          date.setHours(+sTimeArr[0], +sTimeArr[1]) <
          date.setHours(+eTimeArr[0], +eTimeArr[1])
        )
      } else if (sEndStr === 'PM') {
        return (
          date.setHours(+sTimeArr[0] + 12, +sTimeArr[1]) <
          date.setHours(+eTimeArr[0] + 12, +eTimeArr[1])
        )
      }
    } else if (sEndStr === 'AM' && eEndStr === 'PM') {
      return true
    } else if (sEndStr === 'PM' && eEndStr === 'AM') {
      return false
    }
    return
  },
  /**
   * @function
   * @description Generate an array of years
   * @param {Number} last
   * @param {Number} next
   * @returns {Array}
   */
  generateYear({ last = 30, next = 10 }) {
    let currentYear = new Date().getFullYear()
    let data: any = []
    let startYear = currentYear - last
    for (let i = 0; i < last + next; i++) {
      data.push(startYear.toString())
      startYear++
    }
    return data
  },
  /**
   * @function
   * @description TimeStamp is converted to time similar to 2:00AM
   * @param {Number} timeStamp
   * @returns {String}
   */
  formatData(timeStamp): string {
    timeStamp = timeStamp * 1000
    function formatAMPM(date: Date) {
      let hours = date.getHours()
      let minutes: string | number = date.getMinutes()
      let ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      minutes = minutes < 10 ? '0' + minutes : minutes
      let strTime = hours + ':' + minutes + ' ' + ampm
      return strTime
    }
    if (timeStamp >= new Date(new Date().toLocaleDateString()).getTime()) {
      return formatAMPM(new Date(timeStamp))
    } else {
      return (
        new Date(timeStamp).toDateString().split(' ')[1] +
        '\u0020' +
        new Date(timeStamp).toDateString().split(' ')[2]
      )
    }
  },
  /**
   * @function
   * @description Get the month after the current date
   * @returns {Array}
   */
  getMonthString(): string[] {
    return [
      'December',
      'November',
      'October',
      'September',
      'August',
      'July',
      'June',
      'May',
      'April',
      'March',
      'February',
      'January',
    ].splice(11 - new Date().getMonth(), 12)
  },
  /**
   * @function
   * @description According to the date generation date is similar to month,day,year,hour,minute,AM｜PM
   * @param {Number | String} date
   * @param {String} separator Date dividing line
   * @returns {String}
   */
  formatDataPro({
    date,
    separator,
    retentionOptions = true
  }: {
    date: number | string
    separator: string
    retentionOptions?: boolean
  }) {
    if (date.toString().length === 10) {
      date = +date * 1000
    }
    let dateFormat: Date = new Date(+date);
    let mdyTemp: string = `${dateFormat.toLocaleString('en-US', { month: '2-digit' })}` +
      `${separator}` +
      `${dateFormat.toLocaleString('en-US', { day: '2-digit' })}` +
      `${separator}` +
      `${dateFormat.getFullYear()}`;
    let hmm: string = `${dateFormat.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })}`;
    return (retentionOptions) ? (
      mdyTemp +
      '\u0020' + hmm
    ) : mdyTemp;
  },

  /**
   * @function
   * @description According to date (such as 1998-09-02) to determine whether the current is greater than 18 years old
   * @param {String} date type such as 1998-09-02
   * @returns {Boolean}
   */
  checkUnder18({ date }) {
    let currentDate = new Date().getTime()
    let pastDate = new Date(date).getTime()
    let years = (currentDate - pastDate) / (1000 * 60 * 60 * 24 * 365)
    if (years < 18) return true
    return false
  },

  /**
   * @function
   * @description queryType——judgment type, number type
   * When it is 1, it means to judge whether the current time is within the range of stime greater than timeStart
   * When it is 2, it means to judge whether the current time is less than the range of timeEnd from stime
   * When it is 3, it means to judge whether the current time is in the range greater than timeStart and less than timeEnd from stime
   * stime-appointment time, timestamp type, in seconds
   * timeStart, timeEnd-the unit is minutes, if not required, the default is -1
   * @param {Number} queryType 1|2|3
   * @param {Number} stime
   * @param {Number} timeStart start time
   * @param {Number} timeEnd end time
   * @returns {Boolean}
   */
  timeRange({
    queryType,
    stime,
    timeStart = -1,
    timeEnd = -1,
  }: {
    queryType: number
    stime: number
    timeStart: number
    timeEnd: number
  }) {
    const date = new Date().getTime() / 1000
    if (queryType && stime) {
      switch (queryType) {
        case 1:
          return stime - date > timeStart * 60 ? true : false
          break
        case 2:
          return stime - date < timeEnd * 60 ? true : false
          break
        case 3:
          return stime - date < timeEnd * 60 && stime - date > timeStart * 60
            ? true
            : false
          break
      }
    }
    return
  },
  /**
   * @function
   * @description Judge whether the incoming time overlaps or overlaps with other times
   * @param {object} comTime
   * @param {object[]} pareTime
   * @param {string} timeStart
   * @param {string} timeEnd
   * @param {string} duration
   * @param {string} indexTime
   * @param {string[]} fomatTime
   * @returns {Boolean}
   */
  compareDate(
    { comTime, pareTime,
      timeStart = "availableTime.timeStart",
      timeEnd = "availableTime.timeEnd",
      duration = "duration",
      indexTime = "index",
      fomatTime = ["hh:mm A"]
    }: {
      comTime: { [key in string]: any },
      pareTime: { [key in string]: any }[],
      timeStart?: string,
      timeEnd?: string,
      duration?: string,
      indexTime?: string,
      fomatTime?: string[]
    }
  ): boolean {
    if (!(pareTime && (pareTime as []).length)) {
      return true;
    }
    let sTimeStr: string = get(comTime, timeStart),
      arrayObjFun = (testItem): boolean => {
        let sTimeArrStr: string = (testItem as string).split("-")[0];
        let eTimeArrStr: string = (testItem as string).split("-")[1];
        return new Date(moment(sTimeStr, fomatTime) as any) >= new Date(moment(eTimeArrStr, fomatTime) as any) ||
          new Date(moment(eTimeStr, fomatTime) as any) <= new Date(moment(sTimeArrStr, fomatTime) as any);
      },
      eTimeStr: string = get(comTime, timeEnd);
    return (pareTime as []).every((item) => {
      if (get(comTime, indexTime) === get(item, indexTime)) {
        if (_.isArray(get(item, duration))) {
          return (get(item, duration) as []).every(arrayObjFun)
        } else {
          let getArrItemsTime: string = get(item, duration) as string;
          return arrayObjFun(getArrItemsTime);
        }
      } else {
        return true;
      }
    });

  },
  /**
   * @function
   * @description Judge whether the incoming time overlaps or overlaps with other times
   * @param {void} 
   * @returns {boolean}
   */
  JudgmentOrderTime(): boolean {
    return new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset()
      === new Date(new Date().getFullYear(), 12, 1).getTimezoneOffset() ? false : true;

  },
  /**
   * @function
   * @description get timezone
   * @param {void} 
   * @returns {string}
   */
  getTimezone(): string {

    return Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  /**
 * @function
 * @description Add or modify time intervals
 * @param {string} currentDate
 * @param {number} interval
 * @param {any} unit
 * @returns {object}
 */
  AddOrModifyTimeInterval({
    currentDate,
    interval,
    unit,
  }: {
    currentDate: string;
    interval: number;
    unit: any;
  }) {
    let dateObj = {
      date: "",
      year: 0,
      month: 0,
      day: 0,
    };
    dateObj.date = moment(new Date(currentDate)).add(interval, unit).format("L");
    dateObj.year = new Date(dateObj.date).getFullYear();
    dateObj.month = new Date(dateObj.date).getMonth() + 1;
    dateObj.day = new Date(dateObj.date).getDate();
    return dateObj;
  },
  comTimeStr({ timeStr, split = "/" }: { timeStr: string[], split?: string }): boolean {
    let preTime: string[] = (timeStr[0] as string).split(split) as string[];
    let nextTime: string[] = (timeStr[1] as string).split(split) as string[];
    return new Date(+preTime[2], +preTime[0], +preTime[1]) >= new Date(+nextTime[2], +nextTime[0], +nextTime[1])
  },
  converTimestamp({
    date,
    separatorMDY = "/",
    separatorTime = ",",
    reverse = false
  }: {
    date: number | string
    separatorTime?: string
    separatorMDY?: string
    reverse?: boolean
  }) {
    if (date.toString().length === 10) {
      date = +date * 1000
    }
    let dateFormat: Date = new Date(+date);
    let mdyTemp: string = `${dateFormat.toLocaleString('en-US', { month: '2-digit' })}` +
      `${separatorMDY}` +
      `${dateFormat.toLocaleString('en-US', { day: '2-digit' })}` +
      `${separatorMDY}` +
      `${dateFormat.getFullYear()}`;
    let hmm: string = `${dateFormat.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })}`;
    return (reverse) ? (
      mdyTemp + separatorTime + hmm
    ) : hmm + separatorTime + mdyTemp;
  },
  /**
 * @function
 * @description get number 0f days until today
 * @param {number} dateStamp
 * @returns {string}
 */
  numberFromToday(dateStamp: number) {
    let date = new Date()
    let todayStampStart = Date.parse(date.toLocaleDateString())
    if (dateStamp > todayStampStart) {
      return "Today"
    } else {
      let dateCtime = new Date(dateStamp*1000)
      let year = dateCtime.getFullYear()
      let month = dateCtime.getMonth() + 1
      let day = dateCtime.getDate()
      let dateCtimeStart = Date.parse(year + "/" + month + "/" + day)
      let dayNumber = Math.trunc((todayStampStart - dateCtimeStart) / 1000 / 60 / 60 / 24)
      return dayNumber > 1 ? `${dayNumber} days` : `${dayNumber} day`
    }
  },
  countDown(dateStamp: number) {
    let nowDate = new Date().getTime()
    let endDate = dateStamp + (1000 * 60 * 60 * 24 * 30)
    let countDownDate = (endDate - nowDate) / (1000 * 60 * 60 * 24)
    if (Math.ceil(countDownDate) == 1) return Math.ceil(countDownDate) + ' day'
    else return Math.ceil(countDownDate) + ' days'
  },
  differentFormatsDateSplit({ date }: { date: string }) {
    let splitArr: string[] = []
    if (date) {
      if (date.indexOf('-') !== -1) {
        splitArr = date.split('-');
        splitArr = [splitArr[1], splitArr[2], splitArr[0]]
      }
      if (date.indexOf('/') !== -1) {
        splitArr = date.split('/');
      }
    } else return ['', '', '']
    return splitArr
  },
  multipleDifferentFormatsDateSplit({ dates }: { dates: string[] }) {
    let res: string[][] = []
    dates.forEach(each => {
      res.push(differentFormatsDateSplit(each))
    })
    return res
  },
  handleNonScheduleStime({ stime }: { stime: number }) {
    return stime + ((new Date().getHours() * 60 + new Date().getMinutes()) * 60 + new Date().getSeconds())
  },
  getStartEndStamp({ type }: {
    type: string
  }) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    switch (type) {
      case 'day': {
        return {
          start: start.getTime() / 1000,
          end: end.getTime() / 1000,
        };
      }
      case 'week': {
        return {
          start: start.getTime() / 1000 - 518400,
          end: end.getTime() / 1000,
        };
      }
      case 'month': {
        return {
          start: start.getTime() / 1000 - 2505600,
          end: end.getTime() / 1000,
        };
      }
      default: break
    }
  },
  // 根据年月生成当月的开始时间和结束时间的时间戳
  getStampByYM({ year, month }: { year: string, month: string }): { stime: any, etime: any } {
    return {
      stime: new Date(year + "-" + month + "-" + "1").getTime() / 1000, etime: month === "12" ?
        new Date(`${(+year) + 1}` + "-" + "1" + "-" + "1").getTime() / 1000 :
        new Date(year + "-" + (+month + 1) + "-" + "1").getTime() / 1000
    }
  },
  requireFomatDate({ year, month, day, char = '/' }: { year: number, month: number, day: number, char?: string }) {
    return moment({ year, month: month - 1, day }).format(`MM${char}DD${char}YYYY`)
  },
  getCurrentAge({ dateOfBirth }: { dateOfBirth: string }) {
    return isNaN(new Date(dateOfBirth) as any) ? "" : moment().diff(moment(dateOfBirth, 'MM/DD/YYYY', true), 'years');
  },
  compareTimestampWithInterval({ timestamp, intervalInDays, unit }: { timestamp: number, intervalInDays: number, unit: moment.unitOfTime.Diff }) {
    const inputTimestamp = moment.unix(timestamp);
    const currentTimestamp = moment();
    const differenceInDays = currentTimestamp.diff(inputTimestamp, unit);
    return differenceInDays <= intervalInDays;
  },
  getDateObject({ dateStr }: { dateStr: string }) {
    return {
      year: moment(dateStr).year(),
      month: moment(dateStr).month() + 1, 
      day: moment(dateStr).date()
    }
  },
  //  获取今天的日期 格式为 MM/DD/YYYY
  getTodayDate() {
    console.log(moment().format('MM/DD/YYYY'));
    
    return moment().format('MM/DD/YYYY')
  },
  // 获取指定日期前一天的日期 格式为 MM/DD/YYYY
  getYesterdayDate({ date }: { date: string }) {
    return moment(date, 'MM/DD/YYYY').subtract(1, 'days').format('MM/DD/YYYY')
  },
  //获取指定日期后一天的日期 格式为 MM/DD/YYYY
  getTomorrowDate({ date }: { date: string }) {
    log.error(date);
    
    return moment(date, 'MM/DD/YYYY').add(1, 'days').format('MM/DD/YYYY')
  },
  /**
   * "05/06/2024 9:45 AM" format => timestamp
   * @param time 
   * @returns 
   */
  getTimeStampWithTime({time}:{time:string}){
    const dateSplit = time.split(" ")
    const dateFormat = dateSplit[0]
    const timeFormat = dateSplit[1]
    const meridiem = dateFormat[2]
    if(dateFormat && timeFormat && meridiem){
      const [month, day, year] = dateFormat.split('/')
      const [hour, minute] = timeFormat.split(':')
      let newHour = parseInt(hour)
      if (meridiem === 'PM') {
        newHour = newHour + 12
      }
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), newHour, parseInt(minute), 0, 0)
      const timestamp = Math.ceil(date.getTime() / 1000)
      return timestamp
    }
  }
}
