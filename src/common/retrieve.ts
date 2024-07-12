import upperFirst from 'lodash/upperFirst'
import store from './store'
import type { CommonTypes } from '../ecos'
import { ecosObjType } from '../utils'
import getIdList from '../utils/getIdList'

export type RetrieveEdgeOptions = Parameters<
  typeof store.level2SDK.edgeServices.retrieveEdge
>[0]['options']

export type RetrieveDocumentOptions = Parameters<
  typeof store.level2SDK.documentServices.retrieveDocument
>[0]['options']

export type RetrieveVertexOptions = Parameters<
  typeof store.level2SDK.vertexServices.retrieveVertex
>[0]['options']

function _createRetrieve(type: 'edge' | 'document' | 'vertex') {
  return function onRetrieveRequest(
    id: Uint8Array | string | (Uint8Array | string)[],
    options?:
      | RetrieveEdgeOptions
      | RetrieveDocumentOptions
      | RetrieveVertexOptions,
  ) {
    return store.level2SDK[`${type}Services`][`retrieve${upperFirst(type)}`]({
      idList: getIdList(id),
      options,
    })
  }
}

export const retrieveEdge = _createRetrieve('edge')
export const retrieveDocument = _createRetrieve('document')
export const retrieveVertex = _createRetrieve('vertex')
export const retrieveAuthorizationEdge = (doc: CommonTypes.Doc) =>
  retrieveEdge(
    getIdList(ecosObjType(doc?.eid) === 'EDGE' ? doc?.eid : doc?.esig),
  )
