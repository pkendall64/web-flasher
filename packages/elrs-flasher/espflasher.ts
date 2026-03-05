/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { TransportEx } from './serialex.js'
import { CustomReset, ESPLoader, type After, type Before } from 'esptool-js'
import { Passthrough } from './passthrough.js'
import CryptoJS from 'crypto-js'
import { MismatchError, WrongMCU } from './errors.js'
import type { Terminal } from './types.js'
import type { ESPFlasherConfig } from './types.js'
import type { FirmwareChunk } from './types.js'

export type FlasherMethod = 'uart' | 'betaflight' | 'etx' | 'passthru'
export type FlasherDeviceType = 'TX' | 'RX' | string

/**
 * ESP (ESP8266/ESP32) flasher using esptool-js with passthrough support (Betaflight, EdgeTX, UART).
 */
export class ESPFlasher {
    device: SerialPort
    type: FlasherDeviceType
    method: FlasherMethod
    config: ESPFlasherConfig
    options: unknown
    firmwareUrl: string
    term: Terminal
    mainFirmware: boolean
    esploader!: ESPLoader

    constructor(
        device: SerialPort,
        type: FlasherDeviceType,
        method: FlasherMethod,
        config: ESPFlasherConfig,
        options: unknown,
        firmwareUrl: string,
        term: Terminal
    ) {
        this.device = device
        this.type = type
        this.method = method
        this.config = config
        this.options = options
        this.firmwareUrl = firmwareUrl
        this.term = term
        this.mainFirmware = type === 'TX' || type === 'RX'
    }

    connect = async (): Promise<string> => {
        let mode: string = 'default_reset'
        let baudrate = 460800
        let initbaud: number | undefined
        if (this.method === 'betaflight') {
            baudrate = 420000
            mode = 'no_reset'
        } else if (this.method === 'etx') {
            if (this.mainFirmware) {
                baudrate = 230400
            }
            mode = 'no_reset'
        } else if (this.method === 'passthru') {
            baudrate = 230400
            mode = 'no_reset'
        } else if (this.method === 'uart' && this.config.platform.startsWith('esp32')) {
            initbaud = 115200
        }
        if (this.config.baud) {
            baudrate = this.config.baud
            initbaud = this.config.baud
        }

        const transport = new TransportEx(this.device, false)
        const terminal = {
            clean: () => {},
            writeLine: (data: string) => this.term.writeln(data),
            write: (data: string) => this.term.write?.(data),
        }
        this.esploader = new ESPLoader({
            transport,
            baudrate,
            terminal,
            romBaudrate: initbaud === undefined ? baudrate : initbaud,
        })
        this.esploader.ESP_RAM_BLOCK = 0x0800

        let hasError: MismatchError | undefined
        const passthrough = new Passthrough(transport, this.term, this.config.firmware ?? '', baudrate)
        try {
            if (this.method === 'uart') {
                if (this.type === 'RX' && !this.config.platform.startsWith('esp32')) {
                    await transport.connect(baudrate)
                    const ret = await this.esploader._connectAttempt(
                        (mode = 'no_reset'),
                        new CustomReset(transport, 'W0')
                    )
                    if (ret !== 'success') {
                        await transport.disconnect()
                        await transport.connect(420000)
                        await passthrough.reset_to_bootloader()
                    }
                } else {
                    await transport.connect(115200)
                }
            } else if (this.method === 'betaflight') {
                await transport.connect(baudrate)
                await passthrough.betaflight()
                await passthrough.reset_to_bootloader()
            } else if (this.method === 'etx') {
                await transport.connect(baudrate)
                if (this.mainFirmware) {
                    await passthrough.edgeTX()
                } else {
                    await passthrough.edgeTXBP()
                }
            } else if (this.method === 'passthru') {
                await transport.connect(baudrate)
                await transport.setDTR(false)
                await transport.sleep(100)
                await transport.setRTS(false)
                await transport.sleep(5000)
                await transport.setDTR(true)
                await transport.sleep(200)
                await transport.setDTR(false)
                await transport.sleep(100)
            }
        } catch (e) {
            if (!(e instanceof MismatchError)) {
                throw e
            }
            hasError = e
        }

        await transport.disconnect()

        const chip = await this.esploader.main(mode as Before)
        const chipName = this.esploader.chip.CHIP_NAME
        if (
            (chipName === 'ESP8266' && this.config.platform !== 'esp8285') ||
            (chipName === 'ESP32-C3' && this.config.platform !== 'esp32-c3') ||
            (chipName === 'ESP32-S3' && this.config.platform !== 'esp32-s3') ||
            (chipName === 'ESP32' && this.config.platform !== 'esp32')
        ) {
            throw new WrongMCU(
                `Wrong target selected, this device uses '${chip}' and the firmware is for '${this.config.platform}'`
            )
        }
        console.log(`Settings done for ${chip}`)

        if (hasError) {
            throw hasError
        }
        return chipName
    }

    flash = async (
        files: FirmwareChunk[],
        erase: boolean,
        progress: (fileNumber: number, percent: number, total: number) => void
    ): Promise<void> => {
        const loader = this.esploader
        let fileList = files
        if (this.method === 'etx' || this.method === 'betaflight') {
            loader.FLASH_WRITE_SIZE = 0x0800
            if (this.config.platform.startsWith('esp32') && this.method === 'betaflight') {
                fileList = files.slice(-1)
            }
        }

        const fileArray = fileList.map((v) => ({
            data: (loader.transport as TransportEx).ui8ToBstr(v.data),
            address: v.address,
        }))
        loader.IS_STUB = true
        await loader.writeFlash({
            fileArray,
            flashSize: 'keep',
            flashMode: 'keep',
            flashFreq: 'keep',
            eraseAll: erase,
            compress: true,
            reportProgress: progress,
            calculateMD5Hash: (image: string) =>
                CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)) as unknown as string,
        })
        progress(fileArray.length - 1, 100, 100)
        if (this.config.platform.startsWith('esp32')) {
            await loader.after('hard_reset' as After).catch(() => {})
        } else {
            await loader.after('soft_reset' as After).catch(() => {})
        }
    }

    close = async (): Promise<void> => {
        await this.esploader.transport.disconnect()
    }
}
