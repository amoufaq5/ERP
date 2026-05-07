"use client";

import React, { useState, useCallback, useRef, useMemo, type DragEvent, type ChangeEvent } from "react";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  parseFile,
  validateImport,
  autoMatchColumns,
  type ParsedData,
  type ImportSchema,
  type ValidationResult,
} from "@/lib/import/import-service";
import { downloadTemplate } from "@/lib/import/import-templates";
import ColumnMapper from "./column-mapper";
import ImportPreview from "./import-preview";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ImportWizardProps {
  entityType: string;
  schema: ImportSchema;
  onImport: (rows: Record<string, unknown>[]) => void;
  onClose?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WizardStep, string> = {
  1: "Upload File",
  2: "Map Columns",
  3: "Preview & Validate",
  4: "Complete",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImportWizard({
  entityType,
  schema,
  onImport,
  onClose,
}: ImportWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: File Upload ─────────────────────────────────────────────────

  const handleFile = useCallback(
    async (f: File) => {
      const name = f.name.toLowerCase();
      if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        setParseError("Please upload a CSV or Excel (.xlsx) file");
        return;
      }

      setFile(f);
      setParseError(null);
      setParsing(true);

      try {
        const data = await parseFile(f);
        if (data.errors.length > 0) {
          setParseError(data.errors.join(". "));
          setParsing(false);
          return;
        }
        if (data.rowCount === 0) {
          setParseError("The file contains no data rows");
          setParsing(false);
          return;
        }

        setParsedData(data);

        // Auto-match columns
        const autoMapping = autoMatchColumns(data.headers, schema);
        setMapping(autoMapping);

        setParsing(false);
        setStep(2);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file";
        setParseError(message);
        setParsing(false);
      }
    },
    [schema],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
      e.target.value = "";
    },
    [handleFile],
  );

  // ── Step 2 -> 3: Validate ──────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    if (!parsedData) return;
    const result = validateImport(parsedData, schema, mapping);
    setValidation(result);
    setStep(3);
  }, [parsedData, schema, mapping]);

  // Check if all required fields are mapped
  const canProceedToValidate = useMemo(() => {
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    return schema.fields.filter((f) => f.required).every((f) => mapped.has(f.field));
  }, [mapping, schema.fields]);

  // ── Step 3 -> 4: Import ───────────────────────────────────────────────

  const handleImport = useCallback(
    (rows: Record<string, unknown>[]) => {
      setImporting(true);
      // Simulate a small delay for UX
      setTimeout(() => {
        onImport(rows);
        setImportedCount(rows.length);
        setImporting(false);
        setStep(4);
      }, 500);
    },
    [onImport],
  );

  // ── Reset ─────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setStep(1);
    setFile(null);
    setParsedData(null);
    setMapping({});
    setValidation(null);
    setImportedCount(0);
    setParseError(null);
  }, []);

  // ── Template download ─────────────────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    downloadTemplate(entityType);
  }, [entityType]);

  // ── Navigation ────────────────────────────────────────────────────────

  const goBack = useCallback(() => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }, [step]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Import {schema.entityLabel}s
            </CardTitle>
            <CardDescription>
              Bulk import {schema.entityLabel.toLowerCase()}s from CSV or Excel files
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-2">
          {([1, 2, 3, 4] as WizardStep[]).map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    s < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : s === step
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:inline",
                    s === step ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {s < 4 && (
                <div
                  className={cn(
                    "h-0.5 w-8 transition-colors",
                    s < step ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* ─── Step 1: Upload ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                parsing && "pointer-events-none opacity-60",
              )}
            >
              {parsing ? (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {parsing
                    ? "Parsing file..."
                    : "Drag & drop your file here, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supported formats: CSV, Excel (.xlsx)
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onInputChange}
                className="hidden"
              />
            </div>

            {/* File info */}
            {file && !parsing && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setParsedData(null);
                    setParseError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {parseError}
              </div>
            )}

            {/* Template download */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Map Columns ─────────────────────────────────────── */}
        {step === 2 && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {parsedData.rowCount} rows detected with {parsedData.headers.length} columns.
                Map each column to the corresponding {schema.entityLabel.toLowerCase()} field.
              </p>
              <Badge variant="outline">
                {parsedData.rowCount} rows
              </Badge>
            </div>

            <ColumnMapper
              data={parsedData}
              schema={schema}
              mapping={mapping}
              onMappingChange={setMapping}
            />

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleValidate} disabled={!canProceedToValidate}>
                Validate & Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Preview & Validate ──────────────────────────────── */}
        {step === 3 && parsedData && validation && (
          <div className="space-y-4">
            <ImportPreview
              data={parsedData}
              schema={schema}
              validation={validation}
              mapping={mapping}
              onImport={handleImport}
              importing={importing}
            />

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mapping
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Complete ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Import Complete</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Successfully imported {importedCount} {schema.entityLabel.toLowerCase()}
                {importedCount !== 1 ? "s" : ""}.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
              {onClose && (
                <Button onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
