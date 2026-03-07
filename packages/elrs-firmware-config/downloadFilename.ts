/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import type { FirmwareContext } from './types.js'

/**
 * Normalize version for filename: use display version (e.g. "3.5.3"). Ensures v-prefix for semantic versions.
 */
function normalizeVersion(context: FirmwareContext): string {
    const label = context.versionLabel
    if (label) {
        const s = String(label).trim()
        return /^v\d/.test(s) ? s : s ? 'v' + s : 'unknown'
    }
    return 'unknown'
}

/**
 * Sanitize a segment for use in filename (alphanumeric, dot, hyphen, underscore only).
 */
function sanitize(s: string | null | undefined): string {
    if (s == null || s === '') return ''
    return String(s).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ''
}

/**
 * Derive config summary label: default, bindphrase, or custom.
 */
function getConfigLabel(context: FirmwareContext): string {
    const opts = context.options || {}
    if (opts.uid) return 'bindphrase'
    if (opts.ssid) return 'custom'
    if (opts.wifiOnInternal !== 60) return 'custom'
    if (context.firmwareType === 'firmware' && context.target?.config) {
        const tx = opts.tx || {}
        const rx = opts.rx || {}
        if (tx.telemetryInterval !== 240 || tx.uartInverted !== true || tx.fanMinRuntime !== 30 ||
            tx.higherPower !== false || rx.uartBaud !== 420000 || rx.lockOnFirstConnect !== true) {
            return 'custom'
        }
    }
    return 'default'
}

/**
 * Dotted path into targets: vendor.radio.target (firmware) or vendor.target (backpack).
 */
function getTargetDottedPath(context: FirmwareContext): string {
    const t = context.target
    if (!t) return ''
    if (context.firmwareType === 'backpack') {
        return [t.vendor, t.target].filter(Boolean).join('.')
    }
    return [t.vendor, t.radio, t.target].filter(Boolean).join('.')
}

/**
 * Build a download filename from context (e.g. "ELRS-v3.5.3-vendor.radio.target-FCC-default.bin.gz").
 *
 * @param ext - File extension including leading dot if desired, e.g. '.bin.gz' or 'zip'
 * @param context - Context with versionLabel, target, options, firmwareType
 * @returns Filename for the download
 */
export function getDownloadFilename(ext: string = '.bin.gz', context?: FirmwareContext): string {
    if (!context) return 'ELRS-unknown-target-FCC-default' + ext
    const version = normalizeVersion(context)
    const target = sanitize(getTargetDottedPath(context)) || 'target'
    const region = context.firmwareType === 'backpack' ? '' : (sanitize(context.options?.region) || 'FCC')
    const configLabel = getConfigLabel(context)

    const name = ['ELRS', version, target, region, configLabel].filter(Boolean).join('-')
    return name + ext
}

/**
 * Build download filename from minimal build context (targetKey instead of full target).
 * Uses 'default' for config label when no full target is available.
 */
export function getDownloadFilenameFromBuildContext(
    ext: string,
    firmwareType: 'firmware' | 'backpack',
    context: { versionLabel?: string; targetKey: string; options?: FirmwareContext['options'] }
): string {
    const version = context.versionLabel
        ? (() => {
              const s = String(context.versionLabel).trim()
              return /^v\d/.test(s) ? s : s ? 'v' + s : 'unknown'
          })()
        : 'unknown'
    const target = sanitize(context.targetKey) || 'target'
    const region = firmwareType === 'backpack' ? '' : (sanitize(context.options?.region) || 'FCC')
    const name = ['ELRS', version, target, region, 'default'].filter(Boolean).join('-')
    return name + ext
}
