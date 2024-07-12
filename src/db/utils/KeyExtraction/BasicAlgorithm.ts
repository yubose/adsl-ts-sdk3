import * as u from '@jsmanifest/utils'
import CheckStopWord from './CheckStopWord'
import { isObject } from '../../../utils'

const checkStopWord = new CheckStopWord()

function getObjValues(obj: Object): string[] {
  let values = Object.values(obj)
  let contentMap = new Map()
  for (const val of values) {
    if (isObject(val)) {
      let rslt2 = getObjValues(val)
      for (const v2 of rslt2) {
        contentMap.set(v2, '')
      }
    } else if (u.isStr(val)) {
      let lval = val.toLowerCase()
      let res = lval.split(/\W+/)
      for (const v2 of res) {
        if (v2.length && !checkStopWord.isStopWord(v2)) {
          contentMap.set(v2, '')
        }
      }
    }
  }
  let result: string[] = []
  for (let key of contentMap.keys()) {
    result.push(key)
  }
  //log.debug('BasicAlgorithm.ts:55', result)
  return result
}
export default function extract(content: any) {
  let rslt: string[] = []
  if (isObject(content)) {
    rslt = getObjValues(content)
  } else if (u.isStr(content)) {
    rslt.push(content)
  }
  return rslt
  // const { data, type, title, user, targetRoomName } = content
  // //let contentArr: string[] = []
  // let contentMap = new Map()
  // if (
  //   data &&
  //   typeof data === 'string' &&
  //   !data.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/g)
  // ) {
  //   caPush(contentMap, data.split(/\W+/))
  // }
  // if (isObject(data)) {
  //   const { isFavorite, ...restOfProps } = data
  //   for (let [_, val] of Object.entries(restOfProps)) {
  //     //contentArr.push(...key.split(/\W+/))
  //     caPush(contentMap, (<string>val).split(/\W+/))
  //   }
  // }
  // if (type) {
  //   caPush(contentMap, type.split(/\W+/))
  // }
  // if (title) {
  //   caPush(contentMap, title.split(/\W+/))
  // }
  // if (user) {
  //   caPush(contentMap, user.split(/\W+/))
  // }
  // if (targetRoomName) {
  //   caPush(contentMap, targetRoomName.split(/\W+/))
  // }
  // // return contentMap.keys
  // // let contentArr = contentMap.keys
  // // const checkStopWord = new CheckStopWord()
  // // const wordMap = contentArr.reduce((acc, word) => {
  // //   const currWord = word.toLowerCase()
  // //   if (currWord && !checkStopWord.isStopWord(currWord)) {
  // //     acc[currWord] = acc[currWord] + 1 || 1
  // //   }
  // //   return acc
  // // }, {})

  // let result: string[] = []
  // for (let key of contentMap.keys()) {
  //   result.push(key)
  // }
  // log.debug('BasicAlgorithm.ts:55', result)
  // return result
}
