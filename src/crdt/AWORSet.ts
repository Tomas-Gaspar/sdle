import { Dot, DotContext } from './DotContext';

class AWORSet {
    private id: string;
    public context: DotContext;
    private elements: Map<string, Dot> = new Map<string, Dot>();

    constructor(id: string, context?: DotContext) {
        this.id = id;
        this.context = context || new DotContext();
    }

    has(val: string): boolean {
        return this.elements.has(val);
    }

    add(val: string) {
        const dot = this.context.makeDot(this.id);
        this.elements.set(val, dot);
    }

    remove(val: string) {
        const existingDot = this.elements.get(val);
        if (existingDot) {
            const tombstoneDot = this.context.makeTombstoneDot(this.id);
            this.elements.set(val, tombstoneDot);
        }
    }

    join(other: AWORSet) {
        other.elements.forEach((dot, element) => {
            const currentDot = this.elements.get(element);
            
            // If there is no current dot, or the other dot is newer, update
            if (!currentDot || dot.version > currentDot.version) {
                this.elements.set(element, dot);
                this.context.updateDot(dot);
            } else if (dot.version === currentDot.version) {
                // If current dot is a tombstone and the other dot is not, replace because add wins
                if (currentDot.tombstone && !dot.tombstone) {
                    this.elements.set(element, dot);
                    this.context.updateDot(dot);
                }
            }
        });
    }

    reset() {
        this.elements.clear();
    }

    toString(): string {
        const entries = Array.from(this.elements.entries())
            .map(([element, dot]) => `'${element}':('${dot.id}',${dot.version}${dot.tombstone ? ', tombstone' : ''})`)
            .join(" ");
        return `AWORSet(${entries})`;
    }
}


export { AWORSet };