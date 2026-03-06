/** Detected MCU target info from STLink (type, core, flash/sram sizes, etc.). */
export interface StlinkTarget {
    flash_start: number
    sram_start: number
    type: string
    core: string
    dev_id: string
    flash_size: string
    sram_size: string
    eeprom_size?: number
    [key: string]: string | number | undefined
}

export interface StlinkStatus {
    halted: boolean
    debug: boolean
    [key: string]: unknown
}

export default class WebStlink {
    constructor(dbg?: unknown)
    _stlink: { ver_str: string; [key: string]: unknown }
    get connected(): boolean
    attach(device: USBDevice, dbg: unknown): Promise<void>
    detach(): Promise<void>
    halt(): Promise<void>
    flash(addr: number, data: ArrayBuffer | Uint8Array): Promise<void>
    /** expected_cpus: list of allowed CPU type names for device detection. */
    detect_cpu(cpus: string[], _x: null): Promise<StlinkTarget>
    inspect_cpu(): Promise<StlinkStatus>
    set_debug_enable(en: boolean): Promise<void>
    add_callback(name: 'halted' | 'resumed', handler: (status: StlinkStatus) => void): void
}
