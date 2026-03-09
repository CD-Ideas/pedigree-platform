import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { JwtPayload } from '../../lib/jwt';

interface AncestorNode {
  id: string; name: string; sex: string; dob: Date | null;
  color: string | null; titles: string[]; regNumber: string | null;
  sireId: string | null; damId: string | null; profileImageUrl: string | null;
}

export interface PedigreeTreeNode {
  id: string; name: string; sex: string; dob: Date | null;
  color: string | null; titles: string[]; regNumber: string | null;
  profileImageUrl: string | null; generation: number;
  sire?: PedigreeTreeNode; dam?: PedigreeTreeNode;
}

export class PedigreeService {
  // ── Public ──────────────────────────────────────────────────────────────

  async getTree(dogId: string, generations: number) {
    const dog = await this.fetchDog(dogId);
    if (!dog) throw AppError.notFound('Dog not found');
    const map = await this.fetchAncestorMap(dogId, generations);
    const tree = this.buildTree(dog, map, generations, 0);
    return { dogId, generations, tree };
  }

  async getAncestors(dogId: string, generations: number) {
    const all = await this.fetchAllAncestors(dogId, generations);
    return all.filter(a => a.id !== dogId);
  }

  async getCoi(dogId: string) {
    return prisma.dog.findUniqueOrThrow({
      where: { id: dogId },
      select: { id: true, coi4gen: true, coi6gen: true, coi8gen: true, coi10gen: true, coiUpdatedAt: true },
    });
  }

  async hypotheticalCoi(sireId: string, damId: string, generations: number) {
    const [sireAnc, damAnc] = await Promise.all([
      this.fetchAllAncestors(sireId, generations),
      this.fetchAllAncestors(damId, generations),
    ]);
    // Pass depth-aware ancestor lists
    const sireDepths = await this.fetchAncestorsWithDepth(sireId, generations);
    const damDepths  = await this.fetchAncestorsWithDepth(damId, generations);
    const coi = this.computeWrightsCoi(sireDepths, damDepths, generations);
    return { coi4gen: this.computeWrightsCoi(sireDepths, damDepths, 4),
             coi6gen: this.computeWrightsCoi(sireDepths, damDepths, 6),
             coi8gen: this.computeWrightsCoi(sireDepths, damDepths, 8),
             coi10gen: this.computeWrightsCoi(sireDepths, damDepths, 10) };
  }

  async queueRebuild(dogId: string, _user: JwtPayload) {
    // In production: enqueue BullMQ job. For now: synchronous.
    await this.rebuildCache(dogId, 10);
    return { queued: true };
  }

  // ── Tree Builder ────────────────────────────────────────────────────────

  private buildTree(
    node: AncestorNode, map: Map<string, AncestorNode>,
    maxGen: number, gen: number,
  ): PedigreeTreeNode {
    const result: PedigreeTreeNode = {
      id: node.id, name: node.name, sex: node.sex, dob: node.dob,
      color: node.color, titles: node.titles, regNumber: node.regNumber,
      profileImageUrl: node.profileImageUrl, generation: gen,
    };
    if (gen < maxGen) {
      if (node.sireId) { const s = map.get(node.sireId); if (s) result.sire = this.buildTree(s, map, maxGen, gen + 1); }
      if (node.damId)  { const d = map.get(node.damId);  if (d) result.dam  = this.buildTree(d, map, maxGen, gen + 1); }
    }
    return result;
  }

  // ── Ancestor BFS Fetcher ────────────────────────────────────────────────

  private async fetchAllAncestors(dogId: string, maxGen: number): Promise<AncestorNode[]> {
    const visited = new Map<string, AncestorNode>();
    let queue = [dogId];
    for (let g = 0; g <= maxGen && queue.length > 0; g++) {
      const batch = await prisma.dog.findMany({
        where: { id: { in: queue } },
        select: { id: true, name: true, sex: true, dob: true, color: true, titles: true, regNumber: true, sireId: true, damId: true, profileImageUrl: true },
      });
      const next: string[] = [];
      for (const d of batch) {
        if (!visited.has(d.id)) visited.set(d.id, d as AncestorNode);
        if (g < maxGen) {
          if (d.sireId && !visited.has(d.sireId)) next.push(d.sireId);
          if (d.damId  && !visited.has(d.damId))  next.push(d.damId);
        }
      }
      queue = [...new Set(next)];
    }
    return [...visited.values()];
  }

  private async fetchAncestorMap(dogId: string, maxGen: number): Promise<Map<string, AncestorNode>> {
    const all = await this.fetchAllAncestors(dogId, maxGen);
    return new Map(all.map(a => [a.id, a]));
  }

  // ── Depth-tracked ancestor fetch (for COI) ───────────────────────────────

  async fetchAncestorsWithDepth(dogId: string, maxGen: number): Promise<Map<string, number[]>> {
    // BFS keeping track of all depths at which each ancestor appears
    const depthMap = new Map<string, number[]>();
    // queue items: [id, depth]
    let queue: Array<[string, number]> = [[dogId, 0]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const ids = [...new Set(queue.map(([id]) => id))];
      const batch = await prisma.dog.findMany({
        where: { id: { in: ids } },
        select: { id: true, sireId: true, damId: true },
      });
      const parentMap = new Map(batch.map(d => [d.id, d]));

      const nextQueue: Array<[string, number]> = [];
      for (const [id, depth] of queue) {
        // Record this depth for ancestor id
        const existing = depthMap.get(id) ?? [];
        depthMap.set(id, [...existing, depth]);

        if (depth < maxGen) {
          const dog = parentMap.get(id);
          if (dog?.sireId) nextQueue.push([dog.sireId, depth + 1]);
          if (dog?.damId)  nextQueue.push([dog.damId,  depth + 1]);
        }
      }
      // De-dup by (id, depth) to avoid exponential explosion on very inbred pedigrees
      const seen = new Set<string>();
      queue = nextQueue.filter(([id, d]) => {
        const key = `${id}:${d}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return depthMap;
  }

  // ── Wright's COI Formula ─────────────────────────────────────────────────
  //
  //  F(A) = Σ [ (0.5)^(L1 + L2 + 1) * (1 + F_ca) ]
  //
  //  L1 = steps from sire to common ancestor
  //  L2 = steps from dam  to common ancestor
  //  F_ca = COI of common ancestor (simplified to 0)
  //
  computeWrightsCoi(
    sireDepths: Map<string, number[]>,
    damDepths:  Map<string, number[]>,
    maxGen: number,
  ): number {
    let coi = 0;
    for (const [ancestorId, sireDs] of sireDepths) {
      const damDs = damDepths.get(ancestorId);
      if (!damDs) continue;
      // Skip the root dogs themselves (depth 0)
      const sireFiltered = sireDs.filter(d => d > 0);
      const damFiltered  = damDs.filter(d => d > 0);
      for (const l1 of sireFiltered) {
        for (const l2 of damFiltered) {
          if (l1 + l2 <= maxGen) {
            coi += Math.pow(0.5, l1 + l2 + 1) * (1 + 0); // Fca = 0
          }
        }
      }
    }
    return parseFloat(coi.toFixed(6));
  }

  // ── Cache Rebuild ────────────────────────────────────────────────────────

  async rebuildCache(dogId: string, generations: number) {
    const dog = await this.fetchDog(dogId);
    if (!dog) return;

    const map  = await this.fetchAncestorMap(dogId, generations);
    const tree = this.buildTree(dog, map, generations, 0);

    let coi4 = 0, coi6 = 0, coi8 = 0, coi10 = 0;
    if (dog.sireId && dog.damId) {
      const [sD, dD] = await Promise.all([
        this.fetchAncestorsWithDepth(dog.sireId, generations),
        this.fetchAncestorsWithDepth(dog.damId,  generations),
      ]);
      coi4  = this.computeWrightsCoi(sD, dD, 4);
      coi6  = this.computeWrightsCoi(sD, dD, 6);
      coi8  = this.computeWrightsCoi(sD, dD, 8);
      coi10 = this.computeWrightsCoi(sD, dD, 10);
    }

    const uniqueAncestors = new Set([...map.keys()]).size;

    await prisma.$transaction([
      prisma.pedigree.upsert({
        where:  { dogId },
        create: { dogId, generations, treeJson: tree as any, ancestorCount: map.size, uniqueAncestors, coi4gen: coi4, coi6gen: coi6, coi8gen: coi8, coi10gen: coi10 },
        update: { generations, treeJson: tree as any, ancestorCount: map.size, uniqueAncestors, coi4gen: coi4, coi6gen: coi6, coi8gen: coi8, coi10gen: coi10, updatedAt: new Date() },
      }),
      prisma.dog.update({
        where: { id: dogId },
        data: { coi4gen: coi4, coi6gen: coi6, coi8gen: coi8, coi10gen: coi10, coiUpdatedAt: new Date() },
      }),
    ]);
  }

  private async fetchDog(dogId: string): Promise<AncestorNode | null> {
    return prisma.dog.findUnique({
      where: { id: dogId },
      select: { id: true, name: true, sex: true, dob: true, color: true, titles: true, regNumber: true, sireId: true, damId: true, profileImageUrl: true },
    }) as Promise<AncestorNode | null>;
  }
}
