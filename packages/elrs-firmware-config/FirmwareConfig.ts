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
import { getVendors as getVendorsImpl, getRadios as getRadiosImpl, getTargets as getTargetsImpl, getTargetByKey as getTargetByKeyImpl } from './hardwareTargets.js'
import { getLuaScriptUrl as getLuaScriptUrlImpl } from './lua.js'
import { getSettings as getSettingsImpl, generateFirmware as generateFirmwareImpl } from './firmware.js'
import { buildFirmwareUrl as buildFirmwareUrlImpl } from './urls.js'
import { getDownloadFilenameFromBuildContext } from './downloadFilename.js'
import { getFirmwareTypeForFlavor, getTargetTypeForFlavor, type FirmwareFlavor } from './types.js'
import type {
    BuildContext,
    FirmwareContext,
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
 * Encapsulates baseUrl and flavor (tx, rx, txbp, vrx, aat, timer); maps flavor to firmware/backpack
 * asset path internally. Use one instance per directory and flavor.
 */
export class FirmwareConfig {
    readonly #baseUrl: string
    readonly #firmwareType: 'firmware' | 'backpack'
    readonly #targetType: string

    constructor(baseUrl: string, flavor: FirmwareFlavor) {
        this.#baseUrl = baseUrl
        this.#firmwareType = getFirmwareTypeForFlavor(flavor)
        this.#targetType = getTargetTypeForFlavor(flavor)
    }

    /** Asset path type: 'firmware' (Tx/Rx) or 'backpack' (TxBP, Vrx, Aat, Timer). */
    get firmwareType(): 'firmware' | 'backpack' {
        return this.#firmwareType
    }

    /** Target type string for this flavor: 'tx', 'rx', 'txbp', 'vrx', 'aat', or 'timer'. */
    get targetType(): string {
        return this.#targetType
    }

    async #resolveContext(build: BuildContext): Promise<FirmwareContext> {
        const target = await getTargetByKeyImpl(
            this.#baseUrl,
            this.#firmwareType,
            this.#targetType,
            build.targetKey
        )
        if (!target) throw new Error(`Unknown target key: ${build.targetKey}`)
        return {
            baseUrl: this.#baseUrl,
            version: build.version ?? '',
            versionLabel: build.versionLabel,
            firmwareType: this.#firmwareType,
            targetType: this.#targetType,
            radio: target.radio,
            target,
            options: build.options,
        }
    }

    getFirmwareIndex(): Promise<FirmwareIndex> {
        return getFirmwareIndexImpl(this.#baseUrl, this.#firmwareType)
    }

    getVersionOptions(params?: GetVersionOptionsParams): Promise<SelectOption[]> {
        return getVersionOptionsImpl(this.#baseUrl, this.#firmwareType, params)
    }

    getVendors(): Promise<{ id: string; name: string }[]> {
        return getVendorsImpl(this.#baseUrl, this.#firmwareType, this.#targetType)
    }

    getRadios(vendorId: string): Promise<{ id: string; label: string }[]> {
        return getRadiosImpl(this.#baseUrl, this.#firmwareType, vendorId, this.#targetType)
    }

    getTargets(options: GetTargetsOptionsInstance): Promise<TargetSelectOption[]> {
        return getTargetsImpl({
            ...options,
            baseUrl: this.#baseUrl,
            firmwareType: this.#firmwareType,
            targetType: this.#targetType,
        })
    }

    getLuaScriptUrl(version: string, versionLabel?: string | null): string {
        return getLuaScriptUrlImpl(this.#baseUrl, this.#firmwareType, version, versionLabel)
    }

    getSettings(deviceType: string, context: BuildContext): Promise<GetSettingsResult> {
        return this.#resolveContext(context).then((full) => getSettingsImpl(deviceType, full))
    }

    generateFirmware(context: BuildContext): Promise<[FirmwareFile[], GenerateFirmwareMetadata]> {
        return this.#resolveContext(context).then((full) => generateFirmwareImpl(full))
    }

    async buildFirmwareUrl(context: BuildContext): Promise<BuildFirmwareUrlResult> {
        const full = await this.#resolveContext(context)
        return buildFirmwareUrlImpl(full)
    }

    getDownloadFilename(ext: string = '.bin.gz', context?: BuildContext | null): string {
        if (!context) return getDownloadFilenameFromBuildContext(ext, this.#firmwareType, { targetKey: '' })
        return getDownloadFilenameFromBuildContext(ext, this.#firmwareType, {
            versionLabel: context.versionLabel,
            targetKey: context.targetKey,
            options: context.options,
        })
    }
}
