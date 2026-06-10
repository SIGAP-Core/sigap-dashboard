import type { NextApiRequest, NextApiResponse } from "next";
import { readHDFSFile } from "@/lib/hdfs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { path } = req.query;

  if (!path || typeof path !== "string") {
    return res.status(400).json({ error: "Image path is required" });
  }

  try {
    const buffer = await readHDFSFile(path);

    if (!buffer) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error proxying image:", error);
    res.status(500).json({ error: "Failed to fetch image" });
  }
}
