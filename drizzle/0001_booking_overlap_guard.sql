-- Double-booking guard: an employee can never hold two overlapping reservations.
-- Enforced by PostgreSQL itself, so it holds under concurrent requests.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "employee_schedules"
  ADD CONSTRAINT "employee_schedules_no_overlap"
  EXCLUDE USING gist ("employee_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&);
