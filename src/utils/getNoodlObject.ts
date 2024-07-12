import axios from 'axios'
import { UnableToParseJSON, UnableToRetrieveJSON } from '../errors'

/**
 * Retrieves and parses cadl json file.
 * @param url
 * @throws {UnableToRetrieveJSON} -When unable to retrieve cadlJSON
 * @throws {UnableToParseJSON} -When unable to parse json file
 *
 */
export default async function getNoodlObject<O = any>(
  url = '',
): Promise<[O, string]> {
  let cadlJSON
  let cadlObject: Record<string, any>

  try {
    try {
      cadlJSON = (await axios.get(url)).data
    } catch (error) {
      throw new UnableToRetrieveJSON(
        `Unable to retrieve json for ${url}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }

    try {
      cadlObject = cadlJSON
    } catch (error) {
      throw new UnableToParseJSON(
        `Unable to parse json for ${url}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(String(error))
  }

  return [cadlObject, cadlJSON]
}
