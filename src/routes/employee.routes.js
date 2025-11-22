import { Router } from "express";
import Employee from "../models/Employee.js";
import { auth } from "../middleware/auth.js";
import { ROLES, allow } from "../middleware/roles.js";

const router = Router();

/**
 * GET /api/employees
 * Optional query: ?role=employee or ?role=hr
 * Only ADMIN + HR can view this list
 */
router.get("/", auth, allow(ROLES.ADMIN, ROLES.HR), async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;           // filter by "employee" or "hr"

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
});

/**
 * POST /api/employees
 * Body: { name, email, department, role }
 * Only ADMIN can create employees / HR users
 */
router.post("/", auth, allow(ROLES.ADMIN), async (req, res) => {
  try {
    const { name, email, department, role } = req.body;

    if (!name || !email || !department) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await Employee.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: "Employee already exists" });
    }

    const employee = await Employee.create({
      name,
      email: normalizedEmail,
      department,
      role: role === "hr" ? "hr" : "employee", // default to employee
      createdBy: req.user.id,
    });

    return res.status(201).json(employee);
  } catch (err) {
    console.error("Create employee error:", err);
    res.status(500).json({ message: "Failed to create employee" });
  }
});

export default router;
