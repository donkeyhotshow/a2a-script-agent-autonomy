import StateManager from '@common/managers/include/StateManager.js'

class MenuManager extends StateManager {
    constructor(hub) {
        super(hub)
    }

    registerMenu(id, config) {
        this.hub.debug('MenuManager', 'registerMenu', `registerMenu`, id, config)
        this.create(id, config)
    }

    showMenu(id, event) {
        const menu = this.get(id)
        if (menu) {
            this.hub.debug('MenuManager', 'showMenu', `showMenu`, menu)
            const activeMenu = this.get('activeMenu')
            if (activeMenu && activeMenu !== id) {
                this.hideMenu(activeMenu)
            }

            menu.visible = true
            menu.position = {
                x: event.clientX,
                y: event.clientY,
            }
            this.set('activeMenu', id)
        }
    }

    hideMenu(id) {
        const menu = this.get(id)
        if (menu) {
            this.hub.debug('MenuManager', 'hideMenu', `hideMenu`, menu)
            menu.visible = false
            menu.position = null
            const activeMenu = this.get('activeMenu')
            if (activeMenu === id) {
                this.set('activeMenu', null)
            }
        }
    }

}

export default MenuManager
