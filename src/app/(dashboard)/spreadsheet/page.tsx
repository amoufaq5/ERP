"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Download, Upload, Undo2, Redo2, Plus, Trash2, Table2, Printer,
  DollarSign, Percent, Hash, FunctionSquare,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CellData {
  value: string;
  formula?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  bgColor?: string;
  format?: "text" | "currency" | "percent" | "number";
}

interface SheetData { [key: string]: CellData }

const COLS = 26;
const ROWS = 100;
const COL_LETTERS = Array.from({ length: COLS }, (_, i) => String.fromCharCode(65 + i));
const DEFAULT_COL_WIDTH = 100;

// ─── Safe Arithmetic Parser (no Function()/eval) ──────────────────────────

function safeEvalArithmetic(expr: string): number {
  const tokens: string[] = [];
  let i = 0;
  const s = expr.replace(/\s/g, "");
  while (i < s.length) {
    if ("+-*/()".includes(s[i])) {
      tokens.push(s[i]);
      i++;
    } else if (/[\d.eE]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[\d.eE+\-]/.test(s[i]) && (num === "" || s[i] !== "+" && s[i] !== "-" || /[eE]/.test(s[i - 1]))) {
        num += s[i]; i++;
      }
      tokens.push(num);
    } else { i++; }
  }
  let pos = 0;
  function parseExpr(): number {
    let result = parseTerm();
    while (pos < tokens.length && (tokens[pos] === "+" || tokens[pos] === "-")) {
      const op = tokens[pos++];
      const right = parseTerm();
      result = op === "+" ? result + right : result - right;
    }
    return result;
  }
  function parseTerm(): number {
    let result = parseFactor();
    while (pos < tokens.length && (tokens[pos] === "*" || tokens[pos] === "/")) {
      const op = tokens[pos++];
      const right = parseFactor();
      result = op === "*" ? result * right : result / right;
    }
    return result;
  }
  function parseFactor(): number {
    if (tokens[pos] === "(") { pos++; const r = parseExpr(); pos++; return r; }
    if (tokens[pos] === "-") { pos++; return -parseFactor(); }
    if (tokens[pos] === "+") { pos++; return parseFactor(); }
    return parseFloat(tokens[pos++]);
  }
  return parseExpr();
}

// ─── Formula Engine ────────────────────────────────────────────────────────

function colToIndex(col: string): number { return col.charCodeAt(0) - 65; }
function cellRef(col: number, row: number): string { return `${String.fromCharCode(65 + col)}${row + 1}`; }

function expandRange(range: string): string[] {
  const match = range.match(/^([A-Z])(\d+):([A-Z])(\d+)$/);
  if (!match) return [range];
  const [, sc, sr, ec, er] = match;
  const cells: string[] = [];
  for (let c = sc.charCodeAt(0); c <= ec.charCodeAt(0); c++) {
    for (let r = parseInt(sr); r <= parseInt(er); r++) {
      cells.push(`${String.fromCharCode(c)}${r}`);
    }
  }
  return cells;
}

function getCellNumericValue(ref: string, data: SheetData, visited: Set<string>): number {
  if (visited.has(ref)) return NaN; // circular
  visited.add(ref);
  const cell = data[ref];
  if (!cell) return 0;
  if (cell.formula) {
    const result = evaluateFormula(cell.formula, data, visited);
    return typeof result === "number" ? result : parseFloat(result) || 0;
  }
  return parseFloat(cell.value) || 0;
}

function getRangeValues(rangeStr: string, data: SheetData, visited: Set<string>): number[] {
  return expandRange(rangeStr).map(ref => getCellNumericValue(ref, data, new Set(visited)));
}

function evaluateFormula(formula: string, data: SheetData, visited: Set<string> = new Set()): string | number {
  try {
    let expr = formula.startsWith("=") ? formula.slice(1) : formula;

    // Handle functions
    const fnRegex = /([A-Z_]+)\(([^()]*)\)/g;
    let maxIterations = 20;
    while (fnRegex.test(expr) && maxIterations-- > 0) {
      expr = expr.replace(/([A-Z_]+)\(([^()]*)\)/g, (_, fn, args) => {
        const fnName = fn.toUpperCase();
        const argParts = args.split(",").map((s: string) => s.trim());

        switch (fnName) {
          case "SUM": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            return String(vals.reduce((s: number, v: number) => s + (isNaN(v) ? 0 : v), 0));
          }
          case "AVG": case "AVERAGE": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            const nums = vals.filter((v: number) => !isNaN(v));
            return nums.length ? String(nums.reduce((s: number, v: number) => s + v, 0) / nums.length) : "0";
          }
          case "MIN": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            return String(Math.min(...vals.filter((v: number) => !isNaN(v))));
          }
          case "MAX": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            return String(Math.max(...vals.filter((v: number) => !isNaN(v))));
          }
          case "COUNT": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            return String(vals.filter((v: number) => !isNaN(v) && v !== 0).length);
          }
          case "IF": {
            const condVal = evaluateFormula("=" + argParts[0], data, new Set(visited));
            return Number(condVal) ? String(evaluateFormula("=" + (argParts[1] || "0"), data, new Set(visited))) : String(evaluateFormula("=" + (argParts[2] || "0"), data, new Set(visited)));
          }
          case "ROUND": return String(Math.round(Number(evaluateFormula("=" + argParts[0], data, new Set(visited))) * Math.pow(10, Number(argParts[1] || 0))) / Math.pow(10, Number(argParts[1] || 0)));
          case "ABS": return String(Math.abs(Number(evaluateFormula("=" + argParts[0], data, new Set(visited)))));
          case "POWER": return String(Math.pow(Number(evaluateFormula("=" + argParts[0], data, new Set(visited))), Number(evaluateFormula("=" + argParts[1], data, new Set(visited)))));
          case "SQRT": return String(Math.sqrt(Number(evaluateFormula("=" + argParts[0], data, new Set(visited)))));
          case "LEN": { const v = String(evaluateFormula("=" + argParts[0], data, new Set(visited))); return String(v.length); }
          case "UPPER": return String(evaluateFormula("=" + argParts[0], data, new Set(visited))).toUpperCase();
          case "LOWER": return String(evaluateFormula("=" + argParts[0], data, new Set(visited))).toLowerCase();
          case "TRIM": return String(evaluateFormula("=" + argParts[0], data, new Set(visited))).trim();
          case "LEFT": { const v = String(evaluateFormula("=" + argParts[0], data, new Set(visited))); return v.slice(0, Number(argParts[1]) || 1); }
          case "RIGHT": { const v = String(evaluateFormula("=" + argParts[0], data, new Set(visited))); return v.slice(-(Number(argParts[1]) || 1)); }
          case "CONCAT": return argParts.map((a: string) => String(evaluateFormula("=" + a, data, new Set(visited)))).join("");
          case "NOW": return new Date().toLocaleString();
          case "TODAY": return new Date().toLocaleDateString();
          case "PMT": {
            const rate = Number(evaluateFormula("=" + argParts[0], data, new Set(visited)));
            const nper = Number(evaluateFormula("=" + argParts[1], data, new Set(visited)));
            const pv = Number(evaluateFormula("=" + argParts[2], data, new Set(visited)));
            if (rate === 0) return String(-pv / nper);
            return String(-pv * (rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1));
          }
          case "FV": {
            const rate = Number(evaluateFormula("=" + argParts[0], data, new Set(visited)));
            const nper = Number(evaluateFormula("=" + argParts[1], data, new Set(visited)));
            const pmt = Number(evaluateFormula("=" + argParts[2], data, new Set(visited)));
            const pv = Number(evaluateFormula("=" + (argParts[3] || "0"), data, new Set(visited)));
            return String(-(pv * Math.pow(1 + rate, nper) + pmt * ((Math.pow(1 + rate, nper) - 1) / rate)));
          }
          case "PV": {
            const rate = Number(evaluateFormula("=" + argParts[0], data, new Set(visited)));
            const nper = Number(evaluateFormula("=" + argParts[1], data, new Set(visited)));
            const pmt = Number(evaluateFormula("=" + argParts[2], data, new Set(visited)));
            if (rate === 0) return String(-pmt * nper);
            return String(-(pmt * (1 - Math.pow(1 + rate, -nper)) / rate));
          }
          case "NPV": {
            const rate = Number(evaluateFormula("=" + argParts[0], data, new Set(visited)));
            const vals = argParts.slice(1).flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            return String(vals.reduce((npv: number, cf: number, i: number) => npv + cf / Math.pow(1 + rate, i + 1), 0));
          }
          case "IRR": {
            const vals = argParts.flatMap((a: string) => a.includes(":") ? getRangeValues(a, data, visited) : [getCellNumericValue(a, data, new Set(visited))]);
            let guess = 0.1;
            for (let iter = 0; iter < 100; iter++) {
              let npv = 0, dnpv = 0;
              for (let i = 0; i < vals.length; i++) {
                npv += vals[i] / Math.pow(1 + guess, i);
                dnpv -= i * vals[i] / Math.pow(1 + guess, i + 1);
              }
              if (Math.abs(npv) < 1e-7) break;
              if (dnpv === 0) break;
              guess -= npv / dnpv;
            }
            return String(Math.round(guess * 10000) / 10000);
          }
          default: return "#NAME?";
        }
      });
      fnRegex.lastIndex = 0;
    }

    // Replace cell references with values
    expr = expr.replace(/\b([A-Z])(\d+)\b/g, (_, col, row) => {
      const ref = `${col}${row}`;
      return String(getCellNumericValue(ref, data, new Set(visited)));
    });

    // Evaluate arithmetic safely without Function() constructor
    if (/^[\d\s+\-*/().eE]+$/.test(expr)) {
      const result = safeEvalArithmetic(expr);
      if (typeof result === "number" && !isNaN(result)) {
        return Math.round(result * 1e10) / 1e10;
      }
      return result;
    }

    // Return as string if not purely numeric expression
    return expr;
  } catch {
    return "#ERROR!";
  }
}

function getDisplayValue(cell: CellData | undefined, data: SheetData): string {
  if (!cell) return "";
  if (cell.formula) {
    const result = evaluateFormula(cell.formula, data);
    const num = typeof result === "number" ? result : parseFloat(String(result));
    if (!isNaN(num)) {
      if (cell.format === "currency") return `EGP ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (cell.format === "percent") return `${(num * 100).toFixed(1)}%`;
      if (cell.format === "number") return num.toLocaleString();
      if (Number.isInteger(num)) return String(num);
      return String(Math.round(num * 100) / 100);
    }
    return String(result);
  }
  const num = parseFloat(cell.value);
  if (!isNaN(num) && cell.value.trim() !== "") {
    if (cell.format === "currency") return `EGP ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (cell.format === "percent") return `${(num * 100).toFixed(1)}%`;
    if (cell.format === "number") return num.toLocaleString();
  }
  return cell.value;
}

// ─── Initial Data ──────────────────────────────────────────────────────────

function createInitialData(): SheetData {
  const d: SheetData = {};
  // Financial report sample
  d["A1"] = { value: "Item" }; d["B1"] = { value: "Q1" }; d["C1"] = { value: "Q2" }; d["D1"] = { value: "Q3" }; d["E1"] = { value: "Q4" }; d["F1"] = { value: "Total" };
  // Revenue
  d["A2"] = { value: "Product Sales" }; d["B2"] = { value: "185000", format: "number" }; d["C2"] = { value: "210000", format: "number" }; d["D2"] = { value: "195000", format: "number" }; d["E2"] = { value: "240000", format: "number" }; d["F2"] = { value: "", formula: "=SUM(B2:E2)", format: "number" };
  d["A3"] = { value: "Service Revenue" }; d["B3"] = { value: "92000", format: "number" }; d["C3"] = { value: "98000", format: "number" }; d["D3"] = { value: "105000", format: "number" }; d["E3"] = { value: "112000", format: "number" }; d["F3"] = { value: "", formula: "=SUM(B3:E3)", format: "number" };
  d["A4"] = { value: "Licensing" }; d["B4"] = { value: "45000", format: "number" }; d["C4"] = { value: "48000", format: "number" }; d["D4"] = { value: "50000", format: "number" }; d["E4"] = { value: "55000", format: "number" }; d["F4"] = { value: "", formula: "=SUM(B4:E4)", format: "number" };
  d["A5"] = { value: "Consulting" }; d["B5"] = { value: "67000", format: "number" }; d["C5"] = { value: "72000", format: "number" }; d["D5"] = { value: "68000", format: "number" }; d["E5"] = { value: "78000", format: "number" }; d["F5"] = { value: "", formula: "=SUM(B5:E5)", format: "number" };
  d["A6"] = { value: "Total Revenue", bold: true }; d["B6"] = { value: "", formula: "=SUM(B2:B5)", bold: true, format: "number" }; d["C6"] = { value: "", formula: "=SUM(C2:C5)", bold: true, format: "number" }; d["D6"] = { value: "", formula: "=SUM(D2:D5)", bold: true, format: "number" }; d["E6"] = { value: "", formula: "=SUM(E2:E5)", bold: true, format: "number" }; d["F6"] = { value: "", formula: "=SUM(F2:F5)", bold: true, format: "number" };
  // Expenses
  d["A8"] = { value: "COGS" }; d["B8"] = { value: "120000", format: "number" }; d["C8"] = { value: "135000", format: "number" }; d["D8"] = { value: "125000", format: "number" }; d["E8"] = { value: "150000", format: "number" }; d["F8"] = { value: "", formula: "=SUM(B8:E8)", format: "number" };
  d["A9"] = { value: "Salaries" }; d["B9"] = { value: "95000", format: "number" }; d["C9"] = { value: "95000", format: "number" }; d["D9"] = { value: "98000", format: "number" }; d["E9"] = { value: "98000", format: "number" }; d["F9"] = { value: "", formula: "=SUM(B9:E9)", format: "number" };
  d["A10"] = { value: "Marketing" }; d["B10"] = { value: "35000", format: "number" }; d["C10"] = { value: "42000", format: "number" }; d["D10"] = { value: "38000", format: "number" }; d["E10"] = { value: "50000", format: "number" }; d["F10"] = { value: "", formula: "=SUM(B10:E10)", format: "number" };
  d["A11"] = { value: "Operations" }; d["B11"] = { value: "28000", format: "number" }; d["C11"] = { value: "30000", format: "number" }; d["D11"] = { value: "29000", format: "number" }; d["E11"] = { value: "32000", format: "number" }; d["F11"] = { value: "", formula: "=SUM(B11:E11)", format: "number" };
  d["A12"] = { value: "Total Expenses", bold: true }; d["B12"] = { value: "", formula: "=SUM(B8:B11)", bold: true, format: "number" }; d["C12"] = { value: "", formula: "=SUM(C8:C11)", bold: true, format: "number" }; d["D12"] = { value: "", formula: "=SUM(D8:D11)", bold: true, format: "number" }; d["E12"] = { value: "", formula: "=SUM(E8:E11)", bold: true, format: "number" }; d["F12"] = { value: "", formula: "=SUM(F8:F11)", bold: true, format: "number" };
  // Profit
  d["A14"] = { value: "Net Profit", bold: true }; d["B14"] = { value: "", formula: "=B6-B12", bold: true, format: "number", bgColor: "#dcfce7" }; d["C14"] = { value: "", formula: "=C6-C12", bold: true, format: "number", bgColor: "#dcfce7" }; d["D14"] = { value: "", formula: "=D6-D12", bold: true, format: "number", bgColor: "#dcfce7" }; d["E14"] = { value: "", formula: "=E6-E12", bold: true, format: "number", bgColor: "#dcfce7" }; d["F14"] = { value: "", formula: "=F6-F12", bold: true, format: "number", bgColor: "#dcfce7" };
  d["A15"] = { value: "Profit Margin" }; d["B15"] = { value: "", formula: "=B14/B6", format: "percent" }; d["C15"] = { value: "", formula: "=C14/C6", format: "percent" }; d["D15"] = { value: "", formula: "=D14/D6", format: "percent" }; d["E15"] = { value: "", formula: "=E14/E6", format: "percent" }; d["F15"] = { value: "", formula: "=F14/F6", format: "percent" };
  return d;
}

// ─── Page Component ────────────────────────────────────────────────────────

export default function SpreadsheetPage() {
  const [sheets, setSheets] = useState<{ name: string; data: SheetData }[]>([
    { name: "Sheet1", data: createInitialData() },
    { name: "Sheet2", data: {} },
    { name: "Sheet3", data: {} },
  ]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [activeCell, setActiveCell] = useState<string | null>("A1");
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [colWidths, setColWidths] = useState<number[]>(Array(COLS).fill(DEFAULT_COL_WIDTH));
  const [history, setHistory] = useState<SheetData[]>([]);
  const [historyPos, setHistoryPos] = useState(-1);
  const editRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const data = sheets[activeSheet].data;

  const setData = useCallback((newData: SheetData | ((prev: SheetData) => SheetData)) => {
    setSheets(prev => prev.map((s, i) => i === activeSheet ? { ...s, data: typeof newData === "function" ? newData(s.data) : newData } : s));
  }, [activeSheet]);

  const pushHistory = useCallback(() => {
    const newHist = history.slice(0, historyPos + 1);
    newHist.push({ ...data });
    setHistory(newHist);
    setHistoryPos(newHist.length - 1);
  }, [data, history, historyPos]);

  const undo = useCallback(() => {
    if (historyPos > 0) { setData(history[historyPos - 1]); setHistoryPos(historyPos - 1); }
  }, [history, historyPos, setData]);

  const redo = useCallback(() => {
    if (historyPos < history.length - 1) { setData(history[historyPos + 1]); setHistoryPos(historyPos + 1); }
  }, [history, historyPos, setData]);

  const updateCell = useCallback((ref: string, updates: Partial<CellData>) => {
    pushHistory();
    setData(prev => {
      const cell = prev[ref] || { value: "" };
      return { ...prev, [ref]: { ...cell, ...updates } };
    });
  }, [pushHistory, setData]);

  const startEdit = useCallback((ref: string) => {
    setEditingCell(ref);
    const cell = data[ref];
    setEditValue(cell?.formula || cell?.value || "");
    setTimeout(() => editRef.current?.focus(), 0);
  }, [data]);

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    pushHistory();
    const isFormula = editValue.startsWith("=");
    setData(prev => ({
      ...prev,
      [editingCell]: {
        ...(prev[editingCell] || {}),
        value: isFormula ? "" : editValue,
        formula: isFormula ? editValue : undefined,
      },
    }));
    setEditingCell(null);
  }, [editingCell, editValue, pushHistory, setData]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const col = activeCell.charCodeAt(0) - 65;
    const row = parseInt(activeCell.slice(1)) - 1;

    if (editingCell) {
      if (e.key === "Enter") { e.preventDefault(); commitEdit(); setActiveCell(cellRef(col, Math.min(row + 1, ROWS - 1))); }
      else if (e.key === "Escape") { setEditingCell(null); }
      else if (e.key === "Tab") { e.preventDefault(); commitEdit(); setActiveCell(cellRef(Math.min(col + 1, COLS - 1), row)); }
      return;
    }

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setActiveCell(cellRef(col, Math.max(row - 1, 0))); break;
      case "ArrowDown": e.preventDefault(); setActiveCell(cellRef(col, Math.min(row + 1, ROWS - 1))); break;
      case "ArrowLeft": e.preventDefault(); setActiveCell(cellRef(Math.max(col - 1, 0), row)); break;
      case "ArrowRight": case "Tab": e.preventDefault(); setActiveCell(cellRef(Math.min(col + 1, COLS - 1), row)); break;
      case "Enter": e.preventDefault(); startEdit(activeCell); break;
      case "Delete": case "Backspace": pushHistory(); setData(prev => { const n = { ...prev }; delete n[activeCell!]; return n; }); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { setEditingCell(activeCell); setEditValue(e.key); e.preventDefault(); setTimeout(() => editRef.current?.focus(), 0); }
        break;
    }
  }, [activeCell, editingCell, commitEdit, startEdit, pushHistory, setData]);

  // Format active cell
  const toggleBold = () => activeCell && updateCell(activeCell, { bold: !data[activeCell]?.bold });
  const toggleItalic = () => activeCell && updateCell(activeCell, { italic: !data[activeCell]?.italic });
  const toggleUnderline = () => activeCell && updateCell(activeCell, { underline: !data[activeCell]?.underline });
  const setAlign = (a: "left" | "center" | "right") => activeCell && updateCell(activeCell, { align: a });
  const setFormat = (f: CellData["format"]) => activeCell && updateCell(activeCell, { format: f });
  const setBg = (c: string) => activeCell && updateCell(activeCell, { bgColor: c });

  // CSV Export
  const downloadCSV = useCallback(() => {
    let maxRow = 0, maxCol = 0;
    for (const key of Object.keys(data)) {
      const c = key.charCodeAt(0) - 65;
      const r = parseInt(key.slice(1)) - 1;
      maxRow = Math.max(maxRow, r);
      maxCol = Math.max(maxCol, c);
    }
    const rows: string[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const cols: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const ref = cellRef(c, r);
        const val = getDisplayValue(data[ref], data);
        cols.push(val.includes(",") ? `"${val}"` : val);
      }
      rows.push(cols.join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sheets[activeSheet].name}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [data, sheets, activeSheet]);

  // CSV Import
  const importCSV = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const newData: SheetData = {};
      text.split("\n").forEach((line, r) => {
        let inQuote = false, col = 0, current = "";
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === "," && !inQuote) { newData[cellRef(col, r)] = { value: current.trim() }; col++; current = ""; }
          else { current += ch; }
        }
        if (current.trim()) newData[cellRef(col, r)] = { value: current.trim() };
      });
      pushHistory();
      setData(newData);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [pushHistory, setData]);

  // Auto-calculate footer
  const selectedCellData = activeCell ? data[activeCell] : undefined;
  const formulaBarValue = editingCell ? editValue : (selectedCellData?.formula || selectedCellData?.value || "");

  // Calculate stats for all cells with numbers
  const allNumericValues = useMemo(() => {
    return Object.values(data).map(c => {
      if (c.formula) { const v = evaluateFormula(c.formula, data); return typeof v === "number" ? v : parseFloat(String(v)); }
      return parseFloat(c.value);
    }).filter((v: number) => !isNaN(v));
  }, [data]);

  const addSheet = () => {
    setSheets(prev => [...prev, { name: `Sheet${Date.now().toString(36)}`, data: {} }]);
    setActiveSheet(sheets.length);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/50 flex-wrap">
        <div className="flex items-center gap-0.5 mr-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} title="Undo"><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} title="Redo"><Redo2 className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mr-2">
          <Button variant={data[activeCell || ""]?.bold ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleBold}><Bold className="h-3.5 w-3.5" /></Button>
          <Button variant={data[activeCell || ""]?.italic ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleItalic}><Italic className="h-3.5 w-3.5" /></Button>
          <Button variant={data[activeCell || ""]?.underline ? "default" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={toggleUnderline}><Underline className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mr-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setAlign("left")}><AlignLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setAlign("center")}><AlignCenter className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setAlign("right")}><AlignRight className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mr-2">
          <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={() => setFormat("currency")} title="Currency"><DollarSign className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={() => setFormat("percent")} title="Percent"><Percent className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={() => setFormat("number")} title="Number"><Hash className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mr-2">
          {["#ffffff", "#fee2e2", "#fef9c3", "#dcfce7", "#dbeafe", "#f3e8ff", "#f1f5f9"].map(c => (
            <button key={c} className="h-5 w-5 rounded border border-border" style={{ backgroundColor: c }} onClick={() => setBg(c)} title={`Background: ${c}`} />
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3" />Import</Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={downloadCSV}><Download className="h-3 w-3" />Export CSV</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => window.print()}><Printer className="h-3 w-3" />Print</Button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b bg-card">
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded min-w-[40px] text-center font-semibold">{activeCell || ""}</span>
        <FunctionSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={formulaBarValue}
          onChange={e => { if (editingCell) setEditValue(e.target.value); else if (activeCell) { setEditingCell(activeCell); setEditValue(e.target.value); } }}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(); }}
          className="h-7 text-sm font-mono border-0 shadow-none focus-visible:ring-0"
          placeholder="Enter value or formula (e.g. =SUM(A1:A10))"
        />
      </div>

      {/* Grid */}
      <div ref={tableRef} className="flex-1 overflow-auto relative">
        <table className="border-collapse" style={{ minWidth: colWidths.reduce((s: number, w: number) => s + w, 40) }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-muted border border-border px-1 py-0.5 text-xs font-medium text-muted-foreground sticky left-0 z-20 w-[40px] min-w-[40px]">#</th>
              {COL_LETTERS.map((letter, ci) => (
                <th key={letter} className="bg-muted border border-border px-1 py-0.5 text-xs font-medium text-muted-foreground select-none" style={{ width: colWidths[ci], minWidth: colWidths[ci] }}>{letter}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, ri) => (
              <tr key={ri}>
                <td className="bg-muted/50 border border-border px-1 py-0 text-xs text-muted-foreground text-center sticky left-0 z-10 font-medium select-none">{ri + 1}</td>
                {COL_LETTERS.map((letter, ci) => {
                  const ref = `${letter}${ri + 1}`;
                  const cell = data[ref];
                  const isActive = activeCell === ref;
                  const isEditing = editingCell === ref;
                  const display = getDisplayValue(cell, data);

                  return (
                    <td
                      key={ref}
                      className={`border border-border px-1 py-0 text-xs relative cursor-cell ${isActive ? "outline outline-2 outline-blue-500 z-10" : ""}`}
                      style={{
                        backgroundColor: cell?.bgColor || undefined,
                        fontWeight: cell?.bold ? 700 : undefined,
                        fontStyle: cell?.italic ? "italic" : undefined,
                        textDecoration: cell?.underline ? "underline" : undefined,
                        textAlign: cell?.align || "left",
                        width: colWidths[ci],
                        minWidth: colWidths[ci],
                        maxWidth: colWidths[ci],
                      }}
                      onClick={() => { if (editingCell && editingCell !== ref) commitEdit(); setActiveCell(ref); }}
                      onDoubleClick={() => startEdit(ref)}
                    >
                      {isEditing ? (
                        <input
                          ref={editRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          className="w-full h-full border-0 outline-none bg-card text-xs px-0 py-0 font-mono"
                          style={{ minHeight: "20px" }}
                        />
                      ) : (
                        <span className="block truncate leading-5 min-h-[20px]">{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: Sheet Tabs + Stats */}
      <div className="flex items-center justify-between border-t bg-muted/50 px-2 py-1">
        <div className="flex items-center gap-0.5">
          {sheets.map((s, i) => (
            <button key={i} className={`px-3 py-1 text-xs rounded-t border-t border-x ${i === activeSheet ? "bg-card font-medium border-border" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"}`} onClick={() => setActiveSheet(i)}>{s.name}</button>
          ))}
          <button className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={addSheet}><Plus className="h-3 w-3" /></button>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          {allNumericValues.length > 0 && (<>
            <span>SUM: {allNumericValues.reduce((s: number, v: number) => s + v, 0).toLocaleString()}</span>
            <span>AVG: {(allNumericValues.reduce((s: number, v: number) => s + v, 0) / allNumericValues.length).toFixed(0)}</span>
            <span>COUNT: {allNumericValues.length}</span>
            <span>MIN: {Math.min(...allNumericValues).toLocaleString()}</span>
            <span>MAX: {Math.max(...allNumericValues).toLocaleString()}</span>
          </>)}
        </div>
      </div>
    </div>
  );
}
