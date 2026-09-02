const express = require("express");

const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_submissions,
         COUNT(DISTINCT widget_id)::int AS active_widgets,
         MAX(created_at) AS latest_submission
       FROM submissions
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const widgetStatsResult = await pool.query(
      `SELECT
         w.id,
         w.title,
         COUNT(s.id)::int AS submission_count
       FROM widgets w
       LEFT JOIN submissions s
         ON s.widget_id = w.id
        AND s.tenant_id = $1
       WHERE w.tenant_id = $1
       GROUP BY w.id, w.title
       ORDER BY submission_count DESC, w.created_at DESC`,
      [tenantId]
    );

    const geoResult = await pool.query(
      `SELECT
         country,
         city,
         COUNT(*)::int AS submission_count
       FROM submissions
       WHERE tenant_id = $1
       GROUP BY country, city
       ORDER BY submission_count DESC`,
      [tenantId]
    );

    return res.status(200).json({
      summary: summaryResult.rows[0],
      widgets: widgetStatsResult.rows,
      geo: geoResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
