import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// TR imports
import trCommon from './locales/tr/common.json';
import trAuth from './locales/tr/auth.json';
import trLanding from './locales/tr/landing.json';
import trDashboard from './locales/tr/dashboard.json';
import trAppointments from './locales/tr/appointments.json';
import trServices from './locales/tr/services.json';
import trStaff from './locales/tr/staff.json';
import trCustomers from './locales/tr/customers.json';
import trAccounting from './locales/tr/accounting.json';
import trBilling from './locales/tr/billing.json';
import trSettings from './locales/tr/settings.json';
import trNotifications from './locales/tr/notifications.json';
import trSupport from './locales/tr/support.json';

// EN imports
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enLanding from './locales/en/landing.json';
import enDashboard from './locales/en/dashboard.json';
import enAppointments from './locales/en/appointments.json';
import enServices from './locales/en/services.json';
import enStaff from './locales/en/staff.json';
import enCustomers from './locales/en/customers.json';
import enAccounting from './locales/en/accounting.json';
import enBilling from './locales/en/billing.json';
import enSettings from './locales/en/settings.json';
import enNotifications from './locales/en/notifications.json';
import enSupport from './locales/en/support.json';

// RU imports
import ruCommon from './locales/ru/common.json';
import ruAuth from './locales/ru/auth.json';
import ruLanding from './locales/ru/landing.json';
import ruDashboard from './locales/ru/dashboard.json';
import ruAppointments from './locales/ru/appointments.json';
import ruServices from './locales/ru/services.json';
import ruStaff from './locales/ru/staff.json';
import ruCustomers from './locales/ru/customers.json';
import ruAccounting from './locales/ru/accounting.json';
import ruBilling from './locales/ru/billing.json';
import ruSettings from './locales/ru/settings.json';
import ruNotifications from './locales/ru/notifications.json';
import ruSupport from './locales/ru/support.json';

const resources = {
  tr: {
    translation: {
      ...trCommon,
      ...trAuth,
      ...trLanding,
      ...trDashboard,
      ...trAppointments,
      ...trServices,
      ...trStaff,
      ...trCustomers,
      ...trAccounting,
      ...trBilling,
      ...trSettings,
      ...trNotifications,
      ...trSupport,
    },
  },
  en: {
    translation: {
      ...enCommon,
      ...enAuth,
      ...enLanding,
      ...enDashboard,
      ...enAppointments,
      ...enServices,
      ...enStaff,
      ...enCustomers,
      ...enAccounting,
      ...enBilling,
      ...enSettings,
      ...enNotifications,
      ...enSupport,
    },
  },
  ru: {
    translation: {
      ...ruCommon,
      ...ruAuth,
      ...ruLanding,
      ...ruDashboard,
      ...ruAppointments,
      ...ruServices,
      ...ruStaff,
      ...ruCustomers,
      ...ruAccounting,
      ...ruBilling,
      ...ruSettings,
      ...ruNotifications,
      ...ruSupport,
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    resources: resources,
    ns: ['translation'],
    defaultNS: 'translation',
  });

export default i18n;
