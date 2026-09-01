# Phase 1 Design: Embeddable Widget & Lead-Capture Platform

## 1. Problem

The platform lets a customer create an embeddable widget, install it on another website with a single script tag, and receive visitor submissions through a public API.

The public submission path is treated as untrusted internet traffic. The backend validates input at the boundary, protects the endpoint against bursts and spam, enriches submissions when possible, stores them under the correct tenant, and keeps non-critical side effects from breaking the main submission path.

The implementation uses Node.js, Express, and PostgreSQL.

## 2. Core Data Model

### Tenant

A tenant represents one customer account.

```text
tenants
- id
- name
- email
- password_hash
- created_at
- updated_at