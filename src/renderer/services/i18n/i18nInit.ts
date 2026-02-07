import i18n from 'i18next';
import i18nOptions from './i18nOptions';
import HttpBackend, { HttpBackendOptions } from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const initI18n = async (lng = undefined) => {
  await i18n
    .use(initReactI18next)
    .use(HttpBackend)
    .init<HttpBackendOptions>({ ...i18nOptions, ...(lng && { lng: lng }) });

  return i18n;
};

export default initI18n;
