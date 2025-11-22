// src/routes/resume.routes.js

import { Router } from "express";
import path from "path";
import fs from "fs";

import Resume from "../models/Resume.js";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";
import { upload } from "../utils/upload.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = Router();

/**
 * POST /api/resumes
 * Create / upload a new resume.
 * Roles: ADMIN, HR, STAFF (adjust ROLES.STAFF if your enum is different)
 */
router.post(
  "/",
  auth,
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
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        resumeFileName: req.file?.filename,
        createdBy: req.user.id,
        status: "awaiting_hr",
        history: [
          {
            status: "awaiting_hr",
            by: req.user.id,
            note: "Created",
            at: new Date(),
          },
        ],
      });

      // optional email - never break route if email fails
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: "Application received",
            html: `<p>Hi ${candidateName || "Candidate"},<br/>
              Your application for <b>${position || "a role"}</b> has been received.
            </p>`,
          });
        } catch (err) {
          console.error("sendEmail failed for new resume:", err);
        }
      }

      return res.status(201).json(doc);
    } catch (err) {
      console.error("Error creating resume:", err);
      return res
        .status(500)
        .json({ message: "Failed to create resume. Please try again." });
    }
  }
);

/**
 * GET /api/resumes
 * List all resumes (Admin / HR / Staff).
 */
router.get(
  "/",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  async (req, res) => {
    try {
      const docs = await Resume.find().sort({ createdAt: -1 });
      return res.json(docs);
    } catch (err) {
      console.error("Error fetching resumes:", err);
      return res.status(500).json({ message: "Failed to fetch resumes." });
    }
  }
);

/**
 * GET /api/resumes/mine
 * List resumes created by the logged-in user.
 */
router.get("/mine", auth, async (req, res) => {
  try {
    const docs = await Resume.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(docs);
  } catch (err) {
    console.error("Error fetching my resumes:", err);
    return res.status(500).json({ message: "Failed to fetch your resumes." });
  }
});

/**
 * PATCH /api/resumes/:id/status
 * Update the status (awaiting_hr, in_review, selected, rejected).
 */
router.patch(
  "/:id/status",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note, hrName } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required." });
      }

      const resume = await Resume.findById(id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found." });
      }

      resume.status = status;

      if (hrName) {
        resume.hrOwnerName = hrName;
      }

      resume.history = resume.history || [];
      resume.history.push({
        status,
        note: note || "",
        by: req.user.id,
        at: new Date(),
      });

      await resume.save();
      return res.json(resume);
    } catch (err) {
      console.error("Error updating resume status:", err);
      return res.status(500).json({ message: "Failed to update status." });
    }
  }
);

/**
 * PATCH /api/resumes/:id/feedback
 * Update latestFeedback (employee or HR notes).
 */
router.patch(
  "/:id/feedback",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      if (typeof feedback !== "string") {
        return res
          .status(400)
          .json({ message: "Feedback text is required." });
      }

      const updated = await Resume.findByIdAndUpdate(
        id,
        { latestFeedback: feedback },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Resume not found." });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Error updating resume feedback:", err);
      return res
        .status(500)
        .json({ message: "Failed to update feedback." });
    }
  }
);

/**
 * PATCH /api/resumes/:id/hr-owner
 * Tag the HR owner / screenedBy.
 */
router.patch(
  "/:id/hr-owner",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { screenedBy } = req.body;

      if (!screenedBy) {
        return res
          .status(400)
          .json({ message: "screenedBy is required." });
      }

      const updated = await Resume.findByIdAndUpdate(
        id,
        { hrOwnerName: screenedBy },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Resume not found." });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Error updating HR owner:", err);
      return res
        .status(500)
        .json({ message: "Failed to update HR owner." });
    }
  }
);

/**
 * PATCH /api/resumes/:id
 * Basic candidate details (Admin).
 */
router.patch(
  "/:id",
  auth,
  allow(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        candidateName,
        email,
        phone,
        position,
        experienceYears,
      } = req.body;

      const payload = {
        ...(candidateName !== undefined && { candidateName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(position !== undefined && { position }),
        ...(experienceYears !== undefined && {
          experienceYears: Number(experienceYears),
        }),
      };

      const updated = await Resume.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        return res.status(404).json({ message: "Resume not found." });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Error updating resume basic info:", err);
      return res
        .status(500)
        .json({ message: "Failed to update candidate details." });
    }
  }
);

/**
 * DELETE /api/resumes/:id
 * Delete a resume (and file if exists).
 */
router.delete(
  "/:id",
  auth,
  allow(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { id } = req.params;
      const resume = await Resume.findById(id);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found." });
      }

      if (resume.resumeFileName) {
        const filePath = path.join(
          process.cwd(),
          "uploads",
          resume.resumeFileName
        );
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error("Failed to delete resume file:", err);
          }
        }
      }

      await resume.deleteOne();

      return res.json({ message: "Resume deleted." });
    } catch (err) {
      console.error("Error deleting resume:", err);
      return res
        .status(500)
        .json({ message: "Failed to delete resume." });
    }
  }
);

/**
 * GET /api/resumes/:id/download
 * Download resume file.
 */
router.get(
  "/:id/download",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  async (req, res) => {
    try {
      const { id } = req.params;
      const resume = await Resume.findById(id);

      if (!resume || !resume.resumeFileName) {
        return res.status(404).json({ message: "File not found." });
      }

      const filePath = path.join(
        process.cwd(),
        "uploads",
        resume.resumeFileName
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found." });
      }

      return res.download(filePath, resume.resumeFileName);
    } catch (err) {
      console.error("Error downloading resume:", err);
      return res
        .status(500)
        .json({ message: "Failed to download resume." });
    }
  }
);

/**
 * POST /api/resumes/:id/schedule-interview
 * Schedule an interview & send an email.
 */
router.post(
  "/:id/schedule-interview",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { date, time, mode, link, location, message } = req.body;

      const resume = await Resume.findById(id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found." });
      }

      resume.interview = {
        date: date || null,
        time: time || null,
        mode: mode || null,
        link: link || null,
        location: location || null,
        message: message || "",
        scheduledBy: req.user.id,
        scheduledAt: new Date(),
      };

      await resume.save();

      if (resume.email) {
        try {
          await sendEmail({
            to: resume.email,
            subject: "Interview Schedule",
            html: `<p>Dear ${resume.candidateName || "Candidate"},</p>
              <p>Your interview has been scheduled.</p>
              <p><b>Date:</b> ${date || "-"}<br/>
              <b>Time:</b> ${time || "-"}<br/>
              <b>Mode:</b> ${mode || "-"}<br/>
              <b>Link/Location:</b> ${link || location || "-"}</p>
              <p>${message || ""}</p>`,
          });
        } catch (err) {
          console.error("Failed to send interview email:", err);
        }
      }

      return res.json({
        message: "Interview scheduled successfully.",
        resume,
      });
    } catch (err) {
      console.error("Error scheduling interview:", err);
      return res
        .status(500)
        .json({ message: "Failed to schedule interview." });
    }
  }
);

export default router;
