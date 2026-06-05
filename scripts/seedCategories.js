const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assumes we have a service account key

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

const categories = [
  {
    id: 'business',
    worldIds: ['general', 'kids'],
    name: { en: 'Business', ar: 'الأعمال' },
    subcategories: [
      { id: 'careers', name: { en: 'Careers', ar: 'المسار المهني' } },
      { id: 'entrepreneurship', name: { en: 'Entrepreneurship', ar: 'ريادة الأعمال' } },
      { id: 'investing', name: { en: 'Investing', ar: 'الاستثمار' } },
      { id: 'management', name: { en: 'Management', ar: 'الإدارة' } },
      { id: 'marketing', name: { en: 'Marketing', ar: 'التسويق' } },
    ]
  },
  {
    id: 'comedy',
    worldIds: ['general'],
    name: { en: 'Comedy', ar: 'الكوميديا' },
    subcategories: [
      { id: 'comedy_interviews', name: { en: 'Comedy Interviews', ar: 'مقابلات كوميدية' } },
      { id: 'improv', name: { en: 'Improv', ar: 'الارتجال' } },
      { id: 'stand_up', name: { en: 'Stand-up', ar: 'ستاند أب' } },
    ]
  },
  {
    id: 'education',
    worldIds: ['general', 'kids', 'quran'],
    name: { en: 'Education', ar: 'التعليم' },
    subcategories: [
      { id: 'courses', name: { en: 'Courses', ar: 'الدورات' } },
      { id: 'how_to', name: { en: 'How To', ar: 'كيف تفعل' } },
      { id: 'language_learning', name: { en: 'Language Learning', ar: 'تعلم اللغات' } },
      { id: 'self_improvement', name: { en: 'Self-Improvement', ar: 'تطوير الذات' } },
    ]
  },
  {
    id: 'fiction',
    worldIds: ['general', 'kids'],
    name: { en: 'Fiction', ar: 'الخيال' },
    subcategories: [
      { id: 'drama', name: { en: 'Drama', ar: 'دراما' } },
      { id: 'sci_fi', name: { en: 'Science Fiction', ar: 'خيال علمي' } }
    ]
  },
  {
    id: 'health',
    worldIds: ['general'],
    name: { en: 'Health & Fitness', ar: 'الصحة واللياقة' },
    subcategories: [
      { id: 'alternative_health', name: { en: 'Alternative Health', ar: 'الطب البديل' } },
      { id: 'fitness', name: { en: 'Fitness', ar: 'اللياقة' } },
      { id: 'mental_health', name: { en: 'Mental Health', ar: 'الصحة النفسية' } },
      { id: 'nutrition', name: { en: 'Nutrition', ar: 'التغذية' } },
    ]
  },
  {
    id: 'history',
    worldIds: ['general', 'quran'],
    name: { en: 'History', ar: 'التاريخ' },
    subcategories: []
  },
  {
    id: 'kids',
    worldIds: ['kids'],
    name: { en: 'Kids & Family', ar: 'الأطفال والعائلة' },
    subcategories: [
      { id: 'education_for_kids', name: { en: 'Education for Kids', ar: 'تعليم الأطفال' } },
      { id: 'parenting', name: { en: 'Parenting', ar: 'التربية' } },
      { id: 'stories_for_kids', name: { en: 'Stories for Kids', ar: 'قصص الأطفال' } },
    ]
  },
  {
    id: 'music',
    worldIds: ['general'],
    name: { en: 'Music', ar: 'الموسيقى' },
    subcategories: [
      { id: 'music_commentary', name: { en: 'Music Commentary', ar: 'التعليق الموسيقي' } },
      { id: 'music_history', name: { en: 'Music History', ar: 'تاريخ الموسيقى' } },
      { id: 'music_interviews', name: { en: 'Music Interviews', ar: 'مقابلات موسيقية' } },
    ]
  },
  {
    id: 'news',
    worldIds: ['general'],
    name: { en: 'News', ar: 'الأخبار' },
    subcategories: [
      { id: 'business_news', name: { en: 'Business News', ar: 'أخبار الأعمال' } },
      { id: 'daily_news', name: { en: 'Daily News', ar: 'الأخبار اليومية' } },
      { id: 'entertainment_news', name: { en: 'Entertainment News', ar: 'أخبار الترفيه' } },
      { id: 'news_commentary', name: { en: 'News Commentary', ar: 'التعليق الإخباري' } },
      { id: 'politics', name: { en: 'Politics', ar: 'السياسة' } },
      { id: 'sports_news', name: { en: 'Sports News', ar: 'الأخبار الرياضية' } },
      { id: 'tech_news', name: { en: 'Tech News', ar: 'الأخبار التقنية' } },
    ]
  },
  {
    id: 'religion',
    worldIds: ['general', 'quran'],
    name: { en: 'Religion & Spirituality', ar: 'الدين والروحانيات' },
    subcategories: [
      { id: 'islam', name: { en: 'Islam', ar: 'الإسلام' } },
      { id: 'spirituality', name: { en: 'Spirituality', ar: 'الروحانيات' } },
    ]
  },
  {
    id: 'science',
    worldIds: ['general', 'kids'],
    name: { en: 'Science', ar: 'العلوم' },
    subcategories: [
      { id: 'astronomy', name: { en: 'Astronomy', ar: 'علم الفلك' } },
      { id: 'chemistry', name: { en: 'Chemistry', ar: 'الكيمياء' } },
      { id: 'earth_sciences', name: { en: 'Earth Sciences', ar: 'علوم الأرض' } },
      { id: 'life_sciences', name: { en: 'Life Sciences', ar: 'علوم الحياة' } },
      { id: 'mathematics', name: { en: 'Mathematics', ar: 'الرياضيات' } },
      { id: 'nature', name: { en: 'Nature', ar: 'الطبيعة' } },
      { id: 'physics', name: { en: 'Physics', ar: 'الفيزياء' } },
      { id: 'social_sciences', name: { en: 'Social Sciences', ar: 'العلوم الاجتماعية' } },
    ]
  },
  {
    id: 'society',
    worldIds: ['general'],
    name: { en: 'Society & Culture', ar: 'المجتمع والثقافة' },
    subcategories: [
      { id: 'documentary', name: { en: 'Documentary', ar: 'وثائقي' } },
      { id: 'personal_journals', name: { en: 'Personal Journals', ar: 'يوميات شخصية' } },
      { id: 'philosophy', name: { en: 'Philosophy', ar: 'الفلسفة' } },
      { id: 'places_and_travel', name: { en: 'Places & Travel', ar: 'الأماكن والسفر' } },
      { id: 'relationships', name: { en: 'Relationships', ar: 'العلاقات' } },
    ]
  },
  {
    id: 'sports',
    worldIds: ['general'],
    name: { en: 'Sports', ar: 'الرياضة' },
    subcategories: [
      { id: 'football', name: { en: 'Football', ar: 'كرة القدم' } },
      { id: 'basketball', name: { en: 'Basketball', ar: 'كرة السلة' } },
      { id: 'tennis', name: { en: 'Tennis', ar: 'التنس' } },
      { id: 'combat_sports', name: { en: 'Combat Sports', ar: 'الرياضات القتالية' } }
    ]
  },
  {
    id: 'technology',
    worldIds: ['general'],
    name: { en: 'Technology', ar: 'التكنولوجيا' },
    subcategories: []
  },
  {
    id: 'true_crime',
    worldIds: ['general'],
    name: { en: 'True Crime', ar: 'الجرائم الحقيقية' },
    subcategories: []
  },
  {
    id: 'tv_film',
    worldIds: ['general'],
    name: { en: 'TV & Film', ar: 'التلفزيون والسينما' },
    subcategories: [
      { id: 'after_shows', name: { en: 'After Shows', ar: 'ما بعد العرض' } },
      { id: 'film_history', name: { en: 'Film History', ar: 'تاريخ السينما' } },
      { id: 'film_interviews', name: { en: 'Film Interviews', ar: 'مقابلات سينمائية' } },
      { id: 'film_reviews', name: { en: 'Film Reviews', ar: 'مراجعات الأفلام' } },
      { id: 'tv_reviews', name: { en: 'TV Reviews', ar: 'مراجعات التلفزيون' } },
    ]
  }
];

async function seed() {
  const batch = db.batch();
  for (const cat of categories) {
    const docRef = db.collection('categories').doc(cat.id);
    batch.set(docRef, cat);
  }
  await batch.commit();
  console.log('Successfully seeded all categories to Firestore!');
}

seed().catch(console.error);
