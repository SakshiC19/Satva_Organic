
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

checkUsers();
