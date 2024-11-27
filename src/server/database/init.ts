import sqlite from 'sqlite3';
import fs from 'fs';

const DB_PATH = './database';

function createDatabase(port: number) {
    const createDbSql = fs.readFileSync(`${DB_PATH}/create.sql`, 'utf-8');
    const db = new sqlite.Database(`${DB_PATH}/${port}.db`);

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

function getDatabaseConnection(port: number) {
    if (!fs.existsSync(`./database/${port}.db`)) {
        createDatabase(port);
    }

    const db = new sqlite.Database(`${DB_PATH}/${port}.db`);

    return db;
}

export { getDatabaseConnection };
