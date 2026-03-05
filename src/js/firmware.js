import { contextFromStore } from './state.js'
import { generateFirmware as libGenerateFirmware } from 'elrs-firmware-config'

export async function generateFirmware() {
  return libGenerateFirmware(contextFromStore())
}
