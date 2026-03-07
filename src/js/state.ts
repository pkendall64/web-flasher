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
import { FirmwareFlavor } from 'elrs-firmware-config'
import type { BuildContext, TargetSelectOption } from 'elrs-firmware-config'

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
  /** Source of truth for device type; targetType and firmware are derived from this. */
  flavor: FirmwareFlavor | null
  firmware: 'firmware' | 'backpack' | null
  targetType: string | null
  version: string | null
  versionLabel: string | null
  vendor: string | null
  vendor_name: string
  radio: string | null
  /** Selected target (key + config + vendor/radio for dropdown sync). */
  target: TargetSelectOption | null
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
  flavor: null,
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

/**
 * Set the current firmware flavor (and derived targetType/firmware). Use this whenever the user picks a device type.
 */
export function setFlavor(flavor: FirmwareFlavor | null): void {
  store.flavor = flavor
  store.targetType = flavor ?? null
  store.firmware = flavor ? FirmwareFlavor.firmwareType(flavor) : null
}

export function resetState(): void {
  store.currentStep = 1
  store.flavor = null
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
 * Minimal build context for FirmwareConfig (generateFirmware, getDownloadFilename, buildFirmwareUrl).
 * Only version, versionLabel, target key, and options; library resolves the rest.
 */
export function buildContextFromStore(): BuildContext {
  return {
    version: store.version ?? undefined,
    versionLabel: store.versionLabel ?? undefined,
    targetKey: store.target?.value ?? '',
    options: store.options as unknown as BuildContext['options'],
  }
}
