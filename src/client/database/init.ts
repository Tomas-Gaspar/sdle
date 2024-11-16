import sqlite from 'sqlite3';
import fs from 'fs';

const CREATE_DB_PATH: string = './database/create.sql';
const DB_PATH = './database/database.db';

function createDatabase() {
    const createDbSql = fs.readFileSync(CREATE_DB_PATH, 'utf-8');
    const db = new sqlite.Database(DB_PATH);

    db.serialize(() => {
        db.exec(createDbSql, (err) => {
            if (err) {
                console.error('Error creating database:', err);
            } else {
                console.log('Database created successfully.');
            }
        });
        db.close();
    });
}

function getDatabaseConnection() {
    if (!fs.existsSync(DB_PATH)) {
        createDatabase();
    }

    const db = new sqlite.Database(DB_PATH);

    return db;
}

export { getDatabaseConnection };
