<template>
  <div class="flex flex-col items-center h-screen bg-[#0f212e] text-white font-sans overflow-hidden relative">
    
    <!-- 1. Header & Saldo -->
    <div class="w-full max-w-lg flex-shrink-0 z-50 p-2 md:p-4">
      <div class="flex justify-between items-center bg-[#1a2c38] p-2 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden">
        <div v-if="freeSpinCount > 0" class="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none"></div>
        <div class="flex flex-col px-4">
          <p class="text-gray-400 text-[10px] uppercase tracking-wider">{{ freeSpinCount > 0 ? 'Free Spins Sisa' : 'Saldo' }}</p>
          <p class="text-lg font-bold" :class="freeSpinCount > 0 ? 'text-yellow-400' : 'text-[#00e701]'">
            {{ freeSpinCount > 0 ? freeSpinCount : '₱ ' + balance.toLocaleString() }}
          </p>
        </div>
        <div class="flex flex-col px-4 text-right border-l border-gray-700">
          <p class="text-gray-400 text-[10px] uppercase tracking-wider">Total Multiplier</p>
          <p class="text-lg font-bold text-cyan-400">x{{ totalFSMultiplier }}</p>
        </div>
      </div>
    </div>

    <!-- 2. Grid Olympus dengan Efek Petir -->
    <div class="flex-grow flex items-center justify-center w-full p-2 overflow-hidden z-10">
      <div class="bg-black/40 p-1.5 rounded-xl border-[4px] relative shadow-2xl transition-all duration-700 mx-auto" 
           :class="[freeSpinCount > 0 ? 'border-red-600 shadow-red-900/50' : 'border-[#4d3a1e]', 'scale-[0.7] sm:scale-[0.8] md:scale-90 lg:scale-100']">
        <div class="grid grid-cols-6 gap-1 md:gap-1.5">
          <div v-for="(col, colIdx) in grid" :key="colIdx" class="flex flex-col gap-1 md:gap-1.5">
            <div v-for="(symbol, rowIdx) in col" :key="rowIdx" 
                 class="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-[#1a2c38]/50 rounded-lg overflow-hidden border border-white/5 relative">
              
              <!-- EFEK PETIR ZEUS SAAT MENANG -->
              <transition name="bolt">
                <div v-if="isWinningSymbol(colIdx, rowIdx)" class="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                  <svg class="w-full h-full text-cyan-300 drop-shadow-[0_0_15px_cyan] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
              </transition>

              <!-- Simbol Sprite -->
              <div 
                class="absolute w-full h-full transition-all duration-500"
                :class="{ 'animate-blink z-10 brightness-125': isWinningSymbol(colIdx, rowIdx) }"
                :style="{
                  backgroundImage: 'url(/img/olympus_sprites.png)',
                  backgroundSize: '100% 1600%', 
                  backgroundPosition: `0 ${symbol.id * (100 / 15)}%`,
                  opacity: isWinningSymbol(colIdx, rowIdx) && !spinning ? 0.8 : 1,
                  filter: spinning ? (isQuickSpin ? 'blur(10px)' : 'blur(4px)') : 'none'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Control Panel (Ante Bet & Sound Toggle Integrated) -->
    <div class="w-full max-w-2xl flex-shrink-0 bg-[#1a2c38] p-4 rounded-t-3xl border-t border-gray-700 shadow-2xl z-50">
      
      <!-- Special Features Row -->
      <div class="flex gap-2 mb-4 w-full">
        <!-- Tombol Ante Bet Visual Glow -->
        <button @click="toggleAnteBet" :disabled="spinning || freeSpinCount > 0"
          :class="isAnteBet ? 'bg-yellow-500 border-yellow-300 shadow-[0_0_15px_rgba(255,223,0,0.5)]' : 'bg-[#2f4553] border-transparent text-gray-400'"
          class="flex-1 py-1.5 rounded-lg border-2 text-[9px] font-bold uppercase transition-all duration-300 relative overflow-hidden group">
          <div v-if="isAnteBet" class="absolute inset-0 bg-white/10 animate-pulse"></div>
          Ante Bet 25% <br> <span class="text-white">Double Scatter Chance</span>
        </button>

        <!-- Tombol Buy Free Spin -->
        <button @click="buyFreeSpin" :disabled="spinning || freeSpinCount > 0 || balance < betAmount * 100"
          class="flex-1 py-1.5 bg-gradient-to-r from-purple-700 to-blue-700 rounded-lg text-[9px] font-bold uppercase shadow-lg hover:brightness-125 border-2 border-white/10">
          Buy Free Spin <br> <span class="text-white">₱{{ (betAmount * 100).toLocaleString() }}</span>
        </button>
      </div>

      <!-- Main Controls Row -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!-- Sound Toggle -->
        <button @click="toggleMute" class="bg-[#0f212e] p-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-all">
          <span v-if="!isMuted">🔊</span><span v-else>🚫</span>
        </button>

        <!-- Bet Adjustment -->
        <div class="flex items-center bg-[#0f212e] rounded-lg p-1 border border-gray-700 h-10">
          <button @click="adjustBet(-100)" :disabled="spinning || autoSpinActive || freeSpinCount > 0" class="px-3 hover:bg-gray-800 font-bold">-</button>
          <div class="px-2 text-center min-w-[70px]">
            <p class="text-[8px] text-gray-500 uppercase leading-none mb-0.5">Bet</p>
            <p class="text-xs font-bold">₱{{ betAmount }}</p>
          </div>
          <button @click="adjustBet(100)" :disabled="spinning || autoSpinActive || freeSpinCount > 0" class="px-3 hover:bg-gray-800 font-bold">+</button>
        </div>

        <!-- Tombol Buka History -->
<button @click="showHistory = true; fetchHistory()" class="bg-gray-700 p-2 rounded-lg text-xs">📜 History</button>

        <!-- Quick Spin -->
        <button @click="isQuickSpin = !isQuickSpin" :disabled="spinning"
          :class="isQuickSpin ? 'bg-cyan-900 border-cyan-500 text-cyan-400' : 'bg-gray-800 border-transparent text-gray-500'"
          class="h-10 px-3 rounded-lg border text-[10px] font-bold uppercase transition-all tracking-tighter">
          ⚡ Quick
        </button>

        <!-- Auto Spin Select -->
        <div class="flex items-center bg-[#0f212e] rounded-lg p-1 border border-gray-700 h-10">
          <select v-model="autoSpinCount" :disabled="spinning || autoSpinActive || freeSpinCount > 0" class="bg-transparent text-[10px] font-bold outline-none px-1 uppercase cursor-pointer">
            <option :value="0">Off</option>
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
        </div>

        <!-- Main Spin/Stop Button -->
        <button @click="autoSpinActive ? stopAutoSpin() : startSpin()" :disabled="spinning && !autoSpinActive && freeSpinCount === 0"
          :class="autoSpinActive || freeSpinCount > 0 ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-[#00e701] shadow-[0_0_15px_rgba(0,231,1,0.3)]'"
          class="flex-1 h-12 text-black font-black rounded-xl hover:brightness-110 disabled:opacity-30 text-lg uppercase italic transition-all active:scale-95">
          {{ freeSpinCount > 0 ? `Free (${freeSpinCount})` : (autoSpinActive ? `Stop (${autoSpinCount})` : 'Spin') }}
        </button>
      </div>
    </div>

    <!-- Win & Overlay (Z-Index diperkuat) -->
    <transition name="zoom">
      <div v-if="showWinPopup" class="fixed inset-0 flex items-center justify-center z-[100] bg-black/40 backdrop-blur-sm">
        <div class="bg-[#1a2c38] p-8 rounded-3xl border-4 border-yellow-500 text-center shadow-[0_0_50px_rgba(255,223,0,0.5)]">
          <p class="text-yellow-500 text-xs font-black uppercase mb-2 animate-bounce tracking-widest">Big Win!</p>
          <p class="text-5xl font-black text-white italic">₱ {{ lastWin.toLocaleString() }}</p>
        </div>
      </div>
    </transition>

     <canvas 
      ref="coinCanvas" 
      v-show="showTotalWinOverlay" 
      class="fixed inset-0 z-[199] pointer-events-none"
    ></canvas>

        <!-- Overlay Congratulations (Dinamis: BIG/MEGA/MAX WIN) -->
    <transition name="fade">
      <div v-if="showTotalWinOverlay" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div class="text-center p-10 border-4 border-yellow-500 rounded-[50px] bg-[#1a2c38] shadow-[0_0_100px_rgba(234,179,8,0.3)] transform transition-all">
          
          <!-- Judul Dinamis berdasarkan variabel winTitle -->
          <h2 class="text-yellow-500 text-4xl font-black uppercase mb-4 tracking-tighter animate-bounce">
            {{ winTitle }}
          </h2>

          <!-- Akumulasi Kemenangan selama Free Spin -->
          <div class="text-7xl font-black text-white italic mb-8 tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            ₱ {{ totalFSWinAmount.toLocaleString() }}
          </div>

          <!-- Tombol Collect -->
          <button @click="closeTotalWin" 
            class="bg-yellow-500 text-black px-16 py-4 rounded-full font-black text-xl hover:bg-yellow-400 hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(234,179,8,0.5)]">
            COLLECT
          </button>
          
        </div>
      </div>
    </transition>

    <!-- Modal History -->
<div v-if="showHistory" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4">
  <div class="bg-[#1a2c38] w-full max-w-md rounded-2xl p-6 border border-gray-600">
    <div class="flex justify-between mb-4">
      <h3 class="font-bold">Riwayat Taruhan</h3>
      <button @click="showHistory = false">✕</button>
    </div>
    <div class="space-y-2 max-h-96 overflow-y-auto">
      <div v-for="h in history" :key="h.id" class="flex justify-between p-3 bg-[#0f212e] rounded-lg text-[10px]">
        <span>{{ new Date(h.created_at).toLocaleTimeString() }}</span>
        <span class="text-red-400">-₱{{ h.bet_amount }}</span>
        <span :class="h.win_amount > 0 ? 'text-[#00e701]' : 'text-gray-500'">+₱{{ h.win_amount }}</span>
      </div>
    </div>
  </div>
</div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'; // Tambahkan watch
import axios from 'axios';

const balance = ref(0);
const betAmount = ref(1000);
const spinning = ref(false);
const isQuickSpin = ref(false);
const isAnteBet = ref(false); 
const isMuted = ref(false);    
const autoSpinCount = ref(0);
const autoSpinActive = ref(false);
const showWinPopup = ref(false);
const lastWin = ref(0);
const winningCoords = ref([]);
const freeSpinCount = ref(0);
const totalFSMultiplier = ref(0);
const showTotalWinOverlay = ref(false);

// --- TAMBAHAN UNTUK NOTIFIKASI KEMENANGAN AKHIR ---
const totalFSWinAmount = ref(0);
const winTitle = ref("TOTAL WIN");

// --- TAMBAHAN UNTUK EFEK KOIN ---
const coinCanvas = ref(null);
let animationId = null;

const grid = ref(Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => ({ id: 0 }))));
const isWinningSymbol = (col, row) => winningCoords.value.some(c => c.col === col && c.row === row);
const adjustBet = (val) => { if (!spinning.value) betAmount.value = Math.max(100, betAmount.value + val); };

// --- SISTEM AUDIO & BGM ---
const bgmNormal = ref(null);
const bgmFreeSpin = ref(null);
const isMusicInitialized = ref(false);

const playSound = (fileName, volume = 0.5) => {
  if (isMuted.value) return; 
  const audio = new Audio(`/sounds/${fileName}`);
  audio.volume = volume;
  audio.play().catch(() => {});
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (bgmNormal.value) bgmNormal.value.volume = isMuted.value ? 0 : 0.3;
  if (bgmFreeSpin.value) bgmFreeSpin.value.volume = isMuted.value ? 0 : 0.4;
};

const toggleAnteBet = () => {
  if (spinning.value || freeSpinCount.value > 0) return;
  isAnteBet.value = !isAnteBet.value;
  if (isAnteBet.value) playSound('ante_on.mp3', 0.5);
};

const initBGM = () => {
  if (isMusicInitialized.value) return;
  bgmNormal.value = new Audio('/sounds/bg_main.mp3');
  bgmNormal.value.loop = true;
  bgmNormal.value.volume = isMuted.value ? 0 : 0.3;

  bgmFreeSpin.value = new Audio('/sounds/bg_freespin.mp3');
  bgmFreeSpin.value.loop = true;
  bgmFreeSpin.value.volume = isMuted.value ? 0 : 0.4;

  bgmNormal.value.play().catch(() => {});
  isMusicInitialized.value = true;
};

const switchBGM = (mode) => {
  if (!isMusicInitialized.value) return;
  if (mode === 'freespin') {
    bgmNormal.value.pause();
    bgmFreeSpin.value.currentTime = 0;
    bgmFreeSpin.value.play().catch(() => {});
  } else {
    bgmFreeSpin.value.pause();
    bgmNormal.value.currentTime = 0;
    bgmNormal.value.play().catch(() => {});
  }
};

// --- LOGIKA ANIMASI KOIN RAIN ---
const startCoinRain = () => {
  const canvas = coinCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const coins = [];
  const coinCount = 150; 

  for (let i = 0; i < coinCount; i++) {
    coins.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 15 + 10,
      speed: Math.random() * 5 + 2,
      rotation: Math.random() * 360,
      spin: Math.random() * 10 - 5
    });
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    coins.forEach(coin => {
      coin.y += coin.speed;
      coin.rotation += coin.spin;
      if (coin.y > canvas.height) {
        coin.y = -50;
        coin.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate((coin.rotation * Math.PI) / 180);
      ctx.beginPath();
      ctx.ellipse(0, 0, coin.size, coin.size / 1.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700'; 
      ctx.fill();
      ctx.strokeStyle = '#B8860B'; 
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
    animationId = requestAnimationFrame(animate);
  };
  animate();
};

// Monitor Overlay untuk memicu hujan koin
watch(showTotalWinOverlay, (newVal) => {
  if (newVal) {
    setTimeout(startCoinRain, 100);
  } else {
    if (animationId) cancelAnimationFrame(animationId);
  }
});

// Fungsi Utama Siklus Game
const runGameCycle = async (isBuy = false) => {
  if (spinning.value) return;
  initBGM();

  const isFS = freeSpinCount.value > 0;
  if (isFS && bgmFreeSpin.value?.paused) switchBGM('freespin');

  const cost = isBuy ? betAmount.value * 100 : (isFS ? 0 : (isAnteBet.value ? betAmount.value * 1.25 : betAmount.value));

  if (balance.value < cost && !isFS) {
    autoSpinActive.value = false;
    autoSpinCount.value = 0;
    alert("Saldo Habis!");
    return;
  }

  spinning.value = true;
  winningCoords.value = [];
  showWinPopup.value = false;
  playSound('spin.mp3', 0.4);

  try {
    const res = await axios.post('http://localhost:3000/api/spin', {
      username: 'pemain1',
      betAmount: betAmount.value,
      isBuyFreeSpin: isBuy,
      isAnteBet: isAnteBet.value, 
      isInsideFreeSpin: isFS,
      currentFSMultiplier: totalFSMultiplier.value
    });

    if (res.data.success) {
      await new Promise(r => setTimeout(r, isQuickSpin.value ? 100 : 600));

      const newGrid = [];
      for (let i = 0; i < 6; i++) {
        newGrid.push(res.data.symbols.slice(i * 5, (i + 1) * 5).map(id => ({ id })));
      }
      grid.value = newGrid;

      if (res.data.winAmount > 0) {
        winningCoords.value = res.data.winningPositions || [];
        lastWin.value = res.data.winAmount;
        totalFSMultiplier.value = res.data.multiplier;
        if (isFS) totalFSWinAmount.value += res.data.winAmount;
        
        playSound('win.mp3', 0.6);
        if (res.data.multiplier > 0) {
            setTimeout(() => playSound('multiplier.mp3', 0.7), 400);
        }
        
        await new Promise(r => setTimeout(r, isQuickSpin.value ? 400 : 1200));
        showWinPopup.value = true;
        await new Promise(r => setTimeout(r, isQuickSpin.value ? 600 : 2000));
        showWinPopup.value = false;
        winningCoords.value = [];
      }

      balance.value = res.data.newBalance;
      
      if (res.data.freeSpinsWon > 0) {
        playSound('scatter.mp3', 0.8);
        freeSpinCount.value += res.data.freeSpinsWon;
        if (!isFS) totalFSWinAmount.value = 0; 
      } else if (isFS) {
        freeSpinCount.value--;
      }

      if (isFS && freeSpinCount.value === 0) {
        switchBGM('normal'); 
        playSound('total_win.mp3', 0.9);
        const winMultiplier = totalFSWinAmount.value / betAmount.value;
        if (winMultiplier >= 5000) winTitle.value = "MAX WIN!";
        else if (winMultiplier >= 100) winTitle.value = "MEGA WIN!";
        else if (winMultiplier >= 50) winTitle.value = "BIG WIN!";
        else winTitle.value = "TOTAL WIN";
        showTotalWinOverlay.value = true;
        spinning.value = false;
        return;
      }

      spinning.value = false;
      if (freeSpinCount.value > 0 || (autoSpinActive.value && autoSpinCount.value > 0)) {
        if (!isFS && autoSpinActive.value) autoSpinCount.value--;
        setTimeout(() => runGameCycle(), 500); 
      } else {
        autoSpinActive.value = false;
      }
    }
  } catch (err) {
    console.error(err);
    spinning.value = false;
    autoSpinActive.value = false;
  }
};

const startSpin = () => {
  if (autoSpinCount.value > 0) autoSpinActive.value = true;
  runGameCycle();
};

const stopAutoSpin = () => {
  autoSpinActive.value = false;
  autoSpinCount.value = 0;
};

const buyFreeSpin = () => {
  if (confirm(`Beli Free Spin seharga ₱${(betAmount.value * 100).toLocaleString()}?`)) {
    playSound('buy_fs.mp3', 0.6);
    runGameCycle(true);
  }
};

const closeTotalWin = () => {
  showTotalWinOverlay.value = false;
  totalFSWinAmount.value = 0; 
  totalFSMultiplier.value = 0;
  if (autoSpinCount.value > 0) {
    autoSpinActive.value = true;
    runGameCycle();
  }
};

onMounted(async () => {
  const res = await axios.get('http://localhost:3000/api/user/pemain1');
  balance.value = parseFloat(res.data.balance || 0);
});
</script>





<style scoped>
@keyframes blink {
  0%, 100% { filter: brightness(100%) drop-shadow(0 0 5px cyan); transform: scale(1); }
  50% { filter: brightness(200%) drop-shadow(0 0 20px white); transform: scale(1.05); }
}
.animate-blink { animation: blink 0.3s infinite; }

.bolt-enter-active { animation: bolt-in 0.2s ease-out; }
@keyframes bolt-in {
  0% { transform: scale(3); opacity: 0; filter: brightness(5); }
  100% { transform: scale(1); opacity: 1; filter: brightness(1); }
}

.zoom-enter-active, .zoom-leave-active { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.zoom-enter-from, .zoom-leave-to { opacity: 0; transform: scale(0.5); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>