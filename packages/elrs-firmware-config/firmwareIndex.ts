/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { compareSemanticVersions } from './version.js'
import type { FirmwareIndex } from './types.js'
import type { SelectOption } from './types.js'
import type { GetVersionOptionsParams } from './types.js'

const indexCache = new Map<string, FirmwareIndex>()

function cacheKey(baseUrl: string, firmwareType: string): string {
    return `${baseUrl}|${firmwareType}`
}

/**
 * Fetch firmware index (index.json). Results are cached by (baseUrl, firmwareType).
 */
export async function getFirmwareIndex(
    baseUrl: string,
    firmwareType: 'firmware' | 'backpack'
): Promise<FirmwareIndex> {
    const key = cacheKey(baseUrl, firmwareType)
    const cached = indexCache.get(key)
    if (cached) return cached
    const base = baseUrl.replace(/\/$/, '')
    const url = `${base}/${firmwareType}/index.json`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch firmware index: ${response.status}`)
    const data = (await response.json()) as FirmwareIndex
    indexCache.set(key, data)
    return data
}

/**
 * Get version options for dropdown (from index.json). Sorted by semantic version for releases.
 */
export async function getVersionOptions(
    baseUrl: string,
    firmwareType: 'firmware' | 'backpack',
    params?: GetVersionOptionsParams
): Promise<SelectOption[]> {
    const index = await getFirmwareIndex(baseUrl, firmwareType)
    const options: SelectOption[] = []
    const branches = index.branches ?? {}
    const tags = index.tags ?? {}
    const includeBranches = params?.includeBranches ?? false

    if (includeBranches) {
        Object.entries(branches).forEach(([key, value]) => {
            options.push({ title: key, value })
        })
        Object.entries(tags).forEach(([key, value]) => {
            if (key.indexOf('-') !== -1) options.push({ title: key, value })
        })
        options.sort((a, b) => a.title.localeCompare(b.title))
    } else {
        let first = true
        Object.keys(tags)
            .sort(compareSemanticVersions)
            .reverse()
            .forEach((key) => {
                if (key.indexOf('-') === -1 || first) {
                    options.push({ title: key, value: tags[key] })
                    first = false
                }
            })
    }
    return options
}
