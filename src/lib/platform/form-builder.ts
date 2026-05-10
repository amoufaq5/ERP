import { z } from 'zod';

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'currency' | 'percentage'
  | 'email' | 'phone' | 'url'
  | 'date' | 'datetime' | 'time'
  | 'select' | 'multi-select' | 'radio' | 'checkbox'
  | 'file' | 'image'
  | 'reference' | 'formula'
  | 'rich-text' | 'json' | 'color';

export type LayoutType = 'single' | 'two-column' | 'three-column' | 'tabs' | 'wizard' | 'accordion';

export interface FormDefinition {
  id: string;
  tenantId: string;
  entityType: string;
  name: string;
  description?: string;
  layout: LayoutType;
  sections: FormSection[];
  validation: ValidationRule[];
  conditionalLogic: ConditionalRule[];
  permissions?: FormPermissions;
  hooks?: FormHooks;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  columns?: number;
  fields: FormFieldDef[];
  condition?: VisibilityCondition;
}

export interface FormFieldDef {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  defaultValue?: unknown;
  options?: SelectOption[];
  referenceConfig?: ReferenceConfig;
  formulaConfig?: FormulaConfig;
  fileConfig?: FileConfig;
  validation?: FieldValidation;
  width?: 'full' | 'half' | 'third' | 'quarter';
  condition?: VisibilityCondition;
  dependsOn?: string[];
}

export interface SelectOption {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  disabled?: boolean;
}

export interface ReferenceConfig {
  entity: string;
  displayField: string;
  valueField: string;
  searchFields: string[];
  filters?: Record<string, unknown>;
  allowCreate?: boolean;
}

export interface FormulaConfig {
  expression: string;
  dependencies: string[];
  outputType: 'number' | 'string' | 'boolean' | 'date';
}

export interface FileConfig {
  maxSize: number;
  allowedTypes: string[];
  multiple?: boolean;
  maxFiles?: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: string;
}

export interface ValidationRule {
  id: string;
  type: 'field' | 'cross-field' | 'async';
  fields: string[];
  condition: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConditionalRule {
  id: string;
  type: 'visibility' | 'requirement' | 'value' | 'options';
  targetField: string;
  condition: VisibilityCondition;
  action: ConditionalAction;
}

export interface VisibilityCondition {
  logic: 'and' | 'or';
  rules: ConditionRule[];
}

export interface ConditionRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'empty' | 'not_empty' | 'contains';
  value: unknown;
}

export interface ConditionalAction {
  type: 'show' | 'hide' | 'require' | 'unrequire' | 'set_value' | 'set_options' | 'enable' | 'disable';
  value?: unknown;
}

export interface FormPermissions {
  canView: string[];
  canEdit: string[];
  canCreate: string[];
  fieldPermissions?: Record<string, { view: string[]; edit: string[] }>;
}

export interface FormHooks {
  onLoad?: string;
  beforeSubmit?: string;
  afterSubmit?: string;
  onChange?: Record<string, string>;
}

export class FormBuilder {
  private definitions: Map<string, FormDefinition> = new Map();

  createForm(def: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt' | 'version'>): FormDefinition {
    const form: FormDefinition = {
      ...def,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
    this.definitions.set(form.id, form);
    return form;
  }

  updateForm(id: string, updates: Partial<Omit<FormDefinition, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>): FormDefinition {
    const existing = this.definitions.get(id);
    if (!existing) throw new Error(`Form ${id} not found`);
    const updated: FormDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
      version: existing.version + 1,
    };
    this.definitions.set(id, updated);
    return updated;
  }

  deleteForm(id: string): void {
    this.definitions.delete(id);
  }

  getForm(id: string): FormDefinition | undefined {
    return this.definitions.get(id);
  }

  getFormsByEntity(tenantId: string, entityType: string): FormDefinition[] {
    return Array.from(this.definitions.values())
      .filter(f => f.tenantId === tenantId && f.entityType === entityType);
  }

  generateZodSchema(form: FormDefinition): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const section of form.sections) {
      for (const field of section.fields) {
        let schema = this.fieldToZod(field);
        if (!field.required) {
          schema = schema.optional() as z.ZodTypeAny;
        }
        shape[field.name] = schema;
      }
    }

    return z.object(shape);
  }

  evaluateCondition(condition: VisibilityCondition, formData: Record<string, unknown>): boolean {
    const results = condition.rules.map(rule => this.evaluateRule(rule, formData));
    return condition.logic === 'and'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  getVisibleFields(form: FormDefinition, formData: Record<string, unknown>): FormFieldDef[] {
    const visible: FormFieldDef[] = [];

    for (const section of form.sections) {
      if (section.condition && !this.evaluateCondition(section.condition, formData)) {
        continue;
      }
      for (const field of section.fields) {
        if (field.hidden) continue;
        if (field.condition && !this.evaluateCondition(field.condition, formData)) continue;
        visible.push(field);
      }
    }

    return visible;
  }

  getRequiredFields(form: FormDefinition, formData: Record<string, unknown>): string[] {
    const required: string[] = [];

    for (const section of form.sections) {
      if (section.condition && !this.evaluateCondition(section.condition, formData)) continue;
      for (const field of section.fields) {
        if (field.required) {
          required.push(field.name);
        }
      }
    }

    for (const rule of form.conditionalLogic) {
      if (rule.type === 'requirement' && rule.action.type === 'require') {
        if (this.evaluateCondition(rule.condition, formData)) {
          required.push(rule.targetField);
        }
      }
    }

    return [...new Set(required)];
  }

  evaluateFormula(formula: FormulaConfig, formData: Record<string, unknown>): unknown {
    const expr = formula.expression;
    const context: Record<string, unknown> = {};
    for (const dep of formula.dependencies) {
      context[dep] = formData[dep];
    }

    try {
      const fn = new Function(...Object.keys(context), `return ${expr}`);
      return fn(...Object.values(context));
    } catch {
      return null;
    }
  }

  validateForm(form: FormDefinition, data: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const visibleFields = this.getVisibleFields(form, data);
    const requiredFields = this.getRequiredFields(form, data);

    for (const fieldName of requiredFields) {
      const value = data[fieldName];
      if (value === undefined || value === null || value === '') {
        const field = visibleFields.find(f => f.name === fieldName);
        errors.push({
          field: fieldName,
          message: `${field?.label || fieldName} is required`,
          type: 'required',
        });
      }
    }

    for (const field of visibleFields) {
      const value = data[field.name];
      if (value === undefined || value === null) continue;

      const fieldErrors = this.validateField(field, value);
      errors.push(...fieldErrors);
    }

    for (const rule of form.validation) {
      if (!this.evaluateCrossFieldRule(rule, data)) {
        const target = rule.severity === 'error' ? errors : warnings;
        target.push({
          field: rule.fields.join(', '),
          message: rule.message,
          type: 'cross-field',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(field: FormFieldDef, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const v = field.validation;
    if (!v) return errors;

    if (typeof value === 'string') {
      if (v.minLength && value.length < v.minLength) {
        errors.push({ field: field.name, message: `Minimum ${v.minLength} characters`, type: 'minLength' });
      }
      if (v.maxLength && value.length > v.maxLength) {
        errors.push({ field: field.name, message: `Maximum ${v.maxLength} characters`, type: 'maxLength' });
      }
      if (v.pattern && !new RegExp(v.pattern).test(value)) {
        errors.push({ field: field.name, message: v.patternMessage || 'Invalid format', type: 'pattern' });
      }
    }

    if (typeof value === 'number') {
      if (v.min !== undefined && value < v.min) {
        errors.push({ field: field.name, message: `Minimum value is ${v.min}`, type: 'min' });
      }
      if (v.max !== undefined && value > v.max) {
        errors.push({ field: field.name, message: `Maximum value is ${v.max}`, type: 'max' });
      }
    }

    return errors;
  }

  private evaluateRule(rule: ConditionRule, data: Record<string, unknown>): boolean {
    const fieldValue = data[rule.field];
    switch (rule.operator) {
      case 'eq': return fieldValue === rule.value;
      case 'neq': return fieldValue !== rule.value;
      case 'gt': return Number(fieldValue) > Number(rule.value);
      case 'lt': return Number(fieldValue) < Number(rule.value);
      case 'gte': return Number(fieldValue) >= Number(rule.value);
      case 'lte': return Number(fieldValue) <= Number(rule.value);
      case 'in': return Array.isArray(rule.value) && rule.value.includes(fieldValue);
      case 'nin': return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
      case 'empty': return fieldValue === undefined || fieldValue === null || fieldValue === '';
      case 'not_empty': return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(String(rule.value));
      default: return false;
    }
  }

  private evaluateCrossFieldRule(rule: ValidationRule, data: Record<string, unknown>): boolean {
    try {
      const fn = new Function('data', `with(data) { return ${rule.condition}; }`);
      return fn(data);
    } catch {
      return true;
    }
  }

  private fieldToZod(field: FormFieldDef): z.ZodTypeAny {
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'rich-text':
      case 'color': {
        let s = z.string();
        if (field.validation?.minLength) s = s.min(field.validation.minLength);
        if (field.validation?.maxLength) s = s.max(field.validation.maxLength);
        if (field.validation?.pattern) s = s.regex(new RegExp(field.validation.pattern));
        return s;
      }
      case 'email': return z.string().email();
      case 'phone': return z.string().min(7).max(20);
      case 'url': return z.string().url();
      case 'number':
      case 'currency':
      case 'percentage': {
        let n = z.number();
        if (field.validation?.min !== undefined) n = n.min(field.validation.min);
        if (field.validation?.max !== undefined) n = n.max(field.validation.max);
        return n;
      }
      case 'date':
      case 'datetime':
      case 'time': return z.string();
      case 'select':
      case 'radio': {
        if (field.options && field.options.length > 0) {
          const values = field.options.map(o => o.value) as [string, ...string[]];
          return z.enum(values);
        }
        return z.string();
      }
      case 'multi-select': return z.array(z.string());
      case 'checkbox': return z.boolean();
      case 'file':
      case 'image': return z.string();
      case 'reference': return z.string();
      case 'formula': return z.unknown();
      case 'json': return z.unknown();
      default: return z.unknown();
    }
  }

  private generateId(): string {
    return `frm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
}

export const formBuilder = new FormBuilder();
