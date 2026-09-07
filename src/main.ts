import { createApp } from 'vue'

import App from './App.vue'

import { setupDirectives } from './directives'
import { setupRouter } from './router'
import { pinia, setupStore } from './store'
import { useAppStore } from './store/modules/app'

import '@/assets/styles/index.scss'

const app = createApp(App)

setupStore(app)

const appStore = useAppStore(pinia)
appStore.setup()

setupDirectives(app)
setupRouter(app)

app.mount('#app')