/*
  B2B Equipment Rental Platform — Azure SQL Database Schema
  - PKs: UNIQUEIDENTIFIER (UUID) with NEWSEQUENTIALID() for clustered index locality
  - Timestamps: SYSUTCDATETIME() defaults; updated_at maintained by app or triggers
  - Soft delete: deleted_at NULL = active (users, businesses, equipment, rentals)
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---- Types / sanity: drop child-first if re-run in dev ---- */

IF OBJECT_ID('dbo.condition_images', 'U') IS NOT NULL DROP TABLE dbo.condition_images;
IF OBJECT_ID('dbo.equipment_conditions', 'U') IS NOT NULL DROP TABLE dbo.equipment_conditions;
IF OBJECT_ID('dbo.dispute_evidence', 'U') IS NOT NULL DROP TABLE dbo.dispute_evidence;
IF OBJECT_ID('dbo.disputes', 'U') IS NOT NULL DROP TABLE dbo.disputes;
IF OBJECT_ID('dbo.reviews', 'U') IS NOT NULL DROP TABLE dbo.reviews;
IF OBJECT_ID('dbo.deliveries', 'U') IS NOT NULL DROP TABLE dbo.deliveries;
IF OBJECT_ID('dbo.deposits', 'U') IS NOT NULL DROP TABLE dbo.deposits;
IF OBJECT_ID('dbo.payments', 'U') IS NOT NULL DROP TABLE dbo.payments;
IF OBJECT_ID('dbo.rentals', 'U') IS NOT NULL DROP TABLE dbo.rentals;
IF OBJECT_ID('dbo.equipment_images', 'U') IS NOT NULL DROP TABLE dbo.equipment_images;
IF OBJECT_ID('dbo.equipment', 'U') IS NOT NULL DROP TABLE dbo.equipment;
IF OBJECT_ID('dbo.business_users', 'U') IS NOT NULL DROP TABLE dbo.business_users;
IF OBJECT_ID('dbo.businesses', 'U') IS NOT NULL DROP TABLE dbo.businesses;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    email NVARCHAR(320) NOT NULL,
    display_name NVARCHAR(200) NOT NULL,
    azure_ad_b2c_oid NVARCHAR(64) NULL,
    password_hash NVARCHAR(512) NULL, -- nullable when auth is B2C-only
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT (SYSUTCDATETIME()),
    deleted_at DATETIME2(7) NULL,
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT UQ_users_azure_ad_b2c_oid UNIQUE (azure_ad_b2c_oid)
);
CREATE INDEX IX_users_deleted_at ON dbo.users (deleted_at) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.businesses (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_businesses PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    legal_name NVARCHAR(300) NOT NULL,
    tax_id NVARCHAR(64) NULL,
    verification_status VARCHAR(32) NOT NULL CONSTRAINT DF_businesses_verification DEFAULT ('pending')
        CHECK (verification_status IN ('pending', 'verified', 'suspended')),
    stripe_connect_account_id NVARCHAR(64) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_businesses_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_businesses_updated_at DEFAULT (SYSUTCDATETIME()),
    deleted_at DATETIME2(7) NULL
);
CREATE INDEX IX_businesses_deleted_at ON dbo.businesses (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IX_businesses_stripe_connect ON dbo.businesses (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
GO

CREATE TABLE dbo.business_users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_business_users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    business_id UNIQUEIDENTIFIER NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member')),
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_business_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_business_users_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_business_users_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_business_users_business FOREIGN KEY (business_id) REFERENCES dbo.businesses (id),
    CONSTRAINT UQ_business_users_membership UNIQUE (user_id, business_id)
);
CREATE INDEX IX_business_users_user_id ON dbo.business_users (user_id);
CREATE INDEX IX_business_users_business_id ON dbo.business_users (business_id);
GO

CREATE TABLE dbo.equipment (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_equipment PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    business_id UNIQUEIDENTIFIER NOT NULL,
    title NVARCHAR(300) NOT NULL,
    description NVARCHAR(2000) NULL,
    daily_rate_cents INT NOT NULL CONSTRAINT CK_equipment_daily_rate CHECK (daily_rate_cents >= 0),
    currency CHAR(3) NOT NULL CONSTRAINT DF_equipment_currency DEFAULT ('USD'),
    listing_status VARCHAR(32) NOT NULL CONSTRAINT DF_equipment_listing_status DEFAULT ('draft')
        CHECK (listing_status IN ('draft', 'active', 'paused', 'archived')),
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_updated_at DEFAULT (SYSUTCDATETIME()),
    deleted_at DATETIME2(7) NULL,
    CONSTRAINT FK_equipment_business FOREIGN KEY (business_id) REFERENCES dbo.businesses (id)
);
CREATE INDEX IX_equipment_business_id ON dbo.equipment (business_id);
CREATE INDEX IX_equipment_deleted_listing ON dbo.equipment (business_id, listing_status) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.equipment_images (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_equipment_images PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    equipment_id UNIQUEIDENTIFIER NOT NULL,
    blob_path NVARCHAR(1024) NOT NULL,
    sort_order INT NOT NULL CONSTRAINT DF_equipment_images_sort DEFAULT (0),
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_images_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_images_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_equipment_images_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment (id)
);
CREATE INDEX IX_equipment_images_equipment_id ON dbo.equipment_images (equipment_id);
GO

CREATE TABLE dbo.rentals (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_rentals PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    equipment_id UNIQUEIDENTIFIER NOT NULL,
    renter_business_id UNIQUEIDENTIFIER NOT NULL,
    supplier_business_id UNIQUEIDENTIFIER NOT NULL,
    start_at DATETIME2(7) NOT NULL,
    end_at DATETIME2(7) NOT NULL,
    CONSTRAINT CK_rentals_dates CHECK (end_at > start_at),
    status VARCHAR(32) NOT NULL CONSTRAINT DF_rentals_status DEFAULT ('pending')
        CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    total_amount_cents INT NOT NULL CONSTRAINT CK_rentals_total CHECK (total_amount_cents >= 0),
    currency CHAR(3) NOT NULL CONSTRAINT DF_rentals_currency DEFAULT ('USD'),
    cancellation_reason NVARCHAR(1000) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_rentals_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_rentals_updated_at DEFAULT (SYSUTCDATETIME()),
    deleted_at DATETIME2(7) NULL,
    CONSTRAINT FK_rentals_equipment FOREIGN KEY (equipment_id) REFERENCES dbo.equipment (id),
    CONSTRAINT FK_rentals_renter_business FOREIGN KEY (renter_business_id) REFERENCES dbo.businesses (id),
    CONSTRAINT FK_rentals_supplier_business FOREIGN KEY (supplier_business_id) REFERENCES dbo.businesses (id),
    CONSTRAINT CK_rentals_distinct_business CHECK (renter_business_id <> supplier_business_id)
);
CREATE INDEX IX_rentals_equipment_id ON dbo.rentals (equipment_id);
CREATE INDEX IX_rentals_renter_business_id ON dbo.rentals (renter_business_id);
CREATE INDEX IX_rentals_supplier_business_id ON dbo.rentals (supplier_business_id);
CREATE INDEX IX_rentals_status ON dbo.rentals (status);
CREATE INDEX IX_rentals_dates ON dbo.rentals (start_at, end_at);
GO

CREATE TABLE dbo.payments (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_payments PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    stripe_payment_intent_id NVARCHAR(64) NOT NULL,
    stripe_charge_id NVARCHAR(64) NULL,
    amount_cents INT NOT NULL CONSTRAINT CK_payments_amount CHECK (amount_cents >= 0),
    currency CHAR(3) NOT NULL CONSTRAINT DF_payments_currency DEFAULT ('USD'),
    status VARCHAR(32) NOT NULL CONSTRAINT DF_payments_status DEFAULT ('requires_payment_method')
        CHECK (status IN ('requires_payment_method', 'processing', 'succeeded', 'canceled', 'failed', 'refunded', 'partially_refunded')),
    failure_message NVARCHAR(2000) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_payments_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_payments_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id),
    CONSTRAINT UQ_payments_stripe_pi UNIQUE (stripe_payment_intent_id)
);
CREATE INDEX IX_payments_rental_id ON dbo.payments (rental_id);
GO

CREATE TABLE dbo.deposits (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_deposits PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    stripe_payment_intent_id NVARCHAR(64) NOT NULL,
    amount_cents INT NOT NULL CONSTRAINT CK_deposits_amount CHECK (amount_cents >= 0),
    currency CHAR(3) NOT NULL CONSTRAINT DF_deposits_currency DEFAULT ('USD'),
    status VARCHAR(32) NOT NULL CONSTRAINT DF_deposits_status DEFAULT ('held')
        CHECK (status IN ('pending', 'held', 'released', 'refunded', 'failed')),
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_deposits_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_deposits_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_deposits_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id),
    CONSTRAINT UQ_deposits_stripe_pi UNIQUE (stripe_payment_intent_id)
);
CREATE INDEX IX_deposits_rental_id ON dbo.deposits (rental_id);
GO

CREATE TABLE dbo.deliveries (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_deliveries PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    status VARCHAR(32) NOT NULL CONSTRAINT DF_deliveries_status DEFAULT ('scheduled')
        CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'returned', 'failed')),
    scheduled_at DATETIME2(7) NULL,
    delivered_at DATETIME2(7) NULL,
    tracking_reference NVARCHAR(256) NULL,
    notes NVARCHAR(2000) NULL,
    proof_blob_path NVARCHAR(1024) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_deliveries_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_deliveries_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_deliveries_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id)
);
CREATE INDEX IX_deliveries_rental_id ON dbo.deliveries (rental_id);
GO

CREATE TABLE dbo.equipment_conditions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_equipment_conditions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    phase VARCHAR(16) NOT NULL CHECK (phase IN ('before', 'after')),
    notes NVARCHAR(2000) NULL,
    inspector_user_id UNIQUEIDENTIFIER NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_conditions_created DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_equipment_conditions_updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_equipment_conditions_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id),
    CONSTRAINT FK_equipment_conditions_inspector FOREIGN KEY (inspector_user_id) REFERENCES dbo.users (id),
    CONSTRAINT UQ_equipment_conditions_rental_phase UNIQUE (rental_id, phase)
);
CREATE INDEX IX_equipment_conditions_rental_id ON dbo.equipment_conditions (rental_id);
CREATE INDEX IX_equipment_conditions_inspector ON dbo.equipment_conditions (inspector_user_id);
GO

CREATE TABLE dbo.condition_images (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_condition_images PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    condition_id UNIQUEIDENTIFIER NOT NULL,
    blob_path NVARCHAR(1024) NOT NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_condition_images_created DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_condition_images_updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_condition_images_condition FOREIGN KEY (condition_id) REFERENCES dbo.equipment_conditions (id)
);
CREATE INDEX IX_condition_images_condition_id ON dbo.condition_images (condition_id);
GO

CREATE TABLE dbo.disputes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_disputes PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    raised_by_user_id UNIQUEIDENTIFIER NOT NULL,
    status VARCHAR(32) NOT NULL CONSTRAINT DF_disputes_status DEFAULT ('open')
        CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
    subject NVARCHAR(200) NOT NULL,
    description NVARCHAR(4000) NOT NULL,
    resolution_notes NVARCHAR(4000) NULL,
    resolved_by_user_id UNIQUEIDENTIFIER NULL,
    resolved_at DATETIME2(7) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_disputes_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_disputes_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_disputes_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id),
    CONSTRAINT FK_disputes_raised_by FOREIGN KEY (raised_by_user_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_disputes_resolved_by FOREIGN KEY (resolved_by_user_id) REFERENCES dbo.users (id)
);
CREATE INDEX IX_disputes_rental_id ON dbo.disputes (rental_id);
CREATE INDEX IX_disputes_raised_by_user ON dbo.disputes (raised_by_user_id);
CREATE INDEX IX_disputes_status ON dbo.disputes (status);
GO

CREATE TABLE dbo.dispute_evidence (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_dispute_evidence PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    dispute_id UNIQUEIDENTIFIER NOT NULL,
    blob_path NVARCHAR(1024) NOT NULL,
    description NVARCHAR(1000) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_dispute_evidence_created DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_dispute_evidence_updated DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_dispute_evidence_dispute FOREIGN KEY (dispute_id) REFERENCES dbo.disputes (id)
);
CREATE INDEX IX_dispute_evidence_dispute_id ON dbo.dispute_evidence (dispute_id);
GO

CREATE TABLE dbo.reviews (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_reviews PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    rental_id UNIQUEIDENTIFIER NOT NULL,
    reviewer_user_id UNIQUEIDENTIFIER NOT NULL,
    rating TINYINT NOT NULL CONSTRAINT CK_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    comment NVARCHAR(2000) NULL,
    created_at DATETIME2(7) NOT NULL CONSTRAINT DF_reviews_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2(7) NOT NULL CONSTRAINT DF_reviews_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_reviews_rental FOREIGN KEY (rental_id) REFERENCES dbo.rentals (id),
    CONSTRAINT FK_reviews_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES dbo.users (id),
    CONSTRAINT UQ_reviews_per_rental_reviewer UNIQUE (rental_id, reviewer_user_id)
);
CREATE INDEX IX_reviews_rental_id ON dbo.reviews (rental_id);
CREATE INDEX IX_reviews_reviewer ON dbo.reviews (reviewer_user_id);
GO

/* ---- updated_at maintenance (optional server-side) ---- */
GO