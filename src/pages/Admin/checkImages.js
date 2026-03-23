const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkProductImages() {
  const snapshot = await db.collection('products').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Product: ${data.name} | Image: ${data.image} | Images: ${JSON.stringify(data.images)}`);
  });
}

checkProductImages().catch(console.error);
