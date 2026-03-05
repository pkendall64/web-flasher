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
