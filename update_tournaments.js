const fs = require('fs');

const file = 'C:/Users/akram/Downloads/Sound/sound-platform/apps/web/src/pages/live/TournamentsLivePage.tsx';
let code = fs.readFileSync(file, 'utf-8');

const replacements = {
  "'يجري الآن'": "t('tournaments.status.liveNow', 'يجري الآن')",
  "'تصويت مفتوح'": "t('tournaments.status.voting', 'تصويت مفتوح')",
  "'المرحلة النهائية'": "t('tournaments.status.final', 'المرحلة النهائية')",
  "'من أتابعهم'": "t('tournaments.status.following', 'من أتابعهم')",
  "'صوت'": "t('tournaments.categories.voice', 'صوت')",
  "'قصة'": "t('tournaments.categories.story', 'قصة')",
  "'كوميديا'": "t('tournaments.categories.comedy', 'كوميديا')",
  "'نقاش'": "t('tournaments.categories.debate', 'نقاش')",
  "'مسابقة معرفة'": "t('tournaments.categories.quiz', 'مسابقة معرفة')",
  "'السعودية'": "t('countries.sa', 'السعودية')",
  "'مصر'": "t('countries.eg', 'مصر')",
  "'الإمارات'": "t('countries.ae', 'الإمارات')",
  "'الكويت'": "t('countries.kw', 'الكويت')",
  "'الأردن'": "t('countries.jo', 'الأردن')",
  "'عالمي'": "t('countries.intl', 'عالمي')",
  "'الأعلى مشاهدةً'": "t('tournaments.sort.viewersDesc', 'الأعلى مشاهدةً')",
  "'الأكثر تصويتاً'": "t('tournaments.sort.votesDesc', 'الأكثر تصويتاً')",
  "'المراحل النهائية'": "t('tournaments.sort.finalStage', 'المراحل النهائية')",
  "'الأحدث إضافة'": "t('tournaments.sort.newest', 'الأحدث إضافة')",
  
  "const COMP_COUNTRY_OPTIONS: FilterOption[] = [": "const getCOMP_COUNTRY_OPTIONS = (t: any): FilterOption[] => [",
  "const COMP_SORT_OPTIONS: FilterOption[] = [": "const getCOMP_SORT_OPTIONS = (t: any): FilterOption[] => [",
  
  "options={COMP_COUNTRY_OPTIONS}": "options={getCOMP_COUNTRY_OPTIONS(t)}",
  "options={COMP_SORT_OPTIONS}": "options={getCOMP_SORT_OPTIONS(t)}",
  
  "COMP_COUNTRY_OPTIONS,": "getCOMP_COUNTRY_OPTIONS(t),",
  "COMP_SORT_OPTIONS,": "getCOMP_SORT_OPTIONS(t),",

  "'نصف النهائي'": "t('tournaments.stage.semi', 'نصف النهائي')",
  "'التصفيات'": "t('tournaments.stage.qualifying', 'التصفيات')",

  ">لايف<": ">t('tournaments.badges.live', 'لايف')<",
  ">قريباً · {comp.startTime}<": ">{t('tournaments.badges.upcoming', 'قريباً')} · {comp.startTime}<",
  " مشاهد<": " {t('tournaments.meta.viewers', 'مشاهد')}<",
  " صوت<": " {t('tournaments.meta.votes', 'صوت')}<",
  " مشارك<": " {t('tournaments.meta.participants', 'مشارك')}<",
  ">مشاهدة<": ">{t('tournaments.actions.watch', 'مشاهدة')}<",
  ">تصويت<": ">{t('tournaments.actions.vote', 'تصويت')}<",
  "comp.stage === 'voting' ? 'تصويت' : 'مشاهدة'": "comp.stage === 'voting' ? t('tournaments.actions.vote', 'تصويت') : t('tournaments.actions.watch', 'مشاهدة')",
  ">إعلان<": ">{t('tournaments.ad.tag', 'إعلان')}<",
  ">اكتشف<": ">{t('tournaments.ad.discover', 'اكتشف')}<",
  ">مسابقات مميزة<": ">{t('tournaments.sections.featured', 'مسابقات مميزة')}<",
  ">يجري الآن<": ">{t('tournaments.sections.active', 'يجري الآن')}<",
  "placeholder=\"ابحث في مسابقات لايف\"": "placeholder={t('tournaments.search.placeholder', 'ابحث في مسابقات لايف')}",
  "label=\"الحالة\"": "label={t('tournaments.filters.status', 'الحالة')}",
  "label=\"التصنيف\"": "label={t('tournaments.filters.category', 'التصنيف')}",
  "label=\"البلد\"": "label={t('tournaments.filters.country', 'البلد')}",
  ">من أتابعهم<": ">{t('tournaments.sections.following', 'من أتابعهم')}<",
  "هل تريد إنشاء مسابقة؟": "{t('tournaments.createCta.title', 'هل تريد إنشاء مسابقة؟')}",
  ">حسب الأهلية<": ">{t('tournaments.createCta.eligibility', 'حسب الأهلية')}<",
  ">افتح التصويت وشارك جمهورك مباشرة<": ">{t('tournaments.createCta.hint', 'افتح التصويت وشارك جمهورك مباشرة')}<",
  ">إنشاء<": ">{t('tournaments.createCta.btn', 'إنشاء')}<",
  ">مسابقات لايف مفتوحة للمشاهدة والتصويت للجميع. الإنشاء حسب أهلية الحساب.<": ">{t('tournaments.footerNote', 'مسابقات لايف مفتوحة للمشاهدة والتصويت للجميع. الإنشاء حسب أهلية الحساب.')}<"
};

for (const [key, value] of Object.entries(replacements)) {
  code = code.split(key).join(value);
}

fs.writeFileSync(file, code);
console.log('Done replacing TournamentsLivePage!');
