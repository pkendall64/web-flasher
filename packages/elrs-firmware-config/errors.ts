/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/** Recognised firmware configure failure reasons. */
export const ConfigureErrorCode = {
    /** Configuration magic bytes not found in the binary (not a 3.x firmware). */
    MAGIC_NOT_FOUND: 'MAGIC_NOT_FOUND',
    /** HTTP request failed (fetch returned !ok). */
    HTTP_ERROR: 'HTTP_ERROR',
    /** Binary does not have the expected firmware magic byte. */
    INVALID_FIRMWARE_MAGIC: 'INVALID_FIRMWARE_MAGIC',
} as const

export type ConfigureErrorCode = (typeof ConfigureErrorCode)[keyof typeof ConfigureErrorCode]

/** Thrown when firmware configuration or fetch fails. */
export class ConfigureError extends Error {
    readonly code: ConfigureErrorCode

    constructor(message: string, code: ConfigureErrorCode) {
        super(message)
        this.name = 'ConfigureError'
        this.code = code
    }
}
