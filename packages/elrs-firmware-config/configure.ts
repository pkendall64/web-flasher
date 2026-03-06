/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { ConfigureError, ConfigureErrorCode } from './errors.js'
import { compareSemanticVersions } from './version.js'
import type { TargetConfig, ConfigureOptions } from './types.js'
import type { FirmwareFile } from './types.js'

/**
 * Fetches and configures firmware binaries (STM32 or ESP) with options.
 */
export class Configure {
    static #MAGIC = new Uint8Array([0xBE, 0xEF, 0xBA, 0xBE, 0xCA, 0xFE, 0xF0, 0x0D])

    static #find_patch_location(binary: Uint8Array): number {
        return binary.findIndex((_, i, a) => {
            let j = 0
            while (j < Configure.#MAGIC.length && a[i + j] === Configure.#MAGIC[j]) {
                j++
            }
            return j === Configure.#MAGIC.length
        })
    }

    static #write32(binary: Uint8Array, pos: number, val: number | undefined): number {
        if (val !== undefined) {
            binary[pos + 0] = (val >> 0) & 0xFF
            binary[pos + 1] = (val >> 8) & 0xFF
            binary[pos + 2] = (val >> 16) & 0xFF
            binary[pos + 3] = (val >> 24) & 0xFF
        }
        return pos + 4
    }

    static #patch_buzzer(binary: Uint8Array, pos: number, options: ConfigureOptions): number {
        binary[pos] = options.beeptype ?? 0
        pos += 1
        for (let i = 0; i < 32 * 4; i++) {
            binary[pos + i] = 0
        }
        const melody = options.melody
        if (melody) {
            for (let i = 0; i < melody.length; i++) {
                binary[pos + i * 4 + 0] = melody[i][0] & 0xFF
                binary[pos + i * 4 + 1] = (melody[i][0] >> 8) & 0xFF
                binary[pos + i * 4 + 2] = melody[i][1] & 0xFF
                binary[pos + i * 4 + 3] = (melody[i][1] >> 8) & 0xFF
            }
        }
        pos += 32 * 4
        return pos
    }

    static #patch_tx_params(binary: Uint8Array, pos: number, options: ConfigureOptions, versionStr: string): number {
        pos = this.#write32(binary, pos, options['tlm-report'])
        if (compareSemanticVersions(versionStr, '3.5') < 0) {
            pos = this.#write32(binary, pos, options['fan-runtime'])
        }
        let val = binary[pos]
        if (options['uart-inverted']) {
            val &= ~1
            val |= options['uart-inverted'] ? 1 : 0
        }
        if (options['unlock-higher-power']) {
            val &= ~2
            val |= options['unlock-higher-power'] ? 2 : 0
        }
        binary[pos] = val
        return pos + 1
    }

    static #patch_rx_params(binary: Uint8Array, pos: number, options: ConfigureOptions): number {
        pos = this.#write32(binary, pos, options['rcvr-uart-baud'])
        let val = binary[pos]
        if (options['rcvr-invert-tx']) {
            val &= ~1
            val |= options['rcvr-invert-tx'] ? 1 : 0
        }
        if (options['lock-on-first-connection']) {
            val &= ~2
            val |= options['lock-on-first-connection'] ? 2 : 0
        }
        if (options['r9mm-mini-sbus']) {
            val &= ~4
            val |= options['r9mm-mini-sbus'] ? 4 : 0
        }
        binary[pos] = val
        return pos + 1
    }

    static #configureSTM32(
        binary: Uint8Array,
        deviceType: 'TX' | 'RX',
        radioType: string | null,
        options: ConfigureOptions,
        versionStr: string
    ): Uint8Array {
        let pos = this.#find_patch_location(binary)
        if (pos === -1) throw new ConfigureError('Configuration magic not found in firmware file. Is this a 3.x firmware?', ConfigureErrorCode.MAGIC_NOT_FOUND)

        pos += 8
        const version = binary[pos] + (binary[pos + 1] << 8)
        pos += 2
        if (version === 0) {
            pos += 1
        }

        if (radioType === 'sx127x' && options.domain !== undefined) {
            binary[pos] = options.domain
        }
        pos += 1

        if (options.uid) {
            binary[pos] = 1
            for (let i = 0; i < 6; i++) {
                binary[pos + 1 + i] = options.uid[i] ?? 0
            }
        } else {
            binary[pos] = 0
        }
        pos += 7

        if (compareSemanticVersions(versionStr, '3.4') >= 0) {
            pos = this.#write32(binary, pos, options['flash-discriminator'])
        }

        if (compareSemanticVersions(versionStr, '3.5') >= 0) {
            pos = this.#write32(binary, pos, options['fan-runtime'])
        }

        if (deviceType === 'TX') {
            pos = this.#patch_tx_params(binary, pos, options, versionStr)
            if (options.beeptype) {
                pos = this.#patch_buzzer(binary, pos, options)
            }
        } else if (deviceType === 'RX') {
            pos = this.#patch_rx_params(binary, pos, options)
        }

        return binary
    }

    static #checkStatus(response: Response): Response {
        if (!response.ok) {
            throw new ConfigureError(
                `HTTP ${response.status} - ${response.statusText}`,
                ConfigureErrorCode.HTTP_ERROR
            )
        }
        return response
    }

    static async #fetch_file(
        file: string,
        address: number,
        transform: (data: Uint8Array) => Uint8Array = (e) => e
    ): Promise<FirmwareFile> {
        const response = this.#checkStatus(await fetch(file))
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const dataArray = new Uint8Array(arrayBuffer)
        const data = transform(dataArray)
        return { data, address }
    }

    static #findFirmwareEnd(binary: Uint8Array, config: TargetConfig): number {
        const platform = config.platform ?? ''
        let pos = 0x0
        if (platform === 'esp8285') pos = 0x1000
        if (binary[pos] !== 0xE9) throw new ConfigureError('The file provided does not have the right magic for a firmware file!', ConfigureErrorCode.INVALID_FIRMWARE_MAGIC)
        let segments = binary[pos + 1]
        if (platform.startsWith('esp32')) pos = 24
        else pos = 0x1008
        while (segments--) {
            const size = binary[pos + 4] + (binary[pos + 5] << 8) + (binary[pos + 6] << 16) + (binary[pos + 7] << 24)
            pos += 8 + size
        }
        pos = (pos + 16) & ~15
        if (platform.startsWith('esp32')) pos += 32
        return pos
    }

    static #appendArray(...args: Uint8Array[]): Uint8Array {
        const totalLength = args.reduce((acc, value) => acc + value.length, 0)
        const c = new Uint8Array(totalLength)
        args.reduce((acc, value) => {
            c.set(value, acc)
            return acc + value.length
        }, 0)
        return c
    }

    static #ui8ToBstr(u8Array: Uint8Array): string {
        const len = u8Array.length
        let bStr = ''
        for (let i = 0; i < len; i++) {
            bStr += String.fromCharCode(u8Array[i])
        }
        return bStr
    }

    static #bstrToUi8(bStr: string): Uint8Array {
        const len = bStr.length
        const u8array = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            u8array[i] = bStr.charCodeAt(i)
        }
        return u8array
    }

    static #configureESP(
        deviceType: string,
        binary: Uint8Array,
        config: TargetConfig,
        options: ConfigureOptions
    ): Uint8Array {
        const end = this.#findFirmwareEnd(binary, config)
        if (deviceType === 'RX' || deviceType === 'TX') {
            return this.#appendArray(
                binary.slice(0, end),
                this.#bstrToUi8((config.product_name ?? '').padEnd(128, '\x00')),
                this.#bstrToUi8((config.lua_name ?? '').padEnd(16, '\x00')),
                this.#bstrToUi8(JSON.stringify(options).padEnd(512, '\x00'))
            )
        } else {
            return this.#appendArray(
                binary.slice(0, end),
                this.#bstrToUi8(JSON.stringify(options).padEnd(512, '\x00'))
            )
        }
    }

    /**
     * Download and optionally patch firmware files for the given device/config.
     *
     * @param folder - Base folder (e.g. from buildFirmwareUrl)
     * @param version - Firmware version string
     * @param deviceType - 'TX' or 'RX' or backpack type
     * @param rxAsTxType - 'external' | 'internal' when RX is used as TX
     * @param radioType - 'sx127x' | 'sx128x' | 'lr1121' or null
     * @param config - Target config (platform, layout, etc.)
     * @param firmwareUrl - Full URL to firmware.bin
     * @param options - Patch options (flash-discriminator, melody, etc.)
     * @returns Array of { data, address } firmware files to flash
     */
    static async download(
        folder: string,
        version: string,
        deviceType: string,
        rxAsTxType: string | undefined,
        radioType: string | null,
        config: TargetConfig,
        firmwareUrl: string,
        options: ConfigureOptions
    ): Promise<FirmwareFile[]> {
        let url = firmwareUrl
        if (rxAsTxType) url = firmwareUrl.replace('_RX', '_TX')
        const platform = config.platform ?? ''
        if (platform === 'stm32') {
            const entry = await this.#fetch_file(url, 0, (bin) =>
                this.#configureSTM32(bin, deviceType as 'TX' | 'RX', radioType, options, version)
            )
            return [entry]
        } else {
            const list: Promise<FirmwareFile>[] = []

            let hardwareLayoutData: Uint8Array
            if (config.custom_layout) {
                hardwareLayoutData = this.#bstrToUi8(JSON.stringify(config.custom_layout))
            } else if (config.layout_file) {
                const hardwareLayoutFile = await this.#fetch_file(`${folder}/hardware/${deviceType}/${config.layout_file}`, 0)
                let layout: Record<string, unknown> = JSON.parse(this.#ui8ToBstr(hardwareLayoutFile.data))
                if (config.overlay) {
                    layout = { ...layout, ...config.overlay }
                }
                if (rxAsTxType === 'external') (layout as Record<string, unknown>)['serial_rx'] = (layout as Record<string, unknown>)['serial_tx']
                hardwareLayoutData = this.#bstrToUi8(JSON.stringify(layout))
            } else {
                hardwareLayoutData = new Uint8Array(0)
            }

            if (platform.startsWith('esp32')) {
                let startAddress = 0x1000
                if (platform.startsWith('esp32-')) {
                    startAddress = 0x0000
                }
                list.push(this.#fetch_file(url.replace('firmware.bin', 'bootloader.bin'), startAddress))
                list.push(this.#fetch_file(url.replace('firmware.bin', 'partitions.bin'), 0x8000))
                list.push(this.#fetch_file(url.replace('firmware.bin', 'boot_app0.bin'), 0xE000))
                list.push(this.#fetch_file(url, 0x10000, (bin) => Configure.#configureESP(deviceType, bin, config, options)))
            } else if (platform === 'esp8285') {
                list.push(this.#fetch_file(url, 0x0, (bin) => Configure.#configureESP(deviceType, bin, config, options)))
            }

            const files = await Promise.all(list)
            let logoFile: FirmwareFile = { data: new Uint8Array(0), address: 0 }
            if (config.logo_file) {
                logoFile = await this.#fetch_file(`${folder}/${version}/hardware/logo/${config.logo_file}`, 0)
                    .catch(() => this.#fetch_file(`${folder}/hardware/logo/${config.logo_file}`, 0))
            }
            files[files.length - 1].data = this.#appendArray(
                files[files.length - 1].data,
                hardwareLayoutData,
                new Uint8Array(2048 - hardwareLayoutData.length).fill(0),
                logoFile.data
            )
            return files
        }
    }
}
