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

import { Configure } from './configure.js'
import { buildFirmwareUrl } from './urls.js'
import { MelodyParser } from './melody.js'

/**
 * @param {string} deviceType - 'TX' | 'RX' or backpack type
 * @param {object} context - { baseUrl, version, firmwareType, targetType, radio, target, options }
 * @returns {Promise<{ config, firmwareUrl, folder, options }>}
 */
export async function getSettings(deviceType, context) {
    const options = {
        'flash-discriminator': Math.floor(Math.random() * ((2 ** 31) - 2) + 1)
    }

    const { target, options: opts } = context
    const config = target?.config || {}

    if (opts?.uid) {
        options.uid = opts.uid
    }
    if (config.platform !== 'stm32') {
        options['wifi-on-interval'] = opts?.wifiOnInternal
        if (opts?.ssid) {
            options['wifi-ssid'] = opts.ssid
            options['wifi-password'] = opts.password
        }
    }

    const { folder, firmwareUrl } = buildFirmwareUrl(context)

    if (context.firmwareType === 'firmware') {
        if (deviceType === 'RX' && !opts?.rx?.rxAsTx) {
            options['rcvr-uart-baud'] = opts?.rx?.uartBaud
            options['lock-on-first-connection'] = opts?.rx?.lockOnFirstConnect
        } else {
            const tlm = opts?.tx?.telemetryInterval
            options['tlm-interval'] = tlm
            options['tlm-report'] = tlm
            options['fan-runtime'] = opts?.tx?.fanMinRuntime
            options['uart-inverted'] = opts?.tx?.uartInverted
            options['unlock-higher-power'] = opts?.tx?.higherPower
        }
        if (context.radio?.endsWith('_900') || context.radio?.endsWith('_dual')) {
            options.domain = opts?.domain
        }
        const features = config.features
        if (features !== undefined && features.indexOf('buzzer') !== -1) {
            const melodyType = opts?.tx?.melodyType ?? 0
            options.beeptype = melodyType > 2 ? 2 : melodyType

            if (melodyType === 2) {
                options.melody = MelodyParser.parseToArray('A4 20 B4 20|60|0')
            } else if (melodyType === 3) {
                options.melody = MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0')
            } else if (melodyType === 4) {
                options.melody = MelodyParser.parseToArray(opts?.tx?.melodyTune || '')
            } else {
                options.melody = []
            }
        }
    } else {
        options['product-name'] = config.product_name
    }

    return { config, firmwareUrl, folder, options }
}

/**
 * @param {object} context - { baseUrl, version, firmwareType, targetType, radio, target, options }
 * @returns {Promise<[Array<{ data: Uint8Array, address: number }>, object]>} [firmwareFiles, metadata]
 */
export async function generateFirmware(context) {
    let deviceType = context.targetType
    let radioType = null
    let txType = null

    if (context.firmwareType === 'firmware') {
        deviceType = context.targetType === 'tx' ? 'TX' : 'RX'
        radioType = context.radio?.endsWith('_900') ? 'sx127x' : (context.radio?.endsWith('_2400') ? 'sx128x' : 'lr1121')
        txType = undefined
        if (context.targetType === 'rx' && context.options?.rx?.rxAsTx) {
            txType = context.options.rx.rxAsTxType ? 'external' : 'internal'
        }
    }

    const { config, firmwareUrl, folder, options } = await getSettings(deviceType, context)
    const firmwareFiles = await Configure.download(
        folder,
        context.version,
        deviceType,
        txType,
        radioType,
        config,
        firmwareUrl,
        options
    )
    return [
        firmwareFiles,
        { config, firmwareUrl, options, deviceType, radioType, txType }
    ]
}
