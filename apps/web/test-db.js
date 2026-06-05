import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const app = initializeApp({
  projectId: 'sound-platform-dev'
});
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'contentItems'), limit(10));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log('---', doc.id, '---');
    console.log('Cover:', JSON.stringify(data.coverAsset));
    console.log('Labels:', data.kind, data.categoryId, data.categoryLabel);
  });
}
run().catch(console.error);
