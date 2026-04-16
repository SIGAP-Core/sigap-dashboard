import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

if (!admin.apps.length) {
  const serviceAccountPath = path.join(process.cwd(), "firebase-admin.json");

  console.log("📁 PATH:", serviceAccountPath);

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error("❌ firebase-admin.json NOT FOUND");
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, "utf8")
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized");
}

export const adminDb = admin.firestore();