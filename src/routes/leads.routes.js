// Backend/src/routes/lead.routes.js
import { Router } from "express";
import Lead from "../models/Lead.js"; // make sure this model exists
import { auth } from "../middleware/auth.js";
import { allow, ROLES } from "../middleware/roles.js";

const router = Router();

// POST /api/leads
router.post(
  "/",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (req, res) => {
    try {
      const { name, email, phone, source, position, notes } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const lead = await Lead.create({
        name,
        email,
        phone,
        source,
        position,
        notes,
        status: "new",
        createdBy: req.user.id,
      });

      res.status(201).json(lead);
    } catch (err) {
      console.error("Create lead error:", err);
      res.status(500).json({ message: "Failed to create lead" });
    }
  }
);

// GET /api/leads
router.get(
  "/",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (_req, res) => {
    try {
      const leads = await Lead.find().sort({ createdAt: -1 });
      res.json(leads);
    } catch (err) {
      console.error("Get leads error:", err);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  }
);

// PATCH /api/leads/:id
router.patch(
  "/:id",
  auth,
  allow(ROLES.ADMIN, ROLES.HR),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, source, position, notes, status } = req.body;

      const lead = await Lead.findById(id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      if (name !== undefined) lead.name = name;
      if (email !== undefined) lead.email = email;
      if (phone !== undefined) lead.phone = phone;
      if (source !== undefined) lead.source = source;
      if (position !== undefined) lead.position = position;
      if (notes !== undefined) lead.notes = notes;
      if (status !== undefined) lead.status = status;

      await lead.save();
      res.json(lead);
    } catch (err) {
      console.error("Update lead error:", err);
      res.status(500).json({ message: "Failed to update lead" });
    }
  }
);

// DELETE /api/leads/:id
router.delete(
  "/:id",
  auth,
  allow(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      await lead.deleteOne();
      res.json({ success: true });
    } catch (err) {
      console.error("Delete lead error:", err);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  }
);

export default router;
