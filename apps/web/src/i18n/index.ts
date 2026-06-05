import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import arAccount from './locales/ar/account.json';
import arAudiocreate from './locales/ar/audiocreate.json';
import arAuth from './locales/ar/auth.json';
import arCategorydiscovery from './locales/ar/categorydiscovery.json';
import arCommon from './locales/ar/common.json';
import arConnectivitybanner from './locales/ar/connectivitybanner.json';
import arCreate from './locales/ar/create.json';
import arCreatehub from './locales/ar/createhub.json';
import arEditprofile from './locales/ar/editprofile.json';
import arFilterdropdown from './locales/ar/filterdropdown.json';
import arGeneraldiscover from './locales/ar/generaldiscover.json';
import arGeneralhome from './locales/ar/generalhome.json';
import arGeneralme from './locales/ar/generalme.json';
import arGlobalcreatehub from './locales/ar/globalcreatehub.json';
import arHome from './locales/ar/home.json';
import arIndex from './locales/ar/index.json';
import arLive from './locales/ar/live.json';
import arLiveworldselector from './locales/ar/liveworldselector.json';
import arLockedlabels from './locales/ar/lockedlabels.json';
import arMusicdiscover from './locales/ar/musicdiscover.json';
import arMusichome from './locales/ar/musichome.json';
import arMusiclive from './locales/ar/musiclive.json';
import arMusicme from './locales/ar/musicme.json';
import arPlayer from './locales/ar/player.json';
import arPlaylistdetail from './locales/ar/playlistdetail.json';
import arPlaylists from './locales/ar/playlists.json';
import arPlusdiscover from './locales/ar/plusdiscover.json';
import arPlushome from './locales/ar/plushome.json';
import arPlusme from './locales/ar/plusme.json';
import arPrivacysettings from './locales/ar/privacysettings.json';
import arProfile from './locales/ar/profile.json';
import arRadiodiscover from './locales/ar/radiodiscover.json';
import arRadiohome from './locales/ar/radiohome.json';
import arRadiome from './locales/ar/radiome.json';
import arSettings from './locales/ar/settings.json';
import arTournamentsdiscover from './locales/ar/tournamentsdiscover.json';
import arTournamentshome from './locales/ar/tournamentshome.json';
import arTournamentslive from './locales/ar/tournamentslive.json';
import arTournamentsme from './locales/ar/tournamentsme.json';
import arUseaudiorecorder from './locales/ar/useaudiorecorder.json';
import arUseaudioupload from './locales/ar/useaudioupload.json';
import arUsefollowstate from './locales/ar/usefollowstate.json';
import arUseviewerprofile from './locales/ar/useviewerprofile.json';
import arWorld from './locales/ar/world.json';

import enAccount from './locales/en/account.json';
import enAudiocreate from './locales/en/audiocreate.json';
import enAuth from './locales/en/auth.json';
import enCategorydiscovery from './locales/en/categorydiscovery.json';
import enCommon from './locales/en/common.json';
import enConnectivitybanner from './locales/en/connectivitybanner.json';
import enCreate from './locales/en/create.json';
import enCreatehub from './locales/en/createhub.json';
import enEditprofile from './locales/en/editprofile.json';
import enFilterdropdown from './locales/en/filterdropdown.json';
import enGeneraldiscover from './locales/en/generaldiscover.json';
import enGeneralhome from './locales/en/generalhome.json';
import enGeneralme from './locales/en/generalme.json';
import enGlobalcreatehub from './locales/en/globalcreatehub.json';
import enHome from './locales/en/home.json';
import enIndex from './locales/en/index.json';
import enLive from './locales/en/live.json';
import enLiveworldselector from './locales/en/liveworldselector.json';
import enLockedlabels from './locales/en/lockedlabels.json';
import enMusicdiscover from './locales/en/musicdiscover.json';
import enMusichome from './locales/en/musichome.json';
import enMusiclive from './locales/en/musiclive.json';
import enMusicme from './locales/en/musicme.json';
import enPlayer from './locales/en/player.json';
import enPlaylistdetail from './locales/en/playlistdetail.json';
import enPlaylists from './locales/en/playlists.json';
import enPlusdiscover from './locales/en/plusdiscover.json';
import enPlushome from './locales/en/plushome.json';
import enPlusme from './locales/en/plusme.json';
import enPrivacysettings from './locales/en/privacysettings.json';
import enProfile from './locales/en/profile.json';
import enRadiodiscover from './locales/en/radiodiscover.json';
import enRadiohome from './locales/en/radiohome.json';
import enRadiome from './locales/en/radiome.json';
import enSettings from './locales/en/settings.json';
import enTournamentsdiscover from './locales/en/tournamentsdiscover.json';
import enTournamentshome from './locales/en/tournamentshome.json';
import enTournamentslive from './locales/en/tournamentslive.json';
import enTournamentsme from './locales/en/tournamentsme.json';
import enUseaudiorecorder from './locales/en/useaudiorecorder.json';
import enUseaudioupload from './locales/en/useaudioupload.json';
import enUsefollowstate from './locales/en/usefollowstate.json';
import enUseviewerprofile from './locales/en/useviewerprofile.json';
import enWorld from './locales/en/world.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
  { code: 'en', label: 'English', dir: 'ltr' as const }
] as const;

export const RTL_LANGUAGES = ['ar'];

const resources = {
  ar: {
    account: arAccount,
    audiocreate: arAudiocreate,
    auth: arAuth,
    categorydiscovery: arCategorydiscovery,
    categoryDiscovery: arCategorydiscovery,
    common: arCommon,
    connectivitybanner: arConnectivitybanner,
    connectivityBanner: arConnectivitybanner,
    create: arCreate,
    createhub: arCreatehub,
    createHub: arCreatehub,
    editprofile: arEditprofile,
    editProfile: arEditprofile,
    filterdropdown: arFilterdropdown,
    filterDropdown: arFilterdropdown,
    generaldiscover: arGeneraldiscover,
    generalDiscover: arGeneraldiscover,
    generalhome: arGeneralhome,
    generalHome: arGeneralhome,
    generalme: arGeneralme,
    generalMe: arGeneralme,
    globalcreatehub: arGlobalcreatehub,
    globalCreateHub: arGlobalcreatehub,
    home: arHome,
    index: arIndex,
    live: arLive,
    liveworldselector: arLiveworldselector,
    liveWorldSelector: arLiveworldselector,
    lockedlabels: arLockedlabels,
    lockedLabels: arLockedlabels,
    musicdiscover: arMusicdiscover,
    musicDiscover: arMusicdiscover,
    musichome: arMusichome,
    musicHome: arMusichome,
    musiclive: arMusiclive,
    musicLive: arMusiclive,
    musicme: arMusicme,
    musicMe: arMusicme,
    player: arPlayer,
    playlistdetail: arPlaylistdetail,
    playlistDetail: arPlaylistdetail,
    playlists: arPlaylists,
    plusdiscover: arPlusdiscover,
    plusDiscover: arPlusdiscover,
    plushome: arPlushome,
    plusHome: arPlushome,
    plusme: arPlusme,
    plusMe: arPlusme,
    privacysettings: arPrivacysettings,
    privacySettings: arPrivacysettings,
    profile: arProfile,
    radiodiscover: arRadiodiscover,
    radioDiscover: arRadiodiscover,
    radiohome: arRadiohome,
    radioHome: arRadiohome,
    radiome: arRadiome,
    radioMe: arRadiome,
    settings: arSettings,
    tournamentsdiscover: arTournamentsdiscover,
    tournamentsDiscover: arTournamentsdiscover,
    tournamentshome: arTournamentshome,
    tournamentsHome: arTournamentshome,
    tournamentslive: arTournamentslive,
    tournamentsLive: arTournamentslive,
    tournamentsme: arTournamentsme,
    tournamentsMe: arTournamentsme,
    useaudiorecorder: arUseaudiorecorder,
    useaudioupload: arUseaudioupload,
    usefollowstate: arUsefollowstate,
    useviewerprofile: arUseviewerprofile,
    world: arWorld,
  },
  en: {
    account: enAccount,
    audiocreate: enAudiocreate,
    auth: enAuth,
    categorydiscovery: enCategorydiscovery,
    categoryDiscovery: enCategorydiscovery,
    common: enCommon,
    connectivitybanner: enConnectivitybanner,
    connectivityBanner: enConnectivitybanner,
    create: enCreate,
    createhub: enCreatehub,
    createHub: enCreatehub,
    editprofile: enEditprofile,
    editProfile: enEditprofile,
    filterdropdown: enFilterdropdown,
    filterDropdown: enFilterdropdown,
    generaldiscover: enGeneraldiscover,
    generalDiscover: enGeneraldiscover,
    generalhome: enGeneralhome,
    generalHome: enGeneralhome,
    generalme: enGeneralme,
    generalMe: enGeneralme,
    globalcreatehub: enGlobalcreatehub,
    globalCreateHub: enGlobalcreatehub,
    home: enHome,
    index: enIndex,
    live: enLive,
    liveworldselector: enLiveworldselector,
    liveWorldSelector: enLiveworldselector,
    lockedlabels: enLockedlabels,
    lockedLabels: enLockedlabels,
    musicdiscover: enMusicdiscover,
    musicDiscover: enMusicdiscover,
    musichome: enMusichome,
    musicHome: enMusichome,
    musiclive: enMusiclive,
    musicLive: enMusiclive,
    musicme: enMusicme,
    musicMe: enMusicme,
    player: enPlayer,
    playlistdetail: enPlaylistdetail,
    playlistDetail: enPlaylistdetail,
    playlists: enPlaylists,
    plusdiscover: enPlusdiscover,
    plusDiscover: enPlusdiscover,
    plushome: enPlushome,
    plusHome: enPlushome,
    plusme: enPlusme,
    plusMe: enPlusme,
    privacysettings: enPrivacysettings,
    privacySettings: enPrivacysettings,
    profile: enProfile,
    radiodiscover: enRadiodiscover,
    radioDiscover: enRadiodiscover,
    radiohome: enRadiohome,
    radioHome: enRadiohome,
    radiome: enRadiome,
    radioMe: enRadiome,
    settings: enSettings,
    tournamentsdiscover: enTournamentsdiscover,
    tournamentsDiscover: enTournamentsdiscover,
    tournamentshome: enTournamentshome,
    tournamentsHome: enTournamentshome,
    tournamentslive: enTournamentslive,
    tournamentsLive: enTournamentslive,
    tournamentsme: enTournamentsme,
    tournamentsMe: enTournamentsme,
    useaudiorecorder: enUseaudiorecorder,
    useaudioupload: enUseaudioupload,
    usefollowstate: enUsefollowstate,
    useviewerprofile: enUseviewerprofile,
    world: enWorld,
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    defaultNS: 'common',
    ns: ["account","audiocreate","auth","categorydiscovery","common","connectivitybanner","create","createhub","editprofile","filterdropdown","generaldiscover","generalhome","generalme","globalcreatehub","home","index","live","liveworldselector","lockedlabels","musicdiscover","musichome","musiclive","musicme","player","playlistdetail","playlists","plusdiscover","plushome","plusme","privacysettings","profile","radiodiscover","radiohome","radiome","settings","tournamentsdiscover","tournamentshome","tournamentslive","tournamentsme","useaudiorecorder","useaudioupload","usefollowstate","useviewerprofile","world","categoryDiscovery","connectivityBanner","createHub","editProfile","filterDropdown","generalDiscover","generalHome","generalMe","globalCreateHub","liveWorldSelector","lockedLabels","musicDiscover","musicHome","musicLive","musicMe","playlistDetail","plusDiscover","plusHome","plusMe","privacySettings","radioDiscover","radioHome","radioMe","tournamentsDiscover","tournamentsHome","tournamentsLive","tournamentsMe"],
    interpolation: {
      escapeValue: false,
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

i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
});

const initialDir = RTL_LANGUAGES.includes(i18n.language) ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;
document.documentElement.dir = initialDir;

export default i18n;
