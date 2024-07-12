import inRange from 'lodash/inRange'
import log from '../../utils/log'
import { isString } from 'lodash'

export default {
  /**
   * @function
   * @description Judge whether the incoming value is within a certain interval (including both ends)
   * @param {number} number
   * @param {number} start
   * @param {number} end
   * @returns {boolean}
   *
   */
  inRange({
    number,
    start,
    end,
  }: {
    number: number
    start: number
    end: number
  }): boolean {
    if (number == start || number == end) {
      return true
    }
    return inRange(number, start, end)
  },
  /**
   * @function
   * @description Multiply two numbers
   * @param {number} number
   * @param {number} multiple
   * @returns {number}
   */
  multiply({ number, multiple }: { number: number; multiple: number }): number {
    if (number && multiple) {
      return number * multiple
    }
    return 0
  },
  /**
   * @function
   * @description Convert numbers to binary
   * @param {number} number
   * @returns {0|string}
   */
  OctToBin({ number }: { number: number }) {
    if (number) {
      return number.toString(2).toString()
    }
    return 0
  },
  /**
   * @function
   * @description Convert the subtype to hexadecimal, and obtain the type and level of authority
   * @param {any[]} authSubtype
   * @param {object} authList
   * @returns {object}
   */
  getAuthority({
    authSubtype,
    authList,
  }: {
    authSubtype: any[]
    authList: {}
  }) {
    let authDoc: any = {}
    if (authSubtype) {
      authSubtype.forEach((item: number) => {
        /***
         * convert subtype to Hex , get the authority type ,and the  authority level
         * authority level： '1 1 1' --> 'invite edit review'
         *  */
        let authHex: number = parseInt(item.toString(16)) // convert decimal to hexadecimal
        let authType: number = parseInt((authHex / 10000).toString()) // get authority type from High Bit , and authority level low bit
        let authLevel: number = authHex % 10
        let authName: string = ''
        // convert authority level to object
        let authBinary = authLevel.toString(2).split('')
        let resArray = authBinary.map((item) => {
          return item === '1' ? true : false
        })
        Object.keys(authList).forEach((key: any) => {
          if (authList[key] == authType) {
            authName = key
          }
        })
        authDoc[authName] = {
          invite: resArray[0],
          edit: resArray[1],
          review: resArray[2],
        }
      })
    }
    return authDoc
  },
  /**
   * @function
   * @description Parses strings into numbers and adds them
   * @param {string} num
   * @param {string} step
   * @returns {void}
   */
  addition({ num, step }: { num: any; step: any }) {
		log.debug('test addition', {
      num: num,
      step: step,
    })
    if(typeof step === "string" && step.includes(",")) step = step?.replaceAll(",","");
    if(typeof num === "string" && num.includes(",")) num = num?.replaceAll(",","");
    num = parseFloat(num)
    step = parseFloat(step)
    return num + step
  },
  /**
   * @function
   * @description Parses a string into numbers and subtracts them
   * @param {string} num
   * @param {string} step
   * @returns {void}
   */
  Subtraction({ num, step }: { num: any; step: any }) {
    if(typeof step === "string" && step.includes(",")) step = step?.replaceAll(",","");
    if(typeof num === "string" && num.includes(",")) num = num?.replaceAll(",","");
    num = parseFloat(num)
    step = parseFloat(step)
    return num - step
  },
  /**
   * @function
   * @description Number comparison size
   * @param {number} num1
   * @param {number} num2
   * @returns {void}
   */
  less({ num1, num2 }: { num1: number|string; num2: number|string }) {
    if(typeof num1 === "string" && num1.includes(",")) num1 = num1?.replaceAll(",","");
    if(typeof num2 === "string" && num2.includes(",")) num2 = num2?.replaceAll(",","");
    if (+num1 < +num2) return true
    else return false
  },
  /**
   * @function
   * @description Converts a number to hexadecimal and changes a specific position to 0 or 1
   * @param {number} intHex
   * @param {number} index
   * @param {number} hex
   * @returns {number}
   */
  inhx({
    intHex,
    index,
    hex,
  }: {
    intHex: number
    index: number
    hex: number
  }): number {
    if (typeof intHex === 'string') intHex = parseInt(intHex)
    if (((intHex >> (index - 1)) & 1) !== hex) {
      if (hex === 1) {
        intHex += Math.pow(2, index - 1)
      } else {
        intHex -= Math.pow(2, index - 1)
      }
      return intHex
    } else {
      return intHex
    }
  },
  /**
   * @function
   * @description Two phase and
   * @param {number} intOne
   * @param {number} hexTwo
   * @returns {number}
   */
  hexAnd({ intOne, hexTwo }: { intOne: number; hexTwo: number }) {
    return intOne & hexTwo
  },
  /**
   * @function
   * @description Two phase or
   * @param {number} intOne
   * @param {number} hexTwo
   * @returns {number}
   */
  hexOr({ intOne, hexTwo }: { intOne: number; hexTwo: number }) {
    return intOne | hexTwo
  },
  /**
   * @function
   * @description The hexadecimal digits are obtained according to the 0 or 1 position with the same characteristics,
   * and input into the array to return
   * @param {any[]} docGroup
   * @param {number[]} localArr
   * @param {number[]} binaryArr
   * @returns {false|number[]}
   */
  hx({
    docGroup,
    localArr,
    binaryArr,
  }: {
    docGroup: any[]
    localArr: number[]
    binaryArr: number[]
  }) {
    if (localArr.length === binaryArr.length) {
      let equals: any
      let pushArr: number[] = []
      for (let index = 0; index < docGroup.length; index++) {
        equals = 0
        for (let j = 0; j < localArr.length; j++) {
          if (
            ((docGroup[index].type >> (localArr[j] - 1)) & 1) ===
            binaryArr[j]
          ) {
            equals++
          } else {
            break
          }
        }
        if (equals === localArr.length) {
          pushArr.push(docGroup[index])
        }
      }
      return pushArr
    }
    return false
  },
  /**
   * @function
   * @description Check the data integrity of a single form
   * @param {number} docType
   * @param {number[]} localArr
   * @param {number[]} binaryArr
   * @returns {boolean}
   */
  typeIsValid({
    docType,
    localArr,
    binaryArr,
  }: {
    docType: number
    localArr: number[]
    binaryArr: number[]
  }) {
    if (localArr.length === binaryArr.length) {
      let equals: any
      equals = 0
      for (let j = 0; j < localArr.length; j++) {
        if (((docType >> (localArr[j] - 1)) & 1) === binaryArr[j]) {
          equals++
        } else {
          break
        }
      }
      return equals === binaryArr.length ? true : false
    }
    return false
  },
  typeIsValidOne({
    docType,
    localArr,
    binaryArr,
  }: {
    docType: number
    localArr: number[]
    binaryArr: number[]
  }) {
    if (localArr.length === binaryArr.length) {
      let equals: any
      equals = 0
      for (let j = 0; j < localArr.length; j++) {
        if (((docType >> (localArr[j] - 1)) & 1) === binaryArr[j]) {
          return true
        }
      }
      return false
    }
    return false
  },

  /**
   * @function
   * @description Data integrity of the submitted object form
   * @param {object} docData
   * @returns {boolean}
   */
  formValid({ docData }: { docData: {} }): boolean {
    for (const key in docData) {
      if (docData.hasOwnProperty(key)) {
        if (docData[key] === null || docData[key] === '') {
          return false
        }
      }
    }
    return true
  },

  /**
   * @function
   * @description Replace the value of the given subtype. E8 -> E2 subtype = 196616 addition = 2 return 196610
   * @param {any} subtype
   * @param {number} addition
   * @returns {number}
   */
  transformSubtype({ subtype, addition }: { subtype: any; addition: number }) {
    if (subtype && addition) {
      subtype = parseInt(subtype)
      let _subtype = subtype & 0xff
      let newSubtype = subtype - _subtype + addition
      return newSubtype
    }
    return 0
  },
  /**
   * @function
   * @description Is it a number
   * @param {number} num
   * @returns {boolean}
   */
  judgeNumber({ num }: { num: any }): boolean {
    if(typeof num === "string" && num.includes(",")) num = num?.replaceAll(",","");
    return /^(\-|\+)?\d+(.\d+)?$/.test(num)
  },
  /**
   * @function
   * @description Take the integer part that divides two numbers
   * @param {string|number} value1
   * @param {string|number} value2
   * @returns {number}
   */
  pagingFax({value1,value2} : {value1 : any,value2 : any}):number{
    let num1 = parseInt(value1)
    let num2 = parseInt(value2)
    let res =  Math.ceil(num1 / num2)
    // 保持page从第1页开始
    return res === 0 ? 1 : res
  },
  betweenTwoNumbers(
      { figure, hexadecimal, compareArr }:
        {
          figure: number, hexadecimal: number, compareArr: number[]
        }): boolean {
      return (compareArr.includes((figure & hexadecimal))) ? true : false;
  },
  ceilDivision({ num1, num2 }: { num1: number|string, num2: number|string }){
    return Math.ceil(+num1 / +num2)
  }
  
}
