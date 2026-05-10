import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../module-registry';
import type { ModuleDefinition } from '../types';

function createMockModule(overrides?: Partial<ModuleDefinition>): ModuleDefinition {
  const id = overrides?.id ?? `module-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    name: overrides?.name ?? `Module ${id}`,
    description: 'A test module',
    version: '1.0.0',
    category: 'core',
    dependencies: [],
    icon: 'box',
    orgLevels: [],
    extensionPoints: [],
    masterDataTypes: [],
    documentTypes: [],
    configSchema: {},
    defaultConfig: {},
    navItems: [],
    widgets: [],
    reports: [],
    workflowTemplates: [],
    ...overrides,
  };
}

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    // Create a fresh instance (not the singleton) to avoid cross-test contamination
    registry = new (ModuleRegistry as unknown as new () => ModuleRegistry)();
  });

  // ===========================================================================
  // Register and Retrieve
  // ===========================================================================

  describe('register and retrieve', () => {
    it('registers a module and retrieves it by ID', () => {
      const mod = createMockModule({ id: 'core-finance' });
      registry.register(mod);

      const retrieved = registry.get('core-finance');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('core-finance');
      expect(retrieved?.name).toBe(mod.name);
    });

    it('returns undefined for unregistered module', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('throws when registering a duplicate module ID', () => {
      const mod = createMockModule({ id: 'dup-mod' });
      registry.register(mod);
      expect(() => registry.register(mod)).toThrow('already registered');
    });

    it('getAll returns all registered modules', () => {
      registry.register(createMockModule({ id: 'mod-a' }));
      registry.register(createMockModule({ id: 'mod-b' }));
      registry.register(createMockModule({ id: 'mod-c' }));

      const all = registry.getAll();
      expect(all).toHaveLength(3);
      const ids = all.map((m) => m.id);
      expect(ids).toContain('mod-a');
      expect(ids).toContain('mod-b');
      expect(ids).toContain('mod-c');
    });

    it('getByCategory filters modules by category', () => {
      registry.register(createMockModule({ id: 'core-1', category: 'core' }));
      registry.register(createMockModule({ id: 'ind-1', category: 'industry' }));
      registry.register(createMockModule({ id: 'ext-1', category: 'extension' }));

      const core = registry.getByCategory('core');
      expect(core).toHaveLength(1);
      expect(core[0].id).toBe('core-1');

      const industry = registry.getByCategory('industry');
      expect(industry).toHaveLength(1);
      expect(industry[0].id).toBe('ind-1');
    });
  });

  // ===========================================================================
  // Dependency Validation
  // ===========================================================================

  describe('dependency validation', () => {
    it('warns when registering a module with unmet dependencies (does not throw)', () => {
      const mod = createMockModule({
        id: 'dependent',
        dependencies: ['missing-dep'],
      });

      // Should not throw, just warn
      expect(() => registry.register(mod)).not.toThrow();
    });

    it('validateActivation returns valid when all dependencies are met', () => {
      registry.register(createMockModule({ id: 'base', dependencies: [] }));
      registry.register(createMockModule({ id: 'child', dependencies: ['base'] }));

      const result = registry.validateActivation(['base', 'child']);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('validateActivation returns missing when dependencies are not activated', () => {
      registry.register(createMockModule({ id: 'base', dependencies: [] }));
      registry.register(createMockModule({ id: 'child', dependencies: ['base'] }));

      const result = registry.validateActivation(['child']); // 'base' not activated
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.missing[0]).toContain('child requires base');
    });

    it('getDependencyTree returns correct order', () => {
      registry.register(createMockModule({ id: 'a', dependencies: [] }));
      registry.register(createMockModule({ id: 'b', dependencies: ['a'] }));
      registry.register(createMockModule({ id: 'c', dependencies: ['b'] }));

      const tree = registry.getDependencyTree('c');
      // Should be [a, b, c] - dependencies before dependents
      expect(tree).toEqual(['a', 'b', 'c']);
    });
  });

  // ===========================================================================
  // Module Activation Filtering
  // ===========================================================================

  describe('module activation filtering', () => {
    it('getActivatedModules returns only activated modules', () => {
      registry.register(createMockModule({ id: 'mod-1' }));
      registry.register(createMockModule({ id: 'mod-2' }));
      registry.register(createMockModule({ id: 'mod-3' }));

      const activated = registry.getActivatedModules(['mod-1', 'mod-3']);
      expect(activated).toHaveLength(2);
      const ids = activated.map((m) => m.id);
      expect(ids).toContain('mod-1');
      expect(ids).toContain('mod-3');
      expect(ids).not.toContain('mod-2');
    });

    it('getActivatedModules ignores IDs that are not registered', () => {
      registry.register(createMockModule({ id: 'mod-1' }));

      const activated = registry.getActivatedModules(['mod-1', 'nonexistent']);
      expect(activated).toHaveLength(1);
      expect(activated[0].id).toBe('mod-1');
    });

    it('getNavItems returns sorted nav items from activated modules', () => {
      registry.register(
        createMockModule({
          id: 'mod-a',
          navItems: [
            { id: 'nav-2', label: 'Second', icon: 'x', path: '/b', order: 20 },
          ],
        }),
      );
      registry.register(
        createMockModule({
          id: 'mod-b',
          navItems: [
            { id: 'nav-1', label: 'First', icon: 'x', path: '/a', order: 10 },
          ],
        }),
      );

      const navItems = registry.getNavItems(['mod-a', 'mod-b']);
      expect(navItems).toHaveLength(2);
      expect(navItems[0].id).toBe('nav-1'); // order 10 first
      expect(navItems[1].id).toBe('nav-2'); // order 20 second
    });

    it('getWidgets returns widgets from activated modules only', () => {
      registry.register(
        createMockModule({
          id: 'mod-a',
          widgets: [
            { id: 'widget-1', name: 'W1', description: 'w', component: 'C1', defaultSize: { w: 1, h: 1 } },
          ],
        }),
      );
      registry.register(
        createMockModule({
          id: 'mod-b',
          widgets: [
            { id: 'widget-2', name: 'W2', description: 'w', component: 'C2', defaultSize: { w: 1, h: 1 } },
          ],
        }),
      );

      const widgets = registry.getWidgets(['mod-a']);
      expect(widgets).toHaveLength(1);
      expect(widgets[0].id).toBe('widget-1');
    });
  });
});
