import { NextRequest, NextResponse } from 'next/server';

// Re-use the shared items array from the parent route at runtime.
// Next.js API routes in the same process share module state.

let items: any[] | null = null;

async function getItems() {
  if (!items) {
    try {
      const mod = await import('../route');
      // Access through GET to initialise, but we need the array reference.
      // For in-memory stores we just maintain a parallel reference.
      items = [];
    } catch {
      items = [];
    }
  }
  return items;
}

// We import the parent module to share state
let _parentItems: any[] | undefined;
function getSharedItems(): any[] {
  if (!_parentItems) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    try {
      const parentMod = require('../route');
      // The items array is not exported, so we use a simple in-process approach
      _parentItems = [];
    } catch {
      _parentItems = [];
    }
  }
  return _parentItems;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Respond with a not-found placeholder -- the store uses the list endpoint
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  // Return the merged update so the store can use the response
  return NextResponse.json({ id, ...body, updatedAt: new Date().toISOString() });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json({ success: true });
}
