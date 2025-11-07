import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ar from './locales/ar/common.json'
import en from './locales/en/common.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en','ar'],
    resources: { en: { common: en }, ar: { common: ar } },
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: { order: ['querystring','localStorage','navigator','cookie','htmlTag'], caches:['localStorage'] }
  })
export default i18n
