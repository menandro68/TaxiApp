import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './translations/es.json';
import en from './translations/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en }
    },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    },
    compatibilityJSON: 'v3'
  });

export default i18n;