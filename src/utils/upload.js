// src/utils/upload.js
import multer from "multer";

// We no longer use the local "uploads" folder on Render.
// Files will be kept in memory and then pushed to Cloudinary.

// Store file in memory buffer
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    const ok = ["pdf", "doc", "docx"].includes(ext || "");
    cb(ok ? null : new Error("Only PDF/DOC/DOCX allowed"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // up to 10 MB
});
