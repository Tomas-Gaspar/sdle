import { CausalCounter } from "./CausalCounter";
import { Dot, DotContext } from "./DotContext";

interface CRDT {
    join(other: CRDT): void;
    toString(): string;
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

    setId(id: string) {
        this.id = id;
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
            this.context.toString() + "\n" +
            Array.from(this.elements.entries()).map(([key, value]) => {
                return `${key}: ${value.dot.toString()}${value.crdt ? `(${value.crdt.toString()})` : ''}`;
            }).join('\n') + "\n)";
    }

    static fromString(str: string): AWORStructure<AWORVal> {
        const lines = str.split('\n').slice(1, -1);
        const elements = new Map<string, AWORVal>();

        const context = DotContext.fromString(lines.shift() || '');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line === '') continue;

            const [key, rest] = line.split(': ');
            let dotStr, crdtStr;
            if (rest.includes('(tombstone)')) {
                dotStr = rest.split(' (tombstone)')[0] + ' (tombstone)';
                crdtStr = rest.split(' (tombstone)(').slice(1)[0].slice(0, -1);
            } else {
                dotStr = rest.split('(')[0];
                crdtStr = rest.split('(').slice(1)[0];
            }
            
            const dot = Dot.fromString(dotStr);

            let crdt = undefined;
            if (crdtStr === 'CC') {
                crdtStr += '(\n';
                let count = 0;
                for (let j = i + 1; j < lines.length; j++) {
                    crdtStr += lines[j] + '\n';
                    if (lines[j].endsWith(')')) {
                        if (count === 1) {
                            i = j + 1;
                            break;
                        } else count++;
                    }
                }
                crdtStr += ')';
                crdt = CausalCounter.fromString(crdtStr);
            }

            elements.set(key, {dot: dot, crdt: crdt});
        }

        return new AWORStructure('', context, elements);
    }
}

export { CRDT, AWORStructure, AWORVal };