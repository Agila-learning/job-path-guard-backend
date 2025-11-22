import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { ROLES, allow } from "../middleware/roles.js";

const router = Router();

/* ---------------- role mapping helpers ---------------- */

// Frontend uses: "employee" | "hr" | "admin"
// Backend/DB likely uses ROLES.ADMIN / ROLES.HR / ROLES.STAFF ("admin" | "hr" | "staff")

function mapClientRoleToDb(clientRole) {
  if (clientRole === "admin") return ROLES.ADMIN || "admin";
  if (clientRole === "hr") return ROLES.HR || "hr";
  // default → employee maps to staff
  return ROLES.STAFF || "staff";
}

function mapDbRoleToClient(dbRole) {
  if (dbRole === ROLES.ADMIN || dbRole === "admin") return "admin";
  if (dbRole === ROLES.HR || dbRole === "hr") return "hr";
  // staff → employee
  if (dbRole === ROLES.STAFF || dbRole === "staff") return "employee";
  // fallback
  return "employee";
}

/* ---------------- JWT helper ---------------- */

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev_fallback_secret_change_me";
  return jwt.sign(
    {
      id: user._id,
      role: user.role, // keep DB role in token for middleware/allow()
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

/* ---------- ONE-TIME ADMIN SEED  (/api/auth/seed-admin) ---------- */
/* Use via Postman to create your first admin user */

router.post("/seed-admin", async (req, res) => {
  try {
    const { name = "Admin", email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email & password required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "Admin exists" });
    }

    const adminRole = ROLES.ADMIN || "admin";

    const user = await User.create({
      name,
      email: normalizedEmail,
      password, // your User model's pre-save hook / compare() should handle hashing
      role: adminRole,
    });

    return res.json({ id: user._id });
  } catch (err) {
    console.error("seed-admin error:", err);
    return res
      .status(500)
      .json({ message: "Server error while seeding admin" });
  }
});


/* ------------- PUBLIC SIGNUP  (/api/auth/signup) ------------- */

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "User exists" });
    }

    // map frontend role → DB role
    const dbRole = mapClientRoleToDb(role);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password, // assuming hashing via model or compare()
      role: dbRole,
    });

    const token = signToken(user);

    // send mapped role back to frontend
    const clientRole = mapDbRoleToClient(user.role);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: clientRole,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);

    // If it's a validation error, send 400 so it's visible
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: "Server error during signup" });
  }
});

/* ------------- LOGIN  (/api/auth/login) ------------- */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.compare(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);
    const clientRole = mapDbRoleToClient(user.role);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: clientRole,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/* ----- ADMIN-ONLY USER CREATION (/api/auth/register) ----- */

router.post("/register", auth, allow(ROLES.ADMIN), async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "User exists" });
    }

    const dbRole = mapClientRoleToDb(role);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: dbRole,
      department, // ✅ save department
    });

    return res.json({ id: user._id });
  } catch (err) {
    console.error("Register error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: "Server error during register" });
  }
});




export default router;
