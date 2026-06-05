const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'sound-platform-dev' });
const db = admin.firestore();
db.collection('contentItems').doc('UML0P2Ldh0y4MpULThSN').get().then(doc => {
  console.log(JSON.stringify(doc.data().coverAsset, null, 2));
  process.exit(0);
});
