# elrs-firmware-config — API Documentation

Firmware management and configuration for ExpressLRS: build options from context, fetch and patch STM32/ESP binaries, and generate download filenames.

---

## Contents

- [Types](#types)
- [Functions](#functions)
- [Classes](#classes)
- [Errors](#errors)
- [Path schema](#path-schema)

---

## Types

### `FirmwareContext`

Context passed to `getSettings`, `generateFirmware`, `buildFirmwareUrl`, and `getDownloadFilename`.

| Property       | Type                              | Description                                      |
|----------------|-----------------------------------|--------------------------------------------------|
| `baseUrl`      | `string \| undefined`             | Base URL for assets (e.g. `./assets` or CDN).    |
| `version`      | `string`                          | Firmware version (e.g. git hash or tag).        |
| `versionLabel` | `string \| undefined`             | Display version (e.g. `"3.5.3"`).                 |
| `firmwareType` | `'firmware' \| 'backpack'`        | Whether building TX/RX firmware or backpack.     |
| `targetType`   | `'tx' \| 'rx' \| undefined`       | TX or RX for main firmware.                      |
| `radio`        | `string \| undefined`             | Radio identifier (e.g. `tx_2400`, `rx_900`).     |
| `target`       | `FirmwareTarget \| undefined`     | Selected target (vendor, radio, target, config).|
| `options`      | `FirmwareOptions \| undefined`    | User options (UID, region, TX/RX settings).     |

### `FirmwareTarget`

Selected target device.

| Property  | Type          | Description                          |
|-----------|---------------|--------------------------------------|
| `vendor`  | `string \| undefined` | Vendor name.                  |
| `radio`   | `string \| undefined`  | Radio type.                   |
| `target`  | `string \| undefined`  | Target name.                  |
| `config`  | `TargetConfig`        | Platform, firmware id, layout, etc. |

### `TargetConfig`

Target device configuration (platform, firmware id, features, layout).

| Property           | Type                    | Description                                      |
|--------------------|-------------------------|--------------------------------------------------|
| `platform`         | `string \| undefined`   | e.g. `stm32`, `esp32`, `esp8285`.                |
| `firmware`         | `string \| undefined`   | Firmware identifier.                             |
| `features`         | `string \| undefined`   | Feature flags (e.g. `buzzer`).                   |
| `product_name`     | `string \| undefined`   | Product name.                                    |
| `lua_name`         | `string \| undefined`   | Lua script name.                                 |
| `layout_file`      | `string \| undefined`   | Hardware layout JSON filename.                   |
| `overlay`          | `HardwareLayout \| undefined` | Overlay merged with layout.              |
| `custom_layout`    | `HardwareLayout \| undefined` | Custom layout (no file fetch).           |
| `logo_file`        | `string \| undefined`   | Logo filename for ESP.                           |
| `upload_methods`   | `string[] \| undefined` | App-only: e.g. `['zip']`.                        |
| `min_version`      | `string \| undefined`   | App-only: minimum firmware version.             |
| `stlink`           | `{ offset: string; cpus: string[] } \| undefined` | ST-Link offset and CPU list. |

### `HardwareLayout`

Hardware layout JSON (from `layout_file`); may contain `serial_tx`, `serial_rx`, and other keys.

| Property     | Type       | Description        |
|--------------|------------|--------------------|
| `serial_tx`  | `unknown`  | Optional.          |
| `serial_rx`  | `unknown`  | Optional.          |
| `[key: string]` | `unknown` | Other device keys. |

### `FirmwareOptions`

User-facing options for firmware (TX/RX/backpack).

| Property        | Type     | Description                    |
|-----------------|----------|--------------------------------|
| `uid`           | `number[] \| undefined` | Binding UID.           |
| `ssid`          | `string \| undefined`    | WiFi SSID.             |
| `password`      | `string \| undefined`   | WiFi password.         |
| `region`        | `string \| undefined`   | Regulatory region (e.g. FCC). |
| `wifiOnInternal`| `number \| undefined`   | WiFi on interval.      |
| `domain`        | `number \| undefined`   | Domain (900 MHz).      |
| `tx`            | `object \| undefined`   | TX options (see below).|
| `rx`            | `object \| undefined`   | RX options (see below).|

**`tx`** (when present): `telemetryInterval`, `fanMinRuntime`, `uartInverted`, `higherPower`, `melodyType`, `melodyTune`.

**`rx`** (when present): `rxAsTx`, `rxAsTxType`, `uartBaud`, `lockOnFirstConnect`.

### `ConfigureOptions`

Options object written into firmware (patch keys like `flash-discriminator`, `melody`, etc.). Used internally; keys include `flash-discriminator`, `uid`, `wifi-on-interval`, `wifi-ssid`, `wifi-password`, `product-name`, `rcvr-uart-baud`, `lock-on-first-connection`, `tlm-interval`, `tlm-report`, `fan-runtime`, `uart-inverted`, `unlock-higher-power`, `domain`, `beeptype`, `melody`, `rcvr-invert-tx`, `r9mm-mini-sbus`, and others.

### `GetSettingsResult`

Return type of `getSettings()`.

| Property      | Type              | Description                    |
|---------------|-------------------|--------------------------------|
| `config`      | `TargetConfig`    | Target config.                 |
| `firmwareUrl` | `string`          | Full URL to firmware.bin.      |
| `folder`      | `string`          | Base folder for assets.        |
| `options`     | `ConfigureOptions`| Options for `Configure.download`. |

### `FirmwareFile`

Single firmware file (binary + load address).

| Property  | Type        | Description           |
|-----------|-------------|-----------------------|
| `data`    | `Uint8Array`| Binary data.          |
| `address` | `number`    | Load address in flash.|

### `GenerateFirmwareMetadata`

Metadata returned with `generateFirmware()`.

| Property      | Type              | Description                    |
|---------------|-------------------|--------------------------------|
| `config`      | `TargetConfig`    | Target config.                 |
| `firmwareUrl` | `string`          | Firmware URL used.             |
| `options`     | `ConfigureOptions`| Options applied.              |
| `deviceType`  | `string`          | e.g. `TX`, `RX`.              |
| `radioType`   | `string \| null`  | e.g. `sx127x`, `sx128x`, `lr1121`. |
| `txType`      | `string \| undefined` | When RX-as-TX: `external` or `internal`. |

### `BuildFirmwareUrlResult`

Return type of `buildFirmwareUrl()`.

| Property      | Type     | Description            |
|---------------|----------|------------------------|
| `folder`      | `string` | Base folder path.      |
| `firmwareUrl` | `string` | Full firmware URL.     |

### `MelodyNote`

`[frequency: number, duration: number]` — frequency in Hz, duration in ms.

---

## Functions

### `getSettings(deviceType, context)`

Builds settings and options for the given device type and context (firmware URL, options for `Configure.download`).

- **Parameters**
  - `deviceType`: `string` — `'TX'`, `'RX'`, or backpack device type.
  - `context`: `FirmwareContext` — Base URL, version, target, options.
- **Returns**: `Promise<GetSettingsResult>` — `{ config, firmwareUrl, folder, options }`.

**Example**

```js
const { config, firmwareUrl, folder, options } = await getSettings('TX', context)
const files = await Configure.download(folder, context.version, 'TX', undefined, radioType, config, firmwareUrl, options)
```

---

### `generateFirmware(context)`

Generates firmware files and metadata for the given context. Fetches and patches binaries (STM32 or ESP) according to target and options.

- **Parameters**
  - `context`: `FirmwareContext` — Version, targetType, radio, target, options, firmwareType.
- **Returns**: `Promise<[FirmwareFile[], GenerateFirmwareMetadata]>` — Tuple of firmware files and metadata.

**Example**

```js
const [files, metadata] = await generateFirmware(context)
const filename = getDownloadFilename('.bin.gz', context)
```

---

### `buildFirmwareUrl(context)`

Builds folder and firmware URL from context.

- **Parameters**
  - `context`: `FirmwareContext` — baseUrl, version, firmwareType, target.config, options.region.
- **Returns**: `BuildFirmwareUrlResult` — `{ folder, firmwareUrl }`.

Path rules:
- **Firmware (TX/RX):** `{baseUrl}/firmware`, binary at `{baseUrl}/firmware/{version}/{region}/{config.firmware}/firmware.bin`
- **Backpack:** `{baseUrl}/backpack`, binary at `{baseUrl}/backpack/{version}/{config.firmware}/firmware.bin`

---

### `getDownloadFilename(ext?, context?)`

Builds a download filename from context (e.g. `ELRS-v3.5.3-vendor.radio.target-FCC-default.bin.gz`).

- **Parameters**
  - `ext`: `string` (default `'.bin.gz'`) — File extension, with leading dot if desired (e.g. `'.bin.gz'` or `'zip'`).
  - `context`: `FirmwareContext \| undefined` — versionLabel, target, options, firmwareType.
- **Returns**: `string` — Filename for the download. If `context` is omitted, returns a generic name.

---

### `compareSemanticVersions(a, b)`

Compares two semantic version strings (e.g. `"3.5.0"`, `"3.5.1-rc1"`).

- **Parameters**
  - `a`: `string` — First version.
  - `b`: `string` — Second version.
- **Returns**: `number` — `1` if a > b, `-1` if a < b, `0` if equal.

---

### `compareSemanticVersionsRC(a, b)`

Compares semantic versions, ignoring release-candidate suffix (e.g. `"3.5.0-rc1"` vs `"3.5.0"`).

- **Parameters**
  - `a`: `string \| undefined` — First version.
  - `b`: `string \| undefined` — Second version.
- **Returns**: `number` — `1` if a > b, `-1` if a < b, `0` if equal or either undefined.

---

## Classes

### `Configure`

Fetches and configures firmware binaries (STM32 or ESP) with options. Used internally by `generateFirmware`; can be used for low-level flows.

#### `Configure.download(folder, version, deviceType, rxAsTxType, radioType, config, firmwareUrl, options)`

Downloads and optionally patches firmware for the given device/config.

- **Parameters**
  - `folder`: `string` — Base folder (e.g. from `buildFirmwareUrl`).
  - `version`: `string` — Firmware version string.
  - `deviceType`: `string` — `'TX'`, `'RX'`, or backpack type.
  - `rxAsTxType`: `string \| undefined` — `'external'` or `'internal'` when RX is used as TX.
  - `radioType`: `string \| null` — `'sx127x'`, `'sx128x'`, `'lr1121'`, or null.
  - `config`: `TargetConfig` — Target config (platform, layout, etc.).
  - `firmwareUrl`: `string` — Full URL to firmware.bin.
  - `options`: `ConfigureOptions` — Patch options (flash-discriminator, melody, etc.).
- **Returns**: `Promise<FirmwareFile[]>` — Array of `{ data, address }` to flash.

---

### `MelodyParser`

Parses melody strings (custom format or RTTTL) into arrays of `[frequency, duration]` for firmware.

#### `MelodyParser.parseToArray(melodyOrRTTTL)`

Parses a melody string to an array of `[frequency (Hz), duration (ms)]` (max 32 notes).

- **Parameters**
  - `melodyOrRTTTL`: `string` — Custom format `"notes|bpm|transpose"` (e.g. `"A4 20 B4 20|60|0"`) or RTTTL string.
- **Returns**: `MelodyNote[]` — Array of `[frequency, duration]`.

---

## Errors

### `ConfigureError`

Thrown when firmware configuration or fetch fails.

- **Extends**: `Error`
- **Properties**
  - `code`: `ConfigureErrorCode` — Failure reason.
  - `message`: `string` — Error message.

### `ConfigureErrorCode`

Constants for configure failure reasons:

| Value                 | Description                                                |
|-----------------------|------------------------------------------------------------|
| `MAGIC_NOT_FOUND`     | Configuration magic bytes not found (not a 3.x firmware).  |
| `HTTP_ERROR`          | HTTP request failed (fetch !ok).                           |
| `INVALID_FIRMWARE_MAGIC` | Binary does not have expected firmware magic.           |

**Usage**

```js
import { ConfigureError, ConfigureErrorCode } from 'elrs-firmware-config'
try {
  await generateFirmware(context)
} catch (e) {
  if (e instanceof ConfigureError && e.code === ConfigureErrorCode.HTTP_ERROR) {
    // handle fetch failure
  }
}
```

---

## Path schema

All URLs are built from `context.baseUrl`:

- **Firmware (TX/RX):**
  - Folder: `{baseUrl}/firmware`
  - Binary: `{baseUrl}/firmware/{version}/{region}/{config.firmware}/firmware.bin`
- **Backpack:**
  - Folder: `{baseUrl}/backpack`
  - Binary: `{baseUrl}/backpack/{version}/{config.firmware}/firmware.bin`
- **Layout (ESP):** `{folder}/hardware/{deviceType}/{config.layout_file}`
- **Logo (ESP):** `{folder}/hardware/logo/{config.logo_file}` or `{folder}/{version}/hardware/logo/{config.logo_file}`
