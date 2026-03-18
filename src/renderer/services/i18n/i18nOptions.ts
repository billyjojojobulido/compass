import { InitOptions } from 'i18next';
import en from '@/locales/en/core.json';
import zh from '@/locales/zh/core.json';

const options: InitOptions = {
  debug: false,
  returnNull: false,

  fallbackLng: 'en',
  supportedLngs: ['en', 'zh'],

  ns: ['core'],
  defaultNS: 'core',

  interpolation: {
    escapeValue: false,
  },

  resources: {
    en: { core: en },
    zh: { core: zh },
  },
};

export default options;
