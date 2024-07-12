export enum ErrorCodes {
  UNKNOW_ERROR = -1,

  PERMISSION_DENIED = 1,

  UNREGISTERED,
  REGISTERED,

  /* Account */
  PHONE_NUMBER_INVALID = 1000,
  PASSWORD_INVALID,
  VERIFICATION_CODE_INVALID,
  REQUIRED_VERIFICATION_CODE,
  REQUIRED_PASSWORD,
  USER_NOT_FOUND,
  PROFILE_NOT_FOUND,
  UID_INVALID,
  PROFILE_PHOTO_INVALID,
  LOGIN_REQUIRED,

  /* Edges */
  EDGE_DOES_NOT_EXIST = 2000,
  NOTEBOOK_PERMISSION_DENIED,
  NOT_A_NOTEBOOk,
  ROOT_NOTEBOOK_EXIST,
  ROOT_NOTEBOOK_NOT_EXIST,
  ROOT_NOTEBOOK_CANNOT_BE_REMOVED,
  NOTEBOOK_TYPE_INVALID,
  NOT_AN_INVITE,
  NOT_AN_ACCEPTED_INVITE,

  /* Note */
  NOTE_NOT_EXIST = 3000,
  NOTE_PERMISSION_DENIED,
  NOTE_CONTENT_INVALID,
  NOT_A_NOTE,
  NOTEBOOK_ID_NOT_MATCH,
  CONTENT_TOO_LARGE,
  DOWNLOAD_FROM_S3_FAIL,
  DECRYPTING_NOTES_FAIL,

  /* UIDL */

  YAML_PARSE_FAILED = 4000,
  NO_DATA_MODELS_AVAILABLE,
  INVALID_DATAMODEL_KEY,
  ERROR_RETRIEVING_UIDL_DATA,
  INVALID_ROOT_TYPE,

  /* Link */
  INVALID_LINK = 5000,
  LINK_DOES_NOT_EXIST,

  /* Inbox */
  NOT_AN_INBOX = 6000,
  ROOT_INBOX_EXISTS,
  ROOT_INBOX_DOES_NOT_EXIST,

  /**Encrypt/Decrypt */
  ERROR_CREATING_ESAK = 7000,
  ERROR_DECRYPTING_DATA,
}

export const defaultErrorMessages: Record<string, string> = {
  UNKNOW_ERROR: 'error occurred',

  PERMISSION_DENIED: 'permission denied',

  UNREGISTERED: 'account is not registered',
  REGISTERED: 'account is already registered',

  /* Account */
  PHONE_NUMBER_INVALID: 'phone number is invalid',
  PASSWORD_INVALID: 'password is invalid',
  VERIFICATION_CODE_INVALID: 'verification code is invalid',
  REQUIRED_VERIFICATION_CODE: 'verification code is required',
  REQUIRED_PASSWORD: 'password is required',
  USER_NOT_FOUND: 'user is not found',
  PROFILE_NOT_FOUND: 'profile note found',
  UID_INVALID: 'uid is invalid',
  PROFILE_PHOTO_INVALID: 'profile photo is invalid',
  LOGIN_REQUIRED:
    'There is no secretKey present in localStorage. Please log In.',

  /* Edges */
  EDGE_DOES_NOT_EXIST: 'The requested edge does not exist',
  NOTEBOOK_PERMISSION_DENIED: 'notebook permission denied',
  NOT_A_NOTEBOOk: 'not a notebook',
  ROOT_NOTEBOOK_EXIST: 'the root notebook is already exist',
  ROOT_NOTEBOOK_NOT_EXIST: 'the root notebook is not exist',
  ROOT_NOTEBOOK_CANNOT_BE_REMOVED: 'the root notebook cannot be removed',
  NOTEBOOK_TYPE_INVALID: 'notebook type is invalid',
  NOT_AN_INVITE: 'this is not an invite',
  NOT_AN_ACCEPTED_INVITE: ' this is not an accepted invite',

  /* Note */
  NOTE_NOT_EXIST: 'note is not exist',
  NOTE_PERMISSION_DENIED: 'note permission denied',
  NOTE_CONTENT_INVALID: 'note content is invalid',
  NOT_A_NOTE: 'not a note',
  NOTEBOOK_ID_NOT_MATCH: 'notebook id is not match',
  CONTENT_TOO_LARGE: 'content is too large [maximum 32KB]',
  DOWNLOAD_FROM_S3_FAIL: 'download document from s3 fail',
  DECRYPTING_NOTES_FAIL: 'an error occurred while decrypting the shared notes',

  /* Link */
  INVALID_LINK: 'this is not a valid Link type',
  LINK_DOES_NOT_EXIST: 'Link does not exist',

  /* INBOX */
  NOT_AN_INBOX: 'This is not a valid inbox/relation.',
  ROOT_INBOX_EXISTS: 'Root inbox already exists.',
  ROOT_INBOX_DOES_NOT_EXIST: 'There is no root inbox for the user.',

  /* UIDL */

  YAML_PARSE_FAILED: 'failed to parse yaml data',
  NO_DATA_MODELS_AVAILABLE: 'There are no dataModels for this uidl',
  INVALID_DATAMODEL_KEY: 'Please provide a valid dataModel key',
  ERROR_RETRIEVING_UIDL_DATA: 'Could not retrieve data for UIDL dataModel.',
  INVALID_ROOT_TYPE: 'The root type provided is invalid',

  /** Encrypt/Decrypt */

  ERROR_CREATING_ESAK: 'Error happened while creating an esak',
  ERROR_DECRYPTING_DATA: 'Error happened while decrypting data.',
} as const

export interface ConfigArgs {
  code?: number
  name?: keyof typeof ErrorCodes
  message?: string
}
