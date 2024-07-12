import store from '../common/store'

/**
 * Maps ecos.eid to id.
 *
 * @param edge
 * @returns edge
 */
export default function replaceEidWithId(edge: Record<string, any>) {
  let output = Object.assign({}, edge)
  const { eid } = output
  if (eid) {
    const b64Id = store.utils.idToBase64(eid)
    output = { ...output, id: b64Id }
    delete output.eid
    return output
  } else {
    return edge
  }
}
