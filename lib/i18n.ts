import * as Localization from 'expo-localization';
import i18n from 'i18next';
// Use CommonJS build to avoid Metro resolver issues with ESM
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initReactI18next } = require('react-i18next/dist/commonjs');

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import ta from '@/locales/ta.json';

// Determine initial language from device settings
const deviceLang = Array.isArray(Localization.getLocales()) && Localization.getLocales().length > 0
  ? Localization.getLocales()[0].languageCode
  : 'en';

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
} as const;

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: (deviceLang === 'hi' || deviceLang === 'ta') ? deviceLang : 'en',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })
    .catch(() => {});
}

export default i18n;
