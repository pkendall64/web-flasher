# elrs-flasher — API Documentation

Device flashing library for ExpressLRS firmware. Provides ST-Link (WebUSB), ESP (Web Serial), and Xmodem serial flashers for browser-based flashing.

**Environment:** Browser only. Requires WebUSB (ST-Link) and/or Web Serial (ESP, Xmodem).

---

## Contents

- [Types](#types)
- [Unified flash API](#unified-flash-api)
- [Flashers](#flashers)
- [Passthrough & bootloader](#passthrough--bootloader)
- [Transport](#transport)
- [Errors](#errors)

---

## Types

### `Terminal`

Logger interface used by STLink, ESPFlasher, XmodemFlasher, and Passthrough.

| Method     | Signature           | Description              |
|------------|---------------------|--------------------------|
| `writeln`  | `(str: string) => void` | Write a line (required). |
| `write`    | `(str: string) => void` | Write without newline (optional). |

### `ProgressCallback`

`(fileNumber: number, percent: number, total: number, message?: string) => void` — Progress callback for flash operations.

### `STLinkConfig`

Config slice for ST-Link connect/flash. Must include `stlink.offset` and `stlink.cpus`.

| Property     | Type     | Description                                           |
|--------------|----------|-------------------------------------------------------|
| `stlink.offset` | `string` | Flash offset in hex (e.g. `"0x0"`).               |
| `stlink.cpus`   | `string[]` | Expected CPU type names for device detection.     |

### `FirmwareChunk`

Single firmware chunk for flashing.

| Property  | Type         | Description    |
|-----------|--------------|----------------|
| `data`    | `Uint8Array` | Binary data.   |
| `address` | `number`     | Load address.  |

### `FlasherOptions`

Options object passed through to flashers (from `generateFirmware`). Typed as `Record<string, unknown>` to avoid coupling to elrs-firmware-config.

### `ESPFlasherConfig`

Config slice for ESP flasher.

| Property   | Type     | Description                |
|------------|----------|----------------------------|
| `platform` | `string` | e.g. `esp32`, `esp8285`.   |
| `firmware` | `string \| undefined` | Firmware id.   |
| `baud`     | `number \| undefined` | Baud rate.     |

### `XmodemFlasherConfig`

Config slice for Xmodem flasher.

| Property   | Type     | Description        |
|------------|----------|--------------------|
| `firmware` | `string` | Firmware name.     |

### `SerialFlasherParams`

Params for `createSerialFlasher()`. Used when platform (ESP vs STM32) is determined at runtime.

| Property       | Type     | Description                                      |
|----------------|----------|--------------------------------------------------|
| `deviceType`   | `string` | e.g. `'TX'`, `'RX'`.                             |
| `method`       | `string` | `'uart'`, `'betaflight'`, `'etx'`, or `'passthru'`. |
| `config`       | `{ platform?: string; firmware?: string; baud?: number }` | Platform selects ESP vs Xmodem; firmware/baud for flasher config. |
| `options`      | `FlasherOptions` | From firmware config.                        |
| `firmwareUrl`  | `string` | Firmware URL (for reference).                    |

### `FlasherMethod`

`'uart' | 'betaflight' | 'etx' | 'passthru'` — ESP connection method.

### `FlasherDeviceType`

`'TX' | 'RX' | string` — Device type for ESP flasher.

### `FlashMethod`

`'stlink' | 'uart' | 'betaflight' | 'etx' | 'passthru'` — Connection method; `stlink` uses WebUSB, others use Web Serial.

### `FlashTransport`

Discriminated union for the transport argument of `flashFirmware`:

- `{ type: 'usb', device: USBDevice }` — For ST-Link (obtain via `navigator.usb.requestDevice({ filters: await getSTLinkUsbFilters() })`).
- `{ type: 'serial', port: SerialPort }` — For ESP/Xmodem (obtain via `navigator.serial.requestPort()` then open the port).

### `FlashFirmwareParams`

Options for `flashFirmware()`.

| Property      | Type | Description |
|---------------|------|-------------|
| `transport`   | `FlashTransport` | Pre-obtained USB device or Serial port. |
| `firmware`   | `[FirmwareFile[], GenerateFirmwareMetadata]` | Return value of `generateFirmware(context)` from elrs-firmware-config. |
| `method`     | `FlashMethod` | How to connect (`stlink`, `uart`, etc.). |
| `term`       | `Terminal` | Logger. |
| `progress`   | `ProgressCallback` (optional) | Progress callback. |
| `erase`      | `boolean` (optional) | For serial: erase before write. Default `false`. Ignored for ST-Link. |

---

## Unified flash API

Single entry point for flashing firmware produced by elrs-firmware-config. Use this when you have already called `generateFirmware(context)` and obtained a USB or Serial transport.

### `getTransportKind(metadata, method)` → `'usb' | 'serial'`

Tells you which transport to request from the user. Use the result to call either `navigator.usb.requestDevice(...)` or `navigator.serial.requestPort()`.

- **Parameters:** `metadata` — the second element of the tuple returned by `generateFirmware`. `method` — the chosen flash method.
- **Returns:** `'usb'` for ST-Link, `'serial'` for UART/Betaflight/EdgeTX/passthru.

### `getSTLinkUsbFilters()` → `Promise<USBDeviceFilter[]>`

Returns the WebUSB filters for ST-Link devices. Use when `getTransportKind` returned `'usb'`:

```js
const filters = await getSTLinkUsbFilters()
const device = await navigator.usb.requestDevice({ filters })
```

### `flashFirmware(params)` → `Promise<void>`

Connects to the device, flashes the firmware, and closes the connection. Handles ST-Link, ESP, and Xmodem internally based on `transport` and `method`.

**Example (serial):**

```js
import { flashFirmware, getTransportKind } from 'elrs-flasher'
import { config } from 'elrs-firmware-config'

const [files, metadata] = await config.generateFirmware(context)
const kind = getTransportKind(metadata, 'uart')
// kind === 'serial' → show "Select serial port"
const port = await navigator.serial.requestPort()
await port.open({ baudRate: 460800 })
const term = { writeln: (s) => console.log(s) }
await flashFirmware({
  transport: { type: 'serial', port },
  firmware: [files, metadata],
  method: 'uart',
  term,
  progress: (file, percent, total) => { ... },
  erase: false,
})
```

**Example (ST-Link):**

```js
const [files, metadata] = await config.generateFirmware(context)
const kind = getTransportKind(metadata, 'stlink')
// kind === 'usb' → show "Select ST-Link"
const filters = await getSTLinkUsbFilters()
const device = await navigator.usb.requestDevice({ filters })
await flashFirmware({
  transport: { type: 'usb', device },
  firmware: [files, metadata],
  method: 'stlink',
  term,
  progress: (file, percent, total) => { ... },
})
```

Errors (e.g. `MismatchError`, `WrongMCU`) are thrown as-is; use `normalizeError` and `isFlasherError` for handling.

---

## Flashers

### `createSerialFlasher(device, params, term)` (factory)

Creates the appropriate serial flasher (ESPFlasher or XmodemFlasher) based on `params.config.platform`. Use this instead of constructing ESPFlasher or XmodemFlasher directly when the target platform is known only at runtime.

- **Parameters**
  - `device`: `SerialPort` — Web Serial port (e.g. from `navigator.serial.requestPort()`).
  - `params`: `SerialFlasherParams` — deviceType, method, config (platform, firmware, baud), options, firmwareUrl.
  - `term`: `Terminal` — Logger for connect/flash output.
- **Returns**: `ESPFlasher | XmodemFlasher` — ESP flasher when `config.platform` is not `'stm32'`, Xmodem flasher when `config.platform === 'stm32'`.

Both returned flashers expose `connect()`, `flash(...)`, and (for ESP) `close()`. Use the same error handling (`MismatchError`, `WrongMCU`, `normalizeError`) as when constructing the classes directly.

**Example**

```js
import { createSerialFlasher, MismatchError, WrongMCU, normalizeError } from 'elrs-flasher'

const device = await navigator.serial.requestPort()
const flasher = createSerialFlasher(device, {
  deviceType: 'RX',
  method: 'uart',
  config: { platform: 'stm32', firmware: 'GHOST_ATTO_2400_RX_v1' },
  options: {},
  firmwareUrl: '...',
}, term)
await flasher.connect()
await flasher.flash(files, false, (f, p, t) => {})
if ('close' in flasher && typeof flasher.close === 'function') await flasher.close()
```

---

### `STLink`

ST-Link debugger front-end for flashing STM32 targets (e.g. ExpressLRS RX) via WebUSB.

#### Constructor

- **`new STLink(term: Terminal)`**
  - `term`: Terminal instance for logging.

#### Instance properties

| Property  | Type                    | Description                    |
|-----------|-------------------------|--------------------------------|
| `term`    | `Terminal`              | Logger.                        |
| `stlink`  | `WebStlinkInstance \| null` | ST-Link instance when connected. |
| `device`  | `USBDevice \| null`     | WebUSB device when connected.  |
| `config`  | `STLinkConfig`          | Set by `connect()`.            |
| `target`  | `StlinkTarget`          | Detected target after connect. |

#### Methods

- **`connect(config, handler)`** → `Promise<void>`
  - Requests WebUSB device, attaches ST-Link, detects CPU.
  - **Parameters**
    - `config`: `STLinkConfig` — Must include `stlink.offset` and `stlink.cpus`.
    - `handler`: `() => void` — Called when device is disconnected (e.g. to update UI).
  - **Throws**: Re-throws device/attach errors after logging.

- **`flash(binary, bootloader?, progressCallback)`** → `Promise<void>`
  - Flashes firmware (and optional bootloader) to the connected target.
  - **Parameters**
    - `binary`: `FirmwareChunk[]` — Firmware chunks (typically from `generateFirmware`).
    - `bootloader`: `Uint8Array | undefined` — Optional bootloader to flash first.
    - `progressCallback`: `ProgressCallback` — Progress callback.

- **`close()`** → `Promise<void>`
  - Detaches ST-Link and clears internal state.

**Example**

```js
const stlink = new STLink(term)
await stlink.connect(config, () => { /* on disconnect */ })
await stlink.flash(firmwareChunks, undefined, (file, percent, total) => { /* progress */ })
await stlink.close()
```

---

### `ESPFlasher`

ESP (ESP8266/ESP32) flasher using esptool-js, with passthrough support (Betaflight, EdgeTX, UART).

#### Constructor

- **`new ESPFlasher(device, type, method, config, options, firmwareUrl, term)`**
  - `device`: `SerialPort` — Web Serial port.
  - `type`: `FlasherDeviceType` — `'TX'`, `'RX'`, or backpack type.
  - `method`: `FlasherMethod` — `'uart'`, `'betaflight'`, `'etx'`, or `'passthru'`.
  - `config`: `ESPFlasherConfig` — platform, firmware, baud.
  - `options`: `FlasherOptions` — From firmware config.
  - `firmwareUrl`: `string` — Firmware URL (for reference).
  - `term`: `Terminal` — Logger.

#### Methods

- **`connect()`** → `Promise<string>`
  - Connects to the device (UART or passthrough), detects chip. Validates platform vs detected MCU.
  - **Returns**: Chip name (e.g. `ESP32`, `ESP8266`).
  - **Throws**: `WrongMCU` if platform doesn’t match; may throw `MismatchError` from passthrough.

- **`flash(files, erase, progress)`** → `Promise<void>`
  - **Parameters**
    - `files`: `FirmwareChunk[]` — From `generateFirmware`.
    - `erase`: `boolean` — Whether to erase flash before write.
    - `progress`: `(fileNumber, percent, total) => void` — Progress callback.

- **`close()`** → `Promise<void>`
  - Disconnects transport.

**Example**

```js
const port = await navigator.serial.requestPort()
await port.open({ baudRate: 460800 })
const flasher = new ESPFlasher(port, 'TX', 'uart', config, options, firmwareUrl, term)
const chip = await flasher.connect()
await flasher.flash(files, false, (f, p, t) => {})
await flasher.close()
```

---

### `XmodemFlasher`

Xmodem-based flasher for CRSF/GHST bootloader (e.g. STM32 RX over serial).

#### Constructor

- **`new XmodemFlasher(device, deviceType, method, config, options, firmwareUrl, terminal)`**
  - `device`: Object with `readable` and `writable` (e.g. `SerialPort`).
  - `deviceType`: `string` — Device type (e.g. `'RX'`).
  - `method`: `string` — Connection method.
  - `config`: `XmodemFlasherConfig` — Must include `firmware`.
  - `options`: `FlasherOptions`.
  - `firmwareUrl`: `string`.
  - `terminal`: `Terminal`.

#### Methods

- **`connect()`** → `Promise<string>`
  - Connects transport, starts bootloader (CRSF or GHST). Returns `'XModem Flasher'`.
  - **Throws**: `BootloaderTimeoutError`, `PassthroughError`, `MismatchError` on failure.

- **`flash(binary, force?, progress?)`** → `Promise<void>`
  - **Parameters**
    - `binary`: `FirmwareChunk[]` — Typically `binary[0].data` is sent via Xmodem.
    - `force`: `boolean` (default `false`) — Force flash even if target name doesn’t match.
    - `progress`: `ProgressCallback` (optional) — Progress callback.
  - **Throws**: `CancelledError` if stream is cancelled.

- **`startBootloader(force?)`** → `Promise<void>`
  - Ensures device is in bootloader mode (used internally by `flash`).

---

## Passthrough & bootloader

### `Passthrough`

Helper for Betaflight / EdgeTX serial passthrough and bootloader init.

#### Constructor

- **`new Passthrough(transport, terminal, flashTarget, baudrate, halfDuplex?, uploadforce?)`**
  - `transport`: `TransportEx`.
  - `terminal`: `Terminal`.
  - `flashTarget`: `string` — Expected firmware/target name.
  - `baudrate`: `number`.
  - `halfDuplex`: `boolean` (default `false`).
  - `uploadforce`: `boolean` (default `false`).

#### Methods

- **`betaflight()`** → `Promise<void>` — Initialize Betaflight FC passthrough. Throws `PassthroughError` on invalid serial RX config.
- **`edgeTX()`** → `Promise<void>` — Initialize EdgeTX passthrough (main firmware).
- **`edgeTXBP()`** → `Promise<void>` — Initialize EdgeTX backpack passthrough.
- **`reset_to_bootloader()`** → `Promise<void>` — Reset device into bootloader. Throws `MismatchError` if detected target doesn’t match (unless `uploadforce`).

### `Bootloader`

Static helpers for CRSF/GHST bootloader sequences.

- **`Bootloader.get_init_seq(module, key?)`** → `Uint8Array` — Init sequence for `'CRSF'` or `'GHST'`; optional `key` for telemetry.
- **`Bootloader.get_bind_seq(module, key?)`** → `Uint8Array` — Bind sequence.
- **`Bootloader.calc_crc8(payload, poly?)`** → `number` — CRC-8 (default poly `0xD5`).
- **`Bootloader.ord(s)`** → `number` — Character code of first character.

---

## Transport

### `TransportEx`

Extends esptool-js `Transport` with delimiter-based read_line and string/array write helpers. Used by ESPFlasher, XmodemFlasher, and Passthrough.

#### Constructor

- **`new TransportEx(device: SerialPort, tracing?: boolean)`**
  - `tracing`: default `false` — Log bytes to console.

#### Methods

- **`set_delimiters(delimiters)`** — Set line delimiters (e.g. `['\n', 'CCC']`).
- **`read_line(timeout?)`** → `Promise<string>` — Read until a delimiter or timeout (ms). Returns `''` on timeout/disconnect.
- **`write_string(data)`** → `Promise<void>` — Write string as bytes.
- **`write_array(data)`** → `Promise<void>` — Write `Uint8Array`.
- **`ui8ToBstr(u8Array)`** → `string` — Uint8Array to binary string.
- **`bstrToUi8(bStr)`** → `Uint8Array` — Binary string to Uint8Array.

Inherits from esptool-js `Transport`: `connect(baudrate)`, `disconnect()`, `sleep(ms)`, `setDTR()`, `setRTS()`, etc.

---

## Errors

All flasher errors extend `Error`. Use `isFlasherError(error)` or `instanceof` for handling.

### `FlasherError`

Union type: `AlertError | MismatchError | PassthroughError | WrongMCU | CancelledError | BootloaderTimeoutError`.

### `isFlasherError(error)` → `boolean`

Type guard: returns true if `error` is one of the known flasher error classes.

### `normalizeError(error)` → `Error`

Converts unknown (e.g. from `catch`) to `Error`. Keeps existing `Error` instances; wraps strings or other values in a new `Error`.

### Error classes

| Class                  | When thrown |
|------------------------|-------------|
| **`AlertError`**       | User-facing alert; optional `title`, `type` (`'error'` \| `'warning'`). |
| **`MismatchError`**    | Connected RX (or target) does not match selected firmware target. |
| **`PassthroughError`** | Passthrough init failed (e.g. invalid serial RX config). |
| **`WrongMCU`**         | Connected MCU doesn’t match selected platform (e.g. ESP32 vs ESP8266). |
| **`CancelledError`**   | User or stream cancelled (e.g. Xmodem flash). |
| **`BootloaderTimeoutError`** | Device did not enter bootloader within expected time. |

**Usage**

```js
import {
  STLink,
  MismatchError,
  WrongMCU,
  PassthroughError,
  isFlasherError,
  normalizeError,
} from 'elrs-flasher'

try {
  await stlink.connect(config, onDisconnect)
  await stlink.flash(chunks, undefined, progress)
} catch (e) {
  const err = normalizeError(e)
  if (e instanceof MismatchError) {
    // show "wrong target" message
  } else if (isFlasherError(e)) {
    // show generic flasher error
  }
  throw err
}
```

### `AlertError` constructor

- **`new AlertError(title?, message?, type?)`**
  - `title`: `string \| undefined`
  - `message`: `string \| undefined`
  - `type`: `string` (default `'error'`) — e.g. `'error'`, `'warning'`.

---

## Config summary for consumers

Flashers expect **config** from firmware/target configuration:

- **ST-Link:** `config.stlink.cpus`, `config.stlink.offset`
- **ESP / Xmodem:** `config.platform`, `config.baud`, `config.firmware`

Pass a **term** (Terminal) with `writeln(data)` and optionally `write(data)` for logging.
