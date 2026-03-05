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

import {reactive} from 'vue'

export const store = reactive({
    currentStep: 1,
    firmware: null,
    folder: '',
    targetType: null,
    version: null,
    versionLabel: null,  // display version e.g. "3.5.3" (store.version is the hash/path)
    vendor: null,
    vendor_name: '',
    radio: null,
    target: null,
    name: '',
    options: {
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
            rxAsTxType: 0   // 0 = Internal (Full-duplex), 1 = External (Half-duplex)
        },
        flashMethod: null,
    }
})

export function resetState() {
    store.currentStep = 1
    store.firmware = null
    store.folder = ''
    store.targetType = null
    store.version = null
    store.versionLabel = null
    store.vendor = null
    store.radio = null
    store.target = null
    store.options = {
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
        },
        flashMethod: null,
    }
}

export function hasFeature(feature) {
    return store.target?.config?.features?.includes(feature)
}

/**
 * Build library context from Vue store for elrs-firmware-config.
 * @returns {object} Context (baseUrl, version, versionLabel, firmwareType, targetType, radio, target, options)
 */
export function contextFromStore() {
    return {
        baseUrl: './assets',
        version: store.version,
        versionLabel: store.versionLabel,
        firmwareType: store.firmware,
        targetType: store.targetType,
        radio: store.radio,
        target: store.target,
        options: store.options,
    }
}
