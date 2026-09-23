import type { Request, Response } from "express";

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided." });
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
}
