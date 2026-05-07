"use client";

import {
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type ChangeEvent,
} from "react";
import {
  Upload,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadFile,
  deleteFile,
  formatFileSize,
  isImageMime,
  isPdfMime,
  type UploadedFile,
} from "@/lib/uploads/upload-service";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FileUploadProps {
  entity: string;
  entityId: string;
  maxFiles?: number;
  maxSize?: number; // bytes, default 10 MB
  accept?: string; // comma-separated mime types
  onUpload?: (file: UploadedFile) => void;
  onDelete?: (fileId: string) => void;
  existingFiles?: UploadedFile[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FileUpload({
  entity,
  entityId,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  accept,
  onUpload,
  onDelete,
  existingFiles = [],
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validate = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `"${file.name}" exceeds the ${formatFileSize(maxSize)} limit (${formatFileSize(file.size)})`;
      }
      if (files.length >= maxFiles) {
        return `Maximum of ${maxFiles} files reached`;
      }
      return null;
    },
    [files.length, maxFiles, maxSize],
  );

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      setError(null);
      const list = Array.from(incoming);

      for (const file of list) {
        const validationError = validate(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        setUploading(true);
        setProgress(0);

        // Simulate progress since fetch doesn't expose upload progress natively
        const progressInterval = setInterval(() => {
          setProgress((p) => Math.min(p + 10, 90));
        }, 150);

        try {
          const uploaded = await uploadFile(file, entity, entityId);
          setFiles((prev) => [...prev, uploaded]);
          onUpload?.(uploaded);
          setProgress(100);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Upload failed";
          setError(message);
        } finally {
          clearInterval(progressInterval);
          setUploading(false);
          setProgress(0);
        }
      }
    },
    [entity, entityId, onUpload, validate],
  );

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------

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
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
      }
      // Reset so re-selecting the same file triggers onChange
      e.target.value = "";
    },
    [handleFiles],
  );

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  const handleDelete = useCallback(
    async (fileId: string) => {
      try {
        await deleteFile(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        onDelete?.(fileId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Delete failed";
        setError(message);
      }
    },
    [onDelete],
  );

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function fileIcon(mime: string) {
    if (isImageMime(mime)) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (isPdfMime(mime)) return <FileText className="h-5 w-5 text-red-500" />;
    return <FileIcon className="h-5 w-5 text-gray-500" />;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {uploading
              ? "Uploading..."
              : "Drag & drop files here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max {formatFileSize(maxSize)} per file &middot; Up to {maxFiles}{" "}
            files
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={onInputChange}
          className="hidden"
        />

        {/* Progress bar */}
        {uploading && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-lg bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm"
            >
              {/* Thumbnail / icon */}
              {isImageMime(f.mimeType) ? (
                <img
                  src={f.url}
                  alt={f.originalName}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                  {fileIcon(f.mimeType)}
                </span>
              )}

              {/* Name + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {f.originalName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(f.size)}
                </p>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(f.id);
                }}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/40"
                aria-label={`Remove ${f.originalName}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
