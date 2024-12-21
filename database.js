const sqlite3 = require('sqlite3').verbose();

// Create or open the database file
const db = new sqlite3.Database('./users.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Create the users table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                balance INTEGER DEFAULT 1000,
                last_daily_claim TEXT,
                last_weekly_claim TEXT,
                last_monthly_claim TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Users table ready.');
            }
        });
    }
});

module.exports = db;