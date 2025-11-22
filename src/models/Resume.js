// src/models/Resume.js
import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    date: String,
    time: String,
    mode: String,
    link: String,
    location: String,
    message: String,
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    position: String,
    experienceYears: Number,
    status: {
      type: String,
      enum: ["awaiting_hr", "screening_done", "selected", "rejected"],
      default: "awaiting_hr",
    },

    // Feedback
    employeeFeedback: String,
    hrFeedback: String,
    latestFeedback: String,

    // 🔹 Cloudinary fields
    resumeFileName: String,   // original filename for display
    resumeUrl: String,        // Cloudinary secure URL
    resumePublicId: String,   // Cloudinary public_id

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: [historySchema],
    interview: interviewSchema,
  },
  { timestamps: true }
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
