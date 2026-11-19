/** Shared server-side validation for the platform (forms re-validate on the server, always). */
import { z } from "zod";

export const nameField = (label = "name") => z.string().trim().min(1, `Enter your ${label}.`).max(80);
export const emailField = z.string().trim().toLowerCase().email("Enter a valid email address.").max(200);
export const phoneField = z
  .string()
  .trim()
  .regex(/^[+()\-.\s\d]{7,20}$/, "Enter a valid phone number.")
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Include the area code (10 digits).");
export const optionalPhone = z.union([z.literal(""), phoneField]).transform((v) => v || null);
export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => v || null);
export const reqText = (max: number, msg = "This field is required.") => z.string().trim().min(1, msg).max(max, `Keep this under ${max} characters.`);
export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
export const optIsoDate = z.union([z.literal(""), isoDate]).transform((v) => v || null);
export const uuidField = z.string().uuid("Invalid selection.");

export const registerSchema = z
  .object({
    accountType: z.enum(["customer", "employee"]),
    firstName: nameField("first name"),
    lastName: nameField("last name"),
    email: emailField,
    phone: phoneField,
    password: z.string().min(1, "Choose a password."),
    confirmPassword: z.string(),
    city: optText(120),
    terms: z.literal(true, { message: "Please accept the terms to continue." }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords don’t match." });

export const profileSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  phone: optionalPhone,
});

export const addressSchema = z.object({
  label: reqText(60, "Give this address a name, e.g. Home."),
  line1: reqText(160, "Enter the street address."),
  line2: optText(160),
  city: reqText(80, "Enter the city."),
  region: z.string().trim().length(2, "Use the 2-letter state code.").toUpperCase(),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
  accessNotes: optText(500),
  isDefault: checkbox,
});

export const dependentSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  relationship: reqText(60, "Choose the relationship."),
  supportNotes: optText(1000),
});
