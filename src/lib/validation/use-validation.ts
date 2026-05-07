"use client";

import { useCallback, useMemo, useState } from "react";
import type { ZodSchema } from "zod";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
}

export interface UseFormValidationReturn<T> {
  /** Validate the given data against the schema. Returns parsed data on success. */
  validate: (data: unknown) => ValidationResult<T>;
  /** Current field-level error messages (field name -> message). */
  errors: Record<string, string>;
  /** Clear all current errors. */
  clearErrors: () => void;
  /** True when there are no validation errors. */
  isValid: boolean;
}

/**
 * React hook that wraps a Zod schema for form validation.
 *
 * Usage:
 * ```ts
 * const { validate, errors, clearErrors, isValid } = useFormValidation(doctorSchema);
 * const result = validate(formData);
 * if (result.success) { /* use result.data * / }
 * ```
 */
export function useFormValidation<T>(schema: ZodSchema<T>): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(
    (data: unknown): ValidationResult<T> => {
      const result = schema.safeParse(data);

      if (result.success) {
        setErrors({});
        return { success: true, data: result.data };
      }

      // Map Zod issues to a flat field-name -> message record.
      // For nested paths we join with "." (e.g. "days.0.visits").
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".") || "_root";
        // Keep only the first error per field
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }

      setErrors(fieldErrors);
      return { success: false, errors: fieldErrors };
    },
    [schema],
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  return { validate, errors, clearErrors, isValid };
}
