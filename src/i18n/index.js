import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import {ref} from 'vue'
import locales from './locales.json'

export {locales}

export const locale = ref('en')
export const direction = ref('ltr')

const supportedLanguages = [...locales.map(({value}) => value), 'ar']

function normalizeLanguage(language) {
  if (supportedLanguages.includes(language)) return language
  const baseLanguage = language.split('-')[0]
  return supportedLanguages.includes(baseLanguage) ? baseLanguage : 'en'
}

function localePath([language]) {
  return `./locales/${normalizeLanguage(language)}/messages.json`
}


function updateDocument(language) {
  const resolvedLanguage = normalizeLanguage(language || 'en')
  locale.value = resolvedLanguage
  direction.value = ['ar', 'fa', 'he', 'ur'].includes(resolvedLanguage.split('-')[0]) ? 'rtl' : 'ltr'
  document.documentElement.lang = resolvedLanguage
  document.documentElement.dir = direction.value
}

export const ready = i18n
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    load: 'currentOnly',
    backend: {loadPath: localePath},
  })
  .then(() => updateDocument(i18n.language))

i18n.on('languageChanged', updateDocument)

export function t(key, options) {
  locale.value
  return i18n.t(key, options)
}

export function setLocale(language) {
  return i18n.changeLanguage(language)
}
