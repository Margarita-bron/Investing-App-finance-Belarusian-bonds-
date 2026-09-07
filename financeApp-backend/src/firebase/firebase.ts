import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

// serviceAccount — это JSON файл который скачаешь из Firebase консоли
//serviceAccount — объект с полями из JSON ключа сервисного аккаунта
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

if (!serviceAccount) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT не найден в .env файле");
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
export { getAuth, getFirestore };
