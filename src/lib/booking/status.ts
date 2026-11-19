/**
 * Booking state machine. Every status change in the platform goes through
 * `canTransition` — UI buttons are derived from it, and the server re-checks it.
 */
import type { BookingStatus } from "../labels";

export type Actor = "customer" | "employee" | "admin" | "system";

const T: Record<BookingStatus, Partial<Record<BookingStatus, Actor[]>>> = {
  draft: { pending_review: ["admin", "customer"], pending_assignment: ["admin"], cancelled: ["admin", "customer"] },
  pending_review: { pending_assignment: ["admin"], rejected: ["admin"], cancelled: ["admin", "customer"] },
  pending_assignment: { assigned: ["admin", "system"], cancellation_requested: ["customer"], cancelled: ["admin"], rejected: ["admin"] },
  assigned: { accepted: ["employee"], pending_assignment: ["employee", "admin", "system"], cancellation_requested: ["customer"], cancelled: ["admin"] },
  accepted: { confirmed: ["admin"], pending_assignment: ["admin", "system"], cancellation_requested: ["customer"], cancelled: ["admin"] },
  confirmed: { in_progress: ["employee", "admin"], pending_assignment: ["admin", "system"], cancellation_requested: ["customer"], cancelled: ["admin"], completed: ["admin"] },
  in_progress: { completed: ["employee", "admin"] },
  completed: {},
  cancellation_requested: {
    cancelled: ["admin"],
    // Admin declines the request → back to the status before it (validated separately).
    pending_assignment: ["admin"],
    assigned: ["admin"],
    accepted: ["admin"],
    confirmed: ["admin"],
  },
  cancelled: {},
  rejected: {},
};

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor) {
  return Boolean(T[from]?.[to]?.includes(actor));
}

export function nextStatuses(from: BookingStatus, actor: Actor) {
  return (Object.entries(T[from] ?? {}) as [BookingStatus, Actor[]][]).filter(([, a]) => a.includes(actor)).map(([s]) => s);
}

/** Statuses during which the booking holds (or is waiting for) a professional's time. */
export const LIVE_STATUSES: BookingStatus[] = ["pending_review", "pending_assignment", "assigned", "accepted", "confirmed", "in_progress", "cancellation_requested"];
export const UPCOMING_STATUSES: BookingStatus[] = ["pending_review", "pending_assignment", "assigned", "accepted", "confirmed", "cancellation_requested"];
export const FINAL_STATUSES: BookingStatus[] = ["completed", "cancelled", "rejected"];
/** Statuses where an assigned professional holds the time slot. */
export const ASSIGNED_STATUSES: BookingStatus[] = ["assigned", "accepted", "confirmed", "in_progress"];

/** Customers may ask to cancel or reschedule while a booking is still upcoming. */
export const customerCanRequestChange = (s: BookingStatus) => ["pending_assignment", "assigned", "accepted", "confirmed"].includes(s);
/** Not yet processed by the team → the customer can withdraw it immediately. */
export const customerCanCancelDirectly = (s: BookingStatus) => s === "pending_review" || s === "draft";
