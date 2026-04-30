import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/utils/db/firebase-admin";

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
      const { name, email, license, status } = req.body as { name?: string; email?: string; license?: string; status?: string };
      if (!name || !email || !license || !status) {
        return res.status(400).json({ error: "Name, email, license, and status are required" });
      }

      await docRef.update({ name, email, license, status });
      return res.status(200).json({ error: "" });
    }

    if (req.method === "DELETE") {
      await docRef.delete();
      return res.status(200).json({ error: "" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(`Failed to ${req.method} user ${id}:`, error);
    return res.status(500).json({ error: "Failed to update user record" });
  }
}