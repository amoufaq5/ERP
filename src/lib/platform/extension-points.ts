import { ExtensionContext, ExtensionHandler, ExtensionResult } from './types';

class ExtensionPointRegistry {
  private handlers: Map<string, ExtensionHandler[]> = new Map();
  private static instance: ExtensionPointRegistry;

  static getInstance(): ExtensionPointRegistry {
    if (!ExtensionPointRegistry.instance) {
      ExtensionPointRegistry.instance = new ExtensionPointRegistry();
    }
    return ExtensionPointRegistry.instance;
  }

  registerHandler(handler: ExtensionHandler): void {
    const existing = this.handlers.get(handler.extensionPointId) || [];
    existing.push(handler);
    existing.sort((a, b) => a.priority - b.priority);
    this.handlers.set(handler.extensionPointId, existing);
  }

  removeHandler(extensionPointId: string, handlerId: string): void {
    const existing = this.handlers.get(extensionPointId) || [];
    this.handlers.set(
      extensionPointId,
      existing.filter(h => h.id !== handlerId)
    );
  }

  getHandlers(extensionPointId: string, tenantId?: string): ExtensionHandler[] {
    const all = this.handlers.get(extensionPointId) || [];
    return all.filter(h => !h.tenantId || h.tenantId === tenantId);
  }

  async executeExtensions(
    extensionPointId: string,
    context: ExtensionContext
  ): Promise<ExtensionResult> {
    const handlers = this.getHandlers(extensionPointId, context.tenantId);

    let currentData = context.data;
    const allSideEffects: { type: string; payload: unknown }[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler.handler({
          ...context,
          data: currentData,
        });

        if (result.abort) {
          return { success: false, abort: true, reason: result.reason };
        }

        if (result.transformedData) {
          currentData = result.transformedData;
        }

        if (result.sideEffects) {
          allSideEffects.push(...result.sideEffects);
        }
      } catch (error) {
        console.error(`Extension handler ${handler.id} failed:`, error);
        return {
          success: false,
          abort: true,
          reason: `Extension handler ${handler.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    return {
      success: true,
      transformedData: currentData,
      sideEffects: allSideEffects,
    };
  }
}

export const extensionRegistry = ExtensionPointRegistry.getInstance();
export { ExtensionPointRegistry };
