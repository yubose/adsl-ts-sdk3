import type { LiteralUnion } from 'type-fest'
import * as nt from 'noodl-types'
import * as c from './constants'
import type builtInFns from './CADL/services/builtIn'
import type ActiveQueue from './ActiveQueue'

export interface State {
  init: {
    initiating: boolean
    done: boolean
    error: null | Error
  }
}

export interface ActiveQueueSubscribers {
  queue: ActiveQueueSubscriber[]
}

export interface ActiveQueueSubscriber {
  (
    queueObject: ActiveQueueObject,
    helpers: ReturnType<ActiveQueue['getHelpers']>,
  ): void
}

export type ActiveQueueSubscribeEvent = keyof typeof c.subscribe

export interface ActiveQueueObject<T extends string = string> {
  id: string
  type: LiteralUnion<T, string>
  queue?: ActiveQueueObject[]
  pageName?: string
  timestamp: string
  error?: Error
  [key: string]: any
}

export type ActiveQueueObjectLocation = 'root' | 'local' | 'object' | 'array'

export type ActiveType = 'emit' | 'init' | 'populate'

export type BuiltInFns = ReturnType<typeof builtInFns> & {
  /**
   * An alert function optionally provided by the clien
   * They must implement the interface shown below
   */
  toast?: (
    message: string,
    opts?: {
      timeout?: number
      /**
       * Type of alert that will appear. Default is "default" which is white
       */
      type?: 'success' | 'error' | 'warning' | 'dark' | 'default'
      /** Cancel button if needed */
      cancel?: string
    },
  ) => void
} & Record<string, any>

export type Root = Record<
  'actions' | 'BaseDataModel' | 'BaseCSS' | 'BasePage' | 'BaseMessage',
  any
> &
  Record<'apiCache', ApiCache> &
  Record<'builtIn', BuiltInFns> &
  Record<'Config', nt.RootConfig & Record<string, any>> &
  Record<
    'Global',
    {
      currentUser?: { vertex?: any } & Record<string, any>
      globalRegister?: (nt.RegisterComponentObject & Record<string, any>)[]
    } & Record<string, any>
  > &
  Record<string, any>

export type ApiCache = Record<
  string,
  {
    cacheTime?: number
    data?: any
    request?: {
      type?: string
      dataIn?: any
      dataOut?: any
      [key: string]: any
    }
    timestamp: string
    type?: any
  }
>

export interface Dispatch<P = any> {
  (action: DispatchAction<any>): Promise<any>
}

export type DispatchPayload =
  | DispatchPayload.AddFunction
  | DispatchPayload.EvalObject
  | DispatchPayload.FontDbOpreate
  | DispatchPayload.GetCache
  | DispatchPayload.GetData
  | DispatchPayload.IfObject
  | DispatchPayload.InsertToIndexTable
  | DispatchPayload.InsertToObjectTable
  | DispatchPayload.Populate
  | DispatchPayload.PopulateObject
  | DispatchPayload.SearchCache
  | DispatchPayload.SetApiBuffer
  | DispatchPayload.SetCache
  | DispatchPayload.UpdateData

export interface DispatchAction<P extends DispatchPayload = DispatchPayload> {
  type: keyof typeof c.dispatchActionType
  payload?: P
}

export namespace DispatchPayload {
  export interface AddFunction {
    pageName?: string
    fn?: (...args: any[]) => any
  }

  export interface EvalObject {
    pageName?: string
    updateObject?: string | Record<string, any> | any[]
  }

  export interface FontDbOpreate {
    funcName?: string
    [key: string]: any
  }

  export interface GetCache {
    cacheIndex: number
  }

  export interface GetData {
    dataKey?: string
    pageName?: string
  }

  export interface IfObject {
    pageName?: string
    updateObject?: any
  }

  export interface InsertToIndexTable {
    doc?: { doc?: any } & Record<string, any>
  }

  export interface InsertToObjectTable {
    doc?: any
  }

  export interface Populate {
    pageName?: string
  }

  export interface PopulateObject {
    copy?: boolean
    object?: any
    pageName?: string
  }

  export interface SearchCache {
    key?: string
    sCondition?: string
  }

  export interface SetApiBuffer {
    apiObject?: Record<string, any>
  }

  export interface SetCache {
    [key: string]: any
  }

  export interface DeleteCache {
    cacheIndex: string
  }

  export interface UpdateData {
    data?: any
    dataKey?: string
    pageName?: string
  }
}

export interface Emit {
  (args: { type: EmitType }): any
}

export type EmitType = keyof typeof c.emitType

export interface BuiltInConsumerGotoFn {
  (args: {
    pageName: string
    goto: nt.GotoObject | nt.GotoUrl
    blank?: string
  }): Promise<void>
}

export interface EmitCallArgs {
  dataKey: Record<string, any>
  actions: any[]
  pageName: string
}

/**
 * Used as a condition when populating objects or arrays. If a reference was encountered it will call this function with the reference. If this function returns true, it will attach a _path_ and _ref_ property on the object or array
 */
export interface ShouldAttachRefFn {
  (ref: string, value: any, parent: Record<string, any> | any[]): boolean
}

export interface UpdateObjectArgs {
  dataKey: any
  dataObject: any
  dataObjectKey?: string
}

export type ConfigKey = string
export type Directory = string
export type FilePath = string
export type FileName = string
