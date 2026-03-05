/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import CryptoJS from 'crypto-js'

/**
 * Convert binding phrase text to 6-byte UID for firmware.
 * Uses the same format as ExpressLRS: MD5(-DMY_BINDING_PHRASE="phrase") and take the first 6 bytes.
 */
export function uidBytesFromText(text: string): Uint8Array {
  const bindingPhraseFull = `-DMY_BINDING_PHRASE="${text}"`
  const wordArray = CryptoJS.MD5(bindingPhraseFull) as CryptoJS.lib.WordArray
  const out = new Uint8Array(6)
  for (let i = 0; i < 6; i++) {
    const word = wordArray.words[i >>> 2] ?? 0
    out[i] = (word >>> (24 - (i % 4) * 8)) & 0xff
  }
  return out
}
