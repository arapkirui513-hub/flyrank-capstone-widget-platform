# Build Log

## Project

Embeddable Widget & Lead-Capture Platform

## Development Approach

The implementation was developed iteratively from the capstone requirements and the Phase 1 design document.

AI assistance was used as a development aid for implementation planning, code drafting, test design, debugging, and review.

The resulting code was manually executed and tested locally. AI-generated suggestions were not treated as proof of correctness.

## Where AI Helped

AI assistance was used for:

- Translating the capstone requirements into implementation tasks.
- Designing the PostgreSQL schema and API structure.
- Drafting Express middleware and route implementations.
- Designing Zod validation schemas.
- Drafting authentication and tenant-isolation logic.
- Designing automated tests with Node's built-in test runner and Supertest.
- Designing deterministic geo fallback tests.
- Designing deterministic side-effect failure tests.
- Reviewing boundary validation behavior.
- Reviewing CORS and security-header behavior.
- Debugging test failures.
- Reviewing the repository for submission readiness.

## Where AI Was Wrong or Needed Correction

Several implementation and test assumptions required correction during development.

### Embed Snippet Test

The initial test assumed Supertest would use:

```text
http://localhost:3000
```

The actual request host used by the test server was a dynamically assigned `127.0.0.1` port.

The test was corrected to validate the generated script URL without relying on a fixed test-server port.

### Public Widget Configuration Test

The initial test expected widget fields at the top level of the response.

The actual API contract returns:

```json
{
  "widget": {
    "id": "...",
    "title": "...",
    "version": 1
  }
}
```

The test was corrected to assert against `response.body.widget`.

### Error Handling

Malformed JSON and oversized request bodies initially produced noisy error logs even though the API correctly returned 4xx responses.

The error handler was changed so expected client errors are handled before the generic server-error log.

### Geo Testing

Randomized or live external-provider behavior would make fallback tests unreliable.

The geo tests were changed to use deterministic mocked provider responses so Provider A success, Provider A failure with Provider B success, and total provider failure can be tested consistently.

### Side-Effect Testing

Random side-effect failures were replaced with the deterministic:

```text
FORCE_SIDE_EFFECT_FAILURE=true
```

configuration. This allows the failure path to be reproduced without relying on randomness.

## Verification

The implementation was manually tested against all six capstone evaluation probes.

The automated test suite was also run with:

```text
node --test .\test\*.test.js
```

Final automated result:

```text
tests 33
pass 33
fail 0
cancelled 0
skipped 0
todo 0
```

## Human Verification

The following behaviors were manually verified rather than inferred from generated code:

- Cross-origin submission succeeds.
- Submissions are persisted in PostgreSQL.
- Invalid and oversized requests return appropriate 4xx responses.
- Rate limiting produces 429 responses and recovers after the window.
- Geo Provider A falls back to Provider B.
- Both geo providers failing does not prevent storage.
- Forced side-effect failure does not prevent successful submission.
- Honeypot submissions are not persisted.
- Tenant isolation works across widget management endpoints.
- Widget embed snippets are generated.
- Public widget configuration is accessible without authentication.
- Widget JavaScript is served with cache headers.
- Dashboard statistics reflect stored submissions.
