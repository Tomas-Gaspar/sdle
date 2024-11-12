import { Dot, DotContext } from './DotContext';
import { CRDT, AWORStructure } from './AWORStructure';

class CausalCounter implements CRDT {
    private id: string;
    private pos: AWORStructure<{ dot: Dot }>;
    private neg: AWORStructure<{ dot: Dot }>;

    constructor(id: string, context?: DotContext) {
        this.id = id;
        this.pos = new AWORStructure(id, context);
        this.neg = new AWORStructure(id, context);
    }

    inc(n = 1): void {
        for (let i = 0; i < n; i++) {
            this.pos.add(`${this.id}-pos-${this.pos.getContext().getVersion(this.id)}`);
        }
    }

    dec(n = 1): void {
        for (let i = 0; i < n; i++) {
            this.neg.add(`${this.id}-neg-${this.neg.getContext().getVersion(this.id)}`);
        }
    }

    value(): number {
        return this.pos.getContext().getDotCount() - this.neg.getContext().getDotCount();
    }

    join(other: CausalCounter): void {
        this.pos.join(other.pos);
        this.neg.join(other.neg);
    }

    getContext(): {pos: DotContext, neg: DotContext} {
        return {pos: this.pos.getContext(), neg: this.neg.getContext()};
    }

    toString(): string {
        return `PNCounter(${this.value()})`;
    }
}

export { CausalCounter };