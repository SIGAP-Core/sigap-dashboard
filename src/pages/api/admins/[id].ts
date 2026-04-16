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
      const { name, email } = req.body as { name?: string; email?: string };
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      await docRef.update({ name, email });
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
