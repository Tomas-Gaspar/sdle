import { Dot } from './DotContext';
import { CRDT, AWORStructure } from './AWORStructure';

class CausalCounter implements CRDT {
    private id: string;
    private pos: AWORStructure<{ dot: Dot }>;
    private neg: AWORStructure<{ dot: Dot }>;

    constructor(id: string, pos?: AWORStructure<{ dot: Dot }>, neg?: AWORStructure<{ dot: Dot }>) {
        this.id = id;
        this.pos = pos || new AWORStructure(id);
        this.neg = neg || new AWORStructure(id);
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
        this.pos.join(other.pos, true);
        this.neg.join(other.neg, true);

        const value = this.value();
        if (value < 0)
            this.inc(-value);
    }

    getContext(): {pos: AWORStructure<{dot: Dot}>, neg: AWORStructure<{dot: Dot}>} {
        return {pos: this.pos, neg: this.neg};
    }

    toString(): string {
        return "CC(\n" + 
            this.pos.toString() + "\n" +
            this.neg.toString() + "\n" +
        ")";
    }

    static fromString(str: string): CausalCounter {
        const lines = str.split("\n");
        const closingParen = lines.findIndex(l => l === ')');
        const pos = AWORStructure.fromString(lines.slice(1, closingParen + 1).join('\n'));
        const closingParen2 = lines.slice(closingParen + 1).findIndex(l => l === ')');
        const neg = AWORStructure.fromString(lines.slice(closingParen + 1, closingParen + 1 + closingParen2 + 1).join('\n'));

        return new CausalCounter('', pos, neg);
    }
}

export { CausalCounter };