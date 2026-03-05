/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 */

import Rtttl from 'bluejay-rtttl-parse'

/** Melody note: [frequency in Hz, duration in ms]. */
export type MelodyNote = [number, number]

/**
 * Parses melody strings (custom format or RTTTL) into arrays of [frequency, duration] for firmware.
 */
export class MelodyParser {
    static readonly #NOTES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']

    static #getFrequency(note: string, transposeBy: number = 0, A4: number = 440): number {
        const octave = note.length === 3 ? Number(note[2]) : Number(note[1])
        let keyNumber = this.#NOTES.indexOf(note.slice(0, -1))
        if (keyNumber < 3) {
            keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1
        } else {
            keyNumber = keyNumber + ((octave - 1) * 12) + 1
        }
        keyNumber += transposeBy
        return Math.floor(A4 * 2 ** ((keyNumber - 49) / 12.0))
    }

    static #getDurationInMs(bpm: number, duration: number): number {
        return Math.floor((1000 * (60 * 4 / bpm)) / duration)
    }

    static #parseMelody(melodyString: string, bpm: number = 120, transposeBySemitones: number = 0): MelodyNote[] {
        const tokenizedNotes = melodyString.split(' ')
        const operations: MelodyNote[] = []
        for (let i = 0; i < tokenizedNotes.length; i++) {
            const token = tokenizedNotes[i]
            const nextToken = tokenizedNotes[i + 1]
            if (token[0] === 'P') {
                operations.push([0, this.#getDurationInMs(bpm, parseInt(token.substring(1), 10))])
            } else if ('ABCDEFG'.indexOf(token[0]) !== -1 && nextToken !== undefined) {
                const frequency = this.#getFrequency(token, transposeBySemitones)
                const duration = this.#getDurationInMs(bpm, parseInt(nextToken, 10))
                operations.push([frequency, duration])
            }
        }
        return operations
    }

    /**
     * Parse a melody string (custom "A4 20 B4 20|60|0" format or RTTTL) to array of [frequency, duration].
     *
     * @param melodyOrRTTTL - Custom format "notes|bpm|transpose" or RTTTL string
     * @returns Array of [frequency (Hz), duration (ms)], max 32 notes
     */
    static parseToArray(melodyOrRTTTL: string): MelodyNote[] {
        if (melodyOrRTTTL.indexOf('|') !== -1) {
            const defineValue = melodyOrRTTTL.split('|')
            const transposeBySemitones = defineValue.length > 2 ? Number(defineValue[2]) : 0
            return this.#parseMelody(defineValue[0].trim(), Number(defineValue[1]), transposeBySemitones)
        } else {
            const melody = Rtttl.parse(melodyOrRTTTL).melody.map(
                (v) => [Math.floor(v.frequency), Math.floor(v.duration)] as MelodyNote
            )
            if (melody.length > 32) melody.length = 32
            return melody
        }
    }
}
