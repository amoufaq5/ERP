// Import schemas defining column mappings and validation rules for each entity type.

import type { ImportSchema } from "./import-service";
import { IMS_SPECIALTIES } from "@/lib/data-store";
import type { UserRole } from "@/lib/auth/role-routes";

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_CLASSIFICATIONS = ["A", "B", "C", "D"] as const;
const VALID_TERRITORY_LEVELS = ["1", "2", "3", "4"] as const;
const VALID_USER_ROLES: UserRole[] = [
  "ADMIN", "NSM", "BUM", "MARKETEER", "DISTRICT_MANAGER",
  "MEDICAL_REP", "ACCOUNTANT", "WAREHOUSE", "HR",
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Doctor Import Schema ───────────────────────────────────────────────────

export const doctorImportSchema: ImportSchema = {
  entityType: "doctor",
  entityLabel: "Doctor",
  fields: [
    {
      field: "name",
      label: "Name",
      required: true,
    },
    {
      field: "specialty",
      label: "Specialty",
      required: true,
      allowedValues: IMS_SPECIALTIES,
      validate: (value: string) => {
        const normalised = value.trim();
        const match = IMS_SPECIALTIES.some(
          (s) => s.toLowerCase() === normalised.toLowerCase(),
        );
        if (!match) {
          return `must be a valid IMS specialty (e.g. "${IMS_SPECIALTIES[0]}", "${IMS_SPECIALTIES[1]}")`;
        }
        return null;
      },
    },
    {
      field: "classification",
      label: "Classification",
      required: false,
      allowedValues: VALID_CLASSIFICATIONS,
      validate: (value: string) => {
        if (!VALID_CLASSIFICATIONS.includes(value.toUpperCase() as typeof VALID_CLASSIFICATIONS[number])) {
          return "must be A, B, C, or D";
        }
        return null;
      },
    },
    {
      field: "phone",
      label: "Phone",
      required: false,
    },
    {
      field: "address",
      label: "Address",
      required: false,
    },
    {
      field: "hospital",
      label: "Hospital",
      required: false,
    },
    {
      field: "city",
      label: "City",
      required: false,
    },
    {
      field: "buId",
      label: "Business Unit ID",
      required: false,
    },
    {
      field: "assignedRepId",
      label: "Assigned Rep ID",
      required: false,
    },
  ],
};

// ─── Territory Import Schema ────────────────────────────────────────────────

export const territoryImportSchema: ImportSchema = {
  entityType: "territory",
  entityLabel: "Territory",
  fields: [
    {
      field: "name",
      label: "Name",
      required: true,
    },
    {
      field: "code",
      label: "Code",
      required: true,
    },
    {
      field: "level",
      label: "Level",
      required: true,
      allowedValues: VALID_TERRITORY_LEVELS,
      validate: (value: string) => {
        if (!VALID_TERRITORY_LEVELS.includes(value as typeof VALID_TERRITORY_LEVELS[number])) {
          return "must be 1, 2, 3, or 4";
        }
        return null;
      },
    },
    {
      field: "parentCode",
      label: "Parent Code",
      required: false,
      validate: (value: string) => {
        // Note: cross-row validation (parentCode must exist) is handled at import time,
        // not at field-level validation. Here we just ensure it's non-empty if provided.
        if (value && value.trim().length === 0) {
          return "must not be blank if provided";
        }
        return null;
      },
    },
    {
      field: "imsCode",
      label: "IMS Code",
      required: false,
    },
    {
      field: "geoShare",
      label: "Geo Share (%)",
      required: false,
      validate: (value: string) => {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return "must be a number between 0 and 100";
        }
        return null;
      },
    },
  ],
};

// ─── Product Import Schema ──────────────────────────────────────────────────

export const productImportSchema: ImportSchema = {
  entityType: "product",
  entityLabel: "Product",
  fields: [
    {
      field: "name",
      label: "Name",
      required: true,
    },
    {
      field: "sku",
      label: "SKU",
      required: true,
    },
    {
      field: "category",
      label: "Category",
      required: false,
    },
    {
      field: "price",
      label: "Price",
      required: false,
      validate: (value: string) => {
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          return "must be a positive number";
        }
        return null;
      },
    },
    {
      field: "unit",
      label: "Unit",
      required: false,
    },
    {
      field: "description",
      label: "Description",
      required: false,
    },
    {
      field: "barcode",
      label: "Barcode",
      required: false,
    },
  ],
};

// ─── User Import Schema ─────────────────────────────────────────────────────

export const userImportSchema: ImportSchema = {
  entityType: "user",
  entityLabel: "User",
  fields: [
    {
      field: "name",
      label: "Name",
      required: true,
    },
    {
      field: "email",
      label: "Email",
      required: true,
      validate: (value: string) => {
        if (!emailRegex.test(value)) {
          return "must be a valid email address";
        }
        return null;
      },
    },
    {
      field: "role",
      label: "Role",
      required: true,
      allowedValues: VALID_USER_ROLES,
      validate: (value: string) => {
        if (!VALID_USER_ROLES.includes(value.toUpperCase() as UserRole)) {
          return `must be one of: ${VALID_USER_ROLES.join(", ")}`;
        }
        return null;
      },
    },
    {
      field: "department",
      label: "Department",
      required: false,
    },
    {
      field: "territory",
      label: "Territory",
      required: false,
    },
  ],
};

// ─── Schema Registry ────────────────────────────────────────────────────────

export const IMPORT_SCHEMAS: Record<string, ImportSchema> = {
  doctor: doctorImportSchema,
  territory: territoryImportSchema,
  product: productImportSchema,
  user: userImportSchema,
};

/**
 * Get the import schema for a given entity type.
 */
export function getImportSchema(entityType: string): ImportSchema | undefined {
  return IMPORT_SCHEMAS[entityType];
}
