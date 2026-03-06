/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/**
 * Hardware layout JSON (from layout_file); merged with overlay and written into firmware.
 * May contain serial_tx, serial_rx, and other device-specific keys.
 */
export interface HardwareLayout {
    serial_tx?: unknown
    serial_rx?: unknown
    [key: string]: unknown
}

/**
 * Target device configuration (platform, firmware id, features, layout).
 */
export interface TargetConfig {
    platform?: string
    firmware?: string
    features?: string
    product_name?: string
    lua_name?: string
    layout_file?: string
    overlay?: HardwareLayout
    custom_layout?: HardwareLayout
    logo_file?: string
    /** App-only: upload methods supported by this target (e.g. 'zip'). */
    upload_methods?: string[]
    /** App-only: minimum firmware version. */
    min_version?: string
    /** App-only: STLink target config (offset, cpus). */
    stlink?: { offset: string; cpus: string[] }
}

/**
 * Selected target (vendor, radio, target name, config).
 */
export interface FirmwareTarget {
    vendor?: string
    radio?: string
    target?: string
    config: TargetConfig
}

/**
 * User-facing options for firmware (TX/RX/backpack).
 */
export interface FirmwareOptions {
    uid?: number[]
    ssid?: string
    password?: string
    region?: string
    wifiOnInternal?: number
    domain?: number
    tx?: {
        telemetryInterval?: number
        fanMinRuntime?: number
        uartInverted?: boolean
        higherPower?: boolean
        melodyType?: number
        melodyTune?: string
    }
    rx?: {
        rxAsTx?: boolean
        rxAsTxType?: boolean
        uartBaud?: number
        lockOnFirstConnect?: boolean
    }
}

/**
 * Context passed to getSettings, generateFirmware, buildFirmwareUrl, getDownloadFilename.
 */
export interface FirmwareContext {
    baseUrl?: string
    version: string
    versionLabel?: string
    firmwareType: 'firmware' | 'backpack'
    targetType?: 'tx' | 'rx'
    radio?: string
    target?: FirmwareTarget
    options?: FirmwareOptions
}

/**
 * Context for FirmwareConfig instance methods; baseUrl and firmwareType are supplied by the instance.
 */
export type FirmwareContextPartial = Omit<FirmwareContext, 'baseUrl' | 'firmwareType'>

/**
 * Options object written into firmware (patch keys like flash-discriminator, melody, etc.).
 */
export interface ConfigureOptions {
    'flash-discriminator'?: number
    uid?: number[]
    'wifi-on-interval'?: number
    'wifi-ssid'?: string
    'wifi-password'?: string
    'product-name'?: string
    'rcvr-uart-baud'?: number
    'lock-on-first-connection'?: boolean
    'tlm-interval'?: number
    'tlm-report'?: number
    'fan-runtime'?: number
    'uart-inverted'?: boolean
    'unlock-higher-power'?: boolean
    domain?: number
    beeptype?: number
    melody?: [number, number][]
    'rcvr-invert-tx'?: boolean
    'r9mm-mini-sbus'?: boolean
    [key: string]: unknown
}

/**
 * Result of getSettings().
 */
export interface GetSettingsResult {
    config: TargetConfig
    firmwareUrl: string
    folder: string
    options: ConfigureOptions
}

/**
 * Single firmware file (binary data + load address).
 */
export interface FirmwareFile {
    data: Uint8Array
    address: number
}

/**
 * Firmware index (index.json): branches and tags for version selection.
 */
export interface FirmwareIndex {
    branches?: Record<string, string>
    tags?: Record<string, string>
}

/**
 * Option item for version/vendor/radio dropdowns (title + value).
 */
export interface SelectOption<T = string> {
    title: string
    value: T
}

/**
 * Option item for target list; value is full FirmwareTarget.
 */
export interface TargetSelectOption {
    title: string
    value: FirmwareTarget
}

/**
 * Options for getVersionOptions().
 */
export interface GetVersionOptionsParams {
    includeBranches?: boolean
}

/**
 * Options for getTargets().
 */
export interface GetTargetsOptions {
    baseUrl: string
    firmwareType: 'firmware' | 'backpack'
    targetType: string
    vendor?: string | null
    radio?: string | null
    version?: string | null
    versionLabel?: string | null
    includeBranchVersions?: boolean
}

/**
 * Options for FirmwareConfig#getTargets(); baseUrl and firmwareType come from the instance.
 */
export type GetTargetsOptionsInstance = Omit<GetTargetsOptions, 'baseUrl' | 'firmwareType'>

/**
 * Metadata returned with generateFirmware().
 */
export interface GenerateFirmwareMetadata {
    config: TargetConfig
    firmwareUrl: string
    options: ConfigureOptions
    deviceType: string
    radioType: string | null
    txType: string | undefined
}
