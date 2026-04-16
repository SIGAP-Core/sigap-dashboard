import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../utils/db/firebase-admin";

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
      const { name, email } = req.body as { name?: string; email?: string };
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const docRef = await adminDb.collection("admin").add({ name, email });
      return res.status(201).json({ id: docRef.id, name, email } as AdminRecord);
    } catch (error) {
      console.error("Failed to add admin record to Firestore:", error);
      return res.status(500).json({ error: "Failed to add admin record" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
