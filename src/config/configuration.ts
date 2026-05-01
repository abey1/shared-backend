export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    server: process.env.DB_SERVER ?? '',
    database: process.env.DB_NAME ?? '',
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    encrypt: (process.env.DB_ENCRYPT ?? 'true') === 'true',
    trustServerCertificate:
      (process.env.DB_TRUST_SERVER_CERT ?? 'false') === 'true',
  },
  azureAdB2C: {
    tenant: process.env.AZURE_AD_B2C_TENANT ?? '',
    policy: process.env.AZURE_AD_B2C_POLICY ?? 'B2C_1_signupsignin',
    clientId: process.env.AZURE_AD_B2C_CLIENT_ID ?? '',
    issuer: process.env.AZURE_AD_B2C_ISSUER ?? '',
  },
  jwtDevSecret: process.env.JWT_DEV_SECRET ?? '',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },
  blob: {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME ?? '',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY ?? '',
    containers: {
      equipment: process.env.AZURE_STORAGE_CONTAINER_EQUIPMENT ?? 'equipment',
      conditions: process.env.AZURE_STORAGE_CONTAINER_CONDITIONS ?? 'conditions',
      disputes: process.env.AZURE_STORAGE_CONTAINER_DISPUTES ?? 'disputes',
      deliveries:
        process.env.AZURE_STORAGE_CONTAINER_DELIVERIES ?? 'deliveries',
    },
  },
  serviceBus: {
    connectionString: process.env.AZURE_SERVICEBUS_CONNECTION_STRING ?? '',
    rentalEventsTopic:
      process.env.AZURE_SERVICEBUS_TOPIC_RENTAL_EVENTS ?? 'rental-events',
  },
  payments: {
    applicationFeeBps: process.env.STRIPE_APPLICATION_FEE_BPS ?? '1000',
  },
  appInsights:
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? '',
});
