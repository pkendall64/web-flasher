/**
 * Re-export firmware index and target types from elrs-firmware-config.
 * Prefer importing from 'elrs-firmware-config' directly.
 */
export type { FirmwareIndex, TargetConfig, FirmwareTarget } from 'elrs-firmware-config'

/** Alias for TargetConfig (hardware target config from targets.json). */
export type { TargetConfig as HardwareTargetConfig } from 'elrs-firmware-config'
