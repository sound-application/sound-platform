/**
 * Sound Platform — Music Home Page (موسيقى + الرئيسية)
 * Route: /music/home
 * Prefix: mhp- (Music Home Page)
 * Accent: emerald #10b981 / #6ee7b7 via [data-world="music"] CSS variable
 */

import React, { useState } from 'react';
import './MusicHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryItem   { uid: string; displayName: string; isSelf?: boolean; }
interface TrackItem   { id: string; title: string; artist: string; album?: string; duration?: string; playCount?: string; tag?: string; countryFlag?: string; }
interface AlbumItem   { id: string; title: string; artist: string; year?: string; trackCount?: string; tag?: string; countryFlag?: string; }
interface ArtistItem  { id: string; displayName: string; specialty?: string; followerLabel?: string; countryFlag?: string; }
interface PlaylistItem { id: string; title: string; tag: string; trackCount?: string; curator?: string; }
interface LabelItem   { id: string; name: string; artistCount?: string; country?: string; }

// ─── Static Data ──────────────────────────────────────────────────────────────

const STORY_ITEMS: StoryItem[] = [
  { uid: 'self', displayName: t('musichome:yourStory'), isSelf: true },
  { uid: 'ms1',  displayName: t('musichome:layla')  },
  { uid: 'ms2',  displayName: t('musichome:age')   },
  { uid: 'ms3',  displayName: t('musichome:selma')  },
  { uid: 'ms4',  displayName: t('musichome:conspiracy')  },
  { uid: 'ms5',  displayName: t('musichome:others')   },
];

const TRENDING_TRACKS: TrackItem[] = [
  { id: 'mt1', title: t('musichome:leisure'),      artist: t('musichome:muhammadAbdo'),      album: t('musichome:nightAlbum'),     duration: '3:42', playCount: '4.2M', countryFlag: '🇸🇦', tag: t('musichome:common') },
  { id: 'mt2', title: t('musichome:oTravelerAlone'),   artist: t('musichome:kazemAlSaher'),    album: t('musichome:lovePoems'),      duration: '4:11', playCount: '3.8M', countryFlag: '🇮🇶', tag: t('musichome:common') },
  { id: 'mt3', title: t('musichome:iHaveNostalgia'),   artist: t('musichome:fayrouz'),           album: t('musichome:fayrouzClassics'), duration: '3:55', playCount: '6.1M', countryFlag: '🇱🇧', tag: t('musichome:immortal') },
  { id: 'mt4', title: t('musichome:farFromYou'),         artist: t('musichome:amrDiab'),      album: t('musichome:theLightOfTheEye'),       duration: '4:28', playCount: '5.5M', countryFlag: '🇪🇬', tag: t('musichome:new') },
];

const NEW_RELEASES: AlbumItem[] = [
  { id: 'ma1', title: t('musichome:nightSounds'),      artist: t('musichome:muhammadAbdo'),   year: '2026', trackCount: t('musichome:12Songs'), countryFlag: '🇸🇦', tag: t('musichome:new')   },
  { id: 'ma2', title: t('musichome:soulJourney'),       artist: t('musichome:majidAlmuhandis'), year: '2026', trackCount: t('musichome:10Songs'), countryFlag: '🇰🇼', tag: t('musichome:new')   },
  { id: 'ma3', title: t('musichome:oldMemories'),     artist: t('musichome:nancyAjram'),   year: '2025', trackCount: t('musichome:8Songs'),  countryFlag: '🇱🇧', tag: t('musichome:distinct')   },
];

const TOP_ARTISTS: ArtistItem[] = [
  { id: 'ar1', displayName: t('musichome:muhammadAbdo'),    specialty: t('musichome:arabicMusic'),   followerLabel: t('musichome:42mFollowers'), countryFlag: '🇸🇦' },
  { id: 'ar2', displayName: t('musichome:kazemAlSaher'),  specialty: t('musichome:arabicPop'),        followerLabel: t('musichome:38mFollowers'), countryFlag: '🇮🇶' },
  { id: 'ar3', displayName: t('musichome:fayrouz'),         specialty: t('musichome:classics'),       followerLabel: t('musichome:65mFollowers'), countryFlag: '🇱🇧' },
  { id: 'ar4', displayName: t('musichome:amrDiab'),    specialty: t('musichome:egyptianPop'),         followerLabel: t('musichome:51mFollowers'), countryFlag: '🇪🇬' },
] as any;

const PLAYLISTS: PlaylistItem[] = [
  { id: 'mp1', title: t('musichome:bestMusicThisWeek'), tag: t('musichome:common'),      trackCount: t('musichome:20Songs'), curator: t('musichome:soundMusic') },
  { id: 'mp2', title: t('musichome:nightAtmosphere'),                 tag: t('musichome:mood'),      trackCount: t('musichome:15Songs'), curator: t('musichome:tasteEvaluator') },
  { id: 'mp3', title: t('musichome:unforgettableArabicClassics'),   tag: t('musichome:immortal'),      trackCount: t('musichome:30Songs'), curator: t('musichome:tarabArchive') },
  { id: 'mp4', title: t('musichome:modernRhythms'),               tag: t('musichome:rhythm'),     trackCount: t('musichome:18Songs'), curator: t('musichome:soundMusic') },
];

const LABELS: LabelItem[] = [
  { id: 'lb1', name: t('musichome:rotana'),          artistCount: t('musichome:120Artists'), country: '🇸🇦' },
  { id: 'lb2', name: t('musichome:music'),           artistCount: t('musichome:80Artists'),  country: '🇪🇬' },
  { id: 'lb3', name: t('musichome:abuDhabiMusic'), artistCount: t('musichome:45Artist'), country: '🇦🇪' },
];

const RECOMMENDED: TrackItem[] = [
  { id: 'mr1', title: t('musichome:shamsAlaseel'),     artist: t('musichome:abdulMajeedAbdullah'), duration: '3:33', playCount: '1.9M', countryFlag: '🇸🇦' },
  { id: 'mr2', title: t('musichome:myHeartIsWithYou'),       artist: t('musichome:elissa'),              duration: '4:05', playCount: '2.3M', countryFlag: '🇱🇧', tag: t('musichome:new') },
  { id: 'mr3', title: t('musichome:atYourDoor'),         artist: t('musichome:omarKhairat'),           duration: '5:12', playCount: '980K', countryFlag: '🇪🇬' },
];

// ─── Filter Options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'new',      label: t('musichome:new')      },
  { value: 'trending', label: t('musichome:common')      },
  { value: 'classic',  label: t('musichome:classic')  },
  { value: 'saved',    label: t('musichome:safe')     },
  { value: 'unplayed', label: t('musichome:notTurnedOn') },
];

const CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'pop',        label: t('musichome:arabicPop')   },
  { value: 'classic',    label: t('musichome:classics')  },
  { value: 'tarab',      label: t('musichome:rapture')         },
  { value: 'oud',        label: t('musichome:recurrence')          },
  { value: 'electronic', label: t('musichome:electronic')  },
  { value: 'jazz',       label: t('musichome:arabicJazz')   },
  { value: 'gospel',     label: t('musichome:praises')       },
];

const COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa', label: t('musichome:saudiArabia') },
  { value: 'ae', label: t('musichome:emirates') },
  { value: 'eg', label: t('musichome:egypt')      },
  { value: 'lb', label: t('musichome:lebanon')    },
  { value: 'kw', label: t('musichome:kuwait')   },
  { value: 'iq', label: t('musichome:iraq')   },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'latest',  label: t('musichome:latest')          },
  { value: 'popular', label: t('musichome:mostListenedTo') },
  { value: 'alpha',   label: t('musichome:alphabetically')          },
  { value: 'following', label: t('musichome:whoDoYouFollow')    },
  { value: 'suggested', label: t('musichome:suggestedForYou1')    },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" width="16" height="16" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconMusic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarFallback({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <div className="mhp-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name.trim().charAt(0)}
    </div>
  );
}

function CoverFallback({ height = 120, music = false }: { height?: number; music?: boolean }) {
  return (
    <div className={`mhp-cover-fallback${music ? ' mhp-cover-fallback--music' : ''}`}
         aria-hidden="true" style={{ height }}>
      {music && <span className="mhp-cover-fallback__icon"><IconMusic /></span>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MusicHomePage() {
  const [statuses,   setStatuses]   = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries,  setCountries]  = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<string[]>([]);

  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v: string) =>
      setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <main className="mhp" aria-label={t('musichome:homeMusic')}>

      {/* ── Stories ──────────────────────────────────────────────────────── */}
      <section aria-label={t('musichome:quickStories')}>
        <div className="mhp-story-row">
          {STORY_ITEMS.map(item => (
            <button key={item.uid} className="mhp-story-item"
                    aria-label={item.isSelf ? t('musichome:addAStory') : `قصة ${item.displayName}`}>
              {item.isSelf ? (
                <div className="mhp-story-ring mhp-story-ring--self">
                  <AvatarFallback name={item.displayName} size={52} />
                  <span className="mhp-story-ring__add" aria-hidden="true">+</span>
                </div>
              ) : (
                <div className="mhp-story-ring">
                  <div className="mhp-story-ring__inner">
                    <AvatarFallback name={item.displayName} size={52} />
                  </div>
                </div>
              )}
              <span className="mhp-story-item__name">{item.displayName}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Search + Smart Filters ────────────────────────────────────────── */}
      <section aria-label={t('musichome:searchAndFilter')}>
        <div className="mhp-search">
          <input id="mhp-search-input" className="mhp-search__input"
                 type="search" placeholder={t('musichome:searchForASongArtistAlbum')}
                 autoComplete="off" />
          <span className="mhp-search__icon"><IconSearch /></span>
        </div>

        <div className="mhp-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown label={t('musichome:theCondition')}   options={STATUS_OPTIONS}   values={statuses}
            onToggle={toggle(setStatuses)}   onClear={() => setStatuses([])}
            defaultLabel={t('musichome:everyone')} ariaLabel={t('musichome:filterByStatus')} />
          <FilterDropdown label={t('musichome:classification')}  options={CATEGORY_OPTIONS} values={categories}
            onToggle={toggle(setCategories)} onClear={() => setCategories([])}
            defaultLabel={t('musichome:everyone')} ariaLabel={t('musichome:filterByCategory')} />
          <FilterDropdown label={t('musichome:country')}    options={COUNTRY_OPTIONS}  values={countries}
            onToggle={toggle(setCountries)}  onClear={() => setCountries([])}
            defaultLabel={t('musichome:everyone')} ariaLabel={t('musichome:filterByCountry')} />
          <FilterDropdown label={t('musichome:ranking')} options={SORT_OPTIONS}     values={sortOrders}
            onToggle={toggle(setSortOrders)} onClear={() => setSortOrders([])}
            defaultLabel={t('musichome:latest')} ariaLabel={t('musichome:filterBySort')} />
        </div>

        <SelectedChips groups={[
          { filterId: 'status',    options: STATUS_OPTIONS,   values: statuses,   onRemove: toggle(setStatuses)   },
          { filterId: 'category',  options: CATEGORY_OPTIONS, values: categories, onRemove: toggle(setCategories) },
          { filterId: 'country',   options: COUNTRY_OPTIONS,  values: countries,  onRemove: toggle(setCountries)  },
          { filterId: 'sortOrder', options: SORT_OPTIONS,     values: sortOrders, onRemove: toggle(setSortOrders) },
        ]} />

        <button className="mhp-subpage-btn" type="button" aria-label={t('musichome:browseMusicGenres')}>
          <span>{t('musichome:browseItems')}</span>
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* ── Trending Tracks ───────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-trending-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-trending-heading" className="mhp-section__title">{t('musichome:popularNow')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllPopularSongs')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-track-list">
          {TRENDING_TRACKS.map((track, i) => (
            <article key={track.id} className="mhp-track-row" aria-label={`${track.title} — ${track.artist}`}>
              <span className="mhp-track-row__rank">{i + 1}</span>
              <div className="mhp-track-row__cover">
                <CoverFallback height={48} music />
              </div>
              <div className="mhp-track-row__info">
                <p className="mhp-track-row__title">
                  {track.title}
                  {track.tag && <span className="mhp-tag">{track.tag}</span>}
                </p>
                <p className="mhp-track-row__meta">
                  {track.countryFlag && <span aria-hidden="true">{track.countryFlag}</span>}
                  {track.artist}
                  {track.album && <span className="mhp-track-row__album"> · {track.album}</span>}
                </p>
              </div>
              <div className="mhp-track-row__right">
                {track.playCount && (
                  <span className="mhp-track-row__plays"><IconPlay />{track.playCount}</span>
                )}
                <span className="mhp-track-row__duration">{track.duration}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── New Releases (Albums) ─────────────────────────────────────────── */}
      <section aria-labelledby="mhp-releases-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-releases-heading" className="mhp-section__title">{t('musichome:newReleases')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllVersions')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-h-scroll">
          {NEW_RELEASES.map(album => (
            <article key={album.id} className="mhp-album-card" aria-label={`${album.title} — ${album.artist}`}>
              <div className="mhp-album-card__cover">
                <CoverFallback height={130} music />
                {album.tag && <span className="mhp-tag mhp-tag--overlay">{album.tag}</span>}
              </div>
              <p className="mhp-album-card__title">{album.title}</p>
              <p className="mhp-album-card__meta">
                {album.countryFlag && <span aria-hidden="true">{album.countryFlag}</span>}
                {album.artist}
              </p>
              {album.trackCount && <p className="mhp-album-card__count">{album.trackCount}</p>}
            </article>
          ))}
        </div>
      </section>

      {/* ── Top Artists ───────────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-artists-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-artists-heading" className="mhp-section__title">{t('musichome:mostProminentArtists')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllArtists')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-artist-grid">
          {TOP_ARTISTS.map((artist: any) => (
            <article key={artist.id} className="mhp-artist-card" aria-label={`ملف ${artist.displayName}`}>
              <div className="mhp-artist-card__left">
                <div className="mhp-artist-card__avatar-wrap">
                  <AvatarFallback name={artist.displayName} size={50} />
                </div>
                <div>
                  <p className="mhp-artist-card__name">
                    {artist.countryFlag && <span aria-hidden="true">{artist.countryFlag}</span>}
                    {artist.displayName}
                  </p>
                  {artist.specialty && <p className="mhp-artist-card__specialty">{artist.specialty}</p>}
                  {artist.followerLabel && <p className="mhp-artist-card__followers">{artist.followerLabel}</p>}
                </div>
              </div>
              <button className="mhp-artist-card__follow" aria-label={`متابعة ${artist.displayName}`}>
                {t('musichome:tracking')}</button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Ad Block ───────────────────────────────────────────── */}
      <section aria-label={t('musichome:advertisement')}>
        <div className="mhp-sponsor">
          <span className="mhp-sponsor__label">{t('musichome:advertisement')}</span>
          <div className="mhp-sponsor__logo" aria-hidden="true">🎵</div>
          <div className="mhp-sponsor__body">
            <p className="mhp-sponsor__name">{t('musichome:rotanaMusic')}</p>
            <p className="mhp-sponsor__tagline">{t('musichome:listenToTheLargestArabicMusicLibraryWith')}</p>
          </div>
          <button className="mhp-sponsor__cta" aria-label={t('musichome:discoverRotana')}>{t('musichome:findOutNow')}</button>
        </div>
      </section>

      {/* ── Playlists ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-playlists-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-playlists-heading" className="mhp-section__title">{t('musichome:playlists')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllListings')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-playlist-grid">
          {PLAYLISTS.map(pl => (
            <article key={pl.id} className="mhp-playlist-card" aria-label={pl.title}>
              <div className="mhp-playlist-card__cover">
                <CoverFallback height={140} music />
                <div className="mhp-playlist-card__overlay">
                  <span className="mhp-tag">{pl.tag}</span>
                  <p className="mhp-playlist-card__title">{pl.title}</p>
                  {pl.trackCount && <p className="mhp-playlist-card__count">{pl.trackCount}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Production Companies / Labels ─────────────────────────────────── */}
      <section aria-labelledby="mhp-labels-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-labels-heading" className="mhp-section__title">{t('musichome:productionCompanies')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllProductionCompanies')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-h-scroll">
          {LABELS.map(label => (
            <div key={label.id} className="mhp-label-card" role="article" aria-label={label.name}>
              <div className="mhp-label-card__logo" aria-hidden="true">🎼</div>
              <p className="mhp-label-card__name">{label.country} {label.name}</p>
              {label.artistCount && <p className="mhp-label-card__count">{label.artistCount}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Recommended ───────────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-recommended-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-recommended-heading" className="mhp-section__title">{t('musichome:suggestedForYou')}</h2>
          <button className="mhp-section__see-all" aria-label={t('musichome:viewAllSuggestions')}>{t('musichome:viewAll')}</button>
        </div>
        <div className="mhp-track-list">
          {RECOMMENDED.map((track, i) => (
            <article key={track.id} className="mhp-track-row" aria-label={`${track.title} — ${track.artist}`}>
              <span className="mhp-track-row__rank mhp-track-row__rank--dot" aria-hidden="true" />
              <div className="mhp-track-row__cover">
                <CoverFallback height={48} music />
              </div>
              <div className="mhp-track-row__info">
                <p className="mhp-track-row__title">
                  {track.title}
                  {track.tag && <span className="mhp-tag">{track.tag}</span>}
                </p>
                <p className="mhp-track-row__meta">
                  {track.countryFlag && <span aria-hidden="true">{track.countryFlag}</span>}
                  {track.artist}
                </p>
              </div>
              <div className="mhp-track-row__right">
                {track.playCount && (
                  <span className="mhp-track-row__plays"><IconPlay />{track.playCount}</span>
                )}
                <span className="mhp-track-row__duration">{track.duration}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

    </main>
  );
}
