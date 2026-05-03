/*
  Seed data — tool rental platform (supplier-focused demo).
  Re-runnable: deletes seed-affected rows in FK-safe order, then inserts.
  Assumes schema from schema.sql already exists.

  Users = platform accounts (Entra OID simulated in azure_ad_b2c_oid).
*/

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---- Clear existing data (child tables first) ---- */

DELETE FROM dbo.condition_images;
DELETE FROM dbo.equipment_conditions;
DELETE FROM dbo.dispute_evidence;
DELETE FROM dbo.disputes;
DELETE FROM dbo.reviews;
DELETE FROM dbo.deliveries;
DELETE FROM dbo.deposits;
DELETE FROM dbo.payments;
DELETE FROM dbo.rentals;
DELETE FROM dbo.equipment_images;
DELETE FROM dbo.equipment;
DELETE FROM dbo.business_users;
DELETE FROM dbo.businesses;
DELETE FROM dbo.users;
GO

/* ---- Step 1: Users (PK defaults use NEWSEQUENTIALID()) ---- */

DECLARE @Users TABLE (
  email NVARCHAR(320) NOT NULL PRIMARY KEY,
  id UNIQUEIDENTIFIER NOT NULL
);

INSERT INTO dbo.users (email, display_name, azure_ad_b2c_oid, password_hash, created_at, updated_at, deleted_at)
OUTPUT inserted.email, inserted.id INTO @Users (email, id)
VALUES
  (N'bunnings@shared.com', N'Bunnings Hire Admin', CONVERT(NVARCHAR(64), NEWID()), NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'prohire@shared.com', N'Pro Hire Operations', CONVERT(NVARCHAR(64), NEWID()), NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'urbanrentals@shared.com', N'Urban Equipment Team', CONVERT(NVARCHAR(64), NEWID()), NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'metrorenter@shared.com', N'Metro Builders Accounts', CONVERT(NVARCHAR(64), NEWID()), NULL, GETUTCDATE(), GETUTCDATE(), NULL);

DECLARE
  @UserBunnings UNIQUEIDENTIFIER = (SELECT id FROM @Users WHERE email = N'bunnings@shared.com'),
  @UserProhire UNIQUEIDENTIFIER = (SELECT id FROM @Users WHERE email = N'prohire@shared.com'),
  @UserUrban UNIQUEIDENTIFIER = (SELECT id FROM @Users WHERE email = N'urbanrentals@shared.com'),
  @UserMetro UNIQUEIDENTIFIER = (SELECT id FROM @Users WHERE email = N'metrorenter@shared.com');

/* ---- Step 2: Businesses (no owner column — link via business_users) ---- */

DECLARE @Businesses TABLE (
  legal_name NVARCHAR(300) NOT NULL,
  id UNIQUEIDENTIFIER NOT NULL,
  tag VARCHAR(16) NULL
);

INSERT INTO dbo.businesses (legal_name, tax_id, verification_status, stripe_connect_account_id, created_at, updated_at, deleted_at)
OUTPUT inserted.legal_name, inserted.id INTO @Businesses (legal_name, id)
VALUES
  (N'Bunnings Tool Hire', N'GST-BUN-1001', N'verified', NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'Pro Construction Rentals', N'EIN-PRO-7788', N'verified', NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'Urban Equipment Co', N'ABN-URB-4420', N'verified', NULL, GETUTCDATE(), GETUTCDATE(), NULL),
  (N'Metro Builders Equipment', N'EIN-MTR-9012', N'verified', NULL, GETUTCDATE(), GETUTCDATE(), NULL);

UPDATE b SET b.tag = x.tag
FROM @Businesses b
INNER JOIN (
  SELECT N'Bunnings Tool Hire' AS legal_name, 'bunnings' AS tag UNION ALL
  SELECT N'Pro Construction Rentals', 'prohire' UNION ALL
  SELECT N'Urban Equipment Co', 'urban' UNION ALL
  SELECT N'Metro Builders Equipment', 'metro'
) x ON x.legal_name = b.legal_name;

DECLARE
  @BizBunnings UNIQUEIDENTIFIER = (SELECT id FROM @Businesses WHERE tag = 'bunnings'),
  @BizProhire UNIQUEIDENTIFIER = (SELECT id FROM @Businesses WHERE tag = 'prohire'),
  @BizUrban UNIQUEIDENTIFIER = (SELECT id FROM @Businesses WHERE tag = 'urban'),
  @BizMetro UNIQUEIDENTIFIER = (SELECT id FROM @Businesses WHERE tag = 'metro');

INSERT INTO dbo.business_users (user_id, business_id, role, created_at, updated_at)
VALUES
  (@UserBunnings, @BizBunnings, 'owner', GETUTCDATE(), GETUTCDATE()),
  (@UserProhire, @BizProhire, 'owner', GETUTCDATE(), GETUTCDATE()),
  (@UserUrban, @BizUrban, 'owner', GETUTCDATE(), GETUTCDATE()),
  (@UserMetro, @BizMetro, 'owner', GETUTCDATE(), GETUTCDATE());
GO

/* ---- Step 3–5: Equipment, images, rentals (batch needs same variable scope — use nested GO or repeat DECLARE) ---- */

DECLARE
  @BizBunnings UNIQUEIDENTIFIER = (SELECT id FROM dbo.businesses WHERE legal_name = N'Bunnings Tool Hire'),
  @BizProhire UNIQUEIDENTIFIER = (SELECT id FROM dbo.businesses WHERE legal_name = N'Pro Construction Rentals'),
  @BizUrban UNIQUEIDENTIFIER = (SELECT id FROM dbo.businesses WHERE legal_name = N'Urban Equipment Co'),
  @BizMetro UNIQUEIDENTIFIER = (SELECT id FROM dbo.businesses WHERE legal_name = N'Metro Builders Equipment');

DECLARE @Equipment TABLE (
  title NVARCHAR(300) NOT NULL,
  id UNIQUEIDENTIFIER NOT NULL
);

INSERT INTO dbo.equipment (business_id, title, description, daily_rate_cents, currency, listing_status, created_at, updated_at, deleted_at)
OUTPUT inserted.title, inserted.id INTO @Equipment (title, id)
VALUES
  /* Bunnings Tool Hire */
  (@BizBunnings, N'Mini Excavator 1.7T', N'Compact tracked excavator ideal for tight sites. Includes bucket set and quick hitch.', 14500, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizBunnings, N'Cement Mixer 3.5 cu ft', N'Electric portable mixer; drum tilt for easy pour. Cleaned between hires.', 3500, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizBunnings, N'Heavy-Duty Ladder 24ft', N'Fiberglass extension ladder, Type IA 300 lb rating.', 2800, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizBunnings, N'Gasoline Generator 6500W', N'Reliable jobsite power; multiple 120/240V outlets; wheel kit included.', 4200, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizBunnings, N'Pressure Washer 3000 PSI', N'Commercial cold-water unit with 50ft hose and surface cleaner attachment.', 3800, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  /* Pro Construction Rentals */
  (@BizProhire, N'Rotary Hammer Drill SDS-Max', N'Demolition-ready rotary hammer with vibration control and carry case.', 4500, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizProhire, N'Cordless Impact Driver Kit', N'Brushless 18V kit with 2 batteries and charger.', 2200, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizProhire, N'Circular Saw 7-1/4 in', N'Magnesium base, electric brake; ripping and crosscut blades included.', 1800, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizProhire, N'Plate Compactor', N'Forward plate for trenches and pavers; low-hours fleet.', 5500, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizProhire, N'Scissor Lift 19ft', N'Narrow electric lift for indoor fit-out; ANSI inspected.', 12500, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  /* Urban Equipment Co */
  (@BizUrban, N'Scaffold Tower (Aluminum)', N'Mobile tower with guardrails and stabilizers; quick assembly.', 4800, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizUrban, N'Concrete Cut-Off Saw', N'14in gas saw with water attachment for dust control.', 6200, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizUrban, N'Air Compressor 20 gal', N'Oil-free 2-stage; suitable for nailers and light spraying.', 2400, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizUrban, N'Floor Sander (Drum)', N'Pro floor refinishing drum sander with dust bag.', 8900, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL),
  (@BizUrban, N'Electric Mini Dumper', N'Tracks and skip for moving aggregate on tight jobs.', 7200, 'USD', 'active', GETUTCDATE(), GETUTCDATE(), NULL);

/* Images: 1–3 per tool; blob_path stores public image URLs for UI demos */

INSERT INTO dbo.equipment_images (equipment_id, blob_path, sort_order, created_at, updated_at)
SELECT e.id, v.blob_path, v.sort_order, GETUTCDATE(), GETUTCDATE()
FROM @Equipment e
INNER JOIN (
  VALUES
    (N'Mini Excavator 1.7T', N'https://source.unsplash.com/800x600/?excavator,construction', 0),
    (N'Mini Excavator 1.7T', N'https://source.unsplash.com/800x600/?heavy,equipment', 1),
    (N'Cement Mixer 3.5 cu ft', N'https://source.unsplash.com/800x600/?concrete,mixer', 0),
    (N'Cement Mixer 3.5 cu ft', N'https://source.unsplash.com/800x600/?construction,tool', 1),
    (N'Heavy-Duty Ladder 24ft', N'https://source.unsplash.com/800x600/?ladder,tools', 0),
    (N'Gasoline Generator 6500W', N'https://source.unsplash.com/800x600/?generator,tool', 0),
    (N'Gasoline Generator 6500W', N'https://source.unsplash.com/800x600/?construction,site', 1),
    (N'Pressure Washer 3000 PSI', N'https://source.unsplash.com/800x600/?pressure,washing', 0),
    (N'Pressure Washer 3000 PSI', N'https://source.unsplash.com/800x600/?cleaning,equipment', 1),
    (N'Pressure Washer 3000 PSI', N'https://source.unsplash.com/800x600/?construction,tool', 2),
    (N'Rotary Hammer Drill SDS-Max', N'https://source.unsplash.com/800x600/?drill', 0),
    (N'Rotary Hammer Drill SDS-Max', N'https://source.unsplash.com/800x600/?construction,tool', 1),
    (N'Cordless Impact Driver Kit', N'https://source.unsplash.com/800x600/?drill,tools', 0),
    (N'Circular Saw 7-1/4 in', N'https://source.unsplash.com/800x600/?circular,saw', 0),
    (N'Circular Saw 7-1/4 in', N'https://source.unsplash.com/800x600/?woodworking,tools', 1),
    (N'Plate Compactor', N'https://source.unsplash.com/800x600/?compactor,construction', 0),
    (N'Scissor Lift 19ft', N'https://source.unsplash.com/800x600/?scissor,lift', 0),
    (N'Scissor Lift 19ft', N'https://source.unsplash.com/800x600/?construction,equipment', 1),
    (N'Scaffold Tower (Aluminum)', N'https://source.unsplash.com/800x600/?scaffold,building', 0),
    (N'Scaffold Tower (Aluminum)', N'https://source.unsplash.com/800x600/?construction', 1),
    (N'Scaffold Tower (Aluminum)', N'https://source.unsplash.com/800x600/?construction,tool', 2),
    (N'Concrete Cut-Off Saw', N'https://source.unsplash.com/800x600/?concrete,saw', 0),
    (N'Air Compressor 20 gal', N'https://source.unsplash.com/800x600/?compressor,tools', 0),
    (N'Floor Sander (Drum)', N'https://source.unsplash.com/800x600/?flooring,tools', 0),
    (N'Floor Sander (Drum)', N'https://source.unsplash.com/800x600/?wood,floor', 1),
    (N'Electric Mini Dumper', N'https://source.unsplash.com/800x600/?dumper,construction', 0)
) AS v(title, blob_path, sort_order) ON v.title = e.title;

/* ---- Step 5: Sample rentals (renter ≠ supplier) ---- */

DECLARE
  @EquipExcavator UNIQUEIDENTIFIER = (SELECT id FROM dbo.equipment WHERE title = N'Mini Excavator 1.7T'),
  @EquipImpact UNIQUEIDENTIFIER = (SELECT id FROM dbo.equipment WHERE title = N'Cordless Impact Driver Kit');

INSERT INTO dbo.rentals (
  equipment_id,
  renter_business_id,
  supplier_business_id,
  start_at,
  end_at,
  status,
  total_amount_cents,
  currency,
  cancellation_reason,
  created_at,
  updated_at,
  deleted_at
)
VALUES
  (
    @EquipExcavator,
    @BizMetro,
    @BizBunnings,
    DATEADD(DAY, 7, SYSUTCDATETIME()),
    DATEADD(DAY, 10, SYSUTCDATETIME()),
    N'confirmed',
    43500, /* 3 days × 14500 */
    N'USD',
    NULL,
    GETUTCDATE(),
    GETUTCDATE(),
    NULL
  ),
  (
    @EquipImpact,
    @BizMetro,
    @BizProhire,
    DATEADD(DAY, -3, SYSUTCDATETIME()),
    DATEADD(DAY, 1, SYSUTCDATETIME()),
    N'active',
    8800, /* 4 days × 2200 */
    N'USD',
    NULL,
    GETUTCDATE(),
    GETUTCDATE(),
    NULL
  );
GO

PRINT N'Seed completed: users, businesses, business_users, equipment, equipment_images, rentals.';
GO
