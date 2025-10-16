import I18n from 'i18n-js';
import * as RNLocalize from 'react-native-localize';

// Importar traducciones
import es from './translations/es.json';
import en from './translations/en.json';

// Inicializar I18n
const i18n = new I18n();

// Configurar traducciones
i18n.translations = {
  es,
  en,
};

// Configurar idioma por defecto
i18n.defaultLocale = 'es';
i18n.locale = 'es';
i18n.fallbacks = true;

// Detectar idioma del dispositivo
export const setI18nConfig = () => {
  const locales = RNLocalize.getLocales();
  
  if (Array.isArray(locales)) {
    const languageTag = locales[0].languageTag;
    const languageCode = languageTag.split('-')[0];
    
    // Si el idioma está disponible, usarlo
    if (i18n.translations[languageCode]) {
      i18n.locale = languageCode;
    } else {
      i18n.locale = 'es'; // Por defecto español
    }
  }
};

// Configurar al iniciar
setI18nConfig();

// Función helper para traducir
export const t = (key: string, options?: any) => i18n.t(key, options);

export default i18n;