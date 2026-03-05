/**
 * Version for filename: use display version (e.g. "3.5.3"). Ensures v-prefix for semantic versions.
 */
function normalizeVersion(context) {
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
function sanitize(s) {
    if (s == null || s === '') return ''
    return String(s).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || ''
}

/**
 * Derive config summary label: default, bindphrase, or custom.
 */
function getConfigLabel(context) {
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
function getTargetDottedPath(context) {
    const t = context.target
    if (!t) return ''
    if (context.firmwareType === 'backpack') {
        return [t.vendor, t.target].filter(Boolean).join('.')
    }
    return [t.vendor, t.radio, t.target].filter(Boolean).join('.')
}

/**
 * @param {string} ext - File extension including leading dot if desired, e.g. '.bin.gz' or 'zip'
 * @param {object} context - { versionLabel, target, options, firmwareType }
 * @returns {string} Filename for the download
 */
export function getDownloadFilename(ext = '.bin.gz', context) {
    const version = normalizeVersion(context)
    const target = sanitize(getTargetDottedPath(context)) || 'target'
    const region = context.firmwareType === 'backpack' ? '' : (sanitize(context.options?.region) || 'FCC')
    const configLabel = getConfigLabel(context)

    const name = ['ELRS', version, target, region, configLabel].filter(Boolean).join('-')
    return name + ext
}
