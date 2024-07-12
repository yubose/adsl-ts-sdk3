import * as u from '@jsmanifest/utils'

export default function mergeDeep(target, source) {
  let output = target
  // let output = Object.assign({}, target)
  if (u.isObj(target) && u.isObj(source)) {
    Object.keys(source).forEach((key) => {
      if (u.isObj(source[key])) {
        if (!(key in target)) {
          // Object.assign(output, { [key]: source[key] })
          output[key] = source[key]
        } else if (u.isObj(target[key])) {
          output[key] = mergeDeep(target[key], source[key])
        } else {
          output[key] = source[key]
        }
      } else if (source[key] === null && target[key] !== null) {
        output[key] = target[key]
      } else {
        // Object.assign(output, { [key]: source[key] })
        output[key] = source[key]
      }
    })
  }else if(u.isObj(target) && source===""){
    output = source
  }
  return output
}
