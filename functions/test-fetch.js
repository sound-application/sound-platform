const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // assuming it exists, or just default init

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

async function run() {
  const doc = await admin.firestore().doc('users/NCbI2J0TfzRPezhugcwQt9Ouq3Z2/audioDrafts/I5udW8P43hb1hGPvtwoH').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}

run().catch(console.error);
