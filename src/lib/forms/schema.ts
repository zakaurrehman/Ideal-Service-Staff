import { z } from "zod";
import { certificationOptions, positionOptions, serviceOptions } from "./options";

export { certificationOptions, positionOptions, serviceOptions };

/**
 * Shared validation for every public form. The same schemas run in the browser
 * (instant inline feedback) and in the API route (authoritative check).
 */

const phoneRe = /^[+()\-.\s\d]{7,20}$/;
const name = z.string().trim().min(2, "Please enter your full name.").max(120);
const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200);
const phone = z
  .string()
  .trim()
  .regex(phoneRe, "Please enter a valid phone number.")
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Please include area code (10 digits).");
const optionalText = (max = 2000) => z.string().trim().max(max).optional().or(z.literal(""));


export const contactSchema = z.object({
  name,
  email,
  phone: phone.optional().or(z.literal("")),
  service: optionalText(120),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
});

export const careRequestSchema = z.object({
  recipient: z.enum(["myself", "loved-one", "organization"], { message: "Choose who the care is for." }),
  organization: optionalText(160),
  services: z.array(z.string().max(120)).min(1, "Choose at least one service."),
  startTiming: z.enum(["asap", "this-week", "this-month", "planning"], { message: "Choose when care should start." }),
  schedule: z.enum(["few-hours", "part-time", "full-time", "overnight", "live-in", "not-sure"], {
    message: "Choose the schedule you need.",
  }),
  location: z.string().trim().min(2, "Enter the city or ZIP code where care is needed.").max(120),
  name,
  email,
  phone,
  preferredContact: z.enum(["phone", "email", "whatsapp"]).default("phone"),
  notes: optionalText(4000),
});

export const bookingSchema = z.object({
  name,
  email,
  phone,
  consultationType: z.enum(["phone", "video", "in-home"], { message: "Choose a consultation type." }),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date.")
    .refine((d) => {
      // One day of tolerance: the server may run in UTC while visitors are in Pacific time.
      const earliest = new Date();
      earliest.setHours(0, 0, 0, 0);
      earliest.setDate(earliest.getDate() - 1);
      return new Date(`${d}T12:00:00`) >= earliest;
    }, "Please choose today or a future date."),
  preferredTime: z.enum(["morning", "afternoon", "evening"], { message: "Choose a preferred time." }),
  service: optionalText(120),
  location: optionalText(120),
  notes: optionalText(2000),
});


export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const jobApplicationSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email,
  phone,
  city: z.string().trim().min(2, "Enter your city.").max(120),
  positions: z.array(z.string().max(120)).min(1, "Choose at least one position."),
  employmentType: z.enum(["full-time", "part-time", "per-diem", "live-in"], { message: "Choose an employment type." }),
  availability: z.array(z.enum(["weekdays", "weekends", "evenings", "overnights"])).min(1, "Choose your availability."),
  experience: z.enum(["none", "under-1", "1-3", "3-5", "5-plus"], { message: "Choose your experience level." }),
  certifications: z.array(z.string().max(80)).optional().default([]),
  transportation: z.enum(["yes", "no"], { message: "Let us know about transportation." }),
  workAuthorized: z.enum(["yes", "no"], { message: "Please answer this question." }),
  about: optionalText(4000),
  smsConsent: z.boolean().default(false),
  attest: z.literal(true, { message: "Please confirm the information is accurate." }),
});

export const newsletterSchema = z.object({ email });

export const schemas = {
  contact: contactSchema,
  "care-request": careRequestSchema,
  booking: bookingSchema,
  "job-application": jobApplicationSchema,
  newsletter: newsletterSchema,
} as const;

export type FormKind = keyof typeof schemas;

const ARRAY_FIELDS = new Set(["services", "positions", "availability", "certifications"]);
const BOOLEAN_FIELDS = new Set(["smsConsent", "attest"]);
/** Never forwarded: anti-spam + transport fields. */
export const META_FIELDS = new Set(["kind", "company_website", "started_at", "resume"]);

/** Convert a FormData payload into the plain object the schemas expect. */
export function formDataToObject(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    if (META_FIELDS.has(key)) continue;
    if (ARRAY_FIELDS.has(key)) out[key] = fd.getAll(key).map(String).filter(Boolean);
    else if (BOOLEAN_FIELDS.has(key)) out[key] = fd.get(key) === "on" || fd.get(key) === "true";
    else out[key] = String(fd.get(key) ?? "");
  }
  for (const key of ARRAY_FIELDS) if (!(key in out)) out[key] = [];
  for (const key of BOOLEAN_FIELDS) if (!(key in out)) out[key] = false;
  return out;
}

export type FieldErrors = Record<string, string>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export const formLabels: Record<FormKind, string> = {
  contact: "Contact message",
  "care-request": "Care request",
  booking: "Consultation booking request",
  "job-application": "Employment application",
  newsletter: "Newsletter sign-up",
};
