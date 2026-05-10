import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { writeFile, mkdir, readdir, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadMeta {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  entity: string;
  entityId: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  // PDF
  "application/pdf",
  // Spreadsheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  // CSV
  "text/csv",
  // Word
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff",
  ".pdf",
  ".xlsx", ".xls", ".csv",
  ".doc", ".docx",
]);

/** In-memory meta store (per server lifecycle). Replace with DB later. */
const metaStore: Map<string, UploadMeta> = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isAllowedFile(file: File): { ok: boolean; reason?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: `File size exceeds the 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` };
  }

  const ext = path.extname(file.name).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.type) || file.type.startsWith("image/");
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (!mimeOk && !extOk) {
    return { ok: false, reason: `File type "${file.type || ext}" is not allowed` };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// POST  /api/upload
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth check — only authenticated users may upload files
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entity = formData.get("entity") as string | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!entity || !entityId) {
      return NextResponse.json(
        { error: "entity and entityId are required" },
        { status: 400 },
      );
    }

    // Validate
    const check = isAllowedFile(file);
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    // Build destination path
    const id = generateId();
    const timestamp = Date.now();
    const safeName = sanitizeFilename(file.name);
    const filename = `${timestamp}-${safeName}`;
    const dir = path.join(process.cwd(), "public", "uploads", entity, entityId);
    const filePath = path.join(dir, filename);
    const url = `/uploads/${entity}/${entityId}/${filename}`;

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const meta: UploadMeta = {
      id,
      url,
      filename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      entity,
      entityId,
      uploadedBy: "current-user", // TODO: pull from session
      uploadedAt: new Date().toISOString(),
    };

    metaStore.set(id, meta);

    return NextResponse.json(meta, { status: 201 });
  } catch (err) {
    console.error("[upload] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET  /api/upload?entity=...&entityId=...
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity");
    const entityId = searchParams.get("entityId");

    if (!entity || !entityId) {
      return NextResponse.json(
        { error: "entity and entityId query params are required" },
        { status: 400 },
      );
    }

    // Return matching meta entries
    const results: UploadMeta[] = [];
    for (const meta of metaStore.values()) {
      if (meta.entity === entity && meta.entityId === entityId) {
        results.push(meta);
      }
    }

    // Also scan the filesystem for files not in meta (e.g. after server restart)
    const dir = path.join(process.cwd(), "public", "uploads", entity, entityId);
    if (existsSync(dir)) {
      const files = await readdir(dir);
      const knownFiles = new Set(results.map((r) => r.filename));

      for (const filename of files) {
        if (knownFiles.has(filename)) continue;

        const filePath = path.join(dir, filename);
        const stats = await stat(filePath);
        if (!stats.isFile()) continue;

        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
          ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
          ".bmp": "image/bmp", ".tiff": "image/tiff",
          ".pdf": "application/pdf",
          ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ".xls": "application/vnd.ms-excel",
          ".csv": "text/csv",
          ".doc": "application/msword",
          ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };

        const id = `upload_fs_${filename}`;
        const meta: UploadMeta = {
          id,
          url: `/uploads/${entity}/${entityId}/${filename}`,
          filename,
          originalName: filename.replace(/^\d+-/, ""),
          size: stats.size,
          mimeType: mimeMap[ext] ?? "application/octet-stream",
          entity,
          entityId,
          uploadedBy: "unknown",
          uploadedAt: stats.mtime.toISOString(),
        };

        metaStore.set(id, meta);
        results.push(meta);
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[upload] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
