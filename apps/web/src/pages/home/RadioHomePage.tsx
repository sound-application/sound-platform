import React, { useState } from 'react';
import './RadioHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ── Types ─────────────────────────────────────────────────────────────────────
interface HeroStation { id:string; name:string; freq:string; country:string; flag:string; genre:string; program:string; host:string; listeners:string; city:string; }
interface ScheduleRow  { id:string; time:string; title:string; station:string; flag:string; host:string; genre:string; isNow?:boolean; }
interface FeaturedProg { id:string; title:string; station:string; flag:string; time:string; host:string; genre:string; isNow?:boolean; }
interface SavedStation  { id:string; name:string; freq:string; flag:string; genre:string; isLive?:boolean; }
interface RecStation    { id:string; name:string; freq:string; country:string; flag:string; genre:string; listeners:string; isLive?:boolean; }

// ── Data ──────────────────────────────────────────────────────────────────────
const HEROES: HeroStation[] = [
  { id:'h1', name:t('radiohome:voiceOfArabsRadio'),  freq:'557 AM', country:t('radiohome:egypt1'),       flag:'🇪🇬', genre:t('radiohome:newsAndMusic'),  program:t('radiohome:morningRadio'),   host:t('radiohome:ahmedSalem'),    listeners:'142K', city:t('radiohome:cairo')  },
  { id:'h2', name:t('radiohome:rotanaFm'),          freq:'96.7 FM', country:t('radiohome:saudiArabia1'), flag:'🇸🇦', genre:t('radiohome:arabicPop'),    program:t('radiohome:pauseWithRapture'),     host:t('radiohome:naderHussein'),    listeners:'84K',  city:t('radiohome:riyadh')   },
  { id:'h3', name:t('radiohome:dubaiRadio'),         freq:'92 FM',   country:t('radiohome:theUae'), flag:'🇦🇪', genre:t('radiohome:diverse'),        program:t('radiohome:dubaiNow'),          host:t('radiohome:sarahAlkhatib'),  listeners:'67K',  city:t('radiohome:dubai')      },
  { id:'h4', name:t('radiohome:kuwaitFm'),            freq:'92.5 FM', country:t('radiohome:kuwait1'),   flag:'🇰🇼', genre:t('radiohome:gulf'),        program:t('radiohome:goodMorningKuwait'),   host:t('radiohome:fahdAlrashed'),   listeners:'51K',  city:t('radiohome:kuwait1')   },
  { id:'h5', name:t('radiohome:radioRiyadh'),       freq:'95.8 FM', country:t('radiohome:saudiArabia1'), flag:'🇸🇦', genre:t('radiohome:news'),        program:t('radiohome:afternoonBulletin'),      host:t('radiohome:monaAlshammari'),   listeners:'39K',  city:t('radiohome:riyadh')   },
  { id:'h6', name:t('radiohome:starsFm'),            freq:'100.3 FM',country:t('radiohome:egypt1'),      flag:'🇪🇬', genre:t('radiohome:youths'),         program:t('radiohome:eveningStars'),       host:t('radiohome:karimHassan'),     listeners:'93K',  city:t('radiohome:cairo')  },
];

const SCHEDULE: ScheduleRow[] = [
  { id:'s1',  time:'09:00', title:t('radiohome:morningRadio'),   station:t('radiohome:voiceOfTheArabs'),    flag:'🇪🇬', host:t('radiohome:ahmedSalem'),    genre:t('radiohome:news'),   isNow:false },
  { id:'s2',  time:'10:00', title:t('radiohome:goodMorningKuwait'),  station:t('radiohome:kuwaitFm'),       flag:'🇰🇼', host:t('radiohome:fahdAlrashed'),   genre:t('radiohome:gulf'),   isNow:false },
  { id:'s3',  time:'11:00', title:t('radiohome:key9012'), station:t('radiohome:radioRiyadh'),  flag:'🇸🇦', host:t('radiohome:monaAlshammari'),   genre:t('radiohome:news'),   isNow:false },
  { id:'s4',  time:'12:00', title:t('radiohome:pauseWithRapture'),    station:t('radiohome:rotanaFm'),     flag:'🇸🇦', host:t('radiohome:naderHussein'),    genre:t('radiohome:rapture'),     isNow:true  },
  { id:'s5',  time:'13:00', title:t('radiohome:dubaiNow'),          station:t('radiohome:dubaiRadio'),    flag:'🇦🇪', host:t('radiohome:sarahAlkhatib'),  genre:t('radiohome:diverse'),   isNow:false },
  { id:'s6',  time:'15:00', title:t('radiohome:eveningStars'),       station:t('radiohome:starsFm'),       flag:'🇪🇬', host:t('radiohome:karimHassan'),     genre:t('radiohome:youths'),    isNow:false },
  { id:'s7',  time:'17:00', title:t('radiohome:bestSongs'),      station:t('radiohome:rotanaFm'),     flag:'🇸🇦', host:t('radiohome:mayIBeHealthy'),      genre:t('radiohome:bob'),     isNow:false },
  { id:'s8',  time:'21:00', title:t('radiohome:arabianNights'),        station:t('radiohome:voiceOfTheArabs'),    flag:'🇪🇬', host:t('radiohome:salwaKamel'),    genre:t('radiohome:rapture'),     isNow:false },
];

const FEATURED: FeaturedProg[] = [
  { id:'f1', title:t('radiohome:pauseWithRapture'),   station:t('radiohome:rotanaFm'),    flag:'🇸🇦', time:'12:00 — 15:00', host:t('radiohome:naderHussein'),   genre:t('radiohome:rapture'),   isNow:true  },
  { id:'f2', title:t('radiohome:morningRadio'),  station:t('radiohome:voiceOfTheArabs'),   flag:'🇪🇬', time:'09:00 — 11:00', host:t('radiohome:ahmedSalem'),   genre:t('radiohome:news'), isNow:false },
  { id:'f3', title:t('radiohome:eveningStars'),      station:t('radiohome:starsFm'),      flag:'🇪🇬', time:'15:00 — 18:00', host:t('radiohome:karimHassan'),    genre:t('radiohome:youths'),  isNow:false },
  { id:'f4', title:t('radiohome:goodMorningKuwait'), station:t('radiohome:kuwaitFm'),      flag:'🇰🇼', time:'08:00 — 10:00', host:t('radiohome:fahdAlrashed'),  genre:t('radiohome:gulf'), isNow:false },
];

const SAVED: SavedStation[] = [
  { id:'sv1', name:t('radiohome:voiceOfTheArabs'),     freq:'557 AM',  flag:'🇪🇬', genre:t('radiohome:newsAndMusic'), isLive:true  },
  { id:'sv2', name:t('radiohome:rotanaFm'),     freq:'96.7 FM', flag:'🇸🇦', genre:t('radiohome:arabicPop'),   isLive:true  },
  { id:'sv3', name:t('radiohome:dubaiRadio'),    freq:'92 FM',   flag:'🇦🇪', genre:t('radiohome:diverse'),       isLive:true  },
  { id:'sv4', name:t('radiohome:bbcArabic'),      freq:'DAB+',    flag:'🇬🇧', genre:t('radiohome:news'),       isLive:false },
];

const RECOMMENDED: RecStation[] = [
  { id:'r1', name:t('radiohome:radioRiyadh'),   freq:'95.8 FM', country:t('radiohome:saudiArabia1'), flag:'🇸🇦', genre:t('radiohome:news'),     listeners:'39K',  isLive:true  },
  { id:'r2', name:t('radiohome:starsFm'),         freq:'100.3 FM',country:t('radiohome:egypt1'),      flag:'🇪🇬', genre:t('radiohome:youths'),      listeners:'93K',  isLive:true  },
  { id:'r3', name:t('radiohome:kuwaitFm'),         freq:'92.5 FM', country:t('radiohome:kuwait1'),   flag:'🇰🇼', genre:t('radiohome:gulf'),     listeners:'51K',  isLive:true  },
  { id:'r4', name:t('radiohome:monteCarlo'),     freq:'DAB+',    country:t('radiohome:international1'),     flag:'🌐',   genre:t('radiohome:newsAndCulture'),listeners:'28K', isLive:false },
  { id:'r5', name:t('radiohome:youthRadio'),  freq:'97.1 FM', country:t('radiohome:saudiArabia1'), flag:'🇸🇦', genre:t('radiohome:youths'),      listeners:'55K',  isLive:true  },
];

// ── Filter Options ─────────────────────────────────────────────────────────────
const STATUS_OPTS:   FilterOption[] = [{ value:'on_air',label:t('radiohome:onTheAir')},{ value:'saved',label:t('radiohome:reserved')},{ value:'followed',label:t('radiohome:tracking1')},{ value:'upcoming',label:t('radiohome:almost')}];
const CATEGORY_OPTS: FilterOption[] = [{ value:'pop',label:t('radiohome:arabicPop')},{ value:'tarab',label:t('radiohome:rapture')},{ value:'news',label:t('radiohome:news')},{ value:'religion',label:t('radiohome:religious')},{ value:'sport',label:t('radiohome:sports')},{ value:'culture',label:t('radiohome:culture')},{ value:'mixed',label:t('radiohome:diverse')},{ value:'youth',label:t('radiohome:youths')},{ value:'gulf',label:t('radiohome:gulf')}];
const COUNTRY_OPTS:  FilterOption[] = [{ value:'sa',label:t('radiohome:saudiArabia')},{ value:'ae',label:t('radiohome:emirates')},{ value:'eg',label:t('radiohome:egypt')},{ value:'lb',label:t('radiohome:lebanon')},{ value:'kw',label:t('radiohome:kuwait')},{ value:'jo',label:t('radiohome:jordan')},{ value:'int',label:t('radiohome:international')}];
const SORT_OPTS:     FilterOption[] = [{ value:'latest',label:t('radiohome:latest')},{ value:'listeners',label:t('radiohome:mostListenedTo')},{ value:'alpha',label:t('radiohome:alphabetically')},{ value:'followed',label:t('radiohome:whoDoYouFollow')}];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>;
const IcoPlay   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5,3 19,12 5,21"/></svg>;
const IcoBm     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>;
const IcoMic    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/></svg>;
const IcoWave   = () => (
  <svg viewBox="0 0 40 20" fill="currentColor" width="40" height="20" aria-hidden="true" className="rhp-waveform">
    {[2,5,9,3,14,6,10,4,12,7,11,5,8,3,10,6,13,4,9,5].map((h,i)=>(
      <rect key={i} x={i*2} y={(20-h)/2} width="1.2" height={h} rx="0.6" opacity={0.6+i%3*0.1}/>
    ))}
  </svg>
);

// ── Sub-components ─────────────────────────────────────────────────────────────
function AvatarCircle({ name, size=52 }: { name:string; size?:number }) {
  return <div className="rhp-avatar" style={{ width:size, height:size, fontSize:size*0.38 }}>{name.trim().charAt(0)}</div>;
}
function LiveBadge() {
  return <span className="rhp-live-badge" aria-label={t('radiohome:onAirNow')}><span className="rhp-live-dot"/>{t('radiohome:air')}</span>;
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const card = HEROES[active] ?? HEROES[0]!;
  return (
    <section className="rhp-hero" aria-label={t('radiohome:key8419')}>
      <div className="rhp-hero__card">
        <div className="rhp-hero__card-bg"/>
        <div className="rhp-hero__card-body">
          <div className="rhp-hero__top">
            <div className="rhp-hero__avatar">
              <span className="rhp-hero__flag" aria-hidden="true">{card.flag}</span>
              <span className="rhp-hero__avatar-letter">{card.name.charAt(0)}</span>
            </div>
            <div className="rhp-hero__meta">
              <LiveBadge/>
              <p className="rhp-hero__station">{card.name}</p>
              <p className="rhp-hero__freq">{card.freq} · {card.city}</p>
            </div>
          </div>
          <IcoWave/>
          <div className="rhp-hero__program">
            <p className="rhp-hero__prog-title">{card.program}</p>
            <p className="rhp-hero__prog-meta">🎙 {card.host} · <span className="rhp-tag">{card.genre}</span></p>
            <p className="rhp-hero__listeners">🎧 {card.listeners} {t('radiohome:theListener')}</p>
          </div>
          <div className="rhp-hero__actions">
            <button className="rhp-hero__play-btn" aria-label={`استمع لـ ${card.name}`}><IcoPlay/> {t('radiohome:listenNow')}</button>
            <button className="rhp-hero__save-btn" aria-label={t('radiohome:saveStation')}><IcoBm/> {t('radiohome:keep')}</button>
          </div>
        </div>
      </div>
      <div className="rhp-hero__dots" role="tablist" aria-label={t('radiohome:selectAStation')}>
        {HEROES.map((h,i) => (
          <button key={h.id} className={`rhp-hero__dot${i===active?' rhp-hero__dot--active':''}`}
            role="tab" aria-selected={i===active} aria-label={h.name}
            onClick={() => setActive(i)}/>
        ))}
      </div>
      <div className="rhp-hero__thumbs">
        {HEROES.map((h,i) => (
          <button key={h.id} className={`rhp-hero__thumb${i===active?' rhp-hero__thumb--active':''}`}
            aria-label={h.name} onClick={() => setActive(i)}>
            <span className="rhp-hero__thumb-flag">{h.flag}</span>
            <span className="rhp-hero__thumb-name">{h.name}</span>
            {h.listeners && <span className="rhp-hero__thumb-count">🎧{h.listeners}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function RadioHomePage() {
  const [statuses,   setStatuses]   = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries,  setCountries]  = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<string[]>([]);
  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v:string) => setter(prev => prev.includes(v) ? prev.filter(x=>x!==v) : [...prev,v]);
  }

  return (
    <main className="rhp" aria-label={t('radiohome:homeRadio')}>

      {/* Stories */}
      <section aria-label={t('radiohome:quickStories')}>
        <div className="rhp-story-row">
          {[t('radiohome:yourStory'),t('radiohome:ninety'),t('radiohome:sami'),t('radiohome:rana'),t('radiohome:immortal'),t('radiohome:wise'),t('radiohome:layla')].map((n,i) => (
            <button key={i} className="rhp-story-item" aria-label={i===0?t('radiohome:addAStory'):`قصة ${n}`}>
              <div className={`rhp-story-ring${i===0?' rhp-story-ring--self':''}`}>
                <div className="rhp-story-ring__inner"><AvatarCircle name={n} size={52}/></div>
                {i===0 && <span className="rhp-story-ring__add" aria-hidden="true">+</span>}
              </div>
              <span className="rhp-story-item__name">{n}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Search + Filters */}
      <section aria-label={t('radiohome:searchAndFilter')}>
        <div className="rhp-search">
          <input id="rhp-search-input" className="rhp-search__input" type="search"
            placeholder={t('radiohome:key4519')} autoComplete="off"/>
          <span className="rhp-search__icon"><IcoSearch/></span>
        </div>
        <div className="rhp-filters" style={{ marginTop:'var(--space-3)' }}>
          <FilterDropdown label={t('radiohome:theCondition')}   options={STATUS_OPTS}   values={statuses}   onToggle={toggle(setStatuses)}   onClear={()=>setStatuses([])}   defaultLabel={t('radiohome:everyone')}    ariaLabel={t('radiohome:filterByStatus')}/>
          <FilterDropdown label={t('radiohome:classification')}  options={CATEGORY_OPTS} values={categories} onToggle={toggle(setCategories)} onClear={()=>setCategories([])} defaultLabel={t('radiohome:everyone')}    ariaLabel={t('radiohome:filterByCategory')}/>
          <FilterDropdown label={t('radiohome:country')}    options={COUNTRY_OPTS}  values={countries}  onToggle={toggle(setCountries)}  onClear={()=>setCountries([])}  defaultLabel={t('radiohome:everyone')}    ariaLabel={t('radiohome:filterByCountry')}/>
          <FilterDropdown label={t('radiohome:ranking')} options={SORT_OPTS}     values={sortOrders} onToggle={toggle(setSortOrders)} onClear={()=>setSortOrders([])} defaultLabel={t('radiohome:latest')} ariaLabel={t('radiohome:filterBySort')}/>
        </div>
        <SelectedChips groups={[
          { filterId:'status',   options:STATUS_OPTS,   values:statuses,   onRemove:toggle(setStatuses)   },
          { filterId:'category', options:CATEGORY_OPTS, values:categories, onRemove:toggle(setCategories) },
          { filterId:'country',  options:COUNTRY_OPTS,  values:countries,  onRemove:toggle(setCountries)  },
          { filterId:'sort',     options:SORT_OPTS,     values:sortOrders, onRemove:toggle(setSortOrders) },
        ]}/>
        <button className="rhp-subpage-btn" type="button" aria-label={t('radiohome:browseRadioBrands')}>
          {t('radiohome:browseItems')}<svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* Hero Carousel */}
      <HeroCarousel/>

      {/* جدول اليوم — multi-station */}
      <section aria-labelledby="rhp-sched-h">
        <div className="rhp-section__header">
          <h2 id="rhp-sched-h" className="rhp-section__title">{t('radiohome:todaysSchedule')}</h2>
          <button className="rhp-section__see-all" aria-label={t('radiohome:viewTheFullTable')}>{t('radiohome:completeTable')}</button>
        </div>
        <div className="rhp-schedule-list">
          {SCHEDULE.map(row => (
            <div key={row.id} className={`rhp-schedule-row${row.isNow?' rhp-schedule-row--now':''}`}
                 aria-label={`${row.time} ${row.title} — ${row.station}`}>
              <span className="rhp-schedule-row__time">{row.time}</span>
              <span className="rhp-schedule-row__station-flag" aria-hidden="true">{row.flag}</span>
              <div className="rhp-schedule-row__body">
                <p className="rhp-schedule-row__title">
                  {row.title}
                  {row.isNow && <span className="rhp-now-tag">{t('radiohome:now')}</span>}
                </p>
                <p className="rhp-schedule-row__station-name">{row.station} · <span className="rhp-schedule-row__host">{row.host}</span></p>
              </div>
              <span className="rhp-tag rhp-tag--sm">{row.genre}</span>
              {row.isNow && <button className="rhp-schedule-row__tune" aria-label={`استمع الآن لـ ${row.title}`}>{t('radiohome:iListen')}</button>}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Programs */}
      <section aria-labelledby="rhp-feat-h">
        <div className="rhp-section__header">
          <h2 id="rhp-feat-h" className="rhp-section__title">{t('radiohome:distinctivePrograms')}</h2>
          <button className="rhp-section__see-all" aria-label={t('radiohome:viewAllPrograms')}>{t('radiohome:viewAll')}</button>
        </div>
        <div className="rhp-program-grid">
          {FEATURED.map(p => (
            <article key={p.id} className="rhp-program-card" aria-label={`${p.title} — ${p.station}`}>
              <div className="rhp-program-card__top">
                <div className="rhp-program-card__icon"><IcoMic/></div>
                {p.isNow && <LiveBadge/>}
              </div>
              <p className="rhp-program-card__title">{p.title}</p>
              <p className="rhp-program-card__station">{p.flag} {p.station}</p>
              <p className="rhp-program-card__time">⏰ {p.time}</p>
              <p className="rhp-program-card__host">🎙 {p.host}</p>
              <span className="rhp-tag">{p.genre}</span>
            </article>
          ))}
        </div>
      </section>

      {/* Saved Stations */}
      <section aria-labelledby="rhp-saved-h">
        <div className="rhp-section__header">
          <h2 id="rhp-saved-h" className="rhp-section__title">{t('radiohome:yourSavedStations')}</h2>
          <button className="rhp-section__see-all" aria-label={t('radiohome:showAllHistory')}>{t('radiohome:viewAll')}</button>
        </div>
        <div className="rhp-saved-list">
          {SAVED.map(s => (
            <article key={s.id} className="rhp-saved-row" aria-label={s.name}>
              <div className="rhp-saved-row__avatar"><span className="rhp-saved-row__flag">{s.flag}</span></div>
              <div className="rhp-saved-row__info">
                <p className="rhp-saved-row__name">{s.name} {s.isLive && <LiveBadge/>}</p>
                <p className="rhp-saved-row__meta">{s.freq} · {s.genre}</p>
              </div>
              <button className="rhp-saved-row__play" aria-label={`تشغيل ${s.name}`}><IcoPlay/></button>
            </article>
          ))}
        </div>
      </section>

      {/* Sponsor — neutral */}
      <section aria-label={t('radiohome:advertisement')}>
        <div className="rhp-sponsor">
          <span className="rhp-sponsor__label">{t('radiohome:advertisement')}</span>
          <div className="rhp-sponsor__logo" aria-hidden="true">📻</div>
          <div className="rhp-sponsor__body">
            <p className="rhp-sponsor__name">{t('radiohome:theWorldOfArabRadio')}</p>
            <p className="rhp-sponsor__tagline">{t('radiohome:key8902')}</p>
          </div>
          <button className="rhp-sponsor__cta" aria-label={t('radiohome:discoverStations')}>{t('radiohome:findOutNow')}</button>
        </div>
      </section>

      {/* Recommended */}
      <section aria-labelledby="rhp-rec-h">
        <div className="rhp-section__header">
          <h2 id="rhp-rec-h" className="rhp-section__title">{t('radiohome:stationsSuggestedForYou')}</h2>
          <button className="rhp-section__see-all" aria-label={t('radiohome:showMore')}>{t('radiohome:viewAll')}</button>
        </div>
        <div className="rhp-station-list">
          {RECOMMENDED.map(s => (
            <article key={s.id} className="rhp-station-row" aria-label={`${s.name} — ${s.country}`}>
              <div className="rhp-station-row__avatar"><span className="rhp-station-row__flag">{s.flag}</span></div>
              <div className="rhp-station-row__info">
                <p className="rhp-station-row__name">{s.name} {s.isLive && <LiveBadge/>}</p>
                <p className="rhp-station-row__meta">{s.freq} · {s.country} · 🎧 {s.listeners}</p>
              </div>
              <span className="rhp-tag">{s.genre}</span>
              <button className="rhp-station-row__follow" aria-label={`متابعة ${s.name}`}>{t('radiohome:tracking')}</button>
            </article>
          ))}
        </div>
      </section>

      {/* Create CTA */}
      <section aria-label={t('radiohome:createARadioStation')}>
        <div className="rhp-cta">
          <div className="rhp-cta__icon" aria-hidden="true">📡</div>
          <div className="rhp-cta__body">
            <p className="rhp-cta__title">{t('radiohome:createYourOwnStation')}</p>
            <p className="rhp-cta__desc">{t('radiohome:startBroadcastingLiveRadioToYourAudience')}</p>
          </div>
          <button className="rhp-cta__btn" aria-label={t('radiohome:createANewRadioStation')}>{t('radiohome:startNow')}</button>
        </div>
      </section>

    </main>
  );
}
