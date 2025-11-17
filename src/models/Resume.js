import mongoose from "mongoose";
const statusEnum = ["screening_done", "selected", "awaiting_hr", "rejected"];

const historySchema = new mongoose.Schema(
  { status: { type: String, enum: statusEnum, required: true }, by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, note: String, at: { type: Date, default: Date.now } },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    position: String,
    experienceYears: Number,
    status: { type: String, enum: statusEnum, default: "awaiting_hr" },
    resumeFileName: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    history: [historySchema]
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);
