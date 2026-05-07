import { z } from "zod";
import { sanitizeString, sanitizeHTML, sanitizeEmail, sanitizePhone } from "./sanitize";
import type { UserRole } from "@/lib/user-context";

// ─── Re-usable primitives ───────────────────────────────────────────────────

const trimmedString = (min: number, max: number) =>
  z.string().min(min).max(max).transform((v) => sanitizeString(v, max));

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => sanitizeString(v, max))
    .optional();

const uuidString = z.string().uuid();
const optionalUUID = z.string().uuid().optional();

const isoDateString = z.string().refine(
  (v) => !Number.isNaN(Date.parse(v)),
  { message: "Invalid ISO date string" },
);

const validUrl = z.string().url();

const phoneRegex = /^[\d+\-\s()]{0,30}$/;
const optionalPhone = z
  .string()
  .regex(phoneRegex, "Invalid phone format")
  .transform(sanitizePhone)
  .optional();

const validPhone = z
  .string()
  .regex(phoneRegex, "Invalid phone format")
  .transform(sanitizePhone);

// ─── Enum value lists ───────────────────────────────────────────────────────

const IMS_SPECIALTIES = [
  "General Practice", "Internal Medicine", "Cardiology", "Endocrinology",
  "Gastroenterology", "Pulmonology", "Nephrology", "Neurology",
  "Rheumatology", "Dermatology", "Pediatrics", "Obstetrics & Gynecology",
  "Orthopedics", "Urology", "Oncology", "Hematology",
  "Ophthalmology", "ENT", "Psychiatry", "Anesthesiology",
  "General Surgery", "Cardiothoracic Surgery", "Neurosurgery", "Plastic Surgery",
  "Emergency Medicine", "Family Medicine", "Geriatrics", "Infectious Disease",
  "Clinical Pathology", "Radiology", "Physical Medicine", "Dentistry",
] as const;

const DOCTOR_CLASSIFICATIONS = ["A", "B", "C", "D"] as const;
const VISIT_TYPES = ["SINGLE", "DOUBLE"] as const;
const SESSIONS = ["AM", "PM"] as const;
const REQUEST_TYPES = ["SAMPLE", "LITERATURE", "EVENT", "DISCOUNT", "DOCTOR_EDIT", "OTHER"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const EXPENSE_TYPES = ["Transport", "Meals", "Accommodation", "Hotel", "Office Supplies", "Other", "Kilometrage"] as const;
const AM_ACCOUNT_TYPES = ["Hospital", "Polyclinic", "Pharmacy", "Insurance Company"] as const;

const USER_ROLES: readonly UserRole[] = [
  "ADMIN", "NSM", "BUM", "MARKETEER", "DISTRICT_MANAGER",
  "MEDICAL_REP", "ACCOUNTANT", "WAREHOUSE", "HR",
] as const;

// ─── Login ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .transform(sanitizeEmail),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Doctor ─────────────────────────────────────────────────────────────────

export const doctorSchema = z.object({
  name: trimmedString(2, 100),
  specialty: z.enum(IMS_SPECIALTIES),
  classification: z.enum(DOCTOR_CLASSIFICATIONS),
  hospital: trimmedString(1, 200).optional(),
  city: trimmedString(1, 100).optional(),
  phone: optionalPhone,
  email: z.string().email().transform(sanitizeEmail).optional(),
  address: optionalTrimmedString(500),
  notes: z
    .string()
    .max(2000)
    .transform((v) => sanitizeHTML(sanitizeString(v, 2000)))
    .optional(),
  isKOL: z.boolean().optional(),
  visitFrequency: z.number().int().min(0).max(31).optional(),
  assignedRepId: optionalUUID,
  buId: optionalUUID.nullable().optional(),
  brickId: z.string().optional().nullable(),
  potentialRevenue: z.number().min(0).optional(),
  areaWeight: z.number().min(1).max(10).optional(),
});
export type DoctorInput = z.infer<typeof doctorSchema>;

// ─── Visit ──────────────────────────────────────────────────────────────────

export const visitSchema = z.object({
  doctorId: uuidString,
  dateTime: isoDateString,
  session: z.enum(SESSIONS),
  type: z.enum(VISIT_TYPES),
  notes: z
    .string()
    .max(2000)
    .transform((v) => sanitizeHTML(sanitizeString(v, 2000)))
    .optional(),
  productIds: z.array(z.string()).optional(),
  amAccountId: optionalUUID,
  partnerId: optionalUUID,
  durationMin: z.number().int().min(0).max(480).optional(),
  buId: optionalUUID.nullable().optional(),
});
export type VisitInput = z.infer<typeof visitSchema>;

// ─── Weekly Plan ────────────────────────────────────────────────────────────

const plannedVisitSchema = z.object({
  doctorId: optionalUUID,
  amAccountId: optionalUUID,
  timeSlot: z.string().max(20),
  session: z.enum(SESSIONS),
  visitType: z.enum(VISIT_TYPES),
  partnerId: optionalUUID,
  notes: optionalTrimmedString(500),
});

const dailyPlanSchema = z.object({
  date: isoDateString,
  startingPointAM: z.string().optional(),
  startingPointPM: z.string().optional(),
  visits: z.array(plannedVisitSchema),
});

export const weeklyPlanSchema = z.object({
  weekStart: isoDateString,
  days: z.array(dailyPlanSchema).min(1).max(7),
  notes: optionalTrimmedString(1000),
});
export type WeeklyPlanInput = z.infer<typeof weeklyPlanSchema>;

// ─── Market Request ─────────────────────────────────────────────────────────

export const marketRequestSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: trimmedString(3, 200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000)
    .transform((v) => sanitizeHTML(sanitizeString(v, 2000))),
  amount: z.number().positive("Amount must be positive").optional(),
  quantity: z.number().int().min(0).optional(),
  priority: z.enum(PRIORITIES),
  doctorId: optionalUUID,
  productId: optionalUUID,
  buId: optionalUUID.nullable().optional(),
});
export type MarketRequestInput = z.infer<typeof marketRequestSchema>;

// ─── Expense ────────────────────────────────────────────────────────────────

export const expenseSchema = z.object({
  type: z.enum(EXPENSE_TYPES),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(100000, "Amount cannot exceed 100,000"),
  date: isoDateString,
  description: trimmedString(5, 500),
  receiptUrl: validUrl.optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

// ─── Business Unit ──────────────────────────────────────────────────────────

export const businessUnitSchema = z.object({
  name: trimmedString(2, 100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must be alphanumeric (dashes/underscores allowed)")
    .transform((v) => v.trim()),
  description: optionalTrimmedString(500),
  managerId: optionalUUID.nullable(),
  color: z.string().max(20).optional(),
});
export type BusinessUnitInput = z.infer<typeof businessUnitSchema>;

// ─── User ───────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  name: trimmedString(2, 100),
  email: z
    .string()
    .email("Please enter a valid email address")
    .transform(sanitizeEmail),
  role: z.enum(USER_ROLES as unknown as readonly [string, ...string[]]) as z.ZodType<UserRole>,
  department: optionalTrimmedString(100),
  territory: optionalTrimmedString(100),
});
export type UserInput = z.infer<typeof userSchema>;

// ─── Territory ──────────────────────────────────────────────────────────────

export const territorySchema = z.object({
  name: trimmedString(1, 200),
  code: trimmedString(1, 50),
  level: z
    .number()
    .int()
    .min(1, "Level must be between 1 and 4")
    .max(4, "Level must be between 1 and 4"),
  parentId: optionalUUID.nullable(),
  nameAr: optionalTrimmedString(200),
  imsCode: optionalTrimmedString(50),
});
export type TerritoryInput = z.infer<typeof territorySchema>;

// ─── Account (AM Account) ───────────────────────────────────────────────────

export const accountSchema = z.object({
  name: trimmedString(2, 200),
  type: z.enum(AM_ACCOUNT_TYPES),
  address: optionalTrimmedString(500),
  city: optionalTrimmedString(100),
  phone: optionalPhone,
  email: z.string().email().transform(sanitizeEmail).optional(),
  website: validUrl.optional(),
  industry: optionalTrimmedString(100),
  contactPerson: optionalTrimmedString(200),
  notes: optionalTrimmedString(2000),
  assignedRepId: optionalUUID.nullable(),
  buId: optionalUUID.nullable().optional(),
});
export type AccountInput = z.infer<typeof accountSchema>;
