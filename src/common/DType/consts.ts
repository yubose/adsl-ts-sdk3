export const TOTAL_BITS = 32
// DOC FLAGS
export const FLAG_BITS = 10
export const IS_ON_SERVER = 0
export const IS_ZIPPED = 1
export const IS_BINARY = 2
export const IS_ENCRYPTED = 3
export const HAS_EXTRA_KEY = 4
export const IS_EDITABLE = 5
//notification
export const NOTIFICATION = 7
export const RINGTONENOTIFY = 8
export const SENDTOSELF = 9
export const SEND_TEXT_MESSAGE = 10
// DOC Application Data Type
export const DATA_TYPE_START = 17
export const DATA_TYPE_END = 26
export const DATA_TYPE_BITS = DATA_TYPE_END - DATA_TYPE_START
export const DATA_TYPE_LIST = <const>['data', 'profile', 'vital']

// DOC Media Type
export const MEDIA_TYPE = 27 // 31 ~ 27: 5
export const MEDIA_TYPE_BITS = TOTAL_BITS - MEDIA_TYPE
export const MEDIA_TYPE_LIST = <const>[
  'others',
  'application',
  'audio',
  'font',
  'image',
  'message',
  'model',
  'multipart',
  'text',
  'video',
]
