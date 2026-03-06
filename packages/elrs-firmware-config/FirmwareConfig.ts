/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { getFirmwareIndex as getFirmwareIndexImpl } from './firmwareIndex.js'
import { getVersionOptions as getVersionOptionsImpl } from './firmwareIndex.js'
import { getVendors as getVendorsImpl, getRadios as getRadiosImpl, getTargets as getTargetsImpl } from './hardwareTargets.js'
import { getLuaScriptUrl as getLuaScriptUrlImpl } from './lua.js'
import { getSettings as getSettingsImpl, generateFirmware as generateFirmwareImpl } from './firmware.js'
import { buildFirmwareUrl as buildFirmwareUrlImpl } from './urls.js'
import { getDownloadFilename as getDownloadFilenameImpl } from './downloadFilename.js'
import type {
    FirmwareContext,
    FirmwareContextPartial,
    FirmwareIndex,
    GetSettingsResult,
    GetTargetsOptionsInstance,
    FirmwareFile,
    GenerateFirmwareMetadata,
    SelectOption,
    TargetSelectOption,
    GetVersionOptionsParams,
} from './types.js'
import type { BuildFirmwareUrlResult } from './urls.js'

/**
 * Encapsulates baseUrl and firmwareType; owns asset/index/targets usage and context-based operations.
 */
export class FirmwareConfig {
    readonly #baseUrl: string
    readonly #firmwareType: 'firmware' | 'backpack'

    constructor(baseUrl: string, firmwareType: 'firmware' | 'backpack') {
        this.#baseUrl = baseUrl
        this.#firmwareType = firmwareType
    }

    #buildContext(partial: FirmwareContextPartial): FirmwareContext {
        return {
            ...partial,
            baseUrl: this.#baseUrl,
            firmwareType: this.#firmwareType,
        }
    }

    getFirmwareIndex(): Promise<FirmwareIndex> {
        return getFirmwareIndexImpl(this.#baseUrl, this.#firmwareType)
    }

    getVersionOptions(params?: GetVersionOptionsParams): Promise<SelectOption[]> {
        return getVersionOptionsImpl(this.#baseUrl, this.#firmwareType, params)
    }

    getVendors(targetType: string): Promise<{ id: string; name: string }[]> {
        return getVendorsImpl(this.#baseUrl, this.#firmwareType, targetType)
    }

    getRadios(vendorId: string, targetType: string): Promise<{ id: string; label: string }[]> {
        return getRadiosImpl(this.#baseUrl, this.#firmwareType, vendorId, targetType)
    }

    getTargets(options: GetTargetsOptionsInstance): Promise<TargetSelectOption[]> {
        return getTargetsImpl({
            ...options,
            baseUrl: this.#baseUrl,
            firmwareType: this.#firmwareType,
        })
    }

    getLuaScriptUrl(version: string, versionLabel?: string | null): string {
        return getLuaScriptUrlImpl(this.#baseUrl, this.#firmwareType, version, versionLabel)
    }

    getSettings(deviceType: string, context: FirmwareContextPartial): Promise<GetSettingsResult> {
        return getSettingsImpl(deviceType, this.#buildContext(context))
    }

    generateFirmware(context: FirmwareContextPartial): Promise<[FirmwareFile[], GenerateFirmwareMetadata]> {
        return generateFirmwareImpl(this.#buildContext(context))
    }

    buildFirmwareUrl(context: FirmwareContextPartial): BuildFirmwareUrlResult {
        return buildFirmwareUrlImpl(this.#buildContext(context))
    }

    getDownloadFilename(ext: string = '.bin.gz', context?: FirmwareContextPartial | null): string {
        return getDownloadFilenameImpl(ext, context ? this.#buildContext(context) : undefined)
    }
}
