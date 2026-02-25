import '../template/css/app.css'


import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createInertiaApp } from '@inertiajs/vue3'
import createServer from '@inertiajs/vue3/server'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Layout from '@frontend/Shared/Layout.vue'
import HubManager from '../managers/HubManager.js'


createServer(page =>
    createInertiaApp({
        page,
        render: renderToString,
        resolve: name => {
            const pages = import.meta.glob('./Pages/**/*.vue', { eager: true })
            let page = pages[`./Pages/${name}.vue`]
            page.default.layout = page.default.layout || Layout
            return page
        },
        title: title => title ? `${title}` : '',
        setup({ App, props, plugin }) {
            const app = createSSRApp({
                render: () => h(App, props),
            })

            app.config.globalProperties.$page = props.initialPage

            app.use(ToastService)
            app.use(HubManager)
            app.use(ConfirmationService)
            app.use(plugin)
                // .use(ZiggyVue, Ziggy)
                .use(PrimeVue, {
                    theme: {
                        preset: Aura,
                        options: {
                            darkModeSelector: '.app-dark',
                        },
                    },
                })

            return app
        },
    }),
)
