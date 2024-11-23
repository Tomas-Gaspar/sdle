import sqlite from 'sqlite3';

class List {
    private db: sqlite.Database;

    constructor(db: sqlite.Database) {
        this.db = db;
    }

    createList(title: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO List (title) VALUES (?)';
            const params: [string] = [title.trim()];
            

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    getAllListsIDs(): Promise<number[]> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT id FROM List';

            this.db.all(query, (err, rows: { id: number }[]) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows.map(row => row.id));
            });
        });
    }

    getList(listId: number): Promise<{ id: number, title: string, items: { id: number, name: string, quantity: number }[] }> {
        return new Promise((resolve, reject) => {
            const queryList = 'SELECT * FROM List WHERE id = ?';
            const queryItems = 'SELECT * FROM Item WHERE list_id = ?';
            const params: [number] = [listId];

            this.db.serialize(() => {
                this.db.get(queryList, params, (err, row: { id: number, title: string }) => {
                    if (err) {
                        return reject(err);
                    }
                    this.db.all(queryItems, params, (err, rows: { id: number, name: string, quantity: number }[] ) => {
                        if (err) {
                            return reject(err);
                        }
                        resolve({ id: row.id, title: row.title, items: rows });
                    });
                });
            });
        });
    }

    updateListTitle(listId: number, title: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE List SET title = ? WHERE id = ?';
            const params: [string, number] = [title.trim(), listId];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    deleteList(listId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM List WHERE id = ?';
            const params: [number] = [listId];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    getItem(itemId: number): Promise<{ id: number, name: string, quantity: number }> {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM Item WHERE id = ?';
            const params: [number] = [itemId];

            this.db.get(query, params, (err, row: { id: number, name: string, quantity: number }) => {
                if (err) {
                    return reject(err);
                }
                resolve(row);
            });
        });
    }

    insertItem(listId: number, name: string, quantity: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const query = 'INSERT INTO Item (list_id, name, quantity) VALUES (?, ?, ?)';
            const params: [number, string, number] = [listId, name.trim(), quantity];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });
    }

    updateItem(itemId: number, name: string, quantity: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE Item SET name = ?, quantity = ? WHERE id = ?';
            const params: [string, number, number] = [name.trim(), quantity, itemId];

            this.db.run(query, params, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    deleteItem(itemId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM Item WHERE id = ?';
            const params: [number] = [itemId];

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