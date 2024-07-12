import path from 'path'
import * as u from '@jsmanifest/utils'
import {
  type MessageTypeDefinition,
  type MethodDefinition,
  type Options,
  loadSync,
} from '@grpc/proto-loader'
import * as Grpc from '@grpc/grpc-js'

export function getProtoFromPkgDefinition(pkgName: string, pkgDef: any) {
  return pkgName.split('.').reduce((obj, key) => {
    return obj && obj[key] !== 'undefined' ? obj[key] : undefined
  }, pkgDef)
}

class GrpcMockServer {
  #server: Grpc.Server
  serverAddress: string

  constructor(serverAddress = '127.0.0.1:50777') {
    this.serverAddress = serverAddress
    this.#server = new Grpc.Server()
  }

  addService(
    protoPath: string | string[],
    pkgName: string,
    serviceName: string,
    implementations: Grpc.UntypedServiceImplementation,
    protoLoadOptions?: Options,
  ) {
    const protoPaths = u.array(protoPath)
    const pkgDef = Grpc.loadPackageDefinition(
      loadSync(protoPaths, protoLoadOptions),
    )
    const proto = getProtoFromPkgDefinition(pkgName, pkgDef)

    if (!proto) {
      throw new Error('Seems like the package name is wrong.')
    }

    if (!proto[serviceName]) {
      throw new Error('Seems like the service name is wrong.')
    }

    const service = proto[serviceName].service as {
      ce: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      cd: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      cv: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      dx: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      re: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      rd: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
      rv: MethodDefinition<MessageTypeDefinition, MessageTypeDefinition>
    }

    this.#server.addService(service, implementations)

    return this
  }

  get server() {
    return this.#server
  }

  async start() {
    console.log('Starting gRPC mock server ...')

    await new Promise((resolve, reject) => {
      this.server.bindAsync(
        this.serverAddress,
        Grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          console.error({ error, port })
          error ? reject(error) : resolve(port)
        },
      )
    })

    this.server.start()
  }

  async stop() {
    console.log('Stopping gRPC mock server ...')
    new Promise((resolve, reject) => {
      // this.server.forceShutdown()
      this.server.tryShutdown((error) =>
        error ? reject(error) : resolve(undefined),
      )
      resolve(undefined)
    })
    return this
  }
}

export function createMockGrpcServer(serverAddress = '0.0.0.0:50777') {
  const address = 'https://ecosapiprod.aitmed.io'
  const server = new GrpcMockServer(serverAddress)

  const ecosApiProtoFilePath = path.join(
    __dirname,
    'fixtures/proto/ecos_api.proto',
  )
  const ecosTypesProtoFilePath = path.join(
    __dirname,
    'fixtures/proto/types.proto',
  )
  const pkgName = 'aitmed.ecos.v1beta1'
  const serviceName = 'EcosAPI'

  const protoPaths = [ecosApiProtoFilePath, ecosTypesProtoFilePath]

  const noop = (call: any, callback: Grpc.sendUnaryData<any>) => {
    console.log('[noop] HELOOO')
    const response: any = new this.proto.ExampleResponse.constructor({
      msg: 'the response message',
    })
    callback(null, response)
  }

  server.addService(protoPaths, pkgName, serviceName, {
    ce: (call: any, callback: Grpc.sendUnaryData<any>) => {
      console.log('[ceReq] HELOOO')
      const response: any = new this.proto.ExampleResponse.constructor({
        msg: 'the response message',
      })
      callback(null, response)
    },
    ceReq: (call: any, callback: Grpc.sendUnaryData<any>) => {
      console.log('[ceReq] HELOOO')
      const response: any = new this.proto.ExampleResponse.constructor({
        msg: 'the response message',
      })
      callback(null, response)
    },
    ceResp: (call: any, callback: Grpc.sendUnaryData<any>) => {
      console.log('[ceResp] HELOOO')
      const response: any = new this.proto.ExampleResponse.constructor({
        msg: 'the response message',
      })
      callback(null, response)
    },
    // dxReq: noop,
    // dxResp: noop,
    // reReq: noop,
    // reResp: noop,
    // rdReq: noop,
    // rdResp: noop,
    // rvReq: noop,
    // rvResp: noop,
  })

  return server
}
