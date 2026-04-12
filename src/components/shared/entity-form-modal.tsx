"use client";

import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EntityFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "textarea"
  | "tel"
  | "url"
  | "checkbox";

export interface EntityField {
  name: string;
  label: string;
  type: EntityFieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean | string[];
  fullWidth?: boolean;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export type EntityFormValue = string | number | boolean | string[];
export type EntityFormData = Record<string, EntityFormValue>;

interface EntityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: EntityField[];
  initialData?: EntityFormData;
  onSubmit: (data: EntityFormData) => void;
  submitLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  footerExtra?: ReactNode;
}

function buildInitial(fields: EntityField[], initial?: EntityFormData): EntityFormData {
  const out: EntityFormData = {};
  for (const f of fields) {
    const v = initial?.[f.name];
    if (v !== undefined) {
      out[f.name] = v;
      continue;
    }
    if (f.defaultValue !== undefined) {
      out[f.name] = f.defaultValue;
      continue;
    }
    switch (f.type) {
      case "number":
        out[f.name] = 0;
        break;
      case "checkbox":
        out[f.name] = false;
        break;
      case "multiselect":
        out[f.name] = [];
        break;
      default:
        out[f.name] = "";
    }
  }
  return out;
}

export function EntityFormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialData,
  onSubmit,
  submitLabel = "Save",
  size = "lg",
  footerExtra,
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<EntityFormData>(() => buildInitial(fields, initialData));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData(buildInitial(fields, initialData));
      setErrors({});
    }
  }, [open, fields, initialData]);

  const setValue = useCallback((name: string, value: EntityFormValue) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      if (!f.required) continue;
      const v = formData[f.name];
      if (v === undefined || v === null) {
        nextErrors[f.name] = `${f.label} is required`;
      } else if (typeof v === "string" && !v.trim()) {
        nextErrors[f.name] = `${f.label} is required`;
      } else if (Array.isArray(v) && v.length === 0) {
        nextErrors[f.name] = `${f.label} is required`;
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onSubmit(formData);
    onOpenChange(false);
  };

  const sizeClass = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  function renderField(f: EntityField) {
    const raw = formData[f.name];
    const hasError = !!errors[f.name];
    const className = hasError ? "border-destructive" : undefined;

    if (f.type === "select") {
      return (
        <Select
          value={(raw as string) ?? ""}
          onValueChange={(v) => setValue(f.name, v)}
          disabled={f.disabled}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder={f.placeholder ?? `Select ${f.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (f.type === "multiselect") {
      const selected = (raw as string[]) ?? [];
      return (
        <div className={`rounded-md border ${hasError ? "border-destructive" : "border-input"} p-2 max-h-44 overflow-y-auto bg-white`}>
          {f.options && f.options.length > 0 ? (
            f.options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 py-1 px-1 hover:bg-slate-50 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next = v
                        ? [...selected, opt.value]
                        : selected.filter((x) => x !== opt.value);
                      setValue(f.name, next);
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 py-1 px-1">No options available</p>
          )}
        </div>
      );
    }

    if (f.type === "textarea") {
      return (
        <Textarea
          value={(raw as string) ?? ""}
          onChange={(e) => setValue(f.name, e.target.value)}
          placeholder={f.placeholder}
          className={className}
          rows={3}
          disabled={f.disabled}
        />
      );
    }

    if (f.type === "checkbox") {
      return (
        <div className="flex items-center gap-2 h-10">
          <Checkbox
            checked={!!raw}
            onCheckedChange={(v) => setValue(f.name, !!v)}
            disabled={f.disabled}
          />
          {f.placeholder && <span className="text-sm text-slate-600">{f.placeholder}</span>}
        </div>
      );
    }

    if (f.type === "number") {
      return (
        <Input
          type="number"
          value={raw === undefined || raw === null || raw === "" ? "" : String(raw)}
          onChange={(e) => setValue(f.name, e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={f.placeholder}
          className={className}
          min={f.min}
          max={f.max}
          step={f.step}
          disabled={f.disabled}
        />
      );
    }

    if (f.type === "datetime") {
      return (
        <Input
          type="datetime-local"
          value={(raw as string) ?? ""}
          onChange={(e) => setValue(f.name, e.target.value)}
          className={className}
          disabled={f.disabled}
        />
      );
    }

    return (
      <Input
        type={f.type}
        value={(raw as string) ?? ""}
        onChange={(e) => setValue(f.name, e.target.value)}
        placeholder={f.placeholder}
        className={className}
        disabled={f.disabled}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClass} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            {fields.map((f) => {
              const isFullWidth = f.fullWidth || f.type === "textarea" || f.type === "multiselect";
              return (
                <div
                  key={f.name}
                  className={isFullWidth ? "sm:col-span-2" : undefined}
                >
                  <Label htmlFor={f.name} className="mb-1.5 block text-sm">
                    {f.label}
                    {f.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>
                  {renderField(f)}
                  {f.helperText && !errors[f.name] && (
                    <p className="mt-1 text-xs text-slate-500">{f.helperText}</p>
                  )}
                  {errors[f.name] && (
                    <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 pt-2">
            {footerExtra}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
