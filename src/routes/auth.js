const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const pool = require("../db/pool");
const env = require("../config/env");

const router = express.Router();

const authSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

router.post("/register", async (req, res, next) => {
  try {
    const validation = authSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "invalid_payload",
        details: validation.error.issues,
      });
    }

    const { name, email, password } = validation.data;

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO tenants (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email.toLowerCase(), passwordHash]
    );

    const tenant = result.rows[0];

    const token = jwt.sign(
      { tenant_id: tenant.id },
      env.jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
      },
      token,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        error: "email_already_registered",
      });
    }

    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "invalid_payload",
        details: validation.error.issues,
      });
    }

    const { email, password } = validation.data;

    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM tenants
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "invalid_credentials",
      });
    }

    const tenant = result.rows[0];
    const passwordMatches = await bcrypt.compare(
      password,
      tenant.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "invalid_credentials",
      });
    }

    const token = jwt.sign(
      { tenant_id: tenant.id },
      env.jwtSecret,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
