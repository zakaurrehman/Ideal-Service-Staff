/**
 * Form option lists and shared form types — deliberately free of zod so they
 * can ship in the initial page bundle. Validation schemas (lib/forms/schema.ts)
 * are loaded on demand when a visitor first interacts with a form.
 */
import { services } from "@/content/services";

export const serviceOptions = [...services.map((s) => s.title), "Not sure yet — please advise"];

export const positionOptions = [
  "Personal Care Aide (PCA)",
  "Home Health Aide (HHA)",
  "Certified Nursing Assistant (CNA)",
  "Nurse (LVN / RN)",
  "Medical / Nursing Assistant",
  "Companion Caregiver",
  "Personal Caregiver",
  "Therapy & Respite Care Worker",
  "Mobility & Transport Aide",
  "Mental Health Support Staff",
  "Personal Assistant",
  "Administrative Support",
];

export const certificationOptions = [
  "CA Home Care Aide Registry",
  "CNA certification",
  "HHA certification",
  "CPR / First Aid",
  "LVN / RN license",
  "None yet",
];

export type FormKind = "contact" | "care-request" | "booking" | "job-application" | "newsletter";
export type FieldErrors = Record<string, string>;
