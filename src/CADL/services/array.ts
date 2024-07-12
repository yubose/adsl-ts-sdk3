import * as u from '@jsmanifest/utils'
import type { ReferenceString } from 'noodl-types'
import chunk from 'lodash/chunk'
import get from 'lodash/get'
import set from 'lodash/set'
import has from 'lodash/has'
import join from 'lodash/join'
import cloneDeep from 'lodash/cloneDeep'
import orderBy from 'lodash/orderBy'
import isArray from 'lodash/isArray'
import sortBy from 'lodash/sortBy'
import uniqBy from 'lodash/uniqBy'
import round from 'lodash/round'
import store from '../../common/store'
import isEmpty from 'lodash/isEmpty'
import log from '../../utils/log'
import isEqual from 'lodash/isEqual'
import findIndex from 'lodash/findIndex'
import filter from 'lodash/filter'
import uniq from 'lodash/uniq'
import max from 'lodash/max'
import {differenceWith, find, findKey, flattenDeep, intersection } from 'lodash'
import * as c from '../../constants'
import { getPropertyPath } from '../utils'
import { isBooleanFalse } from '../../utils/common'
import object from './object'
// import object from './object'
type connection = {
    name: string
    category: string
    userId: string
    phone: string
    favorite: boolean
    connectId: string
    status: string
}
//@ts-ignore
type provider = {
    name: string
    NPI: string
    address: string
    providerId: string
}
type index = {
    key: number
    fontColor: string
    backgroundColor: string
}

type productItem = {
    id: string;
    title: string;
    type: string;
    coverImgId: string;
    price: string;
    status: string
    tage: number
}

export default {
    /**
     * @function
     * @description Adding elements to an array
     * @param {array}
     * @returns {void}
     */
    add({ object, value }: { object: any[]; value: any }) {
        if (u.isArr(object)) {
            if (value) {
                var cloned = cloneDeep(value)
                object.push(cloned)
            }
            return
        }
        return
    },
    /**
     * @function
     * @description Adds a record to the array at the specified subscript position
     * @param {array} object
     * @param {any} value
     * @param {string} index
     * @returns {void}
     */
    addByIndex({
        object,
        value,
        index,
    }: {
        object: any[]
        value: any
        index: string
    }) {
        if (u.isArr(object)) {
            if (value) {
                var cloned = cloneDeep(value)
                if (
                    object[parseInt(index)] == null ||
                    (Object.keys(object[parseInt(index)]).length === 0 &&
                        object[parseInt(index)]?.constructor === Object)
                ) {
                    let item_1 = new Array()
                    item_1.push(cloned)
                    object[parseInt(index)] = item_1
                } else {
                    let item_2 = object[parseInt(index)]
                    item_2.push(cloned)
                    object[parseInt(index)] = item_2
                }
            }
            return
        }
        return
    },
    /**
     * @function
     * @description Sorts the array according to the specified rule
     * @param {array} object
     * @param {any} iterate
     * @param {array} orders
     * @returns {array|string}}
     */
    SortBy({
        object,
        iterate,
        orders,
    }: {
        object: any[]
        iterate: any
        orders: any[]
    }) {
        if (u.isArr(object)) {
            return orderBy(object, iterate, orders)
        }
        return 'object is not array'
    },

    /**
     * @function
     * @description Empty array
     * @param {array} object
     * @returns {void}
     */
    clear({ object }: { object: any[] }) {
        if (u.isArr(object)) {
            object.length = 0
        }
        return
    },
    /**
     * @function
     * @description Find the attribute value corresponding to the key of
     * an item in the ARR, which is equal to the passed in key,
     * and delete it
     * @param {array} object
     * @param {string} key
     * @returns {void}
     */
    removeByKey({ object, key }: { object: { [key in string] }[]; key: string }) {
        //the format of the array must be [ man: man]  man： man
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i]?.key === key) {
                    // TO DO: how to handle objects with same key? should they all be deleted, or just delete first one?
                    // Should duplicate object key made not allowed using add method?
                    object.splice(i, 1)
                    return
                } else {
                    if (store.env === 'test') {
                    }
                }
            }
        }
        return
    },
    /**
     * @function
     * @description If the attribute value of a key attribute in the
     * array object is equal to the passed in name or the attribute
     * value of the key attribute is empty, the item will be deleted;
     * otherwise, 'false' and 'color: Red' will be output
     * @param {array} object
     * @param {string} key
     * @param {string} name
     * @returns {void}
     */
    removeByName({
        object,
        key,
        name,
    }: {
        object: { [key in string] }[]
        key: string
        name: string
    }) {
        //the format of the array must be [ man: man]  man： man
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i]?.[key] == name || object[i]?.[key] == '') {
                    // TO DO: how to handle objects with same key? should they all be deleted, or just delete first one?
                    // Should duplicate object key made not allowed using add method?
                    object.splice(i, 1)
                    return
                } else {
                    if (store.env === 'test') {
                    }
                }
            }
        }
        return
    },
    /**
     * @function
     * @description Delete the item in the array equal to the value passed in
     * @param {array} object
     * @param {string} value
     * @returns {void}
     */
    removeByValue({
        object,
        value,
    }: {
        object: number | string[]
        value: string | number
    }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i] == value) {
                    // TO DO: how to handle objects with same key? should they all be deleted, or just delete first one?
                    // Should duplicate object key made not allowed using add method?
                    value !== 'Select' && object.splice(i, 1)
                    return
                }
            }
        }
        return
    },
    /**
     * @function
     * @description Delete the item in the object array equal to the value passed in.
     * @param {array} object
     * @param {string} value
     * @param {string} values
     * @returns {void}
     */
    removeObjectByValue({
        object,
        values,
        value,
    }: {
        object: {}[]
        values: string
        value: string
    }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (get(object[i], values) == value) {
                    // TO DO: how to handle objects with same key? should they all be deleted, or just delete first one?
                    // Should duplicate object key made not allowed using add method?
                    object.splice(i, 1)
                    return
                }
            }
        }
        return
    },
    /**
     * @function
     * @description Find that the attribute value corresponding to the ID of an item
     * in the array is equal to the passed in ID, and delete the item
     * @param {array} object
     * @param {string} id
     * @returns {void}
     */
    removeById({ object, id }: { object: { [key in string] }[]; id: string }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i]?.id == id) {
                    // TO DO: how to handle objects with same key? should they all be deleted, or just delete first one?
                    // Should duplicate object key made not allowed using add method?
                    object.splice(i, 1)
                    return
                }
            }
        }
        return
    },
    /**
     * object (Array|Object): The collection used for iteration.
     * index: one index of array
     * @function
     * @description Delete the index item of the array
     * @param {array} object
     * @param {number} index
     * @returns {void}
     */
    removeByIndex({ object, index }: { object: any[]; index: number }) {
        if (u.isArr(object)) {
            object.splice(index, 1)
            return
        }
        return
    },
    /**
     * @description Find that the attribute value corresponding to the attribute
     * name index of an item in array object1 is equal to the passed in index value,
     * and the attribute value corresponding to the attribute name duration of the item is
     * equal to the passed in duration. Delete it from the array.
     * If the time of index item in array object2 is equal to duration, the index item
     * of array object2 will be deleted
     * @function
     * @param {array} object1
     * @param {array} object2
     * @param {string} duration
     * @param {number} index
     * @returns {void}
     */

    removeWeekByIndexs({
        object1,
        object2,
        index,
        duration,
    }: {
        object1: { [key in string] }[]
        object2: { [key in string] }[]
        index: string | number
        duration: string | number
    }) {
        //Functions used to make specific pages
        if (u.isArr(object1) && u.isArr(object2)) {
            for (let i = 0; i < object1.length; i++) {
                if (object1[i]?.index === index && object1[i]?.duration === duration) {
                    object1.splice(i, 1)
                } else {
                    if (store.env === 'test') {
                    }
                }
            }

            for (let i = 0; i < object2[index]?.length; i++) {
                if (object2[index]?.[i] === duration) {
                    object2[index] = null
                } else {
                    if (store.env === 'test') {
                    }
                }
            }
            return
        }
        return
    },

    /**
     *
     * @function
     * @description Recursively copies a value (which can be an object) and passes it into an array
     * @param {array} messages
     * @param {any} newMessage
     * @returns {void}
     */
    append({ newMessage, messages }: { newMessage: any; messages: any[] }) {
        if (u.isArr(messages)) {
            if (newMessage) {
                var cloned = cloneDeep(newMessage)
                messages.push(cloned)
            }
        }
        return
    },
    /**
     * @description reverse the array, 反转数组
     * @param param0
     * @returns
     */
    reverse({ array }: { array: Array<any> }) {
        return array.reverse()
    },
    /**
     * 在源数组前方插入
     * @param param0
     * @returns
     */
    unshift({
        originArray,
        newArray,
    }: {
        originArray: Array<any>
        newArray: Array<any>
    }) {
        return originArray.unshift(newArray)
    },
    /**
     *
     * @function
     * @description Recursively copy a value into the array, invert the array and highlight the first item
     * @param {array} messages
     * @param {object} newMessage
     * @param {string} uniqueKey
     * @param {string} currentBackgroundColor
     * @param {string} backgroundColor
     * @param {string} fontColor
     * @param {string} currentFontColor
     * @returns {void}
     */
    appendUnique({
        newMessage,
        messages,
        uniqueKey,
        currentBackgroundColor,
        backgroundColor,
        fontColor,
        currentFontColor,
    }: {
        newMessage: { [key in string] }
        messages: any[]
        uniqueKey: string
        currentBackgroundColor: string
        backgroundColor: string
        fontColor: string
        currentFontColor: string
    }) {
        // if (u.isArr(messages)) {
        if (newMessage && uniqueKey) {
            let flag = false
            messages.forEach((message) => {
                if (message[uniqueKey] == newMessage[uniqueKey]) {
                    flag = true
                }
            })
            if (!flag) {
                var cloned = cloneDeep(newMessage)
                messages.push(cloned)
            }
            //reverse
            for (let j = 0; j < messages.length / 2; j++) {
                let tmp = messages[j]
                messages[j] = messages[messages.length - j - 1]
                messages[messages.length - j - 1] = tmp
            }
            //add color
            for (let i = 0; i < messages.length; i++) {
                if (i == 0) {
                    messages[i]['backgroundColor'] = currentBackgroundColor
                    messages[i]['fontColor'] = currentFontColor
                } else {
                    messages[i]['backgroundColor'] = backgroundColor
                    messages[i]['fontColor'] = fontColor
                }
            }
        }
        // }
        // return
    },
    /**
     *
     * @function
     * @description Change the background color and font color of the trigger event.
     * @param {array} messages
     * @param {string} id
     * @param {string} currentBackgroundColor
     * @param {string} backgroundColor
     * @param {string} fontColor
     * @param {string} currentFontColor
     * @returns {void}
     */
    addColor({
        messages,
        id,
        currentBackgroundColor,
        backgroundColor,
        fontColor,
        currentFontColor,
    }: {
        messages: any[]
        id: string
        currentBackgroundColor: string
        backgroundColor: string
        fontColor: string
        currentFontColor: string
    }) {
        if (u.isArr(messages)) {
            for (let i = 0; i < messages.length; i++) {
                if (messages[i]?.['id'] == id) {
                    messages[i]['backgroundColor'] = currentBackgroundColor
                    messages[i]['fontColor'] = currentFontColor
                } else {
                    messages[i]['backgroundColor'] = backgroundColor
                    messages[i]['fontColor'] = fontColor
                }
            }
        }
        return messages
    },
    /**
     *
     * @function
     * @description Determine whether there is value in the array
     * @param {array} object
     * @param {string} value
     * @returns {boolean}
     */
    has({ object, value }: { object: []; value: string | number }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i] === value) {
                    return true
                }
            }
        }
        return false
    },
    /**
     *
     * @function
     * @description Determine whether the array length is a certain value
     * @param {array} array
     * @param {number} len
     * @returns {boolean}
     */
    judgeListLength({ array, len }: { array: []; len: number|string }): boolean {
        if(u.isStr(len)) len = parseInt(len)
        return Array.isArray(array) && array.length === len
    },
    /**
     *
     * @function
     * @description Judge whether the value of the key attribute of an item in the array is equal to key
     * @param {array} object
     * @param {string} key
     * @returns {boolean}
     */
    hasKey({ object, key }: { object: { [key in string] }[]; key: string }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (object[i]?.key === key || object[i][key]) {
                    return true
                }
            }
        }
        return false
    },
    /**
     *
     * @function
     * @description Spell the last four parameters into objects and add them to the array
     * @param {array} object
     * @param {string} key
     * @param {string} duration
     * @param {string} location
     * @param {string} index
     * @param {string} key
     * @returns {void}
     */
    AddWeek({
        object,
        duration,
        location,
        index,
        key,
    }: {
        object: { [key in string] }[]
        duration: string
        location: string
        index: string | number
        key: string
    }) {
        if (typeof index == undefined) {
            log.debug('index is undefined')
            return
        }
        if (typeof key == undefined) {
            log.debug('key is undefined')
            return
        }
        if (typeof duration == undefined) {
            log.debug('duration is undefined')
            return
        }
        // if (u.isArr(object)) {
        var arr = { duration: duration, location: location, index: index, key: key }
        object[object.length] = arr
        return
        // }
        // return
    },
    /**
     *
     * @function
     * @description After a value is copied deeply, it is added to the array header
     * @param {array} messages
     * @param {any} newMessage
     * @returns {void|array}
     */
    push({ newMessage, messages }: { newMessage: any; messages: any[] }) {
        if (u.isArr(messages)) {
            if (newMessage) {
                var cloned = cloneDeep(newMessage)
                messages.unshift(cloned)
                return messages
            }
            return messages
        }
        return
    },
    pushAny({
        newMessage,
        messages,
    }: {
        newMessage: any
        messages: any[]
    }): any[] {
        if (u.isArr(messages)) {
            if (newMessage) {
                let cloned = cloneDeep(newMessage)
                let messagesClone: any[] = cloneDeep(messages)
                isArray(cloned)
                    ? messagesClone.push(...cloned)
                    : messagesClone.push(cloned)
                return messagesClone
            }
            return messages
        }
        return []
    },
    /**
     *
     * @function
     * @description Convert each item of the array into an object {key: 'xxx'} and put it in a new array
     * convert ["anemia", "anxiety", "arthritis"] to [{key: "anemia"},{key: "anxiety"},
     * {key: "arthritis"}] for listObject
     * @param {array} array
     * @returns {string|array}
     */
    covertToJsonArray({ array }: { array: any[] }) {
        let dataObject: Record<string, any> = []
        if (u.isArr(array)) {
            for (let i = 0; i < array.length; i++) {
                dataObject.push({ key: array[i] })
            }
            console.dir(dataObject)
            return dataObject
        }
        return `${array}is not an array`
    },
    /**
     *
     * @function
     * @description get the length of array
     * @param {array} object
     * @returns {string}
     */
    getListLength({ object }: { object: any[] }) {
        if (u.isArr(object)) {
            return object?.length?.toString()
        }
        return '0'
    },
    /**
     *
     * @function
     * @description Add an item with array1.key equal to the passed in value key to array2 through the passed in value key
     * @param {array} array1
     * @param {array} array2
     * @param {string} key
     * @returns {array}
     */
    copyByKey({
        array1,
        array2,
        key,
    }: {
        array1: { [key in string]: any }[]
        array2: { [key in string]: any }[]
        key: any
    }) {
        if (u.isArr(array1) && u.isArr(array2)) {
            for (let i = 0; i < array1.length; i++) {
                if (array1[i]?.key === key) {
                    array2.push(array1[i])
                    return array2
                }
            }
        }
        return array2
    },
    /**
     *
     * @function
     * @description The passed in value is key. The value of the key attribute of
     * an item in the array is equal to the
     * passed in key value. Change the color attribute of this item
     * @param {array} array1
     * @param {string} value
     * @param {string} key
     * @returns {void}
     */
    changeColorByKey({
        array,
        key,
        value,
    }: {
        array: { [key in string]: any }[]
        key: any
        value: any
    }) {
        if (u.isArr(array)) {
            if (key) {
                for (let i = 0; i < array.length; i++) {
                    if (array[i]?.key === key) {
                        array[i].color = value
                        return
                    }
                }
            }
            return
        }
        return
    },
    /**
     *
     * @function
     * @description According to the passed in value key, put the value of an
     * item in the array whose key is equal to key into a new array and return
     * @param {array} array
     * @param {string} key
     * @returns {void | array}
     */
    convertToList({
        array,
        key,
    }: {
        array: { [key in string]: any }[]
        key: string
    }) {
        let array1: string[] = []
        if (u.isArr(array)) {
            if (key) {
                for (let i = 0; i < array.length; i++) {
                    array1.push(array[i]?.[key])
                }
                return array1
            }
            return
        }
        return
    },
    /**
     *
     * @function
     * @description According to the passed key1 and value values, if the key1 attribute of an item
     * in the array is equal to value, the attribute value corresponding to the key2 of the item is returned
     * @param {array} array
     * @param {string} value
     * @param {string} key1
     * @param {string} key2
     *
     * @returns {any}
     */
    getByKey({
        array,
        key1,
        value,
        key2,
    }: {
        array: { [key in string]: any }[]
        key1: string
        value: any
        key2: string
    }) {
        const _array = cloneDeep(array)
        if (u.isArr(_array)) {
            for (let i = 0; i < _array.length; i++) {
                if (_array[i]?.[key1] === value) {
                    return _array[i]?.[key2]
                }
            }
            return ''
        }
        return ''
    },
    /**
     *
     * @function
     * @description Gets the subscript of an element of the array
     * @param {array} array
     * @param {string} key
     * @returns {number | void}
     */
    getIndex({ array, key }: { array: any[]; key: any }) {
        if (u.isArr(array)) {
            return array.indexOf(key)
        }
        return
    },
    /**
     *
     * @function
     * @description Gets an item in the object array and encapsulates it into an array to return
     * @param {array} array
     * @param {string} keyId
     * @returns {array | void}
     */
    getListByKey({
        array,
        keyId,
    }: {
        array: { [key in string]: any }[]
        keyId: string
    }) {
        let resultArr: any[] = []        
        if (u.isArr(array)) {
            for (let i = 0; i < array.length; i++) {
                resultArr.push(array[i]?.[keyId])
            }
            return resultArr
        }
        return
    },
    /**
     *
     * @function
     * @description Get encapsulated connection
     * @param {array} array1
     * @param {array} array2
     * @returns {array}
     */
    getConnection({ array1, array2 }: { array1: any; array2: any }) {
        let arrayItem: connection
        let array: connection[] = []
        let favorite1: boolean
        if (typeof array1 == 'string' || typeof array2 == 'string') {
            if (u.isArr(array1)) {
                array1.forEach((arr) => {
                    if (arr?.['subtype'] == 5 || arr?.['subtype'] == 4) favorite1 = true
                    else favorite1 = false
                    arrayItem = {
                        name: arr?.['name']?.['inviterName'],
                        category: arr?.['name']?.['inviterCategory'],
                        userId: arr?.['evid'],
                        phone: arr?.['name']?.['inviterPhoneNumber'],
                        favorite: favorite1,
                        connectId: arr?.['id'],
                        //@ts-ignore
                        status: arr?.['name']?.['status'],
                    }
                    array.push(arrayItem)
                })
                return array
            } else if (u.isArr(array2)) {
                array2.forEach((arr) => {
                    if (arr?.['subtype'] == 5 || arr?.['subtype'] == 3) favorite1 = true
                    else favorite1 = false
                    arrayItem = {
                        name: arr?.['name']?.['inviteeName'],
                        category: arr?.['name']?.['inviteeCategory'],
                        userId: arr?.['bvid'],
                        phone: arr?.['name']?.['inviteePhoneNumber'],
                        favorite: favorite1,
                        connectId: arr?.['id'],
                        //@ts-ignore
                        status: arr?.['name']?.['status'],
                    }
                    array.push(arrayItem)
                })
                return array
            } else {
                return []
            }
        } else {
            array1.forEach((arr) => {
                if (arr?.['subtype'] == 5 || arr?.['subtype'] == 4) favorite1 = true
                else favorite1 = false
                arrayItem = {
                    name: arr?.['name']?.['inviterName'],
                    category: arr?.['name']?.['inviterCategory'],
                    userId: arr?.['evid'],
                    phone: arr?.['name']?.['inviterPhoneNumber'],
                    favorite: favorite1,
                    connectId: arr?.['id'],
                    //@ts-ignore
                    status: arr?.['name']?.['status'],
                }
                array.push(arrayItem)
            })
            array2.forEach((arr) => {
                if (arr?.['subtype'] == 5 || arr?.['subtype'] == 3) favorite1 = true
                else favorite1 = false
                arrayItem = {
                    name: arr?.['name']?.['inviteeName'],
                    category: arr?.['name']?.['inviteeCategory'],
                    userId: arr?.['bvid'],
                    phone: arr?.['name']?.['inviteePhoneNumber'],
                    favorite: favorite1,
                    connectId: arr?.['id'],
                    //@ts-ignore
                    status: arr?.['name']?.['status'],
                }
                array.push(arrayItem)
            })
            return array
        }
    },
    /**
     *
     * @function
     * @description If the favorite attribute value of an item in the array is true,
     * the item will be added to the result array
     * @param {array} object
     * @returns {array}
     */
    getFavorites({ object }: { object: { [key in string]: any }[] }) {
        let result: any[] = []
        if (u.isArr(object)) {
            object.forEach((arr) => {
                if (arr?.['favorite'] == true) {
                    result.push(arr)
                }
            })
        }
        return result
    },
    /**
     *
     * @function
     * @description Gets the first element of the array
     * @param {array} array
     * @returns {any}
     */
    getFirstItem({ array }: { array: any[] }) {
        if (u.isArr(array)) {
            return array[0]
        }
    },
    /**
     *
     * @function
     * @description Combine two arrays and sort
     * sortby: Select the character to sort
     * orders: Designated as "desc" in descending order, designated as "asc" in ascending order
     * @param {array} array2
     * @param {array} array1
     * @param {string} sortby
     * @param {string} orders
     * @returns {any}
     */
    concatArray({
        array1,
        array2,
        sortby,
        orders,
    }: {
        array1: any[]
        array2: any[]
        sortby: any
        orders: any
    }) {
        if (u.isArr(array1) && u.isArr(array2)) {
            if (sortby) {
                let arr = array1.concat(array2)
                if (orders) {
                    return orderBy(arr, sortby, orders)
                } else {
                    return orderBy(arr, sortby, 'desc')
                }
            }
            return array1.concat(array2)
        }

        if (u.isArr(array1) && !u.isArr(array2)) return array1
        if (u.isArr(array2) && !u.isArr(array1)) return array2
        return []
    },
    /**
     *
     * @function
     * @description Determine whether the array has phonenumber
     * @param {array} array
     * @param {string} phoneNumber
     * @returns {boolean}
     */
    isExist({
        array,
        phoneNumber,
    }: {
        array: { [key in string]: any }[]
        phoneNumber: any
    }) {
        let flag = 0
        if (u.isArr(array)) {
            array.forEach((arr) => {
                if (phoneNumber === arr['name']?.['data']?.['phone']) {
                    flag = 1
                    return
                }
            })
            if (flag === 1) return true
            else return false
        }
        return false
    },
    /**
     *
     * @function
     * @description Create the edge corresponding to the subtype according to the subtypelist array
     * @param {array} subtypelist
     * @param {array} createModel
     * @returns {void}
     */
    async createBySubtype({
        subtypelist,
        createModel,
    }: {
        subtypelist: any[]
        createModel: any
    }) {
        log.debug('test createBySubtype', {
            subtypelist: subtypelist,
            createModel: createModel,
        })
        if (u.isArr(subtypelist)) {
            for (const element of subtypelist) {
                createModel && (createModel['subtype'] = element)
                try {
                    if (store.env === 'test') {
                        log.info(
                            '%cCreate Edge Request',
                            'background: purple; color: white; display: block;',
                            { ...createModel },
                        )
                    }

                    const { data } = await store.level2SDK.edgeServices.createEdge({
                        ...createModel,
                    })
                    if (store.env === 'test') {
                        log.info(
                            '%cCreate Edge Response',
                            'background: purple; color: white; display: block;',
                            data,
                        )
                    }
                } catch (error) {
                    throw error
                }
            }
        }

        // return "test"
    },
    /**
     *
     * @function
     * @description Convert the weekly time period in the original array into a string.
     * If it is empty, it is not settings
     * @param {array} planObject
     * @returns {array | void}
     */
    WeekSchedule({ planObject }: { planObject: any }) {
        if (store._env == 'test') {
            log.debug('test WeekSchedule', planObject)
        }
        if (
            planObject == null ||
            typeof planObject == undefined ||
            planObject.length == 0
        ) {
            return
        }
        if (u.isArr(planObject)) {
            let res: Record<string, any> = []
            let len = 0
            let weeks = [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
            ]
            for (let i = 0; i < 7; i++) {
                if (Object.keys(planObject[i] || {}).length == 0) {
                    res.push({
                        info: ['No Settings'],
                        weekDay: weeks[i],
                    })
                } else {
                    len = planObject[i].length
                    let info: any = []
                    for (let j = 0; j < len; j++) {
                        info.push(planObject[i]?.[j])
                    }
                    res.push({
                        info: info,
                        weekDay: weeks[i],
                    })
                }
            }
            return res
        }
        return
    },
    /**
     *
     * @function
     * @description Splice two arrays
     * @param {array} array1
     * @param {array} array2
     * @returns {array | void}
     */
    concat({ array1, array2 }: { array1: any[]; array2: any[] }) {
        if (u.isArr(array1) && u.isArr(array2)) {
            return array1.concat(array2)
        }
        return
    },
    /**
     *
     * @function
     * @description Returns a bsig value based on the user name
     * @param {array} array
     * @param {string} userName
     * @returns {string | void}
     */
    getIdByUserName({
        array,
        userName,
    }: {
        array: { [key in string]: any }[]
        userName: AnalyserNode
    }) {
        let id = ''
        if (u.isArr(array)) {
            array.forEach((arr) => {
                if (arr?.['name']?.['data']?.['fullName'] === userName) {
                    id = arr?.['bsig']
                    return
                }
            })
            return id
        }
        return
    },

    /**
     * @function
     * @description According to the key as the attribute name, find the item
     * whose attribute value corresponding to the key value of an item in the
     * original array is equal to the attribute value corresponding to the key
     * value of an item in the subobject, and delete the item from the original array
     * @param {array} parentObject Remove elements from this object
     * @param {array} subObject Delete elements based on this object
     * @param {string} key Determine whether the key is duplicate
     * @returns {array | void}
     */
    removeByArray({
        parentObject,
        subObject,
        key,
    }: {
        parentObject: {}[]
        subObject: {}[]
        key: string
    }) {
        if (u.isArr(parentObject) && u.isArr(subObject)) {
            for (let i = 0; i < subObject.length; i++) {
                for (let j = 0; j < parentObject.length; j++) {
                    if (parentObject[j]?.[key] === subObject[i]?.[key]) {
                        parentObject.splice(j, 1)
                        j--
                    }
                }
            }
            return parentObject
        }
        return
    },

    /**
     *
     * @function
     * @description If an object in the array has a key attribute and the attribute
     * exists on the instance, set the attribute value corresponding to the key
     * attribute of the item to flag
     * @param {array} object Modify the state of a field of this object
     * @param {string} key This is the field in the object, modify the state
     * @param {string} flag The state about to be modified true or false     true|false
     * @returns {void}
     *
     */
    toggleStatus({
        object,
        key,
        flag,
    }: {
        object: {}[]
        key: string
        flag: any
    }) {
        if (u.isArr(object)) {
            object.forEach((obj) => {
                // if (obj.hasOwnProperty(key)) {
                obj[key] = flag
                // }
            })
        }
    },
    /**
     *
     * @function
     * @description If an object in the array has a key attribute and the attribute
     * exists on the instance, set the attribute value corresponding to the key
     * attribute of the item to flag
     * @param {array} object Modify the state of a field of this object
     * @param {string} key This is the field in the object, modify the state
     * @param {string} flag The state about to be modified true or false     true|false
     * @returns {void}
     *
     */
    toggleSelect({
        object,
        key,
        value,
        newKey,
        flag,
        type,
    }: {
        object: {}[]
        key: string
        value: string
        newKey: string
        flag: boolean
        type: 'Radio' | 'Multi'
    }) {
        if (u.isArr(object)) {
            object.forEach((obj) => {
                if (type === 'Multi') {
                    if (obj[key] === value) {
                        obj[newKey] = flag
                    }
                } else {
                    if (obj[key] === value) {
                        obj[newKey] = flag
                    } else {
                        obj[newKey] = !flag
                    }
                }
            })
        }
    },
    /**
     * @function
     * @description To achieve paging effect, divide the array according to pagecount,
     * get the data, and then put it into a new array; After getting multiple such arrays,
     * put them into the result array
     * @param {array} array
     * @param {number} pageCount
     * @param {number} currentPage
     * @returns {array}
     */
    getPage({
        array,
        pageCount,
        currentPage,
    }: {
        array: any[]
        pageCount: number
        currentPage: number
    }) {
        let pageList: any[] = []
        if (u.isArr(array) && array) {
            let pageSum = Math.ceil(array.length / pageCount)
            for (let i = 1; i <= pageSum; i++) {
                let currentPage = (i - 1) * pageCount
                let pageListItem: any[] = []
                for (let j = currentPage; j < currentPage + pageCount; j++) {
                    if (array[j] === undefined) break
                    pageListItem.push(array[j])
                }
                pageList.push(pageListItem)
            }
        }
        return pageList[currentPage - 1]
    },
    /**
     * @function
     * @description Encapsulate the array through index
     * @param {array} array
     * @param {number} pageCount
     * @param {number} currentPage
     * @param {any|} select
     * @returns {array}
     */
    getPageIndex({
        array,
        pageCount,
        currentPage,
        select,
    }: {
        array: any[]
        pageCount: number
        currentPage: number
        select: any
    }) {
        let indexList = Array.from(
            new Array(Math.ceil(array.length / pageCount) + 1).keys(),
        ).slice(1)
        let index = chunk(indexList, pageCount)
        let indexGroup: index[] = []
        index[currentPage - 1].forEach((arr) => {
            let indexItem: index = {
                key: 0,
                fontColor: '0x000000',
                backgroundColor: '0xFFFFFF',
            }
            if (select === arr) {
                indexItem.fontColor = '0xFFFFFF'
                indexItem.backgroundColor = '#003d68'
            }
            indexItem.key = arr
            indexGroup.push(indexItem)
        })
        return indexGroup
    },
    elementUnique({ arr }: { arr: string[] }): string[] {
        return Array.from(new Set(arr))
    },
    addProvider({ object, provider }: { object: any[]; provider: {} }) {
        set(provider, 'name.basicInfo', { medicalFacilityName: 'Me' })
        set(provider, 'isSelected', true)
        let cloned = cloneDeep(provider)
        object.push(cloned)
        return
    },
    /**
     * @function
     * @description According to the number and time of the current edge,
     * the increase or decrease of the current data is calculated under the corresponding
     * time span and corresponding time range
     * @param {array}  Object : Data to be processed
     * @param {number} timeLimit : Display the amount of data
     * @param {number} timeSpan : Process data based on month, week, and day
     * @param {string} increaseColor : Color when the rate of increase is positive
     * @param {string} decreaseColor : Color when the rate of increase is negative
     * @returns {array}
     */
    handleData({
        Object,
        timeLimit = 10,
        timeSpan = 'day',
        increaseColor = '0x3DD598',
        decreaseColor = '0xF0142F',
    }: {
        Object: any[]
        timeLimit: number
        timeSpan: string
        increaseColor: string
        decreaseColor: string
    }) {
        if (u.isArr(Object)) {
            let time = 24 * 60 * 60 * 1000
            if (timeSpan == 'day') {
                time = 1 * time
            } else if (timeSpan == 'week') {
                time = 7 * time
            } else if (timeSpan == 'month') {
                time = 30 * time
            }
            let data_x: Record<string, any> = []
            let data_y: Record<string, any> = []
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sept',
                'Oct',
                'Nov',
                'Dec',
            ]
            let date = new Date()
            // hard code
            for (let i = 0; i < timeLimit; i++) {
                let ctime, etime, name
                if (timeSpan == 'day') {
                    ctime = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                    ).getTime()
                    etime = ctime + 24 * 60 * 60 * 1000
                    name =
                        new Date(ctime).getFullYear() +
                        '-' +
                        new Date(ctime).getMonth() +
                        '-' +
                        new Date(ctime).getDate()
                } else if (timeSpan == 'week') {
                    let d = new Date(date.getTime() - date.getDay() * 24 * 60 * 60 * 1000)
                    ctime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
                    etime = ctime + 7 * 24 * 60 * 60 * 1000
                    name =
                        new Date(ctime).getFullYear() +
                        '-' +
                        new Date(ctime).getMonth() +
                        '-' +
                        date.getDate()
                } else if (timeSpan == 'month') {
                    let d = new Date(
                        date.getTime() - (date.getDate() - 1) * 24 * 60 * 60 * 1000,
                    )
                    ctime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
                    let d2 = new Date(d.getFullYear(), d.getMonth(), 0)
                    let currentdays = d2.getDate()
                    etime = ctime + currentdays * 24 * 60 * 60 * 1000
                    name =
                        new Date(ctime).getFullYear() +
                        '-' +
                        months[new Date(ctime).getMonth()]
                }
                let count = 0
                Object.forEach((obj) => {
                    if (obj.ctime * 1000 > ctime && obj.ctime * 1000 < etime) {
                        count = count + 1
                    }
                })
                data_x.push(name)
                data_y.push(count)
                date = new Date(date.getTime() - time)
            }
            let currentNum = data_y[0]
            let currentRadio
            if (data_y[1] != 0) {
                currentRadio = (data_y[0] / data_y[1] - 1) * 100
            } else {
                currentRadio = 0
            }
            let color, radioString
            if (currentRadio >= 0) {
                radioString = currentRadio.toFixed(2) + '%' + ' ↑'
                color = increaseColor
            } else {
                radioString = (-currentRadio).toFixed(2) + '%' + ' ↓'
                color = decreaseColor
            }
            log.debug({
                currentNum: currentNum,
                currentRadio: currentRadio.toFixed(2),
                radioString: radioString,
                color: color,
            })
            // Returned data format
            return {
                currentNum: currentNum,
                currentRadio: currentRadio.toFixed(2),
                radioString: radioString,
                color: color,
                data_x: data_x,
                data_y: data_y,
            }
        }
        return
    },
    /**
     * @function
     * @description If the length of the character array of all attributes
     * of an item in array object is 0, the item will be left blank.
     * @param {array} dayObject
     * @returns {void}
     */
    transformNull({ dayObject }: { dayObject: any[] }) {
        if (u.isArr(dayObject)) {
            for (let i = 0; i < dayObject.length; i++) {
                if (Object.keys(dayObject[i]).length == 0) {
                    dayObject[i] = null
                }
            }
        }
    },
    /**
     * @function
     * @description Judge the number of elements in the array that are undefined,
     *  empty or 0 in length; If the number is greater than or equal to 7,
     * return true; otherwise, return false
     * @param {array} array
     * @returns {boolean}
     */
    isEmpty({ array }: { array: any[] }) {
        let it = 0
        array.forEach((element) => {
            if (
                typeof element == undefined ||
                element == null ||
                element.length == 0
            ) {
                it++
            }
        })
        if (it >= 7) return true
        else return false
    },
    /**
     * @function
     * @description Select the attribute values corresponding to the keys of all
     * items in the ARR and put them into the new array
     * @param {array} arr
     * @param {string} key
     * @returns {array}
     */
    selectOneToArr({ arr, key }: { arr: any[]; key: string }) {
        if (arr && !u.isArr(arr)) arr = [arr]
        let arr1: Array<any> = new Array()
        for (let i = 0; i < arr.length; i++) {
            if (get(arr[i], key)) {
                const newValue = get(arr[i], key)
                arr1.push(newValue)
            }
        }
        return arr1
    },
    /**
     * @function
     * @description If the value corresponding to the key attribute of an item
     * in the array is equal to the value passed in, the value corresponding
     * to key1 of the item is returned
     * @param {array} arr
     * @param {string} key
     * @param {string} value
     * @param {string} key1
     * @returns {string}
     */
    matchInArray({
        arr,
        value,
        key,
        key1,
    }: {
        arr: {}[]
        value: any
        key: string
        key1: string
    }) {
        !u.isArr(arr) && (arr = u.array(arr))
        for (let i = 0; i < arr.length; i++) {
            const newValue = get(arr[i], key)
            if (newValue === value) return get(arr[i], key1)
        }
        return null
    },
    /**
     * @function
     * @description Convert to a string and add parentheses
     * @param {any} arr
     * @returns {string}
     */
    toString({ arr }: { arr: any[] }) {
        return u.isFnc(arr?.toString) ? arr.toString() : String(arr)
    },

    /**
     * @function
     * @description select key from array
     * @param {array} array
     * @param {string} path  path to key
     * @returns {array|void}
     */
    getKeyByArray({ array, path }: { array: any[]; path: string }) {
        if (u.isArr(array) && path) {
            let items = path.split('.')
            let res: any[] = []
            array.forEach((element) => {
                let key = element
                items.forEach((item) => {
                    key = key?.[item]
                })
                res.push(key)
            })
            return res
        }
        return
    },
    /**
     * @function
     * @description Query a key with the same value in the object array
     * ?Whether to consider multiple identical matches？
     * @param {array} array  => object array to select
     * @param {string} matchPath => path of matching key
     * @param {string} selectpath => path of selecting path
     * @param {string} value => match value
     * @returns {string}
     */
    SelectKeyByArray({
        array,
        matchPath,
        selectpath,
        value,
    }: {
        array: any[]
        matchPath: string
        selectpath: string
        value: any
    }) {
        if (u.isArr(array) && matchPath && selectpath && value) {
            let matchItems = matchPath.split('.')
            let selectItems = selectpath.split('.')
            array.forEach((element) => {
                let matchKey = element
                matchItems.forEach((item) => {
                    matchKey = matchKey?.[item]
                })

                if (matchKey == value) {
                    let selectKey = element
                    selectItems.forEach((item) => {
                        selectKey = matchKey?.[item]
                    })
                    return selectKey
                }
                return
            })
            // return res
        }
        return
    },
    /**
     * @function
     * @description Add a deep clone to the array and return
     * @param {array} array
     * @returns {array}
     */
    addSelect({ array }: { array: any[] }) {
        let _array = cloneDeep(array)
        _array.unshift('please select')
        return _array
    },
    /**
     * @function
     * @description Returns an object with the same value as value in the object array
     * @param {array} array
     * @param {string} key
     * @param {string} value
     * @returns {void}
     */
    getObjectByArray({
        array,
        key,
        value,
    }: {
        array: {}[]
        key: string
        value: any
    }) {
        !u.isArr(array) && (array = u.array(array))
        for (let i = 0; i < array.length; i++) {
            if (get(array[i], key) == value) return array[i]
        }
        return null
    },
    /**
     * @function
     * @description Query whether the array object exists in the object according to the array object and the incoming path.
     * If it exists, return true; otherwise, return false
     * @param {array} objArr
     * @param {string | number} values
     * @returns {boolean}
     */
    checkElememtExist({
        objArr,
        values,
    }: {
        objArr: {}[]
        values: string | number
    }): boolean {
        let bool: boolean[] = []
        u.array(objArr).forEach((obj) => {
            let arrLast: (number | string)[] = []
                ; (function deepObj(obj: {}) {
                    for (let items in obj) {
                        typeof obj[items] === 'number' || typeof obj[items] === 'string'
                            ? arrLast.push(obj[items])
                            : deepObj(obj[items])
                    }
                })(obj)
            bool.push(arrLast.includes(values) ? true : false)
        })
        return bool.includes(true) ? true : false
    },

    /**
     * @function
     * @description The original array is segmented according to the passed in number NumX,
     * and the numy item of the segmented array and the total segmented length are returned
     * according to the passed in number numy
     * @param {array} arrObj arrObj: array object
     * @param {number} numX numX: according this number splilt array
     * @param {number} numY numY: current page number
     * @returns
     */
    splitTableList({
        arrObj,
        numX,
        numY,
    }: {
        arrObj: { [key: string]: {} }[]
        numX: number
        numY: number
    }): (({ [key: string]: {} } | number)[] | number)[] {
        let len: number = chunk(arrObj, numX).length
        // if the length = 0 , array[0] will return undenfin
        if (len === 0) {
            return [[], 1]
        } else {
            let arr: ({ [key: string]: {} } | number)[] = chunk(arrObj, numX)[
                numY - 1
            ],
                arrT: (({ [key: string]: {} } | number)[] | number)[] = []
            len = len === 0 ? 1: len
            arrT.push(arr, len)
            return arrT
        }
    },
    /**
     * @function
     * @description Determine whether the array is empty
     * @param {array} array
     * @returns {boolean}
     *
     */
    isArrayEmpty({ array = [] }: { array: any[] }): boolean {
        if (array.length === 0) {
            return true
        }
        return false
    },

    /**
     * @function
     * @description Generate the corresponding page name according to the title of the doc
     * @param {array} array: Array to be processed
     * @param {string} type : 'Edit' | 'Review' | 'Preview'
     * @param {string} dataKey : path of key such as "name.title"
     * @returns array｜[]
     */
    transformPage({
        array,
        type,
        dataKey,
    }: {
        array: any
        type: 'Edit' | 'Review' | 'Preview'
        dataKey: string
    }) {
        let mapping = {
            'New Patient Forms': 'NewPatForm',
            'COVID-19 Testing Consent - New Patient': 'Cov19TestNewPat',
            'COVID-19 Testing Consent Form': 'Cov19TestForm',
            'Pifzer-BioNTech Vaccine - First Dose': 'PfizerVaccineFirDose',
            'Pifzer-BioNTech Vaccine - Second Dose': 'PfizerVaccineSecDose',
            'Pfizer-BioNTech Vaccine - First Dose': 'PfizerVaccineFirDose',
            'Pfizer-BioNTech Vaccine - Second Dose': 'PfizerVaccineSecDose',
            'Moderna Vaccine Form - First Dose': 'ModernaVaccineFirDose',
            'Moderna Vaccine Form - Second Dose': 'ModernaVaccineSecDose',
            'Flu Vaccination Consent form 2020-2021(English)':
                'FluVaccinationConsentFormEnglish',
            'Surgery Authorization': 'SurgeryAuthorization',
            'Financial Responsibility form': 'FinancialForm',
            'Flu Vaccination Consent Form': 'FluVaccinationConsentForm',
            'Patient Consent Form - HIPPA': 'PatientConsentForm',
            'RPM Revised Patient Consent': 'RPMRevisedPatientConsent',
        }
        let title
        let space
        if (u.isArr(array)) {
            array.forEach((obj: any) => {
                title = get(obj, dataKey)
                if (title) {
                    title = title.trim()
                    space = title.split(' ')
                    if (space.length != 1) {
                        obj.pageName = `${mapping[title] + '' + type + 'Page1'}`
                    } else {
                        obj.pageName = `${title + '' + type + 'Page1'}`
                    }
                }
            })
            return array
        }
        return []
    },
    /**
     * @function
     * @description Converted to array to object array
     * @param {array} array
     * @returns {array}
     */
    transformArray({ array }: { array: any[] }) {
        let res: any = []
        if (u.isArr(array)) {
            array.forEach((arr) => {
                res.push({
                    key: arr,
                })
            })
            return res
        }
        return []
    },
    /**
     * @function
     * @description According to one of the passed in array objects and the corresponding path,
     * change the key value of an item of the object with the same attribute key value in
     * the other array to the passed in newvalue
     * @param {array} objArrOne
     * @param {array} objArrTwo
     * @param {string} strOnePath
     * @param {string} strTwoPath
     * @param {string} strValue
     * @param {any} newValue
     * @returns {array}
     */
    ComparisonSettingProperties({
        objArrOne = [],
        strOnePath,
        objArrTwo = [],
        strTwoPath,
        strValue,
        newValue,
        status = 'status',
    }: {
        objArrOne: any[]
        strOnePath: string
        objArrTwo: any[]
        strTwoPath: string
        strValue: string | number
        newValue?: any
        status?: string
    }): {}[] {
        objArrOne.forEach((eleOne) => {
            objArrTwo.forEach((eleTwo) => {
                if (get(eleOne, strOnePath) === get(eleTwo, strTwoPath)) {
                    set(eleTwo, strValue, newValue ? newValue : get(eleOne, status))
                }
            })
        })
        return objArrTwo
    },
    /**
     * @function
     * @description The passed in object array is de duplicated according to the path parameter
     * @param {array} objArr
     * @param {string} path
     * @returns {array}
     */
    uniqueByObjectKey({ objArr, path }: { objArr: {}[]; path: string }): {}[] {
        return uniqBy(objArr, path)
    },
    /**
     *
     * @function
     * @description  stringArr include any item of array1, if include , return false, else return true
     * @param {array} stringArr
     * @returns  {boolean} true | false
     */
    allComplete(stringArr: string[]): boolean {
        let array1 = ['', 'Select', '-- --', 'State']
        let result = true
        if (u.isArr(stringArr)) {
            result = array1.some((val) => {
                return stringArr.includes(val)
            })
        }
        return !result
    },
    /**
     *
     * @function
     * @description  For the incoming character array and character delimiter,
     * perform splicing processing, and return the processed results
     * @param {array} strArr
     * @param {string} sfill
     * @returns  {string}
     */
    formatStringFill({
        strArr = [],
        sfill,
    }: {
        strArr: any
        sfill: string
    }): string {
        if (Array.isArray(strArr)) {
            return strArr
                .filter((start) => {
                    if (start) return start
                })
                .join(sfill)
        }
        return ''
    },
    /**
     *
     * @function
     * @description  According to the passed in array object, compare whether the value
     * corresponding to the key is equal to the passed in value. If yes, return true,
     * and if no, return false
     * @param {array} arrObject
     * @param {any} value
     * @param {string} keyAtl
     * @returns  {boolean}
     */
    findSelectAtl({
        arrObject,
        value,
        keyAtl,
    }: {
        arrObject: object[]
        value: any
        keyAtl: string
    }): boolean {
        return arrObject.some((element) => {
            return element?.[keyAtl] === value
        })
    },
    /**
     *
     * @function
     * @description  The passed in array is filtered by tags
     * @param {array} sourceDoc
     * @param {string} tagCategory
     * @param {string} tagName
     * @returns  {array}
     */
    filterByTag({
        sourceDoc,
        tagCategory,
        tagName,
    }: {
        sourceDoc: object[]
        tagCategory: string
        tagName: string
    }) {
        let result: any[] = []
        if (tagName === 'All') {
            return sourceDoc
        }
        sourceDoc.forEach((itemDoc, index) => {
            if (itemDoc == undefined) {
                log.warn('array.filterTag itemDoc is undefined')
                return
            } else if (itemDoc?.['name'] == undefined) {
                log.warn('array.filterByTag itemDoc.name is underfined')
                return
            } else if (itemDoc?.['name']?.['data'] == undefined) {
                log.warn('array.filterByTag itemDoc.name.data is underfined')
                return
            } else if (itemDoc?.['name']?.['data'][tagCategory] == undefined) {
                log.warn('array.filterByTag itemDoc.name.data.tag is underfined')
                return
            } else if (
                itemDoc?.['name']?.['data']?.[tagCategory]?.['name'] === tagName ||
                (itemDoc?.['name']?.['data']?.[tagCategory]?.['name'] === 'Private' &&
                    tagName === 'Unfinished') ||
                (itemDoc?.['name']?.['data']?.[tagCategory]?.['name'] === 'Released' &&
                    tagName === 'Complete')
            ) {
                result.push(itemDoc)
            }
        })
        return result
    },
    /**
     *
     * @function
     * @description  Some attribute values when initializing the meeting, such as boxshadow and bordercolor
     * @param {array} sourceEdgeList
     * @returns  {array}
     */
    initMeetingStyle({ sourceEdgeList }: { sourceEdgeList: any[] }) {
        let _sourceEdgeList = cloneDeep(sourceEdgeList)
        if (u.isArr(_sourceEdgeList)) {
            _sourceEdgeList.forEach((sourceEdge) => {
                if (sourceEdge?.tage || sourceEdge?.tage == 0) {
                    set(sourceEdge, 'name.statusStyle', {
                        border: 'none',
                    })
                    if (((sourceEdge.tage >> 1) & 1) === 0) {
                        set(sourceEdge, 'name.statusStyle', {
                            border: '1px solid #fb5051',
                        })
                    } else {
                        if (get(sourceEdge, 'name.fee') != '0.00') {
                            if (((sourceEdge.tage >> 5) & 1) === 1) {
                                set(sourceEdge, 'name.statusStyle', {
                                    border: 'none',
                                })
                            } else if (((sourceEdge.tage >> 4) & 1) === 0) {
                                set(sourceEdge, 'name.statusStyle', {
                                    border: '1px solid #fb5051',
                                })
                            }
                        } else {
                            set(sourceEdge, 'name.statusStyle', {
                                border: 'none',
                            })
                        }
                        if ((sourceEdge.tage & 0x4) === 0x4) {
                            set(sourceEdge, 'name.statusStyle', {
                                border: 'none',
                            })
                        }
                    }
                }
            })
        }
        return _sourceEdgeList
    },
    /**
     *
     * @function
     * @description  Filter the array by passing in the path
     * @param {array} objArr
     * @param {string} path
     * @param {string[]} compareStr
     * @returns  {array}
     */
    filterArrayByPath({
        objArr,
        path,
        compareStr = [],
    }: {
        objArr: any[]
        path: string
        compareStr: string[]
    }) {
        let arrCom: { [x: string]: any }[] = []
        objArr?.forEach((objItem: { [key in string]: any }[]) => {
            if (compareStr.includes(get(objItem, path))) {
                arrCom.push(objItem)
            }
        })
        return arrCom
    },
    /**
     *
     * @function
     * @description  Compare the passed key1 value with value, and then return the value under the key2 path
     * @param {array} array
     * @param {string} key1
     * @param {string} value
     * @param {string} key2
     * @returns  {string}
     */
    getValueByKey({
        array,
        key1,
        value,
        key2,
    }: {
        array: {}[]
        key1: string
        value: string
        key2: string
    }) {
        const _array = cloneDeep(array)
        if (u.isArr(_array)) {
            for (let i = 0; i < _array.length; i++) {
                if (get(_array[i], key1) == value) {
                    return get(_array[i], key2)
                }
            }
            return
        }
        return
    },
    /**
     *
     * @function
     * @description  Judge whether value is odd or even according to the passed in object array and path, and add 1 to the even number
     * @param {array} objArr
     * @param {string} path
     * @returns  {array}
     */
    checkType({ objArr, path }: { objArr: {}[]; path: string }): {}[] {
        objArr.forEach((element) => {
            if (get(element, path) % 2 === 0) {
                set(element, path, get(element, path) + 1)
            }
        })
        return objArr
    },
    /**
     *
     * @function
     * @description  Get the information of the selected time and encapsulate the bit group to return
     * @param {array} objArr
     * @param {number} index
     * @param {string} strPath
     * @param {string} key
     * @param {string} location
     * @returns  {array}
     */
    addWeekDuration({
        objArr,
        index,
        strPath,
        key,
        location,
    }: {
        objArr: {}[]
        index: number
        strPath: string
        key: string
        location: string
    }): {}[] {
        if (objArr.length === 0) {
            objArr.push({ duration: [strPath], key: key, index: index })
            return objArr
        }
        for (let i = 0; i < objArr.length; i++) {
            if (objArr[i]?.['index'] === index) {
                objArr[i]['duration'].push(strPath)
                objArr[i]['key'] = key
                objArr[i]['location'] = location
                objArr[i]['index'] = index
                return objArr
            }
        }
        objArr.push({ duration: [strPath], key: key, index: index })
        return objArr
    },
    /**
     *
     * @function
     * @description  remove Value In Double List
     * @param {array} objArr
     * @param {number | string} value
     * @param {string} key
     * @param {array} objArr1
     * @returns  {undefined}
     */
    removeValueInDoubleList({
        objArr,
        value,
        key,
        objArr1,
        index,
    }: {
        objArr: any[]
        value: string | number
        key: string
        objArr1: any[]
        index: number
    }) {
        for (let i = 0; i < objArr[index]?.[key].length; i++) {
            if (objArr[index]?.[key]?.[i] == value) {
                objArr[index][key].splice(i, 1)
                if (objArr1[objArr[index]['index']]?.length) {
                    objArr1[objArr[index]['index']].splice(i, 1)
                    if (!objArr1[objArr[index]['index']].length)
                        objArr1[objArr[index]['index']] = null
                }
                if (objArr[index][key].length == 0) objArr.splice(index, 1)
                return
            }
        }
    },
    /**
     *
     * @function
     * @description  Format date and time
     * @param {array} arr
     * @param {string} indexParam
     * @param {string} keyParam
     * @param {string} strParam
     * @returns  {array}
     */
    formaDuration({
        arr,
        indexParam,
        keyParam,
        strParam,
    }: {
        arr: ((string | number)[] | object)[]
        indexParam: string
        keyParam: string
        strParam: string
    }) {
        let objArr: {}[] = []
        let strWeek: string[] = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ]
        if (arr.length) {
            arr.forEach((items, index) => {
                if (u.isArr(items)) {
                    objArr[index] = {}
                    set(objArr[index], strParam, items)
                    set(objArr[index], indexParam, index)
                    set(objArr[index], keyParam, strWeek[index])
                }
            })
        }
        objArr = objArr.filter((n) => n)

        return cloneDeep(objArr)
    },
    /**
     * @description trans old patient profile structure to new structure
     * @param {object} objArr
     * @returns {object}
     */
    formatProfile({ objArr }: { objArr: { [key in string]: any }[] }) {
        objArr.forEach((items: { [key in string]: any }) => {
            let testObject: {} = items?.['name']?.['data']
            if (!testObject['version']) {
                testObject[c.basicInfo] = {}
                testObject['contactInfo'] = {}
                set(testObject, `${c.basicInfo}.avatar`, testObject['avatar'])
                set(testObject, `${c.basicInfo}.firstName`, testObject['firstName'])
                set(testObject, `${c.basicInfo}.middleName`, testObject['middleName'])
                set(testObject, `${c.basicInfo}.lastName`, testObject['lastName'])
                set(
                    testObject,
                    `${c.basicInfo}.dateOfBirth`,
                    testObject['dateOfBirth'] || testObject['birth'],
                )
                set(testObject, `${c.basicInfo}.gender`, testObject['gender'])
                set(testObject, `${c.basicInfo}.fullName`, testObject['fullName'])
                set(testObject, `${c.basicInfo}.phone`, testObject['phone'])
                set(testObject, `${c.basicInfo}.userName`, testObject['userName'])
                set(testObject, `${c.basicInfo}.email`, testObject['email'])
                set(testObject, `${c.basicInfo}.address`, {})
                set(
                    testObject,
                    `${c.basicInfo}.address.secondLine`,
                    testObject?.['Address']?.['line2'],
                )
                set(
                    testObject,
                    'contactInfo.address.city',
                    testObject?.['Address']?.['city'],
                )
                set(
                    testObject,
                    'contactInfo.address.state',
                    testObject?.['Address']?.['state'],
                )
                set(
                    testObject,
                    'contactInfo.address.zip',
                    testObject?.['Address']?.['zip'],
                )
                set(
                    testObject,
                    'contactInfo.address.St',
                    testObject?.['Address']?.['St'],
                )
            }
            set(
                testObject,
                'basicInfo.fullName',
                !testObject?.['basicInfo']?.['middleName']
                    ? testObject?.['basicInfo']?.['firstName'] +
                    '\u0020' +
                    testObject?.['basicInfo']?.['lastName']
                    : testObject?.['basicInfo']?.['firstName'] +
                    '\u0020' +
                    testObject?.['basicInfo']?.['middleName'] +
                    '\u0020' +
                    testObject?.['basicInfo']?.['lastName'],
            )
        })
        return objArr
    },
    /**
     * @description set Property Interlaced Change
     * @param {object[]} arrIn
     * @param {string[]} arr
     * @param {string[]} valueArr
     * @param {string[]} errorArr
     * @returns {object[]}
     */
    setPropertyInterlacedChange({
        arrIn,
        arr,
        valueArr,
        errorArr,
    }: {
        arrIn: { [key: string]: any }[]
        arr: string[]
        valueArr: string[]
        errorArr: string[]
    }) {
        if (isEmpty(arrIn) || isEmpty(arr)) {
            return []
        }
        for (let index = 0; index < arrIn.length; index++) {
            for (let key in arr) {
                if (index % 2 === 0) {
                    arrIn[index][arr[key]] = valueArr[key]
                } else {
                    arrIn[index][arr[key]] = errorArr[key]
                }
            }
        }
        return arrIn
    },
    /**
     * @description set Property Interlaced Change
     * @param {object[]} arrIn
     * @param {string[]} arr
     * @param {string[]} valueArr
     * @param {string[]} errorArr
     * @returns {object[]}
     */
    setPropertyStatusColor({
        arrIn,
        arr,
        activeArr,
        draftArr,
        archivedArr
    }: {
        arrIn: { [key: string]: any }[]
        arr: string[]
        activeArr: string[]
        draftArr: string[]
        archivedArr: string[]
    }) {
        if (isEmpty(arrIn) || isEmpty(arr)) {
            return []
        }
        for (let index = 0; index < arrIn.length; index++) {
            for (let key in arr) {
                if (arrIn[index].status === 'Active') {
                    arrIn[index][arr[key]] = activeArr[key]
                } else if (arrIn[index].status === 'Draft') {
                    arrIn[index][arr[key]] = draftArr[key]
                } else if (arrIn[index].status === 'Archived') {
                    arrIn[index][arr[key]] = archivedArr[key]
                }
            }
        }
        return arrIn
    },
    /**
     * @description set Form Jump Page
     * @param {any[]} objArry
     * @param {any} docFormObj
     * @returns {any[]}
     */
    setFormJumpPage({
        objArry,
        docFormObj,
        creatorId = '',
        platform = '',
    }: {
        objArry: any[]
        docFormObj: any
        creatorId: string
        platform: string
    }) {
        let objClone: any[] = JSON.parse(JSON.stringify(objArry))
        let JumpformList: any[] = objClone.map((item: any = {}) => {
            // If creatorId is not default-> "" , the doc is new, otherwise the doc is old
            let docCreator
            if (creatorId) {
                docCreator =
                    get(item, 'fid') === creatorId
                        ? platform
                        : get(item, 'name.data.classTag.name')
                if (docCreator == 'Admin') {
                    docFormObj?.['Admin']?.map((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)

                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)
                        // Judge whether the owner of the doc is current staff
                        if (itemType == tempType) {
                            if (get(item, 'fid') === creatorId) {
                                if ((item['type'] & 1) === 1) {
                                    item.pageName = temp['releaseJump']
                                } else {
                                    item.pageName = temp['privateJump']
                                }
                            } else {
                                item.pageName = temp['releaseJump']
                            }
                        }
                    })
                } else if (docCreator == 'Provider') {
                    docFormObj['Provider'].map((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)
                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)
                        if (itemType == tempType) {
                            if (get(item, 'fid') === creatorId) {
                                if ((item['type'] & 1) === 1) {
                                    item.pageName = temp['releaseJump']
                                } else {
                                    item.pageName = temp['privateJump']
                                }
                            } else {
                                item.pageName = temp['releaseJump']
                            }
                        }
                    })
                } else {
                    docFormObj['Patient']?.map?.((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)
                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)
                        if (itemType == tempType) {
                            if ((item['type'] & 1) === 1) {
                                item.pageName = temp['releaseJump']
                            } else {
                                item.pageName = temp['privateJump']
                            }
                        }
                    })
                }
                return item
            } else {
                // old doc
                docCreator = get(item, 'name.data.classTag.name')
                if (docCreator == 'Admin') {
                    docFormObj?.['Admin']?.map((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)

                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)

                        if (itemType == tempType) {
                            if ((item['type'] & 1) === 1) {
                                item.pageName = temp['releaseJump']
                            } else {
                                item.pageName = temp['privateJump']
                            }
                        }
                    })
                } else if (docCreator == 'Provider') {
                    docFormObj['Provider'].map((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)
                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)
                        if (itemType == tempType) {
                            if ((item['type'] & 1) === 1) {
                                item.pageName = temp['releaseJump']
                            } else {
                                item.pageName = temp['privateJump']
                            }
                        }
                    })
                } else if (docCreator == 'Patient') {
                    docFormObj['Patient']?.map?.((temp: any) => {
                        let itemType: string = item['type']
                            .toString()
                            .substr(0, item['type'].toString().length - 1)
                        let tempType: string = temp['type']
                            .toString()
                            .substr(0, temp['type'].toString().length - 1)
                        if (itemType == tempType) {
                            if ((item['type'] & 1) === 1) {
                                item.pageName = temp['releaseJump']
                            } else {
                                item.pageName = temp['privateJump']
                            }
                        }
                    })
                }
                return item
            }
        })
        return JumpformList
    },

    /**
     * @description Sorts the given array
     * @param {any[]} arr
     * @returns {any[]|string}
     */
    sortArray({ arr }: { arr: any[] }) {
        if (isArray(arr)) {
            return sortBy(arr)
        }
        return 'arr is not array'
    },
    /**
     * @description Divide and form new objects according to object attributes
     * @param {string[]} arr
     * @param {string} split
     * @returns {{}[]}
     */
    splitArrString({
        arr,
        split = ',',
    }: {
        arr: string[]
        split: string
    }): { [key in string]: any }[] {
        let newArr: { [key in string]: any }[] = []
        arr.forEach((items) => {
            let concat = items
            let youStr: string[] = items.split(',')
            let [dayConcat, HourConcat] = [youStr[0], youStr[1]]
            let you: {} = { dayConcat, HourConcat, concat }
            newArr.push(you)
        })
        return newArr
    },
    /**
     * @description Keep filtering the latest documents
     * @param {object[]} docList
     * @param {string} path
     * @returns {object[]}
     */
    keepLatestDoc({
        docList,
        path,
    }: {
        docList: { [key in string]: any }[]
        path: string
    }) {
        return uniqBy(docList, path)
    },
    /**
     * @description Set current meeting status
     * @param {object[]} object
     * @param {string} type
     * @param {string} tage
     * @returns {object[]}
     */
    setMeetingStatus({
        object,
        type = 'subtype',
        tage = 'tage',
    }: {
        object: { [key in string]: any }[]
        type?: string
        tage?: string
    }): { [key in string]: any }[] {
        if (isEmpty(object)) {
            return []
        }
        if (object) {
            object.forEach((obj) => {
                if ((get(obj, tage) & 0x100) === 256) {
                    obj['status'] = 'Completed'
                    obj['fontColor'] = '#999999'
                    obj['textDeco'] = 'none'
                } else {
                    if (
                        (get(obj, type) & 0x00ff) === 6 ||
                        (get(obj, type) & 0x00ff) === 100
                    ) {
                        obj['status'] = 'Scheduled'
                        obj['fontColor'] = '#30b354'
                        obj['textDeco'] = 'none'
                    } else if ((get(obj, type) & 0x00ff) === 11) {
                        obj['status'] = 'Canceled'
                        obj['fontColor'] = '#e24445'
                        obj['textDeco'] = 'underline'
                    } else if ((get(obj, type) & 0x00ff) === 15) {
                        obj['status'] = 'Changed'
                        obj['fontColor'] = '#f8ae29'
                        obj['textDeco'] = 'none'
                    } else if ((get(obj, type) & 0x00ff) === 17) {
                        obj['status'] = 'Replaced'
                        obj['fontColor'] = '#005795'
                        obj['textDeco'] = 'none'
                    }
                }
            })
        }
        return object
    },
    /**
     * @description Set current meeting status
     * @param {array} array
     * @param {number} len
     * @returns {boolean}
     */
    judgeArr({ array, len }: { array: []; len: number }): boolean {
        if (u.isArr(array)) {
            if (array.length <= len) {
                return true
            } else {
                return false
            }
        }
        return false
    },
    /**
     * @description Change item list
     * @param {object[]} array
     * @param {string} path
     * @param {object} obj
     * @returns {undefined}
     */
    ChangeAnItemInArray({
        array,
        path,
        obj,
    }: {
        array: {}[]
        path: string
        obj: {}
    }) {
        if (u.isArr(array)) {
            array.forEach((item, index) => {
                if (item[path] === obj[path]) {
                    array[index] = cloneDeep(obj)
                    return
                }
            })
        }
        return
    },
    /**
     * @description Gets the in the array
     * @param {any[]} dataArray
     * @param {number} index
     * @returns {any}
     */
    GetSomeData({
        dataArray,
        index = -1,
    }: {
        dataArray: any
        index?: number
    }): {} | undefined {
        return dataArray.at(index)
    },
    /**
     * @description Delete array items that do not meet the criteria
     * @param {object[]} docs
     * @param {number} local
     * @param {number} binary
     * @returns {object[]}
     */
    arrTageTypeIsValid({
        docs,
        local,
        binary,
    }: {
        docs: {}[]
        local: number
        binary: number
    }) {
        let docsTemp: {}[] = []
        for (let i = 0; i < docs.length; i++) {
            if (((docs[i]['tage'] >> (local - 1)) & 1) !== binary) {
                docsTemp.push(docs.slice(i, i + 1)[0])
            }
        }
        return docsTemp
    },
    /**
     * @function
     * @description Judgment key and return value
     * @param {Array} objArr
     * @param {string} pathKey
     * @param {string} pathValue
     * @param {string[]} valueArr
     * @returns {string[]}
     */
    judgeKeyAndReturnValue({
        objArr,
        pathKey,
        pathValue,
        valueArr,
    }: {
        objArr: { [key in string] }[]
        pathKey: string
        pathValue: string
        valueArr: string[]
    }): string[] {
        let arr: string[] = []
        objArr?.forEach((element) => {
            if (
                element?.[pathValue]?.length === 0 ||
                valueArr.includes(element?.[pathValue])
            ) {
                arr.push(element?.[pathKey])
            }
        })
        return arr
    },
    /**
     * @function
     * @description Format String Fill
     * @param {any} objArr
     * @param {string} sfill
     * @returns {string}
     */
    objArrFormatStringFill({
        objArr = [],
        sfill,
    }: {
        objArr: any
        sfill: string
    }): string {
        if (Array.isArray(objArr)) {
            let currentArr: any = []
            objArr.forEach((item) => {
                for (let k in item) {
                    if (item[k] !== '') {
                        currentArr.push(item[k])
                    }
                }
            })
            return currentArr.join(sfill)
        }
        return ''
    },
    /**
     * @function
     * @description get the Specified Object
     * @param {object[]} objArr
     * @param {string} path
     * @param {string|number|boolean} value
     * @returns {object[]}
     */
    getSpecifiedObject({
        objArr,
        path,
        value,
    }: {
        objArr: any[]
        path: string
        value: string | number | boolean
    }) {
        let arrCom: { [x: string]: any }[] = []
        objArr?.forEach((objItem: { [key in string]: any }[]) => {
            if (get(objItem, path) === value) {
                arrCom.push(objItem)
            }
        })
        return arrCom
    },
    /**
     * @function
     * @description get the value in the array
     * @param {object[]} objectArr
     * @param {string} keyOne
     * @param {string} keyTwo
     * @param {string|number|boolean} valueOne
     * @param {string|number|boolean} valueTwo
     * @returns {object[]}
     */
    setObjectByKey({
        objectArr,
        keyOne,
        keyTwo,
        valueOne,
        valueTwo,
    }: {
        objectArr: {}[]
        keyOne: string
        keyTwo: string
        valueOne: any
        valueTwo: any
    }): {}[] {
        objectArr?.forEach((object) => {
            if (get(object, keyOne) === valueOne) {
                set(object, keyTwo, valueTwo)
            }
        })
        return objectArr
    },
    /**
     * @function
     * @description recoverModifiers
     * @param {array} array
     * @returns {object[]}
     */
    recoverModifiers({ array }) {
        if (u.isArr(array)) {
            let obj: any[] = []
            let index = 1
            array.forEach((arr) => {
                obj.push({
                    index: `Mode ${index}`,
                    value: arr,
                })
                index++
            })
            return obj
        }
        return []
    },
    /**
     * @function
     * @description Match the parent folder with the child folder
     * @param {array} parentFiles
     * @param {array} childFiles
     * @returns {object[]}
     */
    folderMatching({
        folderId,
        data,
        formatedFolderList,
    }: {
        folderId: string
        data: { [key in string]: any }[]
        formatedFolderList: { [key in string]: any }[]
    }): { [key in string]: any }[] {
        let targetArr: { [key in string]: any }[] = formatedFolderList
        // 根据id把 内容 和 文件夹进行匹配
        let emptyArray: any = []
        data.forEach((item) => {
            emptyArray.push(item.name.data)
        })
        targetArr[targetArr.findIndex((item) => item.id === folderId)].secondList =
            emptyArray
        return targetArr
    },
    /**
     * @function
     * @description 格式化文件夹列表
     * @param {array} parentFiles
     * @returns {object[]}
     */
    formatFolder({
        parentFiles,
    }: {
        parentFiles: { [key in string]: any }[]
    }): { [key in string]: any }[] {
        let targetArr: object[] = []
        parentFiles?.forEach((pare: object) => {
            targetArr.push({
                displayStyle: 'none',
                category: get(pare, 'name.data.category'),
                hashCode: get(pare, 'name.data.hashCode'),
                id: get(pare, 'id'),
                secondList: [],
            })
        })
        return targetArr
    },
    /**
     * @function
     * @description Determine whether the object exists in an array object
     * @param {object[]} object
     * @param {any} value
     * @param {string} key
     * @returns {boolean}
     */
    containingValue({
        object,
        value,
        key,
    }: {
        object: object[]
        value: any
        key: string
    }): boolean {
        return object?.some((item) => {
            return get(item, key) === value ? true : false
        })
    },
    /**
     * @function
     * @description set List
     * @param {object[]} arr
     * @param {number} level
     * @param {string} ptitleath
     * @returns {object[]}
     */
    setList({
        arr,
        level,
        keyName,
    }: {
        arr: { [key in string] }[]
        level: number
        keyName: string
    }): { [key in string] }[] {
        let arrNew = cloneDeep(arr)
        arrNew.forEach((item) => {
            if (level === 1) {
                if (item['keyName'] === keyName) {
                    if (item['hasChildren'] === 'block') {
                        item['childList'][0]['backgroundColor'] = '0x1871b3'
                        item['isExpand'] = 'block'
                    } else if (item['hasChildren'] === 'none') {
                        item['backgroundColor'] = '0x1871b3'
                    }
                }
            } else if (level === 2) {
                ; (item['childList'] as { [key in string] }[])?.forEach((innerItem) => {
                    if (innerItem['keyName'] === keyName) {
                        innerItem['backgroundColor'] = '0x1871b3'
                        item['isExpand'] = 'block'
                    }
                })
            }
        })
        return arrNew
    },
    /**
     * @function
     * @description extract With Type
     * @param {object[]} docList
     * @param {number} type
     * @returns {any[]}
     */
    extractWithType({
        docList,
        type,
    }: {
        docList: { [key in string] }[]
        type: number
    }): any[] {
        return docList.filter((item) => {
            return item['type'] === type ? item : undefined
        })
    },
    /**
     * @function
     * @description parse Splice String
     * @param {string[]} strArr
     * @param {boolean} tag
     * @param {any} index
     * @param {any} value
     * @returns {string|string[]}
     */
    getOrReplaceAnArrayItem({
        strArr,
        tag,
        index,
        value,
    }: {
        strArr: string[]
        tag: boolean
        index?: any
        value?: any
    }): string[] | string {
        if (tag) {
            if (value) {
                strArr.splice(index, 1, value)
            } else {
                strArr.splice(index, 1)
            }
            return strArr
        } else {
            return strArr[strArr.length - 1]
        }
    },
    /**
     * @function
     * @description set the Switch
     * @param {object[]} sidebarType
     * @param {object} sideTypeSwitch
     * @returns {object[]}
     */
    setSwitch({
        sidebarType,
        sideTypeSwitch,
    }: {
        sidebarType: { [key in string]: any }[]
        sideTypeSwitch: { [key in string]: any }
    }): { [key in string]: any }[] {
        for (let item: number = 0; item < sidebarType.length; item++) {
            let space: string[] = (
                sidebarType?.[item]?.['authority'] as string
            )?.split('_')
            if (
                space &&
                sideTypeSwitch?.[`${space[0]}`]?.[`${space[1]}`] &&
                sideTypeSwitch?.[`${space[0]}`]?.[`${space[1]}`]?.['view'] === false
            ) {
                sidebarType.splice(item, 1)
                item--
            } else if (sidebarType?.[item]?.['childList']) {
                for (
                    let indexChild: number = 0;
                    indexChild < sidebarType?.[item]?.['childList'].length;
                    indexChild++
                ) {
                    if (sidebarType?.[item]?.['childList']?.[indexChild]?.['authority']) {
                        let spaceChild: string[] =
                            sidebarType?.[item]?.['childList']?.[indexChild]?.[
                                'authority'
                            ]?.split('_')
                        if (
                            sideTypeSwitch?.[`${spaceChild[0]}`]?.[`${spaceChild[1]}`]?.[
                            'view'
                            ] === false
                        ) {
                            sidebarType?.[item]?.['childList']?.splice(indexChild, 1)
                            indexChild--
                        }
                    }
                }
                if (sidebarType?.[item]?.['childList'].length === 0) {
                    sidebarType.splice(item, 1)
                    item--
                }
            }
        }
        for (let u = 0; u < sidebarType.length; u++) {
            if (sidebarType[u]?.['childList']?.[0]) {
                sidebarType[u]['pageName'] =
                    sidebarType[u]?.['childList'][0]?.['pageName']
                // sidebarType[u]["keyName"] = sidebarType[u]?.["childList"][0]?.["keyName"]
            }
        }
        return sidebarType
    },
    /**
     * @function
     * @description Complete array consistency
     * @param {object[]} arr
     * @param {number} number
     * @returns {object[]}
     */
    completeArrAccordNum({
        arr,
        number,
        value = {},
    }: {
        arr: {}[]
        number: number
        value: any
    }) {
        if (arr.length < number) {
            let num = arr.length
            for (let i = num; i < number; i++) {
                arr[i] = cloneDeep(value)
            }
        }
        return arr
    },
    /**
     * @function
     * @description Extract array split items
     * @param {object[]} arr
     * @param {string} path
     * @param {string} separator
     * @param {string} newArrName
     * @returns {object[]}
     */
    extractArrSplitItem({
        arr,
        path,
        separator,
        newArrName,
    }: {
        arr: {}[]
        path: string
        separator: string
        newArrName: string
    }) {
        if(Array.isArray(arr)){
            arr.forEach((obj) => {
                obj[newArrName] = []
                if (Array.isArray(get(obj, path))) {
                    get(obj, path)?.forEach((value) => {
                        obj[newArrName].push(value.split(separator)[0])
                    })
                } else if (
                    typeof get(obj, path) == 'string' &&
                    get(obj, path).constructor == String
                ) {
                    obj[newArrName] = get(obj, path).split(separator)[0]
                }
            })
            return arr
        }
    },
    /**
     * @function
     * @description Add up each item
     * @param {object[]} arr
     * @param {string} number
     * @param {string} multiplier
     * @returns {number}
     */
    multiplyEachItemAddUp({
        array,
        number,
        multiplier,
    }: {
        array: ReferenceString | {}[]
        number: string
        multiplier: string
    }) {
        let sum = 0
        if (u.isArr(array)) {
            array.forEach((obj) => {
                if (
                    Object.keys(obj).length !== 0 &&
                    obj.hasOwnProperty(number) &&
                    obj.hasOwnProperty(multiplier)
                ) {
                    let rg = /,|，+/g
                    if (rg.test(obj[number])) obj[number] = obj[number].replace(rg, '')
                    if (rg.test(obj[multiplier]))
                        obj[multiplier] = obj[multiplier].replace(rg, '')
                    sum += parseFloat(obj[number]) * parseFloat(obj[multiplier])
                }
            })
        }
        return sum.toFixed(2)
    },
    /**
     * @function
     * @description Match array index
     * @param {object[]} arr
     * @param {string} arrItemArrName
     * @param {object[]} arrModel
     * @param {Array} arrIndex
     * @returns {object[]}
     */
    matchingArrIndex({
        arr,
        arrItemArrName,
        arrModel,
        arrIndex,
    }: {
        arr: {}[]
        arrItemArrName: string
        arrModel: {}[]
        arrIndex: []
    }) {
        if (Array.isArray(arr)) {
            arrModel.forEach((obj, index) => {
                Object.assign(obj, { index: arrIndex[index] })
            })
            arr.forEach((object, index) => {
                if (object['icd']) {
                    let tempArr = Object.values(object[arrItemArrName])
                    let icdStr = ''
                    tempArr.forEach((value, index) => {
                        arrModel.forEach((object1, index) => {
                            if (object1['code'] === value) {
                                icdStr += object1['index']
                            }
                        })
                    })
                    Object.assign(object, { icdStr: icdStr })
                }
            })
        }
        return arr
    },
    /**
     * @function
     * @description Push anything onto an object
     * @param {object[]} arr
     * @param {string} identification
     * @param {any} objArr
     * @returns {object[]}
     */
    pushAnyToObject({
        arr,
        identification,
        objArr,
    }: {
        arr: ReferenceString | {}[]
        identification: string
        objArr: any
    }) {
        if (u.isArr(arr)) {
            arr?.forEach((obj) => {
                if (obj.hasOwnProperty(identification)) {
                    Object.assign(obj, { newObject: objArr })
                }
            })
        }
        return arr
    },
    /**
     * @function
     * @description change item in object
     * @param {object[]} obj
     * @param {number} index
     * @param {string} key
     * @param {any} value
     * @returns {object[]}
     */
    changeItemObj({
        obj,
        index,
        key,
        value,
    }: {
        obj: {}[]
        index: number
        key: string
        value: any
    }) {
        obj[index][key] = value
        return obj
    },
    correspondingMultiplyAndSum({
        arr1,
        arr2,
        path1,
        path2,
        multiply1Path,
        multiply2Path,
        resultArr,
        resultPath,
    }: {
        arr1: {}[]
        arr2: {}[]
        path1: string
        path2: string
        multiply1Path: string
        multiply2Path: string
        resultArr: {}[]
        resultPath: string
    }) {
        arr1?.forEach((obj1) => {
            arr2?.forEach((obj2) => {
                if (
                    get(obj2, path2) === get(obj1, path1) &&
                    get(obj2, path2) &&
                    get(obj1, path1)
                ) {
                    let num1 = get(obj2, multiply2Path)
                    let num2 = get(obj1, multiply1Path)
                    let rg = /,|，+/g
                    if (rg.test(num1)) num1 = num1.replace(rg, '')
                    if (rg.test(num2)) num2 = num2.replace(rg, '')
                    let sum1 = (num1 * num2).toFixed(2)
                    resultArr?.forEach((obj3) => {
                        if (get(obj3, resultPath) === get(obj1, path1)) {
                            Object.assign(obj3, { sum: sum1 })
                        }
                    })
                }
            })
        })
        return resultArr
    },
    vagueFilterArrayByPath({
        objArr,
        path,
        compareStr,
    }: {
        objArr: any[]
        path: string[] | string
        compareStr: string
    }) {
        let arrCom: { [x: string]: any }[] = []
        objArr?.forEach((objItem: { [key in string]: any }[]) => {
            if (isArray(path)) {
                path?.forEach((pathItem) => {
                    let pathValue: string | any[] = get(objItem, pathItem)
                    if(typeof pathValue== 'number'){
                        pathValue = pathValue + ''
                    }
                    if (
                        Array.isArray(pathValue)
                            ? pathValue?.some((item) => {
                                return item
                                    ?.split('')
                                    ?.filter((e) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${compareStr
                                                ?.split('')
                                                ?.filter((e) => e !== ' ')
                                                ?.map((item) =>
                                                    [
                                                        `\\`,
                                                        `^`,
                                                        `$`,
                                                        `(`,
                                                        `)`,
                                                        `{`,
                                                        `}`,
                                                        `[`,
                                                        `]`,
                                                        `+`,
                                                        `?`,
                                                        `*`,
                                                    ].includes(item)
                                                        ? '\\' + item
                                                        : item,
                                                )
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                            })
                            : pathValue
                                ?.split('')
                                ?.filter((e: string) => e !== ' ')
                                ?.join('')
                                ?.match(
                                    new RegExp(
                                        `${compareStr
                                            ?.split('')
                                            ?.filter((e: string) => e !== ' ')
                                            ?.map((item) =>
                                                [
                                                    `\\`,
                                                    `^`,
                                                    `$`,
                                                    `(`,
                                                    `)`,
                                                    `{`,
                                                    `}`,
                                                    `[`,
                                                    `]`,
                                                    `+`,
                                                    `?`,
                                                    `*`,
                                                ].includes(item)
                                                    ? '\\' + item
                                                    : item,
                                            )
                                            ?.join('')}`,
                                        'ig',
                                    ),
                                )
                    ) {
                        if (!arrCom.includes(objItem)) arrCom.push(objItem)
                    }
                })
            } else {
                let pathValueStr: string | string[] = get(objItem, path)
                if (
                    Array.isArray(pathValueStr)
                        ? pathValueStr.some((item) => {
                            return item
                                ?.split('')
                                ?.filter((e) => e !== ' ')
                                ?.join('')
                                ?.match(
                                    new RegExp(
                                        `${compareStr
                                            ?.split('')
                                            ?.filter((e) => e !== ' ')
                                            ?.map((item) =>
                                                [
                                                    `\\`,
                                                    `^`,
                                                    `$`,
                                                    `(`,
                                                    `)`,
                                                    `{`,
                                                    `}`,
                                                    `[`,
                                                    `]`,
                                                    `+`,
                                                    `?`,
                                                    `*`,
                                                ].includes(item)
                                                    ? '\\' + item
                                                    : item,
                                            )
                                            ?.join('')}`,
                                        'ig',
                                    ),
                                )
                        })
                        : (pathValueStr as string)
                            ?.split('')
                            ?.filter((e: string) => e !== ' ')
                            ?.join('')
                            ?.match(
                                new RegExp(
                                    `${compareStr
                                        ?.split('')
                                        ?.filter((e: string) => e !== ' ')
                                        ?.map((item) =>
                                            [
                                                `\\`,
                                                `^`,
                                                `$`,
                                                `(`,
                                                `)`,
                                                `{`,
                                                `}`,
                                                `[`,
                                                `]`,
                                                `+`,
                                                `?`,
                                                `*`,
                                            ].includes(item)
                                                ? '\\' + item
                                                : item,
                                        )
                                        ?.join('')}`,
                                    'ig',
                                ),
                            )
                ) {
                    arrCom.push(objItem)
                }
            }
        })
        return arrCom
    },
    permutationAndCombination({
        arr,
        keyName,
        perComItemName,
        spliceStr,
    }: {
        arr: { [key in string]: any }[]
        keyName: string
        perComItemName: string
        spliceStr: string
    }) {
        if (arr.length === 0) return []
        if (arr.length === 1) {
            let newArr: {}[] = []
            let newObj
            arr[0][perComItemName]?.forEach((obj, index) => {
                newObj = {}
                newObj['data'] = {}
                newObj['data']['combination'] = obj['value']
                newObj['data']['options'] = {}
                newObj['data']['options'][arr[0][keyName]] = obj['value']
                newArr.push(newObj)
            })
            return newArr
        }
        let tempArr: { [key in string]: string[] | string[][] }[] = []
        let keys: string[] = []
        arr?.forEach((obj) => {
            keys.push(obj[keyName] as string)
        })
        for (let i = 0; i < arr.length; i++) {
            tempArr.push({})
            tempArr[i][perComItemName] = []
            for (let j = 0; j < arr[i][perComItemName].length; j++) {
                tempArr[i][perComItemName].push(arr[i][perComItemName][j]['value'])
            }
        }
        let twoItemPermutationAndCombination = function (arr1: any[], arr2: any[]) {
            let newArr: any[] = []
            let k = 0
            for (let i = 0; i < arr1.length; i++) {
                for (let j = 0; j < arr2.length; j++) {
                    if (Array.isArray(arr1[i])) {
                        newArr[k++] = [...arr1[i], arr2[j]]
                    } else {
                        newArr[k++] = [arr1[i], arr2[j]]
                    }
                }
            }
            return newArr
        }
        for (let i = 1; i < tempArr.length; i++) {
            tempArr[0][perComItemName] = twoItemPermutationAndCombination(
                tempArr[0][perComItemName],
                tempArr[i][perComItemName],
            )
        }
        let newArr: {}[] = []
            ; (tempArr[0][perComItemName] as string[][]).forEach((item: string[]) => {
                let obj = {}
                obj['data'] = {}
                obj['data']['combination'] = item.join(spliceStr)
                obj['data']['options'] = {}
                item.forEach((item1, index1) => {
                    obj['data']['options'][keys[index1]] = item1
                })
                newArr.push(obj)
            })
        return newArr
    },

    maxMinObjectArr({ arr, path }: { arr: {}[]; path: string }) {
        let number: number[] = []
        arr.forEach((item, index) => {
            number[index] = +get(item, path)
        })
        let maxCount = number[0]
        let minCount = number[0]
        number.forEach((value) => {
            if (maxCount < value) {
                maxCount = value
            }
        })
        number.forEach((value) => {
            if (minCount > value) {
                minCount = value
            }
        })
        return {
            maxCount,
            minCount,
        }
    },
    equivalentObj({
        objArr,
        path,
        compareObj,
    }: {
        objArr: { [key in string]: any }[]
        path: string
        compareObj: {}
    }) {
        for (let i = 0; i < objArr.length; i++) {
            if (isEqual(get(objArr[i], path), compareObj)) return objArr[i]
        }
    },
    modifyAttr({ objArr }: { objArr: { [key in string]: any }[] }) {
        let newObj: {} = {}
        objArr?.forEach((element) => {
            newObj = {
                ...newObj,
                [element['styleName']]: '',
            }
        })
        return { optionsValue: objArr, styleValue: newObj }
    },
    compareArraysDuplicates({
        arr1,
        arr2,
        path,
    }: {
        arr1: {}[]
        arr2: {}[]
        path: string
    }) {
        let len = 0
        for (let i = 0; i < arr1.length; i++) {
            for (let j = 0; j < arr2.length; j++) {
                if (get(arr1[i], path) === get(arr2[j], path)) {
                    len++
                }
            }
            if (len === 0) {
                arr2.push(arr1[i])
            }
            len = 0
        }
        return arr2
    },
    setArrayItemToProperty({
        arr,
        path,
        value,
    }: {
        arr: {}[]
        path: string
        value: string
    }) {
        for (let i = 0; i < arr.length; i++) {
            set(arr[i], path, cloneDeep(value))
        }
        return arr
    },
    addItemNoRepeat({
        array,
        path,
        obj,
    }: {
        array: any[]
        path: string
        obj: {}
    }) {
        let len = 0
        if (array.length === 0) array.push(obj)
        else {
            for (let i = 0; i < array.length; i++) {
                if (get(array[i], path) === get(obj, path)) {
                    array[i] = cloneDeep(obj)
                    return array
                } else {
                    len++
                }
            }
            if (len === array.length) array.push(obj)
            len = 0
        }
        return array
    },
    setTxtProperties({
        objArr,
        property,
    }: {
        objArr: object[]
        property: object
    }) {
        objArr.forEach((item) => {
            ; (item?.['styleValue'] as [])?.forEach((ele) => {
                if (ele?.['value'] === property?.[item?.['styleName']]) {
                    set(ele, 'color', '0xfb5051')
                    set(ele, 'borderStyle', '1px solid #fb5051')
                } else {
                    set(ele, 'color', '0x333333')
                    set(ele, 'borderStyle', 'none')
                }
            })
        })
        return objArr
    },
    mergeAttributes({
        arr,
        path,
        dataPath = 'productionList',
    }: {
        arr: (object[]|object)[]
        path: string
        dataPath?: string
    }) {
        if (!arr.length) return
        let newArr: object[] = []
        
        arr.forEach((item) => {
            if(item.constructor ===Object){
                newArr.push(item)
            }else{
                newArr = [...newArr, ...item as object[]];
            }
        })
        for (let i = 0; i < newArr.length; i++) {
            for (let j = i + 1; j < newArr.length; j++) {
                if (get(newArr[i], path) == get(newArr[j], path)) {
                    newArr[i][dataPath] = [...newArr[i][dataPath], ...newArr[j][dataPath]]
                    newArr.splice(j, 1)
                    j--
                }
            }
        }
        return newArr
    },
    movementSubArray({
        arr1,
        arr2,
        subLen,
        direct,
    }: {
        arr1: any[]
        arr2: any[]
        subLen: number
        direct: string
    }) {
        if (arr1.length < arr2.length) return
        let arr = cloneDeep(arr1)
        let start
        for (let i = 0; i < arr.length; i++) {
            if (arr[i]['path'] === arr2[0]['path']) start = i
        }
        let end = start + (subLen - 1)
        if (direct === 'right' && end < arr.length - 1) {
            start++
            end++
            arr2 = arr.slice(start, end + 1)
        }
        if (direct === 'left' && start > 0) {
            start--
            end--
            arr2 = arr.slice(start, end + 1)
        }
        return arr2
    },
    matchModAttr({
        obj,
        path,
        data,
    }: {
        obj: {}[]
        path: string
        data: string[]
    }) {
        for (let i = 0; i < obj.length; i++) {
            for (let j = i + 1; j < obj.length; j++) {
                if (get(obj[i], path) == get(obj[j], path)) {
                    set(obj[i], data[0], get(obj[i], data[0]) + get(obj[j], data[0]))
                    set(
                        obj[i],
                        data[1],
                        (+get(obj[i], data[1]) + +get(obj[j], data[1])).toFixed(2) + '',
                    )
                    obj.splice(j, 1)
                    j--
                }
            }
        }
        return obj
    },
    flatArray({ param }: { param: any[] }) {
        return flattenDeep(param)
    },
    requireValues({ arr, params }: { arr: {}[]; params: string[] }) {
        let newArr: {}[] = []
        arr.forEach((item) => {
            let obj = {}
            params.forEach((name) => {
                obj[name] = get(item, name)
            })
            newArr.push(obj)
        })
        return newArr
    },
    reque({
        arrOld,
        arrNew,
        path = 'data.combination',
    }: {
        arrOld: { [key in string]: any }[]
        arrNew: { [key in string]: any }[]
        path?: string
    }) {
        arrNew.forEach((item, index) => {
            arrOld.forEach((arrItem) => {
                if (get(item, path) === get(arrItem, path)) {
                    arrNew[index] = arrItem
                }
            })
        })
        return arrNew
    },
    matchArray({
        arrOrigin,
        arrCompare,
        originPath,
        comparePath,
        idPath = 'id',
        title = 'name.title',
        data = 'name.data',
    }: {
        arrOrigin: { [key in string]: any }[]
        arrCompare: { [key in string]: any }[]
        originPath: string
        comparePath: string
        idPath?: string
        title?: string
        data?: string
    }): { deleteResult: {}[] | string[]; updateResult: {}[]; createResult: any } {
        const createResult = differenceWith(
            arrCompare,
            arrOrigin,
            (x, y) => get(x, comparePath) === get(y, originPath),
        )
        const deleteResult: {}[] | string[] = differenceWith(
            arrOrigin,
            arrCompare,
            (x, y) => get(x, originPath) === get(y, comparePath),
        )
        deleteResult.forEach((item, index) => {
            deleteResult[index] = get(item, idPath)
        })
        const updateResult: {}[] = []
        arrOrigin.forEach((itemO) => {
            arrCompare.forEach((itemC) => {
                if (get(itemO, originPath) === get(itemC, comparePath)) {
                    set(itemO, title, get(itemC, 'title'))
                    set(itemO, data, get(itemC, 'data'))
                    updateResult.push(cloneDeep(itemO))
                }
            })
        })
        return {
            deleteResult,
            updateResult,
            createResult,
        }
    },

    csvCover({
        originArray,
        handleArray,
        pathOne,
        pathTwo,
        idPath = 'id',
    }: {
        originArray: {}[]
        handleArray: {}[]
        pathOne: string
        pathTwo: string
        idPath: string
    }): {}[] {
        let arrayComplete: {}[] = []
        handleArray.forEach((dataHandle) => {
            originArray.forEach((dataOrigin) => {
                if (
                    get(dataHandle, pathOne) === get(dataOrigin, pathOne) &&
                    get(dataHandle, pathTwo) === get(dataOrigin, pathTwo)
                ) {
                    set(dataHandle, idPath, get(dataOrigin, idPath))
                }
            })
            arrayComplete.push(cloneDeep(dataHandle))
        })
        return arrayComplete
    },
    setArrObjAttri({
        arr,
        path,
        value,
    }: {
        arr: { [key in string]: any }[]
        path: string
        value: any
    }) {
        arr.forEach((item) => {
            set(item, path, value)
        })
        return arr
    },
    judgeContainObj({ arrObj, obj }: { arrObj: {}[]; obj: {} }): Boolean {
        return arrObj.some((item) => {
            return JSON.stringify(item) === JSON.stringify(obj)
        })
    },
    removeContainObj({ arrObj, obj }: { arrObj: {}[]; obj: {} }): {}[] {
        arrObj.forEach((item, index) => {
            if (JSON.stringify(item) === JSON.stringify(obj)) {
                arrObj.splice(index, 1)
            }
        })
        return arrObj
    },
    spliceObjStr({
        obj,
        arr,
        path = 'therapyArea',
    }: {
        obj: { [key in string] }
        arr: string[]
        path?: string
    }) {
        if (arr.includes(obj[path])) {
            return `${obj['therapyArea']}, ${obj['times']} for ${obj['weeks']} (x${Number((obj?.['times'] as string).match(/\d*/)?.[0]) *
                Number((obj?.['weeks'] as string).match(/\d*/)?.[0])
                })`
        } else {
            return `${obj['therapyAreaOption']} ${obj['therapyArea']}, ${obj['times']
                } for ${obj['weeks']} (x${Number((obj?.['times'] as string).match(/\d*/)?.[0]) *
                Number((obj?.['weeks'] as string).match(/\d*/)?.[0])
                })`
        }
    },
    matchValues({ arr, value }: { arr: string[]; value: string }) {
        let result: string[] = []
        let valueNew = (value as string).split('')
        valueNew.forEach((itemStr, index) => {
            valueNew[index] = /\W/.test(itemStr) ? '\\' + itemStr : itemStr
        })
        arr.forEach((item) => {
            if (new RegExp(valueNew.join(''), 'ig').test(item)) {
                result.push(item)
            }
        })
        return result
    },
    replaceArrEle({
        arr,
        param,
        value,
    }: {
        arr: string[]
        param: string
        value: any
    }) {
        return arr.map((item) => {
            if (item === param) {
                return value
            }
            return item
        })
    },
    removeByIdArr({
        object,
        ids,
        id = 'id',
    }: {
        object: { [key in string] }[]
        ids: (string | number)[]
        id?: string
    }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (ids.includes(get(object[i], id))) {
                    object.splice(i, 1)
                    i--
                }
            }
        }
        return object
    },
    getDataByPath({ objArr, path }: { objArr: any[]; path: string }) {
        let arrCom: { [x: string]: any }[] = []
        objArr?.forEach((objItem: { [key in string]: any }[]) => {
            if (get(objItem, path)) {
                arrCom.push(get(objItem, path))
            }
        })
        return arrCom
    },
    sliceArr({ arr, len }: { arr: any[]; len: number }) {
        let newArr: any[] = []
        if (len) {
            let ceilLen = Math.ceil(arr.length / len)
            for (let h = 0; h < ceilLen; h++) {
                newArr.push(arr.splice(0, len))
            }
        }
        return newArr
    },
    updateArrayByArray({
        arrOrigin,
        arrCompare,
        path,
        sortBy,
    }: {
        arrOrigin: {}[]
        arrCompare: {}[]
        path: string
        sortBy: string
    }) {
        if (!arrOrigin.length) {
            arrOrigin = arrCompare
            return orderBy(arrOrigin, sortBy, 'desc')
        }
        for (let i = 0; i < arrCompare.length; i++) {
            for (let j = 0; j < arrOrigin.length; j++) {
                if (get(arrCompare[i], path) === get(arrOrigin[j], path)) {
                    arrOrigin[j] = arrCompare[i]
                    break
                } else if (j == arrOrigin.length - 1) {
                    arrOrigin.unshift(arrCompare[i])
                    break
                }
            }
        }
        return orderBy(arrOrigin, sortBy, 'desc')
    },

    vagueFilterArrayByPathArr({
        objArr,
        path,
        compareArr,
    }: {
        objArr: any[]
        path: {}
        compareArr: string[]
    }) {
        let filter = function (
            objArr: any[],
            path: string[] | string,
            compareStr: string,
        ) {
            let arrCom: { [x: string]: any }[] = []
            objArr?.forEach((objItem: { [key in string]: any }[]) => {
                if (isArray(path)) {
                    path?.forEach((pathItem) => {
                        let pathValue: string | any[] = get(objItem, pathItem)
                        if (
                            Array.isArray(pathValue)
                                ? pathValue?.some((item) => {
                                    return item
                                        ?.split('')
                                        ?.filter((e) => e !== ' ')
                                        ?.join('')
                                        ?.match(
                                            new RegExp(
                                                `${compareStr
                                                    ?.split('')
                                                    ?.filter((e) => e !== ' ')
                                                    ?.join('')}`,
                                                'ig',
                                            ),
                                        )
                                })
                                : pathValue
                                    ?.split('')
                                    ?.filter((e: string) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${compareStr
                                                ?.split('')
                                                ?.filter((e: string) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                        ) {
                            if (!arrCom.includes(objItem)) arrCom.push(objItem)
                        }
                    })
                } else {
                    let pathValueStr: string | string[] = get(objItem, path)
                    if (
                        Array.isArray(pathValueStr)
                            ? pathValueStr.some((item) => {
                                return item
                                    ?.split('')
                                    ?.filter((e) => e !== ' ')
                                    ?.join('')
                                    ?.match(
                                        new RegExp(
                                            `${compareStr
                                                ?.split('')
                                                ?.filter((e) => e !== ' ')
                                                ?.join('')}`,
                                            'ig',
                                        ),
                                    )
                            })
                            : (pathValueStr as string)
                                ?.split('')
                                ?.filter((e: string) => e !== ' ')
                                ?.join('')
                                ?.match(
                                    new RegExp(
                                        `${compareStr
                                            ?.split('')
                                            ?.filter((e: string) => e !== ' ')
                                            ?.join('')}`,
                                        'ig',
                                    ),
                                )
                    ) {
                        arrCom.push(objItem)
                    }
                }
            })
            return arrCom
        }
        for (let j = 0; j < objArr.length; j++) {
            if (
                objArr[j]['name']['visitType'] !== 'Telemedicine' &&
                objArr[j]['name']['visitType'] !== 'Office Visit'
            ) {
                objArr[j]['name']['visitTypeHis'] = 'Room'
            }
            if (objArr[j]['name']['visitType'] === 'Telemedicine') {
                objArr[j]['name']['visitTypeHis'] = 'Telemedicine'
            }
            if (objArr[j]['name']['visitType'] === 'Office Visit') {
                objArr[j]['name']['visitTypeHis'] = 'Office Visit'
            }
        }

        for (let i = 0; i < compareArr.length; i++) {
            if (compareArr[i] === 'All' && i !== 0) continue
            objArr = filter(objArr, path[i], compareArr[i])
        }
        return objArr
    },
    keepLatestDocs({
        docList,
        paths,
    }: {
        docList: { [key in string]: any }[]
        paths: string[]
    }) {
        paths.forEach((path) => {
            docList = uniqBy(docList, path)
        })
        return docList
    },
    handlePaymentAmount({ paymentArray }: { paymentArray: {}[] }) {
        if (paymentArray.length) {
            let totalAmount = 0
            paymentArray.forEach((eachData) => {
                if (get(eachData, 'deat.state') == 'COMPLETED') {
                    totalAmount += parseInt(get(eachData, 'name.data.orderInfo.amount', ''))
                }
            })
            return totalAmount * 100
        }
        return
    },
    handleHashTime({
        hashApp,
        hashConnection,
    }: {
        hashApp: {}[]
        hashConnection: {}[]
    }) {
        if (!hashApp || !hashConnection) return 'none'
        if (
            get(hashConnection[0], 'name.data.hashTime', '') <
            get(hashApp[0], 'name.data.hashTime', '')
        )
            return 'block'
        return 'none'
    },
    getDataByIndex({ arr, indexArr }: { arr: any[]; indexArr: number[] }) {
        if (!indexArr.length) return
        let retArr: any[] = []
        indexArr?.forEach((v) => {
            retArr.push(arr?.[v])
        })
        return retArr
    },
    addKeyAndValue({
        array,
        pathArray,
        valueArray,
    }: {
        array: {}[]
        pathArray: string[]
        valueArray: any[]
    }) {
        if (isArray(array)) {
            array.forEach((eachData) => {
                pathArray.forEach((eachPath, indexPath) => {
                    if (!has(eachData, eachPath)) {
                        set(eachData, eachPath, valueArray[indexPath])
                    }
                })
            })
            
            return array
        }
    },
    hasKeyArray({ array, pathArray }: { array: {}[]; pathArray: string[] }) {
        for (let i = 0; i < array.length; i++) {
            for (let j = 0; j < pathArray.length; j++) {
                if (!has(array[i], pathArray[j])) return false
            }
        }
        return true
    },
    generateTransformArray({ arr, stime, financialType, billingType,adjustment }:
        {
            arr: {}[];
            stime: number
            financialType: string,
            billingType: string,
            adjustment: {}
        }
    ) {
        let claimArrays: any[] = [], insuranceNum = 4;
        for (let i = 0; i < insuranceNum; i++) {
            let newArr: {}[] = []
            if(billingType === 'Invoice' && adjustment.hasOwnProperty('amount')){
                arr.filter(item => { item.hasOwnProperty('hashCode')})
                for(let j = 0; j < arr.length; j++){
                    let str = ''
                    for (let k = 0; k < arr[j]['modifiers']?.length; k++) {
                        str += arr[j]['modifiers'][k].split(' -')[0] + '; '
                    }
                    newArr[j] = {}
                    newArr[j]['appliedAmount'] = '0.00'
                    newArr[j]['cptCode'] = str
                    newArr[j]['stime'] = stime
                    newArr[j]['code'] = arr[j]['code']
                    newArr[j]['panelCode'] = arr[j]['panelCode']
                    newArr[j]['hashCode'] = arr[j]['hashCode']
                    newArr[j]['deductable'] = '0.00'
                    newArr[j]['patientPaid'] = '0.00'
                    newArr[j]['coInsurance'] = '0.00'
                    newArr[j]['copay'] = '0.00'
                    newArr[j]['ptBalance'] = '0.00'
                    newArr[j]['description'] = arr[j]['description']
                    newArr[j]['amountBilled'] = parseFloat(arr[j]['sum']).toFixed(2)
                    newArr[j]['adjustment'] = 0
                    newArr[j]['billBalance'] = Number(arr[j]['sum'])
                }
                if(adjustment['type'] === 'Amount'){
                    let totalAdjust = -Number(adjustment['amount']) // 转为正数 
                    let arrLength = newArr.length 
                    let average = totalAdjust/arrLength 
                    let newArrTemp = newArr 
                    let isAssign = false
                    let hasAssigned = 0
                    let remainAdjust = totalAdjust
                    do{
                        for(let l = 0; l < newArrTemp.length; l++){
                            if(newArrTemp[l]['billBalance'] <= average) {
                                newArrTemp[l]['adjustment'] = Number(newArrTemp[l]['amountBilled']) + newArrTemp[l]['adjustment']
                                newArrTemp[l]['billBalance'] = Number(newArrTemp[l]['amountBilled']) - newArrTemp[l]['adjustment']
                                hasAssigned = newArrTemp[l]['adjustment'] + hasAssigned
                            }else{
                                    newArrTemp[l]['adjustment'] = newArrTemp[l]['adjustment'] + average
                                    newArrTemp[l]['billBalance'] = Number(newArrTemp[l]['amountBilled']) - newArrTemp[l]['adjustment']
                                    hasAssigned = hasAssigned + newArrTemp[l]['adjustment']
                                }
                            for(let m=0; m < newArr.length; m++){
                                if(newArr[m]['hashCode'] === newArrTemp[l]['hashCode']){
                                    newArr[m] = newArrTemp[l]
                                }
                            }
                        }
                        if((totalAdjust-hasAssigned)<= 0){
                            isAssign = true 
                        } else {
                            newArrTemp = newArrTemp.filter(item => Number(item['amountBilled']) > average)
                            isAssign = false 
                            remainAdjust = totalAdjust - hasAssigned
                            average = remainAdjust/(newArrTemp.length)
                        }
                    } while (!isAssign)
                    newArr.forEach(item => {
                        item['adjustment'] = (-(parseFloat(item['adjustment']))).toFixed(2)
                        item['billBalance'] = (parseFloat(item['billBalance'])).toFixed(2)

                    })
                }else if(adjustment['type'] === 'Percentage'){
                    for(let item of newArr){
                        item['adjustment'] = (Number(item['amountBilled']) * Number(adjustment['amount']) * 0.01).toFixed(2)
                        item['billBalance'] = (Number(item['amountBilled'])-item['adjustment']).toFixed(2)
                        item['adjustment'] = (-(parseFloat(item['adjustment']))).toFixed(2)
                        
                    }
                }

            }else {
                for (let j = 0; j < arr.length; j++) {
                    if (arr[j].hasOwnProperty('hashCode')) {
                        let str = ''
                        for (let k = 0; k < arr[j]['modifiers']?.length; k++) {
                            str += arr[j]['modifiers'][k].split(' -')[0] + '; '
                        }
                        newArr[j] = {}
                        newArr[j]['adjustment'] = '0.00'
                        newArr[j]['appliedAmount'] = '0.00'
                        newArr[j]['cptCode'] = str
                        newArr[j]['stime'] = stime
                        newArr[j]['code'] = arr[j]['code']
                        newArr[j]['panelCode'] = arr[j]['panelCode']
                        newArr[j]['hashCode'] = arr[j]['hashCode']
                        newArr[j]['deductable'] = '0.00'
                        newArr[j]['patientPaid'] = '0.00'
                        newArr[j]['coInsurance'] = '0.00'
                        newArr[j]['copay'] = '0.00'
                        newArr[j]['ptBalance'] = '0.00'
                        newArr[j]['description'] = arr[j]['description']
                        newArr[j]['amountBilled'] = parseFloat(arr[j]['sum']).toFixed(2)
                        newArr[j]['billBalance'] = parseFloat(arr[j]['sum']).toFixed(2)
                    }
                    }
                }
            claimArrays.push(newArr)
        }
        claimArrays[0].forEach(obj => {
            obj['isGenerate'] = ''
            obj['primaryPaid'] = '0.00'
            obj['secondaryPaid'] = '0.00'
        })
        return claimArrays
    },

    generatePatientPaymentApplied({ arr, stime, patientPayment, claimRecord }:
        {
            arr: {}[],
            stime: number
            patientPayment: {}[],
            claimRecord: {}[]
        }
    ) {
        let claimArrays: any[] = claimRecord;
        let havePaymentIds = claimRecord.map(item => item['patientPaymentId'])
        log.warn('havePaymentIds', havePaymentIds);
        // 这里有一个潜藏问题 如果patientPayment新添了 没问题
        // 但是如果arr也就是 procedure code 新添了一个 这里没做处理
        for (let i = 0; i < patientPayment.length; i++) {
            let obj = {}
            if(!havePaymentIds.includes(patientPayment[i]['id'])){
                let newArr: {}[] = []
                for (let j = 0; j < arr.length; j++) {
                    if (arr[j].hasOwnProperty('hashCode')) {
                        let str = ''
                        for (let k = 0; k < arr[j]['modifiers'].length; k++) {
                            str += arr[j]['modifiers'][k].split(' -')[0] + '; '
                        } 
                        let amountInit = (parseFloat(arr[j]['sum'])).toFixed(2)
                        // let amountInit = (parseFloat(arr[j]['charge']) * parseFloat(arr[j]['quantity'])).toFixed(2)
                        newArr[j] = {
                            adjustment: '0.00',
                            appliedAmount: '0.00',
                            cptCode: str,
                            stime: stime,
                            code: arr[j]['code'],
                            panelCode: arr[j]['panelCode'],
                            hashCode: arr[j]['hashCode'],
                            deductable: '0.00',
                            patientPaid: '0.00',
                            coInsurance: '0.00',
                            copay: '0.00',
                            ptBalance: '0.00',
                            description: arr[j]['description'],
                            amountBilled: amountInit,
                            billBalance: amountInit,
                        }
                    }
                }
                obj = {
                    patientPaymentId: patientPayment[i]['id'],
                    isAssignment: false,
                    codeAssignCondition: newArr
                }
            }
            if(Object.keys(obj).length > 0) claimArrays.push(obj)
        }
        log.debug('claimArrays',claimArrays);
        let totalPatientPaymentApplied = {};
        totalPatientPaymentApplied['codeAssignCondition'] = []
        for (let i = 0; i < arr.length; i++) {
            totalPatientPaymentApplied['codeAssignCondition'][i] = {}
        }
        log.debug('aa', totalPatientPaymentApplied);
        totalPatientPaymentApplied['codeAssignCondition'].forEach((obj, index) => {
            let tempObj = {
                adjustment: '0.00',
                amountBilled: '0.00',
                appliedAmount: '0.00',
                billBalance: '0.00',
                coInsurance: '0.00',
                code: '',
                copay: '0.00',
                cptCode: '',
                deductable: '0.00',
                description: '',
                hashCode: '',
                panelCode: '',
                patientPaid: '0.00',
                ptBalance: '0.00',
                stime: ''
            }
            log.debug('cc', claimArrays);
            log.debug('dd', tempObj);
            claimArrays.forEach((item) => {
                let pay = item['codeAssignCondition']
                tempObj['adjustment'] = (parseFloat(tempObj['adjustment']) + parseFloat(pay[index]['adjustment'])).toFixed(2);
                tempObj['appliedAmount'] = (parseFloat(tempObj['appliedAmount']) + parseFloat(pay[index]['appliedAmount'])).toFixed(2);
                tempObj['patientPaid'] = pay[index]['patientPaid'];
                tempObj['coInsurance'] = pay[index]['coInsurance'];
                tempObj['copay'] = pay[index]['copay'];
                tempObj['deductable'] = pay[index]['deductable'];
                tempObj['ptBalance'] = pay[index]['ptBalance'];
                tempObj['amountBilled'] = pay[index]['amountBilled'];
                tempObj['billBalance'] = (parseFloat(tempObj['amountBilled']) + parseFloat(tempObj['appliedAmount']) + parseFloat(tempObj['adjustment']) + parseFloat(tempObj['patientPaid'])).toFixed(2);
                tempObj['code'] = pay[index]['code'];
                tempObj['cptCode'] = pay[index]['cptCode'];
                tempObj['description'] = pay[index]['description'];
                tempObj['hashCode'] = pay[index]['hashCode'];
                tempObj['panelCode'] = pay[index]['panelCode'];
                tempObj['stime'] = pay[index]['stime'];
            })
            log.debug(tempObj);
            
            totalPatientPaymentApplied['codeAssignCondition'][index] = tempObj
        });
        let res = {
            patientPaymentApplied: claimArrays,
            totalPatientPaymentApplied,
        }
        return res
    },
    mergeFirstAndSecondApplied({
        totalApplied,
        arr1,
        arr2,
        arr3
    }: {
        totalApplied: {}[]
        arr1: {}[]
        arr2: {}[]
        arr3: {}[]
    }) {
        for (let i = 0; i < totalApplied.length; i++) {
            totalApplied[i]['primaryPaid'] = parseFloat(
                arr1[i]['appliedAmount'],
            ).toFixed(2)
            totalApplied[i]['secondaryPaid'] = parseFloat(
                arr2[i]['appliedAmount'],
            ).toFixed(2)
            totalApplied[i]['thirdPaid'] = parseFloat(
                arr3[i]['appliedAmount'],
            ).toFixed(2)

            totalApplied[i]['adjustment'] = (
                parseFloat(arr1[i]['adjustment']) + parseFloat(arr2[i]['adjustment']) + parseFloat(arr3[i]['adjustment'])
            ).toFixed(2)
            totalApplied[i]['appliedAmount'] = (
                parseFloat(arr1[i]['appliedAmount']) +
                parseFloat(arr2[i]['appliedAmount']) +
                parseFloat(arr3[i]['appliedAmount'])
            ).toFixed(2)
            totalApplied[i]['coInsurance'] = parseFloat(
                arr1[i]['coInsurance'],
            ).toFixed(2)
            totalApplied[i]['copay'] = parseFloat(arr1[i]['copay']).toFixed(2)
            totalApplied[i]['deductable'] = parseFloat(arr1[i]['deductable']).toFixed(2)
            totalApplied[i]['ptBalance'] = parseFloat(arr1[i]['ptBalance']).toFixed(2)
            totalApplied[i]['billBalance'] = (
                parseFloat(totalApplied[i]['amountBilled']) +
                parseFloat(totalApplied[i]['appliedAmount']) +
                parseFloat(totalApplied[i]['adjustment'])
            ).toFixed(2)
        }
        return totalApplied
    },
    computedTotalPaymentApplied({
        totalApplied,
        subApplied,
    }: {
        totalApplied: {}[],
        subApplied: {}[],
    }){
        totalApplied.forEach((obj1, index1) => {
            let tempObj = {
                appliedAmount: 0,
                adjustment: 0,
                patientPaid: 0,
                billBalance: 0
            }
            subApplied.forEach(obj2 => {
                let sub = obj2['codeAssignCondition']
                tempObj['adjustment'] += parseFloat(sub[index1]['adjustment'])
                tempObj['appliedAmount'] += parseFloat( sub[index1]['appliedAmount'])
                tempObj['patientPaid'] += parseFloat( sub[index1]['patientPaid'])
                tempObj['billBalance'] = parseFloat(obj1['amountBilled']) + tempObj['appliedAmount'] + tempObj['adjustment']
            });
            obj1['adjustment'] = tempObj['adjustment'].toFixed(2)
            obj1['appliedAmount'] = tempObj['appliedAmount'].toFixed(2)
            obj1['patientPaid'] = tempObj['patientPaid'].toFixed(2)
            obj1['billBalance'] = tempObj['billBalance'].toFixed(2)
        })
        return totalApplied
    },
    computedClaimApplied({ obj }: { obj: {} }) {
        let tempObj = {
            amount: 0,
            appliedAmount: 0,
            adjustment: 0,
            claimBalance: 0,
            primaryPaid: 0,
            secondaryPaid: 0,
            thirdPaid: 0,
            status: '',
        }
        for (let i = 0; i < obj['totalApplied'].length; i++) {
            tempObj['adjustment'] += parseFloat(obj['totalApplied'][i]['adjustment'])
            tempObj['claimBalance'] += parseFloat(
                obj['totalApplied'][i]['billBalance'],
            )
            tempObj['appliedAmount'] += parseFloat(
                obj['totalApplied'][i]['appliedAmount'],
            )
            tempObj['primaryPaid'] += parseFloat(
                obj['totalApplied'][i]['primaryPaid'],
            )
            tempObj['secondaryPaid'] += parseFloat(
                obj['totalApplied'][i]['secondaryPaid'],
            )
            tempObj['thirdPaid'] += parseFloat(
                obj['totalApplied'][i]['thirdPaid'],
            )
        }
        obj['adjustment'] = tempObj['adjustment'].toFixed(2)
        obj['claimBalance'] = tempObj['claimBalance'].toFixed(2)
        obj['appliedAmount'] = tempObj['appliedAmount'].toFixed(2)
        obj['primaryPaid'] = tempObj['primaryPaid'].toFixed(2)
        obj['secondaryPaid'] = tempObj['secondaryPaid'].toFixed(2)
        obj['thirdPaid'] = tempObj['thirdPaid'].toFixed(2)
        return obj
    },

    spliceArrayItem({
        objectArr,
        spliceKey,
        spliceVlaue,
    }: {
        objectArr: { [key in string]: any }[]
        spliceKey: string
        spliceVlaue: any
    }) {
        objectArr?.forEach((item: any) => {
            item[spliceKey] = item[spliceKey]?.concat(spliceVlaue)
        })

        return objectArr
    },
    handleClaimDiaCode({ diagnosisArray }: { diagnosisArray: {}[] }) {
        let healthCareCode: {}[] = []
        if (u.isArr(diagnosisArray)) {
            diagnosisArray.forEach((diagnosis, index) => {
                let obj = {}
                obj['diagnosisTypeCode'] = index === 0 ? 'ABK' : 'ABF'
                let rg = /\./g
                let code = diagnosis?.['code'].replace(rg, '')
                obj['diagnosisCode'] = code
                healthCareCode.push(obj)
            })
            return healthCareCode
        }
    },
    handleClaimServiceLine({ procedureArray }: { procedureArray: {}[] }) {
        if(Array.isArray(procedureArray)){
            let serviceLines: {}[] = []
            procedureArray.forEach((procedure) => {
                if (get(procedure, 'code')) {
                    let obj = {}
                    obj['serviceDate'] =
                        get(procedure, 'newObject', '')?.[2] +
                        get(procedure, 'newObject', '')?.[0] +
                        get(procedure, 'newObject', '')?.[1]
                    set(obj, 'professionalService.procedureIdentifier', 'HC')
                    set(
                        obj,
                        'professionalService.lineItemChargeAmount',
                        get(procedure, 'charge'),
                    )
                    set(obj, 'professionalService.procedureCode', get(procedure, 'code'))
                    set(obj, 'professionalService.measurementUnit', 'UN')
                    set(obj, 'professionalService.serviceUnitCount', '1')
                    set(
                        obj,
                        'professionalService.compositeDiagnosisCodePointers.diagnosisCodePointers',
                        [],
                    )
                    let codePointer = get(procedure, 'icdStr')
                    for (let i in (codePointer ?? {})) {
                        obj['professionalService']['compositeDiagnosisCodePointers'][
                            'diagnosisCodePointers'
                        ].push(
                            (codePointer?.[i] as any).charCodeAt() - 16 > 57
                                ? `1${String.fromCharCode((codePointer?.[i] as any).charCodeAt() - 26)}`
                                : String.fromCharCode((codePointer?.[i] as any).charCodeAt() - 16),
                        )
                    }
                    serviceLines.push(obj)
                } else {
                    return false
                }
            })
            return serviceLines
        }
    },
    concatInnerKey({
        array,
        outerPath,
        innerPath,
    }: {
        array: {}[]
        outerPath: string
        innerPath: string
    }) {
        array.forEach((each) => {
            let innerArray = get(each, innerPath)
            let innerStrArr: string[] = []
            innerArray.forEach((innerData) => {
                innerStrArr.push(innerData.replaceAll(' ', '').split('-')[0])
            })
            innerStrArr.length
                ? set(
                    each,
                    outerPath,
                    get(each, outerPath) + ':' + innerStrArr.join(';'),
                )
                : ''
        })
        console.error(array)
        return array
    },
    ConditionMatching({
        arr,
        strSearch,
        key = 'key',
        value = 'value',
    }: {
        arr: Object[]
        strSearch: string
        key?: string
        value?: string
    }) {
        let reg = new RegExp(`${strSearch}`, 'i')
        let searchArr: any[] = []
        arr.forEach((obj) => {
            if (reg.test(get(obj, key) as string)) {
                searchArr.push(...(get(obj, value) as any[]))
            }
        })
        if (searchArr.length != 0)
            return `IN (${Array.from(new Set(searchArr)).toString()})`
        return ''
    },
    getInnerListValue({
        outList,
        outKey,
        outValue,
        innerListKey,
        innerKey,
        innerValue,
        innerKey2,
    }: {
        outList: {}[]
        outKey: string
        outValue: any
        innerListKey: string
        innerKey: string
        innerValue: any
        innerKey2: string
    }) {
        for (let i = 0; i < outList.length; i++) {
            if (get(outList[i], outKey) === outValue) {
                let j = 0,
                    innerList = get(outList[i], innerListKey)
                for (j = 0; j < innerList.length; j++) {
                    if (get(innerList[j], innerKey) === innerValue) {
                        return get(innerList[j], innerKey2)
                    }
                }
                if (!innerList.length || j === innerList.length) return ''
            }
        }
    },
    setInnerListValue({
        outList,
        outKey,
        outValue,
        innerListKey,
        innerKey,
        innerValue,
        innerKey2,
        innerValue2,
    }: {
        outList: {}[]
        outKey: string
        outValue: any
        innerListKey: string
        innerKey: string
        innerValue: any
        innerKey2: string
        innerValue2: any
    }) {
        for (let i = 0; i < outList.length; i++) {
            if (get(outList[i], outKey) === outValue) {
                let j = 0,
                    innerList = get(outList[i], innerListKey)
                for (j = 0; j < innerList.length; j++) {
                    if (get(innerList[j], innerKey) === innerValue) {
                        set(innerList[j], innerKey2, innerValue2)
                        return outList
                    }
                }
                if (!innerList.length || j === innerList.length) {
                    innerList[j] = {
                        [innerKey]: innerValue,
                        [innerKey2]: innerValue2,
                    }
                    return outList
                }
            }
        }
    },
    /**
     * @description 根据 每页的个数 和 第几页 进行分页,返回某一页的数据
     * @param listObject
     * @param pageNumber
     * @param count
     */
    splitPage({
        listObject,
        pageNumber,
        count,
    }: {
        listObject: Array<any>
        pageNumber: any
        count: any
    }) {
        if (!listObject) {
            return []
        }
        pageNumber =
            typeof pageNumber == 'string' ? parseInt(pageNumber) : pageNumber
        count = typeof count == 'string' ? parseInt(count) : count
        const listLength = listObject.length
        if (listLength - (pageNumber - 1) * count < count) {
            return listObject.slice((pageNumber - 1) * count)
        } else {
            return listObject.slice((pageNumber - 1) * count, pageNumber * count)
        }
    },
    sortByCase({
        objArr,
        path,
        sortOrder,
    }: {
        objArr: {
            [key in string]: any
        }[]
        path: any
        sortOrder: any
    }) {
        if (u.isArr(objArr)) {
            return orderBy(
                objArr,
                [(item) => get(item, path)?.replace(/\s*/g, '').toLowerCase()],
                [sortOrder],
            )
        }
        return 'object is not array'
    },
    findIndex({
        objArr,
        key,
        value,
    }: {
        objArr: {}[]
        key: string
        value: any
    }): number {
        return findIndex(objArr, { [key]: value })
    },
    // 转换保险卡
    transInsurance({ insuranceList }: { insuranceList: Array<any> }): Array<any> {
        // 默认显示
        let defaultContent = '--'
        insuranceList.forEach((insurance) => {
            switch (insurance.tage & 0xf) {
                // 如果是medical insurance类型
                case 0:
                    set(
                        insurance,
                        'name.data.line1',
                        insurance.name.data.companyName || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line2',
                        insurance.name.data.planOrMedicalGroup || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line3',
                        insurance.name.data.memberName || defaultContent,
                    )
                    set(insurance, 'name.data.line4', insurance.name.data.memberId) ||
                        defaultContent
                    // search显示专用
                    set(insurance, 'name.data.show1', 'Insurance Company Name')
                    set(insurance, 'name.data.show2', 'Insurance Plan / Medical Group')
                    set(insurance, 'name.data.show3', 'Insured Name')
                    set(insurance, 'name.data.show4', 'Insurance ID #')
                    break
                // 如果是worker comp
                case 2:
                    set(
                        insurance,
                        'name.data.line1',
                        insurance.name.data.insurance.companyName || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line2',
                        insurance.name.data.insurance.claim || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line3',
                        insurance.name.data.employmentInfo.name || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line4',
                        insurance.name.data.dateOfInjury || defaultContent,
                    )
                    // search显示专用
                    set(insurance, 'name.data.show1', 'Insurance Company Name')
                    set(insurance, 'name.data.show2', 'Claim #')
                    set(insurance, 'name.data.show3', 'Employer Name')
                    set(insurance, 'name.data.show4', 'Date of Injury')
                    break
                // 如果是personal injury
                case 4:
                    set(
                        insurance,
                        'name.data.line1',
                        insurance.name.data.attorneyInfo.name || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line2',
                        insurance.name.data.attorneyInfo.phone || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line3',
                        insurance.name.data.attorneyInfo.contactName || defaultContent,
                    )
                    set(
                        insurance,
                        'name.data.line4',
                        insurance.name.data.dateOfInjury || defaultContent,
                    )
                    // search显示专用
                    set(insurance, 'name.data.show1', 'Attorneys Name')
                    set(insurance, 'name.data.show2', 'Phone #')
                    set(insurance, 'name.data.show3', 'Contact Name')
                    set(insurance, 'name.data.show4', 'Date of Injury')
                    break
            }
        })
        return insuranceList
    },
    extractFieldsToOtherPlace({
        array,
        sourceFieldsArr,
        originFieldArr,
    }: {
        array: {}[]
        sourceFieldsArr: []
        originFieldArr: []
    }) {
        for (let i = 0; i < array.length; i++) {
            for (let j = 0; j < sourceFieldsArr.length; j++) {
                let field = get(array[i], sourceFieldsArr[j])
                log.debug(originFieldArr[j])
                log.debug(field)

                set(array[i], originFieldArr[j], field)
            }
        }
        return array
    },
    spliceAnyItemOfObjectArray({
        objArr,
        pathArr,
        separator,
    }: {
        objArr: { [key in string]: any }[]
        pathArr: string[]
        separator: string
    }): string[] {
        if (u.isArr(objArr)) {
            return objArr.map((item) => {
                return join(
                    pathArr.map((path) => get(item, path)),
                    separator,
                )
            })
        }
        return []
    },
    // 筛选所有release的文档
    filterReleaseDoc({ docArr }: { docArr: {}[] }): {}[] {
        let filterDoc: {}[] = []
        docArr.forEach((curDoc) => {
            let type = get(curDoc, 'type', '').toString()
            if (type.substring(type.length - 1) as any % 2 === 1) {
                filterDoc.push(curDoc)
            }
        })
        return filterDoc
    },
    getTopNumbers({ arr, number }: { arr: any[]; number: number }) {
        return arr.splice(0, +number)
    },
    setValueByMarch({
        array,
        targetPath,
        marchArr,
        putValuePathArr,
        valueArr,
        errorArr,
    }: {
        array: {}[]
        targetPath: string
        marchArr: string[]
        putValuePathArr: string[]
        valueArr: string[]
        errorArr: string[]
    }) {
        array.forEach(($item) => {
            putValuePathArr.forEach((path, index) => {
                if (marchArr.includes(get($item, targetPath))) {
                    set($item, path, valueArr[index])
                } else {
                    set($item, path, errorArr[index])
                }
            })
        })
        return array
    },
    setListIndex({ arr, indexKey }: { arr: {}[]; indexKey: number | string }) {
        arr.forEach((_item, index) => {
            set(_item, indexKey, index < 10 ? '0' + (index + 1) : index + 1 + '')
        })
        return arr
    },
    handlePayRecord({
        payRecordArray,
        forReasonRecord,
        newFee,
    }: {
        payRecordArray: {}[]
        forReasonRecord: {}
        newFee: string | number
    }) {
        // 没有reason for fee 记录
        if (!payRecordArray.length)
            return {
                status: 'Paid',
                curBalance: '0.00',
                paymentStatusColor: '#2fb355',
            }
        if (payRecordArray.length > 1 || !get(forReasonRecord,"id")) {
            if (get(forReasonRecord, 'tage') === 6) {
                // replace后pending
                return {
                    status: 'Pending',
                    curBalance: newFee,
                    paymentStatusColor: '#f8ae29',
                }
            }
            let fee: number = 0
            payRecordArray.forEach((curPayRecord) => {
                fee +=
                    get(curPayRecord, 'tage') == 0
                        ? get(curPayRecord, 'name.data.totalAmount', 0) * 1
                        : 0
            })
            if (get(forReasonRecord, 'tage') === 2) {
                // replace后pending
                return {
                    status: 'Pending Eligibility Verification',
                    curBalance: (fee+(+newFee)).toFixed(2),
                    paymentStatusColor: '#f8ae29',
                }
            }
            return fee == 0
                ? { status: 'Paid', curBalance: '0.00', paymentStatusColor: '#2fb355' }
                : {
                    status: 'Unpaid',
                    curBalance: fee.toFixed(2),
                    paymentStatusColor: '#e24445',
                }
        } else {
            // reason 在insurance下
            if (get(forReasonRecord, 'tage') === 2) {
                return {
                    status: 'Pending Eligibility Verification',
                    curBalance: (+newFee).toFixed(2),
                    paymentStatusColor: '#f8ae29',
                }
            } else if (get(forReasonRecord, 'tage') === 3) {
                return {
                    status: 'Eligibility Verified',
                    curBalance: (+newFee).toFixed(2),
                    paymentStatusColor: '#2988e6',
                }
            } else if (get(forReasonRecord, 'tage') === 6) {
                // replace后pending
                return {
                    status: 'Pending',
                    curBalance: newFee,
                    paymentStatusColor: '#f8ae29',
                }
            }
            return get(forReasonRecord, 'tage') === 1
                ? { status: 'Paid', curBalance: '0.00', paymentStatusColor: '#2fb355' }
                : {
                    status: 'Unpaid',
                    curBalance: get(forReasonRecord, 'name.data.totalAmount'),
                    paymentStatusColor: '#e24445',
                }
        }
    },
    billStatus({ objArr }: { objArr: { [key in string]: any }[] }) {
        if (u.isArr(objArr)) {
            return objArr.map((item) => {
                switch (item.tage) {
                    case 0:
                        // Unpaid
                        return {
                            ...item,
                            payStatus: 'Unpaid',
                            payStatusColor: '#fb5051',
                            accountStatusColor: '#fb5051',
                        }
                    // paid
                    case 1:
                        return {
                            ...item,
                            payStatus: 'Paid',
                            payStatusColor: '#2FB355',
                            accountStatusColor: '#333333',
                        }
                    //  Unpaid
                    case 2:
                        return {
                            ...item,
                            payStatus: 'Unpaid',
                            payStatusColor: '#fb5051',
                            accountStatusColor: '#fb5051',
                        }
                    //  Unpaid
                    case 3:
                        return {
                            ...item,
                            payStatus: 'Unpaid',
                            payStatusColor: '#fb5051',
                            accountStatusColor: '#fb5051',
                        }
                    //  Refunded
                    case 4:
                        return {
                            ...item,
                            payStatus: 'Refunded',
                            payStatusColor: '#999999',
                            accountStatusColor: '#333333',
                        }
                    //  Past Due
                    case 5:
                        return {
                            ...item,
                            payStatus: 'Past Due',
                            payStatusColor: '#999999',
                            accountStatusColor: '#333333',
                        }
                    // paid
                    case 6:
                        return {
                            ...item,
                            payStatus: 'Paid',
                            payStatusColor: '#2FB355',
                            accountStatusColor: '#333333',
                        }
                    default:
                        break
                }
            })
        }
        return []
    },
    setReferProperty({
        objectArr,
        referObject,
        arr,
        valueArr,
        errorArr,
    }: {
        objectArr: { [key in string]: any }[]
        referObject: { [key in string]: any }
        arr: any
        valueArr: any
        errorArr: any
    }) {
        if (u.isArr(objectArr)) {
            for (const key in referObject) {
                objectArr.forEach((item) => {
                    if (item['styleName'] === key) {
                        for (let index = 0; index < item['styleValue'].length; index++) {
                            for (let i in arr) {
                                if (
                                    item?.['styleValue']?.[index]?.['value'] === referObject[key]
                                ) {
                                    item['styleValue'][index][arr[i]] = valueArr[i]
                                } else {
                                    item['styleValue'][index][arr[i]] = errorArr[i]
                                }
                            }
                        }
                        return item?.['styleValue']
                    }
                })
            }
            return objectArr
        }
        return []
    },
    allPayRecordStatus({ objArr }: { objArr: { [key in string] }[] }) {
        if (u.isArr(objArr)) {
            let tage = 0

            if (objArr.length === 0) {
                return {
                    payStatus: 'Paid',
                    payStatusColor: '#2fb355',
                }
            } else {
                let appointmentFee = objArr.filter((item) =>
                    get(item, 'name.data.record.isForReason'),
                )
                if (objArr.length === 1 && appointmentFee.length !== 0) {
                    tage = get(appointmentFee[0], 'tage')
                } else {
                    tage = objArr.map((item) => get(item, 'tage')).every((t) => t == 1 || t == 4)
                        ? 1
                        : 0
                }
                switch (tage) {
                    case 0:
                        return {
                            payStatus: 'Unpaid',
                            payStatusColor: '#fb5051',
                        }
                    case 1:
                        return {
                            payStatus: 'Paid',
                            payStatusColor: '#2fb355',
                        }
                    case 2:
                        return {
                            payStatus: 'Pending Eligibility Verification',
                            payStatusColor: '#f8ae29',
                        }
                    case 3:
                        return {
                            payStatus: 'Eligibility Verified',
                            payStatusColor: '#2fb355',
                        }
                    case 6:
                        return {
                          payStatus: 'Pending',
                          payStatusColor: '#f8ae29',
                        }
                    default:
                        return {
                            payStatus: 'Unpaid',
                            payStatusColor: '#fb5051',
                        }
                }
            }
        }
        return []
    },
    //  remove objArr which object without the key
    removeObjectByNoKey({
        objArray,
        keyPath,
    }: {
        objArray: {}[]
        keyPath: string
    }) {
        let newArray: {}[] = []
        objArray.forEach((obj) => {
            if (has(obj, keyPath)) newArray.push(obj)
        })
        return newArray
    },
    dealProModifiers({ procedureArr }: { procedureArr: {}[] }) {
        procedureArr.forEach((procedureObj) => {
            let modifiers: string[] = get(procedureObj, 'modifiers', [])
            if (modifiers) {
                let abbrModifiers: string[] = []
                modifiers.forEach((curModifiers) => {
                    abbrModifiers.push(curModifiers.split('-')[0].trim())
                })
                set(
                    procedureObj,
                    'abbrModifiers',
                    `${get(procedureObj, 'code')} - ${abbrModifiers.join(';')}`,
                )
            } else {
                set(procedureObj, 'abbrModifiers', get(procedureObj, 'code'))
            }
        })
        return procedureArr
    },
    removeObjs({
        object,
        values,
        path,
    }: {
        object: {}[]
        values: (string | number)[]
        path: string
    }) {
        if (u.isArr(object)) {
            for (let i = 0; i < object.length; i++) {
                if (values.includes(get(object[i], path))) {
                    object.splice(i, 1)
                    i--
                }
            }
            return object
        }
    },
    getByCalculate({
        sourceArray,
        prop,
        operated,
        operator,
        result,
    }: {
        sourceArray: {}[]
        prop: string
        operated: number
        operator: string
        result: number
    }) {
        let resultArray: {}[] = []
        sourceArray.forEach((item) => {
            if (operator === '&') {
                if ((item[prop] & operated) != result) {
                    resultArray.push(item)
                }
            }
        })
        return resultArray
    },
    filterAndPaginate({ items, keyword, type, currentPage, itemsPerPage }: {
        items: productItem[],
        keyword: string,
        type: string,
        currentPage: number | string,
        itemsPerPage: number | string
    }): productItem[] {


        if (type == 'Durable Medical Equipment') type = "DME"
        const formattedKeyword = keyword.replace(/\s+/g, '').toLowerCase();
        // 根据关键字和类型筛选数组
        const filteredItems = items.filter(
            (item) => {
                if (!formattedKeyword) return ((type === "All" || item.type === type) && item.tage === 1);
                const formattedTitle = item.title.replace(/\s+/g, '').toLowerCase();
                return formattedTitle.includes(formattedKeyword) && (type === "All" || item.type === type) && item.tage === 1
            }
        );
        // 计算分页所需的起始和结束索引
        const startIndex = (+currentPage - 1) * +itemsPerPage;
        const endIndex = +startIndex + +itemsPerPage;
        // 返回分页后的结果
        return filteredItems.slice(startIndex, endIndex);
    },
    filterByConditions({
        objArr,
        pathArray,
        compareStr,
    }: {
        objArr: { [key in string]: any }[],
        pathArray: any[],
        compareStr: any[]
    }) {
        if (u.isArr(objArr)) {
            let cloneList = cloneDeep(objArr)
            return cloneList.filter(item => {
                return pathArray.every((path, index) => {
                    return get(item, path) === compareStr[index]
                })
            })
        }
        return []
    },
    extractMergeProduction({
      objectArr,
      collectionName,
      collectionNamePath,
      collectionArrayName,
      collectionArrayNamePath,
    }: {
      objectArr: {[key in string]}[]
      collectionName: string
      collectionNamePath: string
      collectionArrayName: string
      collectionArrayNamePath: string
    }) {
      const result = objectArr.reduce((acc, curr) => {
        const existing = acc.find(item => get(item,collectionNamePath) === get(curr,collectionNamePath));
        if (existing) {
          get(existing,collectionArrayNamePath).push(curr)
        } else {
          let newObject = {}
          let collectionArray:{[key in string]}[] = [] 
          collectionArray.push(curr)
          set(newObject,collectionName,get(curr,collectionNamePath))
          set(newObject,collectionArrayName,collectionArray)
          acc.push(newObject)
        }
        return acc;
      }, []);
      return result
    },
    selectInnerArrToArr({array,path}:{array:{}[],path:string}){
        let innerArray:any[] = [] 
        if(isArray(array)){
            array.forEach(each => {
                innerArray.push(...cloneDeep(get(each,path)))
            });
            return innerArray
        }
        return []
    },
    replaceItemToOriginArrByPath({
        originArr,
        subObject,
        compareObj,
        originPath,
        subPath,
    }:{
        originArr: {}[],
        subObject: {}[],
        compareObj: {},
        originPath: string[],
        subPath: string
    }){
        if (u.isArr(originArr)) {
            originArr.forEach(obj => {
            if(get(compareObj, subPath) === get(obj, originPath[0])){
                set(obj, originPath[1], subObject)
                set(obj, originPath[2], true)
            }
          });
          return originArr
        }
    },
    vitalSignsRangesDisplay({arr,vitalSignsRanges}:{arr:{}[],vitalSignsRanges:{}}){
        // type对应的vital sign 类型
        let mapObj = {
            371201:"BloodPressure",
            373761:"HeartRate",
            376321:"RespiratoryRate",
            378881:"PulseOximetry",
            381441:"Temperature",
            384001:"BloodGlucoseLevels",
            389121:"Weight",
            391681:"BMI",
        }
        // 对应的路径
        let pathObj = {
            "HeartRate":"name.data.heartRateData",
            "RespiratoryRate":"name.data.respiratoryRateData",
            "PulseOximetry":"name.data.pulseOximetryData",
            "Temperature":"name.data.temperatureData",
            "BloodGlucoseLevels":"name.data.bloodGlucoseLevelsData",
            "Weight":"name.data.weightData",
            "BMI":"name.data.bmiData",
        }
        // 判断值是否在range里，并且返回对应key
        let range:Function = function(path,value){
            return findKey(get(vitalSignsRanges,path),(key:{}[])=>{
                if(isArray(key)){
                    for (let i = 0; i < key.length; i++) {
                        const eachKey = key[i];
                        let start = get(eachKey,"start")=="-" ? -Infinity : +get(eachKey,"start", '')
                        let end = get(eachKey,"end")=="+" ? Infinity : +get(eachKey,"end", '')
                        if(["Temperature","Weight","BMI"].includes(path)){
                            if(start <= value && value < end) return true
                        }else{
                            if(start <= value && value <= end) return true
                        }
                    }
                    return false
                }
            })
        }
        let newArr = arr.map(eachData => {
            let vitalType:string = get(mapObj,get(eachData,"type", ''), '')
            if(!vitalType||!(typeof vitalSignsRanges=== "object")){
                return {...eachData,status: "",borderColor: "#DEDEDE",textColor: "#30B354"}
            }
            if(vitalType==="BloodPressure"){
                if(
                    range("BloodPressure.diastolic",get(eachData,"name.data.lowBloodPressure"))=="Goal" && 
                    range("BloodPressure.systolic",get(eachData,"name.data.heightBloodPressure"))=="Goal"
                ){
                    return {...eachData,status: "",borderColor: "#DEDEDE",textColor: "#30B354"}
                }else{
                    return {...eachData,
                        status: `(${range("BloodPressure.systolic",get(eachData,"name.data.heightBloodPressure"))}/${range("BloodPressure.diastolic",get(eachData,"name.data.lowBloodPressure"))})`,
                        borderColor: "#FB5051",
                        textColor: "#FB5051"
                    }
                }
            }else{
                let value = get(eachData,get(pathObj,vitalType))
                if(range(vitalType,value)=="Goal") return {...eachData,status: "",borderColor: "#DEDEDE",textColor: "#30B354"}
                return {...eachData,status: `(${range(vitalType,value)})`,borderColor: "#FB5051",textColor: "#FB5051"}
            }
        });
        return newArr
    },
    matchCompleteByHeader({headers, modelList}:{headers: string[], modelList: string[][] }){
        let matchRes: string[] = []
        headers.forEach((head, headI) => {
            modelList[headI].forEach((model) => {
                if(model.startsWith(head)) {
                    matchRes.push(model)
                }
            })
        })
        return matchRes
    },
    dateMonthFillZero({dateArray}:{dateArray: string[]}){
        return dateArray.map((str, index) => {
            if(index < 2 && (+str) < 10) return str.toString().padStart(2, '0')
            return str
        })
    },
    dateConcatenationProcessing({dateArray}: {dateArray: string[][]}){
        return dateArray.map((date) => {
            if(date.length === 3){
                return date.join('/')
            }else return ''
        })
    },
    synchroRelatedData({originArr, modelArr, detailInfo}: {originArr: {}[], modelArr: string[], detailInfo: {}[] }){
        originArr.forEach(item => {
            if(item['hashCode'] && item['icdStr'] ){
              const icdStr: string = item['icdStr']
              const icd = item['icd']
              let strArr = Array.from(icdStr)
              strArr.forEach((str, index) => {
                const modelIndex = modelArr.indexOf(str)
                if(index != -1 ){
                    icd['icd' + (index + 1)] = detailInfo[modelIndex]['code']
                }
              });
            }
        });
        return originArr
    },
    addIndexToObject({objArr,fromZero=false}:{objArr:{}[],fromZero:boolean}){
        if(isArray(objArr)){
            return objArr.map( (item,index) => {
                set(item,"index",fromZero?index:(index+1>=10?index+1:`0${index+1}`))
                return item
            })
        }
        return objArr
    },
    replaceItemByArray({originArr,newArr,path}:{originArr: {}[],newArr: {}[], path: string}){
        return originArr.map(eachOrigin => {
            if(find(newArr,eachNew=> get(eachNew,path) === get(eachOrigin,path))) return find(newArr,eachNew=> get(eachNew,path) === get(eachOrigin,path))
            return eachOrigin
        });
    },
    splitByFirstStr({originStr, splitStr}: {originStr: string, splitStr: string}){
        let index = originStr.indexOf(splitStr)
        return [originStr.slice(0, index), originStr.slice(index)]
    },

    mergeProducts({ objArr, shippingCostMethod = ''}: { objArr: any[], shippingCostMethod: string }) {
      const cloneList = cloneDeep(objArr)
      return cloneList.reduce((result, product) => {
        let existingProduct = result.find(
          (p) =>
            get(p, 'orderList[0].name.data.orderList[0].facilityName') ===
            get(product, 'name.data.orderList[0].facilityName'),
        )
        if (existingProduct) {
          existingProduct.timeStamp = product.ctime
          existingProduct.orderList = existingProduct.orderList.map((item) =>
            set(item, 'border', '1px solid #dedede'),
          )
          if (
            get(
              product,
              'name.data.orderList[0].productionList[0].appointmentId',
            ) === ''
          ) {
            existingProduct.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'none',
            })
          } else {
            existingProduct.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'block',
            })
          }
          existingProduct.quantity = +existingProduct.quantity + +get(product,'name.data.orderList[0].productionList[0].num')
          existingProduct.totalMoney = +existingProduct.totalMoney + +get(product,'name.data.orderList[0].productionList[0].totalMoney')
          existingProduct.totalMoney= existingProduct.totalMoney.toFixed(2)

          let shippingCost
          if(shippingCostMethod == 'Next Day'){
            shippingCost = +get(product,'name.data.orderList[0].productionList[0].shipping.nextDayShipping')
          }else if(shippingCostMethod == 'Standard(1-3 days)'){
            shippingCost = +get(product,'name.data.orderList[0].productionList[0].shipping.flagRateShipping')
          }
          if(shippingCost){
            existingProduct.shippingCost = +existingProduct.shippingCost + shippingCost * +get(product,'name.data.orderList[0].productionList[0].num')
            existingProduct.shippingCost= existingProduct.shippingCost.toFixed(2)
          }
        } else {
          let shippingCost = ''
          if(shippingCostMethod == 'Next Day'){
            shippingCost= get(product, 'name.data.orderList[0].productionList[0].shipping.nextDayShipping')
          }else if(shippingCostMethod == 'Standard(1-3 days)'){
            shippingCost= get(product, 'name.data.orderList[0].productionList[0].shipping.flagRateShipping')
          }
          const facilityId = get(product, 'name.data.orderList[0].productionList[0].facilityId')
          const sourceFacilityId = shippingCostMethod ? get(product, 'name.data.orderList[0].productionList[0].sourceFacilityId') : null
          let temp: any = {
            facilityName: get(product, 'name.data.orderList[0].facilityName'),
            facilityId,
            sourceFacilityId,
            quantity: get(product, 'name.data.orderList[0].productionList[0].num'),
            totalMoney: get(product, 'name.data.orderList[0].productionList[0].totalMoney'),
            pickUpLocation: get(product, 'name.data.orderList[0].productionList[0].pickUpLocation') ,
            selectIdList: [],
            orderList: [],
            timeStamp: get(product, 'ctime'),
          }
          
          if(shippingCost) {
            temp.shippingCost = (+shippingCost * +get(product, 'name.data.orderList[0].productionList[0].num')).toFixed(2)
          }

          if (
            get(
              product,
              'name.data.orderList[0].productionList[0].appointmentId',
            ) === ''
          ) {
            temp.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'none',
            })
          } else {
            temp.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'block',
            })
          }
          result.push(temp)
        }
        return result
      }, [])
    },

    mergeAdminProducts({ objArr, shippingCostMethod = '', deliveryMethod =''}: { objArr: any[], shippingCostMethod: string, deliveryMethod: string }) {
        const cloneList = cloneDeep(objArr)
        return cloneList.reduce((result, product) => {
          let existingProduct = result.find(
            (p) =>
              get(p, 'orderList[0].name.data.orderList[0].facilityName') ===
              get(product, 'name.data.orderList[0].facilityName'),
          )
          if (existingProduct) {
            existingProduct.timeStamp = product.ctime
            existingProduct.orderList = existingProduct.orderList.map((item) =>
              set(item, 'border', '1px solid #dedede'),
            )
            if (
              get(
                product,
                'name.data.orderList[0].productionList[0].appointmentId',
              ) === ''
            ) {
              existingProduct.orderList.push({
                ...product,
                border: 'unset',
                appointmentShow: 'none',
              })
            } else {
              existingProduct.orderList.push({
                ...product,
                border: 'unset',
                appointmentShow: 'block',
              })
            }
            existingProduct.quantity = +existingProduct.quantity + +get(product,'name.data.orderList[0].productionList[0].num')
            if(deliveryMethod != 'Virtual Store'){
                existingProduct.totalMoney = +existingProduct.totalMoney + +get(product,'name.data.orderList[0].productionList[0].totalMoney')
                existingProduct.totalMoney= existingProduct.totalMoney.toFixed(2).toString()
            }
            if(get(product, 'name.data.orderList[0].productionList[0].docType') != 476161 && deliveryMethod != 'Virtual Store'){
                let shippingCost
                if(shippingCostMethod == 'Next Day'){
                  shippingCost = +get(product,'name.data.orderList[0].productionList[0].shipping.nextDayShipping')
                }else if(shippingCostMethod == 'Standard(1-3 days)'){
                  shippingCost = +get(product,'name.data.orderList[0].productionList[0].shipping.flagRateShipping')
                }
                if(shippingCost){
                  existingProduct.shippingCost = +existingProduct.shippingCost + shippingCost * +get(product,'name.data.orderList[0].productionList[0].num')
                  existingProduct.shippingCost = existingProduct.shippingCost.toFixed(2).toString()
                }
            }
          } else {
            let shippingCost = ''
            if(get(product, 'name.data.orderList[0].productionList[0].docType') == 476161 || deliveryMethod == 'Virtual Store'){
                shippingCost = '0.00'
            }else {
                if(shippingCostMethod == 'Next Day'){
                  shippingCost= get(product, 'name.data.orderList[0].productionList[0].shipping.nextDayShipping')
                }else if(shippingCostMethod == 'Standard(1-3 days)'){
                  shippingCost= get(product, 'name.data.orderList[0].productionList[0].shipping.flagRateShipping')
                }
            }
            let temp: any = {
              facilityName: get(product, 'name.data.orderList[0].facilityName'),
              facilityId: get(product, 'name.data.orderList[0].productionList[0].facilityId'),
              quantity: get(product, 'name.data.orderList[0].productionList[0].num'),
              totalMoney: deliveryMethod == 'Virtual Store' ? '0.00' : get(product, 'name.data.orderList[0].productionList[0].totalMoney'),
              pickUpLocation: get(product, 'name.data.orderList[0].productionList[0].pickUpLocation') ,
              selectIdList: [],
              orderList: [],
              timeStamp: get(product, 'ctime'),
            }
            if(shippingCost) {
              temp.shippingCost = (+shippingCost * +get(product, 'name.data.orderList[0].productionList[0].num')).toFixed(2)
            }
            if (
              get(
                product,
                'name.data.orderList[0].productionList[0].appointmentId',
              ) === ''
            ) {
              temp.orderList.push({
                ...product,
                border: 'unset',
                appointmentShow: 'none',
              })
            } else {
              temp.orderList.push({
                ...product,
                border: 'unset',
                appointmentShow: 'block',
              })
            }
            result.push(temp)
          }
          return result
        }, [])
      },
    arraylenEqual({ arr1, arr2 }: { arr1: any[]; arr2: any[] }) {
      if (isArray(arr1) && isArray(arr2)) {
        return arr1.length === arr2.length
      }
      return false
    },
    mergeStrArray({ arr1, arr2 }: { arr1: string[]; arr2: string[] }) {
      if (isArray(arr1) && isArray(arr2)) {
        return uniq([...arr1, ...arr2])
      }
      return []
    },
    diffStrArray({ arr1, arr2 }: { arr1: string[]; arr2: string[] }) {
      if (isArray(arr1) && isArray(arr2)) {
        return arr2.filter((i) => !arr1.includes(i))
      }
      return []
    },
    extractArrayItem({ objArr, key }: { objArr: object[]; key: string }) {
      if (isArray(objArr)) {
        return Array.from(
          new Set(
            objArr.map((item) => {
              return getPropertyPath(item, key)
                ? get(item, getPropertyPath(item, key))
                : ''
            }),
          ),
        )
      }
      return []
    },
    classifyLocation({
      pickupLocationList,
      locationVertexList,
      shoppingCartList,
      shoppingCartFacilityNamePath,
    }: {
      pickupLocationList: object[]
      locationVertexList: object[]
      shoppingCartList: object[]
      shoppingCartFacilityNamePath: string
    }) {
      const clonePickupLocationList = cloneDeep(pickupLocationList)
      const cloneLocationVertexList = cloneDeep(locationVertexList)
      const cloneShoppingCartList = cloneDeep(shoppingCartList)
      return cloneShoppingCartList.map((eachCart) => {
        let facilityId = get(eachCart, shoppingCartFacilityNamePath)
  
  
        let filterPick = filter(clonePickupLocationList, (eachPick) => {
          return get(eachPick, 'name.data.facilityId') === facilityId
        })
        let locationObjArr: any[] = []
  
        cloneLocationVertexList.forEach((eachLoc) => {
          filterPick.forEach((eachPick) => {
            if (get(eachPick, 'fid') === get(eachLoc, 'id')) {
              locationObjArr.push({
                facilityId,
                pickupLocationId: get(eachPick, 'id'),
                address: get(eachLoc, 'name.basicInfo.location'),
              })
            }
          })
        })
  
        locationObjArr.unshift({
          facilityId: '',
          pickupLocationId: '',
          address: 'Select',
        })
        return {
          facilityName: get(eachCart, 'facilityName'),
          locationObjArr,
          locationOption: locationObjArr.map((item) => item.address),
          selectedOption: 'Select',
        }
      })
    },
    getPickupLocationObj({ objArr }: { objArr: any[] }) {
      if (!u.isBrowser()) return
      if (isArray(objArr)) {
        let selectPickupLocation: any = []
        objArr.forEach((item) => {
          item.locationObjArr.forEach((location) => {
            if (location.address === item.selectedOption) {
              selectPickupLocation.push({
                facilityId: location.facilityId,
                pickupLocationId: location.pickupLocationId,
                pickupLocation: location.address
              })
            }
          })
        })
        return selectPickupLocation
      }
      return []
    },
    selectAllOption({
      objArr,
      keyPath,
      keyValue,
    }: {
      objArr: any[]
      keyPath: string
      keyValue: string
    }) {
      if (isArray(objArr)) {
        return objArr.some((item) => get(item, keyPath) === keyValue)
      } else {
        return false
      }
    },
    accumulateArraySpecifiedItems({objArr,itemPath,initialValue,type='number',decimalNum=0}: {objArr: any[],itemPath: string,initialValue: number,type: string,decimalNum: number}){
      if (isArray(objArr)) {
        let res = objArr.reduce((previousValue, currentValue)=>{
          return +previousValue + +get(currentValue,itemPath)    
        },initialValue).toFixed(decimalNum)

        switch (type) {
          case 'number':
            return res;
          case 'string':
            return res.toString();
          default:
            return res;
        }
      }
      return
    },
    resetObjectArraySpecifiedItems({objArr,targetPath,value,valuePath}: {objArr: any[],targetPath: string,value?: any,valuePath?: string}){
      if (isArray(objArr)) {
        const cloneList = cloneDeep(objArr)
        return valuePath ? cloneList.map(item=>set(item,targetPath,get(item,valuePath))) : cloneList.map(item=>set(item,targetPath,value))
      }
      return 
    },
    productArraySelectionStatus({objArr,keyPath}: {objArr: any[],keyPath: any}){
      if (isArray(objArr)) {
        const cloneList = cloneDeep(objArr)
        cloneList.forEach(item=>{
         let productIdList =  item.orderList.map(product=>{
         if(product?.contentShow && product?.contentShow === 'none'){
            return ""
          } else {
            return get(product,keyPath)
          }
        })
         set(item,'selectIdList',productIdList.filter(id => id!==''))
        })
         return cloneList
      }
      return
    },
    facilityCommodityTax({objArr,taxesTemp,address=''}: {objArr: any[],taxesTemp: any[],address}){
      if (isArray(objArr)) {
        const cloneList = cloneDeep(objArr)
        return cloneList.map(item=>{
          let cityTaxes: number[] = []
          taxesTemp.forEach(t=>{
            const currentCity = t.City.includes("*") ? t.City.replace("*","") : t.City
            const regex = new RegExp(currentCity, 'i');
            if (regex.test(address ? address : item.pickUpLocation)) {
              cityTaxes.push(t.Rate.replace('%','')/100)
            }
          })
          const taxRate: any = max(cityTaxes) ? max(cityTaxes) : 0 
          const cuurentTotalMoney = address ? round((+item.totalMoney + item.totalMoney * taxRate + +item.shippingCost),2): round((+item.totalMoney + item.totalMoney * taxRate),2)
          return {
            ...item,
            taxes: (taxRate * item.totalMoney).toFixed(2),
            totalbeforeTax: item.totalMoney,
            totalMoney: cuurentTotalMoney.toFixed(2),
            taxRate  
          }
        })
      }
      return
    },
    // Admin端购买的商品分配需要处理对应显示UI
    productAllocate({productList, pickupLocList, locationList}:{productList:{}[], pickupLocList:{}[], locationList:{}[]}){
        let resultArray:{}[] = []
        const pickAndStock = pickupLocList.map(eachPick => {
            return {
                pickupLocationId: get(eachPick,"id"),
                stock: "",
                location: get(
                    find(locationList,eachLoc => get(eachLoc,"id")===get(eachPick,"fid")),  
                    "location"
                )
            }
        })
        productList.forEach(eachProduct => {
            const variant = get(eachProduct,"name.data.incomingData", []).map(eachVariant=>{
                set(eachVariant,"productName",get(eachProduct,"name.data.productName"))
                set(eachVariant,"coverImgId",get(eachProduct,"name.data.coverImgId"))
                set(eachVariant,"productionId",get(eachProduct,"fid"))
                set(eachVariant,"total","0")
                set(eachVariant,"data.pickAndStock",cloneDeep(pickAndStock))
                return eachVariant
            })
            resultArray.push(...variant)
        });
        return resultArray
    },
    getListByKeyPath({objArr,keyPath}:{objArr: any[] ,keyPath: string}){
      if (isArray(objArr)) {
        return objArr.map(item=>get(item,keyPath))
      }
      return 
    },
    judgeAllocateProduct({array}: {array: {}[]}){
        for (let i = 0; i < array.length; i++) {
            const element = array[i];
            if(+get(element,"title", '') != +get(element,"total", '')) return false
        }
        return true
    },
    setProductInventory({variantList,pickupLocList,locList}:{variantList:{}[],pickupLocList:{}[],locList:{}[]}){
        let locListPick:{}[] = []
        if(isArray(pickupLocList)){
            pickupLocList.forEach(eachPick => {
                const findResult:{} = find(cloneDeep(locList), eachLoc => get(eachLoc,"id") === get(eachPick,"fid")) || {}
                locListPick.push({
                    ...findResult,
                    pickupLocationId: get(eachPick,"id")
                })
            })
        }
        return locListPick.map((eachLoc,index) => {
            let stock: number = 0 
            variantList.forEach(eachVariant => {
                const pickAndStock = get(eachVariant,"data.pickAndStock", '')
                if(pickAndStock?.length){
                    stock += +(get(find(pickAndStock,item=>get(item,"pickupLocationId")===get(eachLoc,"pickupLocationId")),"stock")||0)
                }else{
                    stock = 0
                }
            });
            set(eachLoc,"stock",`${stock}`)
            set(eachLoc,"index",index>10 ? `${index}` : `0${index+1}`)
            return eachLoc
        }) 
    },
    setProductLocationInventory({variantList,pickupLocList,locList}:{variantList:{}[],pickupLocList:{}[],locList:{}[]}){
        // let locListClone = cloneDeep(locList)
        let locListPick:{}[]=[]
        cloneDeep(locList).forEach(eachLoc => {
            const curPick = find(pickupLocList,eachPick=>get(eachPick,"fid")===get(eachLoc,"id"))
            if(curPick){
                set(eachLoc,"pickupLocationId",get(curPick,"id"))
                locListPick.push(eachLoc)
            }            
        })  
        return locListPick.map((eachLoc,index) => {
            let stock: number = 0 
            variantList.forEach(eachVariant => {
                const pickAndStock = get(eachVariant,"data.pickAndStock", [])
                if(pickAndStock?.length){
                    stock += +(get(find(pickAndStock,item=>get(item,"pickupLocationId", '')===get(eachLoc,"pickupLocationId")),"stock", ''))
                }else{
                    stock = 0
                }
            });
            set(eachLoc,"stock",`${stock}`)
            set(eachLoc,"index",index>10 ? `${index}` : `0${index+1}`)
            return eachLoc
        }) 
    },
    setVariantInitValue({variantList,pickupLocId}:{variantList: {}[],pickupLocId: string}){
        if(isArray(variantList)){
            return variantList.map( eachVariant=> {
                const pickAndStock = get(eachVariant,"data.pickAndStock")
                set(eachVariant,"tempStock",get(find(pickAndStock,eachPick=> get(eachPick,"pickupLocationId") === pickupLocId),"stock")||"0")
                set(eachVariant,"index","01")
                return eachVariant
            })
        }
        return variantList
    },
    setValueByKey({array,key1,value1,key2,value2}:{array:{}[],key1:string,value1:any,key2:string,value2:any}){
        if(isArray(array)){
            return array.map(item => {
                if(get(item,key1) === value1){
                    set(item,key2,value2)
                }
                return item
            })
        }
        return array
    },
    shippingAddressTax({objArr,taxesTemp, shippingAddress}: {objArr: any[],taxesTemp: any[], shippingAddress: string}){
        if (isArray(objArr)) {
          const cloneList = cloneDeep(objArr)
          return cloneList.map(item=>{
            let cityTaxes: number[] = []
            taxesTemp.forEach(t=>{
              const currentCity = t.City.includes("*") ? t.City.replace("*","") : t.City
              const regex = new RegExp(currentCity, 'i');
              if (regex.test(shippingAddress)) {
                cityTaxes.push(t.Rate.replace('%','')/100)
              }
            })
            const currentFacilityTaxes: any = max(cityTaxes) ? max(cityTaxes) : 0 
            let totalMoney;
            if(item.shippingCost) totalMoney = (+item.totalMoney + item.totalMoney * currentFacilityTaxes + +item.shippingCost).toFixed(2).toString()
            else totalMoney = (+item.totalMoney + item.totalMoney * currentFacilityTaxes).toFixed(2).toString()

            return {
              ...item,
              taxes: (currentFacilityTaxes * item.totalMoney).toFixed(2).toString(),
              totalbeforeTax: item.totalMoney,
              totalMoney: totalMoney,
              taxRate: currentFacilityTaxes
            }
          })
        }
        return
      },
    intersectionData({
        target_data,
        current_data
        }:{
        target_data:string[],
        current_data:string[]
        }):string[]{
        return intersection(target_data, current_data);
    },
    delVariantStock(
        {
            variantList,
            skuLocList,
            virtualList,
            pickupLocList,
            originalProductTage
        }: {
            variantList: {}[],
            skuLocList: {}[],
            virtualList: {}[],
            pickupLocList: {}[],
            originalProductTage: number
        }) {
        log.debug('%c TS ','background-color:aqua;color: white;font-size: 40px',originalProductTage)
        return variantList.map(eachVariant => {
            const belongSkuLocList = filter(cloneDeep(skuLocList), eachSku => get(eachSku, "esig") === get(eachVariant, "id"))
            const pickAndStock = pickupLocList.map(eachPick => {
                const findSku = find(belongSkuLocList, eachSku => get(eachSku, "fid") === get(eachPick, "id"))
                return {
                    pickupLocationId: get(eachPick, "id"),
                    stock: get(findSku, "name.title") || "0",
                }
            })
            set(eachVariant, "data.pickAndStock", cloneDeep(pickAndStock))
            set(eachVariant, "title", cloneDeep(pickAndStock).reduce((pre, cur) => pre + (+get(cur, "stock")), 0).toString())
            let curOriginVariant = find(virtualList, curVirtual => get(eachVariant, "data.combination") === get(curVirtual, "name.data.combination"))
            set(
                eachVariant,
                "virtualStoreNum",
                curOriginVariant
                    ? originalProductTage  === 1
                        ? get(curOriginVariant, "name.title") 
                        : "0"
                    : "0"
            )
            return eachVariant
        })
    },
    addVariantStock({ variantList, skuLocList, virtualList }:{ variantList:{}[], skuLocList:{}[], virtualList:{}[] }){
        return  variantList.map( eachVariant => {
            let pickAndStock = get(eachVariant,"data.pickAndStock", [])
            pickAndStock.map(eachPickAndStock => {
                let curSku = find(
                    skuLocList,
                    eachSku => get(eachSku,"fid") === get(eachPickAndStock,"pickupLocationId") && get(eachVariant,"data.combination") === get(eachSku,"name.data.combination")
                )
                set(eachPickAndStock,"stock",get(curSku,"name.title")||"0")
                return eachPickAndStock
            })
            set(eachVariant,"data.pickAndStock",cloneDeep(pickAndStock))
            let curOriginVariant = find(virtualList,curVirtual => get(eachVariant,"data.combination") === get(curVirtual,"name.data.combination"))
            set(
                    eachVariant,
                    "virtualStoreNum",
                    curOriginVariant ? get(curOriginVariant,"name.title") : "0"
                ) 
            return eachVariant
        })
    },
    addVariantStockPro({ variantList, skuLocList, pickupLocationId }:{ variantList:{}[], skuLocList:{}[], pickupLocationId:string }){
        return  cloneDeep(variantList).map( eachVariant => {
            let pickAndStock = cloneDeep(get(eachVariant,"data.pickAndStock"))
            const newPickAndStock = (pickAndStock as any)?.map(eachPickAndStock => {
                let curSku = find(
                    skuLocList,
                    eachSku =>
                        get(eachVariant,"data.combination") === get(eachSku,"name.data.combination")
                )
                set(eachPickAndStock,"stock",get(curSku,"name.title")||"0")
                set(eachPickAndStock,"pickupLocationId",pickupLocationId)
                return eachPickAndStock
            })
            set(eachVariant,"data.pickAndStock",cloneDeep(newPickAndStock))
            return eachVariant
        })
    },    
    extractObjArrayBykey({objArr,key,keyValue}:{objArr: object[],key: string,keyValue: any}){
      if (isArray(objArr)) {
          return objArr.filter(item=>get(item,key)===keyValue)
      }
      return
    },
    orderData({
        data,
        path_order_f,
        path_order_s,
        order_f  = 'asc',
        order_s = 'asc',    
    }:{
        data:{[key in string]}[],
        path_order_f:string,
        path_order_s:string,
        order_f?:("asc"|"desc"),
        order_s?:("asc"|"desc")
    }){
  return orderBy(data, [path_order_f, path_order_s], [order_f, order_s]);
},

    mergeInventory({source,target}: {source: any[],target: any[]}){
      const sourceClone = cloneDeep(source)
      const targetClone = cloneDeep(target)
      return targetClone.map(target=>{
       const currentInventory = sourceClone.find(source=>get(target,'name.data.combination')===get(source,'name.data.combination'))
        return currentInventory ? {...target,name: {
          ...target.name,
          title: (+get(currentInventory,'name.title') + +get(target,'name.title')).toString()
        } } : target
      })
    },
    setObjByArray({arr1,arr2,path1,path2,pathSet1,pathSet2}:{arr1:{}[],arr2:{}[],path1:string,path2:string,pathSet1:string,pathSet2:string}){
        return arr1.map(item1=>{
            const findResult = find(
                arr2,
                item2=> get(item2,path2)===get(item1,path1)
            )
            set(item1,pathSet1,get(findResult,pathSet2))
            return item1
        })
    },
    mergeListByKey({target,source,keyPath}:{target:{}[],source: {}[],keyPath: string}){
      const res:{}[] =[...target]
      source.forEach(sourceItem=>{
        const filterList = target.filter(targetItem=>get(sourceItem,keyPath)===get(targetItem,keyPath))
        if (filterList.length===0) {
          res.push(sourceItem)
        }
      })
      return res
    },
    deleteEmptyArray({array,path}:{array:{}[],path:string}){
        return {
            deleteArray: array.filter(item => get(item,path) === ""),
            updateArray: array.filter(item => get(item,path) !== "")
        }
    },
    judgeAndBoolean(conds: any[]){
        if(u.isArr(conds)){
            const result = conds.find(cond => isBooleanFalse(cond)) === undefined
            return !!result
        }
        return false
    },
    formatTrackingHistory({array}: {array: {}[]}){
      const cloneList = cloneDeep(array)
      const sortList = sortBy(cloneList,(track: any)=> - new Date(get(track,'date') as string).getTime())
      return sortList.map((item,index)=>{
        set(item,'statusColor','#333333')
        set(item,'detailColor','#999999')
        set(item,'dateColor','#999999')
        set(item,'nodeColor','#c1c1c1')
        set(item,'timelineTail','block')
        if (index===0) {
          return {
            ...item,
            statusColor: "#2988e6",
            dateColor: "#2988e6",
            detailColor: "#333333",
            nodeColor: "#2988e6"
          }
        }else if(index === sortList.length - 1) {
          return {
            ...item,
            timelineTail: "none"
          }
        } else {
          return item
        }
      })
    },
    selectEachOptions({productionOptions, inventory}: {productionOptions: {}[], inventory: {}[]}){
        let combination = {}
        let result = productionOptions.map(obj => {
            set(obj, 'styleValue[0].color', '#ffffff')
            set(obj, 'styleValue[0].backgroundColor', '#005795')
            set(combination, obj['styleName'], obj['styleValue'][0].value)
            return obj
        })
        return {
            result,combination
        }
    },
    concatVendorPhone({vendorObj}: {vendorObj:{}}){
        const vendor = cloneDeep(vendorObj)
        set(vendor,"name.basicInfo.phoneNumber",`${get(vendor,"name.basicInfo.countryCode")} ${get(vendor,"name.basicInfo.number")}`)
        if(!get(vendor,"name.staffList", '').length) return vendor
        const staffList = get(vendor,"name.staffList", []).map(
            staff => {
                set(staff,"phoneNumber",`${get(staff,"countryCode")} ${get(staff,"number")}`)
                return staff
            }
        )
        set(vendor,"name.staffList",staffList)
        return vendor
    },
    
    // 判断数组中对应的key的值是否填入
    // 值为数组则不能为空，值为字符串，不能为空且不能为"Select"
    judgeArrayValueEmpty({ objArr, keyArr } : { objArr: {}[], keyArr: string[] }){
        if(!objArr.length) return 
        for (let i = 0; i < objArr.length; i++) {
            const obj = objArr[i];
            for (let j = 0; j < keyArr.length; j++) {
                const key = keyArr[j];
                const value = get(obj,key)
                if(value instanceof Array && (!value.length)) return false
                if(typeof value === "string" && (!value || value === "Select")) return false
            }
        }
        return true
    },
    // 判断数组中的phone 或者 email是否已经存在，如果有，红框
    judgeArrayValueExist({ objArr, phoneArr, emailArr }: { objArr: {}[], phoneArr:string[], emailArr: string[] }){
        if(!objArr.length) return objArr
        return objArr.map(
            obj => {
                set(obj,
                    "phoneBdColor",
                    phoneArr.includes(get(obj,"phoneNumber", '')) ?  "0xe24445" : "0xdedede"
                );
                set(obj,
                    "emailBdColor",
                    emailArr.includes(get(obj,"email", '')) ?  "0xe24445" : "0xdedede"
                );
                // set(obj,
                //     "passwordBdColor",
                //     /^\S{6,16}$/.test(get(obj,"password")) ?  "0xe24445" : "0xdedede"
                // );
                return obj 
            }
        )
        
    },
    // 通过初始值设置数组的index，eg.从3开始
    setListIndexByInit({arr,key,init}:{arr:{}[],key:string,init:string}){
        if(!arr.length) return arr
        return arr.map(
            (item,index) => {
                set(item,key,`${index+1+(+init)}`)
                return item
            }
        )
    },
    formatAppointmentTime({appointmentTimeArray,dateComparisonArray}:{appointmentTimeArray: any[],dateComparisonArray: any[]}) {
      return appointmentTimeArray.map(item=>({
       ...item,
       text: dateComparisonArray.filter(date=>date.key==item.key)[0].text,
       durationText: item.duration.replace('-','--')
     }))
    },
    changeSelectProduct({originArr, beChangedObj, changeItemProperty}: {originArr: {}[],beChangedObj: {},  changeItemProperty: {}}){
        return originArr.map(pro => {
            if(get(beChangedObj, 'id') == get(pro, 'productionId')){
                return {
                    ...pro,
                    num: get(changeItemProperty, 'num'),
                    price: get(pro, 'price'),
                    totalMoney: (+get(changeItemProperty, 'num', 0) * +get(pro, 'price', '')).toFixed(2),
                    productInfo: object.concatObjectAttr({obj: get(changeItemProperty, 'property', '')}),
                    property: {
                        Options: get(changeItemProperty, 'property'),
                        recommendOptions: get(changeItemProperty, 'property'),
                    },
                    recommendPrice: get(pro, 'price'),
                    recommendProductInfo: object.concatObjectAttr({obj: get(changeItemProperty, 'property', '')}),
                }
            }
            else return pro
        })
    },
    getErrorFieldByErrorResponse({errors}: {errors: any[]}){
        const verificationObject = {
            'tradingPartnerServiceId': 'Payer ID',
            'tradingPartnerName': 'Payer Name',
            'submitter.organizationName': '32',
            'receiver.organizationName': 'Payer Name',
            'subscriber.memberId': '1a',
            'subscriber.gender': '3',
            'subscriber.dateOfBirth': '3',
            // 'claimInformation.claimFilingCode': 'Global.formData.medicalRecords.name.data.payer.insuranceProgram',
            'providers[0].employerId': '25',
            'providers[0].organizationName': '32',
            'providers[0].address.address1': '33',
            'providers[0].address.city': '33',
            'providers[0].address.state': '33',
            'providers[0].address.postalCode': '33',
            'claimInformation.claimChargeAmount': '28',
            'claimInformation.claimFrequencyCode': '24G',
            'providers[0].taxId': '33',
            'claimInformation.serviceLines\\[\\*\\].professionalService.compositeDiagnosisCodePointers.diagnosisCodePointers': '24E',
            'claimInformation.claimFilingCode': 'Insurance Program'
        }

        return errors.map(err => {
            for (const [veriName, veriValue] of Object.entries(verificationObject)) {
                const regexPattern = veriName.replace(/\\[\\*\\]/g, '\\[\\d+\\]');
                const regex = new RegExp(`^${regexPattern}$`);
                if (regex.test(err.field)) {
                    err = {
                        field: veriValue + ' - ' + err.field,
                        description: err.description
                    };
                    return err
                }
            }
            return err;
          });
    },
    judgeDocListProperty({docList, path, value}: {docList: {[key in string]}[], path: string, value: string}){
        return docList.every(doc => get(doc, path) === value);
    },
    computedArrayPropertySum({array, path}: {array: {}[], path: string} ){
        const sum = array.map(item => {
            const value = +get(item, path)
            return isNaN(value) ? 0 : value;
        })
        .reduce((acc, currentValue) => acc + currentValue, 0);
        return sum.toFixed(2);
    },
    sortByPropertyCaseInsensitive({arr, property, typePath}: {arr: {}[], property: string, typePath: string}){
        return arr.sort(function(a, b) {
            let propA = get(a, property).toUpperCase();
            let propB = get(b, property).toUpperCase();
            if (propA < propB) {
                return -1;
            }else if (propA > propB) {
                return 1;
            }else{
                return get(a, typePath) == 'Primary' ? -1 : 1
            }
        });
    },
    mergeRecommendProducts({ objArr, shippingCostMethod = ''}: { objArr: any[], shippingCostMethod: string }) {
      const cloneList = objArr.map(item=>({...item,totalMoney: round((+get(item, 'num') * +get(item, 'price')),2).toFixed(2)}))
      return cloneList.reduce((result, product) => {
        let existingProduct = result.find(
          (p) =>
            get(p, 'facilityName') ===
            get(product, 'facilityName'),
        )
        if (existingProduct) {
          existingProduct.orderList = existingProduct.orderList.map((item) =>
            set(item, 'border', '1px solid #dedede'),
          )
          if (
            get(
              product,
              'appointmentId',
            ) === ''
          ) {
            existingProduct.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'none',
            })
          } else {
            existingProduct.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'block',
            })
          }
          existingProduct.quantity = +existingProduct.quantity + +get(product,'num')
          existingProduct.totalMoney = +existingProduct.totalMoney + +get(product, 'totalMoney') 
          existingProduct.totalMoney= existingProduct.totalMoney.toFixed(2)

          let shippingCost
          if(shippingCostMethod == 'Next Day'){
            shippingCost = +get(product,'shipping.nextDayShipping')
          }else if(shippingCostMethod == 'Standard(1-3 days)'){
            shippingCost = +get(product,'flagRateShipping')
          }
          if(shippingCost){
            existingProduct.shippingCost = +existingProduct.shippingCost + shippingCost * +get(product,'num')
            existingProduct.shippingCost= existingProduct.shippingCost.toFixed(2)
          }
        } else {
          let shippingCost = ''
          if(shippingCostMethod == 'Next Day'){
            shippingCost= get(product, 'nextDayShipping')
          }else if(shippingCostMethod == 'Standard(1-3 days)'){
            shippingCost= get(product, 'flagRateShipping')
          }
          const facilityId = get(product, 'facilityId')
          const sourceFacilityId = shippingCostMethod ? get(product, 'sourceFacilityId') : null
          let temp: any = {
            facilityName: get(product, 'facilityName'),
            facilityId,
            sourceFacilityId,
            quantity: get(product, 'num'),
            totalMoney: get(product, 'totalMoney') ,
            pickUpLocation: get(product, 'pickUpLocation')   ,
            selectIdList: [],
            orderList: [],
          }
          
          if(shippingCost) {
            temp.shippingCost = (+shippingCost * +get(product, 'num')).toFixed(2)
          }

          if (
            get(
              product,
              'appointmentId',
            ) === ''
          ) {
            temp.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'none',
            })
          } else {
            temp.orderList.push({
              ...product,
              border: 'unset',
              appointmentShow: 'block',
            })
          }
          result.push(temp)
        }
        return result
      }, [])
    },
    filterListByKeyPath({objectList,keyValueList,keyPath}: {objectList: any[],keyValueList: any[],keyPath:string}) {
      return keyValueList.map(value =>(objectList.find(item=>get(item,keyPath) === value)))
    },
    formatGoodList({objectList}:{objectList:any[]}){
     return objectList.map(item=>{
        const { status } = item
        switch (status) {
          case 0:
            set(item,'purchasedShow','none')
            set(item,'deleteShow','block')
            break;
          case 2:
            set(item,'purchasedShow','block')
            set(item,'deleteShow','none')
            break;
          default:
            set(item,'purchasedShow','none')
            set(item,'deleteShow','block')
            break;
        }
        return item
      }) 
    },
    calculateTotalPrice({arr, numPath, pricePath}: {arr:{[key in string]}[], numPath:string, pricePath:string}){
        return arr.map(obj => {
            const num = get(obj, numPath)
            const price = get(obj, pricePath)
            const totalMoney = (num * parseFloat(price)).toFixed(2); 
            return { ...obj, totalMoney };
        });
    },
    shallowCloningPush({
        originArray,
        newArray,
    }: {
        originArray: Array<any>
        newArray: any
    }) {
        originArray.push(newArray)
        return originArray
    },
    generateAttachmentServiceLines({files, submissionDate, controlNumber }: {files: [], submissionDate: string, controlNumber: string}){
        return files.map(file => {
            return {
                payerClaimControlNumber: controlNumber,
                serviceLineDateInformation: {
                    submissionDate: submissionDate
                } ,
                attachmentDetails: {
                    name: file['name'],
                },
            }
        })
    },
    /**
     * Shifts the given element to the start of the array, creating a new array.
     *
     * @param {Object} param0 - object containing the array and element to be added
     * @param {Array<string | number>} param0.array - the original array
     * @param {string | number} param0.element - the element to be added to the start of the array
     * @return {Array<string | number> | undefined} the new array with the added element, or undefined if the input is not an array
     */
    unshiftArray({array, element}: {array: Array<string | number>, element: string | number}){
      if(u.isArr(array)){
        const cloneArray = cloneDeep(array)
        cloneArray.unshift(element)
        return cloneArray
      }
      return
    },
    getUnConfirmFacility(
        {facilities,currentIndex}:{
            facilities: any[]
            currentIndex:number
        }
    ){
        if(facilities.length > currentIndex){
            return facilities[currentIndex]
        }
    },
    filterObjectListByKeyAndValue<T extends Record<string, any>>({
        objectList,
        key,
        value
    }: {
        objectList: Array<T>
        key: string
        value: string
    }) {
        const spacial_reg = /[.*+?^${}()|\\]/g
        const pattern = value.replace(spacial_reg, "\\$&")
        const value_reg = new RegExp(pattern, "i")
        const resList = objectList.filter(obj => value_reg.test(get(obj, key)))
        return resList
    },
    // 筛选掉related app列表中，本会议和replaced的会议
    filterReplaceInRelatedApp({ relatedAppList, curAppId } : { relatedAppList: {}[], curAppId: string }): {}[] {
        if( !relatedAppList.length ) return []
        return filter(cloneDeep(relatedAppList), appointment => {
            return get(appointment, "id") !== curAppId && (appointment['subtype'] & 0xff )!== 15
        })
    },
    addDiagnoseCodeToProcedureList({diagnosisList, procedureList}: {diagnosisList: {}[], procedureList: {}[]}){
        return procedureList.map(pro => {
            if(!pro['isFilledDiag']){
                let icdLen = Object.keys(pro['icd']).length
                let diagnosisNeed = diagnosisList.slice(0, icdLen)
                diagnosisNeed.forEach((dia, index2) => {
                    if(!pro['icd']['icd'+(index2 + 1)]) pro['icd']['icd'+(index2 + 1)] = dia['code']
                })
            }
            return pro
        })
    },
    billingGenerateProcedureList({
        arr,
    }: {
        arr: {}[]
    }) {
        arr?.forEach((obj1) => {
            let num1 = get(obj1, 'charge')
            let num2 = get(obj1, 'quantity')
            let rg = /,|，+/g
            if (rg.test(num1)) num1 = num1.replace(rg, '')
            if (rg.test(num2)) num2 = num2.replace(rg, '')
            let sum = (num1 * num2).toFixed(2)
            set(obj1, 'charge', sum)

        })
        return arr
    },
}


