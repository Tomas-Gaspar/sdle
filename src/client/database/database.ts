import sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbFilePath = path.join(__dirname, 'database.sql');


const db = await sqlite3.open({
    filename: dbFilePath,
    driver: sqlite3.Database
});


// Function to create DB
