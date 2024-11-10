import { CRDT } from "./AWORStructure";

class GCounter implements CRDT {
    private val = 0;

    inc(n = 1):number {
        if (n < 0) throw new Error("GCounter.inc: n must be >= 0");

        this.val += n;

        return this.val;
    }

    value():number {
        return this.val;
    }

    join(other:GCounter):number {
        this.val = Math.max(this.val, other.val);

        return this.val;
    }

    toString():string {
        return `GCounter(${this.val.toString()})`;
    }
}

class PNCounter implements CRDT {
    private p = new GCounter();
    private n = new GCounter();

    inc(n = 1):number {
        if (n < 0) throw new Error("PNCounter.inc: n must be >= 0");
        return this.p.inc(n);
    }

    dec(n = 1):number {
        if (n < 0) throw new Error("PNCounter.dec: n must be >= 0");
     
        if (this.p.value() < n) return 0;
        return this.n.inc(n);
    }

    value():number {
        return this.p.value() - this.n.value();
    }

    join(other:PNCounter):number {
        this.p.join(other.p);
        this.n.join(other.n);

        return this.value();
    }

    toString():string {
        return `PNCounter(${this.value().toString()} P(${this.p.value().toString()}) N(${this.n.value().toString()})`;
    }
}

export { PNCounter };