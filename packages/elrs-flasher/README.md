# elrs-flasher

Device flashing library for ExpressLRS firmware. Provides ST-Link (WebUSB), ESP (Web Serial), and Xmodem serial flashers for browser-based flashing.

## Flashers

- **STLink** — Flash STM32 targets via ST-Link debugger (WebUSB).
- **ESPFlasher** — Flash ESP8266/ESP32 via Web Serial (UART, Betaflight passthrough, EdgeTX passthrough).
- **XmodemFlasher** — Flash STM32 RX via serial Xmodem (Web Serial, CRSF/GHST passthrough).

## Usage

Consumers pass a **term** (logger) object with `write(data)` and `writeln(data)`, plus **config** from firmware/target configuration. Config shape includes:

- **ST-Link:** `config.stlink.cpus`, `config.stlink.offset`
- **ESP/Xmodem:** `config.platform`, `config.baud`, `config.firmware`

## Errors

Export classes: `MismatchError`, `WrongMCU`, `PassthroughError`, `AlertError` for UI handling (e.g. `instanceof` checks).

## Environment

Targets browser environments only; requires WebUSB (ST-Link) and/or Web Serial (ESP, Xmodem) support.

Full reference: [API.md](./API.md)
