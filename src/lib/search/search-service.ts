import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchOptions {
  entities?: string[];
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
  sort?: "relevance" | "date" | "name";
  highlight?: boolean;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  highlight: string | null;
  rank: number;
  entityType: string;
  url: string;
  metadata: Record<string, unknown>;
}

export interface EntitySearchResult {
  entity: string;
  items: SearchResultItem[];
  total: number;
}

export interface SearchResponse {
  results: EntitySearchResult[];
  totalHits: number;
  query: string;
  executionTimeMs: number;
  suggestions: string[];
  facets: Record<string, number>;
}

// ─── Entity Search Configs ────────────────────────────────────────────────────

interface EntitySearchConfig {
  table: string;
  fields: { column: string; weight: "A" | "B" | "C" | "D" }[];
  titleField: string;
  subtitleField: string | null;
  urlPrefix: string;
  metadataFields: string[];
}

const ENTITY_CONFIGS: Record<string, EntitySearchConfig> = {
  customer: {
    table: "accounts",
    fields: [
      { column: "name", weight: "A" },
      { column: "email", weight: "B" },
      { column: "phone", weight: "C" },
      { column: "industry", weight: "C" },
      { column: "city", weight: "D" },
      { column: "country", weight: "D" },
    ],
    titleField: "name",
    subtitleField: "industry",
    urlPrefix: "/crm/accounts",
    metadataFields: ["type", "city", "country", "email", "phone"],
  },
  product: {
    table: "products",
    fields: [
      { column: "name", weight: "A" },
      { column: "sku", weight: "A" },
      { column: "description", weight: "B" },
      { column: "category", weight: "C" },
    ],
    titleField: "name",
    subtitleField: "category",
    urlPrefix: "/inventory/products",
    metadataFields: ["sku", "category", "status", "\"unitPrice\"", "quantity"],
  },
  invoice: {
    table: "invoices",
    fields: [
      { column: "\"invoiceNumber\"", weight: "A" },
      { column: "notes", weight: "C" },
    ],
    titleField: "\"invoiceNumber\"",
    subtitleField: "status",
    urlPrefix: "/finance/invoices",
    metadataFields: ["status", "total", "\"dueDate\""],
  },
  employee: {
    table: "employees",
    fields: [
      { column: "\"firstName\"", weight: "A" },
      { column: "\"lastName\"", weight: "A" },
      { column: "email", weight: "B" },
      { column: "phone", weight: "C" },
      { column: "position", weight: "B" },
      { column: "\"employeeNumber\"", weight: "A" },
    ],
    titleField: "\"firstName\" || ' ' || \"lastName\"",
    subtitleField: "position",
    urlPrefix: "/hr/employees",
    metadataFields: ["\"employeeNumber\"", "email", "position", "status"],
  },
  department: {
    table: "departments",
    fields: [
      { column: "name", weight: "A" },
      { column: "description", weight: "B" },
    ],
    titleField: "name",
    subtitleField: "description",
    urlPrefix: "/hr/departments",
    metadataFields: ["budget"],
  },
  purchaseorder: {
    table: "purchase_orders",
    fields: [
      { column: "\"poNumber\"", weight: "A" },
      { column: "notes", weight: "C" },
    ],
    titleField: "\"poNumber\"",
    subtitleField: "status",
    urlPrefix: "/procurement/purchase-orders",
    metadataFields: ["status", "total", "\"expectedDate\""],
  },
  salesorder: {
    table: "sales_orders",
    fields: [
      { column: "\"orderNumber\"", weight: "A" },
      { column: "notes", weight: "C" },
      { column: "\"shippingAddress\"", weight: "D" },
    ],
    titleField: "\"orderNumber\"",
    subtitleField: "status",
    urlPrefix: "/sales/orders",
    metadataFields: ["status", "total"],
  },
  supplier: {
    table: "suppliers",
    fields: [
      { column: "name", weight: "A" },
      { column: "email", weight: "B" },
      { column: "phone", weight: "C" },
      { column: "city", weight: "D" },
      { column: "country", weight: "D" },
    ],
    titleField: "name",
    subtitleField: "city",
    urlPrefix: "/procurement/suppliers",
    metadataFields: ["email", "phone", "status", "rating"],
  },
  lead: {
    table: "leads",
    fields: [
      { column: "\"firstName\"", weight: "A" },
      { column: "\"lastName\"", weight: "A" },
      { column: "email", weight: "B" },
      { column: "company", weight: "B" },
      { column: "phone", weight: "C" },
    ],
    titleField: "\"firstName\" || ' ' || \"lastName\"",
    subtitleField: "company",
    urlPrefix: "/crm/leads",
    metadataFields: ["source", "status", "score", "value"],
  },
  opportunity: {
    table: "opportunities",
    fields: [
      { column: "title", weight: "A" },
      { column: "notes", weight: "C" },
    ],
    titleField: "title",
    subtitleField: "stage",
    urlPrefix: "/crm/opportunities",
    metadataFields: ["stage", "value", "probability"],
  },
  contact: {
    table: "contacts",
    fields: [
      { column: "\"firstName\"", weight: "A" },
      { column: "\"lastName\"", weight: "A" },
      { column: "email", weight: "B" },
      { column: "phone", weight: "C" },
      { column: "title", weight: "C" },
    ],
    titleField: "\"firstName\" || ' ' || \"lastName\"",
    subtitleField: "title",
    urlPrefix: "/crm/contacts",
    metadataFields: ["email", "phone", "title"],
  },
  project: {
    table: "projects",
    fields: [
      { column: "name", weight: "A" },
      { column: "description", weight: "B" },
    ],
    titleField: "name",
    subtitleField: "status",
    urlPrefix: "/projects",
    metadataFields: ["status", "budget", "progress"],
  },
};

// All supported entity names
const ALL_ENTITIES = Object.keys(ENTITY_CONFIGS);

// ─── Search Service ───────────────────────────────────────────────────────────

/**
 * Build the tsvector expression for an entity. Concatenates all fields
 * with their weight setups using `setweight`.
 */
function buildTsVector(config: EntitySearchConfig): string {
  return config.fields
    .map(
      (f) =>
        `setweight(to_tsvector('english', coalesce(${f.column}::text, '')), '${f.weight}')`,
    )
    .join(" || ");
}

/**
 * Build the headline (highlighted) snippet for search results.
 * Uses ts_headline on the concatenation of all searchable fields.
 */
function buildHeadline(config: EntitySearchConfig): string {
  const concat = config.fields
    .map((f) => `coalesce(${f.column}::text, '')`)
    .join(" || ' ' || ");
  return `ts_headline('english', ${concat}, query, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30, MinWords=10')`;
}

/**
 * Build the metadata JSON object expression for a given entity config.
 */
function buildMetadataSelect(config: EntitySearchConfig): string {
  if (config.metadataFields.length === 0) return "'{}'::jsonb";
  const entries = config.metadataFields
    .map((f) => {
      // Strip surrounding quotes for the JSON key
      const key = f.replace(/"/g, "");
      return `'${key}', ${f}`;
    })
    .join(", ");
  return `jsonb_build_object(${entries})`;
}

/**
 * Execute a full-text search across one or more entity types.
 */
export async function search(
  queryText: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const startTime = Date.now();

  const {
    entities,
    limit = 20,
    offset = 0,
    sort = "relevance",
    highlight = false,
  } = options;

  // Sanitize query: remove special tsquery chars
  const sanitized = queryText
    .replace(/[^a-zA-Z0-9\s؀-ۿ]/g, " ")
    .trim();

  if (!sanitized) {
    return {
      results: [],
      totalHits: 0,
      query: queryText,
      executionTimeMs: Date.now() - startTime,
      suggestions: [],
      facets: {},
    };
  }

  // Determine which entities to search
  const targetEntities = entities?.length
    ? entities.filter((e) => e in ENTITY_CONFIGS)
    : ALL_ENTITIES;

  if (targetEntities.length === 0) {
    return {
      results: [],
      totalHits: 0,
      query: queryText,
      executionTimeMs: Date.now() - startTime,
      suggestions: [],
      facets: {},
    };
  }

  // Build UNION ALL query across all target entities
  const unionParts = targetEntities.map((entityName) => {
    const config = ENTITY_CONFIGS[entityName];
    const tsVector = buildTsVector(config);
    const headlineExpr = highlight
      ? buildHeadline(config)
      : "NULL::text";
    const metaExpr = buildMetadataSelect(config);

    const orderExpr =
      sort === "date"
        ? '"createdAt" DESC'
        : sort === "name"
          ? `${config.titleField} ASC`
          : "rank DESC";

    return `
      SELECT
        id,
        ${config.titleField} AS title,
        ${config.subtitleField ? `${config.subtitleField}::text` : "NULL::text"} AS subtitle,
        ${headlineExpr} AS highlight,
        ts_rank(${tsVector}, query) AS rank,
        '${entityName}' AS entity_type,
        '${config.urlPrefix}' AS url_prefix,
        ${metaExpr} AS metadata
      FROM "${config.table}",
           plainto_tsquery('english', $1) AS query
      WHERE (${tsVector}) @@ query
      ORDER BY ${orderExpr}
      LIMIT ${Math.min(limit, 100)}
      OFFSET ${offset}
    `;
  });

  // Count queries for each entity (for facets and totals)
  const countParts = targetEntities.map((entityName) => {
    const config = ENTITY_CONFIGS[entityName];
    const tsVector = buildTsVector(config);
    return `
      SELECT '${entityName}' AS entity_type, COUNT(*)::int AS cnt
      FROM "${config.table}",
           plainto_tsquery('english', $1) AS query
      WHERE (${tsVector}) @@ query
    `;
  });

  const unionQuery = unionParts.join("\nUNION ALL\n");
  const countQuery = countParts.join("\nUNION ALL\n");

  // Execute search and count queries in parallel
  type SearchRow = {
    id: string;
    title: string;
    subtitle: string | null;
    highlight: string | null;
    rank: number;
    entity_type: string;
    url_prefix: string;
    metadata: Record<string, unknown>;
  };

  type CountRow = {
    entity_type: string;
    cnt: number;
  };

  const [searchRows, countRows] = await Promise.all([
    prisma.$queryRaw<SearchRow[]>(
      Prisma.sql`${Prisma.raw(unionQuery)}`,
      sanitized,
    ),
    prisma.$queryRaw<CountRow[]>(
      Prisma.sql`${Prisma.raw(countQuery)}`,
      sanitized,
    ),
  ]);

  // Build facets from counts
  const facets: Record<string, number> = {};
  let totalHits = 0;
  for (const row of countRows) {
    facets[row.entity_type] = Number(row.cnt);
    totalHits += Number(row.cnt);
  }

  // Group results by entity type
  const groupedMap = new Map<string, SearchResultItem[]>();
  for (const row of searchRows) {
    const item: SearchResultItem = {
      id: row.id,
      title: row.title || "",
      subtitle: row.subtitle,
      excerpt: row.highlight,
      highlight: row.highlight,
      rank: Number(row.rank),
      entityType: row.entity_type,
      url: `${row.url_prefix}/${row.id}`,
      metadata:
        typeof row.metadata === "object" && row.metadata !== null
          ? row.metadata
          : {},
    };
    const list = groupedMap.get(row.entity_type) || [];
    list.push(item);
    groupedMap.set(row.entity_type, list);
  }

  // Build ordered result array
  const results: EntitySearchResult[] = targetEntities
    .filter((entity) => groupedMap.has(entity) || (facets[entity] ?? 0) > 0)
    .map((entity) => ({
      entity,
      items: groupedMap.get(entity) || [],
      total: facets[entity] ?? 0,
    }));

  // Generate suggestions (autocomplete from recent search-like data)
  const suggestions = await generateSuggestions(sanitized);

  return {
    results,
    totalHits,
    query: queryText,
    executionTimeMs: Date.now() - startTime,
    suggestions,
    facets,
  };
}

// ─── Suggestions / Autocomplete ───────────────────────────────────────────────

/**
 * Generate search suggestions by looking for partial matches in high-value
 * fields (product names, customer names, employee names). This provides
 * autocomplete functionality.
 */
async function generateSuggestions(prefix: string): Promise<string[]> {
  if (prefix.length < 2) return [];

  const likePattern = `%${prefix}%`;

  type SuggestionRow = { suggestion: string };

  const rows = await prisma.$queryRaw<SuggestionRow[]>`
    (SELECT name AS suggestion FROM "products" WHERE name ILIKE ${likePattern} LIMIT 3)
    UNION
    (SELECT name AS suggestion FROM "accounts" WHERE name ILIKE ${likePattern} LIMIT 3)
    UNION
    (SELECT name AS suggestion FROM "suppliers" WHERE name ILIKE ${likePattern} LIMIT 3)
    UNION
    (SELECT "firstName" || ' ' || "lastName" AS suggestion FROM "employees" WHERE
      "firstName" ILIKE ${likePattern} OR "lastName" ILIKE ${likePattern} LIMIT 3)
    UNION
    (SELECT "firstName" || ' ' || "lastName" AS suggestion FROM "contacts" WHERE
      "firstName" ILIKE ${likePattern} OR "lastName" ILIKE ${likePattern} LIMIT 3)
    LIMIT 10
  `;

  return rows.map((r) => r.suggestion);
}

// ─── Single Entity Search ─────────────────────────────────────────────────────

/**
 * Search within a single entity type. Returns only items for that entity.
 */
export async function searchEntity(
  entityType: string,
  queryText: string,
  options: Omit<SearchOptions, "entities"> = {},
): Promise<EntitySearchResult> {
  const result = await search(queryText, {
    ...options,
    entities: [entityType],
  });
  return (
    result.results[0] || { entity: entityType, items: [], total: 0 }
  );
}

/**
 * Return the list of supported searchable entity type names.
 */
export function getSupportedEntities(): string[] {
  return [...ALL_ENTITIES];
}
