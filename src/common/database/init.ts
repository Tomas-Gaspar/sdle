import sqlite from 'sqlite3';
import fs from 'fs';

function createDatabase(port: number) {
    const createDbSql = fs.readFileSync(`${__dirname}/create.sql`, 'utf-8');
    
    const dir = port >= 5000 && port <= 5999 ? 'server' : 'client';
    if (!fs.existsSync(`${__dirname}/${dir}`)) {
        fs.mkdirSync(`${__dirname}/${dir}`);
    }

    const db = new sqlite.Database(`${__dirname}/${dir}/${port}.db`);

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
    const dir = port >= 5000 && port <= 5999 ? 'server' : 'client';
    if (!fs.existsSync(`${__dirname}/${dir}/${port}.db`)) {
        createDatabase(port);
    }

    const db = new sqlite.Database(`${__dirname}/${dir}/${port}.db`);
    db.get('PRAGMA foreign_keys = ON');

    return db;
}

export { getDatabaseConnection };
