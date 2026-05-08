"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { X, Plus, Calendar } from "lucide-react";
import type {
  Deviation,
  DeviationInvestigation,
  DeviationTimelineEvent,
  RootCauseCategory,
  ImpactOnProduct,
  DispositionDecision,
} from "@/lib/quality/deviation-types";

interface DeviationInvestigationFormProps {
  deviation: Deviation;
  onSave: (investigation: DeviationInvestigation) => void;
  readOnly?: boolean;
}

const ROOT_CAUSE_CATEGORIES: { value: RootCauseCategory; label: string }[] = [
  { value: "human-error", label: "Human Error" },
  { value: "equipment-failure", label: "Equipment Failure" },
  { value: "material-defect", label: "Material Defect" },
  { value: "process-gap", label: "Process Gap" },
  { value: "environmental", label: "Environmental" },
  { value: "design-flaw", label: "Design Flaw" },
  { value: "training-gap", label: "Training Gap" },
  { value: "documentation-gap", label: "Documentation Gap" },
];

const IMPACT_OPTIONS: { value: ImpactOnProduct; label: string }[] = [
  { value: "none", label: "No Impact" },
  { value: "potential", label: "Potential Impact" },
  { value: "confirmed", label: "Confirmed Impact" },
];

const DISPOSITION_OPTIONS: { value: DispositionDecision; label: string }[] = [
  { value: "release", label: "Release" },
  { value: "reject", label: "Reject" },
  { value: "rework", label: "Rework" },
  { value: "return-to-supplier", label: "Return to Supplier" },
];

export default function DeviationInvestigationForm({
  deviation,
  onSave,
  readOnly = false,
}: DeviationInvestigationFormProps) {
  const existing = deviation.investigation;

  const [investigator, setInvestigator] = useState(
    existing?.investigator ?? ""
  );
  const [startedAt, setStartedAt] = useState(
    existing?.startedAt ?? new Date().toISOString().slice(0, 10)
  );
  const [findings, setFindings] = useState(existing?.findings ?? "");
  const [timeline, setTimeline] = useState<DeviationTimelineEvent[]>(
    existing?.timeline ?? []
  );
  const [contributingFactors, setContributingFactors] = useState<string[]>(
    existing?.contributingFactors ?? []
  );
  const [rootCauseCategory, setRootCauseCategory] = useState<RootCauseCategory>(
    existing?.rootCauseCategory ?? "process-gap"
  );
  const [rootCauseDetails, setRootCauseDetails] = useState(
    existing?.rootCauseDetails ?? ""
  );
  const [impactOnProduct, setImpactOnProduct] = useState<ImpactOnProduct>(
    deviation.impactOnProduct
  );
  const [dispositionDecision, setDispositionDecision] = useState<
    DispositionDecision | ""
  >(deviation.dispositionDecision ?? "");

  // Timeline add
  const [newEventDate, setNewEventDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newEventName, setNewEventName] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");

  // Contributing factor add
  const [newFactor, setNewFactor] = useState("");

  function addTimelineEvent() {
    if (!newEventName.trim()) return;
    setTimeline((prev) => [
      ...prev,
      {
        date: newEventDate,
        event: newEventName.trim(),
        description: newEventDesc.trim(),
      },
    ]);
    setNewEventName("");
    setNewEventDesc("");
  }

  function removeTimelineEvent(idx: number) {
    setTimeline((prev) => prev.filter((_, i) => i !== idx));
  }

  function addFactor() {
    if (!newFactor.trim()) return;
    setContributingFactors((prev) => [...prev, newFactor.trim()]);
    setNewFactor("");
  }

  function removeFactor(idx: number) {
    setContributingFactors((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleFactorKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFactor();
    }
  }

  function handleSave() {
    const inv: DeviationInvestigation = {
      investigator,
      startedAt,
      findings,
      timeline,
      contributingFactors,
      rootCauseCategory,
      rootCauseDetails,
    };
    onSave(inv);
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Investigation Details */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">
          Investigation Details
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inv-investigator">Investigator</Label>
            <Input
              id="inv-investigator"
              value={investigator}
              onChange={(e) => setInvestigator(e.target.value)}
              placeholder="Investigator name"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-started">Start Date</Label>
            <Input
              id="inv-started"
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-findings">Findings</Label>
          <Textarea
            id="inv-findings"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Describe investigation findings..."
            rows={4}
            disabled={readOnly}
          />
        </div>
      </div>

      <Separator />

      {/* Section 2: Timeline */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Timeline</h4>

        {/* Existing events */}
        {timeline.length > 0 && (
          <div className="relative pl-6 space-y-3">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
            {timeline.map((evt, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[18px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {evt.date}
                      </span>
                      <span className="text-sm font-medium">{evt.event}</span>
                    </div>
                    {evt.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {evt.description}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => removeTimelineEvent(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add event */}
        {!readOnly && (
          <div className="flex flex-col gap-2 p-3 rounded-md border border-dashed">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Event name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Description"
                value={newEventDesc}
                onChange={(e) => setNewEventDesc(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addTimelineEvent}
              className="self-end"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Event
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Section 3: Contributing Factors */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">
          Contributing Factors
        </h4>
        <div className="flex flex-wrap gap-2">
          {contributingFactors.map((factor, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="flex items-center gap-1"
            >
              {factor}
              {!readOnly && (
                <button
                  onClick={() => removeFactor(idx)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
          {contributingFactors.length === 0 && (
            <span className="text-sm text-muted-foreground">
              No contributing factors added
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Input
              placeholder="Add contributing factor..."
              value={newFactor}
              onChange={(e) => setNewFactor(e.target.value)}
              onKeyDown={handleFactorKeyDown}
              className="text-sm"
            />
            <Button variant="outline" size="sm" onClick={addFactor}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Section 4: Root Cause */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">Root Cause</h4>
        <div className="space-y-2">
          <Label>Root Cause Category</Label>
          <Select
            value={rootCauseCategory}
            onValueChange={(v) => setRootCauseCategory(v as RootCauseCategory)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {ROOT_CAUSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inv-root-details">Root Cause Details</Label>
          <Textarea
            id="inv-root-details"
            value={rootCauseDetails}
            onChange={(e) => setRootCauseDetails(e.target.value)}
            placeholder="Describe the root cause in detail..."
            rows={3}
            disabled={readOnly}
          />
        </div>
      </div>

      <Separator />

      {/* Section 5: Impact Assessment */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">
          Impact Assessment
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Impact on Product</Label>
            <Select
              value={impactOnProduct}
              onValueChange={(v) => setImpactOnProduct(v as ImpactOnProduct)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Disposition Decision</Label>
            <Select
              value={dispositionDecision || "none-selected"}
              onValueChange={(v) =>
                setDispositionDecision(
                  v === "none-selected" ? "" : (v as DispositionDecision)
                )
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select disposition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none-selected">Not determined</SelectItem>
                {DISPOSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {!readOnly && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Investigation</Button>
          </div>
        </>
      )}
    </div>
  );
}
