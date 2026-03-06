# elrs-firmware-config

Firmware management and configuration for ELRS (ExpressLRS): build options from context, fetch and patch STM32/ESP binaries, and generate download filenames.

## Installation

```bash
npm install elrs-firmware-config
```

## Usage

```js
import { FirmwareConfig } from 'elrs-firmware-config'

const config = new FirmwareConfig('./assets', 'firmware')  // or 'backpack'

// Version and hardware selection
const versions = await config.getVersionOptions({ includeBranches: false })
const vendors = await config.getVendors('tx')
const targets = await config.getTargets({ targetType: 'tx', vendor: '...', version: '...' })

// Generate firmware (context partial: no baseUrl/firmwareType)
const contextPartial = { version: 'abc123', versionLabel: '3.5.3', targetType: 'tx', radio: 'tx_2400', target: {...}, options: {...} }
const [firmwareFiles, metadata] = await config.generateFirmware(contextPartial)
const filename = config.getDownloadFilename('.bin.gz', contextPartial)
const { folder, firmwareUrl } = config.buildFirmwareUrl(contextPartial)
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

- **FirmwareConfig** (primary): `new FirmwareConfig(baseUrl, firmwareType)` — then `getVersionOptions()`, `getVendors()`, `getTargets()`, `getLuaScriptUrl()`, `generateFirmware(contextPartial)`, `getDownloadFilename()`, `buildFirmwareUrl()`, `getSettings()`.
- `compareSemanticVersions(a, b)`, `compareSemanticVersionsRC(a, b)` — standalone helpers.
- **Configure**, **MelodyParser** — low-level / melody parsing.

Full reference: [API.md](./API.md)
