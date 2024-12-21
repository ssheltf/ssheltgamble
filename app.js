const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database'); // Ensure the database file path is correct

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
// Landing/Home Page
app.get('/', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.render('home', { user }); // Render the home page for logged-in users
    } else {
        res.render('landing'); // Show the landing page for guests
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('login');
});

// Signup Page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Error Page
app.get('/error', (req, res) => {
    const message = req.query.message || 'An error occurred.';
    res.render('error', { message });
});

// Game Page
app.get('/game1', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.render('game', { user });
    } else {
        res.redirect('/login');
    }
});

// Dice Game Page
app.get('/dice', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.render('dice', { user });
    } else {
        res.redirect('/login');
    }
});

// Plinko Game Page
app.get('/plinko', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.render('plinko', { user });
    } else {
        res.redirect('/login');
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Login Route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (err) {
            console.error(err.message);
            return res.redirect('/error?message=An+error+occurred.');
        }

        if (row) {
            req.session.user = {
                id: row.id,
                username: row.username,
                balance: row.balance
            };

            // Update last login date
            const today = new Date().toISOString().split('T')[0];
            db.run(`UPDATE users SET last_login = ? WHERE id = ?`, [today, row.id], (err) => {
                if (err) {
                    console.error(err.message);
                }
            });

            res.redirect('/');
        } else {
            res.redirect('/error?message=Invalid+username+or+password');
        }
    });
});

// Signup Route
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    db.run(`INSERT INTO users (username, password, balance) VALUES (?, ?, 1000)`, [username, password], (err) => {
        if (err) {
            console.error(err.message);
            return res.redirect('/error?message=Username+already+exists');
        }

        res.redirect('/login');
    });
});

// Roulette Game Route
app.post('/roulette', (req, res) => {
    const { betAmount, betType } = req.body;
    const user = req.session.user;

    console.log('Request body:', req.body); // Debugging log

    const bet = parseInt(betAmount, 10);

    // Validate bet amount
    if (!user || bet > user.balance || bet <= 0) {
        return res.json({
            newBalance: user ? user.balance : 0,
            message: 'Invalid bet amount or insufficient balance.'
        });
    }

    // Validate bet type
    const validBetTypes = ['red', 'black', 'green'];
    if (!validBetTypes.includes(betType)) {
        return res.json({
            newBalance: user.balance,
            message: `Invalid bet type: ${betType}`
        });
    }

    // Deduct the bet amount
    user.balance -= bet;

    // Simulate the roulette spin
    const rouletteNumber = Math.floor(Math.random() * 37);
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(rouletteNumber);
    const isBlack = rouletteNumber !== 0 && !isRed;
    const color = rouletteNumber === 0 ? 'Green' : isRed ? 'Red' : 'Black';

    let win = false;
    let multiplier = 0;

    switch (betType) {
        case 'red':
            win = color === 'Red';
            multiplier = 2; // Red pays 2x
            break;
        case 'black':
            win = color === 'Black';
            multiplier = 2; // Black pays 2x
            break;
        case 'green':
            win = color === 'Green';
            multiplier = 14; // Green pays 14x
            break;
    }

    let message = `The roulette landed on ${color}. `;
    if (win) {
        const winnings = bet * multiplier;
        user.balance += winnings;
        message += `You won ${winnings} coins!`;
    } else {
        message += 'You lost your bet.';
    }

    // Update balance in the database
    db.run(`UPDATE users SET balance = ? WHERE id = ?`, [user.balance, user.id], (err) => {
        if (err) {
            console.error(err.message);
            return res.json({
                newBalance: user.balance,
                message: 'An error occurred while updating your balance.'
            });
        }

        res.json({
            newBalance: user.balance,
            message,
            outcome: color.toLowerCase() // Include the outcome in lowercase
        });
    });
});

// Dice Game Route
app.post('/dice', (req, res) => {
    const { betAmount, prediction, targetNumber } = req.body;
    const user = req.session.user;

    const bet = parseInt(betAmount, 10);
    const target = parseInt(targetNumber, 10);

    // Validate bet amount
    if (!user || bet > user.balance || bet <= 0) {
        return res.json({
            newBalance: user ? user.balance : 0,
            message: 'Invalid bet amount or insufficient balance.'
        });
    }

    // Validate prediction and target number
    if (!['higher', 'lower'].includes(prediction) || target < 1 || target > 6) {
        return res.json({
            newBalance: user.balance,
            message: 'Invalid prediction or target number.'
        });
    }

    // Deduct the bet amount
    user.balance -= bet;

    // Simulate the dice roll
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    let win = false;
    let multiplier = 1; // Default multiplier

    // Adjust the multiplier based on the target number and prediction
    if (prediction === 'higher') {
        switch (target) {
            case 2:
                multiplier = 1.25;
                break;
            case 3:
                multiplier = 1.5;
                break;
            case 4:
                multiplier = 2;
                break;
            case 5:
                multiplier = 3;
                break;
            case 6:
                multiplier = 5;
                break;
            default:
                multiplier = 1; // Default multiplier for target 1 and 6
                break;
        }
    } else if (prediction === 'lower') {
        switch (target) {
            case 5:
                multiplier = 1.25;
                break;
            case 4:
                multiplier = 1.5;
                break;
            case 3:
                multiplier = 2;
                break;
            case 2:
                multiplier = 3;
                break;
            default:
                multiplier = 1; // Default multiplier for target 1 and 6
                break;
        }
    }

    if ((prediction === 'higher' && diceRoll > target) || (prediction === 'lower' && diceRoll < target)) {
        win = true;
    }

    let message = `The dice rolled a ${diceRoll}. `;
    if (win) {
        const winnings = bet * multiplier;
        user.balance += winnings;
        message += `You won ${winnings} coins!`;
    } else {
        message += 'You lost your bet.';
    }

    // Update balance in the database
    db.run(`UPDATE users SET balance = ? WHERE id = ?`, [user.balance, user.id], (err) => {
        if (err) {
            console.error(err.message);
            return res.json({
                newBalance: user.balance,
                message: 'An error occurred while updating your balance.'
            });
        }

        res.json({
            newBalance: user.balance,
            message,
            diceRoll // Include the dice roll result
        });
    });
});

// Plinko Game Page
app.get('/plinko', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.render('plinko', { user });
    } else {
        res.redirect('/login');
    }
});

// Plinko Game Logic
app.post('/plinko', (req, res) => {
    const user = req.session.user;
    const { betAmount } = req.body;

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const bet = parseInt(betAmount, 10);

    // Validate bet amount
    if (bet > user.balance || bet <= 0) {
        return res.json({
            newBalance: user.balance,
            message: 'Invalid bet amount or insufficient balance.'
        });
    }

    // Deduct the bet amount
    user.balance -= bet;

    // Simulate the Plinko drop
    const outcome = simulatePlinkoDrop();
    const winnings = bet * outcome.multiplier;

    // Update balance
    user.balance += winnings;

    // Update balance in the database
    db.run(`UPDATE users SET balance = ? WHERE id = ?`, [user.balance, user.id], (err) => {
        if (err) {
            console.error(err.message);
            return res.json({
                newBalance: user.balance,
                message: 'An error occurred while updating your balance.'
            });
        }

        res.json({
            newBalance: user.balance,
            message: `You won ${winnings} coins!`,
            outcome: outcome.slot
        });
    });
});

function simulatePlinkoDrop() {
    const slots = [
        { slot: '1', multiplier: 0.5, probability: 50 },
        { slot: '2', multiplier: 1, probability: 31 },
        { slot: '3', multiplier: 1.5, probability: 10 },
        { slot: '4', multiplier: 5, probability: 5 },
        { slot: '5', multiplier: 14, probability: 1.5 }
    ];

    const random = Math.random() * 100;
    let cumulativeProbability = 0;

    for (const slot of slots) {
        cumulativeProbability += slot.probability;
        if (random <= cumulativeProbability) {
            return slot;
        }
    }

    return slots[0]; // Default to the first slot if no match (shouldn't happen)
}

// Other routes or a catch-all 404 handler
app.get('*', (req, res) => {
    res.status(404).send('Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
