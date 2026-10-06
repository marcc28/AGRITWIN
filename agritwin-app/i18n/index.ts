import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';
import it from './locales/it.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',

    resources: {
      ca: { translation: ca },
      es: { translation: es },
      en: { translation: en },
      it: { translation: it },
    },

    lng: 'ca',
    fallbackLng: 'ca',

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;