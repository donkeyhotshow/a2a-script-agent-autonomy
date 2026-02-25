const ACTIONS = {


    DIALOG_OPEN: { name: 'dialogOpened', modules: ['$hub.$log', '$hub.$toast'], level: 'info' },
    DIALOG_CLOSE: { name: 'dialogClosed', modules: ['$hub.$log', '$hub.$toast'], level: 'info' },


    SEND_DATA: {
        name: 'sendData',
        modules: ['$hub.$log', '$hub.$toast'],
        level: 'info',
        requiresPayload: true,
        options: {
            debug: true,
            showToast: true,
        },
    },


    SEND_BATCH: {
        name: 'sendBatch',
        modules: ['$hub.$log', '$hub.$toast'],
        level: 'info',
        options: {
            debug: true,
            showToast: true,
            logLevel: 'info',
        },
    },


    THEME_CHANGE: { name: 'themeChange', modules: ['$hub.themeManager'], level: 'info' },
// FIELD_CHANGE: {name: 'fieldChange', modules: ['$hub.formManager'], level: 'info'},


}


export default ACTIONS
