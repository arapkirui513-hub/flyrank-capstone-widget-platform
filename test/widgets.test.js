const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/server");
const pool = require("../src/db/pool");

const unique = Date.now();

let tenantAToken;
let tenantBToken;
let tenantATenantId;
let tenantBTenantId;
let widgetId;

function widgetPayload(title = "Test Contact Widget") {
  return {
    type: "contact_form",
    title,
    description: "Widget integration test",
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        placeholder: "Your name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "you@example.com",
      },
    ],
    button_text: "Send",
    display_options: {
      theme: "default",
    },
  };
}

async function registerTenant(name, email) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name,
      email,
      password: "test-password-123",
    });

  assert.equal(response.status, 201);

  return {
    token: response.body.token,
    id: response.body.tenant.id,
  };
}

test.before(async () => {
  const tenantA = await registerTenant(
    "Widget Test Tenant A",
    `widget-a-${unique}@example.com`
  );

  const tenantB = await registerTenant(
    "Widget Test Tenant B",
    `widget-b-${unique}@example.com`
  );

  tenantAToken = tenantA.token;
  tenantATenantId = tenantA.id;

  tenantBToken = tenantB.token;
  tenantBTenantId = tenantB.id;
});

test.after(async () => {
  if (tenantATenantId) {
    await pool.query(
      "DELETE FROM tenants WHERE id = $1",
      [tenantATenantId]
    );
  }

  if (tenantBTenantId) {
    await pool.query(
      "DELETE FROM tenants WHERE id = $1",
      [tenantBTenantId]
    );
  }

  await pool.end();
});

test("creates a widget for the authenticated tenant", async () => {
  const response = await request(app)
    .post("/api/widgets")
    .set("Authorization", `Bearer ${tenantAToken}`)
    .send(widgetPayload());

  assert.equal(response.status, 201);
  assert.ok(response.body.widget.id);

  assert.equal(response.body.widget.title, "Test Contact Widget");
  assert.equal(response.body.widget.tenant_id, tenantATenantId);
  assert.equal(response.body.widget.version, 1);

  widgetId = response.body.widget.id;
});

test("lists only widgets belonging to the authenticated tenant", async () => {
  const response = await request(app)
    .get("/api/widgets")
    .set("Authorization", `Bearer ${tenantAToken}`);

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.widgets));

  assert.ok(
    response.body.widgets.some(
      (widget) => widget.id === widgetId
    )
  );

  assert.ok(
    response.body.widgets.every(
      (widget) => widget.tenant_id === tenantATenantId
    )
  );
});

test("gets a widget belonging to the authenticated tenant", async () => {
  const response = await request(app)
    .get(`/api/widgets/${widgetId}`)
    .set("Authorization", `Bearer ${tenantAToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.widget.id, widgetId);
  assert.equal(response.body.widget.tenant_id, tenantATenantId);
});

test("prevents another tenant from reading the widget", async () => {
  const response = await request(app)
    .get(`/api/widgets/${widgetId}`)
    .set("Authorization", `Bearer ${tenantBToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "widget_not_found");
});

test("prevents another tenant from updating the widget", async () => {
  const response = await request(app)
    .put(`/api/widgets/${widgetId}`)
    .set("Authorization", `Bearer ${tenantBToken}`)
    .send(widgetPayload("Unauthorized Update"));

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "widget_not_found");
});

test("updates a widget and increments its version", async () => {
  const response = await request(app)
    .put(`/api/widgets/${widgetId}`)
    .set("Authorization", `Bearer ${tenantAToken}`)
    .send(widgetPayload("Updated Contact Widget"));

  assert.equal(response.status, 200);
  assert.equal(response.body.widget.title, "Updated Contact Widget");
  assert.equal(response.body.widget.version, 2);
});

test("generates an authenticated embed snippet", async () => {
  const response = await request(app)
    .get(`/api/widgets/${widgetId}/embed`)
    .set("Authorization", `Bearer ${tenantAToken}`);

  assert.equal(response.status, 200);

  const { snippet, version } = response.body;

  assert.equal(version, 2);

  assert.match(
  snippet,
  new RegExp(
    `^<script src="http://127\\.0\\.0\\.1:\\d+/widget\\.js\\?id=${widgetId}&v=2"></script>$`
  )
);
});

test("another tenant cannot generate an embed snippet", async () => {
  const response = await request(app)
    .get(`/api/widgets/${widgetId}/embed`)
    .set("Authorization", `Bearer ${tenantBToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "widget_not_found");
});

test("public widget config is accessible without authentication", async () => {
  const response = await request(app)
    .get(`/api/widget-config/${widgetId}`);

  assert.equal(response.status, 200);

  assert.equal(response.body.widget.id, widgetId);
assert.equal(response.body.widget.title, "Updated Contact Widget");
assert.equal(response.body.widget.version, 2);

  assert.equal(
    response.headers["cache-control"],
    "public, max-age=300, s-maxage=300"
  );
});

test("widget.js is served as JavaScript with cache headers", async () => {
  const response = await request(app)
    .get(`/widget.js?id=${widgetId}&v=2`);

  assert.equal(response.status, 200);

  assert.match(
    response.headers["content-type"],
    /application\/javascript/
  );

  assert.equal(
    response.headers["cache-control"],
    "public, max-age=300, s-maxage=300"
  );

  assert.equal(response.headers["x-widget-version"], "2");

  assert.match(
    response.text,
    /Widget/
  );
});

test("requires authentication for widget management", async () => {
  const response = await request(app)
    .get("/api/widgets");

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "unauthorized");
});

test("rejects an invalid widget payload", async () => {
  const response = await request(app)
    .post("/api/widgets")
    .set("Authorization", `Bearer ${tenantAToken}`)
    .send({
      type: "contact_form",
      title: "",
      fields: [],
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "invalid_payload");
});

test("deletes the widget for its owning tenant", async () => {
  const response = await request(app)
    .delete(`/api/widgets/${widgetId}`)
    .set("Authorization", `Bearer ${tenantAToken}`);

  assert.equal(response.status, 204);

  const lookup = await pool.query(
    "SELECT id FROM widgets WHERE id = $1",
    [widgetId]
  );

  assert.equal(lookup.rows.length, 0);
});