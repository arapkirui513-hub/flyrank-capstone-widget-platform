const express = require("express");
const pool = require("../db/pool");
const { validateSubmission } = require("../validators/submission");
const { getGeoData } = require("../services/geo");
const { triggerSideEffects } = require("../jobs/sideEffects");
const { submissionRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Apply rate limiting to this route
router.use(submissionRateLimiter);

router.post("/", async (req, res) => {
  try {
    // 1. Boundary Validation (Probe 2: clean 4xx, never 500)
    const validation = validateSubmission(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "invalid_payload",
        details: validation.error.issues
      });
    }

    const { widget_id, data, website } = validation.data;

    // 2. Honeypot Spam Check (Probe 6: silently drop/reject)
    if (website && website.trim() !== "") {
      // Return 200 to trick the bot, but do absolutely nothing on the backend
      return res.status(200).json({ success: true, message: "Submission received" });
    }

    // 3. Widget Lookup (Enforce that the widget exists and get its tenant_id)
    const widgetResult = await pool.query(
      "SELECT id, tenant_id FROM widgets WHERE id = $1",
      [widget_id]
    );

    if (widgetResult.rows.length === 0) {
      return res.status(404).json({ error: "widget_not_found" });
    }

    const { tenant_id } = widgetResult.rows[0];

    // 4. Geo Enrichment Fallback Chain (Probe 4)
    const ip = req.ip || req.connection.remoteAddress;
    const geoData = await getGeoData(ip);

    // 5. Persist Submission
    const insertResult = await pool.query(
      `INSERT INTO submissions (tenant_id, widget_id, data, ip_address, country, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [tenant_id, widget_id, data, ip, geoData.country, geoData.city]
    );

    const newSubmission = insertResult.rows[0];

    // 6. Safe Side Effect (Probe 5: failure must not block success)
    triggerSideEffects({ ...newSubmission, tenant_id, widget_id, data });

    // 7. Return Success
    res.status(201).json({
      success: true,
      message: "Submission received",
      submission_id: newSubmission.id
    });

  } catch (error) {
    console.error("Submission error:", error);
    // Fallback for unexpected DB errors: return 503 Service Unavailable, never a raw 500 crash
    res.status(503).json({ error: "service_unavailable", message: "Failed to process submission" });
  }
});

module.exports = router;
