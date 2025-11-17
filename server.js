import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import resumeRoutes from "./src/routes/resume.routes.js";
import exportRoutes from "./src/routes/export.routes.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

connectDB();

app.get("/", (_req, res) => res.json({ ok: true, service: "job-path-guard-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/export", exportRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
