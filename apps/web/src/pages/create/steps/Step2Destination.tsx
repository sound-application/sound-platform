import React from 'react';
import type { AudienceType, CountryMode, AgeSuitability, PlacementFeed, PlaylistIntent } from '@sound/shared';

export interface Step2DestinationProps {
  t: any;
  categoryId: string;
  setCategoryId: (v: string) => void;
  categoryOpen: boolean;
  setCategoryOpen: (v: boolean) => void;
  categoryOptions: any[];
  subcategoryId: string;
  setSubcategoryId: (v: string) => void;
  subcategoryOpen: boolean;
  setSubcategoryOpen: (v: boolean) => void;
  getSubcategoryOptions: (catId: string) => any[];
  tags: string;
  setTags: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  languageOpen: boolean;
  setLanguageOpen: (v: boolean) => void;
  LANGUAGES: any[];
  countryMode: CountryMode;
  setCountryMode: (v: CountryMode) => void;
  countryCodes: string;
  setCountryCodes: (v: string) => void;
  ageSuitability: AgeSuitability;
  setAgeSuitability: (v: AgeSuitability) => void;
  isExplicit: boolean;
  setIsExplicit: (v: boolean) => void;
  isChildContent: boolean;
  setIsChildContent: (v: boolean) => void;
  audience: AudienceType;
  setAudience: (v: AudienceType) => void;
  AUDIENCE_OPTIONS: any[];
  placementFeed: PlacementFeed;
  setPlacementFeed: (v: PlacementFeed) => void;
  playlistIntent: PlaylistIntent;
  setPlaylistIntent: (v: PlaylistIntent) => void;
  selectedPlaylistId: string;
  setSelectedPlaylistId: (v: string) => void;
  newPlaylistName: string;
  setNewPlaylistName: (v: string) => void;
  playlistDropdownOpen: boolean;
  setPlaylistDropdownOpen: (v: boolean) => void;
  userPlaylists: any[];
  setUserPlaylists: (v: any[]) => void;
  playlistsLoaded: boolean;
  setPlaylistsLoaded: (v: boolean) => void;
  playlistsLoading: boolean;
  setPlaylistsLoading: (v: boolean) => void;
  privacyDropdownOpen: boolean;
  setPrivacyDropdownOpen: (v: boolean) => void;
  newPlaylistVisibility: AudienceType;
  setNewPlaylistVisibility: (v: AudienceType) => void;
  playlistCreating: boolean;
  setPlaylistCreating: (v: boolean) => void;
  uid: string;
  callGetUserPlaylists: any;
  callCreatePlaylist: any;
  commentsEnabled: boolean;
  setCommentsEnabled: (v: boolean) => void;
  giftsEnabled: boolean;
  setGiftsEnabled: (v: boolean) => void;
  sharingEnabled: boolean;
  setSharingEnabled: (v: boolean) => void;
  saveError: string | null;
  saving: boolean;
  saveDraft: (step: number) => void;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12) => void;
  iconPrev: string;
  iconNext: string;
}

export function Step2Destination({
  t, categoryId, setCategoryId, categoryOpen, setCategoryOpen, categoryOptions,
  subcategoryId, setSubcategoryId, subcategoryOpen, setSubcategoryOpen, getSubcategoryOptions,
  tags, setTags, language, setLanguage, languageOpen, setLanguageOpen, LANGUAGES,
  countryMode, setCountryMode, countryCodes, setCountryCodes, ageSuitability, setAgeSuitability,
  isExplicit, setIsExplicit, isChildContent, setIsChildContent, audience, setAudience, AUDIENCE_OPTIONS,
  placementFeed, setPlacementFeed, playlistIntent, setPlaylistIntent, selectedPlaylistId, setSelectedPlaylistId,
  newPlaylistName, setNewPlaylistName, playlistDropdownOpen, setPlaylistDropdownOpen, userPlaylists, setUserPlaylists,
  playlistsLoaded, setPlaylistsLoaded, playlistsLoading, setPlaylistsLoading, privacyDropdownOpen, setPrivacyDropdownOpen,
  newPlaylistVisibility, setNewPlaylistVisibility, playlistCreating, setPlaylistCreating, uid,
  callGetUserPlaylists, callCreatePlaylist, commentsEnabled, setCommentsEnabled, giftsEnabled, setGiftsEnabled,
  sharingEnabled, setSharingEnabled, saveError, saving, saveDraft, setStep, iconPrev, iconNext
}: Step2DestinationProps) {
  return (
        <section className="acp-section">
          <h1 className="acp-section__title">
            <span className="material-symbols-outlined" aria-hidden="true">tune</span>
            {t('publicationDetails', 'تفاصيل النشر')}
          </h1>
          <div className="acp-form">
            {/* Category — glass dropdown */}
            <div className="acp-label">
              {t('classification', 'التصنيف')}
              <div className="acp-glass-dropdown">
                <button className="acp-glass-dropdown__trigger" onClick={() => { setCategoryOpen(!categoryOpen); setSubcategoryOpen(false); }} type="button">
                  <span>{categoryId ? categoryOptions.find((c) => c.id === categoryId)?.label : t('chooseACategory', 'اختر تصنيف')}</span>
                  <span className="material-symbols-outlined">{categoryOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {categoryOpen && (
                  <div className="acp-glass-dropdown__menu">
                    {categoryOptions.map((c) => (
                      <button key={c.id} className={`acp-glass-dropdown__option ${categoryId === c.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setCategoryId(c.id); setCategoryOpen(false); }} type="button">{c.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcategory — glass dropdown, only when category selected */}
            {categoryId && getSubcategoryOptions(categoryId).length > 0 && (
              <div className="acp-label">
                {t('subclassification', 'التصنيف الفرعي')}
                <div className="acp-glass-dropdown">
                  <button className="acp-glass-dropdown__trigger" onClick={() => { setSubcategoryOpen(!subcategoryOpen); setCategoryOpen(false); }} type="button">
                    <span>{subcategoryId ? getSubcategoryOptions(categoryId)?.find((s: any) => s.id === subcategoryId)?.label : t('chooseASubcategory', 'اختر تصنيف فرعي')}</span>
                    <span className="material-symbols-outlined">{subcategoryOpen ? 'expand_less' : 'expand_more'}</span>
                  </button>
                  {subcategoryOpen && (
                    <div className="acp-glass-dropdown__menu">
                      {getSubcategoryOptions(categoryId).map((sc: any) => (
                        <button key={sc.id} className={`acp-glass-dropdown__option ${subcategoryId === sc.id ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSubcategoryId(sc.id); setSubcategoryOpen(false); }} type="button">{sc.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <label className="acp-label">
              {t('tagsSeparatedByCommas', 'الكلمات المفتاحية')}
              <input type="text" className="acp-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('podcastTechnologyDialogue', 'بودكاست، تقنية')} />
            </label>

            {/* Language — glass dropdown */}
            <div className="acp-label">
              {t('language', 'اللغة')}
              <div className="acp-glass-dropdown">
                <button className="acp-glass-dropdown__trigger" onClick={() => setLanguageOpen(!languageOpen)} type="button">
                  <span>{LANGUAGES.find((l) => l.code === language)?.label}</span>
                  <span className="material-symbols-outlined">{languageOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {languageOpen && (
                  <div className="acp-glass-dropdown__menu">
                    {LANGUAGES.map((l) => (
                      <button key={l.code} className={`acp-glass-dropdown__option ${language === l.code ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setLanguage(l.code); setLanguageOpen(false); }} type="button">{l.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="acp-label">
              {t('targetCountries', 'البلدان المستهدفة')}
              <div className="acp-chips">
                {(['all', 'one', 'upToFour'] as CountryMode[]).map((m) => (
                  <button key={m} className={`acp-chip ${countryMode === m ? 'acp-chip--selected' : ''}`} onClick={() => setCountryMode(m)} type="button">
                    {m === 'all' ? t('allCountries', 'الكل') : m === 'one' ? t('oneCountry', 'بلد واحد') : t('upToCountries', 'مجموعة')}
                  </button>
                ))}
              </div>
            </label>
            {countryMode !== 'all' && (
              <label className="acp-label">
                {t('countryCodesSeparatedByCommas', 'رموز البلدان')}
                <input type="text" className="acp-input" value={countryCodes} onChange={(e) => setCountryCodes(e.target.value)} placeholder="SA, AE, EG, KW" maxLength={20} />
              </label>
            )}

            {/* Age suitability */}
            <label className="acp-label">
              {t('ageGroup', 'الفئة العمرية')}
              <div className="acp-chips">
                {([{ k: 'everyone' as const, l: t('generalEveryone', 'الجميع') }, { k: 'teen' as const, l: t('teenagers13', '+13') }, { k: 'mature' as const, l: t('adults18', '+18') }]).map((a) => (
                  <button key={a.k} className={`acp-chip ${ageSuitability === a.k ? 'acp-chip--selected' : ''}`} onClick={() => setAgeSuitability(a.k)} type="button">{a.l}</button>
                ))}
              </div>
            </label>

            <label className="acp-label acp-label--row">
              <input type="checkbox" checked={isExplicit} onChange={(e) => setIsExplicit(e.target.checked)} />
              {t('explicitContentExplicit', 'محتوى صريح')}
            </label>

            {/* Child content toggle */}
            <div className="acp-toggle-row">
              <span className="material-symbols-outlined">child_care</span>
              <span>{t('kidsContent', 'محتوى أطفال')}</span>
              <button className={`acp-toggle ${isChildContent ? 'acp-toggle--on' : ''}`} onClick={() => setIsChildContent(!isChildContent)} type="button">
                <span className="acp-toggle__knob" />
              </button>
            </div>

            {/* Audience — card list with icons */}
            <div className="acp-label">
              {t('audiencePrivacy', 'الجمهور')}
              <div className="acp-audience-list">
                {AUDIENCE_OPTIONS.map((a) => (
                  <button key={a.key} className={`acp-audience-item ${audience === a.key ? 'acp-audience-item--selected' : ''}`} onClick={() => setAudience(a.key)} type="button">
                    <span className="material-symbols-outlined">{a.icon}</span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Placement feed */}
            <div className="acp-label">
              {t('publishingLocation', 'موضع النشر')}
              <div className="acp-cards-row">
                <button className={`acp-card-btn ${placementFeed === 'main' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('main')} type="button">
                  <span className="material-symbols-outlined">home</span>
                  <span>{t('main', 'الرئيسية')}</span>
                </button>
                <button className={`acp-card-btn ${placementFeed === 'shorts' ? 'acp-card-btn--selected' : ''}`} onClick={() => setPlacementFeed('shorts')} type="button">
                  <span className="material-symbols-outlined">movie</span>
                  <span>{t('shots', 'لقطات')}</span>
                </button>
              </div>
            </div>

            {/* Playlist intent (Phase 8-I) */}
            <div className="acp-label">
              {t('playlist', 'قائمة التشغيل')}
              <div className="acp-playlist-cards">
                <button className={`acp-playlist-card ${playlistIntent === 'none' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('none'); setSelectedPlaylistId(''); setNewPlaylistName(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">playlist_remove</span>
                  {t('withoutAMenu', 'بدون قائمة')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'existing' ? 'acp-playlist-card--selected' : ''}`} onClick={async () => { setPlaylistIntent('existing'); setNewPlaylistName(''); if (!playlistsLoaded && !playlistsLoading) { setPlaylistsLoading(true); try { const res = await callGetUserPlaylists({}); setUserPlaylists(res.data?.playlists || []); setPlaylistsLoaded(true); } catch { setUserPlaylists([]); setPlaylistsLoaded(true); } finally { setPlaylistsLoading(false); } } setPlaylistDropdownOpen(true); }} type="button">
                  <span className="material-symbols-outlined">playlist_add</span>
                  {t('addToExistingPlaylist', 'إضافة لقائمة موجودة')}
                </button>
                <button className={`acp-playlist-card ${playlistIntent === 'new' ? 'acp-playlist-card--selected' : ''}`} onClick={() => { setPlaylistIntent('new'); setSelectedPlaylistId(''); setPlaylistDropdownOpen(false); }} type="button">
                  <span className="material-symbols-outlined">queue_music</span>
                  {t('createNewPlaylist', 'إنشاء قائمة جديدة')}
                </button>
              </div>

              {/* Existing playlist dropdown */}
              {playlistIntent === 'existing' && (
                <div className="acp-playlist-select">
                  {playlistsLoading ? (
                    <div className="acp-playlist-loading">
                      <span className="material-symbols-outlined acp-spin">progress_activity</span>
                      <span>{t('loadingPlaylists', 'جارٍ تحميل القوائم...')}</span>
                    </div>
                  ) : userPlaylists.length === 0 ? (
                    <div className="acp-playlist-empty">
                      <span className="material-symbols-outlined">info</span>
                      <span>{t('noPlaylistsYet', 'لا توجد قوائم تشغيل بعد.')}</span>
                    </div>
                  ) : (
                    <div className="acp-glass-dropdown">
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPlaylistDropdownOpen(!playlistDropdownOpen)} type="button">
                        <span>{selectedPlaylistId ? userPlaylists.find(p => p.playlistId === selectedPlaylistId)?.title || t('unknownPlaylist', 'قائمة غير معروفة') : t('selectPlaylist', 'اختر قائمة تشغيل...')}</span>
                        <span className="material-symbols-outlined">{playlistDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {playlistDropdownOpen && (
                        <div className="acp-glass-dropdown__menu">
                          {userPlaylists.map((pl) => (
                            <button key={pl.playlistId} className={`acp-glass-dropdown__option ${selectedPlaylistId === pl.playlistId ? 'acp-glass-dropdown__option--selected' : ''}`} onClick={() => { setSelectedPlaylistId(pl.playlistId); setPlaylistDropdownOpen(false); }} type="button">
                              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>queue_music</span>
                              <span className="acp-playlist-item-info">
                                <span className="acp-playlist-item-title">{pl.title}</span>
                                <span className="acp-playlist-item-meta">{pl.itemCount} {t('segment', 'مقطع')} · {pl.visibility === 'public' ? t('public', 'عامة') : t('private', 'خاصة')}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* New playlist name input */}
              {playlistIntent === 'new' && (
                <div className="acp-playlist-new-input">
                  <input
                    type="text"
                    className="acp-input"
                    placeholder={t('newPlaylistNamePlaceholder', 'اسم القائمة الجديدة...')}
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    maxLength={80}
                    autoFocus
                  />
                  <div className="acp-playlist-new-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <div className="acp-glass-dropdown" style={{ flex: 1, position: 'relative' }}>
                      <button className="acp-glass-dropdown__trigger" onClick={() => setPrivacyDropdownOpen(!privacyDropdownOpen)} type="button" style={{ width: '100%' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'inherit' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.icon || 'visibility'}</span>
                        <span style={{ flex: 1, textAlign: 'start' }}>{AUDIENCE_OPTIONS.find(a => a.key === newPlaylistVisibility)?.label || t('public', 'عام')}</span>
                        <span className="material-symbols-outlined">{privacyDropdownOpen ? 'expand_less' : 'expand_more'}</span>
                      </button>
                      {privacyDropdownOpen && (
                        <div className="acp-glass-dropdown__menu" style={{ width: '100%', top: 'calc(100% + 4px)', position: 'absolute', zIndex: 10 }}>
                          {AUDIENCE_OPTIONS.map((a) => (
                            <button
                              key={a.key}
                              className={`acp-glass-dropdown__option ${newPlaylistVisibility === a.key ? 'acp-glass-dropdown__option--selected' : ''}`}
                              onClick={() => { setNewPlaylistVisibility(a.key); setPrivacyDropdownOpen(false); }}
                              type="button"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className="acp-btn acp-btn--primary"
                      disabled={playlistCreating || !newPlaylistName.trim()}
                      onClick={async () => {
                        if (!newPlaylistName.trim()) return;
                        setPlaylistCreating(true);
                        try {
                          const visibilityMapped = newPlaylistVisibility === 'public' ? 'public' : 'private';
                          const res = await callCreatePlaylist({
                            title: newPlaylistName.trim(),
                            visibility: visibilityMapped as any
                          });
                          const newPl = {
                            playlistId: res.data?.playlistId,
                            title: newPlaylistName.trim(),
                            visibility: visibilityMapped,
                            itemCount: 0,
                            ownerUid: uid,
                            source: 'creator',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                          } as any;
                          setUserPlaylists([newPl, ...userPlaylists]);
                          setSelectedPlaylistId(res.data?.playlistId);
                          setPlaylistIntent('existing');
                        } catch (err) {
                          console.error('Failed to create playlist', err);
                        } finally {
                          setPlaylistCreating(false);
                        }
                      }}
                      type="button"
                      style={{ minWidth: '100px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                    >
                      {playlistCreating ? <span className="acp-spinner" /> : <><span className="material-symbols-outlined">save</span> {t('save', 'حفظ')}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="acp-toggles-group">
              <h3 className="acp-toggles-group__title">{t('publishSettings', 'إعدادات النشر')}</h3>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} /> {t('allowComments', 'السماح بالتعليقات')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={giftsEnabled} onChange={(e) => setGiftsEnabled(e.target.checked)} /> {t('allowGifts', 'السماح بالهدايا')}</label>
              <label className="acp-label acp-label--row"><input type="checkbox" checked={sharingEnabled} onChange={(e) => setSharingEnabled(e.target.checked)} /> {t('allowSharing', 'السماح بالمشاركة')}</label>

              <div className="acp-toggle-row" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <span className="material-symbols-outlined">schedule_send</span>
                <span>{t('schedulePublish', 'جدولة النشر')}</span>
                <span className="acp-gate-badge">{t('byTier', 'حسب الباقة')}</span>
                <button className="acp-toggle acp-toggle--disabled" disabled type="button">
                  <span className="acp-toggle__knob" />
                </button>
              </div>
            </div>

            {saveError && <p className="acp-error">{saveError}</p>}
            <div className="acp-nav-row">
              <button className="acp-btn acp-btn--ghost" onClick={() => setStep(1)} type="button">
                <span className="material-symbols-outlined" aria-hidden="true">{iconPrev}</span> {t('back', 'رجوع')}
              </button>
              <button className="acp-btn acp-btn--primary" onClick={() => saveDraft(3)} disabled={saving}>
                {saving ? <><span className="acp-spinner" aria-hidden="true" /> {t('saving', 'جارِ الحفظ...')}</> : <><span className="material-symbols-outlined" aria-hidden="true">{iconNext}</span> {t('theNext', 'التالي')}</>}
              </button>
            </div>
          </div>
        </section>
  );
}
