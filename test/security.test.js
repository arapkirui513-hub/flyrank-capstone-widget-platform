const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");

test("security headers are present", async () => {
  const response = await request(app)
    .get("/health")
    .expect(200);

  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.ok(response.headers["x-frame-options"]);
  assert.ok(response.headers["content-security-policy"]);
});

test("protected widget management rejects missing authentication", async () => {
  const response = await request(app)
    .get("/api/widgets")
    .expect(401);

  assert.equal(response.body.error, "unauthorized");
});

test("protected widget management rejects an invalid token", async () => {
  const response = await request(app)
    .get("/api/widgets")
    .set("Authorization", "Bearer invalid-token")
    .expect(401);

  assert.equal(response.body.error, "unauthorized");
});

test("dashboard rejects missing authentication", async () => {
  const response = await request(app)
    .get("/api/dashboard")
    .expect(401);

  assert.equal(response.body.error, "unauthorized");
});

test("dashboard rejects an invalid token", async () => {
  const response = await request(app)
    .get("/api/dashboard")
    .set("Authorization", "Bearer invalid-token")
    .expect(401);

  assert.equal(response.body.error, "unauthorized");
});

test("submission endpoint handles CORS preflight", async () => {
  const response = await request(app)
    .options("/api/submissions")
    .set("Origin", "http://localhost:4000")
    .set("Access-Control-Request-Method", "POST")
    .set("Access-Control-Request-Headers", "Content-Type")
    .expect(204);

  assert.equal(
    response.headers["access-control-allow-origin"],
    "http://localhost:4000"
  );
});

test("submission endpoint rejects malformed JSON with 4xx", async () => {
  const response = await request(app)
    .post("/api/submissions")
    .set("Content-Type", "application/json")
    .send('{"widget_id":');

  assert.ok(response.status >= 400 && response.status < 500);
  assert.equal(response.body.error, "invalid_json");
});