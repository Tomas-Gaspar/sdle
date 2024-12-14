import sqlite from 'sqlite3';
import { AWORStructure, AWORVal } from './crdt/AWORStructure';
import { Dot, DotContext } from './crdt/DotContext';
import { CausalCounter } from './crdt/CausalCounter';
import { Mutex } from 'async-mutex';

type list_item = {
    name: string,
    dot: string,
    context_pos: string,
    context_neg: string,
    list_id: string,
    title: string,
    context: string
}

type item = {
    name: string,
    quantity: number
}

type list = {
    id: string | undefined,
    title: string | undefined,
    items: item[];
}

class ListModel {
    private db: sqlite.Database;
    private replicaId: string;
    private mutex: Mutex = new Mutex();

    constructor(db: sqlite.Database, replicaId: string) {
        this.db = db;
        this.replicaId = replicaId;
    }

    getAllListsIDs(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id FROM List';

            this.db.all(query, (err, rows: { id: string }[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => row.id));
            });
        });
    }

    getList(id: string): Promise<{title: string, crdt: AWORStructure<AWORVal>}> {
        return this.mutex.runExclusive(() => {
            return new Promise((resolve, reject) => {
                const query = 'SELECT * FROM List LEFT JOIN Item ON List.id = Item.list_id WHERE List.id = ?;'
                const params: [string] = [id];
    
                this.db.all(query, params, (err, rows: list_item[]) => {
                    if (err || rows.length === 0) {
                        return reject(err);
                    }
                    const elements = new Map<string, AWORVal>();
                    for (const row of rows) {
                        if (!row.name) continue;
    
                        const pos = AWORStructure.fromString(row.context_pos);
                        pos.setId(this.replicaId);
                        const neg = AWORStructure.fromString(row.context_neg);
                        neg.setId(this.replicaId);
    
                        elements.set(row.name, {
                            dot: Dot.fromString(row.dot),
                            crdt: new CausalCounter(this.replicaId, pos, neg)
                        });    
                    }
    
                    let AWORMap;
                    if (elements.size === 0) {
                        AWORMap = new AWORStructure(this.replicaId);
                    }
                    else {
                        AWORMap = new AWORStructure(this.replicaId, DotContext.fromString(rows[0].context), elements);
                    }
                    resolve({title: rows[0].title, crdt: AWORMap});
                });
            });
        });
    }

    /**
     * Save a new list to the database or overwrite an existing one
     */
    saveList(id: string, title: string, crdt?: AWORStructure<AWORVal>): Promise<void> {
        if (!crdt)
            crdt = new AWORStructure(this.replicaId, new DotContext(), new Map<string, AWORVal>());

        return this.mutex.runExclusive(() => {
            return new Promise((resolve, reject) => {
                this.db.serialize(() => {
                    this.db.run('BEGIN TRANSACTION');

                    const listQuery = 'INSERT OR REPLACE INTO List (id, title, context) VALUES (?, ?, ?)';
                    const listParams: [string, string, string] = [id, title, crdt.getContext().toString()];

                    this.db.run(listQuery, listParams, (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(err);
                        }

                        const itemQuery = 'INSERT OR REPLACE INTO Item (name, dot, context_pos, context_neg, list_id) VALUES (?, ?, ?, ?, ?)';

                        for (const item of crdt.getElements()) {
                            const counter_context = (item[1].crdt as CausalCounter).getContext();
                            const itemParams: [string, string, string, string, string] = [item[0], item[1].dot.toString(), counter_context.pos.toString(), counter_context.neg.toString(), id];
                            this.db.run(itemQuery, itemParams, (err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return reject(err);
                                }
                            });
                        }

                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                return reject(err);
                            }
                            resolve();
                        });
                    });
                });
            });
        });
    }

    deleteList(id: string): Promise<void> {
        return this.mutex.runExclusive(() => {
            return new Promise((resolve, reject) => {
                const query = 'DELETE FROM List WHERE id = ?';
                const params: [string] = [id];
    
                this.db.run(query, params, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    }

    async insertItem(listId: string, itemName: string, itemQuantity: number): Promise<void> {
        return this.getList(listId).then((list) => {
            const crdt = list.crdt;
            const counter = new CausalCounter(this.replicaId);
            counter.inc(itemQuantity);
            crdt.put(itemName, counter);
            this.saveList(listId, list.title, crdt);
        });
    }

    async deleteItem(listId: string, itemName: string): Promise<void> {
        return this.getList(listId).then((list) => {
            const crdt = list.crdt;
            crdt.remove(itemName);
            this.saveList(listId, list.title, crdt);
        });
    }

    async incItem(listId: string, itemName: string, itemQuantity: number = 1): Promise<number> {
        if (itemQuantity <= 0) {
            return -1;
        }

        return this.getList(listId).then((list) => {
            const crdt = list.crdt;
            const counter = crdt.getElements().get(itemName)?.crdt as CausalCounter;
            counter.inc(itemQuantity);
            this.saveList(listId, list.title, crdt);
            return counter.value();
        });
    }

    async decItem(listId: string, itemName: string, itemQuantity: number = 1): Promise<number> {
        if (itemQuantity <= 0) {
            return -1;
        }

        return this.getList(listId).then((list) => {
            const crdt = list.crdt;
            const counter = crdt.getElements().get(itemName)?.crdt as CausalCounter;
            counter.dec(itemQuantity);
            this.saveList(listId, list.title, crdt);
            return counter.value();
        });
    }
    
    static crdtToList(crdt: AWORStructure<AWORVal>): list {
        const items = Array.from(crdt.getElements()).reduce((acc, [name, val]) => {
            if (!val.dot.tombstone) {
            acc.push({
                name: name,
                quantity: (val.crdt as CausalCounter).value()
            });
            }
            return acc;
        }, [] as item[]);
        items.sort((a, b) => a.name.localeCompare(b.name));

        return {
            id: undefined,
            title: undefined,
            items: items
        };   
    }
}

export { ListModel, list };