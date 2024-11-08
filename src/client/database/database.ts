import { get } from 'http';
import sqlite from 'sqlite3';

const dbPath = './database.db'; 

const db = new sqlite.Database(dbPath, (err) => {
    if (err) console.error('Error opening database', err);
});

async function insertUser(username: string, password: string) {
    try {
      await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password]);
    } catch (error) {
      console.error('Error inserting user:', error);
    }
  }

async function getUserId(username: string) {
try {
    const user = await db.all("SELECT id FROM users WHERE username = ?", [username]);
    console.log(user);
} catch (error) {
    console.error('Error fetching user:', error);
}
}

async function getUser(username: string) {
try {
    const users = await db.all("SELECT * FROM users WHERE username = ?", [username]);
} catch (error) {
    console.error('Error fetching user:', error);
}
}

insertUser('admin', 'admin');
getUserId('admin');

/* async function deleteData(userId) {
try {
    // Delete the user with the specified userId
    await db.run("DELETE FROM users WHERE id = ?", [userId]);
    console.log('Data deleted successfully');
} catch (error) {
    console.error('Error deleting data:', error);
}
}

  async function updateData(userId, newName) {
    try {
      // Update the name of the user with the specified userId
      await db.run("UPDATE users SET name = ? WHERE id = ?", [newName, userId]);
      console.log('Data updated successfully');
    } catch (error) {
      console.error('Error updating data:', error);
    }
  } */
