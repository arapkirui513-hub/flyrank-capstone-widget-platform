const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");
const pool = require("../src/db/pool");

let token;
let widgetId;

const testEmail = `submission-test-${Date.now()}@example.com`;

async function createTestTenantAndWidget() {
  const registerResponse = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Submission Test Tenant",
      email: testEmail,
      password: "test-password-123",
    });

  assert.equal(registerResponse.status, 201);
  token = registerResponse.body.token;

  const widgetResponse = await request(app)
    .post("/api/widgets")
    .set("Authorization", `Bearer ${token}`)
    .send({
      type: "contact_form",
      title: "Submission Test Widget",
      description: "Integration test widget",
      fields: [
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
        },
      ],
      button_text: "Submit",
      display_options: {},
    });

  assert.equal(widgetResponse.status, 201);
  widgetId = widgetResponse.body.widget.id;
}

test.before(async () => {
  await createTestTenantAndWidget();
});

test.after(async () => {
  if (token) {
    const decoded = require("jsonwebtoken").decode(token);

    if (decoded?.tenant_id) {
      await pool.query(
        "DELETE FROM tenants WHERE id = $1",
        [decoded.tenant_id]
      );
    }
  }

  await pool.end();
});

test("valid submission succeeds and is persisted", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      widget_id: widgetId,
      data: {
        name: "Happy Path Test",
      },
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.ok(response.body.submission_id);

  const result = await pool.query(
    `SELECT id, widget_id, data
     FROM submissions
     WHERE id = $1`,
    [response.body.submission_id]
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].widget_id, widgetId);
  assert.equal(result.rows[0].data.name, "Happy Path Test");
});

test("missing widget_id returns 400 JSON", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      data: {
        name: "Invalid Test",
      },
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_payload");
});

test("invalid data type returns 400 JSON", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      widget_id: widgetId,
      data: "not-an-object",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_payload");
});

test("more than 50 data fields returns 400 JSON", async () => {
  const data = {};

  for (let i = 1; i <= 51; i += 1) {
    data[`field${i}`] = "value";
  }

  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      widget_id: widgetId,
      data,
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_payload");
  assert.match(response.body.details[0].message, /too large/i);
});

test("malformed JSON returns 400 JSON", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .set("Content-Type", "application/json")
    .send('{"widget_id":');

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_json");
});

test("oversized request body returns 413 JSON", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .set("Content-Type", "application/json")
    .send(
      JSON.stringify({
        widget_id: widgetId,
        data: {
          payload: "x".repeat(120000),
        },
      })
    );

  assert.equal(response.status, 413);
  assert.equal(response.body.error, "entity.too.large");
});

test("unknown widget returns 404 JSON", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      widget_id: "00000000-0000-0000-0000-000000000000",
      data: {
        name: "Unknown Widget",
      },
    });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "widget_not_found");
});

test("honeypot submission returns success without persistence", async () => {
  const before = await pool.query(
    "SELECT COUNT(*)::int AS count FROM submissions WHERE widget_id = $1",
    [widgetId]
  );

  const response = await request(app)
    .post("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .send({
      widget_id: widgetId,
      data: {
        name: "Bot Test",
      },
      website: "https://spam.example.com",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const after = await pool.query(
    "SELECT COUNT(*)::int AS count FROM submissions WHERE widget_id = $1",
    [widgetId]
  );

  assert.equal(after.rows[0].count, before.rows[0].count);
});

test("OPTIONS preflight returns CORS headers", async () => {
  const response = await request(app)
    .options("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "Content-Type");

  assert.equal(response.status, 204);
  assert.equal(
    response.headers["access-control-allow-origin"],
    "http://localhost:4000"
  );
  assert.match(
    response.headers["access-control-allow-methods"],
    /POST/
  );
});