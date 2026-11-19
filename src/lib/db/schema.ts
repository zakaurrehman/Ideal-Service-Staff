/**
 * Ideal Service Staff — PostgreSQL schema (Drizzle ORM).
 * Source of truth for migrations in /drizzle (npm run db:generate).
 * Conventions: uuid PKs, timestamptz everywhere (stored UTC), snake_case columns.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const updated = () =>
  ts("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const textArray = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

/* ═══ Enums ═══════════════════════════════════════════════════════════════ */

export const userStatus = pgEnum("user_status", ["active", "suspended", "disabled"]);
export const verificationStatus = pgEnum("employee_verification_status", [
  "application_received",
  "under_review",
  "documents_required",
  "verification_pending",
  "approved",
  "rejected",
  "suspended",
]);
export const bookingStatus = pgEnum("booking_status", [
  "draft",
  "pending_review",
  "pending_assignment",
  "assigned",
  "accepted",
  "confirmed",
  "in_progress",
  "completed",
  "cancellation_requested",
  "cancelled",
  "rejected",
]);
export const assignmentStatus = pgEnum("assignment_status", ["offered", "accepted", "declined", "withdrawn"]);
export const applicationStatus = pgEnum("application_status", [
  "submitted",
  "under_review",
  "interview",
  "documents_requested",
  "approved",
  "rejected",
  "withdrawn",
]);
export const reviewStatus = pgEnum("review_status", ["pending_review", "approved", "rejected", "expired"]);
export const requestStatus = pgEnum("request_status", ["new", "in_review", "contacted", "converted", "closed"]);
export const supportStatus = pgEnum("support_status", ["open", "in_progress", "resolved", "closed"]);
export const emailStatus = pgEnum("email_status", ["queued", "sent", "failed", "dev_logged"]);
export const eligibilityStatus = pgEnum("eligibility_status", ["requested", "approved", "revoked"]);

/* ═══ Auth & users ════════════════════════════════════════════════════════ */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    status: userStatus("status").notNull().default("active"),
    emailVerifiedAt: ts("email_verified_at"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: ts("locked_until"),
    lastLoginAt: ts("last_login_at"),
    passwordChangedAt: ts("password_changed_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`), index("users_status_idx").on(t.status)],
);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** System roles (super_admin, admin, customer, employee) cannot be deleted. */
  isSystem: boolean("is_system").notNull().default(false),
  /** Staff roles grant access to /admin. */
  isStaff: boolean("is_staff").notNull().default(false),
  createdAt: created(),
});

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  group: text("group").notNull(),
  description: text("description").notNull().default(""),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] }), index("user_roles_role_idx").on(t.roleId)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  avatarFileId: uuid("avatar_file_id").references((): AnyPgColumn => files.id, { onDelete: "set null" }),
  createdAt: created(),
  updatedAt: updated(),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    /** SHA-256 of the session token — the raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    persistent: boolean("persistent").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    createdAt: created(),
  },
  (t) => [index("user_sessions_user_idx").on(t.userId), index("user_sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: created(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: created(),
  },
  (t) => [index("email_verification_tokens_user_idx").on(t.userId)],
);

/** Fixed-window counters shared by every server instance (login, register, forms). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: ts("window_start").notNull().defaultNow(),
});

/* ═══ Files ═══════════════════════════════════════════════════════════════ */

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    driver: text("driver").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    purpose: text("purpose").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: created(),
    deletedAt: ts("deleted_at"),
  },
  (t) => [index("files_owner_idx").on(t.ownerUserId)],
);

export const fileAccessLogs = pgTable(
  "file_access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    ip: text("ip"),
    createdAt: created(),
  },
  (t) => [index("file_access_logs_file_idx").on(t.fileId)],
);

/* ═══ Customers ═══════════════════════════════════════════════════════════ */

export const customerProfiles = pgTable("customer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredContact: text("preferred_contact").notNull().default("phone"),
  createdAt: created(),
  updatedAt: updated(),
});

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region").notNull().default("CA"),
    postalCode: text("postal_code").notNull(),
    accessNotes: text("access_notes"),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: ts("archived_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("customer_addresses_customer_idx").on(t.customerId)],
);

export const customerPreferences = pgTable("customer_preferences", {
  customerId: uuid("customer_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  preferredLanguage: text("preferred_language"),
  caregiverGenderPreference: text("caregiver_gender_preference").notNull().default("no_preference"),
  hasPets: boolean("has_pets").notNull().default(false),
  notes: text("notes"),
  updatedAt: updated(),
});

/** Family members / dependents a customer books care for. */
export const customerDependents = pgTable(
  "customer_dependents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    relationship: text("relationship").notNull(),
    supportNotes: text("support_notes"),
    archivedAt: ts("archived_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("customer_dependents_customer_idx").on(t.customerId)],
);

/** Internal staff notes — never shown to the customer. */
export const customerNotes = pgTable(
  "customer_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: created(),
  },
  (t) => [index("customer_notes_customer_idx").on(t.customerId)],
);

/* ═══ Services ════════════════════════════════════════════════════════════ */

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: created(),
  updatedAt: updated(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    summary: text("summary").notNull().default(""),
    description: text("description").notNull().default(""),
    tasks: textArray("tasks"),
    icon: text("icon"),
    imagePath: text("image_path"),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    defaultDurationMinutes: integer("default_duration_minutes").notNull().default(240),
    minDurationMinutes: integer("min_duration_minutes").notNull().default(120),
    maxDurationMinutes: integer("max_duration_minutes").notNull().default(720),
    isBookable: boolean("is_bookable").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: ts("archived_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    check("services_duration_chk", sql`${t.minDurationMinutes} > 0 AND ${t.minDurationMinutes} <= ${t.maxDurationMinutes}`),
  ],
);

/** Optional published prices. Nothing is shown publicly unless an admin adds a price. */
export const servicePricing = pgTable(
  "service_pricing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    amountCents: integer("amount_cents").notNull(),
    unit: text("unit").notNull().default("hour"),
    currency: text("currency").notNull().default("USD"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("service_pricing_service_idx").on(t.serviceId), check("service_pricing_amount_chk", sql`${t.amountCents} >= 0`)],
);

/** Care requests: the public "Get Care" form and customer portal requests. */
export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    kind: text("kind").notNull().default("care-request"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    message: text("message"),
    status: requestStatus("status").notNull().default("new"),
    handledBy: uuid("handled_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("service_requests_status_idx").on(t.status, t.createdAt)],
);

/* ═══ Employees ═══════════════════════════════════════════════════════════ */

export const employeeProfiles = pgTable(
  "employee_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    verificationStatus: verificationStatus("verification_status").notNull().default("application_received"),
    statusNote: text("status_note"),
    headline: text("headline"),
    bio: text("bio"),
    yearsExperience: integer("years_experience"),
    positions: textArray("positions"),
    employmentType: text("employment_type"),
    hasTransportation: boolean("has_transportation"),
    workAuthorized: boolean("work_authorized"),
    city: text("city"),
    approvedAt: ts("approved_at"),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("employee_profiles_status_idx").on(t.verificationStatus)],
);

export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    docType: text("doc_type").notNull(),
    title: text("title").notNull(),
    status: reviewStatus("status").notNull().default("pending_review"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: ts("reviewed_at"),
    expiresOn: date("expires_on"),
    createdAt: created(),
  },
  (t) => [index("employee_documents_employee_idx").on(t.employeeId)],
);

export const employeeCertifications = pgTable(
  "employee_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    issuer: text("issuer"),
    credentialId: text("credential_id"),
    issuedOn: date("issued_on"),
    expiresOn: date("expires_on"),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    status: reviewStatus("status").notNull().default("pending_review"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: ts("reviewed_at"),
    createdAt: created(),
  },
  (t) => [index("employee_certifications_employee_idx").on(t.employeeId)],
);

export const employeeExperience = pgTable(
  "employee_experience",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    organization: text("organization").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    description: text("description"),
    createdAt: created(),
  },
  (t) => [index("employee_experience_employee_idx").on(t.employeeId)],
);

export const employeeSkills = pgTable(
  "employee_skills",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.skill] })],
);

export const employeeServiceAreas = pgTable(
  "employee_service_areas",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    area: text("area").notNull(),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.area] })],
);

/** Which services an employee may be assigned to. Only admins can approve. */
export const employeeServices = pgTable(
  "employee_services",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    status: eligibilityStatus("status").notNull().default("requested"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decidedAt: ts("decided_at"),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.employeeId, t.serviceId] }), index("employee_services_service_idx").on(t.serviceId, t.status)],
);

/** Weekly recurring working hours, in minutes from midnight (business time zone). */
export const employeeAvailability = pgTable(
  "employee_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("employee_availability_employee_idx").on(t.employeeId, t.weekday),
    check("employee_availability_range_chk", sql`${t.weekday} BETWEEN 0 AND 6 AND ${t.startMinute} >= 0 AND ${t.endMinute} <= 1440 AND ${t.startMinute} < ${t.endMinute}`),
  ],
);

/** Time off / unavailable periods. */
export const availabilityBlocks = pgTable(
  "availability_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    reason: text("reason"),
    createdAt: created(),
  },
  (t) => [index("availability_blocks_employee_idx").on(t.employeeId, t.startsAt), check("availability_blocks_range_chk", sql`${t.startsAt} < ${t.endsAt}`)],
);

/* ═══ Bookings ════════════════════════════════════════════════════════════ */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dependentId: uuid("dependent_id").references(() => customerDependents.id, { onDelete: "set null" }),
    recipientName: text("recipient_name").notNull(),
    careType: text("care_type").notNull(),
    addressId: uuid("address_id").references(() => customerAddresses.id, { onDelete: "set null" }),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    region: text("region").notNull(),
    postalCode: text("postal_code").notNull(),
    accessNotes: text("access_notes"),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    timezone: text("timezone").notNull(),
    status: bookingStatus("status").notNull().default("pending_review"),
    preferredEmployeeId: uuid("preferred_employee_id").references(() => users.id, { onDelete: "set null" }),
    instructions: text("instructions"),
    internalNotes: text("internal_notes"),
    statusBeforeRequest: bookingStatus("status_before_request"),
    cancellationReason: text("cancellation_reason"),
    cancelRequestedAt: ts("cancel_requested_at"),
    rescheduleStartsAt: ts("reschedule_starts_at"),
    rescheduleEndsAt: ts("reschedule_ends_at"),
    rescheduleReason: text("reschedule_reason"),
    rescheduleRequestedAt: ts("reschedule_requested_at"),
    source: text("source").notNull().default("customer"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("bookings_customer_idx").on(t.customerId, t.startsAt),
    index("bookings_status_idx").on(t.status, t.startsAt),
    index("bookings_starts_idx").on(t.startsAt),
    check("bookings_range_chk", sql`${t.startsAt} < ${t.endsAt}`),
  ],
);

export const bookingServices = pgTable(
  "booking_services",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    serviceName: text("service_name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    priceCents: integer("price_cents"),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.serviceId] }), index("booking_services_service_idx").on(t.serviceId)],
);

export const bookingAssignments = pgTable(
  "booking_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: assignmentStatus("status").notNull().default("offered"),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    responseNote: text("response_note"),
    respondedAt: ts("responded_at"),
    createdAt: created(),
  },
  (t) => [
    index("booking_assignments_employee_idx").on(t.employeeId, t.status),
    // At most one live assignment per booking.
    uniqueIndex("booking_assignments_live_uq").on(t.bookingId).where(sql`status IN ('offered', 'accepted')`),
  ],
);

/**
 * Reserved time on an employee's calendar. Rows are created for live
 * assignments; a GiST exclusion constraint (custom migration) makes
 * overlapping reservations for the same employee impossible.
 */
export const employeeSchedules = pgTable(
  "employee_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .unique()
      .references(() => bookingAssignments.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("booking"),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    title: text("title"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [index("employee_schedules_employee_idx").on(t.employeeId, t.startsAt), check("employee_schedules_range_chk", sql`${t.startsAt} < ${t.endsAt}`)],
);

export const bookingStatusHistory = pgTable(
  "booking_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    fromStatus: bookingStatus("from_status"),
    toStatus: bookingStatus("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("booking_status_history_booking_idx").on(t.bookingId, t.createdAt)],
);

/* ═══ Job applications ════════════════════════════════════════════════════ */

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    addressLine1: text("address_line1"),
    city: text("city").notNull(),
    region: text("region"),
    postalCode: text("postal_code"),
    positions: textArray("positions"),
    employmentType: text("employment_type").notNull(),
    availability: textArray("availability"),
    experienceLevel: text("experience_level").notNull(),
    certifications: textArray("certifications"),
    skills: textArray("skills"),
    qualifications: text("qualifications"),
    experienceSummary: text("experience_summary"),
    hasTransportation: boolean("has_transportation").notNull(),
    workAuthorized: boolean("work_authorized").notNull(),
    smsConsent: boolean("sms_consent").notNull().default(false),
    status: applicationStatus("status").notNull().default("submitted"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("job_applications_status_idx").on(t.status, t.createdAt), index("job_applications_email_idx").on(sql`lower(${t.email})`)],
);

export const applicationDocuments = pgTable(
  "application_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    docType: text("doc_type").notNull(),
    createdAt: created(),
  },
  (t) => [index("application_documents_application_idx").on(t.applicationId)],
);

export const applicationStatusHistory = pgTable(
  "application_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => jobApplications.id, { onDelete: "cascade" }),
    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("application_status_history_app_idx").on(t.applicationId, t.createdAt)],
);

/** Staff-only notes on applications and care requests. */
export const internalNotes = pgTable(
  "internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: created(),
  },
  (t) => [index("internal_notes_entity_idx").on(t.entityType, t.entityId)],
);

/* ═══ Notifications & email ═══════════════════════════════════════════════ */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: ts("read_at"),
    createdAt: created(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt), index("notifications_unread_idx").on(t.userId).where(sql`read_at IS NULL`)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
);

export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updated(),
});

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toEmail: text("to_email").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    templateKey: text("template_key").notNull(),
    subject: text("subject").notNull(),
    /** Template variables, kept so failed sends can be re-rendered and retried. */
    payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
    status: emailStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    nextAttemptAt: ts("next_attempt_at"),
    sentAt: ts("sent_at"),
    createdAt: created(),
  },
  (t) => [index("email_logs_status_idx").on(t.status, t.nextAttemptAt), index("email_logs_created_idx").on(t.createdAt)],
);

/* ═══ Administration ══════════════════════════════════════════════════════ */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: created(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt), index("audit_logs_actor_idx").on(t.actorId), index("audit_logs_entity_idx").on(t.entityType, t.entityId)],
);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updated(),
});

/** Support conversations. A thread root has parent_id NULL; replies point at it. */
export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id").references((): AnyPgColumn => supportMessages.id, { onDelete: "cascade" }),
    reference: text("reference"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    isStaff: boolean("is_staff").notNull().default(false),
    name: text("name"),
    email: text("email"),
    subject: text("subject"),
    category: text("category"),
    body: text("body").notNull(),
    status: supportStatus("status"),
    lastActivityAt: ts("last_activity_at").notNull().defaultNow(),
    createdAt: created(),
  },
  (t) => [
    index("support_messages_parent_idx").on(t.parentId, t.createdAt),
    index("support_messages_user_idx").on(t.userId),
    uniqueIndex("support_messages_reference_uq").on(t.reference).where(sql`reference IS NOT NULL`),
  ],
);

/** CMS: editable website content (contact details, homepage copy, testimonials, FAQs, SEO). */
export const contentBlocks = pgTable("content_blocks", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updated(),
});
