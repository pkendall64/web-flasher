/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Build folder and firmware URL from context.
 * Path schema:
 * - Firmware: {baseUrl}/firmware, {baseUrl}/firmware/{version}/{region}/{config.firmware}/firmware.bin
 * - Backpack:  {baseUrl}/backpack, {baseUrl}/backpack/{version}/{config.firmware}/firmware.bin
 * Layout/logo in Configure.download use: {folder}/hardware/{deviceType}/{layout_file}, {folder}/hardware/logo/{logo_file}
 *
 * @param {object} context - { baseUrl, version, firmwareType, target: { config }, options: { region } }
 * @returns {{ folder: string, firmwareUrl: string }}
 */
export function buildFirmwareUrl(context) {
    const { baseUrl, version, firmwareType, target, options } = context
    const base = (baseUrl || '').replace(/\/$/, '')
    const config = target?.config || {}

    if (firmwareType === 'backpack') {
        const folder = `${base}/backpack`
        const firmwareUrl = `${folder}/${version}/${config.firmware || 'firmware'}/firmware.bin`
        return { folder, firmwareUrl }
    }

    // firmware (TX/RX)
    const folder = `${base}/firmware`
    const region = (options?.region || 'FCC')
    const firmwarePath = config.firmware || 'firmware'
    const firmwareUrl = `${folder}/${version}/${region}/${firmwarePath}/firmware.bin`
    return { folder, firmwareUrl }
}
