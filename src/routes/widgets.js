const express = require("express");

const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { validateWidget } = require("../validators/widget");

const router = express.Router();

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const validation = validateWidget(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "invalid_payload",
        details: validation.error.issues,
      });
    }

    const {
      type,
      title,
      description,
      fields,
      button_text,
      display_options,
    } = validation.data;

    const result = await pool.query(
      `INSERT INTO widgets
        (tenant_id, type, title, description, fields, button_text, display_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, tenant_id, type, title, description, fields,
                 button_text, display_options, version, created_at, updated_at`,
      [
        req.user.tenant_id,
        type,
        title,
        description || null,
        JSON.stringify(fields),
        button_text,
        JSON.stringify(display_options),
      ]
    );

    return res.status(201).json({
      widget: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, tenant_id, type, title, description, fields,
              button_text, display_options, version, created_at, updated_at
       FROM widgets
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [req.user.tenant_id]
    );

    return res.status(200).json({
      widgets: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, tenant_id, type, title, description, fields,
              button_text, display_options, version, created_at, updated_at
       FROM widgets
       WHERE id = $1
         AND tenant_id = $2`,
      [req.params.id, req.user.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "widget_not_found",
      });
    }

    return res.status(200).json({
      widget: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const validation = validateWidget(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "invalid_payload",
        details: validation.error.issues,
      });
    }

    const {
      type,
      title,
      description,
      fields,
      button_text,
      display_options,
    } = validation.data;

    const result = await pool.query(
      `UPDATE widgets
       SET type = $1,
           title = $2,
           description = $3,
           fields = $4,
           button_text = $5,
           display_options = $6,
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
         AND tenant_id = $8
       RETURNING id, tenant_id, type, title, description, fields,
                 button_text, display_options, version, created_at, updated_at`,
      [
        type,
        title,
        description || null,
        JSON.stringify(fields),
        button_text,
        JSON.stringify(display_options),
        req.params.id,
        req.user.tenant_id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "widget_not_found",
      });
    }

    return res.status(200).json({
      widget: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await pool.query(
      `DELETE FROM widgets
       WHERE id = $1
         AND tenant_id = $2
       RETURNING id`,
      [req.params.id, req.user.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "widget_not_found",
      });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
router.get("/:id/embed", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, version
       FROM widgets
       WHERE id = $1
         AND tenant_id = $2`,
      [req.params.id, req.user.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "widget_not_found",
      });
    }

    const widget = result.rows[0];
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const snippet =
      `<script src="${baseUrl}/widget.js?id=${widget.id}&v=${widget.version}"></script>`;

    return res.status(200).json({
      snippet,
      version: widget.version,
    });
  } catch (error) {
    next(error);
  }
});
