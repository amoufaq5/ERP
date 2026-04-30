"use client";

import type { Workflow, WorkflowStep } from "./workflow-engine";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: Workflow["trigger"];
  triggerEntity: string;
  steps: WorkflowStep[];
  category: string;
}

// ─── Helper to generate positioned steps in a vertical flow ───

function makeSteps(
  defs: Array<{
    type: WorkflowStep["type"];
    name: string;
    config: Record<string, unknown>;
  }>
): WorkflowStep[] {
  const steps: WorkflowStep[] = defs.map((def, idx) => ({
    id: `tpl-step-${idx + 1}`,
    type: def.type,
    name: def.name,
    config: def.config,
    nextSteps: idx < defs.length - 1 ? [`tpl-step-${idx + 2}`] : [],
    position: { x: 300, y: 80 + idx * 140 },
  }));
  return steps;
}

// ─── Invoice Approval Template ───

const invoiceApprovalTemplate: WorkflowTemplate = {
  id: "tpl-invoice-approval",
  name: "Invoice Approval",
  description:
    "Route invoices for approval based on amount thresholds. Invoices over EGP 5,000 require manager approval, over EGP 50,000 require director approval.",
  trigger: "on_create",
  triggerEntity: "invoice",
  category: "Finance",
  steps: makeSteps([
    {
      type: "condition",
      name: "Check Amount > 50,000",
      config: {
        field: "amount",
        operator: "greater_than",
        value: "50000",
        description: "Route to director if amount exceeds EGP 50,000",
      },
    },
    {
      type: "approval",
      name: "Director Approval",
      config: {
        approver: "Finance Director",
        timeout: "72",
        timeoutUnit: "hours",
        escalateTo: "CEO",
        description: "Director must approve invoices over EGP 50,000",
      },
    },
    {
      type: "condition",
      name: "Check Amount > 5,000",
      config: {
        field: "amount",
        operator: "greater_than",
        value: "5000",
        description: "Route to manager if amount exceeds EGP 5,000",
      },
    },
    {
      type: "approval",
      name: "Manager Approval",
      config: {
        approver: "Line Manager",
        timeout: "48",
        timeoutUnit: "hours",
        description: "Manager must approve invoices over EGP 5,000",
      },
    },
    {
      type: "action",
      name: "Mark as Approved",
      config: {
        actionType: "update_field",
        target: "status",
        value: "Approved",
        description: "Update invoice status to Approved",
      },
    },
    {
      type: "notification",
      name: "Notify Accounts Payable",
      config: {
        channel: "email",
        recipient: "accounts_payable",
        template:
          "Invoice {{invoice_number}} for EGP {{amount}} has been approved and is ready for payment.",
      },
    },
  ]),
};

// ─── Leave Request Template ───

const leaveRequestTemplate: WorkflowTemplate = {
  id: "tpl-leave-request",
  name: "Leave Request",
  description:
    "Automated leave approval workflow: manager approval, HR notification, and calendar update.",
  trigger: "on_create",
  triggerEntity: "leave_request",
  category: "HR",
  steps: makeSteps([
    {
      type: "approval",
      name: "Manager Approval",
      config: {
        approver: "Department Head",
        timeout: "48",
        timeoutUnit: "hours",
        description: "Direct manager must approve the leave request",
      },
    },
    {
      type: "notification",
      name: "HR Notification",
      config: {
        channel: "email",
        recipient: "hr_department",
        template:
          "Leave request from {{employee_name}} for {{leave_type}} from {{start_date}} to {{end_date}} has been approved by {{approver_name}}.",
      },
    },
    {
      type: "action",
      name: "Update Calendar",
      config: {
        actionType: "update_field",
        target: "calendar",
        value: "blocked",
        description: "Block the employee's calendar for the leave dates",
      },
    },
    {
      type: "action",
      name: "Update Leave Balance",
      config: {
        actionType: "update_field",
        target: "leave_balance",
        value: "deduct",
        description: "Deduct leave days from employee balance",
      },
    },
    {
      type: "notification",
      name: "Confirm to Employee",
      config: {
        channel: "email",
        recipient: "requester",
        template:
          "Your leave request for {{leave_type}} from {{start_date}} to {{end_date}} has been approved. Your remaining balance is {{remaining_balance}} days.",
      },
    },
  ]),
};

// ─── Purchase Order Template ───

const purchaseOrderTemplate: WorkflowTemplate = {
  id: "tpl-purchase-order",
  name: "Purchase Order",
  description:
    "Multi-level purchase order approval: requester submits, department head reviews, finance approves, procurement executes.",
  trigger: "on_create",
  triggerEntity: "purchase_order",
  category: "Procurement",
  steps: makeSteps([
    {
      type: "approval",
      name: "Department Head Review",
      config: {
        approver: "Department Head",
        timeout: "48",
        timeoutUnit: "hours",
        description: "Department head verifies business need and budget",
      },
    },
    {
      type: "condition",
      name: "Check Budget Availability",
      config: {
        field: "budget_remaining",
        operator: "greater_than",
        value: "0",
        description: "Verify department has sufficient budget",
      },
    },
    {
      type: "approval",
      name: "Finance Approval",
      config: {
        approver: "Finance Director",
        timeout: "72",
        timeoutUnit: "hours",
        description: "Finance team validates budget allocation and pricing",
      },
    },
    {
      type: "action",
      name: "Create PO in System",
      config: {
        actionType: "create_record",
        target: "purchase_order",
        value: "approved",
        description: "Generate official PO number and document",
      },
    },
    {
      type: "notification",
      name: "Notify Procurement",
      config: {
        channel: "email",
        recipient: "procurement_team",
        template:
          "PO {{po_number}} for {{vendor_name}} (EGP {{amount}}) has been approved. Please proceed with vendor communication and order placement.",
      },
    },
    {
      type: "notification",
      name: "Notify Requester",
      config: {
        channel: "in_app",
        recipient: "requester",
        template:
          "Your purchase order request has been fully approved. PO Number: {{po_number}}. Expected delivery: {{delivery_date}}.",
      },
    },
  ]),
};

// ─── Employee Onboarding Template ───

const employeeOnboardingTemplate: WorkflowTemplate = {
  id: "tpl-employee-onboarding",
  name: "New Employee Onboarding",
  description:
    "Complete onboarding workflow: HR creates profile, IT provisions accounts, manager assigns initial tasks.",
  trigger: "on_create",
  triggerEntity: "employee",
  category: "HR",
  steps: makeSteps([
    {
      type: "action",
      name: "Create Employee Profile",
      config: {
        actionType: "create_record",
        target: "employee_profile",
        value: "active",
        description:
          "HR creates employee record with personal details, role, and department",
      },
    },
    {
      type: "notification",
      name: "Notify IT Department",
      config: {
        channel: "email",
        recipient: "it_department",
        template:
          "New employee {{employee_name}} joining {{department}} on {{start_date}}. Please provision: email, Active Directory, VPN, and system access.",
      },
    },
    {
      type: "action",
      name: "Provision IT Accounts",
      config: {
        actionType: "create_record",
        target: "it_accounts",
        value: "provision",
        description:
          "Create email, system login, VPN, and required software access",
      },
    },
    {
      type: "delay",
      name: "Wait for IT Setup",
      config: {
        duration: "24",
        unit: "hours",
        description: "Allow 24 hours for IT to complete provisioning",
      },
    },
    {
      type: "action",
      name: "Assign Onboarding Tasks",
      config: {
        actionType: "create_record",
        target: "tasks",
        value: "onboarding_checklist",
        description:
          "Manager assigns initial tasks: orientation, training modules, team introductions",
      },
    },
    {
      type: "notification",
      name: "Welcome Email",
      config: {
        channel: "email",
        recipient: "new_employee",
        template:
          "Welcome to the team, {{employee_name}}! Your accounts have been set up. Please check your email for login credentials and your onboarding task list.",
      },
    },
    {
      type: "notification",
      name: "Notify Manager",
      config: {
        channel: "in_app",
        recipient: "line_manager",
        template:
          "{{employee_name}} has been fully onboarded and is ready to start. All IT accounts and onboarding tasks have been set up.",
      },
    },
  ]),
};

// ─── Sales Order Processing Template ───

const salesOrderTemplate: WorkflowTemplate = {
  id: "tpl-sales-order",
  name: "Sales Order Processing",
  description:
    "End-to-end sales order flow: submission, credit check, inventory verification, approval, and fulfillment.",
  trigger: "on_create",
  triggerEntity: "sales_order",
  category: "Sales",
  steps: makeSteps([
    {
      type: "action",
      name: "Validate Order Data",
      config: {
        actionType: "update_field",
        target: "status",
        value: "validating",
        description: "Verify all required fields and line items are complete",
      },
    },
    {
      type: "condition",
      name: "Credit Check",
      config: {
        field: "customer_credit_status",
        operator: "equals",
        value: "approved",
        description:
          "Verify customer has sufficient credit limit for this order",
      },
    },
    {
      type: "condition",
      name: "Inventory Check",
      config: {
        field: "all_items_in_stock",
        operator: "equals",
        value: "true",
        description: "Verify all order items are available in inventory",
      },
    },
    {
      type: "approval",
      name: "Sales Manager Approval",
      config: {
        approver: "Sales Manager",
        timeout: "24",
        timeoutUnit: "hours",
        description: "Sales manager reviews and approves the order",
      },
    },
    {
      type: "action",
      name: "Reserve Inventory",
      config: {
        actionType: "update_field",
        target: "inventory",
        value: "reserved",
        description: "Reserve the ordered items in the warehouse",
      },
    },
    {
      type: "action",
      name: "Generate Invoice",
      config: {
        actionType: "create_record",
        target: "invoice",
        value: "from_sales_order",
        description: "Auto-generate invoice from the approved sales order",
      },
    },
    {
      type: "notification",
      name: "Notify Warehouse",
      config: {
        channel: "email",
        recipient: "warehouse_team",
        template:
          "Sales Order {{so_number}} has been approved. Please prepare for shipment: {{item_count}} items to {{customer_name}}.",
      },
    },
    {
      type: "notification",
      name: "Order Confirmation",
      config: {
        channel: "email",
        recipient: "customer",
        template:
          "Dear {{customer_name}}, your order {{so_number}} has been confirmed. Expected delivery: {{delivery_date}}. Total: EGP {{total_amount}}.",
      },
    },
  ]),
};

// ─── Export all templates ───

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  invoiceApprovalTemplate,
  leaveRequestTemplate,
  purchaseOrderTemplate,
  employeeOnboardingTemplate,
  salesOrderTemplate,
];

// ─── Helper: instantiate a template as a new workflow's steps ───

export function instantiateTemplate(template: WorkflowTemplate): {
  name: string;
  description: string;
  trigger: Workflow["trigger"];
  triggerEntity: string;
  steps: WorkflowStep[];
} {
  const now = Date.now();
  const steps = template.steps.map((step, idx) => ({
    ...step,
    id: `step-${now}-${idx}`,
    nextSteps:
      idx < template.steps.length - 1 ? [`step-${now}-${idx + 1}`] : [],
    config: { ...step.config },
    position: { ...step.position },
  }));
  return {
    name: template.name,
    description: template.description,
    trigger: template.trigger,
    triggerEntity: template.triggerEntity,
    steps,
  };
}
