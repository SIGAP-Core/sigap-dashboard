import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb, adminAuth } from "@/utils/db/firebase-admin";

type AdminErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AdminErrorResponse>,
) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  const docRef = adminDb.collection("admin").doc(id);

  try {
    if (req.method === "PUT") {
      const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Update Firestore document with provided fields
      const updateData: any = { name };
      if (email) {
        updateData.email = email;
      }
      await docRef.update(updateData);

      // Update password in Firebase Authentication if provided
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        try {
          await adminAuth.updateUser(id, { password });
        } catch (authError) {
          if (authError instanceof Error && (authError as any).code === "auth/user-not-found") {
            console.warn(`Firebase auth user not found for admin id ${id}, skipping password update.`);
          } else {
            throw authError;
          }
        }
      }

      return res.status(200).json({ error: "" });
    }

    if (req.method === "DELETE") {
      // Delete from Firebase Authentication if present
      try {
        await adminAuth.deleteUser(id);
      } catch (authError) {
        if (authError instanceof Error && (authError as any).code === "auth/user-not-found") {
          console.warn(`Firebase auth user not found for admin id ${id}, skipping auth deletion.`);
        } else {
          throw authError;
        }
      }
      
      // Delete from Firestore
      await docRef.delete();
      
      return res.status(200).json({ error: "" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(`Failed to ${req.method} admin ${id}:`, error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to update admin record" });
  }
}
