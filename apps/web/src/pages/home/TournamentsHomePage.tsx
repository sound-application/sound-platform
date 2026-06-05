import React, { useState } from 'react';
import './TournamentsHomePage.css';
import { FilterDropdown, SelectedChips, type FilterOption } from '../../components/FilterDropdown';
import i18n from "i18next";

const t = (key: any, options?: any) => i18n.t(key, options) as any as string;


// ── Types ─────────────────────────────────────────────────────────────────────
type CompStatus = 'open' | 'vote' | 'judge' | 'results' | 'ended';
interface HeroComp   { id:string; title:string; icon:string; organizer:string; country:string; flag:string; category:string; status:CompStatus; participants:string; prize:string; deadline:string; desc:string; }
interface ActiveComp { id:string; title:string; icon:string; organizer:string; flag:string; category:string; status:CompStatus; participants:string; prize:string; deadline:string; highlight?:boolean; }
interface VoteEntry  { id:string; rank:number; name:string; avatar:string; comp:string; votes:number; maxVotes:number; }
interface LbEntry    { id:string; pos:number; name:string; avatar:string; comp:string; score:string; prize:string; medal:string; }

// ── Data ──────────────────────────────────────────────────────────────────────
const HEROES: HeroComp[] = [
  { id:'h1', title:t('tournamentshome:arabVoiceAwardForCreativity'), icon:'🏆', organizer:'Sound Platform', country:t('tournamentshome:saudiArabia1'), flag:'🇸🇦', category:t('tournamentshome:singing'), status:'vote', participants:'4,820', prize:t('tournamentshome:250000Riyals'), deadline:t('tournamentshome:3Days'), desc:t('tournamentshome:theLargestOnlineArabicSingingCompetition') },
  { id:'h2', title:t('tournamentshome:gulfPoetryCompetition'), icon:'📜', organizer:t('tournamentshome:unionOfPoets'), country:t('tournamentshome:kuwait1'), flag:'🇰🇼', category:t('tournamentshome:poetry'), status:'open', participants:'1,340', prize:t('tournamentshome:50000Riyals1'), deadline:t('tournamentshome:12Days'), desc:t('tournamentshome:registerAndParticipateWithYourPoemInTheM') },
  { id:'h3', title:t('tournamentshome:bestEmergingPodcast'), icon:'🎙️', organizer:'Sound Studio', country:t('tournamentshome:egypt1'), flag:'🇪🇬', category:t('tournamentshome:itsAPodcast'), status:'judge', participants:'980', prize:t('tournamentshome:20000Pounds'), deadline:t('tournamentshome:arbitration'), desc:t('tournamentshome:aSpecializedJuryReviewsTheSubmittedWorks') },
  { id:'h4', title:t('tournamentshome:soundtrackCompetition'), icon:'🎼', organizer:t('tournamentshome:darAlNagham'), country:t('tournamentshome:lebanon1'), flag:'🇱🇧', category:t('tournamentshome:music'), status:'results', participants:'620', prize:t('tournamentshome:15000'), deadline:t('tournamentshome:results'), desc:t('tournamentshome:contestResultsAnnouncedDiscoverTheWinner') },
];

const ACTIVE: ActiveComp[] = [
  { id:'a1', title:t('tournamentshome:arabVoiceAwardForCreativity'), icon:'🏆', organizer:'Sound Platform', flag:'🇸🇦', category:t('tournamentshome:singing'), status:'vote', participants:'4,820', prize:t('tournamentshome:250000Riyals'), deadline:t('tournamentshome:3Days'), highlight:true },
  { id:'a2', title:t('tournamentshome:gulfPoetryCompetition'), icon:'📜', organizer:t('tournamentshome:unionOfPoets'), flag:'🇰🇼', category:t('tournamentshome:poetry'), status:'open', participants:'1,340', prize:t('tournamentshome:50000Riyals1'), deadline:t('tournamentshome:12Days') },
  { id:'a3', title:t('tournamentshome:bestEmergingPodcast'), icon:'🎙️', organizer:'Sound Studio', flag:'🇪🇬', category:t('tournamentshome:itsAPodcast'), status:'judge', participants:'980', prize:t('tournamentshome:20000Pounds'), deadline:t('tournamentshome:arbitration') },
  { id:'a4', title:t('tournamentshome:audioComedyCompetition'), icon:'😂', organizer:t('tournamentshome:theSoundOfLaughter'), flag:'🇦🇪', category:t('tournamentshome:comedy'), status:'open', participants:'561', prize:t('tournamentshome:10000Dirhams'), deadline:t('tournamentshome:8Days') },
  { id:'a5', title:t('tournamentshome:speakingChampion'), icon:'🎤', organizer:t('tournamentshome:academyOfPublicSpeaking'), flag:'🇯🇴', category:t('tournamentshome:oratory'), status:'vote', participants:'2,100', prize:t('tournamentshome:30000Dinars'), deadline:t('tournamentshome:5Days') },
];

const VOTING: VoteEntry[] = [
  { id:'v1', rank:1, name:t('tournamentshome:nawaAlharbi'),     avatar:t('tournamentshome:n'), comp:t('tournamentshome:arabVoiceAward'), votes:48200, maxVotes:60000 },
  { id:'v2', rank:2, name:t('tournamentshome:samiAlMarzouq'),  avatar:t('tournamentshome:q'), comp:t('tournamentshome:arabVoiceAward'), votes:41800, maxVotes:60000 },
  { id:'v3', rank:3, name:t('tournamentshome:ranaAlahmadi'),   avatar:t('tournamentshome:r'), comp:t('tournamentshome:arabVoiceAward'), votes:35500, maxVotes:60000 },
  { id:'v4', rank:4, name:t('tournamentshome:khaledAlshammari'),   avatar:t('tournamentshome:kh'), comp:t('tournamentshome:speakingChampion'),         votes:29000, maxVotes:60000 },
];

const LEADERBOARD: LbEntry[] = [
  { id:'l1', pos:1, name:t('tournamentshome:nawaAlharbi'),    avatar:t('tournamentshome:n'), comp:t('tournamentshome:theVoiceAward2024'), score:'9,842', prize:t('tournamentshome:100000Riyals'), medal:'🥇' },
  { id:'l2', pos:2, name:t('tournamentshome:samiAlMarzouq'), avatar:t('tournamentshome:q'), comp:t('tournamentshome:theVoiceAward2024'), score:'9,211', prize:t('tournamentshome:50000Riyals'),  medal:'🥈' },
  { id:'l3', pos:3, name:t('tournamentshome:ranaAlahmadi'),  avatar:t('tournamentshome:r'), comp:t('tournamentshome:theVoiceAward2024'), score:'8,774', prize:t('tournamentshome:25000Riyals'), medal:'🥉' },
  { id:'l4', pos:4, name:t('tournamentshome:lailaAlJaber'),  avatar:t('tournamentshome:to'), comp:t('tournamentshome:theVoiceAward2024'), score:'7,950', prize:'',               medal:'' },
  { id:'l5', pos:5, name:t('tournamentshome:omarAlzaid'),    avatar:t('tournamentshome:a'), comp:t('tournamentshome:poetryCompetition2024'), score:'7,400', prize:'',              medal:'' },
];

// ── Filter Options ──────────────────────────────────────────────────────────────
const STATUS_OPTS: FilterOption[]   = [{value:'open',label:t('tournamentshome:registrationIsOpen')},{value:'vote',label:t('tournamentshome:voteNow')},{value:'judge',label:t('tournamentshome:arbitration')},{value:'results',label:t('tournamentshome:results')},{value:'ended',label:t('tournamentshome:itsOver')}];
const CATEGORY_OPTS: FilterOption[] = [{value:'singing',label:t('tournamentshome:singing')},{value:'poetry',label:t('tournamentshome:poetry')},{value:'podcast',label:t('tournamentshome:itsAPodcast')},{value:'music',label:t('tournamentshome:music')},{value:'comedy',label:t('tournamentshome:comedy')},{value:'khitaba',label:t('tournamentshome:oratory')},{value:'rap',label:t('tournamentshome:rap')},{value:'nasheed',label:t('tournamentshome:anthem')}];
const COUNTRY_OPTS: FilterOption[]  = [{value:'sa',label:t('tournamentshome:saudiArabia')},{value:'ae',label:t('tournamentshome:emirates')},{value:'eg',label:t('tournamentshome:egypt')},{value:'lb',label:t('tournamentshome:lebanon')},{value:'kw',label:t('tournamentshome:kuwait')},{value:'jo',label:t('tournamentshome:jordan')},{value:'int',label:t('tournamentshome:international')}];
const SORT_OPTS: FilterOption[]     = [{value:'latest',label:t('tournamentshome:latest')},{value:'popular',label:t('tournamentshome:mostShared')},{value:'deadline',label:t('tournamentshome:endsSoon')},{value:'prize',label:t('tournamentshome:highestAward')}];

// ── Status helpers ─────────────────────────────────────────────────────────────
function statusLabel(s: CompStatus): string {
  return { open:t('tournamentshome:registrationIsOpen'), vote:t('tournamentshome:voteNow'), judge:t('tournamentshome:arbitration'), results:t('tournamentshome:results'), ended:t('tournamentshome:itsOver') }[s];
}
function statusClass(s: CompStatus): string {
  return { open:'thp-badge--open', vote:'thp-badge--vote', judge:'thp-badge--judge', results:'thp-badge--results', ended:'thp-badge--ended' }[s];
}
function ctaLabel(s: CompStatus): string {
  return { open:t('tournamentshome:registerNow'), vote:t('tournamentshome:voteNow1'), judge:t('tournamentshome:showBusiness'), results:t('tournamentshome:results'), ended:t('tournamentshome:archives') }[s];
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const IcoSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>;
const IcoPeople = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;

// ── Hero Carousel ──────────────────────────────────────────────────────────────
function HeroCarousel() {
  const [active, setActive] = useState(0);
  const card = HEROES[active] ?? HEROES[0]!;
  return (
    <section className="thp-hero" aria-label={t('tournamentshome:featuredCompetitions')}>
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
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.participants}</span><span className="thp-hero__stat-label">{t('tournamentshome:participant')}</span></div>
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.prize}</span><span className="thp-hero__stat-label">{t('tournamentshome:thePrize')}</span></div>
            <div className="thp-hero__stat"><span className="thp-hero__stat-val">{card.deadline}</span><span className="thp-hero__stat-label">{t('tournamentshome:remaining1')}</span></div>
          </div>
          <p className="thp-hero__desc">{card.desc}</p>
          <div className="thp-hero__actions">
            <button className="thp-hero__cta-btn" aria-label={ctaLabel(card.status)}>{ctaLabel(card.status)}</button>
            <button className="thp-hero__sec-btn" aria-label={t('tournamentshome:sharing')}>{t('tournamentshome:sharing')}</button>
          </div>
        </div>
      </div>
      <div className="thp-hero__dots" role="tablist" aria-label={t('tournamentshome:chooseAContest')}>
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
    <main className="thp" aria-label={t('tournamentshome:homeCompetitions')}>

      {/* Stories */}
      <section aria-label={t('tournamentshome:contestantsStories')}>
        <div className="thp-story-row">
          {[t('tournamentshome:yourStory'),t('tournamentshome:ninety'),t('tournamentshome:sami'),t('tournamentshome:rana'),t('tournamentshome:immortal'),t('tournamentshome:wise'),t('tournamentshome:layla'),t('tournamentshome:age')].map((n,i) => (
            <button key={i} className="thp-story-item" aria-label={i===0?t('tournamentshome:addAStory'):`قصة ${n}`}>
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
      <section aria-label={t('tournamentshome:searchAndFilter')}>
        <div className="thp-search">
          <input id="thp-search-input" className="thp-search__input" type="search"
            placeholder={t('tournamentshome:searchForCompetitionArtistCategory')} autoComplete="off"/>
          <span className="thp-search__icon"><IcoSearch/></span>
        </div>
        <div className="thp-filters" style={{marginTop:'var(--space-3)'}}>
          <FilterDropdown label={t('tournamentshome:theCondition')}   options={STATUS_OPTS}   values={statuses}   onToggle={toggle(setStatuses)}   onClear={()=>setStatuses([])}   defaultLabel={t('tournamentshome:everyone')}    ariaLabel={t('tournamentshome:filterByStatus')}/>
          <FilterDropdown label={t('tournamentshome:classification')}  options={CATEGORY_OPTS} values={categories} onToggle={toggle(setCategories)} onClear={()=>setCategories([])} defaultLabel={t('tournamentshome:everyone')}    ariaLabel={t('tournamentshome:filterByCategory')}/>
          <FilterDropdown label={t('tournamentshome:country')}    options={COUNTRY_OPTS}  values={countries}  onToggle={toggle(setCountries)}  onClear={()=>setCountries([])}  defaultLabel={t('tournamentshome:everyone')}    ariaLabel={t('tournamentshome:filterByCountry')}/>
          <FilterDropdown label={t('tournamentshome:ranking')} options={SORT_OPTS}     values={sortOrders} onToggle={toggle(setSortOrders)} onClear={()=>setSortOrders([])} defaultLabel={t('tournamentshome:latest')} ariaLabel={t('tournamentshome:filterBySort')}/>
        </div>
        <SelectedChips groups={[
          { filterId:'status',   options:STATUS_OPTS,   values:statuses,   onRemove:toggle(setStatuses)   },
          { filterId:'category', options:CATEGORY_OPTS, values:categories, onRemove:toggle(setCategories) },
          { filterId:'country',  options:COUNTRY_OPTS,  values:countries,  onRemove:toggle(setCountries)  },
          { filterId:'sort',     options:SORT_OPTS,     values:sortOrders, onRemove:toggle(setSortOrders) },
        ]}/>
        <button className="thp-subpage-btn" type="button" aria-label={t('tournamentshome:reviewCompetitionRankings')}>
          {t('tournamentshome:browseItems')}<svg viewBox="0 0 16 16" fill="none" width="11" height="11" aria-hidden="true">
            <path d="M6 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V10M10 2h4m0 0v4m0-4L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      {/* Hero Carousel */}
      <HeroCarousel/>

      {/* المسابقات النشطة */}
      <section aria-labelledby="thp-active-h">
        <div className="thp-section__header">
          <h2 id="thp-active-h" className="thp-section__title">{t('tournamentshome:activeCompetitions')}</h2>
          <button className="thp-section__see-all" aria-label={t('tournamentshome:viewAllCompetitions')}>{t('tournamentshome:viewAll')}</button>
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
                <div className="thp-comp-card__meta-item"><span className="thp-comp-card__meta-val">{c.participants}</span><span className="thp-comp-card__meta-label">{t('tournamentshome:participant')}</span></div>
                <div className="thp-comp-card__meta-item"><span className="thp-comp-card__meta-val">{c.prize}</span><span className="thp-comp-card__meta-label">{t('tournamentshome:thePrize')}</span></div>
              </div>
              <div className="thp-comp-card__footer">
                <span className="thp-comp-card__timer">{t('tournamentshome:remaining')}{c.deadline}</span>
                <div className="thp-comp-card__actions">
                  <button className="thp-btn-ghost" aria-label={`تفاصيل ${c.title}`}>{t('tournamentshome:details')}</button>
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
          <h2 id="thp-vote-h" className="thp-section__title">{t('tournamentshome:voteNow')}</h2>
          <button className="thp-section__see-all" aria-label={t('tournamentshome:viewAllContestants')}>{t('tournamentshome:viewAll')}</button>
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
              <button className="thp-vote-card__vote-btn" aria-label={`صوّت لـ ${v.name}`}>{t('tournamentshome:voice')}</button>
            </div>
          ))}
        </div>
      </section>

      {/* نتائج ولوحة الشرف */}
      <section aria-labelledby="thp-lb-h">
        <div className="thp-section__header">
          <h2 id="thp-lb-h" className="thp-section__title">{t('tournamentshome:honorBoard')}</h2>
          <button className="thp-section__see-all" aria-label={t('tournamentshome:viewAllWinners')}>{t('tournamentshome:viewAll')}</button>
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
      <section aria-label={t('tournamentshome:advertisement')}>
        <div className="thp-sponsor">
          <span className="thp-sponsor__label">{t('tournamentshome:advertisement')}</span>
          <div className="thp-sponsor__logo" aria-hidden="true">🏅</div>
          <div className="thp-sponsor__body">
            <p className="thp-sponsor__name">{t('tournamentshome:stcTheOfficialCompetitionsPartner')}</p>
            <p className="thp-sponsor__tagline">{t('tournamentshome:supportArabTalentAndFollowYourFavoriteCo')}</p>
          </div>
          <button className="thp-sponsor__cta" aria-label={t('tournamentshome:subscribeNow')}>{t('tournamentshome:subscribe')}</button>
        </div>
      </section>

      {/* Create CTA */}
      <section aria-label={t('tournamentshome:createAContest')}>
        <div className="thp-cta">
          <div className="thp-cta__icon" aria-hidden="true">🎯</div>
          <div className="thp-cta__body">
            <p className="thp-cta__title">{t('tournamentshome:createYourOwnContest')}</p>
            <p className="thp-cta__desc">{t('tournamentshome:discoverNewTalentsAndBuildYourCommunityW')}</p>
          </div>
          <button className="thp-cta__btn" aria-label={t('tournamentshome:createANewContest')}>{t('tournamentshome:startNow')}</button>
        </div>
      </section>

    </main>
  );
}
