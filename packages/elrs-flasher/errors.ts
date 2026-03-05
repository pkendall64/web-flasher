/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/**
 * User-facing alert error with optional title and type (e.g. 'error' | 'warning').
 */
export class AlertError extends Error {
    title?: string
    type: string

    constructor(title?: string, message?: string, type: string = 'error') {
        super(message)
        this.name = 'AlertError'
        this.title = title
        this.type = type
    }
}

/** Thrown when the connected RX target does not match the selected firmware target. */
export class MismatchError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'MismatchError'
    }
}

/** Thrown when passthrough initialization fails (e.g. invalid serial RX config). */
export class PassthroughError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'PassthroughError'
    }
}

/** Thrown when the connected MCU does not match the selected platform (e.g. ESP32 vs ESP8266). */
export class WrongMCU extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'WrongMCU'
    }
}
