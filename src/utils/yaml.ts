import YAML from 'yaml'
import log from './log'
import * as YAMLWASM from '../wasm/yaml_wasm'

export function parseYml(yml = '', label = ''): Record<string, any> {
  try {
    return YAML.parse(yml, {
      prettyErrors: true,
      schema: 'core',
      version: '1.2',
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (label) {
      log.error(`Parsing error occurred for "${label}"`)
    }
    log.error(err)
    return {}
  }
}

export async function parseYmlWasm(yml = '', label = ''): Promise<never>{
  async function parseYmlWithWasm(yml:string){
    await YAMLWASM.setWasm()
    return YAMLWASM.parse(yml, {
      prettyErrors: true,
      schema: 'core',
      version: '1.2',
    })
  }
  try {
    let [a] = await parseYmlWithWasm(yml)
    return a
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (label) {
      log.error(`Parsing error occurred for "${label}"`)
    }
    log.error(err)
    //@ts-ignore
    return {}
  }
}


export function toYml(obj: any) {
  return YAML.stringify(obj, {
    prettyErrors: true,
    schema: 'core',
    version: '1.2',
  })
}
