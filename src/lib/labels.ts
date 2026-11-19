/** Human labels + colour tones for every status enum in the platform. */
export type Tone = "teal" | "amber" | "navy" | "red" | "gray";

const L: Record<string, [string, Tone]> = {
  // bookings
  draft: ["Draft", "gray"],
  pending_review: ["Pending review", "amber"],
  pending_assignment: ["Pending assignment", "amber"],
  assigned: ["Assigned", "navy"],
  accepted: ["Accepted", "teal"],
  confirmed: ["Confirmed", "teal"],
  in_progress: ["In progress", "navy"],
  completed: ["Completed", "teal"],
  cancellation_requested: ["Cancellation requested", "amber"],
  cancelled: ["Cancelled", "red"],
  rejected: ["Rejected", "red"],
  // employee verification
  application_received: ["Application received", "amber"],
  under_review: ["Under review", "amber"],
  documents_required: ["Documents required", "amber"],
  verification_pending: ["Verification pending", "amber"],
  approved: ["Approved", "teal"],
  suspended: ["Suspended", "red"],
  // applications
  submitted: ["Submitted", "amber"],
  interview: ["Interview", "navy"],
  documents_requested: ["Documents requested", "amber"],
  withdrawn: ["Withdrawn", "gray"],
  // documents
  expired: ["Expired", "red"],
  // requests / support
  new: ["New", "amber"],
  in_review: ["In review", "amber"],
  contacted: ["Contacted", "navy"],
  converted: ["Converted to booking", "teal"],
  closed: ["Closed", "gray"],
  open: ["Open", "amber"],
  resolved: ["Resolved", "teal"],
  // email
  queued: ["Queued", "amber"],
  sent: ["Sent", "teal"],
  failed: ["Failed", "red"],
  dev_logged: ["Dev log only — not sent", "gray"],
  // assignments
  offered: ["Awaiting response", "amber"],
  declined: ["Declined", "red"],
  // users / eligibility
  active: ["Active", "teal"],
  disabled: ["Disabled", "gray"],
  requested: ["Requested", "amber"],
  revoked: ["Revoked", "red"],
};

export const statusLabel = (s: string | null | undefined) => (s ? (L[s]?.[0] ?? s.replace(/_/g, " ")) : "—");
export const statusTone = (s: string | null | undefined): Tone => (s ? (L[s]?.[1] ?? "gray") : "gray");

export const BOOKING_STATUSES = [
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
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "application_received",
  "under_review",
  "documents_required",
  "verification_pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const APPLICATION_STATUSES = ["submitted", "under_review", "interview", "documents_requested", "approved", "rejected", "withdrawn"] as const;

export const CARE_TYPES = [
  { value: "one-time", label: "One-time visit", description: "A single visit on the date you choose." },
  { value: "respite", label: "Respite care", description: "Short-term relief for a family caregiver." },
  { value: "post-hospital", label: "Transition home", description: "Support after a hospital or facility stay." },
  { value: "ongoing", label: "Start of ongoing care", description: "First visit of a regular schedule — we’ll plan the rest with you." },
] as const;

export const RELATIONSHIPS = ["Parent", "Spouse / partner", "Grandparent", "Child", "Sibling", "Other relative", "Friend", "Client (organization)"];

export const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government-issued ID" },
  { value: "work_authorization", label: "Work authorization" },
  { value: "background_check", label: "Background check" },
  { value: "tb_test", label: "TB test result" },
  { value: "resume", label: "Résumé" },
  { value: "reference", label: "Reference letter" },
  { value: "other", label: "Other" },
] as const;
export const docTypeLabel = (v: string) => DOCUMENT_TYPES.find((d) => d.value === v)?.label ?? v;

export const SKILL_SUGGESTIONS = [
  "Personal care (ADLs)",
  "Mobility & transfers",
  "Dementia & memory care",
  "Meal preparation",
  "Medication reminders",
  "Companionship",
  "Light housekeeping",
  "Transportation & errands",
  "Respite care",
  "Post-hospital support",
  "Bilingual — Spanish",
  "Hoyer lift",
];

export const SUPPORT_CATEGORIES = ["Bookings", "Account", "Billing question", "Documents", "Feedback", "Other"];
