<script setup>
// Tidak perlu impor SlotMachine atau AdminPanel di sini lagi
// karena sudah diatur di src/router/index.js
</script>

<template>
  <div class="min-h-screen bg-[#0f212e]">
    <!-- RouterView adalah wadah otomatis untuk menampilkan halaman sesuai URL -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style>
/* CSS Global agar tampilan bersih dan hitam penuh */
body {
  margin: 0;
  padding: 0;
  background-color: #0f212e;
  overflow: hidden; /* Menghilangkan scrollbar liar */
}

/* Efek transisi halus saat pindah halaman */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
