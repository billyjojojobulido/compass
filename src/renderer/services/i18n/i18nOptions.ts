import { InitOptions } from 'i18next';
import en from '@/locales/en/core.json';
import enUs from '@/locales/en_US/core.json';

const options: InitOptions = {
  debug: false,
  returnNull: false,

  fallbackLng: 'en',
  supportedLngs: ['en', 'en_US', 'zh'],

  ns: ['core'],
  defaultNS: 'core',

  interpolation: {
    escapeValue: false,
  },

  resources: {
    en: { core: en },
    en_US: { core: enUs },
  },
};

export default options;
