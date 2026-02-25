import '../../common/template/css/app.css'

import { createApp, h } from 'vue'
import ToastService from 'primevue/toastservice'
import HubManager from '@common/managers/HubManager.js'
import ConfirmationService from 'primevue/confirmationservice'
import PrimeVue from 'primevue/config'
import MyPreset from '@common/js/primevue-preset.js'
import Layout from '@frontend/Shared/Layout.vue'


export const reslv = (name, pages) => {
    let page = pages[`./Pages/${name}.vue`]
    page.default.layout = page.default.layout || Layout
    return page
}
export const comActs = (el, App, props, plugin) => {
    const app = createApp({ render: () => h(App, props) })
    app.config.globalProperties.$page = props.initialPage
    const hubManager = new HubManager()
    app.use(ToastService)
    app.use(ConfirmationService)
    app.use(hubManager)
    app.use(plugin)
    app.use(PrimeVue, {
        theme: {
            preset: MyPreset,
            options: {
                darkModeSelector: '.app-dark',
            },
        },
    })
    app.mount(el)
    // window.vueAppInstance = app;
}

