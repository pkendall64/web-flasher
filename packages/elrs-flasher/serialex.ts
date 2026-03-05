/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { Transport } from 'esptool-js'

/** Shape we need to access for read_line (parent Transport has private buffer/reader). */
interface TransportWithReader {
    buffer: Uint8Array
    reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * Extended Transport with delimiter-based read_line and string/array write helpers.
 */
export class TransportEx extends Transport {
    delimiters: Uint8Array[] = []

    constructor(device: SerialPort, tracing: boolean = false) {
        super(device, tracing, true)
    }

    ui8ToBstr(u8Array: Uint8Array): string {
        let bStr = ''
        for (let i = 0; i < u8Array.length; i++) {
            bStr += String.fromCharCode(u8Array[i])
        }
        return bStr
    }

    bstrToUi8(bStr: string): Uint8Array {
        const len = bStr.length
        const u8array = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            u8array[i] = bStr.charCodeAt(i)
        }
        return u8array
    }

    set_delimiters(delimiters: string[] = ['\n', 'CCC']): void {
        this.delimiters = []
        for (const d of delimiters) {
            this.delimiters.push(this.bstrToUi8(d))
        }
    }

    read_line = async (timeout: number = 0): Promise<string> => {
        const self = this as unknown as TransportWithReader
        console.log('Read with timeout ' + timeout)
        let t: ReturnType<typeof setTimeout> | undefined
        let packet = self.buffer
        self.buffer = new Uint8Array(0)
        const delimiters = this.delimiters

        function findDelimeter(pkt: Uint8Array): number {
            const index = pkt.findIndex((_, i, a) => {
                for (const d of delimiters) {
                    if (d.every((v, j) => a[i + j] === v)) return true
                }
                return false
            })
            if (index !== -1) {
                for (const d of delimiters) {
                    if (d.every((v, j) => pkt[index + j] === v)) return index + d.length
                }
            }
            return -1
        }

        let index = findDelimeter(packet)
        if (index === -1) {
            const reader = self.reader
            try {
                if (timeout > 0) {
                    t = setTimeout(function () {
                        reader.cancel()
                    }, timeout)
                }
                do {
                    const { value, done } = await reader.read()
                    if (done) {
                        await this.disconnect()
                        await this.connect(this.baudrate)
                        return ''
                    }
                    if (value != null) packet = this.appendArray(packet, value)
                    index = findDelimeter(packet)
                } while (index === -1)
            } finally {
                if (timeout > 0 && t !== undefined) {
                    clearTimeout(t)
                }
            }
        }
        self.buffer = packet.slice(index)
        packet = packet.slice(0, index)
        if (this.tracing && packet != null) {
            console.log('Read bytes')
            console.log(this.hexConvert(packet))
        }
        return this.ui8ToBstr(packet)
    }

    write_string = async (data: string): Promise<void> => {
        const w = this.device?.writable?.getWriter()
        if (!w) return
        const out = this.bstrToUi8(data)
        if (this.tracing) {
            console.log('Write bytes')
            console.log(this.hexConvert(out))
        }
        await w.write(out)
        w.releaseLock()
    }

    write_array = async (data: Uint8Array): Promise<void> => {
        const w = this.device?.writable?.getWriter()
        if (!w) return
        if (this.tracing) {
            console.log('Write bytes')
            console.log(this.hexConvert(data))
        }
        await w.write(data)
        w.releaseLock()
    }
}
