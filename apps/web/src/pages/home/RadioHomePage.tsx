import React, { useState } from 'react';
import './RadioHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';

// ── Types ─────────────────────────────────────────────────────────────────────
interface HeroStation { id:string; name:string; freq:string; country:string; flag:string; genre:string; program:string; host:string; listeners:string; city:string; }
interface ScheduleRow  { id:string; time:string; title:string; station:string; flag:string; host:string; genre:string; isNow?:boolean; }
interface FeaturedProg { id:string; title:string; station:string; flag:string; time:string; host:string; genre:string; isNow?:boolean; }
interface SavedStation  { id:string; name:string; freq:string; flag:string; genre:string; isLive?:boolean; }
interface RecStation    { id:string; name:string; freq:string; country:string; flag:string; genre:string; listeners:string; isLive?:boolean; }

// ── Data ──────────────────────────────────────────────────────────────────────
const HEROES: HeroStation[] = [
  { id:'h1', name:'إذاعة صوت العرب',  freq:'557 AM', country:'مصر',       flag:'🇪🇬', genre:'أخبار وطرب',  program:'الصباح الإذاعي',   host:'أحمد سالم',    listeners:'142K', city:'القاهرة'  },
  { id:'h2', name:'روتانا FM',          freq:'96.7 FM', country:'السعودية', flag:'🇸🇦', genre:'بوب عربي',    program:'وقفة مع الطرب',     host:'نادر حسين',    listeners:'84K',  city:'الرياض'   },
  { id:'h3', name:'إذاعة دبي',         freq:'92 FM',   country:'الإمارات', flag:'🇦🇪', genre:'متنوع',        program:'دبي الآن',          host:'سارة الخطيب',  listeners:'67K',  city:'دبي'      },
  { id:'h4', name:'كويت FM',            freq:'92.5 FM', country:'الكويت',   flag:'🇰🇼', genre:'خليجي',        program:'صباح الخير كويت',   host:'فهد الراشد',   listeners:'51K',  city:'الكويت'   },
  { id:'h5', name:'راديو الرياض',       freq:'95.8 FM', country:'السعودية', flag:'🇸🇦', genre:'أخبار',        program:'نشرة الظهيرة',      host:'منى الشمري',   listeners:'39K',  city:'الرياض'   },
  { id:'h6', name:'نجوم FM',            freq:'100.3 FM',country:'مصر',      flag:'🇪🇬', genre:'شباب',         program:'مساء النجوم',       host:'كريم حسن',     listeners:'93K',  city:'القاهرة'  },
];

const SCHEDULE: ScheduleRow[] = [
  { id:'s1',  time:'09:00', title:'الصباح الإذاعي',   station:'صوت العرب',    flag:'🇪🇬', host:'أحمد سالم',    genre:'أخبار',   isNow:false },
  { id:'s2',  time:'10:00', title:'صباح الخير كويت',  station:'كويت FM',       flag:'🇰🇼', host:'فهد الراشد',   genre:'خليجي',   isNow:false },
  { id:'s3',  time:'11:00', title:'نشرة الحادية عشر', station:'راديو الرياض',  flag:'🇸🇦', host:'منى الشمري',   genre:'أخبار',   isNow:false },
  { id:'s4',  time:'12:00', title:'وقفة مع الطرب',    station:'روتانا FM',     flag:'🇸🇦', host:'نادر حسين',    genre:'طرب',     isNow:true  },
  { id:'s5',  time:'13:00', title:'دبي الآن',          station:'إذاعة دبي',    flag:'🇦🇪', host:'سارة الخطيب',  genre:'متنوع',   isNow:false },
  { id:'s6',  time:'15:00', title:'مساء النجوم',       station:'نجوم FM',       flag:'🇪🇬', host:'كريم حسن',     genre:'شباب',    isNow:false },
  { id:'s7',  time:'17:00', title:'أفضل الأغاني',      station:'روتانا FM',     flag:'🇸🇦', host:'مي سالم',      genre:'بوب',     isNow:false },
  { id:'s8',  time:'21:00', title:'ليالي العرب',        station:'صوت العرب',    flag:'🇪🇬', host:'سلوى كامل',    genre:'طرب',     isNow:false },
];

const FEATURED: FeaturedProg[] = [
  { id:'f1', title:'وقفة مع الطرب',   station:'روتانا FM',    flag:'🇸🇦', time:'12:00 — 15:00', host:'نادر حسين',   genre:'طرب',   isNow:true  },
  { id:'f2', title:'الصباح الإذاعي',  station:'صوت العرب',   flag:'🇪🇬', time:'09:00 — 11:00', host:'أحمد سالم',   genre:'أخبار', isNow:false },
  { id:'f3', title:'مساء النجوم',      station:'نجوم FM',      flag:'🇪🇬', time:'15:00 — 18:00', host:'كريم حسن',    genre:'شباب',  isNow:false },
  { id:'f4', title:'صباح الخير كويت', station:'كويت FM',      flag:'🇰🇼', time:'08:00 — 10:00', host:'فهد الراشد',  genre:'خليجي', isNow:false },
];

const SAVED: SavedStation[] = [
  { id:'sv1', name:'صوت العرب',     freq:'557 AM',  flag:'🇪🇬', genre:'أخبار وطرب', isLive:true  },
  { id:'sv2', name:'روتانا FM',     freq:'96.7 FM', flag:'🇸🇦', genre:'بوب عربي',   isLive:true  },
  { id:'sv3', name:'إذاعة دبي',    freq:'92 FM',   flag:'🇦🇪', genre:'متنوع',       isLive:true  },
  { id:'sv4', name:'BBC عربي',      freq:'DAB+',    flag:'🇬🇧', genre:'أخبار',       isLive:false },
];

const RECOMMENDED: RecStation[] = [
  { id:'r1', name:'راديو الرياض',   freq:'95.8 FM', country:'السعودية', flag:'🇸🇦', genre:'أخبار',     listeners:'39K',  isLive:true  },
  { id:'r2', name:'نجوم FM',         freq:'100.3 FM',country:'مصر',      flag:'🇪🇬', genre:'شباب',      listeners:'93K',  isLive:true  },
  { id:'r3', name:'كويت FM',         freq:'92.5 FM', country:'الكويت',   flag:'🇰🇼', genre:'خليجي',     listeners:'51K',  isLive:true  },
  { id:'r4', name:'مونت كارلو',     freq:'DAB+',    country:'دولي',     flag:'🌐',   genre:'أخبار وثقافة',listeners:'28K', isLive:false },
  { id:'r5', name:'إذاعة الشباب',  freq:'97.1 FM', country:'السعودية', flag:'🇸🇦', genre:'شباب',      listeners:'55K',  isLive:true  },
];

// ── Filter Options ─────────────────────────────────────────────────────────────
const STATUS_OPTS:   FilterOption[] = [{ value:'on_air',label:'على الهواء'},{ value:'saved',label:'محفوظة'},{ value:'followed',label:'متابَعة'},{ value:'upcoming',label:'قريباً'}];
const CATEGORY_OPTS: FilterOption[] = [{ value:'pop',label:'بوب عربي'},{ value:'tarab',label:'طرب'},{ value:'news',label:'أخبار'},{ value:'religion',label:'ديني'},{ value:'sport',label:'رياضة'},{ value:'culture',label:'ثقافة'},{ value:'mixed',label:'متنوع'},{ value:'youth',label:'شباب'},{ value:'gulf',label:'خليجي'}];
const COUNTRY_OPTS:  FilterOption[] = [{ value:'sa',label:'🇸🇦 السعودية'},{ value:'ae',label:'🇦🇪 الإمارات'},{ value:'eg',label:'🇪🇬 مصر'},{ value:'lb',label:'🇱🇧 لبنان'},{ value:'kw',label:'🇰🇼 الكويت'},{ value:'jo',label:'🇯🇴 الأردن'},{ value:'int',label:'🌐 دولي'}];
const SORT_OPTS:     FilterOption[] = [{ value:'latest',label:'الأحدث'},{ value:'listeners',label:'الأكثر استماعاً'},{ value:'alpha',label:'أبجدياً'},{ value:'followed',label:'من تتابعهم'}];

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
  return <span className="rhp-live-badge" aria-label="على الهواء الآن"><span className="rhp-live-dot"/>الهواء</span>;
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const card = HEROES[active] ?? HEROES[0]!;
  return (
    <section className="rhp-hero" aria-label="محطات على الهواء الآن">
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
            <p className="rhp-hero__listeners">🎧 {card.listeners} مستمع</p>
          </div>
          <div className="rhp-hero__actions">
            <button className="rhp-hero__play-btn" aria-label={`استمع لـ ${card.name}`}><IcoPlay/> استمع الآن</button>
            <button className="rhp-hero__save-btn" aria-label="حفظ المحطة"><IcoBm/> حفظ</button>
          </div>
        </div>
      </div>
      <div className="rhp-hero__dots" role="tablist" aria-label="اختر محطة">
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
    <main className="rhp" dir="rtl" aria-label="الرئيسية — راديو">

      {/* Stories */}
      <section aria-label="القصص السريعة">
        <div className="rhp-story-row">
          {['قصتك','نوى','سامي','رنا','خالد','دانا','ليلى'].map((n,i) => (
            <button key={i} className="rhp-story-item" aria-label={i===0?'إضافة قصة':`قصة ${n}`}>
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
      <section aria-label="بحث وتصفية">
        <div className="rhp-search">
          <input id="rhp-search-input" className="rhp-search__input" type="search"
            placeholder="ابحث عن محطة، برنامج، مدينة، تصنيف..." autoComplete="off" dir="rtl"/>
          <span className="rhp-search__icon"><IcoSearch/></span>
        </div>
        <div className="rhp-filters" style={{ marginTop:'var(--space-3)' }}>
          <FilterDropdown label="الحالة"   options={STATUS_OPTS}   values={statuses}   onToggle={toggle(setStatuses)}   onClear={()=>setStatuses([])}   defaultLabel="الكل"    ariaLabel="تصفية حسب الحالة"/>
          <FilterDropdown label="التصنيف"  options={CATEGORY_OPTS} values={categories} onToggle={toggle(setCategories)} onClear={()=>setCategories([])} defaultLabel="الكل"    ariaLabel="تصفية حسب التصنيف"/>
          <FilterDropdown label="البلد"    options={COUNTRY_OPTS}  values={countries}  onToggle={toggle(setCountries)}  onClear={()=>setCountries([])}  defaultLabel="الكل"    ariaLabel="تصفية حسب البلد"/>
          <FilterDropdown label="الترتيب" options={SORT_OPTS}     values={sortOrders} onToggle={toggle(setSortOrders)} onClear={()=>setSortOrders([])} defaultLabel="الأحدث" ariaLabel="تصفية حسب الترتيب"/>
        </div>
        <SelectedChips groups={[
          { filterId:'status',   options:STATUS_OPTS,   values:statuses,   onRemove:toggle(setStatuses)   },
          { filterId:'category', options:CATEGORY_OPTS, values:categories, onRemove:toggle(setCategories) },
          { filterId:'country',  options:COUNTRY_OPTS,  values:countries,  onRemove:toggle(setCountries)  },
          { filterId:'sort',     options:SORT_OPTS,     values:sortOrders, onRemove:toggle(setSortOrders) },
        ]}/>
        <button className="rhp-subpage-btn" type="button" aria-label="استعراض أصناف الراديو">
          استعراض الأصناف
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* Hero Carousel */}
      <HeroCarousel/>

      {/* جدول اليوم — multi-station */}
      <section aria-labelledby="rhp-sched-h">
        <div className="rhp-section__header">
          <h2 id="rhp-sched-h" className="rhp-section__title">جدول اليوم</h2>
          <button className="rhp-section__see-all" aria-label="عرض الجدول الكامل">الجدول الكامل</button>
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
                  {row.isNow && <span className="rhp-now-tag">الآن</span>}
                </p>
                <p className="rhp-schedule-row__station-name">{row.station} · <span className="rhp-schedule-row__host">{row.host}</span></p>
              </div>
              <span className="rhp-tag rhp-tag--sm">{row.genre}</span>
              {row.isNow && <button className="rhp-schedule-row__tune" aria-label={`استمع الآن لـ ${row.title}`}>استمع</button>}
            </div>
          ))}
        </div>
      </section>

      {/* Featured Programs */}
      <section aria-labelledby="rhp-feat-h">
        <div className="rhp-section__header">
          <h2 id="rhp-feat-h" className="rhp-section__title">برامج مميزة</h2>
          <button className="rhp-section__see-all" aria-label="عرض كل البرامج">عرض الكل</button>
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
          <h2 id="rhp-saved-h" className="rhp-section__title">محطاتك المحفوظة</h2>
          <button className="rhp-section__see-all" aria-label="عرض كل المحفوظات">عرض الكل</button>
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
      <section aria-label="إعلان">
        <div className="rhp-sponsor">
          <span className="rhp-sponsor__label">إعلان</span>
          <div className="rhp-sponsor__logo" aria-hidden="true">📻</div>
          <div className="rhp-sponsor__body">
            <p className="rhp-sponsor__name">عالم الراديو العربي</p>
            <p className="rhp-sponsor__tagline">اكتشف آلاف المحطات من كل الدول العربية — بلا انقطاع</p>
          </div>
          <button className="rhp-sponsor__cta" aria-label="اكتشف المحطات">اكتشف الآن</button>
        </div>
      </section>

      {/* Recommended */}
      <section aria-labelledby="rhp-rec-h">
        <div className="rhp-section__header">
          <h2 id="rhp-rec-h" className="rhp-section__title">محطات مقترحة لك</h2>
          <button className="rhp-section__see-all" aria-label="عرض المزيد">عرض الكل</button>
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
              <button className="rhp-station-row__follow" aria-label={`متابعة ${s.name}`}>متابعة</button>
            </article>
          ))}
        </div>
      </section>

      {/* Create CTA */}
      <section aria-label="إنشاء محطة راديو">
        <div className="rhp-cta">
          <div className="rhp-cta__icon" aria-hidden="true">📡</div>
          <div className="rhp-cta__body">
            <p className="rhp-cta__title">أنشئ محطتك الخاصة</p>
            <p className="rhp-cta__desc">ابدأ بث راديو مباشر لجمهورك الآن</p>
          </div>
          <button className="rhp-cta__btn" aria-label="إنشاء محطة راديو جديدة">ابدأ الآن</button>
        </div>
      </section>

    </main>
  );
}
