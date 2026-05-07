"use client";

import { useState, useCallback } from "react";
import {
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Download,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatFileSize,
  isImageMime,
  isPdfMime,
  type UploadedFile,
} from "@/lib/uploads/upload-service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FilePreviewProps {
  files: UploadedFile[];
  onDelete?: (fileId: string) => void;
  readOnly?: boolean;
  layout?: "grid" | "list";
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilePreview({
  files,
  onDelete,
  readOnly = false,
  layout = "grid",
  className,
}: FilePreviewProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const openLightbox = useCallback((url: string) => setLightboxUrl(url), []);
  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function typeIcon(mime: string) {
    if (isImageMime(mime))
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (isPdfMime(mime))
      return <FileText className="h-5 w-5 text-red-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (files.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <FileIcon className="mb-2 h-8 w-8" />
        No files attached
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Grid layout
  // -------------------------------------------------------------------------

  if (layout === "grid") {
    return (
      <>
        <div
          className={cn(
            "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4",
            className,
          )}
        >
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card"
            >
              {/* Preview area */}
              <div className="flex h-28 items-center justify-center bg-muted/40">
                {isImageMime(f.mimeType) ? (
                  <button
                    type="button"
                    onClick={() => openLightbox(f.url)}
                    className="h-full w-full"
                  >
                    <img
                      src={f.url}
                      alt={f.originalName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    {typeIcon(f.mimeType)}
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {f.mimeType.split("/").pop()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-0.5 p-2">
                <p className="truncate text-xs font-medium text-foreground">
                  {f.originalName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatFileSize(f.size)}
                </p>
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                {isImageMime(f.mimeType) && (
                  <button
                    type="button"
                    onClick={() => openLightbox(f.url)}
                    className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}

                {isPdfMime(f.mimeType) && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label="View PDF"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </a>
                )}

                {!isImageMime(f.mimeType) && (
                  <a
                    href={f.url}
                    download={f.originalName}
                    className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}

                {!readOnly && onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(f.id)}
                    className="rounded bg-red-600/80 p-1 text-white hover:bg-red-700"
                    aria-label={`Delete ${f.originalName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxUrl && <Lightbox url={lightboxUrl} onClose={closeLightbox} />}
      </>
    );
  }

  // -------------------------------------------------------------------------
  // List layout
  // -------------------------------------------------------------------------

  return (
    <>
      <ul
        className={cn(
          "divide-y divide-border rounded-lg border border-border",
          className,
        )}
      >
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 px-3 py-2.5 text-sm"
          >
            {/* Icon / thumb */}
            {isImageMime(f.mimeType) ? (
              <button type="button" onClick={() => openLightbox(f.url)}>
                <img
                  src={f.url}
                  alt={f.originalName}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              </button>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                {typeIcon(f.mimeType)}
              </span>
            )}

            {/* Name + size */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {f.originalName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(f.size)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {isImageMime(f.mimeType) && (
                <button
                  type="button"
                  onClick={() => openLightbox(f.url)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}

              {isPdfMime(f.mimeType) && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="View PDF"
                >
                  <Eye className="h-4 w-4" />
                </a>
              )}

              {!isImageMime(f.mimeType) && (
                <a
                  href={f.url}
                  download={f.originalName}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}

              {!readOnly && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(f.id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40"
                  aria-label={`Delete ${f.originalName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={closeLightbox} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightbox sub-component
// ---------------------------------------------------------------------------

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt="Preview"
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
