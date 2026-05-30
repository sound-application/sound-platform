import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all locale JSON files statically (bundled, no HTTP backend needed)
import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arHome from './locales/ar/home.json';
import arCreate from './locales/ar/create.json';
import arPlayer from './locales/ar/player.json';
import arProfile from './locales/ar/profile.json';
import arDiscover from './locales/ar/discover.json';
import arLive from './locales/ar/live.json';
import arMe from './locales/ar/me.json';
import arAccount from './locales/ar/account.json';
import arSettings from './locales/ar/settings.json';
import arPlaylists from './locales/ar/playlists.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enHome from './locales/en/home.json';
import enCreate from './locales/en/create.json';
import enPlayer from './locales/en/player.json';
import enProfile from './locales/en/profile.json';
import enDiscover from './locales/en/discover.json';
import enLive from './locales/en/live.json';
import enMe from './locales/en/me.json';
import enAccount from './locales/en/account.json';
import enSettings from './locales/en/settings.json';
import enPlaylists from './locales/en/playlists.json';

/** Supported languages with metadata */
export const SUPPORTED_LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
  { code: 'en', label: 'English', dir: 'ltr' as const },
  // Future languages — uncomment when translations are ready:
  // { code: 'fr', label: 'Français', dir: 'ltr' as const },
  // { code: 'de', label: 'Deutsch', dir: 'ltr' as const },
  // { code: 'es', label: 'Español', dir: 'ltr' as const },
  // { code: 'pt', label: 'Português', dir: 'ltr' as const },
  // { code: 'it', label: 'Italiano', dir: 'ltr' as const },
  // { code: 'tr', label: 'Türkçe', dir: 'ltr' as const },
] as const;

export const RTL_LANGUAGES = ['ar'];

const resources = {
  ar: {
    common: arCommon,
    auth: arAuth,
    home: arHome,
    create: arCreate,
    player: arPlayer,
    profile: arProfile,
    discover: arDiscover,
    live: arLive,
    me: arMe,
    account: arAccount,
    settings: arSettings,
    playlists: arPlaylists,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    create: enCreate,
    player: enPlayer,
    profile: enProfile,
    discover: enDiscover,
    live: enLive,
    me: enMe,
    account: enAccount,
    settings: enSettings,
    playlists: enPlaylists,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    defaultNS: 'common',
    ns: ['common', 'auth', 'home', 'create', 'player', 'profile', 'discover', 'live', 'me', 'account', 'settings', 'playlists'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sound-lang',
    },
    react: {
      useSuspense: false,
    },
  });

// Set document direction on language change
i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
});

// Set initial direction
const initialDir = RTL_LANGUAGES.includes(i18n.language) ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;
document.documentElement.dir = initialDir;

export default i18n;
