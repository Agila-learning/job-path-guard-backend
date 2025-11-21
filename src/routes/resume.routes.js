// routes/resumeRoutes.js
import { Router } from "express";
import path from "path";
import fs from "fs";

import Resume from "../models/Resume.js";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";
import { upload } from "../utils/upload.js";
import { sendEmail } from "../utils/sendEmail.js";


const router = Router();

// Adjust this if your uploads folder is different
const UPLOAD_DIR = path.resolve("uploads");

/* ==========================
 * CREATE RESUME (Employee / HR / Admin)
 * POST /api/resumes
 * ========================== */
router.post(
  "/",
  auth,
  // if earlier you used STAFF/EMPLOYEE etc, keep as is:
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  upload.single("resume"),
  async (req, res) => {
    try {
      const { candidateName, email, phone, position, experienceYears } = req.body;

      const doc = await Resume.create({
        candidateName,
        email,
        phone,
        position,
        experienceYears,
        resumeFileName: req.file?.filename,
        createdBy: req.user.id,
        history: [
          {
            status: "awaiting_hr",
            by: req.user.id,
            note: "Created",
            at: new Date(),
          },
        ],
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error("Create resume error", err);
      res.status(500).json({ message: "Failed to create resume" });
    }
  }
);

/* ==========================
 * LIST RESUMES – HR/Admin see all, Employee only their own
 * GET /api/resumes
 * ========================== */
router.get("/", auth, async (req, res) => {
  try {
    let filter = {};
    // if an employee hits this, restrict to their own
    if (req.user.role === "employee") {
      filter = { createdBy: req.user.id };
    }

    const resumes = await Resume.find(filter).sort({ createdAt: -1 });
    res.json(resumes);
  } catch (err) {
    console.error("Get resumes error", err);
    res.status(500).json({ message: "Failed to load resumes" });
  }
});

/* ==========================
 * Employee – my resumes only
 * GET /api/resumes/mine
 * ========================== */
router.get("/mine", auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(resumes);
  } catch (err) {
    console.error("Get my resumes error", err);
    res.status(500).json({ message: "Failed to load your resumes" });
  }
});

/* ==========================
 * UPDATE STATUS (awaiting_hr / screening_done / selected / rejected)
 * PATCH /api/resumes/:id/status
 * ========================== */
router.patch(
  "/:id/status",
  auth,
  allow(ROLES.HR, ROLES.ADMIN),
  async (req, res) => {
    try {
      const { status, note, hrName } = req.body;

      const resume = await Resume.findById(req.params.id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      resume.status = status || resume.status;
      if (hrName) {
        resume.screenedBy = hrName;
      }

      resume.history = resume.history || [];
      resume.history.push({
        status: resume.status,
        by: req.user.id,
        note: note || `Status changed to ${status}`,
        at: new Date(),
      });

      await resume.save();
      res.json(resume);
    } catch (err) {
      console.error("Update status error", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  }
);

/* ==========================
 * FEEDBACK (Employee OR HR/Admin)
 * PATCH /api/resumes/:id/feedback
 * ========================== */
router.patch("/:id/feedback", auth, async (req, res) => {
  try {
    const { feedback } = req.body;

    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    if (req.user.role === "employee") {
      resume.employeeFeedback = feedback;
    } else {
      // hr or admin
      resume.hrFeedback = feedback;
    }

    await resume.save();
    res.json(resume);
  } catch (err) {
    console.error("Update feedback error", err);
    res.status(500).json({ message: "Failed to update feedback" });
  }
});

/* ==========================
 * BASIC EDIT (Admin – candidate info)
 * PATCH /api/resumes/:id
 * ========================== */
router.patch("/:id", auth, allow(ROLES.ADMIN), async (req, res) => {
  try {
    const { candidateName, email, phone, position, experienceYears } = req.body;

    const resume = await Resume.findByIdAndUpdate(
      req.params.id,
      {
        ...(candidateName !== undefined ? { candidateName } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(position !== undefined ? { position } : {}),
        ...(experienceYears !== undefined ? { experienceYears } : {}),
      },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.json(resume);
  } catch (err) {
    console.error("Update resume basic error", err);
    res.status(500).json({ message: "Failed to update candidate" });
  }
});

/* ==========================
 * DELETE RESUME (Admin)
 * DELETE /api/resumes/:id
 * ========================== */
router.delete("/:id", auth, allow(ROLES.ADMIN), async (req, res) => {
  try {
    const resume = await Resume.findByIdAndDelete(req.params.id);
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Delete resume error", err);
    res.status(500).json({ message: "Failed to delete candidate" });
  }
});

/* ==========================
 * DOWNLOAD RESUME FILE
 * GET /api/resumes/:id/download
 * ========================== */
router.get("/:id/download", auth, async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume || !resume.resumeFileName) {
      return res.status(404).send("Resume file not found");
    }

    const filePath = path.join(UPLOAD_DIR, resume.resumeFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found on server");
    }

    res.download(filePath, resume.resumeFileName);
  } catch (err) {
    console.error("Download resume error", err);
    res.status(500).send("Failed to download");
  }
});

/* ==========================
 * TAG HR OWNER (screenedBy)
 * PATCH /api/resumes/:id/hr-owner
 * ========================== */
router.patch(
  "/:id/hr-owner",
  auth,
  allow(ROLES.HR, ROLES.ADMIN),
  async (req, res) => {
    try {
      const { screenedBy } = req.body;

      const resume = await Resume.findByIdAndUpdate(
        req.params.id,
        { screenedBy },
        { new: true }
      );

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }
      res.json(resume);
    } catch (err) {
      console.error("hr-owner update error", err);
      res.status(500).json({ message: "Failed to update HR owner" });
    }
  }
);

/* ==========================
 * SCHEDULE INTERVIEW + SEND MAIL
 * POST /api/resumes/:id/schedule-interview
 * ========================== */
router.post(
  "/:id/schedule-interview",
  auth,
  allow(ROLES.HR, ROLES.ADMIN),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date, time, mode, link, location, message } = req.body;

      const resume = await Resume.findById(id);
      if (!resume) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      if (!resume.email) {
        return res
          .status(400)
          .json({ message: "Candidate email not found; cannot send invite." });
      }

      const interviewDate = date || "To be confirmed";
      const interviewTime = time || "To be confirmed";
      const interviewMode = mode || "online";

      const interviewLinkOrLocation =
        interviewMode.toLowerCase() === "online"
          ? link || "Link will be shared later"
          : location || "Office location will be shared later";

      const customMessage =
        message ||
        `Dear ${resume.candidateName || "Candidate"},\n\nYou have been shortlisted for an interview. Please find the details below.`;

      const html = `
        <p>${customMessage.replace(/\n/g, "<br/>")}</p>
        <p>
          <strong>Date:</strong> ${interviewDate}<br/>
          <strong>Time:</strong> ${interviewTime}<br/>
          <strong>Mode:</strong> ${interviewMode}<br/>
          <strong>${
            interviewMode.toLowerCase() === "online" ? "Meeting Link" : "Location"
          }:</strong> ${interviewLinkOrLocation}
        </p>
        <p>
          Regards,<br/>
          HR Team<br/>
          Forge India Connect Pvt. Ltd.
        </p>
      `;

      await sendEmail({
        to: resume.email,
        subject: "Interview Schedule - Forge India Connect",
        html,
      });

      // store interview info on document (optional but useful)
      resume.interview = {
        date: interviewDate,
        time: interviewTime,
        mode: interviewMode,
        link: link || "",
        location: location || "",
        message: customMessage,
        scheduledBy: req.user.id,
        scheduledAt: new Date(),
      };

      resume.history = resume.history || [];
      resume.history.push({
        status: "interview_scheduled",
        by: req.user.id,
        note: `Interview scheduled on ${interviewDate} ${interviewTime} (${interviewMode})`,
        at: new Date(),
      });

      await resume.save();

      res.json({
        message: "Interview scheduled and email sent.",
        resume,
      });
    } catch (err) {
      console.error("Schedule interview error", err);
      res
        .status(500)
        .json({ message: "Failed to schedule interview", error: err.message });
    }
  }
);

export default router;
