import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb, adminAuth } from "@/utils/db/firebase-admin";

type AdminRecord = {
  id: string;
  name: string;
  email: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminRecord[] | AdminRecord | ErrorResponse>,
) {
  if (req.method === "GET") {
    try {
      const snapshot = await adminDb.collection("admin").get();
      const admins: AdminRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: (data.name as string) || "Unknown Admin",
          email: (data.email as string) || "no-reply@smartgate.sys",
        };
      });

      return res.status(200).json(admins);
    } catch (error) {
      console.error("Failed to fetch admin records from Firestore:", error);
      return res.status(500).json({ error: "Failed to fetch admin records" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Create user in Firebase Authentication
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });

      // Store admin metadata in Firestore (without password)
      await adminDb.collection("admin").doc(userRecord.uid).set({
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      return res.status(201).json({ id: userRecord.uid, name, email } as AdminRecord);
    } catch (error) {
      console.error("Failed to add admin record:", error);
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return res.status(400).json({ error: "Email already exists in authentication system" });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to add admin record" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
