/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { compareSemanticVersions } from './version.js'
import type { TargetConfig, FirmwareTarget } from './types.js'
import type { GetTargetsOptions, TargetSelectOption } from './types.js'

/** Raw vendor entry: name + radio/type keys -> target key -> config */
type VendorEntry = { name?: string; [key: string]: unknown }
type TargetsRaw = Record<string, VendorEntry>

const targetsCache = new Map<string, TargetsRaw>()

function cacheKey(baseUrl: string, firmwareType: string): string {
    return `${baseUrl}|${firmwareType}`
}

async function getTargetsRaw(baseUrl: string, firmwareType: 'firmware' | 'backpack'): Promise<TargetsRaw> {
    const key = cacheKey(baseUrl, firmwareType)
    const cached = targetsCache.get(key)
    if (cached) return cached
    const base = baseUrl.replace(/\/$/, '')
    const url = `${base}/${firmwareType}/hardware/targets.json`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch hardware targets: ${response.status}`)
    const data = (await response.json()) as TargetsRaw
    targetsCache.set(key, data)
    return data
}

/** Radio id -> display label (for firmware only). */
export const RADIO_LABELS: Record<string, string> = {
    tx_2400: '2.4GHz Transmitter',
    tx_900: '900MHz Transmitter',
    tx_dual: 'Dual 2.4GHz/900MHz Transmitter',
    rx_2400: '2.4GHz Receiver',
    rx_900: '900MHz Receiver',
    rx_dual: 'Dual 2.4GHz/900MHz Receiver',
}

function hasTargetsForType(vendor: VendorEntry, targetType: string, firmwareType: 'firmware' | 'backpack'): boolean {
    if (firmwareType === 'backpack') {
        return Object.prototype.hasOwnProperty.call(vendor, targetType)
    }
    return Object.keys(vendor).some((k) => k.startsWith(targetType))
}

/**
 * Get vendors that have targets for the given targetType.
 */
export async function getVendors(
    baseUrl: string,
    firmwareType: 'firmware' | 'backpack',
    targetType: string
): Promise<{ id: string; name: string }[]> {
    const raw = await getTargetsRaw(baseUrl, firmwareType)
    const out: { id: string; name: string }[] = []
    for (const [id, vendor] of Object.entries(raw)) {
        if (hasTargetsForType(vendor, targetType, firmwareType) && vendor.name) {
            out.push({ id, name: String(vendor.name) })
        }
    }
    out.sort((a, b) => a.name.localeCompare(b.name))
    return out
}

/**
 * Get radios for a vendor (firmware only). For backpack returns empty array.
 */
export async function getRadios(
    baseUrl: string,
    firmwareType: 'firmware' | 'backpack',
    vendorId: string,
    targetType: string
): Promise<{ id: string; label: string }[]> {
    if (firmwareType === 'backpack') return []
    const raw = await getTargetsRaw(baseUrl, firmwareType)
    const vendor = raw[vendorId]
    if (!vendor) return []
    const out: { id: string; label: string }[] = []
    for (const key of Object.keys(vendor)) {
        if (key === 'name') continue
        if (key.startsWith(targetType)) {
            out.push({ id: key, label: RADIO_LABELS[key] ?? key })
        }
    }
    return out
}

/**
 * Get target list filtered by vendor, radio, version. Applies min_version when versionLabel provided and not includeBranchVersions.
 */
export async function getTargets(options: GetTargetsOptions): Promise<TargetSelectOption[]> {
    const {
        baseUrl,
        firmwareType,
        targetType,
        vendor = null,
        radio = null,
        version = null,
        versionLabel = null,
        includeBranchVersions = false,
    } = options
    const raw = await getTargetsRaw(baseUrl, firmwareType)
    const result: TargetSelectOption[] = []
    const versionOk = (cfg: TargetConfig): boolean => {
        if (includeBranchVersions) return true
        if (versionLabel == null) return true
        return compareSemanticVersions(versionLabel, cfg.min_version ?? '0') >= 0
    }

    for (const [vk, v] of Object.entries(raw)) {
        if (vendor != null && vk !== vendor) continue
        for (const [rk, r] of Object.entries(v)) {
            if (rk === 'name') continue
            const isMatch =
                firmwareType === 'backpack'
                    ? rk === targetType
                    : rk.startsWith(targetType)
            if (!isMatch) continue
            if (radio != null && rk !== radio) continue
            const targets = r as Record<string, TargetConfig>
            for (const [ck, cfg] of Object.entries(targets)) {
                if (typeof cfg !== 'object' || cfg == null) continue
                const config = cfg as TargetConfig
                if (!versionOk(config)) continue
                result.push({
                    title: config.product_name ?? '',
                    value: {
                        vendor: vk,
                        radio: firmwareType === 'firmware' ? rk : undefined,
                        target: ck,
                        config,
                    },
                })
            }
        }
    }
    result.sort((a, b) => a.title.localeCompare(b.title))
    return result
}
