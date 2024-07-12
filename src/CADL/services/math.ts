import isArray from 'lodash/isArray'
import log from '../../utils/log'
import get from 'lodash/get'
import set from 'lodash/set'

export default {
  /**
   * @function
   * @description Returns a random number between 0 (inclusive) and 1 (exclusive)
   * @param {void}
   * @returns {number}
   *
   */
  random: function () {
    const rand = Math.random()
    return rand
  },
  /**
   * @function
   * @description Returns the Sum of two numbers
   * @param {number} num1
   * @param {number} num2
   * @returns {number}
   *
   */
  add: function ({ num1, num2 }: { num1: number|string; num2: number|string }): number {
    if(typeof num1 === "string" && num1.includes(",")) num1 = num1?.replaceAll(",","");
    if(typeof num2 === "string" && num2.includes(",")) num2 = num2?.replaceAll(",","");
    return +num1 + +num2
  },
  /**
   * @function
   * @description Judge the relationship between two numbers
   * @param {number} num1
   * @param {number} num2
   * @returns {boolean}
   *
   */
  greater: function ({ num1, num2 }: { num1: number|string; num2: number|string }): boolean {
    if(typeof num1 === "string" && num1.includes(",")) num1 = num1?.replaceAll(",","");
    if(typeof num2 === "string" && num2.includes(",")) num2 = num2?.replaceAll(",","");
    return +num1 >= +num2
  },
  /**
   * @function
   * @description Whether the folder size exceeds the judgment
   * @param {number} object
   * @param {number} key
   * @returns {boolean}
   *
   */
  lessthanSize: function ({
    object,
    key,
  }: {
    object: {}
    key: number
  }): boolean {
    let objectSize: string = object['size']
    if (parseFloat(objectSize).toString() !== 'NaN') {
      let maxSize: number = Math.floor(key * Math.pow(1024, 2))
      return parseFloat(objectSize) > maxSize ? false : true
    }
    return false
  },
  /**
   * @function
   * @description Array summation
   * @param {number[]} numArr
   * @returns {number}
   */
  cumulative: function ({ numArr }: { numArr: (number|string)[] }): number {
    
    let total = 0
    for (let i = 0; i < numArr.length; i++) {
      if(typeof numArr[i] === "string" && (numArr[i] as string).includes(",")) numArr[i] = (numArr[i] as string).replaceAll(",","");
      if(numArr[i]!== "NaN" && !Number.isNaN(numArr[i])) total = total + +(numArr[i])
    }
    return total
  },
  /**
   * @function
   * @description Keep two decimal places
   * @param {number[]} numArr
   * @returns {number}
   */
  toFixedNum({ num }: { num: number | string }) {
    if(typeof num === "string" && num.includes(",")) num = num?.replaceAll(",","");
    log.debug((+num).toFixed(2))
    return (+num).toFixed(2)
  },

  /**
   * @function
   * @description Judge whether the number is two decimal places
   * @param {number|string} num
   * @returns {boolean}
   */
  FixedLimit({ num }: { num: number | string }): boolean {
    return String(num).length - String(num).indexOf('.') - 1 === 2
      ? true
      : false
  },
  /**
   * @function
   * @description Age based on birth
   * @param {string} dateTime
   * @param {string} splite
   * @returns {number}
   */
  calculateAge({
    dateTime,
    splite = '/',
  }: {
    dateTime: string
    splite?: string
  }) {
    let date = new Date()
    let birthday: string[] = dateTime.split(splite)
    let today = [date.getMonth() + 1, date.getDate(), date.getFullYear()]
    let age = today.map((value, index) => {
      return value - +birthday[index]
    })
    if (age[1] < 0) {
      let lastMonth = new Date(today[2], today[0], 0)
      age[0]--
      age[1] += lastMonth.getDate()
    }
    if (age[0] < 0) {
      age[2]--
      age[0] += 12
    }
    return age[2]
  },
  maxFun({ arrNum }: { arrNum: number[] }): number {
    return Math.max(...arrNum)
  },
  calculateBmi({
    heightFt,
    heightIn,
    weight,
  }: {
    heightFt: string | number
    heightIn: string | number
    weight: string | number
  }) {
    if(!(heightFt&&weight))return '';
    if(!heightIn)heightIn = 0;
    let result = (
      (+weight * 703) /
      Math.pow(+heightFt * 12 + +heightIn, 2)
    ).toFixed(2)
    if (!['NaN', '0.00'].includes(result)) {
      return result
    }
  },
  mod({num1,num2}:{num1: string | number,num2: string | number }){
    return (+num1 % +num2)
  },
  multiplication({num1,num2}:{num1: string | number,num2: string | number }){
    return (+num1 * +num2).toFixed(2)
  },
  greaterThan({ num1, num2 }: { num1: number|string; num2: number|string }): boolean {
    return +num1 > +num2
  },
  isNaN({arr}:{arr: []}){
    return arr.some(item => Number.isNaN(item))
  },
  calInnerArray({array,path,innerPath,outputPath}:{array:{}[],path:string,innerPath:string,outputPath:string}){
    if(isArray(array)){
      return array.map(eachItem => {
        const innerArray = get(eachItem,path)
        let title:number = 0
        innerArray.forEach(eachInner => {
          title += (+(get(eachInner,innerPath)?get(eachInner,innerPath):0))
        });
        set(eachItem,outputPath,`${title}`)
        return eachItem
      });
    }
    return array
  }
}
