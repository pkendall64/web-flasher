/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

// ——— Primary API (use with elrs-firmware-config generateFirmware) ———
export { flashFirmware, getTransportKind, getSTLinkUsbFilters } from './flash.js'
export type { FlashTransport, FlashMethod, FlashFirmwareParams } from './flash.js'

// ——— Errors ———
export {
    AlertError,
    MismatchError,
    PassthroughError,
    WrongMCU,
    CancelledError,
    BootloaderTimeoutError,
    isFlasherError,
    normalizeError,
} from './errors.js'
export type { FlasherError } from './errors.js'

// ——— Low-level flashers (when you need direct control) ———
export { STLink } from './stlink.js'
export { ESPFlasher } from './espflasher.js'
export type { FlasherMethod, FlasherDeviceType } from './espflasher.js'
export { XmodemFlasher } from './xmodem.js'
export type { XmodemFlasherConfig } from './xmodem.js'
export { createSerialFlasher } from './SerialFlasher.js'
export type { SerialFlasherParams } from './SerialFlasher.js'
export { TransportEx } from './serialex.js'
export { Bootloader, Passthrough } from './passthrough.js'
export type { Terminal, ProgressCallback, STLinkConfig, FirmwareChunk, ESPFlasherConfig, FlasherOptions } from './types.js'
