import { useState, useEffect } from 'react';
import { getFirestore } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { collection as fsCollection, query as fsQuery, where as fsWhere, getDocs, onSnapshot as fsOnSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

export interface CategoryData {
  id: string;
  worldIds: string[];
  name: { ar: string; en: string };
  subcategories: { id: string; name: { ar: string; en: string } }[];
  order?: number;
}

export function useCategories(worldId: string) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  useEffect(() => {
    if (!worldId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const categoriesRef = fsCollection(db, 'categories');
    const q = fsQuery(categoriesRef, fsWhere('worldIds', 'array-contains', worldId));

    const unsubscribe = fsOnSnapshot(q, (snapshot) => {
      const data: CategoryData[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as CategoryData);
      });
      // Sort by order if available
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching categories:', err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [worldId]);

  // Helper function to get localized category options for dropdowns/chips
  const categoryOptions = categories.map(cat => ({
    id: cat.id,
    label: cat.name[lang] || cat.name.en || cat.name.ar || cat.id,
  }));

  // Helper function to get subcategories for a selected category ID
  const getSubcategoryOptions = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat || !cat.subcategories) return [];
    return cat.subcategories.map(sub => ({
      id: sub.id,
      label: sub.name[lang] || sub.name.en || sub.name.ar || sub.id,
    }));
  };

  return {
    categories,
    categoryOptions,
    getSubcategoryOptions,
    loading,
    error
  };
}
