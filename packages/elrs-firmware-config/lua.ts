/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

/**
 * Get the URL for the Lua script download (elrs.lua or elrsV3.lua for versions < 4.0.0).
 */
export function getLuaScriptUrl(
    baseUrl: string,
    firmwareType: 'firmware' | 'backpack',
    version: string,
    versionLabel?: string | null
): string {
    const base = baseUrl.replace(/\/$/, '')
    const file = versionLabel != null && versionLabel < '4.0.0' ? 'elrsV3.lua' : 'elrs.lua'
    return `${base}/${firmwareType}/${version}/lua/${file}`
}
