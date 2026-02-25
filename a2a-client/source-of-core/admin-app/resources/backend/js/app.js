import { createInertiaApp } from '@inertiajs/vue3'
import { comActs, reslv } from '@common/js/app.js'

createInertiaApp({
    resolve: name => {
        const pages = import.meta.glob('./Pages/**/*.vue', { eager: true })
        return reslv(name, pages)
    },
    title: title => title ? `${title} - Aleon CRM` : 'Aleon CRM',
    setup({ el, App, props, plugin }) {
        comActs(el, App, props, plugin)
    },
})
