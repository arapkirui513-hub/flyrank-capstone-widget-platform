# Embeddable Widget & Lead-Capture Platform

> **Status:** Internship / Capstone

A multi-tenant platform for creating embeddable lead-capture widgets, serving them to external websites, collecting submissions, optional geolocation enrichment, and tenant-scoped dashboard data.

This Week 4 capstone demonstrates API design, multi-tenancy, embeddable frontend delivery, validation, CORS, rate limiting, fallback behavior, safe side effects, and evidence-driven verification.

## Architecture

```text
External Website
      |
      | <script src=".../widget.js?id=abc123"></script>
      v
  widget.js
      |
      | fetch widget config
      v
+---------------------------+
|       Express API         |
|                           |
| Authenticated owner API   |
| Public widget delivery    |
| Public submissions        |
| Dashboard API             |
| Validation / CORS / Rate  |
+-------------+-------------+
              |
              v
       +-------------+
       | PostgreSQL  |
       |             |
       | tenants     |
       | users       |
       | widgets     |
       | submissions |
       +-------------+

Submission flow also includes:

  submission
      |
      +--> validation
      +--> honeypot check
      +--> Geo Provider A
      |        |
      |        +--> Provider B
      |        |
      |        +--> no geo data
      |
      +--> database persistence
      |
      +--> safe asynchronous side effects
```

## Core Capabilities

### Multi-tenant widget management

Authenticated owners can:

- Create widgets
- List their widgets
- Retrieve a widget
- Update a widget
- Delete a widget
- Generate an embed snippet

Widget management is tenant-scoped.

### Embeddable widget

The API generates a single-line snippet:

```html
<script src="https://your-domain.com/widget.js?id=abc123"></script>
```

The delivered `widget.js`:

1. Detects the widget ID.
2. Fetches the public widget configuration.
3. Renders the form.
4. Includes a hidden honeypot field.
5. Sends submissions to the public API.

Widget versions are exposed for cache-busting.

### Public submissions

Submissions use:

```text
POST /api/submissions
```

Input is validated at the API boundary. Invalid input returns JSON 4xx responses.

The endpoint supports CORS and OPTIONS preflight requests.

### Spam protection

The widget includes a hidden honeypot field named:

```text
website
```

A populated honeypot submission returns successfully without being persisted.

### Rate limiting

Submission requests are limited to:

```text
20 requests per minute per IP
```

Requests above the limit return HTTP 429.

### Geo fallback

Non-local submissions attempt geolocation through two providers:

```text
Provider A
    |
    +-- success --> use Provider A
    |
    +-- failure --> Provider B
                       |
                       +-- success --> use Provider B
                       |
                       +-- failure --> store without geo
```

A geolocation failure does not prevent submission persistence.

Localhost requests use deterministic test geo data.

### Safe side effects

Post-submission side effects run asynchronously.

If a side effect fails, the submission remains successful and persisted. The failure is logged separately.

For deterministic testing:

```text
FORCE_SIDE_EFFECT_FAILURE=true
```

### Owner dashboard

Authenticated owners can use:

```text
GET /api/dashboard
```

The dashboard provides:

- Total submissions
- Active widget count
- Latest submission
- Submission counts by widget
- Geographic breakdown by country and city

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Docker Compose
- Zod
- JWT
- bcryptjs
- express-rate-limit
- Helmet
- Supertest
- Node.js built-in test runner

## Project Structure

```text
.
 src/
    config/
    db/
       migrations/
    jobs/
    middleware/
    routes/
    services/
    validators/
    server.js
 test/
    geo-fallback.test.js
    security.test.js
    side-effects.test.js
    submissions.test.js
    widgets.test.js
 docs/
    DESIGN.md
 .env.example
 BUILDLOG.md
 EVIDENCE.md
 README.md
 capstone.yaml
 docker-compose.yml
 package.json
 package-lock.json
```

## Getting Started

### Prerequisites

Install:

- Node.js
- npm
- Docker Desktop

### Install dependencies

```powershell
npm install
```

### Create the environment file

```powershell
Copy-Item .env.example .env
```

Do not commit `.env`.

### Start PostgreSQL

```powershell
docker compose up -d
```

The development database uses:

```text
Database: widget_platform
User: postgres
Password: postgres
Port: 5432
```

### Run migrations

```powershell
npm run db:migrate
```

### Start the application

```powershell
npm start
```

The API runs at:

```text
http://localhost:3000
```

Health check:

```powershell
Invoke-WebRequest http://localhost:3000/health
```

## Exact Run and Seed Commands

The capstone manifest defines:

```yaml
run: npm start
seed: npm run db:migrate
base_url: http://localhost:3000
```

Expected setup:

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
npm start
```

## API Overview

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

Authentication uses JWT bearer tokens.

### Widget management

```text
POST   /api/widgets
GET    /api/widgets
GET    /api/widgets/:id
PUT    /api/widgets/:id
DELETE /api/widgets/:id
GET    /api/widgets/:id/embed
```

These endpoints require authentication and enforce tenant isolation.

### Public widget delivery

```text
GET /widget.js?id=<widget-id>
GET /api/widget-config/:id
```

The widget configuration endpoint is public so external websites can load widget configuration without owner credentials.

### Submissions

```text
POST /api/submissions
```

The submission endpoint validates input, applies rate limiting, performs optional geo enrichment, persists the submission, and triggers safe asynchronous side effects.

### Dashboard

```text
GET /api/dashboard
```

Dashboard data is authenticated and tenant-scoped.

## Security and Reliability

The implementation includes:

- JWT authentication
- bcrypt password hashing
- Tenant-scoped database queries
- Zod input validation
- Request body size limits
- Rate limiting
- CORS handling
- OPTIONS preflight handling
- Security headers
- Honeypot spam protection
- Safe asynchronous side effects
- Geo provider fallback
- JSON error responses
- Malformed JSON handling
- Cross-tenant access protection

## Environment Variables

All supported variables are documented in `.env.example`.

```text
NODE_ENV
PORT
DATABASE_URL
JWT_SECRET
FORCE_SIDE_EFFECT_FAILURE
GEO_PROVIDER_A_URL
GEO_PROVIDER_B_URL
CORS_ALLOWED_ORIGINS
```

Use a strong random value for `JWT_SECRET` outside local development.

## Database

PostgreSQL stores:

- Tenants
- Users
- Widgets
- Submissions

Database initialization is handled by:

```powershell
npm run db:migrate
```

PostgreSQL runs through Docker Compose with a persistent volume.

## Caching and Widget Delivery

`widget.js` is served with cache-control headers.

The public widget configuration endpoint also sends cache-control headers.

Widget versions are exposed through the delivery URL and the `X-Widget-Version` response header.

The intended flow is:

```text
Widget update
    |
    v
Version increment
    |
    v
Versioned widget/config request
    |
    v
Cache can distinguish updated versions
```

## Evaluation Verification

The implementation was manually verified against all six required evaluation probes.

### Probe 1: Happy Path

A valid submission from a second-origin test page returned HTTP 201 and was persisted.

The submission was visible through the authenticated dashboard API.

### Probe 2: Boundary Validation

The following cases returned clean 4xx responses:

```text
Missing widget_id       -> 400
Invalid data            -> 400
More than 50 fields     -> 400
Malformed JSON          -> 400
Oversized request body  -> 413
Unknown widget          -> 404
```

No tested boundary case returned HTTP 500.

### Probe 3: Rate Limiting

A rapid burst produced:

```text
Requests 1-20 -> 201
Requests 21-25 -> 429
```

After the rate-limit window expired, a normal request succeeded with HTTP 201.

### Probe 4: Fallback Chain

The geo fallback was verified as:

```text
Provider A available
    -> Provider A data used

Provider A unavailable
    -> Provider B data used

Both unavailable
    -> submission still stored without geo
```

### Probe 5: Safe Side Effects

With:

```text
FORCE_SIDE_EFFECT_FAILURE=true
```

a submission still returned HTTP 201 and was persisted.

The side-effect failure was logged separately.

### Probe 6: Spam Protection

A submission with the honeypot field populated returned a successful response but did not increase the persisted submission count.

Detailed command transcripts and results are recorded in `EVIDENCE.md`.

## Automated Tests

Run:

```powershell
node --test .\test\*.test.js
```

Final verified result:

```text
33 tests
33 passed
0 failed
0 skipped
```

The tests cover:

- Geo Provider A success
- Geo Provider B fallback
- No-geo fallback
- Security headers
- Authentication enforcement
- Dashboard authentication
- CORS preflight
- Malformed JSON
- Safe side-effect failure
- Valid submission persistence
- Submission validation
- Oversized request handling
- Unknown widget handling
- Honeypot behavior
- Widget CRUD
- Tenant isolation
- Widget versioning
- Embed generation
- Public widget configuration
- Widget JavaScript delivery

## Design Documentation

The Phase 1 design is documented in:

```text
docs/DESIGN.md
```

It covers the data model, API contracts, embed flow, and non-goals.

## Honest Limitations

This is a capstone implementation rather than a production SaaS deployment.

Current limitations include:

- Authentication uses application-level JWTs rather than an external identity provider.
- Rate limiting is in-process and IP-based rather than backed by a distributed store.
- Widget JavaScript is served by the application rather than through a dedicated CDN pipeline.
- Geo enrichment depends on external providers for non-local IPs.
- Side effects use an asynchronous application boundary rather than a production message queue.
- There is no production email delivery or webhook integration.
- There is no dedicated frontend dashboard application. Dashboard functionality is exposed through the authenticated API.
- Provider and side-effect failure controls are intended for deterministic evaluation.
- CORS should be restricted to actual production origins before deployment.
- The Docker PostgreSQL credentials are development credentials and must not be reused in production.

## Evidence and Build Log

`EVIDENCE.md` contains verification evidence for the required capstone requirements and evaluation probes.

`BUILDLOG.md` records:

- Where AI assistance was used
- Where AI-generated implementation required correction
- What changed during verification
- The final testing result

The goal is to make the implementation and verification auditable.

## Capstone Manifest

`capstone.yaml` defines:

- Run command
- Seed command
- Base URL
- Test command
- Evaluation endpoints

It provides a concise machine-readable entry point for evaluating the project.

## License

This repository is a capstone project provided for evaluation and demonstration purposes.
