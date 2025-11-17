import { Router } from "express";
import Resume from "../models/Resume.js";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";
import { upload } from "../utils/upload.js";
import { sendEmail } from "../utils/sendEmail.js";
import path from "path";
import fs from "fs";

const router = Router();

router.post("/", auth, allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF), upload.single("resume"), async (req, res) => {
  const { candidateName, email, phone, position, experienceYears } = req.body;
  const doc = await Resume.create({
    candidateName, email, phone, position, experienceYears,
    resumeFileName: req.file?.filename, createdBy: req.user.id,
    history: [{ status: "awaiting_hr", by: req.user.id, note: "Created" }]
  });
  // email (optional)
  await sendEmail({ to: email, subject: "Application received", html: `<p>Hi ${candidateName},<br/>Your application for <b>${position || "a role"}</b> has been received.</p>` });
  res.status(201).json(doc);
});

router.get("/", auth, allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF), async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [
    { candidateName: new RegExp(q, "i") },
    { email: new RegExp(q, "i") },
    { phone: new RegExp(q, "i") },
    { position: new RegExp(q, "i") }
  ];
  const items = await Resume.find(filter).sort({ createdAt: -1 });
  res.json(items);
});

router.patch("/:id/status", auth, allow(ROLES.ADMIN, ROLES.HR), async (req, res) => {
  const { status, note } = req.body;
  const allowed = ["screening_done", "selected", "awaiting_hr", "rejected"];
  if (!allowed.includes(status)) return res.status(400).json({ message: "Bad status" });
  const doc = await Resume.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  doc.status = status;
  doc.history.push({ status, note, by: req.user.id });
  await doc.save();

  if (["selected", "awaiting_hr"].includes(status)) {
    await sendEmail({ to: doc.email, subject: `Update: ${status.replace("_", " ").toUpperCase()}`, html: `<p>Hi ${doc.candidateName}, your application is now <b>${status.replaceAll("_", " ")}</b>.<br/>${note || ""}</p>` });
  }
  res.json(doc);
});

router.get("/:id/download", auth, allow(ROLES.ADMIN, ROLES.HR), async (req, res) => {
  const doc = await Resume.findById(req.params.id);
  if (!doc || !doc.resumeFileName) return res.status(404).json({ message: "File not found" });
  const filePath = path.join(process.cwd(), "uploads", doc.resumeFileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing on server" });
  res.download(filePath, doc.resumeFileName);
});

export default router;
