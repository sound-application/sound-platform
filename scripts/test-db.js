const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../functions/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('contentItems').orderBy('createdAt', 'desc').limit(1).get();
  if (snapshot.empty) {
    console.log('No documents found.');
    return;
  }
  const doc = snapshot.docs[0];
  console.log('Document ID:', doc.id);
  console.log('processedAudio:', JSON.stringify(doc.data().processedAudio, null, 2));
  console.log('editConfig:', JSON.stringify(doc.data().editConfig, null, 2));
  console.log('contentProcessingStatus:', doc.data().contentProcessingStatus);
}

run().catch(console.error);
