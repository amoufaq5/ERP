import { ModuleDefinition } from './types';

class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();
  private static instance: ModuleRegistry;

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module ${module.id} is already registered`);
    }
    // Validate dependencies
    for (const dep of module.dependencies) {
      if (!this.modules.has(dep)) {
        console.warn(`Module ${module.id} depends on ${dep} which is not yet registered`);
      }
    }
    this.modules.set(module.id, module);
  }

  get(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getByCategory(category: ModuleDefinition['category']): ModuleDefinition[] {
    return this.getAll().filter(m => m.category === category);
  }

  getActivatedModules(activeModuleIds: string[]): ModuleDefinition[] {
    return activeModuleIds
      .map(id => this.modules.get(id))
      .filter((m): m is ModuleDefinition => m !== undefined);
  }

  getNavItems(activeModuleIds: string[]): ModuleDefinition['navItems'][number][] {
    return this.getActivatedModules(activeModuleIds)
      .flatMap(m => m.navItems)
      .sort((a, b) => a.order - b.order);
  }

  getWidgets(activeModuleIds: string[]): ModuleDefinition['widgets'][number][] {
    return this.getActivatedModules(activeModuleIds).flatMap(m => m.widgets);
  }

  getExtensionPoints(activeModuleIds: string[]): ModuleDefinition['extensionPoints'][number][] {
    return this.getActivatedModules(activeModuleIds).flatMap(m => m.extensionPoints);
  }

  getDependencyTree(moduleId: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const mod = this.modules.get(id);
      if (!mod) return;
      for (const dep of mod.dependencies) {
        traverse(dep);
      }
      result.push(id);
    };

    traverse(moduleId);
    return result;
  }

  validateActivation(moduleIds: string[]): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const id of moduleIds) {
      const mod = this.modules.get(id);
      if (!mod) continue;
      for (const dep of mod.dependencies) {
        if (!moduleIds.includes(dep)) {
          missing.push(`${id} requires ${dep}`);
        }
      }
    }
    return { valid: missing.length === 0, missing };
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();
export { ModuleRegistry };
