import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import resumeRoutes from "./src/routes/resume.routes.js";
import exportRoutes from "./src/routes/export.routes.js";
import employeeRoutes from "./src/routes/employee.routes.js"; 
import userRoutes from "./src/routes/user.routes.js";
import leadsRoutes from "./src/routes/leads.routes.js";



dotenv.config();
const app = express();

app.use(helmet());

// allow multiple dev origins (5173, 8080, 8081, 8082) + env origin
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:8082",
  process.env.CLIENT_ORIGIN, // optional extra, e.g. production
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // allow non-browser tools like Postman (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("Blocked by CORS:", origin);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(
  cors({
    origin: ["http://localhost:8080", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

connectDB();

app.get("/", (_req, res) => res.json({ ok: true, service: "job-path-guard-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/leads", leadsRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
