import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

console.log("Config project ID:", config.projectId);
console.log("Config DB ID:", config.firestoreDatabaseId);

const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountVar) {
  console.log("NO SA!!!");
} else {
  const sa = JSON.parse(serviceAccountVar);
  console.log("Using SA:", sa.client_email);
  const app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: config.projectId
  });
  
  const db = getFirestore(app, config.firestoreDatabaseId);
  db.collection('_health_check_').limit(1).get()
    .then(() => {
      console.log("SUCCESS with named DB!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("FAIL with named DB:", err.message);
      
      const defaultDb = getFirestore(app);
      defaultDb.collection('_health_check_').limit(1).get()
        .then(() => {
            console.log("SUCCESS with default DB!");
            process.exit(0);
        })
        .catch(err2 => {
            console.log("FAIL with default DB:", err2.message);
            process.exit(1);
        });
    });
}
