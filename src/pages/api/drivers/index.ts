import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/utils/db/firebase-admin";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  license: string;
  status: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserRecord[] | UserRecord | ErrorResponse>,
) {
  if (req.method === "GET") {
    try {
      const snapshot = await adminDb.collection("driver").get();
      const users: UserRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: (data.name as string) || "Unknown User",
          email: (data.email as string) || "no-reply@smartgate.sys",
          license: (data.license as string) || "",
          status: (data.status as string) || "inactive",
        };
      });

      return res.status(200).json(users);
    } catch (error) {
      console.error("Failed to fetch user records from Firestore:", error);
      return res.status(500).json({ error: "Failed to fetch user records" });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, email, license, status } = req.body as { name?: string; email?: string; license?: string; status?: string };
      if (!name || !email || !license || !status) {
        return res.status(400).json({ error: "Name, email, license, and status are required" });
      }

      const docRef = await adminDb.collection("driver").add({ name, email, license, status });
      return res.status(201).json({ id: docRef.id, name, email, license, status } as UserRecord);
    } catch (error) {
      console.error("Failed to add user record to Firestore:", error);
      return res.status(500).json({ error: "Failed to add user record" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}