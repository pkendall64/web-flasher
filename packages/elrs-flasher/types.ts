/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/**
 * Terminal / logger interface used by STLink, ESPFlasher, XmodemFlasher, Passthrough.
 */
export interface Terminal {
    writeln(str: string): void
    write?(str: string): void
}

/**
 * Progress callback: (fileIndex, percent, total, message?).
 */
export type ProgressCallback = (fileNumber: number, percent: number, total: number, message?: string) => void

/**
 * STLink config slice used in connect/flash (stlink.offset, stlink.cpus).
 */
export interface STLinkConfig {
    stlink: {
        offset: string
        cpus: unknown
    }
}

/**
 * Single firmware chunk for flashing: data + address.
 */
export interface FirmwareChunk {
    data: Uint8Array
    address: number
}

/**
 * Config slice for ESP flasher (platform, firmware, baud).
 */
export interface ESPFlasherConfig {
    platform: string
    firmware?: string
    baud?: number
}
