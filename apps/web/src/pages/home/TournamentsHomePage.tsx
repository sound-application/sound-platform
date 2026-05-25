import React, { useState } from 'react';
import './TournamentsHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';

// ── Types ─────────────────────────────────────────────────────────────────────
type CompStatus = 'open' | 'vote' | 'judge' | 'results' | 'ended';
interface HeroComp   { id:string; title:string; icon:string; organizer:string; country:string; flag:string; category:string; status:CompStatus; participants:string; prize:string; deadline:string; desc:string; }
interface ActiveComp { id:string; title:string; icon:string; organizer:string; flag:string; category:string; status:CompStatus; participants:string; prize:string; deadline:string; highlight?:boolean; }
interface VoteEntry  { id:string; rank:number; name:string; avatar:string; comp:string; votes:number; maxVotes:number; }
interface LbEntry    { id:string; pos:number; name:string; avatar:string; comp:string; score:string; prize:string; medal:string; }

// ── Data ──────────────────────────────────────────────────────────────────────
const HEROES: HeroComp[] = [
  { id:'h1', title:'جائزة الصوت العربي للإبداع', icon:'🏆', organizer:'Sound Platform', country:'السعودية', flag:'🇸🇦', category:'غناء', status:'vote', participants:'4,820', prize:'250,000 ريال', deadline:'3 أيام', desc:'أكبر مسابقة غناء عربية على الإنترنت — صوّت على أفضل المشتركين واختر المتأهلين للنهائي.' },
  { id:'h2', title:'مسابقة الشعر الخليجي', icon:'📜', organizer:'اتحاد الشعراء', country:'الكويت', flag:'🇰🇼', category:'شعر', status:'open', participants:'1,340', prize:'50,000 ريال', deadline:'12 يوم', desc:'سجّل وشارك بقصيدتك في أبرز مسابقة شعر خليجي لعام 2025.' },
  { id:'h3', title:'أفضل بودكاست ناشئ', icon:'🎙️', organizer:'Sound Studio', country:'مصر', flag:'🇪🇬', category:'بودكاست', status:'judge', participants:'980', prize:'20,000 جنيه', deadline:'التحكيم', desc:'هيئة تحكيم متخصصة تراجع الأعمال المقدمة — النتائج تُعلن قريباً.' },
  { id:'h4', title:'مسابقة الموسيقى التصويرية', icon:'🎼', organizer:'دار النغم', country:'لبنان', flag:'🇱🇧', category:'موسيقى', status:'results', participants:'620', prize:'15,000 دولار', deadline:'النتائج', desc:'أُعلنت نتائج المسابقة — اكتشف الفائزين والأعمال الحائزة على الجوائز.' },
];

const ACTIVE: ActiveComp[] = [
  { id:'a1', title:'جائزة الصوت العربي للإبداع', icon:'🏆', organizer:'Sound Platform', flag:'🇸🇦', category:'غناء', status:'vote', participants:'4,820', prize:'250,000 ريال', deadline:'3 أيام', highlight:true },
  { id:'a2', title:'مسابقة الشعر الخليجي', icon:'📜', organizer:'اتحاد الشعراء', flag:'🇰🇼', category:'شعر', status:'open', participants:'1,340', prize:'50,000 ريال', deadline:'12 يوم' },
  { id:'a3', title:'أفضل بودكاست ناشئ', icon:'🎙️', organizer:'Sound Studio', flag:'🇪🇬', category:'بودكاست', status:'judge', participants:'980', prize:'20,000 جنيه', deadline:'التحكيم' },
  { id:'a4', title:'مسابقة الكوميديا الصوتية', icon:'😂', organizer:'صوت الضحك', flag:'🇦🇪', category:'كوميديا', status:'open', participants:'561', prize:'10,000 درهم', deadline:'8 أيام' },
  { id:'a5', title:'بطل الإلقاء', icon:'🎤', organizer:'أكاديمية الخطابة', flag:'🇯🇴', category:'خطابة', status:'vote', participants:'2,100', prize:'30,000 دينار', deadline:'5 أيام' },
];

const VOTING: VoteEntry[] = [
  { id:'v1', rank:1, name:'نوى الحربي',     avatar:'ن', comp:'جائزة الصوت العربي', votes:48200, maxVotes:60000 },
  { id:'v2', rank:2, name:'سامي المرزوق',  avatar:'س', comp:'جائزة الصوت العربي', votes:41800, maxVotes:60000 },
  { id:'v3', rank:3, name:'رنا الأحمدي',   avatar:'ر', comp:'جائزة الصوت العربي', votes:35500, maxVotes:60000 },
  { id:'v4', rank:4, name:'خالد الشمري',   avatar:'خ', comp:'بطل الإلقاء',         votes:29000, maxVotes:60000 },
];

const LEADERBOARD: LbEntry[] = [
  { id:'l1', pos:1, name:'نوى الحربي',    avatar:'ن', comp:'جائزة الصوت 2024', score:'9,842', prize:'🥇 100,000 ريال', medal:'🥇' },
  { id:'l2', pos:2, name:'سامي المرزوق', avatar:'س', comp:'جائزة الصوت 2024', score:'9,211', prize:'🥈 50,000 ريال',  medal:'🥈' },
  { id:'l3', pos:3, name:'رنا الأحمدي',  avatar:'ر', comp:'جائزة الصوت 2024', score:'8,774', prize:'🥉 25,000 ريال', medal:'🥉' },
  { id:'l4', pos:4, name:'ليلى الجابر',  avatar:'ل', comp:'جائزة الصوت 2024', score:'7,950', prize:'',               medal:'' },
  { id:'l5', pos:5, name:'عمر الزيد',    avatar:'ع', comp:'مسابقة الشعر 2024', score:'7,400', prize:'',              medal:'' },
];

// ── Filter Options ──────────────────────────────────────────────────────────────
const STATUS_OPTS: FilterOption[]   = [{value:'open',label:'التسجيل مفتوح'},{value:'vote',label:'التصويت الآن'},{value:'judge',label:'التحكيم'},{value:'results',label:'النتائج'},{value:'ended',label:'انتهت'}];
const CATEGORY_OPTS: FilterOption[] = [{value:'singing',label:'غناء'},{value:'poetry',label:'شعر'},{value:'podcast',label:'بودكاست'},{value:'music',label:'موسيقى'},{value:'comedy',label:'كوميديا'},{value:'khitaba',label:'خطابة'},{value:'rap',label:'راب'},{value:'nasheed',label:'نشيد'}];
const COUNTRY_OPTS: FilterOption[]  = [{value:'sa',label:'🇸🇦 السعودية'},{value:'ae',label:'🇦🇪 الإمارات'},{value:'eg',label:'🇪🇬 مصر'},{value:'lb',label:'🇱🇧 لبنان'},{value:'kw',label:'🇰🇼 الكويت'},{value:'jo',label:'🇯🇴 الأردن'},{value:'int',label:'🌐 دولي'}];
const SORT_OPTS: FilterOption[]     = [{value:'latest',label:'الأحدث'},{value:'popular',label:'الأكثر مشاركة'},{value:'deadline',label:'ينتهي قريباً'},{value:'prize',label:'أعلى جائزة'}];

// ── Status helpers ─────────────────────────────────────────────────────────────
function statusLabel(s: CompStatus): string {
  return { open:'التسجيل مفتوح', vote:'التصويت الآن', judge:'التحكيم', results:'النتائج', ended:'انتهت' }[s];
}
function statusClass(s: CompStatus): string {
  return { open:'thp-badge--open', vote:'thp-badge--vote', judge:'thp-badge--judge', results:'thp-badge--results', ended:'thp-badge--ended' }[s];
}
function ctaLabel(s: CompStatus): string {
  return { open:'سجّل الآن', vote:'صوّت الآن', judge:'عرض الأعمال', results:'النتائج', ended:'الأرشيف' }[s];
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>;
const IcoPeople = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;

// ── Hero Carousel ──────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const card = HEROES[active] ?? HEROES[0]!;
  return (
    <section className="thp-hero" aria-label="مسابقات مميزة">
      <div className="thp-hero__card">
        <div className="thp-hero__card-bg"/>
        <div className="thp-hero__card-body">
          <div className="thp-hero__top">
            <div className="thp-hero__icon" aria-hidden="true">{card.icon}</div>
            <div className="thp-hero__meta">
              <span className={`thp-badge ${statusClass(card.status)}`}>
                {(card.status==='vote') && <span className="thp-badge-dot"/>}
                {statusLabel(card.status)}
              </span>
              <p className="thp-hero__title">{card.title}</p>
              <p className="thp-hero__organizer">{card.flag} {card.organizer} · {card.country}</p>
              <div className="thp-hero__tags">
                <span className="thp-tag">{card.category}</span>
              </div>
            </div>
          </div>
          <div className="thp-hero__stats">
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.participants}</span><span className="thp-hero__stat-label">مشارك</span></div>
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.prize}</span><span className="thp-hero__stat-label">الجائزة</span></div>
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.deadline}</span><span className="thp-hero__stat-label">متبقي</span></div>
          </div>
          <p className="thp-hero__desc">{card.desc}</p>
          <div className="thp-hero__actions">
            <button className="thp-hero__cta-btn" aria-label={ctaLabel(card.status)}>{ctaLabel(card.status)}</button>
            <button className="thp-hero__sec-btn" aria-label="مشاركة">مشاركة</button>
          </div>
        </div>
      </div>
      <div className="thp-hero__dots" role="tablist" aria-label="اختر مسابقة">
        {HEROES.map((h,i) => (
          <button key={h.id} className={`thp-hero__dot${i===active?' thp-hero__dot--active':''}`}
            role="tab" aria-selected={i===active} aria-label={h.title} onClick={() => setActive(i)}/>
        ))}
      </div>
      <div className="thp-hero__thumbs">
        {HEROES.map((h,i) => (
          <button key={h.id} className={`thp-hero__thumb${i===active?' thp-hero__thumb--active':''}`}
            aria-label={h.title} onClick={() => setActive(i)}>
            <span className="thp-hero__thumb-ico">{h.icon}</span>
            <span className="thp-hero__thumb-name">{h.title}</span>
            <span className="thp-hero__thumb-count"><IcoPeople/>{h.participants}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function TournamentsHomePage() {
  const [statuses,   setStatuses]   = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [countries,  setCountries]  = useState<string[]>([]);
  const [sortOrders, setSortOrders] = useState<string[]>([]);
  function toggle(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (v:string) => setter(prev => prev.includes(v) ? prev.filter(x=>x!==v) : [...prev,v]);
  }

  return (
    <main className="thp" dir="rtl" aria-label="الرئيسية — مسابقات">

      {/* Stories */}
      <section aria-label="قصص المتسابقين">
        <div className="thp-story-row">
          {['قصتك','نوى','سامي','رنا','خالد','دانا','ليلى','عمر'].map((n,i) => (
            <button key={i} className="thp-story-item" aria-label={i===0?'إضافة قصة':`قصة ${n}`}>
              <div className={`thp-story-ring${i===0?' thp-story-ring--self':''}`}>
                <div className="thp-story-ring__inner">
                  <div className="thp-avatar" style={{width:52,height:52,fontSize:20}}>{n.charAt(0)}</div>
                </div>
                {i===0 && <span className="thp-story-ring__add" aria-hidden="true">+</span>}
              </div>
              <span className="thp-story-item__name">{n}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Search + Filters */}
      <section aria-label="بحث وتصفية">
        <div className="thp-search">
          <input id="thp-search-input" className="thp-search__input" type="search"
            placeholder="ابحث عن مسابقة، فنان، تصنيف..." autoComplete="off" dir="rtl"/>
          <span className="thp-search__icon"><IcoSearch/></span>
        </div>
        <div className="thp-filters" style={{marginTop:'var(--space-3)'}}>
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
        <button className="thp-subpage-btn" type="button" aria-label="استعراض تصنيفات المسابقات">
          استعراض الأصناف
          <svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* Hero Carousel */}
      <HeroCarousel/>

      {/* المسابقات النشطة */}
      <section aria-labelledby="thp-active-h">
        <div className="thp-section__header">
          <h2 id="thp-active-h" className="thp-section__title">المسابقات النشطة</h2>
          <button className="thp-section__see-all" aria-label="عرض كل المسابقات">عرض الكل</button>
        </div>
        <div className="thp-comp-list">
          {ACTIVE.map(c => (
            <article key={c.id} className={`thp-comp-card${c.highlight?' thp-comp-card--highlight':''}`} aria-label={c.title}>
              <div className="thp-comp-card__header">
                <div className="thp-comp-card__icon" aria-hidden="true">{c.icon}</div>
                <div className="thp-comp-card__info">
                  <p className="thp-comp-card__name">{c.title}</p>
                  <p className="thp-comp-card__org">{c.flag} {c.organizer}</p>
                </div>
                <div className="thp-comp-card__badge-col">
                  <span className={`thp-badge ${statusClass(c.status)}`}>
                    {c.status==='vote' && <span className="thp-badge-dot"/>}
                    {statusLabel(c.status)}
                  </span>
                  <span className="thp-tag">{c.category}</span>
                </div>
              </div>
              <div className="thp-comp-card__meta">
                <div className="thp-comp-card__meta-item"><span className="thp-comp-card__meta-val">{c.participants}</span><span className="thp-comp-card__meta-label">مشارك</span></div>
                <div className="thp-comp-card__meta-item"><span className="thp-comp-card__meta-val">{c.prize}</span><span className="thp-comp-card__meta-label">الجائزة</span></div>
              </div>
              <div className="thp-comp-card__footer">
                <span className="thp-comp-card__timer">⏳ متبقي: {c.deadline}</span>
                <div className="thp-comp-card__actions">
                  <button className="thp-btn-ghost" aria-label={`تفاصيل ${c.title}`}>تفاصيل</button>
                  <button className="thp-btn-primary" aria-label={ctaLabel(c.status)}>{ctaLabel(c.status)}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* التصويت الآن */}
      <section aria-labelledby="thp-vote-h">
        <div className="thp-section__header">
          <h2 id="thp-vote-h" className="thp-section__title">التصويت الآن</h2>
          <button className="thp-section__see-all" aria-label="عرض كل المتسابقين">عرض الكل</button>
        </div>
        <div className="thp-vote-list">
          {VOTING.map(v => (
            <div key={v.id} className="thp-vote-card" aria-label={`${v.name} — ${v.comp}`}>
              <span className={`thp-vote-card__rank${v.rank===1?' thp-vote-card__rank--gold':v.rank===2?' thp-vote-card__rank--silver':v.rank===3?' thp-vote-card__rank--bronze':''}`}>
                {v.rank===1?'🥇':v.rank===2?'🥈':v.rank===3?'🥉':v.rank}
              </span>
              <div className="thp-vote-card__avatar">{v.avatar}</div>
              <div className="thp-vote-card__info">
                <p className="thp-vote-card__name">{v.name}</p>
                <p className="thp-vote-card__comp">{v.comp}</p>
                <div className="thp-vote-card__bar-wrap">
                  <div className="thp-vote-card__bar" style={{width:`${Math.round(v.votes/v.maxVotes*100)}%`}}/>
                </div>
              </div>
              <span className="thp-vote-card__votes">{(v.votes/1000).toFixed(1)}K</span>
              <button className="thp-vote-card__vote-btn" aria-label={`صوّت لـ ${v.name}`}>صوّت</button>
            </div>
          ))}
        </div>
      </section>

      {/* نتائج ولوحة الشرف */}
      <section aria-labelledby="thp-lb-h">
        <div className="thp-section__header">
          <h2 id="thp-lb-h" className="thp-section__title">لوحة الشرف</h2>
          <button className="thp-section__see-all" aria-label="عرض كل الفائزين">عرض الكل</button>
        </div>
        <div className="thp-leaderboard">
          {LEADERBOARD.map(r => (
            <div key={r.id} className={`thp-lb-row${r.pos===1?' thp-lb-row--winner':''}`} aria-label={`${r.pos}. ${r.name}`}>
              <span className={`thp-lb-row__pos${r.pos===1?' thp-lb-row__pos--1':r.pos===2?' thp-lb-row__pos--2':r.pos===3?' thp-lb-row__pos--3':''}`}>
                {r.medal || r.pos}
              </span>
              <div className="thp-lb-row__avatar">{r.avatar}</div>
              <div className="thp-lb-row__info">
                <p className="thp-lb-row__name">{r.name}</p>
                <p className="thp-lb-row__comp">{r.comp}</p>
              </div>
              <span className="thp-lb-row__score">{r.score}</span>
              {r.prize && <span className="thp-lb-row__prize">{r.prize}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Sponsor */}
      <section aria-label="إعلان">
        <div className="thp-sponsor">
          <span className="thp-sponsor__label">إعلان</span>
          <div className="thp-sponsor__logo" aria-hidden="true">🏅</div>
          <div className="thp-sponsor__body">
            <p className="thp-sponsor__name">stc — شريك المسابقات الرسمي</p>
            <p className="thp-sponsor__tagline">ادعم المواهب العربية وتابع مسابقاتك المفضلة باشتراك stc الحصري</p>
          </div>
          <button className="thp-sponsor__cta" aria-label="اشترك الآن">اشترك</button>
        </div>
      </section>

      {/* Create CTA */}
      <section aria-label="إنشاء مسابقة">
        <div className="thp-cta">
          <div className="thp-cta__icon" aria-hidden="true">🎯</div>
          <div className="thp-cta__body">
            <p className="thp-cta__title">أنشئ مسابقتك الخاصة</p>
            <p className="thp-cta__desc">اكتشف مواهب جديدة وابنِ مجتمعك بمسابقة مميزة</p>
          </div>
          <button className="thp-cta__btn" aria-label="إنشاء مسابقة جديدة">ابدأ الآن</button>
        </div>
      </section>

    </main>
  );
}
