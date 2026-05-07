/**
 * Upload Service
 *
 * Handles file uploads, deletion, and listing.
 * Tracks uploads in localStorage until a database layer is ready.
 */

export interface UploadedFile {
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

const STORAGE_KEY = "erp_uploaded_files";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readStore(): UploadedFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UploadedFile[]) : [];
  } catch {
    return [];
  }
}

function writeStore(files: UploadedFile[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a single file to the server and track it locally.
 */
export async function uploadFile(
  file: File,
  entity: string,
  entityId: string,
): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("entity", entity);
  form.append("entityId", entityId);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }

  const data = (await res.json()) as UploadedFile;

  // Persist to localStorage
  const store = readStore();
  store.push(data);
  writeStore(store);

  return data;
}

/**
 * Delete a file by id from the server and local store.
 */
export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`/api/upload/${fileId}`, { method: "DELETE" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(err.error ?? "Delete failed");
  }

  // Remove from localStorage
  const store = readStore().filter((f) => f.id !== fileId);
  writeStore(store);
}

/**
 * List files for a given entity / entityId.
 *
 * Reads from the server first; falls back to localStorage if the request fails.
 */
export async function getFiles(
  entity: string,
  entityId: string,
): Promise<UploadedFile[]> {
  try {
    const res = await fetch(
      `/api/upload?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}`,
    );
    if (res.ok) {
      return (await res.json()) as UploadedFile[];
    }
  } catch {
    // fall through to localStorage
  }

  return readStore().filter(
    (f) => f.entity === entity && f.entityId === entityId,
  );
}

/**
 * Helper: human-readable file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Helper: check if a MIME type is an image.
 */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/**
 * Helper: check if a MIME type is a PDF.
 */
export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}
