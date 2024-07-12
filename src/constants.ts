export const dispatchActionType = {
  ADD_FUNCTION: 'ADD_FUNCTION',
  EVAL_OBJECT: 'EVAL_OBJECT',
  GET_CACHE: 'GET_CACHE',
  HAS_CACHE: 'HAS_CACHE',
  GET_DATA: 'GET_DATA',
  INSERT_TO_INDEX_TABLE: 'INSERT_TO_INDEX_TABLE',
  INSERT_TO_OBJECT_TABLE: 'INSERT_TO_OBJECT_TABLE',
  POPULATE: 'POPULATE',
  POPULATE_OBJECT: 'POPULATE_OBJECT',
  IF_OBJECT: 'IF_OBJECT',
  SEARCH_CACHE: 'SEARCH_CACHE',
  SET_API_BUFFER: 'SET_API_BUFFER',
  SET_CACHE: 'SET_CACHE',
  DELETE_CACHE: 'DELETE_CACHE',
  UPDATE_DATA: 'UPDATE_DATA',
  UPDATE_LOCAL_STORAGE: 'UPDATE_LOCAL_STORAGE',
  FONTDB_OPREATE: 'FONTDB_OPREATE',
  PULL_INDEX_TABLE: 'PULL_INDEX_TABLE',
  PUSH_INDEX_TABLE: 'PUSH_INDEX_TABLE',
  CLEAR_ROOT: 'CLEAR_ROOT',
  GET_CADLENDPOINT: 'GET_CADLENDPOINT',
  SET_ENCRYPT_BUFFER: 'SET_ENCRYPT_BUFFER',
} as const

export const emitType = {
  ADD_BUILTIN_FNS: 'ADD_BUILTIN_FNS',
  DELETE_PAGE: 'DELETE_PAGE',
  EDIT_DRAFT: 'EDIT_DRAFT',
  SET_CACHE: 'SET_CACHE',
  DELETE_CACHE: 'DELETE_CACHE',
  SET_ROOT_PROPERTIES: 'SET_ROOT_PROPERTIES',
  SET_LOCAL_PROPERTIES: 'SET_LOCAL_PROPERTIES',
  SET_VALUE: 'SET_VALUE',
} as const

export const subscribe = {
  QUEUE_START: 'QUEUE_START',
  QUEUE_END: 'QUEUE_END',
} as const

export const rootTypes = {
  docRoot: 10000,
} as const

export const basicInfo = 'basicInfo'

export enum ShippingDeliveryMethod {
  Shipping = 'Shipping',
}

export enum ShippingTrackMethod {
  Usps = 'USPS',
  Ups = 'UPS',
  FedEx = 'FedEx',
}

export enum ShippingPaymentMethod {
  Card = 'Credit/Debit Card',
}

export enum ShippingPurchaseType {
  InternalUse = 'Internal Use',
  Resale = 'Resale',
}

export enum ShippingResourceType {
  Link = 'link',
  Image = 'link',
}


export type App = Window & typeof globalThis & {
  app: {
    cache: Object,
    meeting: Object,
    navigate: Function,
    uploadProgress: Object
  }
}