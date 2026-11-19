# Booking system

The platform has its own booking engine (`src/lib/booking/`). Amelia and WordPress are not used.

## Customer flow

The wizard is at `/customer/book/`:

1. Service
2. Care type and visit length (within the service's min/max)
3. Who the care is for: the account holder, or one of their own dependents
4. Location: a saved address, or a new one (saved to the account)
5. Date and start time, from a calendar of valid slots
6. Preferred professional (optional; only when the setting is on, showing only professionals free at that time)
7. Review and instructions
8. Submit

On submit, the server re-validates everything:
- the slot is still valid;
- the address and dependent belong to the customer;
- the customer is under their booking limit;
- the email is verified.

It then creates the booking with a reference `ISS-XXXXXX`. The customer and staff are notified in the app and by email.

## Statuses and who may change them

| From → To | Who |
| --- | --- |
| draft → pending_review / pending_assignment | customer / admin |
| pending_review → pending_assignment (approve), rejected, cancelled | admin; the customer can cancel |
| pending_assignment → assigned | admin, via **Assign** only |
| assigned → accepted / back to pending_assignment | employee accepts / employee declines or admin unassigns |
| accepted → confirmed | admin |
| confirmed → in_progress | the assigned employee, from N minutes before the start time (setting) or admin |
| in_progress → completed | the assigned employee or admin |
| pending_assignment, assigned, accepted, confirmed → cancellation_requested | customer |
| cancellation_requested → cancelled, or back to the previous status | admin approves or declines |

Every change is written to `booking_status_history` with the actor and an optional note. The rules are in `src/lib/booking/status.ts` and are covered by tests.

Customers can **withdraw** a request themselves while it's still Pending review. After that, they *request* cancellation or rescheduling and an admin decides.

## Eligibility and matching

A professional is offered to admins only if all of these hold:
- they are approved and their account is active;
- they are approved for that service;
- the visit falls within their weekly working hours on that day;
- they have no time off overlapping it;
- they have no overlapping reservation.

Ineligible professionals are still listed, disabled, with the reason.

**Suggested order** (admins can choose any eligible professional):
1. the customer's preferred professional;
2. those who serve the booking's city or ZIP;
3. those with the fewest upcoming visits;
4. alphabetical.

There is no fully automatic assignment. An admin always confirms the match.

## Double-booking prevention

Assigning a professional inserts a reservation into `employee_schedules` inside a transaction that locks the booking row. A **PostgreSQL GiST exclusion constraint** rejects any reservation that overlaps an existing one for the same employee. This guarantee holds under concurrent requests from different servers.

A test fires two simultaneous assignments of the same professional to overlapping bookings: exactly one succeeds. Rescheduling moves the reservation inside a savepoint. If the professional can no longer make the new time, they're released and the booking returns to Pending assignment, with notifications.

## Time zones

All instants are stored in UTC. Business hours, slots and every displayed time use the business time zone (default `America/Los_Angeles`). The conversions are DST-safe; there are tests for the March changeover.

## Settings

These are in Admin → Settings. **They are defaults for the owner to confirm, not published business rules:**

| Setting | Default |
| --- | --- |
| Bookable hours | 7:00 AM – 9:00 PM |
| Minimum notice | 24 h |
| Booking window | 60 days |
| Slot interval | 30 min |
| Requested cancellation notice | 24 h |
| Max upcoming bookings per customer | 10 |
| Customers may pick a professional | on |
| Verified email required to book | on |
| Employees can start a visit | 60 min early |

No prices are shown or charged. Payments are not part of the platform, and revenue reports are therefore not shown.
