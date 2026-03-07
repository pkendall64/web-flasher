# elrs-firmware-config

Firmware management and configuration for ELRS (ExpressLRS): build options from context, fetch and patch STM32/ESP binaries, and generate download filenames.

## Installation

```bash
npm install elrs-firmware-config
```

## Usage

Construct with **directory** and **flavor** (enum).

```js
import { FirmwareConfig, FirmwareFlavor } from 'elrs-firmware-config'

const config = new FirmwareConfig('./assets', FirmwareFlavor.Tx)

// Version and hardware selection (targetType comes from flavor)
const versions = await config.getVersionOptions({ includeBranches: false })
const vendors = await config.getVendors()
const targets = await config.getTargets({ vendor: '...', version: '...' })

// Build context: only versionLabel, targetKey (from targets[].value), and options
const ctx = { version: 'abc123', versionLabel: '3.5.3', targetKey: targets[0].value, options: { region: 'FCC' } }
const [firmwareFiles, metadata] = await config.generateFirmware(ctx)
const filename = config.getDownloadFilename('.bin.gz', ctx)
const { folder, firmwareUrl } = await config.buildFirmwareUrl(ctx)
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

- **FirmwareFlavor** (enum): `Tx`, `Rx`, `TxBP`, `Vrx`, `Aat`, `Timer` — use with constructor. Store the enum in app state; use `**FirmwareFlavor.fromString(s)`** only at boundaries (e.g. URL param). `**FirmwareFlavor.firmwareType(flavor)**` for asset path type.
- **FirmwareConfig** (primary): `new FirmwareConfig(baseUrl, flavor)` — then `getVersionOptions()`, `getVendors()`, `getRadios(vendorId)`, `getTargets(options)` (returns `{ title, value: targetKey, config }`), `getLuaScriptUrl()`, `generateFirmware(buildContext)`, `getDownloadFilename()`, `buildFirmwareUrl()` (async), `getSettings()`. Context is **BuildContext**: `version`, `versionLabel`, `targetKey`, `options` only; the library resolves `targetKey` internally.
- `compareSemanticVersions(a, b)`, `compareSemanticVersionsRC(a, b)` — standalone helpers.
- **Configure**, **MelodyParser** — low-level / melody parsing.

Full reference: [API.md](./API.md)