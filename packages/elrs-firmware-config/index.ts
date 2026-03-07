/*
 * ExpressLRS Firmware Config
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

// ——— Primary API ———
export { FirmwareConfig } from './FirmwareConfig.js'
export { FirmwareFlavor } from './types.js'
export type {
    BuildContext,
    TargetKey,
    TargetSelectOption,
    FirmwareFile,
    GenerateFirmwareMetadata,
    TargetConfig,
    FirmwareOptions,
    GetSettingsResult,
    ConfigureOptions,
    FirmwareTarget,
    HardwareLayout,
    FirmwareIndex,
    SelectOption,
    GetVersionOptionsParams,
    GetTargetsOptions,
    GetTargetsOptionsInstance,
} from './types.js'

// ——— Utilities ———
export { RADIO_LABELS } from './hardwareTargets.js'
export { compareSemanticVersions, compareSemanticVersionsRC } from './version.js'
export { MelodyParser } from './melody.js'
export type { MelodyNote } from './melody.js'
export type { BuildFirmwareUrlResult } from './urls.js'
export { Configure } from './configure.js'

// ——— Errors ———
export { ConfigureError, ConfigureErrorCode } from './errors.js'
