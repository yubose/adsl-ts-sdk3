import cloneDeep from 'lodash/cloneDeep'
import store from '../../common/store'
import setAPIBuffer from '../setAPIBuffer'
import { dispatchActionType } from '../../constants'
import log from '../../utils/log'

export { remove }

function remove({ pageName, apiObject, dispatch }) {
  return async () => {
    const { dataKey, dataIn } = cloneDeep(apiObject || {})
    const currentVal = await dispatch({
      type: dispatchActionType.GET_DATA,
      payload: {
        dataKey: dataIn ? dataIn : dataKey,
        pageName,
      },
    })

    let populatedCurrentVal = await dispatch({
      type: dispatchActionType.POPULATE_OBJECT,
      payload: { object: currentVal, pageName },
    })

    const { api, id, ...options } = populatedCurrentVal
    let res
    //delete request must have have an id
    if (Array.isArray(id)) {
      for(const element of id){
        try {
          if (store.env === 'test') {
            log.info(
              '%cDelete Object Request',
              'background: purple; color: white; display: block;',
              { ...options, id: element },
            )
          }
          //Buffer check
          const shouldPass = setAPIBuffer({
            api: 'dx',
            element,
          })
          if (!shouldPass) return
          const { data } = await store.level2SDK.commonServices.deleteRequest([
            element,
          ])
          res = data
          if (store.env === 'test') {
            log.info(
              '%cDelete Object Response',
              'background: purple; color: white; display: block;',
              res,
            )
          }
        } catch (error) {
          throw error
        }
      }
    }
    if (typeof id == 'string') {
      try {
        if (store.env === 'test') {
          log.info(
            '%cDelete Object Request',
            'background: purple; color: white; display: block;',
            { ...options, id },
          )
        }
        //Buffer check
        const shouldPass = setAPIBuffer({
          api: 'dx',
          id,
        })
        if (!shouldPass) return
        const { data } = await store.level2SDK.commonServices.deleteRequest([
          id,
        ])
        res = data
        if (store.env === 'test') {
          log.info(
            '%cDelete Object Response',
            'background: purple; color: white; display: block;',
            res,
          )
        }
      } catch (error) {
        throw error
      }
    }
  }
}
