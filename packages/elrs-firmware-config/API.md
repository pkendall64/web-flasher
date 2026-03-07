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

### `FirmwareFlavor` (enum)

Device/flavor type for firmware selection. The library maps these to asset paths internally: **Tx** and **Rx** use the `firmware` index/targets; **TxBP**, **Vrx**, **Aat**, **Timer** use the `backpack` index/targets.


| Value   | String    | Asset path |
| ------- | --------- | ---------- |
| `Tx`    | `'tx'`    | firmware   |
| `Rx`    | `'rx'`    | firmware   |
| `TxBP`  | `'txbp'`  | backpack   |
| `Vrx`   | `'vrx'`   | backpack   |
| `Aat`   | `'aat'`   | backpack   |
| `Timer` | `'timer'` | backpack   |


Use with the constructor: `new FirmwareConfig(baseUrl, FirmwareFlavor.Tx)`. Store the enum in app state (e.g. `store.flavor = FirmwareFlavor.Tx`). For the single place you have a string (e.g. URL param), use `**FirmwareFlavor.fromString(type)`** to get `FirmwareFlavor | null`.

### `FirmwareFlavor.fromString(s)` → `FirmwareFlavor | null`

Parses a string (`'tx'`, `'rx'`, `'txbp'`, etc.) into `FirmwareFlavor`, or `null` if invalid or empty. Use only at boundaries (e.g. URL or storage).

### `FirmwareFlavor.firmwareType(flavor)` → `'firmware' | 'backpack'`

Returns the asset path type for the given flavor.

### `BuildContext`

Minimal context for `generateFirmware`, `getDownloadFilename`, `buildFirmwareUrl`, and `getSettings`. Callers only supply version info, target key (from `getTargets`), and options; the library supplies `baseUrl`, `firmwareType`, `targetType` from the instance and **resolves `targetKey` to the full target internally**.


| Property       | Type             | Description                                                                 |
| -------------- | ---------------- | --------------------------------------------------------------------------- |
| `version`      | `string \| undefined` | Firmware version (e.g. git hash or tag).                               |
| `versionLabel` | `string \| undefined` | Display version (e.g. `"3.5.3"`).                                       |
| `targetKey`    | `TargetKey`      | Path into targets.json (from `getTargets()` option `value`).                 |
| `options`      | `FirmwareOptions \| undefined` | User options (region, uid, wifi, etc.).                          |

### `TargetKey`

String path into targets.json: `"vendor.radio.target"` for main firmware (Tx/Rx) or `"vendor.target"` for backpack. Returned as `value` from `getTargets()`; pass as `targetKey` in `BuildContext`.

### `FirmwareContext` (internal, not exported)

Full context (includes `baseUrl`, `firmwareType`, `targetType`, resolved `target`). Used internally by the library after resolving `targetKey`; callers use `BuildContext` only.

### `TargetSelectOption`

Option returned from `getTargets()`: product name for the dropdown, key for the library, and config for app UI.


| Property  | Type           | Description                                                                 |
| --------- | -------------- | --------------------------------------------------------------------------- |
| `title`   | `string`       | Product name for the dropdown.                                              |
| `value`   | `TargetKey`    | Target key (path in targets.json); pass as `targetKey` in `BuildContext`.   |
| `config`  | `TargetConfig` | Config for app display (platform, upload_methods, etc.); not needed by lib. |
| `vendor`  | `string \| undefined` | Vendor id (for syncing vendor dropdown).                            |
| `radio`   | `string \| undefined` | Radio id, firmware only (for syncing radio dropdown).                  |

### `FirmwareTarget`

Resolved target device (vendor, radio, target ids + config). Used **internally** after resolving a `TargetKey`; callers use `targetKey` and the library resolves.


| Property | Type           | Description                         |
| -------- | -------------- | ----------------------------------- |
| `vendor` | `string`       | Vendor id.                           |
| `radio`  | `string \| undefined` | Radio id (firmware only).     |
| `target` | `string`       | Target id.                           |
| `config` | `TargetConfig` | Platform, firmware id, layout, etc.  |

### `TargetConfig`

Target device configuration (platform, firmware id, features, layout).


| Property         | Type                                | Description |
| ---------------- | ----------------------------------- | ----------- |
| `platform`       | `string                             | undefined`  |
| `firmware`       | `string                             | undefined`  |
| `features`       | `string                             | undefined`  |
| `product_name`   | `string                             | undefined`  |
| `lua_name`       | `string                             | undefined`  |
| `layout_file`    | `string                             | undefined`  |
| `overlay`        | `HardwareLayout                     | undefined`  |
| `custom_layout`  | `HardwareLayout                     | undefined`  |
| `logo_file`      | `string                             | undefined`  |
| `upload_methods` | `string[]                           | undefined`  |
| `min_version`    | `string                             | undefined`  |
| `stlink`         | `{ offset: string; cpus: string[] } | undefined`  |


### `HardwareLayout`

Hardware layout JSON (from `layout_file`); may contain `serial_tx`, `serial_rx`, and other keys.


| Property        | Type      | Description        |
| --------------- | --------- | ------------------ |
| `serial_tx`     | `unknown` | Optional.          |
| `serial_rx`     | `unknown` | Optional.          |
| `[key: string]` | `unknown` | Other device keys. |


### `FirmwareOptions`

User-facing options for firmware (TX/RX/backpack).


| Property         | Type      | Description |
| ---------------- | --------- | ----------- |
| `uid`            | `number[] | undefined`  |
| `ssid`           | `string   | undefined`  |
| `password`       | `string   | undefined`  |
| `region`         | `string   | undefined`  |
| `wifiOnInternal` | `number   | undefined`  |
| `domain`         | `number   | undefined`  |
| `tx`             | `object   | undefined`  |
| `rx`             | `object   | undefined`  |


`**tx**` (when present): `telemetryInterval`, `fanMinRuntime`, `uartInverted`, `higherPower`, `melodyType`, `melodyTune`.

`**rx**` (when present): `rxAsTx`, `rxAsTxType`, `uartBaud`, `lockOnFirstConnect`.

### `ConfigureOptions`

Options object written into firmware (patch keys like `flash-discriminator`, `melody`, etc.). Used internally; keys include `flash-discriminator`, `uid`, `wifi-on-interval`, `wifi-ssid`, `wifi-password`, `product-name`, `rcvr-uart-baud`, `lock-on-first-connection`, `tlm-interval`, `tlm-report`, `fan-runtime`, `uart-inverted`, `unlock-higher-power`, `domain`, `beeptype`, `melody`, `rcvr-invert-tx`, `r9mm-mini-sbus`, and others.

### `GetSettingsResult`

Return type of `getSettings()`.


| Property      | Type               | Description                       |
| ------------- | ------------------ | --------------------------------- |
| `config`      | `TargetConfig`     | Target config.                    |
| `firmwareUrl` | `string`           | Full URL to firmware.bin.         |
| `folder`      | `string`           | Base folder for assets.           |
| `options`     | `ConfigureOptions` | Options for `Configure.download`. |


### `FirmwareFile`

Single firmware file (binary + load address).


| Property  | Type         | Description            |
| --------- | ------------ | ---------------------- |
| `data`    | `Uint8Array` | Binary data.           |
| `address` | `number`     | Load address in flash. |


### `GenerateFirmwareMetadata`

Metadata returned with `generateFirmware()`.


| Property      | Type               | Description        |
| ------------- | ------------------ | ------------------ |
| `config`      | `TargetConfig`     | Target config.     |
| `firmwareUrl` | `string`           | Firmware URL used. |
| `options`     | `ConfigureOptions` | Options applied.   |
| `deviceType`  | `string`           | e.g. `TX`, `RX`.   |
| `radioType`   | `string            | null`              |
| `txType`      | `string            | undefined`         |


### `BuildFirmwareUrlResult`

Return type of `buildFirmwareUrl()`.


| Property      | Type     | Description        |
| ------------- | -------- | ------------------ |
| `folder`      | `string` | Base folder path.  |
| `firmwareUrl` | `string` | Full firmware URL. |


### `MelodyNote`

`[frequency: number, duration: number]` — frequency in Hz, duration in ms.

### `FirmwareIndex`

Firmware index (index.json): branches and tags for version selection.


| Property   | Type                    | Description |
| ---------- | ----------------------- | ----------- |
| `branches` | `Record<string, string> | undefined`  |
| `tags`     | `Record<string, string> | undefined`  |


### `SelectOption<T>`

Option item for dropdowns: `{ title: string; value: T }`. Default `T` is `string`.

### `TargetSelectOption`

Option item for target list: `{ title: string; value: FirmwareTarget }`.

### `GetVersionOptionsParams`

Options for `getVersionOptions()`.


| Property          | Type     | Description |
| ----------------- | -------- | ----------- |
| `includeBranches` | `boolean | undefined`  |


### `GetTargetsOptions`

Options for target listing (includes `baseUrl` and `firmwareType`). For `FirmwareConfig#getTargets()` use `GetTargetsOptionsInstance` instead.


| Property                | Type        | Description                                     |
| ----------------------- | ----------- | ----------------------------------------------- |
| `baseUrl`               | `string`    | Base URL for assets (e.g. `./assets`).          |
| `firmwareType`          | `'firmware' | 'backpack'`                                     |
| `targetType`            | `string`    | e.g. `tx`, `rx`, `txbp`, `vrx`, `aat`, `timer`. |
| `vendor`                | `string     | null                                            |
| `radio`                 | `string     | null                                            |
| `version`               | `string     | null                                            |
| `versionLabel`          | `string     | null                                            |
| `includeBranchVersions` | `boolean    | undefined`                                      |


### `GetTargetsOptionsInstance`

Options for `FirmwareConfig#getTargets()`; omits `baseUrl`, `firmwareType`, and `targetType` (supplied by the instance). Same as `GetTargetsOptions` without those three.

---

## FirmwareConfig class

The primary API. Construct with **directory (baseUrl)** and **flavor** (e.g. `FirmwareFlavor.Tx`). The library maps flavor to `firmware` or `backpack` asset path internally. Use one instance per directory and flavor. Index and targets are cached in memory by `(baseUrl, firmwareType)`.

**Asset paths (library-owned):**

- Index: `{baseUrl}/{firmwareType}/index.json`
- Targets: `{baseUrl}/{firmwareType}/hardware/targets.json`

### Constructor

- `**new FirmwareConfig(baseUrl: string, flavor: FirmwareFlavor)`**
  - `baseUrl`: Asset directory (e.g. `'./assets'` or CDN base).
  - `flavor`: One of `FirmwareFlavor.Tx`, `Rx`, `TxBP`, `Vrx`, `Aat`, `Timer`. Determines internal `firmwareType` and `targetType`.

### Instance getters


| Getter         | Type         | Description                                          |
| -------------- | ------------ | ---------------------------------------------------- |
| `firmwareType` | `'firmware'` | `'backpack'`                                         |
| `targetType`   | `string`     | Target type string (`'tx'`, `'rx'`, `'txbp'`, etc.). |


### Instance methods — index and targets

Target type is taken from the instance (from flavor); callers do not pass it.


| Method                                    | Returns                         | Description                                                                                         |
| ----------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `getFirmwareIndex()`                      | `Promise<FirmwareIndex>`        | Fetches index.json (cached).                                                                        |
| `getVersionOptions(params?)`              | `Promise<SelectOption[]>`       | Version dropdown options; `params.includeBranches` for branches/RC.                                 |
| `getVendors()`                            | `Promise<{ id; name }[]>`       | Vendors for this flavor’s target type.                                                              |
| `getRadios(vendorId)`                     | `Promise<{ id; label }[]>`      | Radios for a vendor (firmware only; empty for backpack).                                            |
| `getTargets(options)`                     | `Promise<TargetSelectOption[]>` | Targets filtered by vendor, radio, version; `options`: `GetTargetsOptionsInstance` (no targetType). |
| `getLuaScriptUrl(version, versionLabel?)` | `string`                        | URL for Lua script (elrs.lua or elrsV3.lua when < 4.0.0).                                           |


### Instance methods — context-based

These take `BuildContext` (version, versionLabel, targetKey, options). The instance supplies `baseUrl`, `firmwareType`, and `targetType` from its flavor and **resolves `targetKey` to the full target internally**; callers do not pass vendor/radio/target or full target objects.


| Method                                | Returns                                               | Description                                                        |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| `getSettings(deviceType, context)`   | `Promise<GetSettingsResult>`                          | Config, folder, firmwareUrl, options for `Configure.download`.     |
| `generateFirmware(context)`          | `Promise<[FirmwareFile[], GenerateFirmwareMetadata]>` | Fetches and patches firmware; returns files and metadata.           |
| `buildFirmwareUrl(context)`          | `Promise<BuildFirmwareUrlResult>`                      | `{ folder, firmwareUrl }`; async (resolves `targetKey`).          |
| `getDownloadFilename(ext?, context?)` | `string`                                              | Filename for download (e.g. `ELRS-v3.5.3-...-FCC-default.bin.gz`).   |


**Example**

```js
import { FirmwareConfig, FirmwareFlavor } from 'elrs-firmware-config'

const config = new FirmwareConfig('./assets', store.flavor ?? FirmwareFlavor.Tx)
const versions = await config.getVersionOptions({ includeBranches: false })
const vendors = await config.getVendors()
const targets = await config.getTargets({ vendor: '...', version: '...' })
// Use the option's value (targetKey) in context; library resolves internally
const targetKey = targets[0].value  // e.g. "expresslrs.GHOST_ATTO_2400_RX_v1.GHOST_ATTO_2400_RX"
const [files, metadata] = await config.generateFirmware({
  version: 'abc',
  versionLabel: '3.5.3',
  targetKey,
  options: { region: 'FCC' }
})
const filename = config.getDownloadFilename('.bin.gz', { targetKey, versionLabel: '3.5.3', options: {} })
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


| Value                    | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `MAGIC_NOT_FOUND`        | Configuration magic bytes not found (not a 3.x firmware). |
| `HTTP_ERROR`             | HTTP request failed (fetch !ok).                          |
| `INVALID_FIRMWARE_MAGIC` | Binary does not have expected firmware magic.             |


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
- **Lua script:** `{baseUrl}/{firmwareType}/{version}/lua/elrs.lua` or `elrsV3.lua` (when version < 4.0.0)

