/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */
/// <reference types="w3c-web-usb" />

import * as libstlink from './stlink/lib/package.js'
import WebStlink from './stlink/webstlink.js'
import type { Terminal } from './types.js'
import type { STLinkConfig, ProgressCallback, FirmwareChunk } from './types.js'
import type { StlinkTarget, StlinkStatus } from './stlink/webstlink.js'

type WebStlinkInstance = InstanceType<typeof WebStlink>

/**
 * ST-Link debugger front-end for flashing STM32 targets (e.g. ExpressLRS RX).
 */
export class STLink {
    term: Terminal
    stlink: WebStlinkInstance | null = null
    device: USBDevice | null = null
    config!: STLinkConfig
    target!: StlinkTarget
    progressCallback!: ProgressCallback
    fileNumber: number = 0
    _msg: string = ''
    _bargraph_min: number = 0
    _bargraph_max: number = 100

    constructor(term: Terminal) {
        this.term = term
    }

    log(str: string): void {
        this.term.writeln(str)
    }

    debug(_msg: string): void {}

    verbose(_msg: string): void {}

    info(_msg: string): void {}

    error(msg: string): void {
        this.log('[ERROR] ' + msg)
    }

    warning(msg: string): void {
        this.log('[WARN] ' + msg)
    }

    bargraph_start(msg: string, opts: { value_min?: number; value_max?: number } = {}): void {
        const { value_min = 0, value_max = 100 } = opts
        this._msg = msg
        this._bargraph_min = value_min
        this._bargraph_max = value_max
    }

    bargraph_update(opts: { value?: number; percent?: number | null } = {}): void {
        let { value = 0, percent = null } = opts
        if (percent === null) {
            if (this._bargraph_max - this._bargraph_min > 0) {
                percent = Math.floor(
                    (100 * (value - this._bargraph_min)) / (this._bargraph_max - this._bargraph_min)
                )
            } else {
                percent = 0
            }
        }
        if (percent > 100) {
            percent = 100
        }
        this.progressCallback(this.fileNumber, percent, 100, this._msg)
    }

    bargraph_done(): void {
        this.progressCallback(this.fileNumber, 100, 100)
    }

    update_debugger_info(stlink: InstanceType<typeof WebStlink>, device: USBDevice): void {
        const version = 'ST-Link/' + stlink._stlink.ver_str
        this.log(`Debugger - ${version} - Connected`)
        this.log(device.productName ?? '')
        this.log(device.manufacturerName ?? '')
        this.log(device.serialNumber ?? '')
    }

    update_target_status(status: StlinkStatus, target: StlinkTarget | null = null): void {
        if (target !== null) {
            const fields: [string, string, string][] = [
                ['type', 'MCU Type', ''],
                ['core', 'Core', ''],
                ['dev_id', 'Device ID', ''],
                ['flash_size', 'Flash Size', 'KiB'],
                ['sram_size', 'SRAM Size', 'KiB'],
            ]
            const t = target as StlinkTarget & { eeprom_size?: number }
            if (t.eeprom_size != null && t.eeprom_size > 0) {
                fields.push(['eeprom_size', 'EEPROM Size', 'KiB'])
            }
            for (const [key, title, suffix] of fields) {
                const val = (target as Record<string, unknown>)[key]
                this.log(title + ': ' + val + suffix)
            }
        }

        const haltState = status.halted ? 'Halted' : 'Running'
        const debugState = 'Debugging ' + (status.debug ? 'Enabled' : 'Disabled')
        this.log(`${haltState}, ${debugState}`)
    }

    on_successful_attach = async (stlink: WebStlinkInstance, device: USBDevice): Promise<void> => {
        this.stlink = stlink
        this.device = device

        this.update_debugger_info(stlink, device)

        this.target = await stlink.detect_cpu(this.config.stlink.cpus, null)

        const that = this
        function updateOnInspection(status: StlinkStatus) {
            that.update_target_status(status, null)
        }

        stlink.add_callback('halted', updateOnInspection)
        stlink.add_callback('resumed', updateOnInspection)

        let status = await stlink.inspect_cpu()
        if (!status.debug) {
            await stlink.set_debug_enable(true)
            status = await stlink.inspect_cpu()
        }

        this.update_target_status(status, this.target)

        this.log('SRAM address = 0x' + this.target.sram_start.toString(16))
        this.log('Flash adddress = 0x' + this.target.flash_start.toString(16))
    }

    on_disconnect = (): void => {
        this.info('Device disconnected')
        this.stlink = null
        this.device = null
    }

    connect = async (config: STLinkConfig, handler: () => void): Promise<void> => {
        this.config = config
        if (this.stlink !== null) {
            await this.stlink.detach()
            this.on_disconnect()
        }
        try {
            const device = await navigator.usb.requestDevice({
                filters: libstlink.usb.filters,
            })
            navigator.usb.ondisconnect = (e) => {
                if (e.device === device) handler()
            }
            const nextStlink = new WebStlink(this)
            await nextStlink.attach(device, this)
            this.stlink = nextStlink
            this.device = device
        } catch (err) {
            this.error(String(err))
            throw err
        }
        if (this.stlink !== null) {
            await this.on_successful_attach(this.stlink, this.device)
        }
    }

    flash = async (
        binary: FirmwareChunk[],
        bootloader: Uint8Array | undefined,
        progressCallback: ProgressCallback
    ): Promise<void> => {
        this.progressCallback = progressCallback
        if (this.stlink !== null && this.stlink.connected) {
            this.fileNumber = 0
            if (bootloader) {
                this.log('Flash bootloader')
                try {
                    await this.stlink.halt()
                    await this.stlink.flash(this.target.flash_start, bootloader)
                } catch (err) {
                    this.error(String(err))
                    throw err
                }
                this.fileNumber++
            }

            const addr = parseInt(this.config.stlink.offset, 16)
            this.log('Flash ExpressLRS')
            try {
                await this.stlink.halt()
                await this.stlink.flash(this.target.flash_start + addr, binary[0].data)
            } catch (err) {
                this.error(String(err))
                throw err
            }
        }
    }

    close = async (): Promise<void> => {
        if (this.stlink) {
            await this.stlink.detach()
        }
        this.stlink = null
    }
}
