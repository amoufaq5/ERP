"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plus, Save, X, ArrowDown } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WhyEntry {
  question: string;
  answer: string;
}

interface FiveWhyData {
  whys: WhyEntry[];
  rootCause: string;
}

interface FishboneData {
  problem: string;
  categories: Record<string, string[]>;
}

interface RootCauseToolsProps {
  onSave: (tool: string, data: string) => void;
  initialData?: { tool: string; data: string }[];
}

const FISHBONE_CATEGORIES = [
  { key: "Man", label: "Man (Personnel)", color: "bg-blue-100 border-blue-300 text-blue-800" },
  { key: "Machine", label: "Machine (Equipment)", color: "bg-green-100 border-green-300 text-green-800" },
  { key: "Material", label: "Material", color: "bg-amber-100 border-amber-300 text-amber-800" },
  { key: "Method", label: "Method", color: "bg-purple-100 border-purple-300 text-purple-800" },
  { key: "Measurement", label: "Measurement", color: "bg-pink-100 border-pink-300 text-pink-800" },
  { key: "Environment", label: "Environment", color: "bg-teal-100 border-teal-300 text-teal-800" },
];

const DEFAULT_WHYS: WhyEntry[] = [
  { question: "Why did the problem occur?", answer: "" },
  { question: "Why? (Level 2)", answer: "" },
  { question: "Why? (Level 3)", answer: "" },
  { question: "Why? (Level 4)", answer: "" },
  { question: "Why? (Level 5 - Root Cause)", answer: "" },
];

// ─── 5-Why Tab ──────────────────────────────────────────────────────────────

function FiveWhyTab({
  initialData,
  onSave,
}: {
  initialData?: FiveWhyData;
  onSave: (data: string) => void;
}) {
  const [whys, setWhys] = useState<WhyEntry[]>(
    initialData?.whys ?? DEFAULT_WHYS.map((w) => ({ ...w }))
  );
  const [rootCause, setRootCause] = useState(initialData?.rootCause ?? "");

  const updateWhy = useCallback(
    (idx: number, field: "question" | "answer", value: string) => {
      setWhys((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      });
    },
    []
  );

  const handleSave = () => {
    const data: FiveWhyData = { whys, rootCause };
    onSave(JSON.stringify(data));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ask &quot;Why?&quot; five times to drill down to the root cause of the problem.
      </p>

      <div className="space-y-3">
        {whys.map((entry, idx) => (
          <div key={idx} className="relative">
            {/* Connector line */}
            {idx > 0 && (
              <div className="absolute -top-3 left-6 flex flex-col items-center">
                <ArrowDown className="h-4 w-4 text-blue-400" />
              </div>
            )}

            <div
              className={cn(
                "rounded-lg border p-3",
                idx === 4
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
                    idx === 4 ? "bg-red-500" : "bg-blue-500"
                  )}
                >
                  {idx + 1}
                </span>
                <Label className="text-sm font-semibold">
                  {idx === 4 ? "Why? (Root Cause Level)" : `Why? (Level ${idx + 1})`}
                </Label>
              </div>

              <Input
                value={entry.question}
                onChange={(e) => updateWhy(idx, "question", e.target.value)}
                placeholder={`Question ${idx + 1}...`}
                className="mb-2 text-sm"
              />

              <Textarea
                value={entry.answer}
                onChange={(e) => updateWhy(idx, "answer", e.target.value)}
                placeholder={`Answer to why #${idx + 1}...`}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Root Cause Summary */}
      <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
        <Label className="text-sm font-bold text-red-700">Root Cause Summary</Label>
        <Textarea
          value={rootCause}
          onChange={(e) => setRootCause(e.target.value)}
          placeholder="Summarize the identified root cause..."
          rows={3}
          className="mt-2 text-sm"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm">
          <Save className="mr-2 h-4 w-4" />
          Save 5-Why Analysis
        </Button>
      </div>
    </div>
  );
}

// ─── Fishbone (Ishikawa) Tab ────────────────────────────────────────────────

function FishboneTab({
  initialData,
  onSave,
}: {
  initialData?: FishboneData;
  onSave: (data: string) => void;
}) {
  const defaultCategories: Record<string, string[]> = {};
  FISHBONE_CATEGORIES.forEach((c) => {
    defaultCategories[c.key] = [];
  });

  const [problem, setProblem] = useState(initialData?.problem ?? "");
  const [categories, setCategories] = useState<Record<string, string[]>>(
    initialData?.categories ?? defaultCategories
  );
  const [newCauses, setNewCauses] = useState<Record<string, string>>({});

  const addCause = (catKey: string) => {
    const value = newCauses[catKey]?.trim();
    if (!value) return;
    setCategories((prev) => ({
      ...prev,
      [catKey]: [...(prev[catKey] ?? []), value],
    }));
    setNewCauses((prev) => ({ ...prev, [catKey]: "" }));
  };

  const removeCause = (catKey: string, idx: number) => {
    setCategories((prev) => ({
      ...prev,
      [catKey]: prev[catKey].filter((_, i) => i !== idx),
    }));
  };

  const handleSave = () => {
    const data: FishboneData = { problem, categories };
    onSave(JSON.stringify(data));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Organize potential causes into 6 categories (6M) to identify the root cause.
      </p>

      {/* Problem Statement (Center) */}
      <div className="rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
        <Label className="text-sm font-bold text-orange-700">Problem Statement (Effect)</Label>
        <Input
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Describe the OOS problem..."
          className="mt-2 text-sm"
        />
      </div>

      {/* Fishbone Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {FISHBONE_CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className={cn("rounded-lg border p-3", cat.color)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{cat.label}</span>
              <span className="text-xs opacity-70">
                {categories[cat.key]?.length ?? 0} causes
              </span>
            </div>

            {/* Causes list */}
            <div className="space-y-1 mb-2">
              {(categories[cat.key] ?? []).map((cause, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 rounded bg-white/60 px-2 py-1 text-xs"
                >
                  <span className="flex-1">{cause}</span>
                  <button
                    onClick={() => removeCause(cat.key, idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add cause input */}
            <div className="flex gap-1">
              <Input
                value={newCauses[cat.key] ?? ""}
                onChange={(e) =>
                  setNewCauses((prev) => ({
                    ...prev,
                    [cat.key]: e.target.value,
                  }))
                }
                placeholder="Add cause..."
                className="h-7 text-xs bg-white/80"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCause(cat.key);
                  }
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => addCause(cat.key)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Visual spine representation */}
      <div className="relative rounded-lg border bg-gray-50 p-4">
        <div className="text-center text-xs text-muted-foreground mb-2 font-medium">
          Fishbone Diagram Summary
        </div>

        {/* Spine */}
        <div className="relative mx-auto max-w-xl">
          {/* Main horizontal spine */}
          <div className="flex items-center">
            <div className="flex-1 h-0.5 bg-gray-400" />
            <div className="rounded bg-orange-200 border border-orange-400 px-3 py-1.5 text-xs font-bold text-orange-800 whitespace-nowrap">
              {problem || "Problem"}
            </div>
          </div>

          {/* Branches */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {FISHBONE_CATEGORIES.map((cat) => {
              const causes = categories[cat.key] ?? [];
              if (causes.length === 0) return (
                <div key={cat.key} className="text-center text-[10px] text-gray-400 italic">
                  {cat.key}: (none)
                </div>
              );
              return (
                <div key={cat.key} className="text-center">
                  <div className="text-[10px] font-bold text-gray-600 mb-0.5">{cat.key}</div>
                  {causes.map((c, i) => (
                    <div key={i} className="text-[10px] text-gray-500">{c}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm">
          <Save className="mr-2 h-4 w-4" />
          Save Fishbone Analysis
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RootCauseTools({ onSave, initialData }: RootCauseToolsProps) {
  // Parse initial data
  const fiveWhyInitial = initialData?.find((d) => d.tool === "5why");
  const fishboneInitial = initialData?.find((d) => d.tool === "fishbone");

  let parsedFiveWhy: FiveWhyData | undefined;
  if (fiveWhyInitial) {
    try {
      parsedFiveWhy = JSON.parse(fiveWhyInitial.data);
    } catch {
      // ignore parse error
    }
  }

  let parsedFishbone: FishboneData | undefined;
  if (fishboneInitial) {
    try {
      parsedFishbone = JSON.parse(fishboneInitial.data);
    } catch {
      // ignore parse error
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Root Cause Analysis Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="5why">
          <TabsList className="mb-4">
            <TabsTrigger value="5why">5-Why Analysis</TabsTrigger>
            <TabsTrigger value="fishbone">Fishbone Diagram</TabsTrigger>
          </TabsList>

          <TabsContent value="5why">
            <FiveWhyTab
              initialData={parsedFiveWhy}
              onSave={(data) => onSave("5why", data)}
            />
          </TabsContent>

          <TabsContent value="fishbone">
            <FishboneTab
              initialData={parsedFishbone}
              onSave={(data) => onSave("fishbone", data)}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
