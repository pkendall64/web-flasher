/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import { TransportEx } from './serialex.js'
import { Bootloader, Passthrough } from './passthrough.js'
import { MismatchError, PassthroughError } from './errors.js'
import type { Terminal } from './types.js'
import type { ProgressCallback } from './types.js'
import type { FirmwareChunk } from './types.js'

const log = {
    info: (_: unknown) => {},
    warn: (_: unknown) => {},
}

const SOH = 0x01
const EOT = 0x04
const ACK = 0x06
const NAK = 0x15
const FILLER = 0x1A
const CRC_MODE = 0x43 // 'C'

/** Device with readable/writable streams (e.g. SerialPort). */
interface XmodemDevice {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
}

interface XmodemLogger {
    log(str: string): void
}

class Xmodem {
    XMODEM_OP_MODE: 'crc' | 'normal' = 'crc'
    XMODEM_START_BLOCK = 1
    block_size = 128
    device: XmodemDevice
    logger: XmodemLogger

    constructor(device: XmodemDevice, logger: XmodemLogger) {
        this.device = device
        this.logger = logger
    }

    emit = (_msg: string, _obj: unknown): void => {
        console.log(`${_msg}: ${_obj}`)
    }

    crc16xmodem(buf: Uint8Array): number {
        let crc = 0x0
        for (let index = 0; index < buf.length; index++) {
            const byte = buf[index]
            let code = (crc >>> 8) & 0xff
            code ^= byte & 0xff
            code ^= code >>> 4
            crc = (crc << 8) & 0xffff
            crc ^= code
            code = (code << 5) & 0xffff
            crc ^= code
            code = (code << 7) & 0xffff
            crc ^= code
        }
        return crc
    }

    send = async (dataBuffer: Uint8Array, progress: ProgressCallback): Promise<void> => {
        const _self = this
        const packagedBuffer: (Uint8Array | string)[] = []
        let blockNumber = this.XMODEM_START_BLOCK
        let sentEof = false
        let buffer = dataBuffer

        log.info(buffer.length)

        for (let i = 0; i < this.XMODEM_START_BLOCK; i++) {
            packagedBuffer.push('')
        }

        while (buffer.length > 0) {
            const chunk = buffer.slice(0, this.block_size)
            const currentBlock = new Uint8Array(this.block_size)
            currentBlock.set(chunk, 0)
            for (let i = chunk.length; i < this.block_size; i++) {
                currentBlock[i] = FILLER
            }
            buffer = buffer.slice(this.block_size)
            packagedBuffer.push(currentBlock)
        }

        let sending = true

        _self.emit('ready', packagedBuffer.length - 1)

        const sendBlock = this.sendBlock.bind(this)
        const write = this.write.bind(this)
        const sendData = async (data: Uint8Array): Promise<void> => {
            if (data[0] === CRC_MODE && blockNumber === _self.XMODEM_START_BLOCK) {
                log.info('[SEND] - received C byte for CRC transfer!')
                _self.XMODEM_OP_MODE = 'crc'
                if (packagedBuffer.length > blockNumber) {
                    _self.emit('start', _self.XMODEM_OP_MODE)
                    await sendBlock(blockNumber, packagedBuffer[blockNumber] as Uint8Array, _self.XMODEM_OP_MODE)
                    _self.emit('send', blockNumber)
                    blockNumber++
                }
            } else if (data[0] === NAK && blockNumber === _self.XMODEM_START_BLOCK) {
                log.info('[SEND] - received NAK byte for standard checksum transfer!')
                _self.XMODEM_OP_MODE = 'normal'
                if (packagedBuffer.length > blockNumber) {
                    _self.emit('start', _self.XMODEM_OP_MODE)
                    await sendBlock(blockNumber, packagedBuffer[blockNumber] as Uint8Array, _self.XMODEM_OP_MODE)
                    _self.emit('send', blockNumber)
                    blockNumber++
                }
            } else if (data[0] === ACK && blockNumber > _self.XMODEM_START_BLOCK) {
                log.info('ACK RECEIVED')
                _self.emit('recv', 'ACK')
                if (packagedBuffer.length > blockNumber) {
                    await sendBlock(blockNumber, packagedBuffer[blockNumber] as Uint8Array, _self.XMODEM_OP_MODE)
                    _self.emit('send', blockNumber)
                    blockNumber++
                    if (blockNumber % 10 === 0) {
                        const percent = Math.floor((blockNumber * 100) / packagedBuffer.length)
                        progress(1, percent, 100)
                        _self.logger.log(`${percent}% uploaded...`)
                    }
                } else if (packagedBuffer.length === blockNumber) {
                    if (sentEof === false) {
                        sentEof = true
                        log.info('WE HAVE RUN OUT OF STUFF TO SEND, EOT EOT!')
                        _self.emit('send', 'EOT')
                        await write(new Uint8Array([EOT]))
                    } else {
                        log.info('[SEND] - Finished!')
                        _self.emit('stop', 0)
                        progress(1, 100, 100)
                        sending = false
                    }
                }
            } else if (data[0] === NAK && blockNumber > _self.XMODEM_START_BLOCK) {
                if (blockNumber === packagedBuffer.length && sentEof) {
                    log.info('[SEND] - Resending EOT, because receiver responded with NAK.')
                    _self.emit('send', 'EOT')
                    await write(new Uint8Array([EOT]))
                } else {
                    log.info('[SEND] - Packet corruption detected, resending previous block.')
                    _self.emit('recv', 'NAK')
                    blockNumber--
                    if (packagedBuffer.length > blockNumber) {
                        await sendBlock(blockNumber, packagedBuffer[blockNumber] as Uint8Array, _self.XMODEM_OP_MODE)
                        _self.emit('send', blockNumber)
                        blockNumber++
                    }
                }
            } else {
                log.warn('GOT SOME UNEXPECTED DATA which was not handled properly!')
                log.warn('===>')
                log.warn(data)
                log.warn('<===')
                log.warn('blockNumber: ' + blockNumber)
            }
        }

        while (sending) {
            const reader = this.device.readable.getReader()
            const { value, done } = await reader.read()
            if (done) {
                reader.releaseLock()
                throw new Error('cancelled')
            }
            reader.releaseLock()
            await sendData(value!)
        }
        this.logger.log('Flash complete!')
    }

    sendBlock = async (blockNr: number, blockData: Uint8Array, mode: 'crc' | 'normal'): Promise<void> => {
        function _appendBuffer(buffer1: Uint8Array, buffer2: Uint8Array): Uint8Array {
            const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
            tmp.set(buffer1, 0)
            tmp.set(buffer2, buffer1.byteLength)
            return tmp
        }

        let crcCalc = 0
        let sendBuffer = _appendBuffer(new Uint8Array([SOH, blockNr, 0xff - blockNr]), blockData)
        log.info('SENDBLOCK! Data length: ' + blockData.byteLength)
        if (mode === 'crc') {
            const crc = this.crc16xmodem(blockData)
            sendBuffer = _appendBuffer(sendBuffer, new Uint8Array([(crc >>> 8) & 0xff, crc & 0xff]))
        } else {
            for (let i = 3; i < sendBuffer.byteLength; i++) {
                crcCalc = crcCalc + sendBuffer[i]
            }
            crcCalc = crcCalc % 256
            sendBuffer = _appendBuffer(sendBuffer, new Uint8Array([crcCalc]))
        }
        log.info('Sending buffer with total length: ' + sendBuffer.length)
        await this.write(sendBuffer)
    }

    write = async (buf: Uint8Array): Promise<void> => {
        const writer = this.device.writable.getWriter()
        await writer.write(buf)
        writer.releaseLock()
    }
}

/** Config slice for Xmodem flasher (firmware name). */
export interface XmodemFlasherConfig {
    firmware: string
}

/**
 * Xmodem-based flasher for CRSF/GHST bootloader (e.g. STM32 RX).
 */
export class XmodemFlasher {
    device: XmodemDevice
    config: XmodemFlasherConfig
    options: unknown
    firmwareUrl: string
    terminal: Terminal
    xmodem: Xmodem
    transport!: TransportEx
    passthrough!: Passthrough
    init_seq1!: Uint8Array

    constructor(
        device: XmodemDevice,
        _deviceType: string,
        _method: string,
        config: XmodemFlasherConfig,
        options: unknown,
        firmwareUrl: string,
        terminal: Terminal
    ) {
        this.device = device
        this.config = config
        this.options = options
        this.firmwareUrl = firmwareUrl
        this.terminal = terminal
        this.xmodem = new Xmodem(this.device, this)
    }

    _sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    log(str: string): void {
        this.terminal.writeln(str)
    }

    connect = async (): Promise<string> => {
        if (this.config.firmware.startsWith('GHOST')) {
            this.init_seq1 = Bootloader.get_init_seq('GHST')
        } else {
            this.init_seq1 = Bootloader.get_init_seq('CRSF')
        }

        this.transport = new TransportEx(this.device as unknown as SerialPort, true)
        await this.transport.connect(420000)
        this.passthrough = new Passthrough(this.transport, this.terminal, this.config.firmware, 420000)
        await this.startBootloader()
        return 'XModem Flasher'
    }

    startBootloader = async (force: boolean = false): Promise<void> => {
        this.transport.set_delimiters(['CCC'])
        const data = await this.transport.read_line(2000)
        let gotBootloader = data.endsWith('CCC')
        if (!gotBootloader) {
            let delaySeq2 = 500
            await this.passthrough.betaflight()
            this.transport.set_delimiters(['CCC'])
            const data2 = await this.transport.read_line(2000)
            gotBootloader = data2.endsWith('CCC')
            if (!gotBootloader) {
                this.transport.set_delimiters(['\n', 'CCC'])
                let currAttempt = 0
                this.log('Attempting to reboot into bootloader...')
                while (!gotBootloader) {
                    currAttempt++
                    if (currAttempt > 10) {
                        throw new Error('Failed to enter bootloader mode in a reasonable time')
                    }
                    this.log(`[${currAttempt}] retry...`)

                    await this.transport.write(this.init_seq1)

                    const start = Date.now()
                    do {
                        const line = await this.transport.read_line(2000)
                        if (line === '') {
                            continue
                        }

                        if (line.indexOf('BL_TYPE') !== -1) {
                            const blType = line.substring(8).trim()
                            this.log(`Bootloader type found : '${blType}`)
                            delaySeq2 = 100
                            continue
                        }

                        const versionMatch = line.match(/=== (?<version>[vV].*) ===/)
                        if (versionMatch?.groups?.version) {
                            this.log(`Bootloader version found : '${versionMatch.groups.version}'`)
                        } else if (line.indexOf('hold down button') !== -1) {
                            await this._sleep(delaySeq2)
                            await this.transport.write_string('bbbbbb')
                            gotBootloader = true
                            break
                        } else if (line.indexOf('CCC') !== -1) {
                            gotBootloader = true
                            break
                        } else if (line.indexOf('_RX_') !== -1) {
                            const flashTarget = this.config.firmware.toUpperCase()
                            if (line.trim() !== flashTarget && !force) {
                                this.log(`Wrong target selected your RX is '${line.trim()}', trying to flash '${flashTarget}'`)
                                throw new MismatchError()
                            } else if (flashTarget !== '') {
                                this.log(`Verified RX target '${flashTarget}'`)
                            }
                        }
                    } while (Date.now() - start < 2000)
                }
                this.log(`Got into bootloader after: ${currAttempt} attempts`)
                this.log('Waiting for sync...')
                this.transport.set_delimiters(['CCC'])
                const data3 = await this.transport.read_line(15000)
                if (data3.indexOf('CCC') === -1) {
                    this.log('[FAILED] Unable to communicate with bootloader...')
                    throw new PassthroughError()
                }
                this.log('Sync OK')
            }
        }
    }

    flash = async (
        binary: FirmwareChunk[],
        force: boolean = false,
        progress?: ProgressCallback
    ): Promise<void> => {
        await this.startBootloader(true)
        this.log('Beginning flash...')
        const prog = progress ?? (() => {})
        return this.xmodem.send(binary[0].data, prog)
    }
}
