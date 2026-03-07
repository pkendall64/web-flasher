/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */
/// <reference types="w3c-web-usb" />

import type { FirmwareFile, GenerateFirmwareMetadata } from 'elrs-firmware-config'
import { STLink } from './stlink.js'
import { createSerialFlasher } from './SerialFlasher.js'
import type { Terminal, ProgressCallback, STLinkConfig } from './types.js'

export type FlashMethod = 'stlink' | 'uart' | 'betaflight' | 'etx' | 'passthru'

/**
 * Transport for flashing: either a WebUSB device (ST-Link) or a Web Serial port (ESP/Xmodem).
 */
export type FlashTransport =
    | { type: 'usb'; device: USBDevice }
    | { type: 'serial'; port: SerialPort }

/**
 * Returns which transport kind is needed for the given method.
 * Use this to decide whether to call navigator.usb.requestDevice or navigator.serial.requestPort,
 * and to show the correct "Connect" UI.
 */
export function getTransportKind(
    _metadata: GenerateFirmwareMetadata,
    method: FlashMethod
): 'usb' | 'serial' {
    return method === 'stlink' ? 'usb' : 'serial'
}

/**
 * Parameters for the unified flashFirmware function.
 */
export interface FlashFirmwareParams {
    /** Pre-obtained transport: USB device for ST-Link, or Serial port for ESP/Xmodem. */
    transport: FlashTransport
    /** Result of generateFirmware(context) from elrs-firmware-config. */
    firmware: [FirmwareFile[], GenerateFirmwareMetadata]
    /** How to connect: 'stlink' for USB, or serial method (uart, betaflight, etx, passthru). */
    method: FlashMethod
    /** Logger for connect/flash output. */
    term: Terminal
    /** Progress callback (fileIndex, percent, total, message?). */
    progress?: ProgressCallback
    /** For serial: erase flash before write. Ignored for ST-Link. Default false. */
    erase?: boolean
}

/**
 * Single entry point to flash firmware generated from elrs-firmware-config.
 * Connects to the device, flashes the firmware, and closes the connection.
 *
 * The caller must obtain the transport beforehand:
 * - For ST-Link: call navigator.usb.requestDevice with ST-Link filters (see getSTLinkUsbFilters).
 * - For serial: call navigator.serial.requestPort(), then open the port with the desired baud rate.
 *
 * Use getTransportKind(metadata, method) to know which transport to request.
 */
export async function flashFirmware(params: FlashFirmwareParams): Promise<void> {
    const { transport, firmware, method, term, progress = () => {}, erase = false } = params
    const [files, metadata] = firmware
    const { config } = metadata

    if (transport.type === 'usb') {
        if (method !== 'stlink') {
            throw new Error('USB transport is only valid with method "stlink"')
        }
        const stlinkConfig = config?.stlink
        if (!stlinkConfig?.offset || !stlinkConfig?.cpus?.length) {
            throw new Error('Target config must include stlink.offset and stlink.cpus for ST-Link flashing')
        }
        const stlinkCfg: STLinkConfig = { stlink: { offset: stlinkConfig.offset, cpus: stlinkConfig.cpus } }
        const stlink = new STLink(term)
        try {
            await stlink.connectWithDevice(transport.device, stlinkCfg, () => {})
            await stlink.flash(files, undefined, progress)
        } finally {
            await stlink.close()
        }
        return
    }

    // Serial: ESP or Xmodem (target config may include baud at runtime)
    const configWithBaud = config as typeof config & { baud?: number }
    const flasher = createSerialFlasher(
        transport.port,
        {
            deviceType: metadata.deviceType ?? '',
            method,
            config: {
                platform: config?.platform ?? '',
                firmware: config?.firmware,
                baud: configWithBaud?.baud,
            },
            options: metadata.options ?? {},
            firmwareUrl: metadata.firmwareUrl ?? '',
        },
        term
    )
    try {
        await flasher.connect()
        await flasher.flash(files, erase, progress)
    } finally {
        if ('close' in flasher && typeof flasher.close === 'function') {
            await (flasher as { close: () => Promise<void> }).close()
        }
    }
}

/**
 * USB device filters for ST-Link. Pass to navigator.usb.requestDevice({ filters: await getSTLinkUsbFilters() })
 * when the user selects ST-Link and getTransportKind returned 'usb'.
 */
export async function getSTLinkUsbFilters(): Promise<USBDeviceFilter[]> {
    const lib = await import('./stlink/lib/package.js')
    return lib.usb.filters
}
