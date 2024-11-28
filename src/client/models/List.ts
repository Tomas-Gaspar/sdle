import sqlite from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

class List {
    private db: sqlite.Database;

    constructor(db: sqlite.Database) {
        this.db = db;
    }

    createList(title: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO List (uuid, title) VALUES (?, ?)';
            const uuid = uuidv4();
            const params: [string, string] = [uuid, title.trim()];
            

            this.db.run(query, params, function (err) {
                if (err) {
                    console.log("pilas")
                    return reject(err);
                }
                resolve(uuid);
            });
        });
    }

    getAllListsIDs(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT uuid FROM List';

            this.db.all(query, (err, rows: { uuid: string }[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => row.uuid));
            });
        });
    }

    getList(listUuid: string): Promise<{ uuid: string, title: string, items: { uuid: string, name: string, quantity: number }[] }> {
        return new Promise((resolve, reject) => {
            const queryList = 'SELECT * FROM List WHERE uuid = ?';
            const queryItems = 'SELECT * FROM Item WHERE list_uuid = ?';
            const params: [string] = [listUuid];

            this.db.serialize(() => {
                this.db.get(queryList, params, (err, row: { uuid: string, title: string }) => {
                    if (err) {
                        return reject(err);
                    }
                    this.db.all(queryItems, params, (err, rows: { uuid: string, name: string, quantity: number }[] ) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve({ uuid: row.uuid, title: row.title, items: rows });
                    });
                });
            });
        });
    }

    updateListTitle(listUuid: string, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE List SET title = ? WHERE uuid = ?';
            const params: [string, string] = [title.trim(), listUuid];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    deleteList(listUuid: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM List WHERE uuid = ?';
            const params: [string] = [listUuid];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    getItem(itemUuid: string): Promise<{ uuid: string, name: string, quantity: number }> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM Item WHERE uuid = ?';
            const params: [string] = [itemUuid];

            this.db.get(query, params, (err, row: { uuid: string, name: string, quantity: number }) => {
                if (err) {
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    insertItem(listUuid: string, name: string, quantity: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO Item (uuid, list_uuid, name, quantity) VALUES (?, ?, ?, ?)';
            const uuid = uuidv4();
            const params: [string, string, string, number] = [uuid, listUuid, name.trim(), quantity];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(uuid);
            });
        });
    }

    updateItem(itemUuid: string, name: string, quantity: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE Item SET name = ?, quantity = ? WHERE uuid = ?';
            const params: [string, number, string] = [name.trim(), quantity, itemUuid];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    deleteItem(itemUuid: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM Item WHERE uuid = ?';
            const params: [string] = [itemUuid];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

export { List };