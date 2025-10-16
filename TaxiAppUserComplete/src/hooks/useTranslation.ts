import { useCallback } from 'react';
import i18n, { t, setI18nConfig } from '../locales/i18n';

export const useTranslation = () => {
  const translate = useCallback((key: string, options?: any) => {
    return t(key, options);
  }, []);

  const changeLanguage = useCallback((language: string) => {
    i18n.locale = language;
  }, []);

  const currentLanguage = i18n.locale;

  return {
    t: translate,
    changeLanguage,
    currentLanguage,
  };
};

export default useTranslation;