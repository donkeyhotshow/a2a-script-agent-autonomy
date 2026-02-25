import PropsManager from './PropsManager.js'
import StateManager from '@common/managers/include/StateManager.js'

class ModalManager extends StateManager {


    registerModal(name, options) {
        this.hub.debug('ModalManager', 'registerModal', `registerModal`, name, options)
        this.create(name, options)
        PropsManager.setProp(`modal_${name}`, options.visible)
    }

    showModal(name) {
        this.hub.debug('ModalManager', 'showModal', `showModal`, name)
        if (this.get(name)) {
            this.get(name).visible = true
            PropsManager.setProp(`modal_${name}`, true)
        }
    }

    hideModal(name) {
        this.hub.debug('ModalManager', 'hideModal', `hideModal`, name)
        if (this.get(name)) {
            this.get(name).visible = false
            PropsManager.setProp(`modal_${name}`, false)
        }
    }

}

export default ModalManager
