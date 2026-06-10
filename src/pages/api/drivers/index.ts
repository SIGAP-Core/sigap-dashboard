import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb, adminAuth } from "@/utils/db/firebase-admin";

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
      const { name, email, license, status, password } = req.body as { name?: string; email?: string; license?: string; status?: string; password?: string };
      if (!name || !email || !license || !status || !password) {
        return res.status(400).json({ error: "Name, email, license, status, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      // Create Firebase Authentication user
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name,
      });

      // Store driver metadata in Firestore using UID as document ID
      const docRef = adminDb.collection("driver").doc(userRecord.uid);
      try {
        await docRef.set({ name, email, license, status, createdAt: new Date().toISOString() });
      } catch (firestoreError) {
        // If Firestore write fails, cleanup created auth user to avoid orphaned accounts
        try {
          await adminAuth.deleteUser(userRecord.uid);
        } catch (cleanupError) {
          console.error("Failed to cleanup auth user after Firestore failure:", cleanupError);
        }
        throw firestoreError;
      }

      return res.status(201).json({ id: userRecord.uid, name, email, license, status } as UserRecord);
    } catch (error) {
      console.error("Failed to add user record to Firestore/Authentication:", error);
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          return res.status(400).json({ error: "Email already exists in authentication system" });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "Failed to add user record" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}