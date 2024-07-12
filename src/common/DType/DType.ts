import { setBit, getBit } from './utils'
import {
  TOTAL_BITS,
  FLAG_BITS,
  IS_ON_SERVER,
  IS_ZIPPED,
  IS_BINARY,
  IS_ENCRYPTED,
  HAS_EXTRA_KEY,
  SEND_TEXT_MESSAGE,
  IS_EDITABLE,
  DATA_TYPE_START,
  // DATA_TYPE_END,
  // DATA_TYPE_BITS,
  NOTIFICATION,
  RINGTONENOTIFY,
  SENDTOSELF,
  DATA_TYPE_LIST,
  MEDIA_TYPE,
  MEDIA_TYPE_BITS,
  MEDIA_TYPE_LIST,
} from './consts'

class DType {
  // DOC FLAGS
  private _flags = 0

  // DOC Application Data Type
  private _dataType = 0

  // DOC Media Type
  private _mediaType = 0

  constructor(value: number = 0) {
    this.value = value
  }

  public set value(value: number) {
    // flags 把低十位置空
    this.flags =
      (value << (TOTAL_BITS - FLAG_BITS)) >>> (TOTAL_BITS - FLAG_BITS)
    // data type ，处理文件类型
    this.dataType =
      (value << MEDIA_TYPE_BITS) >>> (DATA_TYPE_START + MEDIA_TYPE_BITS)

    // media type
    this.mediaType = value >>> MEDIA_TYPE
  }

  public get value() {
    // merger media type
    let tmpValue = this._mediaType << MEDIA_TYPE
    // merge data type
    tmpValue |= this._dataType << DATA_TYPE_START
    // merge flags
    tmpValue |= this.flags
    return tmpValue
  }

  // DOC FLAGS
  public getFlags() {
    return {
      isOnServer: this.isOnServer,
      isZipped: this.isZipped,
      isBinary: this.isBinary,
      isEncrypted: this.isEncrypted,
      hasExtraKey: this.hasExtraKey,
      isEditable: this.isEditable,
      notification: this.notification, 
      ringToneNotify: this.ringToneNotify,
      sendtoSelf: this.sendtoSelf,
      sendTextMessage: this.sendTextMessage,
    }
  }

  public set flags(value: number) {
    this.isOnServer = !!getBit(value, IS_ON_SERVER)
    this.isZipped = !!getBit(value, IS_ZIPPED)
    this.isBinary = !!getBit(value, IS_BINARY)
    this.isEncrypted = !!getBit(value, IS_ENCRYPTED)
    this.hasExtraKey = !!getBit(value, HAS_EXTRA_KEY)
    this.isEditable = !!getBit(value, IS_EDITABLE)
    this.notification = !!getBit(value,NOTIFICATION)
    this.ringToneNotify = !!getBit(value,RINGTONENOTIFY)
    this.sendtoSelf = !!getBit(value,SENDTOSELF)
    this.sendTextMessage = !!getBit(value, SEND_TEXT_MESSAGE)
  }
  public get flags() {
    return this._flags
  }

  public set isOnServer(value: boolean) {
    this._flags = setBit(this._flags, value, IS_ON_SERVER)
  }
  public get isOnServer() {
    return !!getBit(this._flags, IS_ON_SERVER)
  }

  public set isZipped(value: boolean) {
    this._flags = setBit(this._flags, value, IS_ZIPPED)
  }
  public get isZipped() {
    return !!getBit(this._flags, IS_ZIPPED)
  }

  public set isBinary(value: boolean) {
    this._flags = setBit(this._flags, value, IS_BINARY)
  }
  public get isBinary() {
    return !!getBit(this._flags, IS_BINARY)
  }

  public set isEncrypted(value: boolean) {
    this._flags = setBit(this._flags, value, IS_ENCRYPTED)
  }
  
  public get isEncrypted() {
    return !!getBit(this._flags, IS_ENCRYPTED)
  }

  public set hasExtraKey(value: boolean) {
    this._flags = setBit(this._flags, value, HAS_EXTRA_KEY)
  }
  public get hasExtraKey() {
    return !!getBit(this._flags, HAS_EXTRA_KEY)
  }

  public set isEditable(value: boolean) {
    this._flags = setBit(this._flags, value, IS_EDITABLE)
  }
  public get isEditable() {
    return !!getBit(this._flags, IS_EDITABLE)
  }

  //notification
  public set notification(value: boolean) {
    this._flags = setBit(this._flags, value, NOTIFICATION)
  }
  public get notification() {
    return !!getBit(this._flags, NOTIFICATION)
  }
  public set ringToneNotify(value: boolean) {
    this._flags = setBit(this._flags, value, RINGTONENOTIFY)
  }
  public get ringToneNotify() {
    return !!getBit(this._flags, RINGTONENOTIFY)
  }
  public set sendtoSelf(value: boolean) {
    this._flags = setBit(this._flags, value, SENDTOSELF)
  }
  public get sendtoSelf() {
    return !!getBit(this._flags, SENDTOSELF)
  }
  public set sendTextMessage(value: boolean) {
    this._flags = setBit(this._flags, value, SEND_TEXT_MESSAGE)
  }
  public get sendTextMessage() {
    return !!getBit(this._flags, SEND_TEXT_MESSAGE)
  }
  // Application Data Type
  public set dataType(_type: number) {
    // const type = _type < 0 || _type >= DATA_TYPE_LIST.length ? 0 : _type
    this._dataType = _type
  }
  public get dataType() {
    return this._dataType
  }

  public getDataType() {
    return DATA_TYPE_LIST[this._dataType]
  }

  // Media Type
  public set mediaType(_type: number) {
    const type = _type < 0 || _type >= MEDIA_TYPE_LIST.length ? 0 : _type
    this._mediaType = type
  }
  public get mediaType() {
    return this._mediaType
  }

  public setMediaType(mediaType: string) {
    const type = MEDIA_TYPE_LIST.findIndex((header) => {
      let val = RegExp(`^${header}\/`).test(mediaType)
      return val
    })
    this._mediaType = type === -1 ? 0 : type
  }

  public getMediaType() {
    return MEDIA_TYPE_LIST[this.mediaType]
  }
}

export default DType
