// ─── Full-text Search Index ──────────────────────────────────────────────────
// In-memory inverted index with TF-IDF scoring, Arabic diacritics support,
// and optional fuzzy matching.

// ─── Arabic diacritics (tashkeel) removal ────────────────────────────────────
// Unicode range for Arabic diacritics: ً-ٟ, ٰ, ۖ-ۜ,
// ۟-ۤ, ۧ-ۨ, ۪-ۭ
const ARABIC_DIACRITICS_RE =
  /[ً-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/g;

function removeArabicDiacritics(text: string): string {
  return text.replace(ARABIC_DIACRITICS_RE, "");
}

// ─── Tokenizer ───────────────────────────────────────────────────────────────
// Lowercase, strip diacritics, split on whitespace + common punctuation
const SPLIT_RE = /[\s\-_.,;:!?'"()\[\]{}<>\/\\@#$%^&*+=|~`]+/;

function tokenize(text: string): string[] {
  const cleaned = removeArabicDiacritics(text.toLowerCase());
  return cleaned
    .split(SPLIT_RE)
    .filter((t) => t.length > 0);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Limit results to specific entity types */
  entities?: string[];
  /** Max total results (default 20) */
  limit?: number;
  /** Enable fuzzy matching via edit-distance-1 (default false) */
  fuzzy?: boolean;
}

export interface SearchResult {
  id: string;
  entity: string;
  score: number;
  highlights: Record<string, string>;
  matchedFields: string[];
}

// ─── Internal structures ─────────────────────────────────────────────────────

interface DocEntry {
  id: string;
  entity: string;
  fields: Record<string, string>; // field name -> original text
  fieldTokens: Record<string, string[]>; // field name -> tokens
  tokenCount: number; // total tokens across all fields
}

// Posting: docId -> frequency in that document
type PostingList = Map<string, number>;

// ─── SearchIndex ─────────────────────────────────────────────────────────────

export class SearchIndex {
  // All indexed documents
  private docs = new Map<string, DocEntry>();
  // Inverted index: token -> PostingList(docId -> frequency)
  private index = new Map<string, PostingList>();
  // Total number of documents (for IDF)
  private docCount = 0;

  /** Add or re-index a document */
  addDocument(
    id: string,
    entity: string,
    fields: Record<string, string | string[]>,
  ): void {
    // Remove old version first if exists
    if (this.docs.has(id)) {
      this.removeDocument(id);
    }

    const flatFields: Record<string, string> = {};
    const fieldTokens: Record<string, string[]> = {};
    let totalTokens = 0;

    for (const [field, value] of Object.entries(fields)) {
      const text = Array.isArray(value) ? value.join(" ") : value;
      if (!text) continue;
      flatFields[field] = text;
      const tokens = tokenize(text);
      fieldTokens[field] = tokens;
      totalTokens += tokens.length;

      // Build postings
      for (const token of tokens) {
        let postings = this.index.get(token);
        if (!postings) {
          postings = new Map();
          this.index.set(token, postings);
        }
        postings.set(id, (postings.get(id) ?? 0) + 1);
      }
    }

    this.docs.set(id, { id, entity, fields: flatFields, fieldTokens, tokenCount: totalTokens });
    this.docCount++;
  }

  /** Remove a document from the index */
  removeDocument(id: string): void {
    const doc = this.docs.get(id);
    if (!doc) return;

    // Remove from postings
    for (const tokens of Object.values(doc.fieldTokens)) {
      for (const token of tokens) {
        const postings = this.index.get(token);
        if (postings) {
          postings.delete(id);
          if (postings.size === 0) {
            this.index.delete(token);
          }
        }
      }
    }

    this.docs.delete(id);
    this.docCount--;
  }

  /** Search the index. Returns results sorted by relevance (TF-IDF). */
  search(query: string, options?: SearchOptions): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const limit = options?.limit ?? 20;
    const entityFilter = options?.entities
      ? new Set(options.entities)
      : null;
    const fuzzy = options?.fuzzy ?? false;

    // Resolve each query token to matching index tokens
    const resolvedTokens: string[][] = queryTokens.map((qt) => {
      const matches: string[] = [];
      if (this.index.has(qt)) {
        matches.push(qt);
      }
      if (fuzzy) {
        // Find edit-distance-1 matches
        for (const indexToken of this.index.keys()) {
          if (indexToken !== qt && editDistance1(qt, indexToken)) {
            matches.push(indexToken);
          }
        }
      }
      // Prefix matching: find tokens that start with the query token (min 2 chars)
      if (qt.length >= 2) {
        for (const indexToken of this.index.keys()) {
          if (indexToken !== qt && indexToken.startsWith(qt) && !matches.includes(indexToken)) {
            matches.push(indexToken);
          }
        }
      }
      return matches;
    });

    // Score each document
    const scores = new Map<string, number>();
    const matchedTokensPerDoc = new Map<string, Set<string>>();

    for (const tokenGroup of resolvedTokens) {
      for (const token of tokenGroup) {
        const postings = this.index.get(token);
        if (!postings) continue;

        // IDF = log(N / df) where df = number of docs containing the term
        const df = postings.size;
        const idf = Math.log((this.docCount + 1) / (df + 1)) + 1;

        for (const [docId, tf] of postings) {
          const doc = this.docs.get(docId);
          if (!doc) continue;
          if (entityFilter && !entityFilter.has(doc.entity)) continue;

          // TF = term frequency normalized by document length
          const normalizedTf = tf / (doc.tokenCount || 1);
          const tfidf = normalizedTf * idf;

          scores.set(docId, (scores.get(docId) ?? 0) + tfidf);

          let matchedSet = matchedTokensPerDoc.get(docId);
          if (!matchedSet) {
            matchedSet = new Set();
            matchedTokensPerDoc.set(docId, matchedSet);
          }
          matchedSet.add(token);
        }
      }
    }

    // Boost: docs matching more distinct query tokens get a multiplier
    for (const [docId, matchedSet] of matchedTokensPerDoc) {
      const coverage = matchedSet.size / queryTokens.length;
      const current = scores.get(docId) ?? 0;
      scores.set(docId, current * (1 + coverage));
    }

    // Sort by score descending
    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    // Build results with highlights
    const queryTokenSet = new Set(queryTokens);
    // Also include resolved fuzzy/prefix tokens for highlighting
    const allMatchTokens = new Set<string>();
    for (const group of resolvedTokens) {
      for (const t of group) allMatchTokens.add(t);
    }

    return sorted.map(([docId, score]) => {
      const doc = this.docs.get(docId)!;
      const highlights: Record<string, string> = {};
      const matchedFields: string[] = [];

      for (const [field, text] of Object.entries(doc.fields)) {
        const tokens = doc.fieldTokens[field];
        const hasMatch = tokens.some((t) => allMatchTokens.has(t));
        if (!hasMatch) continue;

        matchedFields.push(field);
        highlights[field] = highlightText(text, allMatchTokens);
      }

      return { id: docId, entity: doc.entity, score: Math.round(score * 1000) / 1000, highlights, matchedFields };
    });
  }
}

// ─── Highlight helper ────────────────────────────────────────────────────────
// Wraps matching tokens in <mark> tags. Operates on original text to preserve
// casing and diacritics in output while matching against normalized tokens.

function highlightText(text: string, matchTokens: Set<string>): string {
  // Split text into words while keeping delimiters
  const parts = text.split(/(\s+)/);
  return parts
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const normalized = tokenize(part);
      const matches = normalized.some((t) => {
        if (matchTokens.has(t)) return true;
        // check prefix match
        for (const mt of matchTokens) {
          if (t.startsWith(mt) || mt.startsWith(t)) return true;
        }
        return false;
      });
      return matches ? `<mark>${part}</mark>` : part;
    })
    .join("");
}

// ─── Edit-distance-1 check ──────────────────────────────────────────────────
// Returns true if two strings differ by at most one insertion, deletion, or
// substitution. Runs in O(max(m,n)) time.

function editDistance1(a: string, b: string): boolean {
  const lenDiff = a.length - b.length;
  if (Math.abs(lenDiff) > 1) return false;

  if (a.length === b.length) {
    // Check substitution
    let diffs = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diffs++;
        if (diffs > 1) return false;
      }
    }
    return diffs === 1;
  }

  // One is longer; check single insertion/deletion
  const longer = lenDiff > 0 ? a : b;
  const shorter = lenDiff > 0 ? b : a;
  let i = 0;
  let j = 0;
  let diffs = 0;
  while (i < longer.length && j < shorter.length) {
    if (longer[i] !== shorter[j]) {
      diffs++;
      if (diffs > 1) return false;
      i++; // skip one char in the longer string
    } else {
      i++;
      j++;
    }
  }
  return true;
}
