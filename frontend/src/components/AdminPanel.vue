<template>
  <div class="p-6 bg-[#1a2c38] text-white rounded-xl max-w-md mx-auto mt-10 border border-gray-700 shadow-2xl font-sans">
    <h2 class="text-xl font-black mb-6 text-yellow-500 uppercase tracking-widest flex items-center gap-2">
      <span>🎰</span> Slot Controller
    </h2>
    
    <div class="space-y-6">
      <!-- Global Config -->
      <div>
        <label class="block text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">Scatter Chance ({{ (config.scatter_chance * 100).toFixed(1) }}%)</label>
        <input type="range" v-model="config.scatter_chance" min="0" max="0.3" step="0.01" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500">
      </div>

      <!-- Slider Multiplier Chance Baru -->
      <div>
        <label class="block text-[10px] text-gray-400 mb-2 uppercase font-bold tracking-widest">
          Multiplier Chance ({{ (config.multiplier_chance * 100).toFixed(0) }}%)
        </label>
        <input type="range" v-model="config.multiplier_chance" min="0" max="0.5" step="0.05" 
          class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500">
        <p class="text-[9px] text-gray-500 mt-1 italic">*Semakin tinggi, bola perkalian (x2-x500) makin sering jatuh.</p>
      </div>

      <div>
        <label class="block text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-bold">Volatility / Throttle ({{ (config.win_throttle * 100).toFixed(0) }}%)</label>
        <input type="range" v-model="config.win_throttle" min="0.05" max="0.5" step="0.05" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500">
      </div>

      <button @click="saveConfig" class="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-lg font-bold transition-all active:scale-95 shadow-lg text-sm uppercase text-center">
        Update Global Settings
      </button>

      <!-- User Injection (Fitur Paksa) -->
      <div class="mt-8 border-t border-gray-700 pt-6">
        <p class="text-[10px] text-yellow-500 font-black mb-4 uppercase tracking-tighter">User Injection (Target: Pemain1)</p>
        <div class="grid grid-cols-2 gap-3">
          <button @click="setUserTarget('scatter')" 
            class="bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg border-b-4 border-purple-800">
            Paksa Scatter ⚡
          </button>
          <button @click="setUserTarget('win')" 
            class="bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg border-b-4 border-blue-800">
            Paksa Gacor 💰
          </button>
        </div>
        <p class="text-[9px] text-gray-500 mt-3 italic text-center">*Aktif hanya untuk 1x spin berikutnya</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const config = ref({
    multiplier_chance: 0.10,
    scatter_chance: 0.03,
    allowed_ids: {
        10: false, 11: false, 12: false, 13: false, 14: false, 15: false
    }
});


const saveConfig = async () => {
  try {
    await axios.post('http://localhost:3000/api/admin/toggle-id', config.value);
    alert("Konfigurasi mesin berhasil diupdate!");
  } catch (err) {
    alert("Gagal koneksi ke server.");
  }
};

const setUserTarget = async (targetType) => {
  try {
    const res = await axios.post('http://localhost:3000/api/admin/set-target', {
      username: 'pemain1',
      target: targetType
    });
    if (res.data.success) {
      alert(`🎯 BERHASIL: Spin berikutnya pasti ${targetType.toUpperCase()}!`);
    }
  } catch (err) {
    alert("Gagal mengirim perintah injeksi.");
  }
};

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/admin/config');
    config.value = res.data;
  } catch (err) {
    console.error("Gagal mengambil config.");
  }
});
</script>

<style scoped>
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}
</style>
