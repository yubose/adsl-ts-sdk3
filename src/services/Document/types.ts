import * as DocumentUtilsTypes from './utilsTypes'

export interface NoteDocumentDeat {
  url: string
  sig: string
  url2?: string
  sig2?: string
  exptime: string
}

export interface NoteDocumentName {
  title: string | undefined
  nonce?: string
  targetRoomName?: string
  user?: string
  tags: string[]
  edit_mode?: number
  type: string
  isEncrypt?: boolean
  isOnS3?: boolean
  isBinary?: boolean
  isZipped?: boolean
  data?: string
  sesk?: string
  notification?: Record<string, any>
  sendTextMessage?: Record<string, any>
  aesk?: string
  orderNumber?: number | string
  vendorId?: number | string
}

export type NoteType =
  | 'text/plain'
  | 'application/json'
  | 'text/html'
  | 'text/markdown'
  | 'image/*'
  | 'application/pdf'
  | 'video/*'

/**
 *  edit_mode: Decimal number which can be converted to be ninary
 *  |   0    |  0   |  0   |
 *  | invite | edit | view |
 *  0 - unable
 *  1 - able
 *
 */

// Create
export type CreateDocumentParams = {
  type?: number
  edge_id: string | Uint8Array
  fid?: string | Uint8Array
  reid?: string | Uint8Array
  title?: string
  user?: string
  sesk?: string
  aesk?: string
  orderNumber?: number | string
  vendorId?: number | string
  documentName?: Record<string, any>
  targetRoomName?: string
  tags?: string[]
  tage?: number
  atimes?: number
  dataType?: number
  mediaType?: NoteType
  dTypeProps?: Record<string, any>
  notification?: Record<string, any>
  sendTextMessage?: Record<string, any>
  paymentNonce?: string
  jwt?: string
  dispatch?: Function
} & Omit<DocumentUtilsTypes.ContentParams, 'type'>
