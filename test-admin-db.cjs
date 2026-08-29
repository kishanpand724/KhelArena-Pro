const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

initializeApp({ projectId: firebaseConfig.projectId });

async function run() {
  console.log("Testing default DB");
  try {
    const db1 = getFirestore();
    await db1.collection('test').doc('test').set({ a: 1 });
    console.log("Default DB write SUCCESS");
  } catch(e) { console.log("Default DB error:", e.message); }

  console.log("Testing named DB:", firebaseConfig.firestoreDatabaseId);
  try {
    const db2 = getFirestore(firebaseConfig.firestoreDatabaseId);
    await db2.collection('test').doc('test').set({ a: 1 });
    console.log("Named DB write SUCCESS");
  } catch(e) { console.log("Named DB error:", e.message); }
}
run();
