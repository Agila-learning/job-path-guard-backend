// src/routes/resume.routes.js
import { Router } from "express";
import path from "path";
import fs from "fs";

import Resume from "../models/Resume.js";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";
import { upload } from "../utils/upload.js";
import cloudinary from "../utils/cloudinary.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = Router();

/* ---------- Helper: upload buffer to Cloudinary ---------- */
async function uploadToCloudinary(fileBuffer, originalName) {
  if (!fileBuffer) return { url: null, publicId: null };

  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "job-path-guard/resumes",
        resource_type: "auto",
        filename_override: originalName,
        use_filename: true,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    stream.end(fileBuffer);
  });
}

/**
 * POST /api/resumes
 * Create / upload a new resume.
 */
router.post(
  "/",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  upload.single("resume"),
  async (req, res) => {
    try {
      const { candidateName, email, phone, position, experienceYears } = req.body;

      if (!candidateName || !email) {
        return res
          .status(400)
          .json({ message: "candidateName and email are required." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Resume file is required." });
      }

      // 🔹 Upload to Cloudinary
      const { url, publicId } = await uploadToCloudinary(
        req.file.buffer,
        req.file.originalname
      );

      const doc = await Resume.create({
        candidateName,
        email,
        phone,
        position,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        resumeFileName: req.file.originalname,
        resumeUrl: url,
        resumePublicId: publicId,
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
 * Update employeeFeedback / hrFeedback + latestFeedback.
 */
router.patch(
  "/:id/feedback",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      if (!feedback || typeof feedback !== "string") {
        return res
          .status(400)
          .json({ message: "Feedback text is required." });
      }

      const resume = await Resume.findById(id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found." });
      }

      if (req.user.role === ROLES.HR || req.user.role === ROLES.ADMIN) {
        resume.hrFeedback = feedback;
      } else {
        resume.employeeFeedback = feedback;
      }

      resume.latestFeedback = feedback;
      resume.updatedAt = new Date();

      resume.history = resume.history || [];
      resume.history.push({
        status: resume.status || "awaiting_hr",
        note: `Feedback updated by ${req.user.role}`,
        by: req.user.id,
        at: new Date(),
      });

      await resume.save();
      return res.json(resume);
    } catch (err) {
      console.error("Error updating resume feedback:", err);
      return res
        .status(500)
        .json({ message: "Failed to update feedback." });
    }
  }
);

/**
 * PATCH /api/resumes/:id  (basic info)
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
 * (Optional: we *could* also delete from Cloudinary using resume.resumePublicId)
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

      // Optional: delete from Cloudinary if you want
      if (resume.resumePublicId) {
        try {
          await cloudinary.uploader.destroy(resume.resumePublicId, {
            resource_type: "raw",
          });
        } catch (err) {
          console.error("Cloudinary delete failed:", err);
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
 * Simply proxies / redirects to Cloudinary URL.
 */
router.get(
  "/:id/download",
  auth,
  allow(ROLES.ADMIN, ROLES.HR, ROLES.STAFF),
  async (req, res) => {
    try {
      const { id } = req.params;
      const resume = await Resume.findById(id);

      if (!resume || !resume.resumeUrl) {
        return res.status(404).json({ message: "File not found." });
      }

      // fetch() in frontend will follow this and download as blob
      return res.redirect(resume.resumeUrl);
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
 * Save interview + TRY to send email (but never break on email failure).
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

      // ✅ Always save interview details in DB
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

      // ✅ Try to send email – if it fails, return 500 so UI shows error
      if (resume.email) {
        try {
          const info = await sendEmail({
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

          console.log("Interview email sent:", info.messageId);
        } catch (err) {
          console.error("Failed to send interview email:", err);
          return res.status(500).json({
            message:
              "Interview saved, but sending email to candidate failed. Check SMTP settings.",
          });
        }
      }

      return res.json({
        message: "Interview scheduled successfully and email sent.",
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
