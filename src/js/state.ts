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

import { reactive } from 'vue'
import type { FirmwareContext, FirmwareContextPartial, FirmwareTarget } from 'elrs-firmware-config'

export interface StoreOptions {
  uid: number[] | null
  region: string
  domain: number
  ssid: string | null
  password: string | null
  wifiOnInternal: number
  tx: {
    telemetryInterval: number
    uartInverted: boolean
    fanMinRuntime: number
    higherPower: boolean
    melodyType: number
    melodyTune: string | null
  }
  rx: {
    uartBaud: number
    lockOnFirstConnect: boolean
    r9mmMiniSBUS: boolean
    fanMinRuntime: number
    rxAsTx: boolean
    rxAsTxType: number
  }
  flashMethod: string | null
}

export interface AppStore {
  currentStep: number
  firmware: 'firmware' | 'backpack' | null
  targetType: string | null
  version: string | null
  versionLabel: string | null
  vendor: string | null
  vendor_name: string
  radio: string | null
  target: FirmwareTarget | null
  name: string
  options: StoreOptions
}

/** Returns a fresh copy of default options (avoids mutating shared state). */
function getDefaultOptions(): StoreOptions {
  return {
    uid: null,
    region: 'FCC',
    domain: 1,
    ssid: null,
    password: null,
    wifiOnInternal: 60,
    tx: {
      telemetryInterval: 240,
      uartInverted: true,
      fanMinRuntime: 30,
      higherPower: false,
      melodyType: 3,
      melodyTune: null,
    },
    rx: {
      uartBaud: 420000,
      lockOnFirstConnect: true,
      r9mmMiniSBUS: false,
      fanMinRuntime: 30,
      rxAsTx: false,
      rxAsTxType: 0,
    },
    flashMethod: null,
  }
}

export const store = reactive<AppStore>({
  currentStep: 1,
  firmware: null,
  targetType: null,
  version: null,
  versionLabel: null,
  vendor: null,
  vendor_name: '',
  radio: null,
  target: null,
  name: '',
  options: getDefaultOptions(),
})

export function resetState(): void {
  store.currentStep = 1
  store.firmware = null
  store.targetType = null
  store.version = null
  store.versionLabel = null
  store.vendor = null
  store.radio = null
  store.target = null
  store.options = getDefaultOptions()
}

export function hasFeature(feature: string): boolean {
  return store.target?.config?.features?.includes(feature) ?? false
}

/**
 * Build full context from Vue store (baseUrl and firmwareType included).
 * Prefer contextFromStorePartial() with FirmwareConfig for new code.
 */
export function contextFromStore(): FirmwareContext {
  return {
    baseUrl: './assets',
    version: store.version ?? '',
    versionLabel: store.versionLabel ?? undefined,
    firmwareType: store.firmware ?? 'firmware',
    targetType: (store.targetType as 'tx' | 'rx') ?? undefined,
    radio: store.radio ?? undefined,
    target: store.target ?? undefined,
    options: store.options as unknown as FirmwareContext['options'],
  }
}

/**
 * Build partial context from Vue store for FirmwareConfig instance methods.
 * Omit baseUrl and firmwareType; pass with new FirmwareConfig(baseUrl, firmwareType).
 */
export function contextFromStorePartial(): FirmwareContextPartial {
  return {
    version: store.version ?? '',
    versionLabel: store.versionLabel ?? undefined,
    targetType: (store.targetType as 'tx' | 'rx') ?? undefined,
    radio: store.radio ?? undefined,
    target: store.target ?? undefined,
    options: store.options as unknown as FirmwareContext['options'],
  }
}
