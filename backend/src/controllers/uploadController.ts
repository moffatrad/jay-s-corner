import type { Request, Response } from "express";
import { uploadBufferToCloudinary } from "../lib/cloudinary";

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }
  const url = await uploadBufferToCloudinary(req.file.buffer);
  res.status(201).json({ url });
}
