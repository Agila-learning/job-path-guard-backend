import { Router } from "express";
import ExcelJS from "exceljs";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";
import Resume from "../models/Resume.js";

const router = Router();

router.get("/resumes.xlsx", auth, allow(ROLES.ADMIN, ROLES.HR), async (_req, res) => {
  const rows = await Resume.find().sort({ createdAt: -1 }).lean();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resumes");

  ws.addRow(["Candidate Name", "Email", "Phone", "Position", "Exp (yrs)", "Status", "Created At"]);
  rows.forEach(r => ws.addRow([
    r.candidateName, r.email, r.phone || "", r.position || "", r.experienceYears ?? "", r.status,
    new Date(r.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  ]));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=resumes.xlsx");
  await wb.xlsx.write(res);
  res.end();
});

export default router;
