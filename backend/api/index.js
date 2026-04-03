const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
// Melayani file statis dari folder public yang sejajar dengan folder api
app.use(express.static(path.join(__dirname, '../public')));

// --- DATABASE CONNECTION (Gunakan Pool agar tidak timeout di Vercel) ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casino_db',
    waitForConnections: true,
    connectionLimit: 10
});

// --- CONFIG ADMIN ---
let adminConfig = {
    multiplier_chance: 0.10,
    scatter_chance: 0.03,
    allowed_ids: { 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true }
};

// --- RUTE ADMIN HTML ---
app.get('/admin', (req, res) => {
    const filePath = path.resolve(__dirname, '..', 'public', 'admin.html');
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).send("File admin.html tidak ditemukan di folder public");
    });
});

// --- API ENDPOINTS ---
app.get('/api/admin/config', (req, res) => res.json(adminConfig));

app.post('/api/spin', (req, res) => {
    const { username, betAmount, isAnteBet, isBuyFreeSpin, isInsideFreeSpin, currentFSMultiplier } = req.body;
    let actualCost = isBuyFreeSpin ? betAmount * 100 : (isAnteBet ? betAmount * 1.25 : betAmount);

    db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
        if (err || !results || results.length === 0) return res.status(404).json({ success: false, message: "User tidak ditemukan" });

        const user = results[0];
        let balance = parseFloat(user.balance);
        if (balance < actualCost) return res.json({ success: false, message: "Saldo Kurang" });

        let resultSymbols = [];
        let scatterCountInThisSpin = 0;
        const chanceScatter = isAnteBet ? 0.04 : 0.02;
        const chanceMultiplier = 0.05;

        if (isBuyFreeSpin) {
            for (let i = 0; i < 30; i++) resultSymbols.push(Math.floor(Math.random() * 15));
            [5, 12, 18, 25].forEach(p => resultSymbols[p] = 15);
        } else {
            for (let i = 0; i < 30; i++) {
                const rand = Math.random();
                const maxScatter = isInsideFreeSpin ? 2 : 30;
                if (rand < chanceScatter && scatterCountInThisSpin < maxScatter) {
                    resultSymbols.push(15);
                    scatterCountInThisSpin++;
                } else if (rand < (chanceScatter + chanceMultiplier)) {
                    resultSymbols.push(Math.floor(Math.random() * 6) + 9);
                } else {
                    resultSymbols.push(Math.floor(Math.random() * 9));
                }
            }
        }

        // Dummy winData (Ganti dengan fungsi calculateWin Anda)
        const finalWin = 0; 
        const newBalance = (balance - actualCost) + finalWin;

        db.query("UPDATE users SET balance = ? WHERE username = ?", [newBalance, username], (updErr) => {
            if (updErr) return res.status(500).json({ success: false });
            res.json({
                success: true,
                newBalance: newBalance,
                symbols: resultSymbols,
                winAmount: finalWin
            });
        });
    });
});

// --- EXPORT UNTUK VERCEL (PENTING) ---
module.exports = app;

// Jalankan server hanya jika di lokal (bukan Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`🚀 Local Server Running on Port ${PORT}`));
}
