import { IndustryTemplate } from '../types';
import { pharmaceuticalTemplate } from './pharmaceutical';
import { manufacturingTemplate } from './manufacturing';
import { retailTemplate } from './retail';
import { hospitalityTemplate } from './hospitality';
import { professionalServicesTemplate } from './professional-services';

const industryTemplates: Map<string, IndustryTemplate> = new Map();

export function registerIndustryTemplate(template: IndustryTemplate): void {
  industryTemplates.set(template.id, template);
}

export function getIndustryTemplate(id: string): IndustryTemplate | undefined {
  return industryTemplates.get(id);
}

export function getAllIndustryTemplates(): IndustryTemplate[] {
  return Array.from(industryTemplates.values());
}

// Register built-in templates
registerIndustryTemplate(pharmaceuticalTemplate);
registerIndustryTemplate(manufacturingTemplate);
registerIndustryTemplate(retailTemplate);
registerIndustryTemplate(hospitalityTemplate);
registerIndustryTemplate(professionalServicesTemplate);

export { pharmaceuticalTemplate } from './pharmaceutical';
export { manufacturingTemplate } from './manufacturing';
export { retailTemplate } from './retail';
export { hospitalityTemplate } from './hospitality';
export { professionalServicesTemplate } from './professional-services';
