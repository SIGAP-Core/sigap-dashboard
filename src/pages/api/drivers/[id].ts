import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb, adminAuth } from "@/utils/db/firebase-admin";
import type { UserRecord } from "firebase-admin/auth";

type UserErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserErrorResponse>,
) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Driver ID is required" });
  }

  const docRef = adminDb.collection("driver").doc(id);

  try {
    if (req.method === "PUT") {
      const { name, email, license, status, password } = req.body as { name?: string; email?: string; license?: string; status?: string; password?: string };
      if (!name || !email || !license || !status) {
        return res.status(400).json({ error: "Name, email, license, and status are required" });
      }

      // Try to fetch existing auth user so we can update and possibly rollback
      let previousAuth: UserRecord | null = null;
      try {
        previousAuth = await adminAuth.getUser(id);
      } catch (getErr) {
        if (getErr instanceof Error && (getErr as any).code === "auth/user-not-found") {
          console.warn(`Firebase auth user not found for driver id ${id}, will only update Firestore.`);
          previousAuth = null;
        } else {
          throw getErr;
        }
      }

      // Prepare auth update if auth user exists
      let authUpdated = false;
      if (previousAuth) {
        const authUpdate: any = { email, displayName: name };
        if (password) {
          if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
          }
          authUpdate.password = password;
        }

        try {
          await adminAuth.updateUser(id, authUpdate);
          authUpdated = true;
        } catch (authError) {
          if (authError instanceof Error) {
            const code = (authError as any).code;
            if (code === "auth/email-already-exists") {
              return res.status(400).json({ error: "Email already exists in authentication system" });
            }
            if (code === "auth/user-not-found") {
              console.warn(`Firebase auth user not found for driver id ${id}, skipping auth update.`);
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        }
      }

      // Update Firestore document
      const updateData: any = { name, email, license, status };
      try {
        await docRef.update(updateData);
      } catch (fireErr) {
        // If Firestore update fails but we already updated auth, attempt rollback of auth email/displayName
        if (authUpdated && previousAuth) {
          try {
            const rollbackData: any = {};
            if (previousAuth.email) rollbackData.email = previousAuth.email;
            if (previousAuth.displayName) rollbackData.displayName = previousAuth.displayName;
            await adminAuth.updateUser(id, rollbackData);
            console.warn(`Rolled back auth changes for user ${id} after Firestore failure.`);
          } catch (rollbackErr) {
            console.error(`Failed to rollback auth changes for user ${id}:`, rollbackErr);
          }
        }
        throw fireErr;
      }

      return res.status(200).json({ error: "" });
    }

    if (req.method === "DELETE") {
      // Delete from Firebase Authentication if present
      try {
        await adminAuth.deleteUser(id);
      } catch (authError) {
        if (authError instanceof Error && (authError as any).code === "auth/user-not-found") {
          console.warn(`Firebase auth user not found for driver id ${id}, skipping auth deletion.`);
        } else {
          throw authError;
        }
      }

      // Delete Firestore document
      await docRef.delete();
      return res.status(200).json({ error: "" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(`Failed to ${req.method} user ${id}:`, error);
    return res.status(500).json({ error: "Failed to update user record" });
  }
}
