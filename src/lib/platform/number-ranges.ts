import { NumberRangeConfig } from './types';

class NumberRangeService {
  private ranges: Map<string, NumberRangeConfig> = new Map();
  private static instance: NumberRangeService;

  static getInstance(): NumberRangeService {
    if (!NumberRangeService.instance) {
      NumberRangeService.instance = new NumberRangeService();
    }
    return NumberRangeService.instance;
  }

  register(config: NumberRangeConfig): void {
    const key = this.getKey(config);
    this.ranges.set(key, config);
  }

  private getKey(config: NumberRangeConfig): string {
    return `${config.tenantId}:${config.objectType}:${config.subType || 'default'}:${config.orgUnitId || 'global'}`;
  }

  async getNextNumber(
    tenantId: string,
    objectType: string,
    options?: { subType?: string; orgUnitId?: string; fiscalYear?: number }
  ): Promise<string> {
    const key = `${tenantId}:${objectType}:${options?.subType || 'default'}:${options?.orgUnitId || 'global'}`;
    const config = this.ranges.get(key);

    if (!config) {
      throw new Error(`No number range configured for ${objectType} in tenant ${tenantId}`);
    }

    config.currentNumber += 1;

    let prefix = config.prefix;
    if (config.fiscalYearDependent && options?.fiscalYear) {
      prefix = `${prefix}${options.fiscalYear}-`;
    }

    const numberStr = config.currentNumber.toString().padStart(config.numberLength, '0');
    return `${prefix}${numberStr}`;
  }

  getConfig(tenantId: string, objectType: string): NumberRangeConfig | undefined {
    const key = `${tenantId}:${objectType}:default:global`;
    return this.ranges.get(key);
  }

  setConfig(config: NumberRangeConfig): void {
    const key = this.getKey(config);
    this.ranges.set(key, config);
  }
}

export const numberRangeService = NumberRangeService.getInstance();
export { NumberRangeService };
