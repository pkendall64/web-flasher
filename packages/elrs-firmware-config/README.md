# elrs-firmware-config

Firmware management and configuration for ELRS (ExpressLRS): build options from context, fetch and patch STM32/ESP binaries, and generate download filenames.

## Installation

```bash
npm install elrs-firmware-config
```

## Usage

```js
import { generateFirmware, getDownloadFilename, buildFirmwareUrl } from 'elrs-firmware-config'

const context = {
  baseUrl: './assets',           // or CDN base URL
  version: 'abc123',
  versionLabel: '3.5.3',
  firmwareType: 'firmware',      // or 'backpack'
  targetType: 'tx',              // 'tx' | 'rx' | 'txbp' | 'vrx' | ...
  radio: 'tx_2400',
  target: { vendor, radio, target, config },
  options: { uid, region, tx: {...}, rx: {...}, ... }
}

const [firmwareFiles, metadata] = await generateFirmware(context)
const filename = getDownloadFilename('.bin.gz', context)
const { folder, firmwareUrl } = buildFirmwareUrl(context)
```

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

## API

- `generateFirmware(context)` → `Promise<[firmwareFiles, metadata]>`
- `getSettings(deviceType, context)` → `Promise<{ config, firmwareUrl, folder, options }>`
- `getDownloadFilename(ext, context)` → `string`
- `buildFirmwareUrl(context)` → `{ folder, firmwareUrl }`
- `Configure.download(folder, version, deviceType, rxAsTxType, radioType, config, firmwareUrl, options)` (low-level)
- `compareSemanticVersions(a, b)` → `number`
- `MelodyParser.parseToArray(melodyOrRTTTL)` (for TX buzzer options)

Full reference: [API.md](./API.md)
