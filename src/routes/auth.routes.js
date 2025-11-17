import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { ROLES, allow } from "../middleware/roles.js";
const router = Router();

router.post("/seed-admin", async (req, res) => {
  const { name = "Admin", email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email & password required" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Admin exists" });
  const user = await User.create({ name, email, password, role: ROLES.ADMIN });
  res.json({ id: user._id });
});

router.post("/register", auth, allow(ROLES.ADMIN), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "missing fields" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "User exists" });
  const user = await User.create({ name, email, password, role: role || "staff" });
  res.json({ id: user._id });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.compare(password))) return res.status(401).json({ message: "Invalid credentials" });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
  res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
});

export default router;
