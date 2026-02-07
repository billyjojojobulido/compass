import { InitOptions } from 'i18next';
import en from '../locales/en/core.json';
import enUs from '../locales/en_US/core.json';

let defaultLanguage: any = enUs;
if (
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV &&
  process.env.NODE_ENV === 'development'
) {
  defaultLanguage = en;
}

async function loadLocales(options, url: string, payload, callback) {
  try {
    const locale = await import('../locales/' + url + '/core.json');
    callback(null, { status: 200, data: locale });
  } catch (e) {
    console.log(`Unable to load locale at ${url}\n`, e);
    callback(null, { status: 200, data: defaultLanguage });
  }
}

// @ts-ignore
const options: InitOptions = {
  debug: false,
  returnNull: false,
  fallbackLng: 'en',
  // load: 'all', // ['en', 'de'], // we only provide en, de -> no region specific locals like en-US, de-DE
  ns: ['core'],
  defaultNS: 'core',
  // attributes: ['t', 'i18n'],
  keySeparator: false,
  backend: {
    loadPath: '{{lng}}',
    // parse: data => data, // comment to have working i18n switch
    request: loadLocales, // comment to have working i18n switch
  }, // as HttpBackendOptions
};

export default options;
