/**
 * Sound Platform — Music Home Page (موسيقى + الرئيسية)
 * Route: /music/home
 * Prefix: mhp- (Music Home Page)
 * Accent: emerald #10b981 / #6ee7b7 via [data-world="music"] CSS variable
 */

import React, { useState } from 'react';
import './MusicHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoryItem   { uid: string; displayName: string; isSelf?: boolean; }
interface TrackItem   { id: string; title: string; artist: string; album?: string; duration?: string; playCount?: string; tag?: string; countryFlag?: string; }
interface AlbumItem   { id: string; title: string; artist: string; year?: string; trackCount?: string; tag?: string; countryFlag?: string; }
interface ArtistItem  { id: string; displayName: string; specialty?: string; followerLabel?: string; countryFlag?: string; }
interface PlaylistItem { id: string; title: string; tag: string; trackCount?: string; curator?: string; }
interface LabelItem   { id: string; name: string; artistCount?: string; country?: string; }

// ─── Static Data ──────────────────────────────────────────────────────────────

const STORY_ITEMS: StoryItem[] = [
  { uid: 'self', displayName: 'قصتك', isSelf: true },
  { uid: 'ms1',  displayName: 'ليلى'  },
  { uid: 'ms2',  displayName: 'عمر'   },
  { uid: 'ms3',  displayName: 'سلمى'  },
  { uid: 'ms4',  displayName: 'تامر'  },
  { uid: 'ms5',  displayName: 'نور'   },
];

const TRENDING_TRACKS: TrackItem[] = [
  { id: 'mt1', title: 'وقت الفراغ',      artist: 'محمد عبده',      album: 'ألبوم الليل',     duration: '3:42', playCount: '4.2M', countryFlag: '🇸🇦', tag: 'رائج' },
  { id: 'mt2', title: 'يا مسافر وحدك',   artist: 'كاظم الساهر',    album: 'قصائد الحب',      duration: '4:11', playCount: '3.8M', countryFlag: '🇮🇶', tag: 'رائج' },
  { id: 'mt3', title: 'أنا عندي حنين',   artist: 'فيروز',           album: 'كلاسيكيات فيروز', duration: '3:55', playCount: '6.1M', countryFlag: '🇱🇧', tag: 'خالد' },
  { id: 'mt4', title: 'بعيد عنك',         artist: 'عمرو دياب',      album: 'نور العين',       duration: '4:28', playCount: '5.5M', countryFlag: '🇪🇬', tag: 'جديد' },
];

const NEW_RELEASES: AlbumItem[] = [
  { id: 'ma1', title: 'أصوات الليل',      artist: 'محمد عبده',   year: '2026', trackCount: '12 أغنية', countryFlag: '🇸🇦', tag: 'جديد'   },
  { id: 'ma2', title: 'رحلة الروح',       artist: 'ماجد المهندس', year: '2026', trackCount: '10 أغاني', countryFlag: '🇰🇼', tag: 'جديد'   },
  { id: 'ma3', title: 'ذكريات قديمة',     artist: 'نانسي عجرم',   year: '2025', trackCount: '8 أغاني',  countryFlag: '🇱🇧', tag: 'مميز'   },
];

const TOP_ARTISTS: ArtistItem[] = [
  { id: 'ar1', displayName: 'محمد عبده',    specialty: 'موسيقى عربية',   followerLabel: '4.2M متابع', countryFlag: '🇸🇦' },
  { id: 'ar2', displayName: 'كاظم الساهر',  specialty: 'بوب عربي',        followerLabel: '3.8M متابع', countryFlag: '🇮🇶' },
  { id: 'ar3', displayName: 'فيروز',         specialty: 'كلاسيكيات',       followerLabel: '6.5M متابع', countryFlag: '🇱🇧' },
  { id: 'ar4', displayName: 'عمرو دياب',    specialty: 'بوب مصري',         followerLabel: '5.1M متابع', countryFlag: '🇪🇬' },
] as any;

const PLAYLISTS: PlaylistItem[] = [
  { id: 'mp1', title: 'أفضل الموسيقى هذا الأسبوع', tag: 'رائج',      trackCount: '20 أغنية', curator: 'Sound موسيقى' },
  { id: 'mp2', title: 'أجواء الليل',                 tag: 'مزاج',      trackCount: '15 أغنية', curator: 'مقيّم الذوق' },
  { id: 'mp3', title: 'كلاسيكيات عربية لا تُنسى',   tag: 'خالد',      trackCount: '30 أغنية', curator: 'أرشيف الطرب' },
  { id: 'mp4', title: 'إيقاعات حديثة',               tag: 'إيقاع',     trackCount: '18 أغنية', curator: 'Sound موسيقى' },
];

const LABELS: LabelItem[] = [
  { id: 'lb1', name: 'روتانا',          artistCount: '120+ فنان', country: '🇸🇦' },
  { id: 'lb2', name: 'مزيكا',           artistCount: '80+ فنان',  country: '🇪🇬' },
  { id: 'lb3', name: 'أبو ظبي للموسيقى', artistCount: '45+ فنان', country: '🇦🇪' },
];

const RECOMMENDED: TrackItem[] = [
  { id: 'mr1', title: 'شمس الأصيل',     artist: 'عبدالمجيد عبدالله', duration: '3:33', playCount: '1.9M', countryFlag: '🇸🇦' },
  { id: 'mr2', title: 'قلبي معاك',       artist: 'إليسا',              duration: '4:05', playCount: '2.3M', countryFlag: '🇱🇧', tag: 'جديد' },
  { id: 'mr3', title: 'على بابك',         artist: 'عمر خيرت',           duration: '5:12', playCount: '980K', countryFlag: '🇪🇬' },
];

// ─── Filter Options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'new',      label: 'جديد'      },
  { value: 'trending', label: 'رائج'      },
  { value: 'classic',  label: 'كلاسيكي'  },
  { value: 'saved',    label: 'محفوظ'     },
  { value: 'unplayed', label: 'لم يُشغَّل' },
];

const CATEGORY_OPTIONS: FilterOption[] = [
  { value: 'pop',        label: 'بوب عربي'   },
  { value: 'classic',    label: 'كلاسيكيات'  },
  { value: 'tarab',      label: 'طرب'         },
  { value: 'oud',        label: 'عود'          },
  { value: 'electronic', label: 'إلكترونية'  },
  { value: 'jazz',       label: 'جاز عربي'   },
  { value: 'gospel',     label: 'مدائح'       },
];

const COUNTRY_OPTIONS: FilterOption[] = [
  { value: 'sa', label: '🇸🇦 السعودية' },
  { value: 'ae', label: '🇦🇪 الإمارات' },
  { value: 'eg', label: '🇪🇬 مصر'      },
  { value: 'lb', label: '🇱🇧 لبنان'    },
  { value: 'kw', label: '🇰🇼 الكويت'   },
  { value: 'iq', label: '🇮🇶 العراق'   },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'latest',  label: 'الأحدث'          },
  { value: 'popular', label: 'الأكثر استماعاً' },
  { value: 'alpha',   label: 'أبجدياً'          },
  { value: 'following', label: 'من تتابعهم'    },
  { value: 'suggested', label: 'المقترح لك'    },
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
    <main className="mhp" aria-label="الرئيسية — موسيقى">

      {/* ── Stories ──────────────────────────────────────────────────────── */}
      <section aria-label="القصص السريعة">
        <div className="mhp-story-row">
          {STORY_ITEMS.map(item => (
            <button key={item.uid} className="mhp-story-item"
                    aria-label={item.isSelf ? 'إضافة قصة' : `قصة ${item.displayName}`}>
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
      <section aria-label="بحث وتصفية">
        <div className="mhp-search">
          <input id="mhp-search-input" className="mhp-search__input"
                 type="search" placeholder="ابحث عن أغنية، فنان، ألبوم..."
                 autoComplete="off" dir="rtl" />
          <span className="mhp-search__icon"><IconSearch /></span>
        </div>

        <div className="mhp-filters" style={{ marginTop: 'var(--space-3)' }}>
          <FilterDropdown label="الحالة"   options={STATUS_OPTIONS}   values={statuses}
            onToggle={toggle(setStatuses)}   onClear={() => setStatuses([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب الحالة" />
          <FilterDropdown label="التصنيف"  options={CATEGORY_OPTIONS} values={categories}
            onToggle={toggle(setCategories)} onClear={() => setCategories([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب التصنيف" />
          <FilterDropdown label="البلد"    options={COUNTRY_OPTIONS}  values={countries}
            onToggle={toggle(setCountries)}  onClear={() => setCountries([])}
            defaultLabel="الكل" ariaLabel="تصفية حسب البلد" />
          <FilterDropdown label="الترتيب" options={SORT_OPTIONS}     values={sortOrders}
            onToggle={toggle(setSortOrders)} onClear={() => setSortOrders([])}
            defaultLabel="الأحدث" ariaLabel="تصفية حسب الترتيب" />
        </div>

        <SelectedChips groups={[
          { filterId: 'status',    options: STATUS_OPTIONS,   values: statuses,   onRemove: toggle(setStatuses)   },
          { filterId: 'category',  options: CATEGORY_OPTIONS, values: categories, onRemove: toggle(setCategories) },
          { filterId: 'country',   options: COUNTRY_OPTIONS,  values: countries,  onRemove: toggle(setCountries)  },
          { filterId: 'sortOrder', options: SORT_OPTIONS,     values: sortOrders, onRemove: toggle(setSortOrders) },
        ]} />

        <button className="mhp-subpage-btn" type="button" aria-label="استعراض أصناف الموسيقى">
          <span>استعراض الأصناف</span>
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </section>

      {/* ── Trending Tracks ───────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-trending-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-trending-heading" className="mhp-section__title">الرائج الآن</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل الأغاني الرائجة">عرض الكل</button>
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
          <h2 id="mhp-releases-heading" className="mhp-section__title">إصدارات جديدة</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل الإصدارات">عرض الكل</button>
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
          <h2 id="mhp-artists-heading" className="mhp-section__title">أبرز الفنانين</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل الفنانين">عرض الكل</button>
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
                متابعة
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── Sponsor / Ad Block ───────────────────────────────────────────── */}
      <section aria-label="إعلان">
        <div className="mhp-sponsor">
          <span className="mhp-sponsor__label">إعلان</span>
          <div className="mhp-sponsor__logo" aria-hidden="true">🎵</div>
          <div className="mhp-sponsor__body">
            <p className="mhp-sponsor__name">روتانا ميوزيك</p>
            <p className="mhp-sponsor__tagline">استمع لأكبر مكتبة موسيقى عربية — بدون انقطاع</p>
          </div>
          <button className="mhp-sponsor__cta" aria-label="اكتشف روتانا">اكتشف الآن</button>
        </div>
      </section>

      {/* ── Playlists ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="mhp-playlists-heading">
        <div className="mhp-section__header">
          <h2 id="mhp-playlists-heading" className="mhp-section__title">قوائم التشغيل</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل القوائم">عرض الكل</button>
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
          <h2 id="mhp-labels-heading" className="mhp-section__title">شركات الإنتاج</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل شركات الإنتاج">عرض الكل</button>
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
          <h2 id="mhp-recommended-heading" className="mhp-section__title">مقترح لك</h2>
          <button className="mhp-section__see-all" aria-label="عرض كل المقترحات">عرض الكل</button>
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
