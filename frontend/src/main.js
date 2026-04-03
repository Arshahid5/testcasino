import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router' // 1. Impor konfigurasi router yang baru dibuat

const app = createApp(App)

app.use(router) // 2. Daftarkan router ke dalam aplikasi
app.mount('#app')
