import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/utils/db/firebase-admin";

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
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }

      await docRef.update({ name, email, password });
      return res.status(200).json({ error: "" });
    }

    if (req.method === "DELETE") {
      await docRef.delete();
      return res.status(200).json({ error: "" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(`Failed to ${req.method} admin ${id}:`, error);
    return res.status(500).json({ error: "Failed to update admin record" });
  }
}
