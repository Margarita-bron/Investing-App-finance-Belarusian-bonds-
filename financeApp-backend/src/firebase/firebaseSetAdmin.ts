import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

export function setAdmin(uid: string) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT не найден в .env файле");
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

  admin
    .auth()
    .setCustomUserClaims(uid, { admin: true })
    .then(() => console.log("Права админа успешно выданы!"));
}
