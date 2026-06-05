const fs = require('fs');

const file = 'apps/web/src/pages/create/AudioCreatePage.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacements = [
  ["{audioAsset.sourceType === 'recorded' ? 'مسجّل' : 'مرفوع'}", "{audioAsset.sourceType === 'recorded' ? t('review. مسجّل') : t('review. مرفوع')}"],
  ["<span>المدة:</span>", "<span>{t('mixing.المدة:')}</span>"],
  ["<span>الحجم:</span>", "<span>{t('mixing.الحجم:')}</span>"],
  ["<span>النوع:</span>", "<span>{t('mixing.النوع:')}</span>"],
  ["لا يوجد ملف صوتي — لا يمكن النشر.", "{t('review.لا يوجد ملف صوتي — لا يمكن النشر.')}"],
  ["المؤثرات والمكساج", "{t('mixing.المؤثرات والمكساج')}"],
  ["<span>المؤثرات:</span>", "<span>{t('mixing.المؤثرات:')}</span>"],
  ["'إعداد مسبق'", "t('mixing.إعداد مسبق')"],
  ["\`${manualFilters.filter(f => f.enabled).length} فلاتر يدوية\`", "\`${manualFilters.filter(f => f.enabled).length} ${t('mixing. فلاتر يدوية')}\`"],
  [">مفعّل<", ">{t('mixing.مفعّل')}<"],
  ["المعاينة متاحة", "{t('mixing.المعاينة متاحة')}"],
  ["تم التخطي — لم يتم تطبيق أي معالجة", "{t('mixing.تم التخطي — لم يتم تطبيق أي معالجة')}"],
  ["<span>المكساج:</span>", "<span>{t('mixing.المكساج:')}</span>"],
  ["'مخصص'", "t('mixing.مخصص')"],
  ["'ضبط يدوي'", "t('mixing.ضبط يدوي')"],
  ["صوتك:", "{t('mixing.صوتك:')}"],
  ["ماستر:", "{t('mixing.ماستر:')}"],
  ["خفض تلقائي (مؤجل)", "{t('mixing.خفض تلقائي (مؤجل)')}"],
  ["موسيقى:", "{t('mixing.موسيقى:')}"],
  ["'مرفوعة'", "t('mixing.مرفوعة')"],
  ["مؤثرات:", "{t('mixing.مؤثرات:')}"],
  ["مؤثر", "{t('mixing.مؤثر')}"],
  ["تم التخطي — لم يتم تطبيق أي خلط", "{t('mixing.تم التخطي — لم يتم تطبيق أي خلط')}"],
  ["<span>القص والتعديل:</span>", "<span>{t('mixing.القص والتعديل:')}</span>"],
  ["قص مفعّل", "{t('mixing.قص مفعّل')}"],
  ["بداية:", "{t('mixing.بداية:')}"],
  ["نهاية:", "{t('mixing.نهاية:')}"],
  ["مقطع محذوف", "{t('mixing.مقطع محذوف')}"],
];

replacements.forEach(([search, replace]) => {
  code = code.split(search).join(replace);
});

fs.writeFileSync(file, code);
console.log('Arabic strings replaced in step 10!');
