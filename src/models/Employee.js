import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    department: { type: String, required: true },

    // employee OR hr — for AdminDashboard
    role: {
      type: String,
      enum: ["employee", "hr"],
      default: "employee",
    },

    joinDate: { type: Date, default: Date.now },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);
