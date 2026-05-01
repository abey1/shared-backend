# 🏗️ Equipment Rental Platform Backend (Summary)

## 📁 Project Location

`c:\Users\bruck\.cursor\projects\c-Users-bruck-cursor-projects-shared-backend`

---

## 1️⃣ Database Schema (Azure SQL)

- Defined in: `database/schema.sql`
- Uses:
  - UUID primary keys (`NEWSEQUENTIALID()`)
  - Foreign key indexes
  - Timestamps
  - Soft deletes where appropriate
  - CHECK constraints (statuses, amounts)

### Key Features:

- Rental lifecycle statuses
- Unique constraint: `(rental_id, phase)` for inspections
- Unique Stripe IDs for payments and deposits
- Unique reviews per `(rental_id, reviewer_user_id)`

---

## 2️⃣ Backend Architecture (NestJS + TypeScript)

```
src/
  main.ts
  app.module.ts
  config/
  auth/
  common/
  entities/
  users/
  businesses/
  equipment/
  rentals/
  payments/
  deliveries/
  disputes/
  reviews/
  infra/
health/
database/schema.sql
docs/
```

### Highlights:

- Uses TypeORM with MSSQL
- Global JWT authentication guard
- Centralized exception handling
- Modular architecture

---

## 3️⃣ REST API

- Defined in: `docs/api-rest.md`
- Public endpoints:
  - `GET /health`
  - `POST /payments/webhook/stripe`

- All other routes secured with JWT

---

## 4️⃣ Core Modules

| Module     | Description                       |
| ---------- | --------------------------------- |
| Auth       | JWT with Azure AD B2C or dev mode |
| Businesses | Company + membership management   |
| Equipment  | Listings and metadata             |
| Rentals    | Lifecycle + conditions tracking   |
| Payments   | Stripe integration                |
| Deliveries | Logistics tracking                |
| Disputes   | Issue resolution                  |
| Reviews    | Ratings system                    |

---

## 5️⃣ Stripe Integration

- Located in: `src/infra/stripe.service.ts`
- Features:
  - Payment intents (rental payments)
  - Deposit handling (manual capture)
  - Stripe Connect (destination charges)
  - Platform fee via `STRIPE_APPLICATION_FEE_BPS`

### Webhook:

- Endpoint: `POST /payments/webhook/stripe`
- Uses raw body parsing

---

## 6️⃣ Azure Integration (Planned)

- Azure App Service → API hosting
- Azure SQL Database → relational DB
- Azure Blob Storage → file storage
- Azure Service Bus → async messaging
- Azure Key Vault → secret management
- Azure Application Insights → monitoring
- Azure AD B2C → authentication

---

## 7️⃣ Build Status

- Initial build failed due to:
  - Missing `@nestjs/passport`
  - Missing imports in `payments.service.ts`

- Fixes applied:
  - Dependency added
  - Imports restored

✅ Build now succeeds (`npm run build` exit code 0)

---

## 8️⃣ Configuration

### Setup Steps:

1. Copy `.env.example` → `.env`
2. Configure:
   - Database connection
   - Stripe keys
   - Azure services

3. Apply `database/schema.sql` to Azure SQL

---

## 9️⃣ Development Mode

- Set:

  ```
  NODE_ENV=development
  JWT_DEV_SECRET=your_secret
  ```

---

## 🔟 Suggested Next Steps

- Add TypeORM migrations
- Implement Stripe Connect onboarding
- Add Service Bus consumer for notifications
- Perform full environment integration test

---

## ✅ Status

✔ Production-ready backend structure
✔ Clean build
✔ Azure-ready architecture
