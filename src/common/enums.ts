export enum BusinessUserRole {
  Owner = 'owner',
  Admin = 'admin',
  Manager = 'manager',
  Member = 'member',
}

export enum VerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Suspended = 'suspended',
}

export enum EquipmentListingStatus {
  Draft = 'draft',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

export enum RentalStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Active = 'active',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum PaymentStatus {
  RequiresPaymentMethod = 'requires_payment_method',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Canceled = 'canceled',
  Failed = 'failed',
  Refunded = 'refunded',
  PartiallyRefunded = 'partially_refunded',
}

export enum DepositStatus {
  Pending = 'pending',
  Held = 'held',
  Released = 'released',
  Refunded = 'refunded',
  Failed = 'failed',
}

export enum DeliveryStatus {
  Scheduled = 'scheduled',
  InTransit = 'in_transit',
  Delivered = 'delivered',
  Returned = 'returned',
  Failed = 'failed',
}

export enum ConditionPhase {
  Before = 'before',
  After = 'after',
}

export enum DisputeStatus {
  Open = 'open',
  UnderReview = 'under_review',
  Resolved = 'resolved',
  Rejected = 'rejected',
}

export enum AppRole {
  PlatformAdmin = 'platform_admin',
  BusinessUser = 'business_user',
  BusinessOwner = 'business_owner',
  BusinessManager = 'business_manager',
}
