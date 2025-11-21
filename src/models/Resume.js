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
    date: String,     // "2025-11-20"
    time: String,     // "10:30"
    mode: String,     // "Online - Google Meet"
    link: String,     // meet/teams link or address
    message: String,  // email body
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
    employeeFeedback: String,
    hrFeedback: String,
    resumeFileName: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: [historySchema],
    interview: interviewSchema,   // <–– NEW
  },
  { timestamps: true }
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
