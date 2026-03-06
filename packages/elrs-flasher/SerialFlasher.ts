/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { ESPFlasher } from './espflasher.js'
import type { FlasherMethod } from './espflasher.js'
import { XmodemFlasher } from './xmodem.js'
import type { Terminal } from './types.js'
import type { SerialFlasherParams } from './types.js'

export type { SerialFlasherParams } from './types.js'

/**
 * Factory for serial-based flashers (ESP or Xmodem). Use this instead of constructing
 * ESPFlasher or XmodemFlasher directly when the platform is determined at runtime.
 *
 * @param device - Web Serial port (e.g. from navigator.serial.requestPort()).
 * @param params - deviceType, method, config (platform, firmware, baud), options, firmwareUrl.
 * @param term - Terminal for log output.
 * @returns ESPFlasher for ESP8266/ESP32 targets, XmodemFlasher for STM32 (CRSF/GHST bootloader).
 */
export function createSerialFlasher(
    device: SerialPort,
    params: SerialFlasherParams,
    term: Terminal
): ESPFlasher | XmodemFlasher {
    const { config } = params
    const platform = config.platform ?? ''

    if (platform === 'stm32') {
        const xmodemDevice = device as unknown as {
            readable: ReadableStream<Uint8Array>
            writable: WritableStream<Uint8Array>
        }
        return new XmodemFlasher(
            xmodemDevice,
            params.deviceType,
            params.method,
            { firmware: config.firmware ?? '' },
            params.options,
            params.firmwareUrl,
            term
        )
    }

    const espConfig = {
        platform,
        firmware: config.firmware,
        baud: config.baud,
    }
    return new ESPFlasher(
        device,
        params.deviceType,
        params.method as FlasherMethod,
        espConfig,
        params.options,
        params.firmwareUrl,
        term
    )
}
