/*
 * ExpressLRS Web Flasher
 * Copyright (C) 2025 ExpressLRS LLC and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const STORAGE_KEY = 'elrs-web-flasher_settings'

/**
 * Get all settings from localStorage
 * @returns {Object|null}
 */
export function getSettings() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    } catch (e) {
        console.error('Error loading settings:', e)
        return null
    }
}

/**
 * Save all settings to localStorage
 * @param {Object} settings - Settings object with shared properties and tx/rx sub-objects
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
        console.error('Error saving settings:', e)
    }
}

/**
 * Clear all stored settings
 */
export function clearSettings() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
        console.error('Error clearing settings:', e)
    }
}
