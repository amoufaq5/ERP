// ─── Document AI ────────────────────────────────────────────────────────────
// Real AI-powered document processing using the provider layer.
// Replaces the simulated OCR implementation.

import { ProviderRegistry, type Message, type ChatOptions } from './provider';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'invoice'
  | 'receipt'
  | 'contract'
  | 'purchase_order'
  | 'delivery_note'
  | 'credit_note'
  | 'bank_statement'
  | 'tax_document'
  | 'employee_document'
  | 'unknown';

export interface DocumentClassification {
  type: DocumentType;
  confidence: number;
  reasoning: string;
  suggestedCategory: string;
}

export interface ExtractedField {
  name: string;
  value: string;
  confidence: number;
  location?: string;
}

export interface DocumentExtraction {
  documentType: DocumentType;
  fields: ExtractedField[];
  rawText: string;
  metadata: {
    language: string;
    pageCount: number;
    extractedAt: string;
  };
}

export interface DocumentSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  entities: { type: string; value: string }[];
  actionItems: string[];
}

export interface ContractAnalysis {
  parties: { role: string; name: string; address?: string }[];
  effectiveDate: string | null;
  expirationDate: string | null;
  autoRenewal: boolean;
  terminationClause: string | null;
  paymentTerms: string | null;
  totalValue: string | null;
  obligations: { party: string; obligation: string }[];
  risks: { severity: 'low' | 'medium' | 'high'; description: string; clause?: string }[];
  keyDates: { date: string; description: string }[];
  governingLaw: string | null;
  confidentialityClause: boolean;
  indemnificationClause: boolean;
  limitationOfLiability: string | null;
}

// ─── Field Templates (guides the AI on what to extract) ────────────────────

const FIELD_TEMPLATES: Record<string, string[]> = {
  invoice: [
    'Invoice Number', 'Invoice Date', 'Due Date', 'Vendor/Seller Name', 'Vendor Address',
    'Buyer/Customer Name', 'Buyer Address', 'Subtotal', 'Tax Amount', 'Tax Rate',
    'Total Amount', 'Currency', 'Payment Terms', 'Bank Details', 'PO Reference',
    'Line Items (description, quantity, unit price, amount)',
  ],
  receipt: [
    'Receipt Number', 'Date', 'Time', 'Store/Merchant Name', 'Store Address',
    'Items Purchased', 'Subtotal', 'Tax', 'Total', 'Payment Method',
    'Card Last Four Digits', 'Authorization Code',
  ],
  contract: [
    'Contract Number', 'Contract Title', 'Party A Name', 'Party A Address',
    'Party B Name', 'Party B Address', 'Effective Date', 'Expiration Date',
    'Contract Value', 'Payment Terms', 'Notice Period', 'Governing Law',
    'Signatories',
  ],
  purchase_order: [
    'PO Number', 'PO Date', 'Delivery Date', 'Buyer Name', 'Buyer Address',
    'Supplier Name', 'Supplier Address', 'Line Items', 'Subtotal', 'Tax',
    'Total', 'Shipping Terms', 'Payment Terms',
  ],
  delivery_note: [
    'Delivery Note Number', 'Date', 'Sender Name', 'Recipient Name',
    'Delivery Address', 'Items Delivered', 'Reference PO Number',
    'Driver Name', 'Vehicle Number',
  ],
  credit_note: [
    'Credit Note Number', 'Date', 'Original Invoice Number', 'Vendor Name',
    'Customer Name', 'Reason', 'Amount', 'Tax Adjustment',
  ],
  bank_statement: [
    'Account Number', 'Account Holder', 'Bank Name', 'Statement Period',
    'Opening Balance', 'Closing Balance', 'Total Credits', 'Total Debits',
    'Number of Transactions',
  ],
  tax_document: [
    'Tax ID', 'Tax Period', 'Taxpayer Name', 'Tax Type', 'Gross Amount',
    'Taxable Amount', 'Tax Rate', 'Tax Amount', 'Filing Date',
  ],
  employee_document: [
    'Employee Name', 'Employee ID', 'Document Type', 'Issue Date',
    'Expiry Date', 'Issuing Authority', 'ID Number',
  ],
};

// ─── Document Classification ───────────────────────────────────────────────

export async function classifyDocument(
  text: string,
  registry?: ProviderRegistry,
): Promise<DocumentClassification> {
  const provider = registry || ProviderRegistry.getInstance();

  const messages: Message[] = [
    {
      role: 'user',
      content: `Classify the following document into one of these categories:
- invoice
- receipt
- contract
- purchase_order
- delivery_note
- credit_note
- bank_statement
- tax_document
- employee_document
- unknown

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{"type": "<category>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>", "suggestedCategory": "<human-readable category name>"}

Document text:
---
${text.slice(0, 8000)}
---`,
    },
  ];

  const options: ChatOptions = {
    temperature: 0.1,
    maxTokens: 500,
    systemPrompt: 'You are a document classification expert. Analyze documents and classify them accurately. Always respond with valid JSON only, no markdown formatting.',
  };

  const response = await provider.chatWithFallback(messages, options);

  try {
    const cleaned = response.content.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      type: parsed.type || 'unknown',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || '',
      suggestedCategory: parsed.suggestedCategory || parsed.type || 'unknown',
    };
  } catch {
    // If JSON parsing fails, try to extract the type from the text
    const types: DocumentType[] = [
      'invoice', 'receipt', 'contract', 'purchase_order', 'delivery_note',
      'credit_note', 'bank_statement', 'tax_document', 'employee_document',
    ];
    const lower = response.content.toLowerCase();
    const detected = types.find(t => lower.includes(t.replace('_', ' '))) || 'unknown';
    return {
      type: detected,
      confidence: 0.5,
      reasoning: 'Classification derived from partial AI response.',
      suggestedCategory: detected.replace('_', ' '),
    };
  }
}

// ─── Field Extraction ──────────────────────────────────────────────────────

export async function extractFields(
  text: string,
  documentType: DocumentType,
  registry?: ProviderRegistry,
): Promise<DocumentExtraction> {
  const provider = registry || ProviderRegistry.getInstance();

  const template = FIELD_TEMPLATES[documentType] || FIELD_TEMPLATES['invoice'];
  const fieldList = template.join(', ');

  const messages: Message[] = [
    {
      role: 'user',
      content: `Extract the following fields from this ${documentType.replace('_', ' ')} document:
${fieldList}

For each field found, provide:
- name: the field name
- value: the extracted value
- confidence: a number between 0 and 1 indicating extraction confidence

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{
  "fields": [
    {"name": "<field name>", "value": "<extracted value>", "confidence": <0.0-1.0>}
  ],
  "language": "<detected language code, e.g., en, ar, fr>",
  "pageEstimate": <estimated number of pages>
}

If a field is not found in the document, omit it from the array.

Document text:
---
${text.slice(0, 12000)}
---`,
    },
  ];

  const options: ChatOptions = {
    temperature: 0.1,
    maxTokens: 3000,
    systemPrompt: 'You are a document data extraction specialist. Extract structured data from documents with high precision. Always respond with valid JSON only, no markdown formatting.',
  };

  const response = await provider.chatWithFallback(messages, options);

  try {
    const cleaned = response.content.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const fields: ExtractedField[] = (parsed.fields || []).map(
      (f: { name: string; value: string; confidence?: number }) => ({
        name: f.name,
        value: String(f.value),
        confidence: typeof f.confidence === 'number' ? f.confidence : 0.8,
      })
    );

    return {
      documentType,
      fields,
      rawText: text,
      metadata: {
        language: parsed.language || 'en',
        pageCount: parsed.pageEstimate || 1,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch {
    // Return empty extraction on parse failure
    return {
      documentType,
      fields: [],
      rawText: text,
      metadata: {
        language: 'en',
        pageCount: 1,
        extractedAt: new Date().toISOString(),
      },
    };
  }
}

// ─── Document Summarization ────────────────────────────────────────────────

export async function summarizeDocument(
  text: string,
  registry?: ProviderRegistry,
): Promise<DocumentSummary> {
  const provider = registry || ProviderRegistry.getInstance();

  const messages: Message[] = [
    {
      role: 'user',
      content: `Analyze and summarize the following document.

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{
  "title": "<a concise title for this document>",
  "summary": "<a 2-3 sentence summary of the document>",
  "keyPoints": ["<key point 1>", "<key point 2>", ...],
  "entities": [{"type": "<person|organization|date|amount|location>", "value": "<entity value>"}],
  "actionItems": ["<any action items or follow-ups identified>"]
}

Document text:
---
${text.slice(0, 12000)}
---`,
    },
  ];

  const options: ChatOptions = {
    temperature: 0.3,
    maxTokens: 2000,
    systemPrompt: 'You are a document analysis expert. Provide clear, accurate summaries of business documents. Always respond with valid JSON only, no markdown formatting.',
  };

  const response = await provider.chatWithFallback(messages, options);

  try {
    const cleaned = response.content.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || 'Untitled Document',
      summary: parsed.summary || 'Summary unavailable.',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  } catch {
    return {
      title: 'Document',
      summary: response.content.slice(0, 500),
      keyPoints: [],
      entities: [],
      actionItems: [],
    };
  }
}

// ─── Contract Analysis ─────────────────────────────────────────────────────

export async function analyzeContract(
  text: string,
  registry?: ProviderRegistry,
): Promise<ContractAnalysis> {
  const provider = registry || ProviderRegistry.getInstance();

  const messages: Message[] = [
    {
      role: 'user',
      content: `Perform a detailed legal analysis of the following contract. Extract all key terms, obligations, dates, and identify potential risks.

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{
  "parties": [
    {"role": "<buyer|seller|licensor|licensee|employer|employee|party_a|party_b>", "name": "<full legal name>", "address": "<address if mentioned>"}
  ],
  "effectiveDate": "<YYYY-MM-DD or null>",
  "expirationDate": "<YYYY-MM-DD or null>",
  "autoRenewal": <true|false>,
  "terminationClause": "<summary of termination terms or null>",
  "paymentTerms": "<payment terms description or null>",
  "totalValue": "<contract value or null>",
  "obligations": [
    {"party": "<party name>", "obligation": "<description of obligation>"}
  ],
  "risks": [
    {"severity": "<low|medium|high>", "description": "<risk description>", "clause": "<relevant clause reference>"}
  ],
  "keyDates": [
    {"date": "<YYYY-MM-DD or description>", "description": "<what happens on this date>"}
  ],
  "governingLaw": "<jurisdiction or null>",
  "confidentialityClause": <true|false>,
  "indemnificationClause": <true|false>,
  "limitationOfLiability": "<description or null>"
}

Contract text:
---
${text.slice(0, 15000)}
---`,
    },
  ];

  const options: ChatOptions = {
    temperature: 0.1,
    maxTokens: 4000,
    systemPrompt: 'You are a contract analysis specialist with expertise in commercial law. Analyze contracts thoroughly, identifying all key terms, obligations, and risks. Be precise about dates and financial terms. Always respond with valid JSON only, no markdown formatting.',
  };

  const response = await provider.chatWithFallback(messages, options);

  try {
    const cleaned = response.content.replace(/```json?\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      effectiveDate: parsed.effectiveDate || null,
      expirationDate: parsed.expirationDate || null,
      autoRenewal: typeof parsed.autoRenewal === 'boolean' ? parsed.autoRenewal : false,
      terminationClause: parsed.terminationClause || null,
      paymentTerms: parsed.paymentTerms || null,
      totalValue: parsed.totalValue || null,
      obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      keyDates: Array.isArray(parsed.keyDates) ? parsed.keyDates : [],
      governingLaw: parsed.governingLaw || null,
      confidentialityClause: typeof parsed.confidentialityClause === 'boolean' ? parsed.confidentialityClause : false,
      indemnificationClause: typeof parsed.indemnificationClause === 'boolean' ? parsed.indemnificationClause : false,
      limitationOfLiability: parsed.limitationOfLiability || null,
    };
  } catch {
    return {
      parties: [],
      effectiveDate: null,
      expirationDate: null,
      autoRenewal: false,
      terminationClause: null,
      paymentTerms: null,
      totalValue: null,
      obligations: [],
      risks: [{ severity: 'medium', description: 'Contract analysis could not be fully parsed. Manual review recommended.' }],
      keyDates: [],
      governingLaw: null,
      confidentialityClause: false,
      indemnificationClause: false,
      limitationOfLiability: null,
    };
  }
}

// ─── Convenience: full document processing pipeline ────────────────────────

export async function processDocument(
  text: string,
  registry?: ProviderRegistry,
): Promise<{
  classification: DocumentClassification;
  extraction: DocumentExtraction;
  summary: DocumentSummary;
  contractAnalysis?: ContractAnalysis;
}> {
  const reg = registry || ProviderRegistry.getInstance();

  // Step 1: Classify
  const classification = await classifyDocument(text, reg);

  // Step 2: Extract fields based on classification
  const extraction = await extractFields(text, classification.type, reg);

  // Step 3: Summarize
  const summary = await summarizeDocument(text, reg);

  // Step 4: Contract analysis if applicable
  let contractAnalysis: ContractAnalysis | undefined;
  if (classification.type === 'contract') {
    contractAnalysis = await analyzeContract(text, reg);
  }

  return { classification, extraction, summary, contractAnalysis };
}
