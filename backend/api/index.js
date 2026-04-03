const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
}));
app.use(express.static('public'));
app.use(express.json());

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'casino_db'
});

db.connect((err) => {
    if (err) console.error('❌ Database Error:', err);
    else console.log('✅ Olympus Tumble Engine Connected');
});

// --- CONFIG ADMIN & RNG LOCK ---
let adminConfig = {
    multiplier_chance: 0.10,
    scatter_chance: 0.03,
    win_throttle: 0.15,
    allowed_ids: {
        9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true
    }
};

// --- 1. Fungsi Filter Simbol yang SANGAT KETAT ---
const getSafeSymbol = (id) => {
    const targetId = Number(id);
    // Cek apakah ID 9-15 diizinkan di adminConfig.allowed_ids
    if (targetId >= 9 && targetId <= 15) {
        if (adminConfig.allowed_ids[targetId] !== true) {
            // TERDETEKSI: Simbol OFF mencoba muncul!
            console.warn(`⚠️  SECURITY ALERT: Simbol ID ${targetId} (Status: OFF) mencoba muncul. Otomatis diganti!`);
            
            // Ganti ke simbol rendah (0-8)
            return Math.floor(Math.random() * 9); 
        }
    }
    return targetId;
};


// --- API ADMIN (ENDPOINT UPDATE SALDO ADA DI SINI) ---

// 1. Ambil Config
app.get('/api/admin/config', (req, res) => {
    res.json(adminConfig);
});

app.get('/api/history/:username', (req, res) => {
    const sql = "SELECT * FROM bet_history WHERE username = ? ORDER BY created_at DESC LIMIT 10";
    db.query(sql, [req.params.username], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


// --- 2. Update Peluang Global (Pengganda & Scatter) ---
app.post('/api/admin/config', (req, res) => {
    const { multiplier_chance, scatter_chance } = req.body;
    
    if (multiplier_chance !== undefined) adminConfig.multiplier_chance = parseFloat(multiplier_chance);
    if (scatter_chance !== undefined) adminConfig.scatter_chance = parseFloat(scatter_chance);
    
    console.log("⚙️ Config Updated:", adminConfig);
    res.json({ success: true, message: "Peluang Berhasil Diperbarui!", current: adminConfig });
});

// --- 3. Toggle RNG Lock (ON/OFF Simbol Tertentu) ---
app.post('/api/admin/toggle-id', (req, res) => {
    const { id, status } = req.body;
    const targetId = parseInt(id);

    if (adminConfig.allowed_ids.hasOwnProperty(targetId)) {
        adminConfig.allowed_ids[targetId] = status;
        console.log(`🔒 ID ${targetId} set to ${status ? 'ON' : 'OFF'}`);
        res.json({ success: true, message: `ID ${targetId} Updated` });
    } else {
        res.status(400).json({ success: false, message: "ID Simbol Tidak Valid" });
    }
});



// 2. Set Target (Scatter/None)
app.post('/api/admin/set-target', (req, res) => {
    const { username, target } = req.body;
    db.query("UPDATE users SET target_result = ? WHERE username = ?", [target, username], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: `Target ${target} aktif!` });
    });
});

// 3. UPDATE SALDO PEMAIN (PENTING!)
app.post('/api/admin/update-balance', (req, res) => {
    const { username, newBalance } = req.body;
    const cleanBalance = parseFloat(newBalance);

    if (isNaN(cleanBalance)) {
        return res.status(400).json({ success: false, message: "Saldo harus berupa angka" });
    }

    db.query("UPDATE users SET balance = ? WHERE username = ?", [cleanBalance, username], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "User tidak ditemukan" });
        }
        res.json({ success: true, message: `Saldo ${username} diperbarui menjadi ${cleanBalance}` });
    });
});

app.get('/api/user/:username', (req, res) => {
    db.query("SELECT * FROM users WHERE username = ?", [req.params.username], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result[0] || { balance: 0 });
    });
});

// --- LOGIKA HITUNG MENANG ---
function calculateWin(symbols, betAmount, isInsideFreeSpin, currentGlobalMultiplier) {
    const counts = {};
    for (let i = 0; i <= 15; i++) counts[i] = 0;
    symbols.forEach(id => counts[id]++);

    let baseWin = 0;
    let multiplierInThisSpin = 0;
    let winningIds = [];

    // 1. Paytable
    const paytable = {
        0: [0.25, 0.75, 2.0], 1: [0.4, 0.9, 2.5], 2: [0.5, 1.0, 3.0], 
        3: [0.8, 1.2, 4.0], 4: [1.0, 1.5, 5.0], 5: [1.5, 2.5, 10.0], 
        6: [2.0, 5.0, 15.0], 7: [2.5, 10.0, 25.0], 8: [10.0, 25.0, 50.0]
    };

    for (let id = 0; id <= 8; id++) {
        let minNeeded = (id === 8) ? 7 : 8; 
        if (counts[id] >= minNeeded) {
            let tier = counts[id] >= 12 ? 2 : (counts[id] >= 10 ? 1 : 0);
            baseWin += betAmount * paytable[id][tier];
            winningIds.push(id);
        }
    }

    // 2. Multiplier Logic (Cukup Tulis Sekali di Sini)
    const multMap = { 9: 2, 10: 5, 11: 10, 12: 25, 13: 50, 14: 100 };
    for (let id = 9; id <= 14; id++) {
        if (counts[id] > 0) {
            multiplierInThisSpin += (counts[id] * multMap[id]);
            if (baseWin > 0) winningIds.push(id);
        }
    }

    // 3. Scatter Logic
    let fsWon = 0;
    if (counts[15] >= 4) {
        fsWon = 15;
        winningIds.push(15);
    } else if (isInsideFreeSpin && counts[15] >= 3) {
        fsWon = 5;
        winningIds.push(15);
    }

    // 4. Final Calculation
    let totalGlobalMultiplier = currentGlobalMultiplier;
    let multiplierTerpakai = 1;

    if (isInsideFreeSpin) {
        if (baseWin > 0 && multiplierInThisSpin > 0) {
            totalGlobalMultiplier += multiplierInThisSpin;
            multiplierTerpakai = totalGlobalMultiplier;
        } else if (baseWin > 0) {
            multiplierTerpakai = totalGlobalMultiplier > 0 ? totalGlobalMultiplier : 1;
        }
    } else {
        multiplierTerpakai = multiplierInThisSpin > 0 ? multiplierInThisSpin : 1;
    }

    const finalAmount = baseWin * multiplierTerpakai;

    let winningPositions = [];
    symbols.forEach((id, index) => {
        if (winningIds.includes(id)) {
            winningPositions.push({ col: Math.floor(index / 5), row: index % 5 });
        }
    });

    return {
        amount: finalAmount,
        totalGlobalMultiplier: totalGlobalMultiplier,
        freeSpinsWon: fsWon,
        winningPositions: winningPositions
    };
}

// --- 2. Update Route SPIN agar tidak macet ---
// 3. MAIN API: SPIN (PASTIKAN PENUTUPNYA LENGKAP)
// 3. MAIN API: SPIN (PASTIKAN PENUTUPNYA LENGKAP)
app.post('/api/spin', (req, res) => {
    const { username, betAmount, isAnteBet, isBuyFreeSpin, isInsideFreeSpin, currentFSMultiplier } = req.body;
    let actualCost = isBuyFreeSpin ? betAmount * 100 : (isAnteBet ? betAmount * 1.25 : betAmount);

    db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
        if (err || !results || results.length === 0) return res.status(404).json({ success: false });

        const user = results[0];
        let balance = parseFloat(user.balance);
        if (balance < actualCost) return res.json({ success: false, message: "Saldo Kurang" });

        // --- LOGIKA RNG BARU (DENGAN KONTROL PELUANG) ---
        // Jika multiplier_chance di DB = 0, maka pengganda tidak akan pernah muncul
        // --- DI DALAM app.post('/api/spin') ---

const chanceMultiplier = parseFloat(user.multiplier_chance || 0.05);
const chanceScatter = user.is_flagged ? 1.0 : (isAnteBet ? 0.04 : 0.02);

let resultSymbols = [];
 // Tingkatkan peluang Scatter (ID 15) jika Ante Bet aktif
let scatterChance = isAnteBet ? 0.04 : 0.02; // Contoh: 4% vs 2%
let scatterCountInThisSpin = 0; // Counter untuk membatasi scatter

if (isBuyFreeSpin) {
    // Paksa Scatter untuk Buy FS (Tetap seperti sebelumnya)
    for (let i = 0; i < 30; i++) resultSymbols.push(Math.floor(Math.random() * 15));
    [5, 12, 18, 25].forEach(p => resultSymbols[p] = 15);
} else {
    for (let i = 0; i < 30; i++) {
        const rand = Math.random();
        
        // LOGIKA PEMBATAS SCATTER
        // Jika sedang Free Spin, batasi maksimal 2 Scatter saja agar tidak re-trigger terus
        const maxScatterAllowed = isInsideFreeSpin ? 2 : 30; 

        if (rand < chanceScatter && scatterCountInThisSpin < maxScatterAllowed) {
            resultSymbols.push(15);
            scatterCountInThisSpin++;
        } 
        else if (chanceMultiplier > 0 && rand < (chanceScatter + chanceMultiplier)) {
            resultSymbols.push(Math.floor(Math.random() * 6) + 9); // Pengganda ID 9-14
        } 
        else {
            resultSymbols.push(Math.floor(Math.random() * 9)); // Simbol Biasa ID 0-8
        }
    }
}


        // --- HITUNG KEMENANGAN ---
        const winData = calculateWin(resultSymbols, betAmount, isInsideFreeSpin, currentFSMultiplier || 0);
        const finalWin = winData.amount;
        const newBalance = (balance - actualCost) + finalWin;

        // --- UPDATE DATABASE ---
        db.query("UPDATE users SET balance = ? WHERE username = ?", [newBalance, username], (updErr) => {
            if (updErr) return res.status(500).json({ success: false });

            const historySql = `INSERT INTO bet_history 
    (username, bet_amount, win_amount, multiplier, is_freespin) 
    VALUES (?, ?, ?, ?, ?)`;

db.query(historySql, [
    username, 
    actualCost, 
    winData.amount, 
    winData.multiplier, 
    isInsideFreeSpin
]);

            // LOG KE TABEL TRANSAKSI
            const resultType = isBuyFreeSpin ? 'buy_fs' : (isInsideFreeSpin ? 'freespin' : 'normal');
            db.query("INSERT INTO game_logs (username, bet_amount, win_amount, multiplier, result_type) VALUES (?, ?, ?, ?, ?)", 
            [username, betAmount, finalWin, winData.totalGlobalMultiplier, resultType]);

            res.json({
                success: true,
                newBalance: newBalance,
                symbols: resultSymbols,
                winAmount: finalWin,
                multiplier: winData.totalGlobalMultiplier,
                freeSpinsWon: winData.freeSpinsWon,
                winningPositions: winData.winningPositions
            });
        }); // Tutup Update
    }); // Tutup Select
}); // Tutup Post



const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Olympus Backend Running on Port ${PORT}`));

const express = require('express');
const app = express();

// ... rute API kamu ...

module.exports = app;

const cors = require('cors');
app.use(cors()); // Izinkan semua domain akses API ini

const path = require('path');

// Beritahu Express folder public ada di mana
app.use(express.static(path.join(__dirname, '../public')));

// Buat rute khusus untuk memanggil admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});