// src/routes/users.routes.js
import { Router } from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";

const router = Router();

/**
 * GET /api/users?role=employee|hr|admin
 */
router.get("/", auth, allow(ROLES.ADMIN), async (req, res) => {
  try {
    const { role } = req.query;

    const filter = {};
    if (role === "employee") filter.role = "staff";
    if (role === "hr") filter.role = "hr";
    if (role === "admin") filter.role = "admin";

    const users = await User.find(filter).sort({ createdAt: -1 });

    // send safe fields only
    const sanitized = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || "",
      createdAt: u.createdAt,
    }));

    res.json(sanitized);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
