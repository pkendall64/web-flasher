import { contextFromStore } from './state.js'
import { getDownloadFilename as libGetDownloadFilename } from 'elrs-firmware-config'

/**
 * @param {string} ext - File extension including leading dot if desired, e.g. '.bin.gz' or 'zip'
 * @returns {string} Filename for the download
 */
export function getDownloadFilename(ext = '.bin.gz') {
  return libGetDownloadFilename(ext, contextFromStore())
}
