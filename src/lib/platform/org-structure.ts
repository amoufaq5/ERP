import { OrgLevelType, OrgUnitNode } from './types';

class OrgStructureService {
  private static instance: OrgStructureService;
  private structures: Map<string, OrgUnitNode[]> = new Map(); // tenantId -> root nodes

  static getInstance(): OrgStructureService {
    if (!OrgStructureService.instance) {
      OrgStructureService.instance = new OrgStructureService();
    }
    return OrgStructureService.instance;
  }

  setStructure(tenantId: string, roots: OrgUnitNode[]): void {
    this.structures.set(tenantId, roots);
  }

  getStructure(tenantId: string): OrgUnitNode[] {
    return this.structures.get(tenantId) || [];
  }

  findNode(tenantId: string, nodeId: string): OrgUnitNode | undefined {
    const roots = this.getStructure(tenantId);
    return this.findInTree(roots, nodeId);
  }

  private findInTree(nodes: OrgUnitNode[], id: string): OrgUnitNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findInTree(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  getNodesByType(tenantId: string, type: OrgLevelType): OrgUnitNode[] {
    const roots = this.getStructure(tenantId);
    const result: OrgUnitNode[] = [];
    this.collectByType(roots, type, result);
    return result;
  }

  private collectByType(nodes: OrgUnitNode[], type: OrgLevelType, result: OrgUnitNode[]): void {
    for (const node of nodes) {
      if (node.type === type) result.push(node);
      if (node.children) this.collectByType(node.children, type, result);
    }
  }

  getAncestors(tenantId: string, nodeId: string): OrgUnitNode[] {
    const roots = this.getStructure(tenantId);
    const path: OrgUnitNode[] = [];
    this.findPath(roots, nodeId, path);
    return path;
  }

  private findPath(nodes: OrgUnitNode[], targetId: string, path: OrgUnitNode[]): boolean {
    for (const node of nodes) {
      path.push(node);
      if (node.id === targetId) return true;
      if (node.children && this.findPath(node.children, targetId, path)) return true;
      path.pop();
    }
    return false;
  }

  getDescendants(tenantId: string, nodeId: string): OrgUnitNode[] {
    const node = this.findNode(tenantId, nodeId);
    if (!node) return [];
    const result: OrgUnitNode[] = [];
    this.collectDescendants(node.children || [], result);
    return result;
  }

  private collectDescendants(nodes: OrgUnitNode[], result: OrgUnitNode[]): void {
    for (const node of nodes) {
      result.push(node);
      if (node.children) this.collectDescendants(node.children, result);
    }
  }

  getAccessibleOrgUnits(tenantId: string, userOrgUnitIds: string[]): string[] {
    const accessible = new Set<string>();
    for (const orgUnitId of userOrgUnitIds) {
      accessible.add(orgUnitId);
      const descendants = this.getDescendants(tenantId, orgUnitId);
      for (const d of descendants) {
        accessible.add(d.id);
      }
    }
    return Array.from(accessible);
  }

  validateHierarchy(nodes: OrgUnitNode[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const ids = new Set<string>();

    const validate = (nodeList: OrgUnitNode[], parentType?: OrgLevelType) => {
      for (const node of nodeList) {
        if (ids.has(node.id)) {
          errors.push(`Duplicate org unit ID: ${node.id}`);
        }
        ids.add(node.id);

        if (!node.code || !node.name) {
          errors.push(`Org unit ${node.id} missing code or name`);
        }

        if (node.children) {
          validate(node.children, node.type);
        }
      }
    };

    validate(nodes);
    return { valid: errors.length === 0, errors };
  }
}

export const orgStructureService = OrgStructureService.getInstance();
export { OrgStructureService };
