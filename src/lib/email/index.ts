// ---------------------------------------------------------------------------
// Email module — barrel export
// ---------------------------------------------------------------------------

// Core service
export {
  createEmailService,
  SMTPEmailService,
  ConsoleEmailService,
  type EmailService,
  type EmailOptions,
  type EmailResult,
  type EmailAttachment,
} from "./email-service";

// Queue
export {
  enqueue,
  processQueue,
  getQueueStatus,
  type QueueStatus,
} from "./email-queue";

// Scheduled reports
export {
  generateReportEmail,
  getActiveSchedules,
  getAllSchedules,
  createSchedule,
  deleteSchedule,
  type ScheduleConfig,
  type ReportType,
  type Frequency,
} from "./scheduled-reports";

// Templates
export { wrapInLayout, actionButton, infoRow } from "./templates/base-layout";
export { approvalRequiredEmail } from "./templates/approval-required";
export { approvalResultEmail } from "./templates/approval-result";
export { slaWarningEmail } from "./templates/sla-warning";
export { reportDeliveryEmail } from "./templates/report-delivery";
export { welcomeEmail } from "./templates/welcome";
