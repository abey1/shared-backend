# ☁️ Azure Deployment Guide — Equipment Rental Backend

---

## 🧭 Step 0 — System Overview

You are deploying a full backend system with the following components:

- **Azure App Service** → Backend API hosting
- **Azure SQL Database** → Relational database
- **Azure Blob Storage** → File storage
- **Azure Service Bus** → Async messaging
- **Azure Key Vault** → Secrets management
- **Azure Application Insights** → Monitoring & logging
- **Azure AD B2C** → Authentication

---

## 🗄️ Step 1 — Create Azure SQL Database

### 1. Create the Database

- Go to Azure Portal
- Click **Create Resource → SQL Database**
- Configure:
  - Create a new server
  - Enable SQL + Azure AD authentication
  - Choose pricing tier (Basic or S0 for start)

---

### 2. Apply Schema

- Open **Query Editor** in Azure SQL
- Run:

```sql
-- Paste your schema.sql here
```

---

### 3. Save Connection String

Store your connection string securely (you will use it in Key Vault).

---

## 📦 Step 2 — Create Azure Blob Storage

### 1. Create Storage Account

- Go to Azure Portal
- Create → **Storage Account**

---

### 2. Create Containers

Create the following containers:

- `equipment-images`
- `condition-images`
- `dispute-evidence`
- `delivery-proof`

---

### 3. Configuration

- Set access level to **Private**
- Use **SAS tokens** from backend for uploads

---

## 🔐 Step 3 — Azure Key Vault (Secrets)

### 1. Create Key Vault

- Go to Azure Portal
- Create → **Key Vault**

---

### 2. Add Secrets

Store:

- `DB_CONNECTION_STRING`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `JWT_SECRET` (for development fallback)

---

### 3. Best Practice

Do NOT store secrets in `.env` for production—use Key Vault references.

---

## 🔑 Step 4 — Azure AD B2C (Authentication)

### 1. Create B2C Tenant

- Create a new Azure AD B2C tenant
- Link it to your subscription

---

### 2. Configure Authentication

- Register your application
- Create user flows:
  - Sign up / Sign in

---

### 3. Collect Required Values

- Client ID
- Issuer URL
- JWKS endpoint

---

### 4. Integrate

Use these values in your backend JWT strategy.

---

## 📬 Step 5 — Azure Service Bus

### 1. Create Namespace

- Create → **Service Bus Namespace**

---

### 2. Create Queue or Topic

Examples:

- `rental-events`
- `payment-events`

---

### 3. Purpose

Used for:

- async processing
- notifications
- background jobs

---

## 📊 Step 6 — Azure Application Insights

### 1. Create Instance

- Create → **Application Insights**

---

### 2. Purpose

- Performance monitoring
- Error tracking
- Logging

---

## 🚀 Step 7 — Deploy Backend to Azure App Service

---

### Option A — ZIP Deployment (Quick Start)

#### 1. Build Project

```bash
npm run build
```

---

#### 2. Prepare Deployment Package

Zip:

```
dist/
package.json
node_modules/
```

---

#### 3. Create App Service

- Create → **App Service**
- Runtime: Node.js (v18 or higher)

---

#### 4. Deploy ZIP

Upload your zip file via:

- Deployment Center
- or Azure CLI

---

### Option B — GitHub Deployment (Recommended)

1. Push project to GitHub
2. Open App Service → Deployment Center
3. Connect GitHub repository
4. Enable CI/CD

---

### App Service Configuration

Set environment variables:

- Database connection string
- Stripe keys
- Azure service configs

---

### Enable:

- HTTPS Only
- Always On
- Correct Node.js version

---

## 🔗 Step 8 — Connect All Services

Ensure backend can:

- Connect to Azure SQL
- Upload files to Blob Storage
- Authenticate via Azure AD B2C
- Process Stripe payments
- Publish messages to Service Bus

---

## 💳 Step 9 — Stripe Setup

Using Stripe:

### 1. Create Account

- Enable Stripe Connect

---

### 2. Configure Webhook

```bash
https://your-app.azurewebsites.net/payments/webhook/stripe
```

---

### 3. Verify

Ensure webhook receives and processes events correctly.

---

## 🔐 Step 10 — Security Checklist

- Use HTTPS only
- Store secrets in Key Vault
- Validate JWT tokens
- Implement role-based access control
- Restrict CORS origins
- Do NOT store payment card data

---

## 🧠 Deployment Strategy

### Phase 1 (Minimum Working System)

- Backend deployed
- Database connected
- Basic API works

---

### Phase 2

- Stripe payments functional
- Blob uploads working

---

### Phase 3

- Authentication (B2C) fully integrated
- Role-based access enforced
- Monitoring enabled

---

## ✅ Final Goal

A production-ready backend that:

- Handles secure business-to-business rentals
- Processes payments safely
- Tracks assets and disputes
- Scales on Azure infrastructure

---
