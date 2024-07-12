import JSBI from 'jsbi'

export default class FuzzyIndexCreator {
  initialMapping(indexStr: string) {
    indexStr = indexStr.toLowerCase()
    //replace the double char first

    indexStr = indexStr.replace(/[aeiouy]+/g, 'a')
    indexStr = indexStr.replace('^gh', 'g')
    //todo: need to talk with Austin about ga, ge for J and ga
    indexStr = indexStr.replace('^g[eiy]', 'j')
    indexStr = indexStr.replace('^geo', 'jo')
    indexStr = indexStr.replace('^gen', 'jn')
    // Chris -> kris, Christina -> kristina
    indexStr = indexStr.replace(/chr/g, 'kr')
    indexStr = indexStr.replace(/[aeiou]r/g, 'a')
    indexStr = indexStr.replace(/c[ei]/g, 'sa')
    indexStr = indexStr.replace(/cc/g, 'c')
    indexStr = indexStr.replace(/dd/g, 'd')
    indexStr = indexStr.replace(/gg/g, 'g')
    indexStr = indexStr.replace(/ll/g, 'l')
    indexStr = indexStr.replace(/mm/g, 'm')
    indexStr = indexStr.replace(/nn/g, 'n')
    indexStr = indexStr.replace(/pp/g, 'p')
    indexStr = indexStr.replace(/rr/g, 'r')
    indexStr = indexStr.replace(/ss/g, 's')
    indexStr = indexStr.replace(/tt/g, 't')
    indexStr = indexStr.replace(/zz/g, 'z')
    indexStr = indexStr.replace(/gh/g, '')
    indexStr = indexStr.replace(/ph/g, 'f')
    indexStr = indexStr.replace(/pt/g, 'd')
    indexStr = indexStr.replace(/ti/g, 's')
    indexStr = indexStr.replace(/ci/g, 's')
    indexStr = indexStr.replace(/cl/g, 'k')
    indexStr = indexStr.replace(/ng/g, 'n')
    indexStr = indexStr.replace(/gn/g, 'n')

    indexStr = indexStr.replace(/h/g, '')
    indexStr = indexStr.replace('^i', 'j')
    indexStr = indexStr.replace('^u', 'j')
    indexStr = indexStr.replace(/[+]/g, '')
    indexStr = indexStr.replace(/\W/g, '`')
    indexStr = indexStr.replace(/0/g, '`')
    indexStr = indexStr.replace(/[123]+/g, '{')
    indexStr = indexStr.replace(/[456]+/g, '|')
    indexStr = indexStr.replace(/[789]+/g, '}')
    indexStr = indexStr.replace('^y', 'a')
    return indexStr
  }

  public toFuzzyInt64(initMapping: string) {
    let asciiChar = [
      ' ',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
      '{',
      '|',
      '}',
    ]
    let hexMapping = [
      0, 1, 2, 11, 3, 1, 4, 5, 0, 1, 6, 7, 8, 9, 9, 1, 2, 10, 8, 11, 3, 1, 12,
      12, 11, 1, 11, 13, 14, 15,
    ]
    let returnvalue = JSBI.BigInt(0)
    for (let i = 0; i < Math.min(initMapping.length, 16); i++) {
      let ch = initMapping.charAt(i)
      let idx = ch === '`' ? 0 : asciiChar.indexOf(ch)
      if (idx >= 0 && idx < hexMapping.length) {
        returnvalue = JSBI.leftShift(returnvalue, JSBI.BigInt(4))
        returnvalue = JSBI.bitwiseOr(returnvalue, JSBI.BigInt(hexMapping[idx]))
      }
    }
    return parseInt(returnvalue.toString())
  }

  toFuzzyHex(initMapping: string) {
    let asciiChar = [
      ' ',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n',
      'o',
      'p',
      'q',
      'r',
      's',
      't',
      'u',
      'v',
      'w',
      'x',
      'y',
      'z',
      '{',
      '|',
      '}',
    ]
    let hexMapping = [
      '0',
      '1',
      '2',
      'B',
      '3',
      '1',
      '6',
      '5',
      '!',
      '1',
      '6',
      '7',
      '8',
      '9',
      '9',
      '1',
      '2',
      'A',
      '8',
      'B',
      '3',
      '1',
      'C',
      'C',
      'B',
      '1',
      'B',
      'D',
      'E',
      'F',
    ]
    let str: string = ''
    for (let i = 0; i < Math.min(initMapping.length, 16); i++) {
      let ch = initMapping.charAt(i)
      let idx = ch === '`' ? 0 : asciiChar.indexOf(ch)
      if (idx >= 0 && idx < hexMapping.length) {
        const hexValue = hexMapping[idx]
        str += hexValue
      }
    }
    return str
  }
}
