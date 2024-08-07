// External imports
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import FileSaver from 'file-saver'
import mui from 'muicss'
import pako from 'pako'

// Local imports
import { Configure } from './configure'
import { MismatchError, AlertError } from './error'
import { initBindingPhraseGen } from './phrase'
import { autocomplete } from './autocomplete'
import { SwalMUI, Toast } from './swalmui'

const versionSelect = _('version')
const flashMode = _('flash-mode')
const flashButton = _('flashButton')
const connectButton = _('connectButton')
const vendorSelect = _('vendor')
const typeSelect = _('type')
const modelSelect = _('model')
const lblConnTo = _('lblConnTo')
const methodSelect = _('method')
const deviceNext = _('device-next')
const deviceDiscoverButton = _('device-discover')

const mode = 'tags'
const showRCs = true
let index = null
let hardware = null
let selectedModel = null
let device = null
let flasher = null
let binary = null
let term = null
let stlink = null
let uploadURL = null

const hideables = [
  '.tx_2400',
  '.rx_2400',
  '.tx_900',
  '.rx_900',
  '.tx_dual',
  '.rx_dual',
  '.esp32',
  '.esp8285',
  '.stm32',
  '.expert-esp32',
  '.expert-esp8285',
  '.expert-stm32',
  '.rx-as-tx',
  '.rx-as-tx-connection'
]

document.addEventListener('DOMContentLoaded', initialise, false)

function _ (el) {
  return document.getElementById(el)
}

function expertMode() {
  return _('expert').checked
}

function showHideFeatures() {
  hideables.forEach(f => setDisplay(`${f}`, false))
  if (!expertMode()) {
    _('rx-as-tx').checked = false
  }
  setDisplay('.expert', expertMode())
  if (typeSelect.value.startsWith('rx_')) {
    setDisplay('.rx-as-tx', expertMode())
  }
  if (selectedModel) {
    if (typeSelect.value.startsWith('rx_') && expertMode()) {
      if (selectedModel.platform === 'esp8285') {
        _('connection').value = 'internal'
      } else {
        setDisplay('.rx-as-tx-connection', true)
      }
    }
    const features = selectedModel.features
    if (features) {
      features.forEach(f => setDisplay(`.feature-${f}`, expertMode()))
    }
    setDisplay(`.${selectedModel.platform}`)
    setDisplay(`.expert-${selectedModel.platform}`, expertMode())
    setDisplay(`.${adjustedType()}`)
    if (_('rx-as-tx').checked) {
      _('uart').disabled = false
      _('wifi').disabled = false
    }
    else {
      selectedModel.upload_methods.forEach((k) => { if (_(k)) _(k).disabled = false })
    }
  }
}

_('whats-new').onclick = function () {
  return SwalMUI.fire({
    title: "What's New",
    width: "auto",
    html: `<div class="mui--text-left">
<h2>Version 1.0</h2>
<ul>
<li>Expert mode checkbox</li>
<li>Simplified UI, moved uncommon settings behind the "Expert mode" switch</li>
<li>Allow flashing an RX as a TX (Expert mode)</li>
<li>Adds support for flashing ESP32-S3 and C3 based targets</li>
<li>Allows flashing of devices on Android using OTG cable</li>
</ul>
</div>`
  })
}

_('expert').onchange = (_e) => {
  showHideFeatures()
}

function checkStatus (response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`)
  }
  return response
}

const doDiscovery = async (e) => {
  e.preventDefault()
  function check (response) {
    if (!response.ok) {
      throw Promise.reject(new Error('Failed to connect to device'))
    }
    return response.json()
  }
  fetch('http://localhost:9097/mdns')
    .then(response => check(response))
    .catch(async (_e) => {
      throw new AlertError(
        'Auto-discovery proxy not running',
        'Auto detection of wifi devices cannot be performed without the help of the ExpressLRS auto-discovery proxy.',
        'warning'
      )
    })
    .then(mdns => {
      if (Object.keys(mdns).length === 0) {
        throw new AlertError(
          'No wifi devices detected',
          `
<div style="text-align: left;">
Auto detection failed to find any devices on the network.
<br><br>
Ensure the devices are powered on, running wifi mode, and they are on the same network as this computer.
`,
          'info'
        )
      }
      const devices = {}
      for (const key of Object.keys(mdns)) {
        devices[key] = `${mdns[key].address}: ${key.substring(0, key.indexOf('.'))}`
      }

      let p
      if (Object.keys(mdns).length === 1) { // short-circuit if theres only one option
        p = { value: Object.keys(mdns)[0], isConfirmed: true }
      } else {
        p = SwalMUI.select({
          title: 'Select Device to Flash',
          inputOptions: devices
        })
      }
      return Promise.all([p, mdns])
    })
    .then(([device, mdns]) => {
      if (!device.isConfirmed) return [null, mdns, undefined]
      const id = device.value
      const candidates = []
      let i = 0
      const rows = {}
      for (const vendor of Object.keys(hardware)) {
        for (const type of Object.keys(hardware[vendor])) {
          for (const model of Object.keys(hardware[vendor][type])) {
            if (mdns[id].properties.product !== undefined && hardware[vendor][type][model].product_name === mdns[id].properties.product) {
              candidates.push({ vendor, type, model, product: hardware[vendor][type][model].product_name })
              rows[i] = hardware[vendor][type][model].product_name
              i++
            }
            if (hardware[vendor][type][model]['prior_target_name'] === mdns[id].properties.target) {
              candidates.push({ vendor, type, model, product: hardware[vendor][type][model].product_name })
              rows[i] = hardware[vendor][type][model].product_name
              i++
            }
          }
        }
      }

      let p
      if (i === 1) { // short-circuit if theres only one option
        Toast.fire({ icon: 'info', title: `Auto-detected\n${candidates[0].product.replace(/ /g, '\u00a0')}` })
        p = { value: 0, isConfirmed: true }
      } else {
        const footer = `<b>Device:&nbsp;</b>${id.substring(0, id.indexOf('.'))} at ${mdns[id].address}`
        p = SwalMUI.select({
          title: 'Select Device Model',
          inputOptions: rows,
          footer
        })
      }
      return Promise.all([candidates, mdns[id], p])
    })
    .then(([candidates, mdns, selected]) => {
      if (selected === undefined || !selected.isConfirmed) return
      uploadURL = null
      vendorSelect.value = candidates[selected.value].vendor
      vendorSelect.onchange(undefined)
      typeSelect.value = candidates[selected.value].type
      typeSelect.onchange(undefined)
      modelSelect.value = candidates[selected.value].product
      modelSelect.onchange(undefined)
      deviceNext.onclick(e)
      methodSelect.value = 'wifi'
      methodSelect.onchange(undefined)
      uploadURL = `http://localhost:9097/${mdns.address}`
    })
    .catch((e) => {
      console.log(e)
      return SwalMUI.fire({
        icon: e.type,
        title: e.title,
        html: e.message
      })
    })
}

const displayProxyHelp = async (e) => {
  e.preventDefault()
  return SwalMUI.fire({
    icon: 'info',
    title: 'Wifi auto-discovery',
    html: `
<div style="text-align: left;">
Wifi auto-discover is current <b>disabled</b> because the ExpressLRS auto-discovery proxy is not running on the local computer.
<br><br>
Wifi auto-discovery allows the flasher application to discover ExpressLRS wifi enabled devices on your network using mDNS.
It also allows flashing these devices via the auto-discovery proxy.
<br><br>
If you do not have the auto-discovery application running, you can still flash the device via wifi by choosing the "local download"
option as the flashing method and upload the binary file via the devices web-ui.
<br><br>
To enable Wifi auto-discovery and flashing, the ExpressLRS auto-discovery proxy must be running on the local computer.
You can download the proxy for your system from the <a target="_blank" href="//github.com/ExpressLRS/web-flasher/releases">web-flasher github</a> project page.
</div>
`
  })
}

deviceDiscoverButton.onclick = displayProxyHelp

const checkProxy = async () => {
  await fetch('http://localhost:9097/mdns')
    .then(response => checkStatus(response) && response.json())
    .then(() => {
      if (deviceDiscoverButton.onclick !== doDiscovery) {
        deviceDiscoverButton.style.cursor = 'default'
        deviceDiscoverButton.onclick = doDiscovery
        return Toast.fire({
          icon: 'success',
          title: 'Wifi auto-discovery enabled'
        })
      }
    })
    .catch(() => {
      if (deviceDiscoverButton.onclick !== displayProxyHelp) {
        deviceDiscoverButton.style.cursor = 'help'
        deviceDiscoverButton.onclick = displayProxyHelp
        return Toast.fire({
          icon: 'warning',
          title: 'Wifi auto-discovery disabled'
        })
      }
    })
}

const compareSemanticVersions = (a, b) => {
  // Split versions and discriminators
  const [v1, d1] = a.split('-')
  const [v2, d2] = b.split('-')

  // Split version sections
  const v1Sections = v1.split('.')
  const v2Sections = v2.split('.')

  // Compare main version numbers
  for (let i = 0; i < Math.max(v1Sections.length, v2Sections.length); i++) {
    const v1Section = parseInt(v1Sections[i] || 0, 10)
    const v2Section = parseInt(v2Sections[i] || 0, 10)

    if (v1Section > v2Section) return 1
    if (v1Section < v2Section) return -1
  }

  // If main versions are equal, compare discriminators
  if (!d1 && d2) return 1 // v1 is greater if it does not have discriminator
  if (d1 && !d2) return -1 // v2 is greater if it does not have a discriminator
  if (d1 && d2) return d1.localeCompare(d2) // Compare discriminators
  return 0 // Versions are equal
}

const compareSemanticVersionsRC = (a, b) => {
  return compareSemanticVersions(a.replace(/-.*/, ''), b.replace(/-.*/, ''))
}

async function initialise () {
  setInterval(() => { checkProxy() }, 30000)
  term = new Terminal()
  term.open(_('serial-monitor'))
  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  fitAddon.fit()
  window.onresize = () => {
    fitAddon.fit()
  }

  initBindingPhraseGen()
  index = await checkStatus(await fetch('firmware/index.json')).json()
  let selected = true
  Object.keys(index[mode]).sort(compareSemanticVersions).reverse().forEach((version, _unused) => {
    const opt = document.createElement('option')
    if (version.indexOf('-RC') === -1 || showRCs) {
      opt.value = index[mode][version]
      opt.innerHTML = version
      opt.selected = selected
      versionSelect.appendChild(opt)
      selected = false
    }
  })
  versionSelect.onchange(undefined)
  initFiledrag()
  return checkProxy()
}

versionSelect.onchange = async () => {
  vendorSelect.options.length = 1
  vendorSelect.disabled = true
  vendorSelect.value = ''
  typeSelect.disabled = true
  typeSelect.value = ''

  _('download-lua').href = `firmware/${versionSelect.value}/lua/elrsV3.lua`

  hardware = await checkStatus(await fetch('firmware/hardware/targets.json')).json()
  for (const k in hardware) {
    const opt = document.createElement('option')
    opt.value = k
    opt.innerHTML = hardware[k].name === undefined ? k : hardware[k].name
    vendorSelect.appendChild(opt)
  }
  vendorSelect.disabled = false
  setDisplay('.uart', false)
  setDisplay('.stlink', false)
  setDisplay('.wifi', false)

  const version = versionSelect.options[versionSelect.selectedIndex].text
  const models = []
  for (const v in hardware) {
    for (const t in hardware[v]) {
      for (const m in hardware[v][t]) {
        if (hardware[v][t][m].product_name !== undefined && compareSemanticVersionsRC(version, hardware[v][t][m]['min_version']) >= 0) {
          models.push(hardware[v][t][m].product_name)
        }
      }
    }
  }
  autocomplete(modelSelect, models, true)
}

function setDisplay (elementOrSelector, shown = true) {
  if (typeof elementOrSelector === 'string') {
    const elements = document.querySelectorAll(elementOrSelector)
    elements.forEach(element => {
      setClass(element, 'display--none', !shown)
    })
  } else if (typeof elementOrSelector === 'object') {
    setClass(elementOrSelector, 'display--none', !shown)
  }
}

function setClass (elementOrSelector, className, enabled = true) {
  const element = (typeof elementOrSelector === 'string') ? document.querySelector(elementOrSelector) : elementOrSelector

  if (enabled) {
    element.classList.add(className)
  } else {
    element.classList.remove(className)
  }
}

_('step-1').onclick = (e) => {
  e.preventDefault()
  setDisplay('#step-device')
  setDisplay('#step-options', false)
  setDisplay('#step-flash', false)

  setClass('#step-1', 'done', false)
  setClass('#step-1', 'active')
  setClass('#step-1', 'editable')

  setClass('#step-2', 'active', false)
  setClass('#step-2', 'editable', false)
  setClass('#step-2', 'done', false)

  setClass('#step-3', 'active', false)
  setClass('#step-3', 'editable', false)
  setClass('#step-3', 'done', false)
}

_('step-2').onclick = (e) => {
  e.preventDefault()
  if (!_('step-flash').classList.contains('display--none')) {
    setDisplay('#step-options')
    setDisplay('#step-flash', false)

    setClass('#step-2', 'done', false)
    setClass('#step-2', 'active')
    setClass('#step-2', 'editable')

    setClass('#step-3', 'active', false)
    setClass('#step-3', 'editable', false)
    setClass('#step-3', 'done', false)
  }
}

vendorSelect.onchange = () => {
  _('tx_2400').disabled = true
  _('tx_900').disabled = true
  _('tx_dual').disabled = true
  _('rx_2400').disabled = true
  _('rx_900').disabled = true
  _('rx_dual').disabled = true
  for (const k in hardware[vendorSelect.value]) {
    if (_(k) !== null) _(k).disabled = false
  }
  typeSelect.disabled = false
  typeSelect.value = ''
  modelSelect.value = ''
  deviceNext.disabled = true
  const models = []
  const version = versionSelect.options[versionSelect.selectedIndex].text
  const v = vendorSelect.value
  for (const t in hardware[v]) {
    for (const m in hardware[v][t]) {
      if (hardware[v][t][m].product_name !== undefined && compareSemanticVersionsRC(version, hardware[v][t][m]['min_version']) >= 0) {
        models.push(hardware[v][t][m].product_name)
      }
    }
  }
  autocomplete(modelSelect, models, true)
}

typeSelect.onchange = () => {
  modelSelect.value = ''
  deviceNext.disabled = true
  const models = []
  const version = versionSelect.options[versionSelect.selectedIndex].text
  const v = vendorSelect.value
  const t = typeSelect.value
  for (const m in hardware[v][t]) {
    if (hardware[v][t][m].product_name !== undefined && compareSemanticVersionsRC(version, hardware[v][t][m]['min_version']) >= 0) {
      models.push(hardware[v][t][m].product_name)
    }
  }
  if (t.startsWith('rx_')) setDisplay('.rx-as-tx', expertMode())
  else setDisplay('.rx-as-tx', false)
  autocomplete(modelSelect, models, true)
}

modelSelect.onchange = () => {
  for (const v in hardware) {
    for (const t in hardware[v]) {
      for (const m in hardware[v][t]) {
        if (hardware[v][t][m].product_name === modelSelect.value) {
          vendorSelect.value = v
          typeSelect.value = t
          selectedModel = hardware[v][t][m]
          typeSelect.disabled = false
          deviceNext.disabled = false
          document.querySelectorAll('.product-name').forEach(e => { e.innerHTML = selectedModel.product_name })
          showHideFeatures()
          return
        }
      }
    }
  }
  modelSelect.value = ''
}

_('rx-as-tx').onchange = (_e) => {
  if (_('rx-as-tx').checked) {
    for (const v in hardware) {
      for (const t in hardware[v]) {
        for (const m in hardware[v][t]) {
          if (hardware[v][t][m].product_name === modelSelect.value) {
            if (hardware[v][t][m].platform === 'esp8285') {
              setDisplay('.rx-as-tx-connection', false)
              _('connection').value = 'internal'
            } else {
              setDisplay('.rx-as-tx-connection', true)
              _('connection').value = 'internal'
            }
          }
        }
      }
    }
  }
  else {
    setDisplay('.rx-as-tx-connection', false)
  }
}

function adjustedType() {
  return _('rx-as-tx').checked ? typeSelect.value.replace('rx_', 'tx_') : typeSelect.value
}

deviceNext.onclick = (e) => {
  e.preventDefault()
  _('fcclbt').value = 'FCC'
  
  _('uart').disabled = true
  _('betaflight').disabled = true
  _('etx').disabled = true
  _('wifi').disabled = true
  _('stlink').disabled = true
  showHideFeatures()
  
  setDisplay('#step-device', false)
  setClass('#step-2', 'active')
  setClass('#step-2', 'editable')
  setClass('#step-1', 'done')
  setClass('#step-1', 'editable', false)
  setDisplay('#step-options')
}

methodSelect.onchange = () => {
  _('options-next').disabled = false
  if (methodSelect.value === 'download') {
    _('options-next').innerText = 'Download'
  } else {
    _('options-next').innerText = 'Next'
  }
}

const getSettings = async (deviceType) => {
  const config = selectedModel
  const firmwareUrl = `firmware/${versionSelect.value}/${_('fcclbt').value}/${config.firmware}/firmware.bin`
  const options = {
    'flash-discriminator': Math.floor(Math.random() * ((2 ** 31) - 2) + 1)
  }

  if (_('uid').value !== '') {
    options.uid = _('uid').value.split(',').map((element) => {
      return Number(element)
    })
  }
  if (config.platform !== 'stm32') {
    options['wifi-on-interval'] = +_('wifi-on-interval').value
    if (_('wifi-ssid').value !== '') {
      options['wifi-ssid'] = _('wifi-ssid').value
      options['wifi-password'] = _('wifi-password').value
    }
  }
  if (deviceType === 'RX' && !_('rx-as-tx').checked) {
    options['rcvr-uart-baud'] = +_('rcvr-uart-baud').value
    options['rcvr-invert-tx'] = _('rcvr-invert-tx').checked
    options['lock-on-first-connection'] = _('lock-on-first-connection').checked
  } else {
    options['tlm-interval'] = +_('tlm-interval').value
    options['fan-runtime'] = +_('fan-runtime').value
    options['uart-inverted'] = _('uart-inverted').checked
    options['unlock-higher-power'] = _('unlock-higher-power').checked
  }
  if (typeSelect.value.endsWith('_900') || typeSelect.value.endsWith('_dual')) {
    options.domain = +_('domain').value
  }
  if (config.features !== undefined && config.features.indexOf('buzzer') !== -1) {
    const beeptype = Number(_('melody-type').value)
    options.beeptype = beeptype > 2 ? 2 : beeptype

    const melodyModule = await import('./melody.js')
    if (beeptype === 2) {
      options.melody = melodyModule.MelodyParser.parseToArray('A4 20 B4 20|60|0')
    } else if (beeptype === 3) {
      options.melody = melodyModule.MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0')
    } else if (beeptype === 4) {
      options.melody = melodyModule.MelodyParser.parseToArray(_('melody').value)
    } else {
      options.melody = []
    }
  }
  return { config, firmwareUrl, options }
}

const connectUART = async (e) => {
  e.preventDefault()
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : (typeSelect.value.endsWith('_2400') ? 'sx128x' : 'lr1121')
  term.clear()
  const { config, firmwareUrl, options } = await getSettings(deviceType)
  try {
    device = await navigator.serial.requestPort()
  } catch {
    lblConnTo.innerHTML = 'No device selected'
    await closeDevice()
    return await SwalMUI.fire({
      icon: 'error',
      title: 'No Device Selected',
      text: 'A serial device must be select to perform flashing'
    })
  }

  device.addEventListener('disconnect', async (_e) => {
    term.clear()
    setDisplay(flashMode, false)
    setDisplay(connectButton)
    _('progressBar').value = 0
    _('status').innerHTML = ''
  })
  setDisplay(connectButton, false)

  const txType = _('rx-as-tx').checked ? _('connection').value : undefined
  binary = await Configure.download(deviceType, txType, radioType, config, firmwareUrl, options)

  const method = methodSelect.value

  if (config.platform === 'stm32') {
    const xmodemModule = await import('./xmodem.js')
    flasher = new xmodemModule.XmodemFlasher(device, deviceType, method, config, options, firmwareUrl, term)
  } else {
    const espflasherModule = await import('./espflasher.js')
    flasher = new espflasherModule.ESPFlasher(device, deviceType, method, config, options, firmwareUrl, term)
  }
  try {
    const chip = await flasher.connect()

    lblConnTo.innerHTML = `Connected to device: ${chip}`
    setDisplay(flashMode)
  } catch (e) {
    if (e instanceof MismatchError) {
      lblConnTo.innerHTML = 'Target mismatch, flashing cancelled'
      return closeDevice()
    } else {
      lblConnTo.innerHTML = 'Failed to connect to device, restart device and try again'
      try {
        await closeDevice()
      } catch {}
      return await SwalMUI.fire({
        icon: 'error',
        title: e.title,
        html: e.message
      })
    }
  }
}

const generateFirmware = async () => {
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : (typeSelect.value.endsWith('_2400') ? 'sx128x' : 'lr1121')
  const { config, firmwareUrl, options } = await getSettings(deviceType)
  const txType = _('rx-as-tx').checked ? _('connection').value : undefined
  const firmwareFiles = await Configure.download(deviceType, txType, radioType, config, firmwareUrl, options)
  return [
    firmwareFiles,
    { config, firmwareUrl, options }
  ]
}

const connectSTLink = async (e) => {
  e.preventDefault()
  term.clear()
  const stlinkModule = await import('./stlink.js')
  const _stlink = new stlinkModule.STLink(term)
  const [_bin, { config, firmwareUrl, options }] = await generateFirmware()

  try {
    const version = await _stlink.connect(config, firmwareUrl, options, _e => {
      term.clear()
      setDisplay(flashMode, false)
      setDisplay(connectButton)
      _('progressBar').value = 0
      _('status').innerHTML = ''
    })

    lblConnTo.innerHTML = `Connected to device: ${version}`
    setDisplay(connectButton, false)
    setDisplay(flashMode)
    binary = _bin
    stlink = _stlink
  } catch (e) {
    lblConnTo.innerHTML = 'Not connected'
    setDisplay(flashMode, false)
    setDisplay(connectButton)
    return Promise.reject(e)
  }
}

const getWifiTarget = async (url) => {
  const response = await fetch(`${url}/target`)
  if (!response.ok) {
    throw await Promise.reject(new Error('Failed to connect to device'))
  }
  return [url, await response.json()]
}

const connectWifi = async (e) => {
  e.preventDefault()
  const deviceType = typeSelect.value.substring(0, 2)
  let promise
  if (uploadURL !== null) {
    promise = getWifiTarget(uploadURL)
  } else {
    promise = Promise.any([
      getWifiTarget('http://10.0.0.1'),
      getWifiTarget(`http://elrs_${deviceType}`),
      getWifiTarget(`http://elrs_${deviceType}.local`)
    ])
  }
  try {
    const [url, response] = await promise
    lblConnTo.innerHTML = `Connected to: ${url}`
    _('product_name').innerHTML = `Product name: ${response.product_name}`
    _('target').innerHTML = `Target firmware: ${response.target}`
    _('firmware-version').innerHTML = `Version: ${response.version}`
    setDisplay(flashMode)
    uploadURL = url
  } catch (reason) {
    lblConnTo.innerHTML = 'No device found, or error connecting to device'
    console.log(reason)
  }
}

_('options-next').onclick = async (e) => {
  e.preventDefault()
  const method = methodSelect.value
  if (method === 'download') {
    await downloadFirmware()
  } else {
    setDisplay('#step-options', false)
    setClass('#step-3', 'active')
    setClass('#step-3', 'editable')
    setClass('#step-2', 'done')
    setClass('#step-2', 'editable', false)
    setDisplay('#step-flash')

    setDisplay(`.${method}`)

    if (method === 'wifi') {
      connectButton.onclick = connectWifi
    } else if (method === 'stlink') {
      connectButton.onclick = connectSTLink
    } else {
      connectButton.onclick = connectUART
    }
    await connectButton.onclick(e)
  }
}

const closeDevice = async () => {
  if (device != null) {
    await device.close()
    device = null
  }
  setDisplay(flashMode, false)
  setDisplay(connectButton)
  lblConnTo.innerHTML = 'Not connected'
  _('progressBar').value = 0
  _('status').innerHTML = ''
}

flashButton.onclick = async (e) => {
  e.preventDefault()
  mui.overlay('on', { keyboard: false, static: true })
  const method = methodSelect.value
  if (method === 'wifi') await wifiUpload()
  else {
    try {
      if (flasher !== null) {
        await flasher.flash(binary, _('erase-flash').checked)
      } else {
        await stlink.flash(binary, _('flash-bootloader').checked)
      }
      mui.overlay('off')
      return SwalMUI.fire({
        icon: 'success',
        title: 'Flashing Succeeded',
        text: 'Firmware upload complete'
      })
    } catch (e) {
      return errorHandler(e.message)
    } finally {
      await closeDevice()
    }
  }
}

const downloadFirmware = async () => {
  const [binary, {config}] = await generateFirmware()
  if (config.platform === 'esp8285') {
    const bin = pako.gzip(binary[binary.length - 1].data)
    const data = new Blob([bin], { type: 'application/octet-stream' })
    FileSaver.saveAs(data, 'firmware.bin.gz')
  } else {
    const bin = binary[binary.length - 1].data.buffer
    const data = new Blob([bin], { type: 'application/octet-stream' })
    FileSaver.saveAs(data, 'firmware.bin')
  }
}

const wifiUpload = async () => {
  const [binary] = await generateFirmware()

  try {
    const bin = binary[binary.length - 1].data.buffer
    const data = new Blob([bin], { type: 'application/octet-stream' })
    const formdata = new FormData()
    formdata.append('upload', data, 'firmware.bin')
    const ajax = new XMLHttpRequest()
    ajax.upload.addEventListener('progress', progressHandler, false)
    ajax.addEventListener('load', completeHandler, false)
    ajax.addEventListener('error', (e) => errorHandler(e.target.responseText), false)
    ajax.addEventListener('abort', abortHandler, false)
    ajax.open('POST', `${uploadURL}/update`)
    ajax.setRequestHeader('X-FileSize', data.size.toString())
    ajax.send(formdata)
  } catch (error) {}
}

function progressHandler (event) {
  const percent = Math.round((event.loaded / event.total) * 100)
  _('progressBar').value = percent
  _('status').innerHTML = `${percent}% uploaded... please wait`
}

function completeHandler (event) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  const data = JSON.parse(event.target.responseText)
  if (data.status === 'ok') {
    function showMessage () {
      return SwalMUI.fire({
        icon: 'success',
        title: 'Update Succeeded',
        text: data.msg
      })
    }
    // This is basically a delayed display of the success dialog with a fake progress
    let percent = 0
    const interval = setInterval(() => {
      percent = percent + 2
      _('progressBar').value = percent
      _('status').innerHTML = `${percent}% flashed... please wait`
      if (percent === 100) {
        clearInterval(interval)
        _('status').innerHTML = ''
        _('progressBar').value = 0
        showMessage()
      }
    }, 100)
  } else if (data.status === 'mismatch') {
    SwalMUI.fire({
      icon: 'question',
      title: 'Targets Mismatch',
      html: data.msg,
      confirmButtonText: 'Flash anyway',
      showCancelButton: true
    }).then((confirm) => {
      const xmlhttp = new XMLHttpRequest()
      xmlhttp.onreadystatechange = function () {
        if (this.readyState === 4) {
          _('status').innerHTML = ''
          _('progressBar').value = 0
          if (this.status === 200) {
            const data = JSON.parse(this.responseText)
            return SwalMUI.fire({
              icon: 'info',
              title: 'Force Update',
              html: data.msg
            })
          } else {
            errorHandler('An error occurred trying to force the update')
          }
        }
      }
      xmlhttp.open('POST', `${uploadURL}/forceupdate`, true)
      const data = new FormData()
      data.append('action', confirm)
      xmlhttp.send(data)
    })
  } else {
    console.log(data)
    errorHandler(data.msg)
  }
}

function errorHandler (msg) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  return SwalMUI.fire({
    icon: 'error',
    title: 'Update Failed',
    html: msg
  })
}

function abortHandler (event) {
  _('status').innerHTML = ''
  _('progressBar').value = 0
  mui.overlay('off')
  return SwalMUI.fire({
    icon: 'info',
    title: 'Update Aborted',
    html: event.target.responseText
  })
}

// Allow dropping of JSON file on "Next" button

function fileDragHover (e) {
  e.stopPropagation()
  e.preventDefault()
  if (e.type === 'dragenter') {
    e.target.classList.add('hover')
  } else {
    e.target.classList.remove('hover')
  }
}

async function fileSelectHandler (e) {
  fileDragHover(e)
  const files = e.target.files || e.dataTransfer.files
  if (files.length > 0) {
    return parseFile(files[0])
  }
}

// Need to do something about C3 & LR1121
async function parseFile (file) {
  const reader = new FileReader()
  reader.onload = async function (e) {
    const customLayout = JSON.parse(e.target.result)
    SwalMUI.fire({
      title: "Select device type to flash",
      html: `
      <div style="text-align:left">
        <div class="mui-select">
          <select id="custom-type">
            <option value="TX">Transmitter</option>
            <option value="RX">Receiver</option>
          </select>
          <label for="custom-type">Target Firmware</label>
        </div>
        <div class="mui-select">
          <select id="custom-mcu">
            <option value="ESP32">ESP32</option>
            <option value="ESP32S3">ESP32-S3</option>
            <option value="ESP32C3">ESP32-C3</option>
            <option value="ESP8285">ESP8285</option>
          </select>
          <label for="custom-mcu">Target MCU</label>
        </div>
        <div class="mui-select">
          <select id="custom-radio">
            <option value="2400">SX128x</option>
            <option value="900">SX127x</option>
            <option value="LR1121">LR1121</option>
          </select>
          <label for="custom-radio">Target Radio</label>
        </div>
      </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return [
          document.getElementById("custom-type").value,
          document.getElementById("custom-mcu").value,
          document.getElementById("custom-radio").value
        ];
      }
    }).then((p) => {
      const v = p.value
      if (v !== undefined) {
        const platform = v[1]
        selectedModel = {
          product_name: 'Custom Target',
          lua_name: 'Custom',
          upload_methods: v[0] === 'TX' ? ['uart', 'etx', 'wifi'] : ['uart', 'betaflight', 'wifi'],
          platform: platform.toLowerCase(),
          firmware: `Unified_${platform}_${v[2]}_${v[0]}`,
          custom_layout: customLayout
        }
        typeSelect.value = `${v[0].toLowerCase()}_${v[2] === 'LR1121' ? 'dual' : v[2]}`
        deviceNext.onclick(e)
      }
    })
    const element = document.querySelector('.swal2-html-container')
    element.style.overflow = 'visible'
    element.style.zIndex = 2
  }
  reader.readAsText(file)
}

function initFiledrag () {
  const filedrag = _('custom-drop')
  filedrag.addEventListener('dragover', fileDragHover, false)
  filedrag.addEventListener('dragenter', fileDragHover, false)
  filedrag.addEventListener('dragleave', fileDragHover, false)
  filedrag.addEventListener('drop', fileSelectHandler, false)
}
