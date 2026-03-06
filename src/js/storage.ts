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

const STORAGE_KEY = 'elrs-web-flasher_settings'

/** Shape of stored settings (matches store.options). */
export interface StoredSettings {
  uid?: number[] | null
  region?: string
  domain?: number
  ssid?: string | null
  password?: string | null
  wifiOnInternal?: number
  tx?: {
    telemetryInterval?: number
    uartInverted?: boolean
    fanMinRuntime?: number
    higherPower?: boolean
    melodyType?: number
    melodyTune?: string | null
  }
  rx?: {
    uartBaud?: number
    lockOnFirstConnect?: boolean
    r9mmMiniSBUS?: boolean
    fanMinRuntime?: number
    rxAsTx?: boolean
    rxAsTxType?: number
  }
  flashMethod?: string | null
  [key: string]: unknown
}

/**
 * Get all settings from localStorage
 */
export function getSettings(): StoredSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as StoredSettings) : null
  } catch (error: unknown) {
    console.error('Error loading settings:', error)
    return null
  }
}

/**
 * Save all settings to localStorage
 */
export function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error: unknown) {
    console.error('Error saving settings:', error)
  }
}

/**
 * Clear all stored settings
 */
export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error: unknown) {
    console.error('Error clearing settings:', error)
  }
}
