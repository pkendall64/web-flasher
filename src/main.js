import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import {createApp} from 'vue'
import {createVuetify} from 'vuetify'

import './main.css'
import App from './App.vue'
import {ready} from './i18n'

const vuetify = createVuetify({
    theme: {
        defaultTheme: 'light'
    },
    defaults: {
        global: {
            density: "compact",
        },
        VBtn: {
            density: "default"
        }
    }
})

await ready

createApp(App)
    .use(vuetify)
    .mount('#app')
