"use client";

import React, { useMemo } from "react";
import { AlertCircle, Check, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ImportSchema, ParsedData } from "@/lib/import/import-service";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ColumnMapperProps {
  data: ParsedData;
  schema: ImportSchema;
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ColumnMapper({
  data,
  schema,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  // Determine which required fields are still unmapped
  const missingRequired = useMemo(() => {
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    return schema.fields.filter((f) => f.required && !mapped.has(f.field));
  }, [mapping, schema.fields]);

  // Fields already used in mapping (to prevent duplicates)
  const usedFields = useMemo(() => {
    return new Set(Object.values(mapping).filter(Boolean));
  }, [mapping]);

  const previewRows = data.rows.slice(0, 5);

  const handleFieldChange = (header: string, fieldValue: string) => {
    const newMapping = { ...mapping };
    // Clear the SKIP sentinel
    if (fieldValue === "__skip__") {
      newMapping[header] = "";
    } else {
      // Remove any previous mapping that used this field
      for (const [key, val] of Object.entries(newMapping)) {
        if (val === fieldValue && key !== header) {
          newMapping[key] = "";
        }
      }
      newMapping[header] = fieldValue;
    }
    onMappingChange(newMapping);
  };

  return (
    <div className="space-y-6">
      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Missing required fields:</p>
            <p className="mt-1">
              {missingRequired.map((f) => f.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Column mapping table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">File Column</TableHead>
              <TableHead className="w-[20px]" />
              <TableHead className="w-[40%]">Maps To</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.headers.map((header) => {
              const mappedField = mapping[header] || "";
              const fieldDef = schema.fields.find((f) => f.field === mappedField);
              const isRequired = fieldDef?.required ?? false;
              const isMapped = !!mappedField;

              return (
                <TableRow key={header}>
                  <TableCell className="font-medium">{header}</TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mappedField || "__skip__"}
                      onValueChange={(val) => handleFieldChange(header, val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">
                          <span className="text-muted-foreground">-- Skip this column --</span>
                        </SelectItem>
                        {schema.fields.map((field) => {
                          const isUsed = usedFields.has(field.field) && mapping[header] !== field.field;
                          return (
                            <SelectItem
                              key={field.field}
                              value={field.field}
                              disabled={isUsed}
                            >
                              {field.label}
                              {field.required ? " *" : ""}
                              {isUsed ? " (already mapped)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isMapped ? (
                      <Badge variant={isRequired ? "default" : "secondary"} className="gap-1">
                        <Check className="h-3 w-3" />
                        {isRequired ? "Required" : "Optional"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Skipped
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Preview of first 5 rows */}
      {previewRows.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Preview (first {previewRows.length} rows with applied mapping)
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {schema.fields
                    .filter((f) => Object.values(mapping).includes(f.field))
                    .map((field) => (
                      <TableHead key={field.field}>
                        <span className={cn(field.required && "font-semibold")}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </span>
                      </TableHead>
                    ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => {
                  // Find source column for each mapped field
                  const reverseMap: Record<string, string> = {};
                  for (const [src, tgt] of Object.entries(mapping)) {
                    if (tgt) reverseMap[tgt] = src;
                  }

                  return (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      {schema.fields
                        .filter((f) => Object.values(mapping).includes(f.field))
                        .map((field) => {
                          const sourceCol = reverseMap[field.field];
                          const value = sourceCol ? (row[sourceCol] ?? "") : "";
                          return (
                            <TableCell key={field.field}>
                              {value || (
                                <span className="text-muted-foreground italic">empty</span>
                              )}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
