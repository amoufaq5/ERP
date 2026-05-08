"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImpactAssessment, ImpactLevel, RiskLevel } from "@/lib/quality/change-control-types";

interface ImpactAssessmentFormProps {
  assessment?: ImpactAssessment;
  onSave: (assessment: ImpactAssessment) => void;
  readOnly?: boolean;
}

const IMPACT_AREAS = [
  { key: "qualityImpact" as const, label: "Quality", description: "Impact on product quality and specifications" },
  { key: "regulatoryImpact" as const, label: "Regulatory", description: "Impact on regulatory filings and compliance" },
  { key: "safetyImpact" as const, label: "Safety", description: "Impact on patient/operator safety" },
  { key: "productionImpact" as const, label: "Production", description: "Impact on manufacturing operations" },
  { key: "financialImpact" as const, label: "Financial", description: "Cost and revenue impact" },
] as const;

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  none: "bg-gray-100 text-gray-700 border-gray-300",
  low: "bg-green-100 text-green-800 border-green-400",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-400",
  high: "bg-red-100 text-red-800 border-red-400",
};

const IMPACT_DOT_COLORS: Record<ImpactLevel, string> = {
  none: "bg-gray-400",
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 border-green-400",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-400",
  high: "bg-red-100 text-red-800 border-red-400",
};

type ImpactFieldKey = (typeof IMPACT_AREAS)[number]["key"];

function calculateOverallRisk(values: Record<ImpactFieldKey, ImpactLevel>): RiskLevel {
  const weights: Record<ImpactLevel, number> = { none: 0, low: 1, medium: 2, high: 3 };
  const scores = Object.values(values).map((v) => weights[v]);
  const maxScore = Math.max(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (maxScore >= 3 || avgScore >= 2) return "high";
  if (maxScore >= 2 || avgScore >= 1) return "medium";
  return "low";
}

export default function ImpactAssessmentForm({
  assessment,
  onSave,
  readOnly = false,
}: ImpactAssessmentFormProps) {
  const [impacts, setImpacts] = useState<Record<ImpactFieldKey, ImpactLevel>>({
    qualityImpact: assessment?.qualityImpact ?? "none",
    regulatoryImpact: assessment?.regulatoryImpact ?? "none",
    safetyImpact: assessment?.safetyImpact ?? "none",
    productionImpact: assessment?.productionImpact ?? "none",
    financialImpact: assessment?.financialImpact ?? "none",
  });

  const [validationRequired, setValidationRequired] = useState(
    assessment?.validationRequired ?? false
  );
  const [regulatoryFilingRequired, setRegulatoryFilingRequired] = useState(
    assessment?.regulatoryFilingRequired ?? false
  );
  const [customerNotificationRequired, setCustomerNotificationRequired] = useState(
    assessment?.customerNotificationRequired ?? false
  );
  const [assessedBy, setAssessedBy] = useState(assessment?.assessedBy ?? "");
  const [notes, setNotes] = useState(assessment?.notes ?? "");

  const overallRisk = calculateOverallRisk(impacts);

  const setImpact = useCallback((key: ImpactFieldKey, value: ImpactLevel) => {
    setImpacts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    onSave({
      ...impacts,
      validationRequired,
      regulatoryFilingRequired,
      customerNotificationRequired,
      assessedBy,
      assessedAt: assessment?.assessedAt ?? new Date().toISOString(),
      notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Impact Areas Grid */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Impact Areas
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IMPACT_AREAS.map((area) => (
            <div
              key={area.key}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                IMPACT_COLORS[impacts[area.key]]
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    IMPACT_DOT_COLORS[impacts[area.key]]
                  )}
                />
                <Label className="text-sm font-semibold">{area.label}</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {area.description}
              </p>
              {readOnly ? (
                <Badge variant="outline" className="capitalize">
                  {impacts[area.key]}
                </Badge>
              ) : (
                <Select
                  value={impacts[area.key]}
                  onValueChange={(v) => setImpact(area.key, v as ImpactLevel)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}

          {/* Overall Risk Summary */}
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-4 flex flex-col items-center justify-center",
              RISK_COLORS[overallRisk]
            )}
          >
            {overallRisk === "high" ? (
              <AlertTriangle className="h-8 w-8 mb-1" />
            ) : overallRisk === "medium" ? (
              <Shield className="h-8 w-8 mb-1" />
            ) : (
              <CheckCircle className="h-8 w-8 mb-1" />
            )}
            <span className="text-xs font-medium">Overall Risk</span>
            <span className="text-lg font-bold uppercase">{overallRisk}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Risk Matrix Summary */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Risk Matrix Summary
        </h4>
        <div className="grid grid-cols-5 gap-1 max-w-md">
          {IMPACT_AREAS.map((area) => {
            const level = impacts[area.key];
            const widthPct =
              level === "none" ? 0 : level === "low" ? 33 : level === "medium" ? 66 : 100;
            return (
              <div key={area.key} className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground truncate block">
                  {area.label}
                </span>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      level === "none"
                        ? "bg-gray-300"
                        : level === "low"
                        ? "bg-green-500"
                        : level === "medium"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Toggle Switches */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Requirements
        </h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Validation Required</Label>
              <p className="text-xs text-muted-foreground">
                Does this change require process/method validation?
              </p>
            </div>
            <Switch
              checked={validationRequired}
              onCheckedChange={setValidationRequired}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Regulatory Filing Required</Label>
              <p className="text-xs text-muted-foreground">
                Does this require a regulatory submission or variation?
              </p>
            </div>
            <Switch
              checked={regulatoryFilingRequired}
              onCheckedChange={setRegulatoryFilingRequired}
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Customer Notification Required</Label>
              <p className="text-xs text-muted-foreground">
                Must customers/distributors be notified of this change?
              </p>
            </div>
            <Switch
              checked={customerNotificationRequired}
              onCheckedChange={setCustomerNotificationRequired}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Assessor and Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Assessed By</Label>
          <Input
            value={assessedBy}
            onChange={(e) => setAssessedBy(e.target.value)}
            placeholder="Enter assessor name"
            disabled={readOnly}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm">Assessment Date</Label>
          <Input
            value={
              assessment?.assessedAt
                ? new Date(assessment.assessedAt).toLocaleDateString()
                : new Date().toLocaleDateString()
            }
            disabled
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label className="text-sm">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional assessment notes..."
          rows={3}
          disabled={readOnly}
          className="mt-1"
        />
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!assessedBy.trim()}>
            Save Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
