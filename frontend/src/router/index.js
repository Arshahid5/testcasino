import { createRouter, createWebHistory } from 'vue-router'
import SlotMachine from '../components/SlotMachine.vue'
import AdminPanel from '../components/AdminPanel.vue'

const routes = [
  {
    path: '/',
    name: 'Game',
    component: SlotMachine
  },
  {
    path: '/admin-rahasia-777', // Ganti sesuka Anda agar orang tidak mudah menebak
    name: 'Admin',
    component: AdminPanel
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
