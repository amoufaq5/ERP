"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ClipboardCheck,
  User,
} from "lucide-react";
import type {
  CertificateOfAnalysis,
  MaterialSpecification,
  CoATestResult,
  TestWithCriteria,
} from "@/lib/quality/supplier-quality-types";

/* ─── Props ─── */

export interface CoAReviewProps {
  coa: CertificateOfAnalysis;
  specification: MaterialSpecification | null;
  onApprove?: (reviewerName: string, notes: string) => void;
  onReject?: (reviewerName: string, notes: string) => void;
  readOnly?: boolean;
  className?: string;
}

/* ─── Status helpers ─── */

function statusBadge(pass: boolean) {
  return pass ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Pass
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 gap-1">
      <XCircle className="h-3 w-3" />
      Fail
    </Badge>
  );
}

/* ─── Component ─── */

export default function CoAReview({
  coa,
  specification,
  onApprove,
  onReject,
  readOnly = false,
  className,
}: CoAReviewProps) {
  const [reviewerName, setReviewerName] = useState("");
  const [notes, setNotes] = useState("");

  const hasDeviations = coa.testsPerformed.some((t) => !t.pass);
  const allPass = coa.testsPerformed.every((t) => t.pass);
  const isPending = coa.complianceStatus === "pending-review";

  /* Build a map from spec tests for lookup */
  const specTestMap = new Map<string, TestWithCriteria>();
  if (specification) {
    specification.tests.forEach((t) => specTestMap.set(t.testName, t));
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CoA Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-600" />
              Certificate of Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">CoA Number</span>
              <span className="font-medium">{coa.coaNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material</span>
              <span className="font-medium">{coa.materialName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batch Number</span>
              <span className="font-medium">{coa.batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier</span>
              <span className="font-medium">{coa.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier Batch</span>
              <span className="font-medium">{coa.supplierBatchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received Date</span>
              <span className="font-medium">
                {new Date(coa.receivedDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date</span>
              <span className="font-medium">
                {new Date(coa.expiryDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Specification Reference */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              Specification Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {specification ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material Code</span>
                  <span className="font-medium">{specification.materialCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pharmacopoeia</span>
                  <Badge variant="outline">{specification.pharmacopoeiaRef}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">v{specification.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective Date</span>
                  <span className="font-medium">
                    {new Date(specification.effectiveDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tests Defined</span>
                  <span className="font-medium">{specification.tests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By</span>
                  <span className="font-medium">{specification.approvedBy}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic">
                No specification linked. Tests will be evaluated against CoA acceptance criteria.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deviation Warning */}
      {hasDeviations && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-300">
              Out-of-Specification Results Detected
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              {coa.testsPerformed.filter((t) => !t.pass).length} of{" "}
              {coa.testsPerformed.length} test(s) failed acceptance criteria. An OOS
              investigation may be required per SOP-QC-022.
            </p>
          </div>
        </div>
      )}

      {/* Overall Result Banner */}
      {!isPending && (
        <div
          className={cn(
            "rounded-lg border p-3 flex items-center gap-2 text-sm font-medium",
            coa.complianceStatus === "compliant"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
          )}
        >
          {coa.complianceStatus === "compliant" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {coa.complianceStatus === "compliant"
            ? "Batch APPROVED - All tests within specification"
            : "Batch REJECTED - Out-of-specification results"}
          {coa.reviewedBy && (
            <span className="ml-auto text-xs font-normal">
              Reviewed by {coa.reviewedBy} on{" "}
              {coa.reviewedAt
                ? new Date(coa.reviewedAt).toLocaleDateString()
                : "N/A"}
            </span>
          )}
        </div>
      )}

      {/* Side-by-Side Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Test Results vs Acceptance Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Test Parameter</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="bg-purple-50 dark:bg-purple-950/20">
                    Acceptance Criteria (Spec)
                  </TableHead>
                  <TableHead className="bg-blue-50 dark:bg-blue-950/20">
                    Result (CoA)
                  </TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coa.testsPerformed.map((test: CoATestResult, idx: number) => {
                  const specTest = specTestMap.get(test.testName);
                  return (
                    <TableRow
                      key={idx}
                      className={cn(
                        !test.pass &&
                          "bg-red-50/50 dark:bg-red-950/10 border-l-2 border-l-red-500"
                      )}
                    >
                      <TableCell className="font-medium text-sm">
                        {test.testName}
                        {!test.pass && (
                          <AlertTriangle className="inline h-3 w-3 text-red-500 ml-1" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {test.method}
                      </TableCell>
                      <TableCell className="text-sm bg-purple-50/50 dark:bg-purple-950/10">
                        {specTest?.acceptanceCriteria || test.acceptanceCriteria}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-sm font-medium bg-blue-50/50 dark:bg-blue-950/10",
                          !test.pass && "text-red-700 dark:text-red-400"
                        )}
                      >
                        {test.result}
                        {test.unit ? ` ${test.unit}` : ""}
                      </TableCell>
                      <TableCell className="text-center">
                        {statusBadge(test.pass)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-purple-100 dark:bg-purple-900/30" />
              Specification Criteria
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-100 dark:bg-blue-900/30" />
              CoA Results
            </span>
            <span className="ml-auto">
              {coa.testsPerformed.filter((t) => t.pass).length}/
              {coa.testsPerformed.length} tests passed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Review Notes (if already reviewed) */}
      {coa.reviewNotes && !isPending && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Review Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{coa.reviewNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Approve / Reject section (only if pending and not read-only) */}
      {isPending && !readOnly && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Reviewer Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reviewer Name
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Enter reviewer name (e.g. Dr. Rania Abdel-Aziz)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Review Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter review comments..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!reviewerName.trim()}
                  onClick={() => onApprove?.(reviewerName.trim(), notes.trim())}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve - Batch Compliant
                </Button>
                <Button
                  variant="destructive"
                  disabled={!reviewerName.trim()}
                  onClick={() => onReject?.(reviewerName.trim(), notes.trim())}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject - Non-Compliant
                </Button>
              </div>
              {hasDeviations && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Note: This CoA contains {coa.testsPerformed.filter((t) => !t.pass).length}{" "}
                  out-of-spec result(s). Approval will require documented justification. Rejection
                  is recommended unless a deviation report supports acceptance.
                </p>
              )}
              {allPass && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  All test results are within specification. Batch is eligible for
                  approval.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
