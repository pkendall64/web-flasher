/**
 * Types for firmware index.json and hardware targets.json (asset shapes).
 */
export interface FirmwareIndex {
  branches?: Record<string, string>
  tags?: Record<string, string>
}

export interface HardwareVendor {
  name?: string
  [key: string]: unknown
}

export interface HardwareTargetConfig {
  product_name?: string
  min_version?: string
  [key: string]: unknown
}
