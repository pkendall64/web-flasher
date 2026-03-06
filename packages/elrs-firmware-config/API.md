# elrs-firmware-config — API Documentation

Firmware management and configuration for ExpressLRS: build options from context, fetch and patch STM32/ESP binaries, and generate download filenames.

---

## Contents

- [Types](#types)
- [FirmwareConfig class](#firmwareconfig-class)
- [Other classes](#other-classes)
- [Standalone functions](#standalone-functions)
- [Errors](#errors)
- [Path schema](#path-schema)

---

## Types

### `FirmwareContext`

Full context (includes `baseUrl` and `firmwareType`). Used internally; for public API use `FirmwareContextPartial` with `FirmwareConfig` instance methods.

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

### `FirmwareContextPartial`

Context for `FirmwareConfig` instance methods; omits `baseUrl` and `firmwareType` (supplied by the instance). Same shape as `FirmwareContext` without those two properties.

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

### `FirmwareIndex`

Firmware index (index.json): branches and tags for version selection.

| Property   | Type                       | Description        |
|------------|----------------------------|--------------------|
| `branches` | `Record<string, string> \| undefined` | Branch name → version id. |
| `tags`     | `Record<string, string> \| undefined` | Tag name → version id.    |

### `SelectOption<T>`

Option item for dropdowns: `{ title: string; value: T }`. Default `T` is `string`.

### `TargetSelectOption`

Option item for target list: `{ title: string; value: FirmwareTarget }`.

### `GetVersionOptionsParams`

Options for `getVersionOptions()`.

| Property           | Type      | Description                          |
|--------------------|-----------|--------------------------------------|
| `includeBranches`   | `boolean \| undefined` | If true, include branches and RC tags. |

### `GetTargetsOptions`

Options for target listing (includes `baseUrl` and `firmwareType`). For `FirmwareConfig#getTargets()` use `GetTargetsOptionsInstance` instead.

| Property                | Type     | Description                                      |
|-------------------------|----------|--------------------------------------------------|
| `baseUrl`               | `string` | Base URL for assets (e.g. `./assets`).          |
| `firmwareType`          | `'firmware' \| 'backpack'` | Firmware or backpack.                    |
| `targetType`            | `string` | e.g. `tx`, `rx`, `txbp`, `vrx`, `aat`, `timer`. |
| `vendor`                | `string \| null \| undefined` | Filter by vendor id.                  |
| `radio`                 | `string \| null \| undefined` | Filter by radio id (firmware only).     |
| `version`               | `string \| null \| undefined` | Version id (for caching).               |
| `versionLabel`          | `string \| null \| undefined` | Display version for min_version filter.  |
| `includeBranchVersions` | `boolean \| undefined` | If true, skip min_version filtering.   |

### `GetTargetsOptionsInstance`

Options for `FirmwareConfig#getTargets()`; omits `baseUrl` and `firmwareType` (supplied by the instance). Same properties as `GetTargetsOptions` without those two.

---

## FirmwareConfig class

The primary API. Encapsulates `baseUrl` and `firmwareType`; use one instance per asset root and firmware type (e.g. `new FirmwareConfig('./assets', 'firmware')`). Index and targets are cached in memory by `(baseUrl, firmwareType)`.

**Asset paths (library-owned):**

- Index: `{baseUrl}/{firmwareType}/index.json`
- Targets: `{baseUrl}/{firmwareType}/hardware/targets.json`

### Constructor

- `new FirmwareConfig(baseUrl: string, firmwareType: 'firmware' | 'backpack')`

### Instance methods — index and targets

| Method | Returns | Description |
|--------|---------|-------------|
| `getFirmwareIndex()` | `Promise<FirmwareIndex>` | Fetches index.json (cached). |
| `getVersionOptions(params?)` | `Promise<SelectOption[]>` | Version dropdown options; `params.includeBranches` for branches/RC. |
| `getVendors(targetType)` | `Promise<{ id; name }[]>` | Vendors for the given target type. |
| `getRadios(vendorId, targetType)` | `Promise<{ id; label }[]>` | Radios for a vendor (firmware only; empty for backpack). |
| `getTargets(options)` | `Promise<TargetSelectOption[]>` | Targets filtered by vendor, radio, version; `options`: `GetTargetsOptionsInstance`. |
| `getLuaScriptUrl(version, versionLabel?)` | `string` | URL for Lua script (elrs.lua or elrsV3.lua when &lt; 4.0.0). |

### Instance methods — context-based

These take `FirmwareContextPartial` (version, targetType, radio, target, options); the instance supplies `baseUrl` and `firmwareType`.

| Method | Returns | Description |
|--------|---------|-------------|
| `getSettings(deviceType, context)` | `Promise<GetSettingsResult>` | Config, folder, firmwareUrl, options for `Configure.download`. |
| `generateFirmware(context)` | `Promise<[FirmwareFile[], GenerateFirmwareMetadata]>` | Fetches and patches firmware; returns files and metadata. |
| `buildFirmwareUrl(context)` | `BuildFirmwareUrlResult` | `{ folder, firmwareUrl }` from context. |
| `getDownloadFilename(ext?, context?)` | `string` | Filename for download (e.g. `ELRS-v3.5.3-...-FCC-default.bin.gz`). |

**Example**

```js
import { FirmwareConfig } from 'elrs-firmware-config'

const config = new FirmwareConfig('./assets', 'firmware')
const versions = await config.getVersionOptions({ includeBranches: false })
const [files, metadata] = await config.generateFirmware({ version: 'abc', targetType: 'tx', target: {...}, options: {...} })
const filename = config.getDownloadFilename('.bin.gz', contextPartial)
```

### `RADIO_LABELS`

Exported constant (not on the class): `Record<string, string>` mapping radio id to label (e.g. `tx_2400` → `"2.4GHz Transmitter"`). Use for firmware radio dropdowns.

---

## Standalone functions

### `compareSemanticVersions(a, b)`

Compares two semantic version strings (e.g. `"3.5.0"`, `"3.5.1-rc1"`). Returns `1` if a > b, `-1` if a < b, `0` if equal.

### `compareSemanticVersionsRC(a, b)`

Compares semantic versions, ignoring release-candidate suffix. Returns `1` if a > b, `-1` if a < b, `0` if equal or either undefined.

---

## Other classes

### `Configure`

Fetches and configures firmware binaries (STM32 or ESP) with options. Used internally by `FirmwareConfig#generateFirmware`; can be used for low-level flows.

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
import { ConfigureError, ConfigureErrorCode, FirmwareConfig } from 'elrs-firmware-config'
const config = new FirmwareConfig('./assets', 'firmware')
try {
  await config.generateFirmware(contextPartial)
} catch (e) {
  if (e instanceof ConfigureError && e.code === ConfigureErrorCode.HTTP_ERROR) {
    // handle fetch failure
  }
}
```

---

## Path schema

All URLs are built from `context.baseUrl` (or the `baseUrl` passed to asset APIs):

- **Index and targets (asset APIs):**
  - Index: `{baseUrl}/{firmwareType}/index.json`
  - Targets: `{baseUrl}/{firmwareType}/hardware/targets.json`
- **Firmware (TX/RX):**
  - Folder: `{baseUrl}/firmware`
  - Binary: `{baseUrl}/firmware/{version}/{region}/{config.firmware}/firmware.bin`
- **Backpack:**
  - Folder: `{baseUrl}/backpack`
  - Binary: `{baseUrl}/backpack/{version}/{config.firmware}/firmware.bin`
- **Layout (ESP):** `{folder}/hardware/{deviceType}/{config.layout_file}`
- **Logo (ESP):** `{folder}/hardware/logo/{config.logo_file}` or `{folder}/{version}/hardware/logo/{config.logo_file}`
- **Lua script:** `{baseUrl}/{firmwareType}/{version}/lua/elrs.lua` or `elrsV3.lua` (when version &lt; 4.0.0)
