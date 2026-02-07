import i18n from 'i18next';
import initI18n from '@/services/i18n/i18nInit';

if (!i18n.isInitialized) {
  initI18n().then(() => console.log('i18n initialized'));
}

export default i18n;
