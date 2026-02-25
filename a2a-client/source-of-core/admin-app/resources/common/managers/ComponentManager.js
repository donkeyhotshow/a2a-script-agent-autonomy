import { reactive } from 'vue'
import StateManager from './include/StateManager.js'
import { CONSTANTS } from './constants/constants.js'

class ComponentManager extends StateManager {
    constructor(hub) {
        super(hub)

        this.state = reactive({
            // user: {
            //     isAuthenticated: false,
            //     data: null,
            //     permissions: new Set(),
            //     preferences: {}
            // },
            // app: {
            //     isLoading: false,
            //     errors: new Map(),
            //     notifications: []
            // },
            // cache: new Map(),
            // components: new Map(),
            // config: {
            //     theme: CONSTANTS.THEMES.AURA,
            //     language: 'en',
            //     notifications: true
            // }
        })
    }

    // setUser(userData) {
    //     this.updateState('user.data', userData);
    //     this.updateState('user.isAuthenticated', !!userData);
    //     this.emit('userUpdate', {isAuthenticated: this.state.user.isAuthenticated, data: userData});
    // }

    // setPreference(key, value) {
    //     this.state.user.preferences[key] = value;
    //     this.hub.propsManager.setProp(`preference_${key}`, value);
    //     this.emit('preferenceChange', {key, value});
    // }

    // authenticateUser() {
    //     // Пример метода для аутентификации пользователя
    //     const userData = {}; // Получение данных пользователя
    //     this.setUser(userData);
    // }

    // logoutUser() {
    //     this.setUser(null);
    //     localStorage.clear();
    //     this.emit('userLogout');
    // }

    // toggleLoading(isLoading) {
    //     this.updateState('app.isLoading', isLoading);
    //     this.emit('loadingChange', {isLoading});
    // }

    // addError(key, error) {
    //     this.state.app.errors.set(key, error);
    //     this.emit('errorOccurred', {key, error});
    // }

    // clearErrors() {
    //     this.state.app.errors.clear();
    //     this.emit('errorsCleared');
    // }

    // addNotification(notification) {
    //     this.state.app.notifications.push(notification);
    //     this.emit('notificationAdded', notification);
    // }

    // removeNotification(index) {
    //     const removed = this.state.app.notifications.splice(index, 1);
    //     this.emit('notificationRemoved', removed);
    // }

    // getUserPermissions() {
    //     return Array.from(this.state.user.permissions);
    // }

    // updateConfig(newConfig) {
    //     Object.assign(this.state.config, newConfig);
    //     this.emit('configUpdated', newConfig);
    // }

    // getConfig() {
    //     return this.state.config;
    // }


    // Пример использования FormManager через HubManager
    // registerComponent(component) {
    //     if (component.name)
    //         this.register('component', component.name, component);
    //     else this.hub.debug('ComponentManager', 'register', 'noname = no register')
    // }

    // /**
    //  * Создает новый компонент
    //  * @param {string} name - Имя компонента
    //  * @param {object} config - Конфигурация компонента
    //  */
    // createComponent(name, config) {
    //     this.create('component', name, config);
    // }

    // /**
    //  * Очищает все компоненты
    //  */
    // clearComponents() {
    //     this.clear('component');
    // }
}

export default ComponentManager
