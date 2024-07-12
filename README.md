## README [English](#En)

# CADL class and utilities

This package contains the CADL class used to process CADL objects in addition to
utility functions used to validate the CADL YAML files.

## To build the validation UI run the following:

```
//to install the dependencies
    npm i

//to build the bundle.js in the public directory
    npm run build
```

## To run the CADL validation UI locally run the following command

```
    npm run start:val_ui
```

then navigate to http://localhost:5000/

### Expect the following errors if a CADL Object is invalid

-InvalidDestination -when page jump destination is not a valid page
-UnableToRetrieveYAML -when something goes wrong in retrieving the yaml file
form S3 -UnableToParseYAML -if there is a parsing error

## To run the CADL test page UI locally run the following command

```
    npm run start:test
```

## To update the @aitmed/cadl package run

```
    git checkout master
    git pull origin master
```

```
    npm run publish:public
```

# MAIN CADL/NOODL Documentation

### CADL - Lvl 2.5 SDK.

This layer is connected to Lvl 2 SDK and noodl-ui-dom. The primary function of
CADL is to parse and translate a noodl yaml file. CADL can resolve references in
noodl file by replacing short-handed variables (marked by ., .., etc.) with values.
It will then go through noodl file, parse it, and replace any
functions with Lvl 2 API commands as appropriate.

CADL is created in the frontend web layer. On creation, its constructor will be
provided with aspectRatio, cadlVersion, and configUrl as parameters. CADL will
have access to a store, which is created using provided parameters of env and
configUrl. This store will have access to Lvl 2 SDK, and implements Lvl 2 SDK's
setters and getters. Inside of CADL constructor, several properties of store
will be redirected, and store's noodlInstance will refer to the CADL.

An integral part of CADL is the root. When CADL is created, initRoot() function
is called, and two things are attached to the empty root: an empty actions {}
object, and an object of builtIn functions, which include things like
createNewAccount, signIn, uploadDocument, etc. This process is completed within
the CADL layer.

Implementation of CADL relies on a few important functions, which are supported
by an array of helper functions. The important ones are:

#### CADL.init()

This function is called to initialize the CADL. This function can take three
parameters (BaseDataModel, BaseCSS, and BasePage), but generally none are
provided. A config variable is declared and assigned the variable retrieved from
Lvl 2 SDK using loadConfig(), and config is destructured and assigned to the
proper variables in CADL. From config, cadlBaseUrl is retrieved, and is used to
locate cadlEndpointUrl. Using the cadlEndpointUrl we get cadlEndpoint, which
contains baseUrl, assetsUrl, and preload. These are vital assets for parsing the
noodl file.

The variable preload can be destructured to receive BasePage, BaseCSS, and
BaseDataModel. These are the base elements in a noodl file; there are separate
'pages' in noodl that needs processing as well, such as SignIn, SignUp, and
DocumentDetails, but these three serve as the base for other pages.
For each of these pages, they
are first retrieved using this.getPage() method, then processed down using
this.processPopulate() method, and finally set into state using
this.newDispatch() method. The key here is the processPopulate() method, which
translates variables that start with ['.', '..', '=', '~'] into their fully
expanded values using a recurssive algorithm. Once this process completes, these
fully parsed objects/functions/variables are updated into root through state
control dispatches.

After the above steps are completed, init() function checks for any items stored
in local storage 'Global', and repeats the above parsing process. This process
is not detected when the web first renders.

#### CADL.initPage()

This is another important method of CADL. Once the app starts, each page in
noodl will need to be rendered separately, and that is the primary function of
initPage(). This function is called in frontend code in src/index.js, and by
createPreparePage() function. This function takes three parameters: pageName, an
empty array denoted skip, and options. pageName variable is self-explanatory;
skip[] can be used to include properties that are not to be "processed," e.g [edge]
will lead to teh edge property of the noodl file to not be processed and will
retain all variable references '..,.,=...etc'; the most notable thing about options is
that once destructured, it contains a variable called evolve, and that must be
true in order for the page to be rendered, otherwise the page will return. The
evolve variable is invoked in frontend code, builtIn functions goto and goBack.

After the processing and evaluating are finished, initPage() then proceeds to
process noodl page in a fashion similar to init(), using processPopulate(), but
also dispatch method.

#### CADL.processPopulate()

This function is the primary function that handles the resolution of noodl files
by processing references of variables in noodl files and replacing them with
their fully extended form. This is specifically being done with the
populateKeys() method, which recursively goes through the noodl file, find any
symbols that signifies a referencing variable, and replace that variable with
its fully extended form.

The function takes in five parameters: source, lookFor, skip, pageName, withFns.
-source: the source page of noodl, written in object format -lookFor: an array of
symbols to look out for, these symbols denote variables at current directory,
parent directory, etc. that must be identified and have related variables
resolved -skip: items to skip while parsing through source file -withFns: a boolean
true or false that denotes whether or not to populate the functions
-pageName: name of the noodl page

#### CADL.dispatch

This function handles the updating of the state(i.e noodl.root) as a result of
return values from apis or builtIn fns.This function is
bounded to the noodl/cadl instance and called within the builtIn fns and the
object services (document, edges, vertexes). Within this function you will see
the logic for 'eval-object.'

#### CADL.newDispatch

This is a lower level dispatch function that gets called to directly affect the
state of the noodl.root through SET_VALUE, DELETE_VALUE, SET_ROOT_PROPERTIES,
SET_LOCAL_PROPERTIES.

## Methods That Can Be Accessed Through CADL/NOODL:

### These functions can be accessed through builtInFns, which are attached to root as root.builtIn

| Method                                                                                                 | Returns                 | Description                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **builtInFns.string**                                                                                  |                         |                                                                                                                                                                                                                   |
| `.formatUnixtime_en(unixTime: number)`                                                                 | `string`                | Returns a date-time string associated with the given number.                                                                                                                                                      |
| `.formatUnixtimeLT_en(unixTime: number)`                                                               | `string`                | Return a time string associated with the given number.                                                                                                                                                            |
| `.formatDurationInSecond(unixTime: number)`                                                            | `string`                | Returns the amount of time that has elapsed since Dec 31, 1969, 4:00 PM as a string                                                                                                                               |
| `.concat(stringArr: string[])`                                                                         | `string`                | Concatenate an array of strings into one string, and returns the string                                                                                                                                           |
| `.equal({ string1, string2 })`                                                                         | `boolean`               | Compare the two input strings and returns true if they are equal, otherwise returns false                                                                                                                         |
| `.getFirstChar(string: string)`                                                                        | `string`                | Returns the first character of the string in upperCase                                                                                                                                                            |
| `.retainNumber({value:any})`                                                                           | `number`                | Parses the value into a number                                                                                                                                                                                    |
| **builtInFns.object**                                                                                  |                         |                                                                                                                                                                                                                   |
| `.remove({ object, key })`                                                                             | `void`                  | Creates a deep clone of the object, and removes the value in the deep clone at location specified by key                                                                                                          |
| `.set({ object: Record<string,any>, key: string, value: any })`                                        | `void`                  | Creates a deep clone of the object, and updates the deep clone at location specified by key with value                                                                                                            |
| `.has({ object: Record<string,any>, key: string })`                                                    | `boolean`               | Checks if input object contains a value at specified key                                                                                                                                                          |
| `.clear({object:Record<string,any>, key:string})`                                                      | `void`                  | Clears the value of the object at the given key e.g sets value at key to ''                                                                                                                                       |
| `.get({object:Record<string,any>, key:string})`                                                        | `any`                   | Returns the value of the object at the given key                                                                                                                                                                  |
| `.clearAndSetKey({ object, item, key, value })`                                                        | `void`                  | Clears one key of all items of an object, and sets one item e.g used for list radio                                                                                                                               |
| **builtInFns.array**                                                                                   |                         |
| `.add({ object, value })`                                                                              | `void`                  | Adds value to the provided array(object)                                                                                                                                                                          |
| `.addByIndex({object, value, index})`                                                                  | `void`                  | Adds value to the provided array(object) at the given index                                                                                                                                                       |
| `.SortBy({ object, iterate, orders })`                                                                 | `array`                 | Sorts array applying the iterate function and orders is by desc or asc                                                                                                                                            |
| `.clear({object})`                                                                                     | `void`                  | Clears all values in given array                                                                                                                                                                                  |
| `.removeByKey({ object, key })`                                                                        | `void`                  | Removes the item in array if item has key                                                                                                                                                                         |
| `.removeByName({ object, key, name })`                                                                 | `void`                  | Removes the item in array if item.key matches name                                                                                                                                                                |
| `.removeByValue({object, value})`                                                                      | `void`                  | Removes the item from the array that matches value                                                                                                                                                                |
| `.removeById({object, id})`                                                                            | `void`                  | Removes the item from the array that matches the id                                                                                                                                                               |
| `.removeByindex({object, index})`                                                                      | `void`                  | Removes the item from the array at the given index                                                                                                                                                                |
| `.removeWeekByIndexs({object1, object2, index, duration})`                                             | `void`                  | TODO                                                                                                                                                                                                              |
| `.append({ newMessage, messages })`                                                                    | `void`                  | Appends given newMessage to messages array                                                                                                                                                                        |
| `.has({ object, value })`                                                                              | `boolean`               | Returns whether or not the value is in the array                                                                                                                                                                  |
| `.hasKey({ object, key })`                                                                             | `boolean`               | Returns whether ot not the array has a value witht the given key                                                                                                                                                  |
| `.AddWeek({ object, duration, index, key })`                                                           | `void`                  | TODO                                                                                                                                                                                                              |
| `.push({ newMessage, messages })`                                                                      | `void`                  | Pushes newMessage to messages array                                                                                                                                                                               |
| `.covertToJsonArray({ array })`                                                                        | `object`                | Converts items in array to key:value objects                                                                                                                                                                      |
| `.getListLength({ object })`                                                                           | `number`                | Returns the length of the array                                                                                                                                                                                   |
| `.copyByKey({ array1, array2, key })`                                                                  | `array`                 | Copies items from array1 to array2 if key matches                                                                                                                                                                 |
| `.changeColorByKey({ array, key, value })`                                                             | `void`                  | TODO                                                                                                                                                                                                              |
| **builtInFns.number**                                                                                  |                         |
| `.inRange({ number, start, end })`                                                                     | `boolean`               | Returns true or false depending if the given number is in range of start and end                                                                                                                                  |
| `.multiply({ number, multiple })`                                                                      | `number`                | Returns the product of number and multiple                                                                                                                                                                        |
| **builtInFns.eccNaCl**                                                                                 |                         |                                                                                                                                                                                                                   |
| `.signature(message: string)`                                                                          | `string`                | Uses level2SDK.utilServices.signature to encrypt the input string and generate an encrypted signature                                                                                                             |
| `.verifySignature(signature: string, pkSign: string)`                                                  | `boolean`               | Uses level2SDK.utilServices.verifySignature to verify if the signature is valid                                                                                                                                   |
| `.decryptAES({ key, message })`                                                                        | `string`                | ??? Decrypts message with the provided key through level2SDK.utilServices.sKeyDecrypt                                                                                                                             |
| `.skCheck({ pk, sk })`                                                                                 | `boolean`               | Uses level2SDK.utilServices.aKeyCheck to check if the provided secret key is valid                                                                                                                                |
| `.generateESAK({ pk: string })`                                                                        | `string`                | Generates a symmetric key through level2SDK.utilServices.generateSKey and encrypts the key with level2SDK.utilServices.aKeyEncrypt                                                                                |
| `.decryptESAK({ esak: Uint8Array \| string, publicKey: string, secretKey: string })`                   | `string`                | Decrypt the encrypted session access key with public key and secret key                                                                                                                                           |
| `.isEdgeEncrypted({ id: string })`                                                                     | `boolean`               | Asynchronous function. Checks if an edge is encrypted, i.e. it has a besak or eesak                                                                                                                               |
| `.getSAKFromEdge({ id: string })`                                                                      | `string`                | Asynchronous function. Retrieves the edge by id, decrypts its attached besak or eesak, and returns it if exists, otherwise returns an empty string                                                                |
| `.encryptData({ esak: Uint8Array \| string, publicKey: string, data: Uint8Array })`                    | `Uint8Array`            | Encrypts data with esak and returns encrypted data in Uint8Array format                                                                                                                                           |
| `.decryptData({ esak: Uint8Array \| string, publicKey: string, secretKey: string, data: Uint8Array })` | `Uint8Array`            | Decrypts the esak with provided public key and secret key                                                                                                                                                         |
| **builtInFns.ecos**                                                                                    |                         |                                                                                                                                                                                                                   |
| `.shareDoc({ sourceDoc, targetEdgeID })`                                                               | `object`                | Share a document with a target edge by making a copy of the document as a Note object, then creating a new Document and pass in targetEdgeID as the document's edge_id                                            |
| `.shareDocList({ sourceDocList, targetEdgeID })`                                                       | `void`                  | Shares multiple documents at a time using similar logic as shareDoc                                                                                                                                               |
| **Access directly from builtInFns**                                                                    |                         |                                                                                                                                                                                                                   |
| `.createNewAccount({ name })`                                                                          | `object`                | Asynchronous function. Name is destructured to include phoneNumber, password, and userName. These credentials will be verified, and the function then calls Account.create. Account.create data will be returned. |
| `.signIn({ phoneNumber, password, verificationCode })`                                                 | `object`                | Asynchronous function. Calls Account.login to complete login procedure. Account.login's returned data will be returned.                                                                                           |
| `.loginByPassword(password)`                                                                           | `None`                  | Asynchronous function. Calls Account.loginByPassword                                                                                                                                                              |
| `.storeCredentials({ pk, sk, esk, userId })`                                                           | `None`                  | Stores provided credentials in local storage                                                                                                                                                                      |
| `.SignInOk()`                                                                                          | `boolean`               | Calls Account.getStatus                                                                                                                                                                                           |
| `.uploadDocument({ title, tags = [], content, type, dataType = 0 })`                                   | `<Record<string, any>>` | Calls Document.create and returns the response                                                                                                                                                                    |

### Account Services

| Method                                                                             | Returns             | Description                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.requestVerificationCode(phone_number)`                                           | `object`            | Asynchronous function. Calls store.level2SDK.Account.requestVerificationCode and returns the response                                                               |
| `.create(phone_number, password, verification_code, userName)`                     | `object`            | Asynchronous function. Calls store.level2SDK.Account.createInvitedUser or store.level2SDK.Account. createUser depending on statusCode. Returns a userVertex object. |
| `.login(phone_number, password, verification_code)`                                | `object`            | Asynchronous function. Calls loginByVerificationCode and loginByPassword. Returns a user or userVertex object                                                       |
| `.loginByVerificationCode(phone_number, verification_code)`                        | `object`            | Asynchronous function. Calls store.level2SDK.Account.loginNewDevice. Returns a Status                                                                               |
| `.loginByPassword(password)`                                                       | `object`            | Asynchronous function. Calls store.level2SDK.Account.login, then retrieves userVertex using user.id. Returns userVertex object                                      |
| `.updatePassword(old_password, new_password)`                                      | `None`              | Asynchronous function. Updates user password by calling store.level2SDK.Account.changePasswordWithOldPassword                                                       |
| `.updatePasswordByVerificationCode(phone_number, verification_code, new_password)` | `None`              | Asynchronous function. Updates user password by calling store.level2SDK.Account.changePasswordWithVerificationCode                                                  |
| `.verifyUserPassword(password: string)`                                            | `boolean`           | Uses store.level2SDK.Account.verifyUserPassword to verify the password                                                                                              |
| `.updateProfile(profile: AccountTypes.Profile)`                                    | `AccountTypes.User` | Updates the profile by deleting old one and creating a new profile                                                                                                  |
| `.retrieve()`                                                                      | `AccountTypes.User` | Retrieves the user using information nested in the root                                                                                                             |

### Document Services

| Method                                                                                       | Returns | Description                                                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.create({ edge_id, title, tags = [], content, type, mediaType, dataType = 0, dTypeProps })` | `Note`  | Asynchronous function. Creates an encrypted document, attaches it to an edge, and returns the document in Note format. Utilizes functions in store.level2SDK.utilServices |
| `.retrieve(id, _edge)`                                                                       | `Note`  | Asynchronous function. Retrieves the document specified by id and returns the returned document as a Note object                                                          |
| `.update(id, { edge_id, title, content, mediaType, tags, type, dTypeProps })`                | `Note`  | Asynchronous function. Updates the document specified by id and returns the updated document as a Note object                                                             |

### Note Services

Note is analogous to Document. Any Note related functions are legacy code, with
the exception of documentToNote, which is under src/services/Note/utils

| Method                                                | Returns | Description                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.documentToNote(document, _edge, esakOfCurrentUser)` | `Note`  | Asynchronous function. Generally, only document is needed for input parameter. This function normalizes the data after it retrieves the document from the server, and turns the ECOS document to a readable note/document |

---

Function: `init`
Location: `src/CADL/CADL.ts`

```js
throw new UnableToLoadConfig(
  `An error occured while trying to load the config. ` +
    `Config settings: ${JSON.stringify({
      apiHost: store.apiHost,
      apiProtocol: store.level2SDK.apiProtocol,
      apiVersion: store.level2SDK.apiVersion,
      configUrl: store.configUrl,
      env: store.env,
    })}`,
  err,
)
```

Function: `builtIn`
Location: `src/CADL/services/builtIn.ts`

```js
console.error(`Error occurred while invoking a builtIn function`, {
  apiObject,
  error: err,
  inputArgs: input,
  path: pathArr,
  pageName,
})
```

Function: `sendRetrieveDocument`
Location: `src/CADL/services/documents.ts`

```js
console.error(`Error occurred in the function "sendRetrieveDocument"`, {
  apiObject,
  cacheIndex,
  error,
  pageName,
  requestOptions,
})

throw error
```

Function: `sendCreateDocument`
Location: `src/CADL/services/documents.ts`

```js
console.error(`Error occurred in the function "sendCreateDocument"`, {
  apiObject,
  cacheIndex,
  error,
  pageName,
  requestOptions,
})
throw error
```

Function: `sendCreateDocument`
Location: `src/CADL/services/documents.ts`

```js
console.error(`Error occurred running the function Document.create`, {
  apiObject,
  data: populatedCurrentVal,
  error,
  pageName,
})
throw err
```

```js
throw new UnableToLocateValue(
  `Missing reference ${targetEdgeID} in function "shareDocList"`,
)
```

```js
console.error(`Error occurred in function "sendRetrieveEdge"`, {
  apiObject,
  cacheIndex,
  error: err,
  idList,
  requestOptions,
})
```

```js
console.error(`Error occurred in function "sendCreateEdge"`, {
  apiObject,
  error: err,
  pageName,
  someObjectInTheFunction: obj,
})
```
