export function updateSetting(target, value) {

    alert('!!!updateSetting target :' + target + ' value :' + value)
    this.state.settings[target] = value

    // this.hub.notifyManager.emit('SEND_DATA', {path: 'settings', action: `target, data: value`});


    this.hub.notifyManager.emit('SAVE_SUCCESS', {
        summary: 'Settings Updated',
        detail: `Setting ${target} has been updated.`,
    })
}

export function onSettingsUpdateSuccess(response) {
    this.hub.notifyManager.emit('SAVE_SUCCESS', {
        summary: 'Settings Updated',
        detail: 'Your settings have been successfully updated.',
    })
}
