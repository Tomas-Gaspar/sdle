import sqlite from 'sqlite3';
import { AWORStructure, AWORVal } from '../crdt/AWORStructure';
import { Dot, DotContext } from '../crdt/DotContext';
import { CausalCounter } from '../crdt/CausalCounter';

type list_item = {
    name: string,
    dot: string,
    context_pos: string,
    context_neg: string,
    list_id: string,
    title: string,
    context: string
}

class ListRepository {
    private db: sqlite.Database;

    constructor(db: sqlite.Database) {
        this.db = db;
    }

    getList(id: string): Promise<AWORStructure<AWORVal>> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM Item JOIN List WHERE List.id = ?;'
            const params: [string] = [id];

            this.db.all(query, params, (err, rows: list_item[]) => {
                if (err || rows.length === 0) {
                    return reject(err);
                }
                const elements = new Map<string, AWORVal>();
                for (const row of rows) {
                    elements.set(row.name, {
                        dot: Dot.fromString(row.dot),
                        // Must set the ID before performing any increment or decrement
                        crdt: new CausalCounter('', DotContext.fromString(row.context_pos), DotContext.fromString(row.context_neg))
                    });    
                }

                const AWORMap = new AWORStructure('', DotContext.fromString(rows[0].context), elements);
                resolve(AWORMap);
            });
        });
    }

    /**
     * Save a new list to the database or overwrite an existing one
     */
    saveList(id: string, title: string, crdt: AWORStructure<AWORVal>): Promise<void> {
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
    }
}

export { ListRepository };