import { AWORStructure } from '../crdt/AWORStructure';
import { CausalCounter } from './CausalCounter';

function set1() {
    const a1 = new AWORStructure('A');
    const a2 = new AWORStructure('B');

    a1.add('apple');
    a1.add('banana');

    a2.add('banana');
    a2.remove('banana');

    console.log(a1.toString());
    console.log(a2.toString());

    a1.join(a2);

    console.log(a1.toString());
    console.log(a1.getContext().toString());
    console.log(a2.getContext().toString());
}

function set2() {
    const b1 = new AWORStructure('A');
    const b2 = new AWORStructure('B');

    b1.add('apple');
    b1.add('banana');
    b1.remove('banana');

    b2.add('banana');
    b2.add('cherry');

    console.log(b1.toString());
    console.log(b2.toString());

    b1.join(b2);

    console.log(b1.toString());
    console.log(b1.getContext().toString());
    console.log(b2.getContext().toString());
}

function set3() {
    const c1 = new AWORStructure('A');
    const c2 = new AWORStructure('B');

    c1.add('apple');
    c1.add('banana');
    c1.remove('banana');
    c1.add('banana');

    c2.add('banana');
    c2.remove('banana');
    c2.add('cherry');

    console.log(c1.toString());
    console.log(c2.toString());

    c1.join(c2);

    console.log(c1.toString());
    console.log(c1.getContext().toString());
    console.log(c2.getContext().toString());
}

function set4() {
    const d1 = new AWORStructure('A');
    const d2 = new AWORStructure('B');
    const d3 = new AWORStructure('C');

    d1.add('apple');
    d1.add('banana');
    d1.remove('banana');

    d2.add('banana');
    d2.add('cherry');
    d2.remove('cherry');

    d3.add('cherry');
    d3.add('date');

    console.log(d1.toString());
    console.log(d2.toString());
    console.log(d3.toString());

    d1.join(d2);
    d1.join(d3);

    console.log(d1.toString());
    console.log(d1.getContext().toString());
    console.log(d2.getContext().toString());
    console.log(d3.getContext().toString());
}

function map1() {
    const map1 = new AWORStructure('A');
    const map2 = new AWORStructure('B');

    const counter1 = new CausalCounter('A');
    const counter2 = new CausalCounter('B');

    counter1.inc();
    counter1.inc();
    counter2.inc();
    counter2.dec();

    map1.put('apple', counter1);
    map1.put('banana', counter2);

    const counter3 = new CausalCounter('C');
    counter3.inc();

    map2.put('banana', counter3);
    map2.remove('banana');

    console.log(map1.toString());
    console.log(map2.toString());

    map1.join(map2);

    console.log(map1.toString());
    console.log(map1.getContext().toString());
    console.log(map2.getContext().toString());
}

function map2() {
    const map3 = new AWORStructure('A');
    const map4 = new AWORStructure('B');

    const counter1 = new CausalCounter('A');
    const counter2 = new CausalCounter('B');

    counter1.inc();
    counter2.inc();
    counter2.dec();

    map3.put('apple', counter1);
    map3.put('banana', counter2);

    const counter3 = new CausalCounter('C');
    const counter4 = new CausalCounter('D');

    counter3.inc();
    counter4.inc();
    counter4.inc();

    map4.put('apple', counter3);
    map4.put('banana', counter4);

    console.log(map3.toString());
    console.log(map4.toString());

    map3.join(map4);

    console.log(map3.toString());
    console.log(map3.getContext().toString());
    console.log(map4.getContext().toString());
}

function map3() {
    const map5 = new AWORStructure('A');
    const map6 = new AWORStructure('B');

    const counter1 = new CausalCounter('A');

    counter1.inc();

    map5.put('apple', counter1);

    const counter2 = new CausalCounter('B');

    counter2.inc();

    map6.put('apple', counter2);

    console.log(map5.toString());
    console.log(map6.toString());

    map5.join(map6);

    console.log(map5.toString());

    console.log(`Pos:${counter1.getContext().pos.toString()}, Neg:${counter1.getContext().neg.toString()}`);
    console.log(`Pos:${counter2.getContext().pos.toString()}, Neg:${counter2.getContext().neg.toString()}`);

    counter2.inc();

    map5.join(map6);

    console.log(map5.toString());

    console.log(`Pos:${counter1.getContext().pos.toString()}, Neg:${counter1.getContext().neg.toString()}`);
    console.log(`Pos:${counter2.getContext().pos.toString()}, Neg:${counter2.getContext().neg.toString()}`);
}

export { set1, set2, set3, set4, map1, map2, map3 };