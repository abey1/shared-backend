# Azure deployment notes

This API targets **Azure App Service (Linux, Node 20 LTS)**, **Azure SQL Database**, **Blob Storage**, **Service Bus**, **Key Vault**, **Application Insights**, and **Azure AD B2C**.

## Configuration

1. **Secrets** — Store `DB_*`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, storage keys, and Service Bus connection strings in **Azure Key Vault**. Reference them from App Service application settings using Key Vault references: `@Microsoft.KeyVault(SecretUri=...)`.
2. **Database** — Run `database/schema.sql` against the Azure SQL logical server (use a dedicated SQL user with least privilege). Set `DB_SERVER` to `your-server.database.windows.net` (no `tcp:` prefix). Keep `DB_ENCRYPT=true` and `DB_TRUST_SERVER_CERT=false` in production.
3. **Stripe webhooks** — Register endpoint `https://<app>.azurewebsites.net/payments/webhook/stripe` on the Stripe dashboard. Use the signing secret as `STRIPE_WEBHOOK_SECRET`. The App Service site must receive the **raw JSON body** for that path (this project disables the default JSON parser globally and mounts `express.raw` first on the webhook route).
4. **Azure AD B2C** — Expose an API app registration; set `AZURE_AD_B2C_CLIENT_ID` to the API application ID and `AZURE_AD_B2C_ISSUER` to the issuer that appears in access tokens. Optionally set `AZURE_AD_B2C_JWKS_URI` if auto-discovery is not used.
5. **Platform admins** — Set `PLATFORM_ADMIN_SUBS` to a comma-separated list of B2C `sub` values allowed to resolve disputes (`POST /disputes/:id/resolve`).
6. **TLS** — Enable **HTTPS only** on App Service; do not terminate TLS in the app.
7. **Application Insights** — Set `APPLICATIONINSIGHTS_CONNECTION_STRING` from the App Insights resource. `AppInsightsService` starts the SDK when the variable is present.
8. **CORS** — Restrict `origin` in `main.ts` to known front-end origins instead of `origin: true` before production cutover.
9. **Scaling** — Use App Service **autoscale** on CPU/request rules; place long-running work (emails, PDFs, reconciliation) on **Service Bus** consumers (separate worker or Functions) rather than the request thread.

## Local development

Copy `.env.example` to `.env`. For JWT without B2C, set `NODE_ENV=development` and `JWT_DEV_SECRET` and omit Azure JWKS (the strategy uses HS256 in that mode only for local tests).
