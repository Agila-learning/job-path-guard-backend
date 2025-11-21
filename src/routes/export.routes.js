import { Router } from "express";
import ExcelJS from "exceljs";
import Resume from "../models/Resume.js";
import { auth } from "../middleware/auth.js";
import { ROLES } from "../middleware/roles.js";

const router = Router();

async function writeResumesToExcel(res, resumes, filename) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Resumes");

  sheet.columns = [
    { header: "Candidate Name", key: "candidateName", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Position", key: "position", width: 25 },
    { header: "Experience (years)", key: "experienceYears", width: 18 },
    { header: "Status", key: "status", width: 18 },
    { header: "Employee Feedback", key: "employeeFeedback", width: 30 },
    { header: "HR Feedback", key: "hrFeedback", width: 30 },
    { header: "Created At", key: "createdAt", width: 22 },
  ];

  resumes.forEach((r) => {
    sheet.addRow({
      candidateName: r.candidateName || "",
      email: r.email || "",
      phone: r.phone || "",
      position: r.position || "",
      experienceYears: r.experienceYears ?? "",
      status: r.status || "awaiting_hr",
      employeeFeedback: r.employeeFeedback || "",
      hrFeedback: r.hrFeedback || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

// GET /api/export  → All resumes (Admin/HR)
router.get("/", auth, async (req, res) => {
  try {
    if (![ROLES.ADMIN, ROLES.HR].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const resumes = await Resume.find().lean();
    await writeResumesToExcel(res, resumes, "resumes_all.xlsx");
  } catch (err) {
    console.error("Export all resumes error:", err);
    res.status(500).json({ message: "Failed to export resumes" });
  }
});

// GET /api/export/mine  → resumes createdBy current user
router.get("/mine", auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ createdBy: req.user.id }).lean();
    await writeResumesToExcel(res, resumes, "resumes_mine.xlsx");
  } catch (err) {
    console.error("Export my resumes error:", err);
    res.status(500).json({ message: "Failed to export your resumes" });
  }
});

export default router;
