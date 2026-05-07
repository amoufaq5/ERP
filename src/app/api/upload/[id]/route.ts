import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Shared meta store reference
//
// Because Next.js App Router compiles each route file independently, we cannot
// share the in-memory Map across files at runtime. Instead, the DELETE handler
// receives enough context through the request to locate the file on disk.  A
// proper implementation would query a database; this is a local-filesystem
// placeholder.
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "File id is required" },
        { status: 400 },
      );
    }

    // The client sends the file URL in the body so we can locate the file.
    let url: string | undefined;
    try {
      const body = await request.json();
      url = body.url as string | undefined;
    } catch {
      // body may be empty; fall through
    }

    if (!url) {
      return NextResponse.json(
        { error: "File url is required in request body" },
        { status: 400 },
      );
    }

    // Resolve to an absolute path within public/
    const relative = url.startsWith("/") ? url.slice(1) : url;
    const filePath = path.join(process.cwd(), "public", relative);

    // Prevent path traversal
    const uploadsRoot = path.join(process.cwd(), "public", "uploads");
    if (!filePath.startsWith(uploadsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 },
      );
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 },
      );
    }

    await unlink(filePath);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[upload] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
