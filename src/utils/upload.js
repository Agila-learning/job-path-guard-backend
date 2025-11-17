import multer from "multer";
import path from "path";
import fs from "fs";
const dir = "./uploads";
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"))
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = [".pdf", ".doc", ".docx"].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("Only PDF/DOC/DOCX allowed"), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});
