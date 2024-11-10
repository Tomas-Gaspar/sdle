type Dot = {
    id: string;
    version: number;
    tombstone?: boolean;
}

class DotContext {
    private dots: Map<string, { version: number, tombstone?: boolean }> = new Map();

    getVersion(id: string): number {
        return this.dots.get(id)?.version || 0;
    }

    // To be used by CRDTs that need to merge contexts
    updateDot(dot: Dot) {
        this.dots.set(dot.id, { version: dot.version, tombstone: dot.tombstone });
    }

    makeDot(id: string): Dot {
        const version = this.getVersion(id) + 1;
        this.dots.set(id, { version });
        return { id, version };
    }

    makeTombstoneDot(id: string): Dot {
        const version = this.getVersion(id) + 1;
        this.dots.set(id, { version, tombstone: true });
        return { id, version, tombstone: true };
    }

    toString(): string {
        return "{" + Array.from(this.dots.entries())
            .map(([id, { version, tombstone }]) => `'${id}':${version}${tombstone ? ' (tombstone)' : ''}`)
            .join(" ") + "}";
    }
}

export { Dot, DotContext };