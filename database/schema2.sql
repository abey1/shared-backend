/*
  Schema migration (schema.sql → schema2) — additive only

  - Does NOT drop columns or indexes from dbo.businesses / dbo.business_users / dbo.users.
  - Adds any columns and constraints from the supplemental DDL that are not already present.
  - PostgreSQL-style snippets are expressed as Azure SQL / T-SQL (UNIQUEIDENTIFIER, DATETIME2, SYSUTCDATETIME).

  dbo.users: no extra columns were specified beyond existing schema.sql; unchanged.

  Optional follow-ups when you populate new columns:
  - ALTER dbo.businesses ALTER COLUMN name NVARCHAR(255) NOT NULL;
  - ALTER dbo.businesses ALTER COLUMN subdomain NVARCHAR(255) NOT NULL; (after backfill + uniqueness)
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* -------------------------------------------------------------------------
   1. dbo.user_identities (new)
   ------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.user_identities', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.user_identities (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_user_identities PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        provider_email VARCHAR(255) NULL,
        created_at DATETIME2(7) NOT NULL
            CONSTRAINT DF_user_identities_created_at DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_user_identities_user FOREIGN KEY (user_id)
            REFERENCES dbo.users (id)
            ON DELETE CASCADE,
        CONSTRAINT UQ_provider_identity UNIQUE (provider, provider_user_id)
    );
END;
GO

/* -------------------------------------------------------------------------
   2. dbo.businesses — add missing columns / constraints only
   ------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.businesses', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH(N'dbo.businesses', N'name') IS NULL
        ALTER TABLE dbo.businesses ADD name NVARCHAR(255) NULL;

    IF COL_LENGTH(N'dbo.businesses', N'subdomain') IS NULL
        ALTER TABLE dbo.businesses ADD subdomain NVARCHAR(255) NULL;

    IF COL_LENGTH(N'dbo.businesses', N'owner_user_id') IS NULL
        ALTER TABLE dbo.businesses ADD owner_user_id UNIQUEIDENTIFIER NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.businesses')
          AND name = N'UQ_businesses_subdomain'
    )
        ALTER TABLE dbo.businesses
            ADD CONSTRAINT UQ_businesses_subdomain UNIQUE (subdomain);

    IF OBJECT_ID(N'dbo.FK_business_owner', N'F') IS NULL
        ALTER TABLE dbo.businesses
            ADD CONSTRAINT FK_business_owner FOREIGN KEY (owner_user_id)
                REFERENCES dbo.users (id)
                ON DELETE SET NULL;
END;
GO

/* -------------------------------------------------------------------------
   3. dbo.business_users — widen role; optional CASCADE FKs (no column drops)
   ------------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.business_users', N'U') IS NOT NULL
BEGIN
    /* Widen from VARCHAR(32) when present; no-op if already VARCHAR(50)+ (narrowing is not attempted). */
    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = N'dbo'
          AND TABLE_NAME = N'business_users'
          AND COLUMN_NAME = N'role'
          AND DATA_TYPE = N'varchar'
          AND CHARACTER_MAXIMUM_LENGTH <> -1
          AND CHARACTER_MAXIMUM_LENGTH < 50
    )
        ALTER TABLE dbo.business_users ALTER COLUMN role VARCHAR(50) NOT NULL;

    /* recreate FKs with ON DELETE CASCADE only when they are not already CASCADE */
    DECLARE @bu_b_del tinyint;
    DECLARE @bu_u_del tinyint;

    SELECT @bu_b_del = fk.delete_referential_action
    FROM sys.foreign_keys AS fk
    WHERE fk.parent_object_id = OBJECT_ID(N'dbo.business_users')
      AND fk.name = N'FK_business_users_business';

    SELECT @bu_u_del = fk.delete_referential_action
    FROM sys.foreign_keys AS fk
    WHERE fk.parent_object_id = OBJECT_ID(N'dbo.business_users')
      AND fk.name = N'FK_business_users_user';

    IF @bu_b_del IS NOT NULL AND @bu_b_del <> 1 /* 1 = CASCADE */
    BEGIN
        ALTER TABLE dbo.business_users DROP CONSTRAINT FK_business_users_business;
        ALTER TABLE dbo.business_users
            ADD CONSTRAINT FK_business_users_business FOREIGN KEY (business_id)
                REFERENCES dbo.businesses (id)
                ON DELETE CASCADE;
    END;
    ELSE IF @bu_b_del IS NULL
    BEGIN
        ALTER TABLE dbo.business_users
            ADD CONSTRAINT FK_business_users_business FOREIGN KEY (business_id)
                REFERENCES dbo.businesses (id)
                ON DELETE CASCADE;
    END;

    IF @bu_u_del IS NOT NULL AND @bu_u_del <> 1
    BEGIN
        ALTER TABLE dbo.business_users DROP CONSTRAINT FK_business_users_user;
        ALTER TABLE dbo.business_users
            ADD CONSTRAINT FK_business_users_user FOREIGN KEY (user_id)
                REFERENCES dbo.users (id)
                ON DELETE CASCADE;
    END;
    ELSE IF @bu_u_del IS NULL
    BEGIN
        ALTER TABLE dbo.business_users
            ADD CONSTRAINT FK_business_users_user FOREIGN KEY (user_id)
                REFERENCES dbo.users (id)
                ON DELETE CASCADE;
    END;
END;
GO

/*
   -------------------------------------------------------------------------
   Merged shapes after migration (conceptual)

   dbo.businesses retains schema.sql columns:
     legal_name, tax_id, verification_status, stripe_connect_account_id,
     created_at, updated_at, deleted_at
   plus additive columns:
     name, subdomain (unique where populated — nullable allows phased rollout),
     owner_user_id (FK → users, ON DELETE SET NULL)

   dbo.business_users retains:
     updated_at and existing membership uniqueness (UQ_business_users_membership),
     with role widened to VARCHAR(50) when needed and FK deletes CASCADE.

   dbo.user_identities matches the supplied external-identity table DDL (T-SQL spelling).
*/
