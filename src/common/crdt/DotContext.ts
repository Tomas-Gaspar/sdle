class Dot {
    id: string;
    version: number;
    tombstone?: boolean;

    constructor(id: string, version: number, tombstone?: boolean) {
        this.id = id;
        this.version = version;
        this.tombstone = tombstone;
    }

    toString(): string {
        return `${this.id}:${this.version}${this.tombstone ? ' (tombstone)' : ''}`;
    }

    static fromString(str: string): Dot {
        const split = str.split(':');
        const id = split[0];
        const version = parseInt(split[1].split(' ')[0]);
        const tombstone = str.includes('(tombstone)');

        return new Dot(id, version, tombstone);
    }
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
        return new Dot(id, version);
    }

    makeTombstoneDot(id: string): Dot {
        const version = this.getVersion(id) + 1;
        this.dots.set(id, { version, tombstone: true });
        return new Dot(id, version, true);
    }

    getDotCount(): number {
        return Array.from(this.dots.values()).reduce((acc, item) => {
            return acc + item.version;
        }, 0);
    }

    toString(): string {
        return "{" + Array.from(this.dots.entries())
            .map(([id, { version, tombstone }]) => `${id}:${version}${tombstone ? ' (tombstone)' : ''}`)
            .join(";") + "}";
    }

    static fromString(str: string): DotContext {
        const dotContext = new DotContext();
        const split = str.slice(1, -1).split(';');
        if (split[0] === '') return dotContext;

        for (const entry of split) {
            const splitEntry = entry.split(':');
            const id = splitEntry[0];
            const version = parseInt(splitEntry[1].split(' ')[0]);
            const tombstone = entry.includes('(tombstone)');
            dotContext.dots.set(id, { version, tombstone });
        }

        return dotContext;
    }
}

export { Dot, DotContext };