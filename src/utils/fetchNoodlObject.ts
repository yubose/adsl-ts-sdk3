import axios from 'axios'
import { UnableToParseYAML, UnableToRetrieveYAML } from '../errors'
import {  parseYmlWasm } from './yaml'

/**
 * Retrieves and parses cadl yaml file.
 * @param url
 * @throws {UnableToRetrieveYAML} -When unable to retrieve cadlYAML
 * @throws {UnableToParseYAML} -When unable to parse yaml file
 *
 */
export default async function fetchNoodlObject<O = any>(
  url = '',
): Promise<[O, string]> {
  let cadlYAML = ''
  let cadlObject: Record<string, any>

  try {
    try {
      cadlYAML = (await axios.get(url)).data
    } catch (error) {
      throw new UnableToRetrieveYAML(
        `Unable to retrieve yaml for ${url}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }

    try {
      // cadlObject = parseYml(cadlYAML, url)
      cadlObject = await parseYmlWasm(cadlYAML, url)
    } catch (error) {
      throw new UnableToParseYAML(
        `Unable to parse yaml for ${url}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(String(error))
  }

  return [cadlObject, cadlYAML]
}
