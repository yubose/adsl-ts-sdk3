import type { CommonTypes } from '../../ecos'
import { NoteType } from './types'

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }
type XOR<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U

export type ContentParams = XOR<
  { content: Blob | Record<any, any> },
  {
    content: string
    type: NoteType
  }
>

// ContentToBlob
export interface ContentToBlob {
  (content: string | Blob | Record<any, any>, type?: NoteType): Blob
}

// EncryptData
export interface ProduceEncryptDataReturn {
  data: Uint8Array
  isEncrypt: boolean
}
export interface ProduceEncryptData {
  (
    data: Uint8Array | Blob,
    esak?: string | Uint8Array,
    publicKeyOfReceiver?: string,
  ): Promise<ProduceEncryptDataReturn>
}

// ProduceGzipData
export interface ProduceGzipDataReturn {
  data: Uint8Array
  isZipped: boolean
}
export interface ProduceGzipData {
  (data: Uint8Array | Blob,isZipped:boolean): Promise<ProduceGzipDataReturn>
}

export type DocumentToNoteParams = {
  document: CommonTypes.Doc
  edge?: CommonTypes.Edge
  esakOfCurrentUser?: Uint8Array
}
// DocumentToNote
export interface DocumentToNote {
  (DocumentToNoteParams): Promise<any>
}
