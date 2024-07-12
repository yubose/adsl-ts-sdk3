import * as edgeServices from './edges'
import * as vertexServices from './vertexes'
import * as documentServices from './documents'
import * as builtInServices from './builtIn'
import * as remove from './remove'

export default function (key) {
  const fns = {
    ce: edgeServices.create,
    re: edgeServices.get,
    cv: vertexServices.create,
    rv: vertexServices.get,
    cd: documentServices.create,
    rd: documentServices.get,
    dx: remove.remove,
    builtIn: builtInServices.builtIn,
  }
  return fns[key]
}
