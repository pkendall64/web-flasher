/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/** Union of all flasher-specific errors for type-safe handling. */
export type FlasherError =
    | AlertError
    | MismatchError
    | PassthroughError
    | WrongMCU
    | CancelledError
    | BootloaderTimeoutError

/** Type guard: true if the value is a known flasher error. */
export function isFlasherError(error: unknown): error is FlasherError {
    return (
        error instanceof AlertError ||
        error instanceof MismatchError ||
        error instanceof PassthroughError ||
        error instanceof WrongMCU ||
        error instanceof CancelledError ||
        error instanceof BootloaderTimeoutError
    )
}

/**
 * Normalize unknown (from catch) to an Error for logging or rethrowing.
 * Preserves Error instances; wraps strings and other values in a new Error.
 */
export function normalizeError(error: unknown): Error {
    if (error instanceof Error) return error
    if (typeof error === 'string') return new Error(error)
    return new Error(String(error))
}

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

/** Thrown when the user or stream cancels an operation (e.g. xmodem flash). */
export class CancelledError extends Error {
    constructor(message: string = 'Operation cancelled') {
        super(message)
        this.name = 'CancelledError'
    }
}

/** Thrown when the device fails to enter bootloader mode within the expected time. */
export class BootloaderTimeoutError extends Error {
    constructor(message: string = 'Failed to enter bootloader mode in a reasonable time') {
        super(message)
        this.name = 'BootloaderTimeoutError'
    }
}
