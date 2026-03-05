/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/**
 * Compare two semantic version strings (e.g. "3.5.0", "3.5.1-rc1").
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareSemanticVersions(a: string, b: string): number {
    const [v1, d1] = a.split('-')
    const [v2, d2] = b.split('-')

    const v1Sections = v1.split('.')
    const v2Sections = v2.split('.')

    for (let i = 0; i < Math.max(v1Sections.length, v2Sections.length); i++) {
        const v1Section = parseInt(v1Sections[i] || '0', 10)
        const v2Section = parseInt(v2Sections[i] || '0', 10)

        if (v1Section > v2Section) return 1
        if (v1Section < v2Section) return -1
    }

    if (!d1 && d2) return 1
    if (d1 && !d2) return -1
    if (d1 && d2) return d1.localeCompare(d2)
    return 0
}

/**
 * Compare semantic versions, ignoring release-candidate suffix (e.g. "3.5.0-rc1" vs "3.5.0").
 *
 * @param a - First version string (may be undefined)
 * @param b - Second version string (may be undefined)
 * @returns 1 if a > b, -1 if a < b, 0 if equal or either undefined
 */
export function compareSemanticVersionsRC(a: string | undefined, b: string | undefined): number {
    if (a === undefined || b === undefined) return 0
    return compareSemanticVersions(a.replace(/-.*/, ''), b.replace(/-.*/, ''))
}
