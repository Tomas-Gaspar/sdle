import { Dot, DotContext } from "./DotContext";

interface CRDT {
    join(other: CRDT): void;
}

interface AWORVal {
    dot: Dot;
    crdt?: CRDT;
}

/**
 * Structure for both AWORSet and AWORMap
 */
class AWORStructure<V extends AWORVal> implements CRDT {
    private id: string;
    private context: DotContext;
    private elements: Map<string, V>;

    constructor(id: string, context?: DotContext, elements?: Map<string, V>) {
        this.id = id;
        this.context = context || new DotContext();
        this.elements = elements || new Map();
    }

    getContext(): DotContext {
        return this.context;
    }

    getElements(): Map<string, V> {
        return this.elements;
    }

    add(key: string) {
        const dot = this.context.makeDot(this.id);
        this.elements.set(key, {dot: dot} as V);
    }

    put(key: string, value: CRDT) {
        const dot = this.context.makeDot(this.id);
        this.elements.set(key, {dot: dot, crdt: value} as V);
    }

    remove(key: string) {
        const value = this.elements.get(key);
        if (value) {
            const tombstoneDot = this.context.makeTombstoneDot(this.id)
            this.elements.set(key, {dot: tombstoneDot, crdt: value.crdt} as V);
        }
    }

    join(other: AWORStructure<V>) {
        other.elements.forEach((value, key) => {
            const currentDot = this.elements.get(key)?.dot;

            if (!currentDot || value.dot.version > currentDot.version) {
                this.elements.set(key, value);
                this.context.updateDot(value.dot);
            } else if (value.dot.version === currentDot.version) {
                // If current dot is a tombstone and the other dot is not, replace because add wins
                if (currentDot.tombstone && !value.dot.tombstone) {
                    this.elements.set(key, value);
                    this.context.updateDot(value.dot);
                }
            }

            // In case of AWORMap, join inner CRDTs regardless of changes
            if (value.crdt) {
                this.elements.get(key)?.crdt?.join(value.crdt);
            }
        });
    }

    toString(): string {
        return "AWORStructure:(\n" +
            Array.from(this.elements.entries()).map(([key, value]) => {
                return `\t${key}: ${value.dot.toString()}${value.crdt ? `(${value.crdt.toString()})` : ''}`;
            }).join('\n') + "\n)";
    }
}

export { CRDT, AWORStructure, AWORVal };