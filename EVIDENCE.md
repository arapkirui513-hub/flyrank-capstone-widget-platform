# Evidence

This file records reproducible proof for the capstone requirements.

All evidence below was produced from the local implementation during development and verification.

## Automated Test Suite

Command:

```text
node --test .\test\*.test.js
```

Result:

```text
tests 33
pass 33
fail 0
cancelled 0
skipped 0
todo 0
```

---

# Six Evaluation Probes

## Probe 1 - Happy Path

**Status: PASS**

A valid submission was sent from a second-origin test page using:

```text
Origin: http://localhost:4000
```

Response:

```json
{
  "success": true,
  "message": "Submission received",
  "submission_id": "54ea6476-da72-4949-8909-aeb17f508e91"
}
```

HTTP status:

```text
201
```

The submission was then visible through the authenticated dashboard.

The dashboard showed:

```text
total_submissions: 1
active_widgets: 1
widget submission_count: 1
geo: Localhost / Test City
```

Automated coverage also verifies valid submissions are persisted.

---

## Probe 2 - Boundary Validation

**Status: PASS**

Malformed and invalid payloads were tested.

Missing `widget_id`:

```text
HTTP 400
{"error":"invalid_payload", ...}
```

Invalid data type:

```text
HTTP 400
{"error":"invalid_payload", ...}
```

More than 50 data fields:

```text
HTTP 400
{"error":"invalid_payload", ...}
```

Malformed JSON:

```text
HTTP 400
{"error":"invalid_json","message":"Request body contains invalid JSON"}
```

Oversized request body:

```text
HTTP 413
{"error":"entity.too.large","message":"request entity too large"}
```

Unknown widget:

```text
HTTP 404
{"error":"widget_not_found"}
```

No tested malformed or oversized request produced HTTP 500.

Automated submission tests cover these boundary cases.

---

## Probe 3 - Rate Limiting

**Status: PASS**

A burst of submissions was sent against the public submission endpoint.

Observed results:

```text
Requests 1-20: HTTP 201
Requests 21-25: HTTP 429
```

After waiting 61 seconds:

```text
Normal request: HTTP 201
submission_id: 5c9b6848-29e8-4887-aa0a-479a7da329f1
```

This demonstrates that rapid submissions are limited while normal traffic succeeds again after the rate-limit window.

---

## Probe 4 - Geo Fallback Chain

**Status: PASS**

Provider A available:

```text
{ country: "Kenya", city: "Nairobi", provider: "A" }
```

Provider A disabled and Provider B available:

```text
{ country: "Kenya", city: "Mombasa", provider: "B" }
```

Both providers disabled:

```text
{ country: null, city: null, provider: "none" }
```

A real submission with both providers unavailable still succeeded:

```text
HTTP 201
submission_id: 70892683-3aa4-4910-a152-f43f4d1b1475
```

The resulting submission remained persisted and visible through the dashboard.

Automated geo tests cover all three provider states.

---

## Probe 5 - Safe Side Effects

**Status: PASS**

The side-effect failure path was forced using:

```text
FORCE_SIDE_EFFECT_FAILURE=true
```

The submission still returned:

```text
HTTP 201
submission_id: 3f11cb45-c518-4d40-b02c-29a0a63f1449
```

The server logged the forced failure:

```text
[Side Effect] Processing submission 3f11cb45-c518-4d40-b02c-29a0a63f1449...
[Side Effect] Failed for submission 3f11cb45-c518-4d40-b02c-29a0a63f1449: Forced webhook/email delivery failure
```

The side-effect exception did not break the successful submission response.

An automated deterministic side-effect failure test also passes.

---

## Probe 6 - Spam Protection

**Status: PASS**

Dashboard count before the honeypot request:

```text
24
```

A submission containing the honeypot field:

```text
website=https://spam.example.com
```

returned:

```json
{
  "success": true,
  "message": "Submission received"
}
```

HTTP status:

```text
200
```

Dashboard count after the request:

```text
24
```

The bot-like submission therefore did not create a stored submission.

Automated submission tests also verify that honeypot submissions do not persist.

---

# Moving Parts

## 1. Widget Management API

**Status: PASS**

Automated widget tests verify:

- Authenticated creation
- Tenant-scoped listing
- Tenant-scoped retrieval
- Tenant isolation
- Tenant-scoped update
- Version increment on update
- Tenant-scoped deletion
- Authentication requirements
- Invalid payload rejection

Relevant test file:

```text
test/widgets.test.js
```

Result:

```text
13 tests
13 pass
0 fail
```

---

## 2. Embed Snippet Generation

**Status: PASS**

Authenticated embed generation is covered by:

```text
test/widgets.test.js
```

The generated response follows the required single-line structure:

```html
<script src="http://127.0.0.1:<port>/widget.js?id=<widget-id>&v=2"></script>
```

The production/domain form is:

```html
<script src="https://your-domain.com/widget.js?id=abc123"></script>
```

The embed endpoint is tenant-protected.

---

## 3. Fast, Cached Widget Delivery

**Status: PASS**

The public widget configuration and JavaScript endpoints were tested.

`widget.js` is served with:

```text
Content-Type: application/javascript; charset=utf-8
Cache-Control: public, max-age=300, s-maxage=300
```

The response also includes:

```text
X-Widget-Version
```

Automated coverage:

```text
test/widgets.test.js
```

---

## 4. Public Submission Endpoint

**Status: PASS**

Automated submission tests verify:

- Valid submission
- Payload validation
- Malformed JSON
- Oversized requests
- Unknown widget
- Honeypot behavior
- CORS OPTIONS preflight

Relevant test file:

```text
test/submissions.test.js
```

Result:

```text
9 tests
9 pass
0 fail
```

Security tests also verify CORS preflight behavior.

---

## 5. Owner Dashboard API

**Status: PASS**

The dashboard was manually verified to show:

- Total submissions
- Active widgets
- Latest submission
- Per-widget submission counts
- Country breakdown
- City breakdown

Dashboard data also confirmed that successful submissions persisted and honeypot submissions did not increase the stored count.

Tenant-scoped dashboard authentication is covered by:

```text
test/security.test.js
```

---

# Security Verification

Security tests cover:

- Helmet security headers
- Missing authentication
- Invalid authentication
- Dashboard authentication
- CORS preflight
- Malformed JSON handling

Result:

```text
7 tests
7 pass
0 fail
```

---

# Complete Test Verification

Final command:

```text
node --test .\test\*.test.js
```

Final result:

```text
tests 33
pass 33
fail 0
cancelled 0
skipped 0
todo 0
```

This is the final automated verification recorded for the current implementation.
