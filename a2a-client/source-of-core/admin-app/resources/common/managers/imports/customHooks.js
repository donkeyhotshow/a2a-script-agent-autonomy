// async function handleAction(actionConfig, component, instance, event) {
//     if (!actionConfig || !actionConfig.action) {
//         consoleUtils.warn("Action config или action name отсутствуют:", actionConfig);
//         return;
//     }

//     const actionName = actionConfig.action;
//     const target = actionConfig.target;
//     const actionParams = actionConfig.params || {};
//     const actionValue = actionConfig.value || null;
//     const actionClass = actionConfig.class || null;

//     switch (actionName) {
//         case 'changeAttribute':
//             // merge with new code
//             break;
//         case 'toggleClass':
//             toggleClassAction(target, actionClass, event);
//             break;
//         case 'copyToClipboard':
//             await copyToClipboardAction(target, instance);
//             break;
//         case 'emitEvent':
//             emitEventAction(actionParams, actionValue, instance);
//             break;
//         case 'log':
//             logAction(actionParams);
//             break;
//         case 'sendData':
//             alert("sendData111");
//             break;
//         case 'submitForm':
//             submitFormAction(actionParams, instance);
//             break;
//         case 'navigateTo':
//             navigateToAction(actionParams, instance);
//             break;

//         default:
//             consoleUtils.warn(`Неизвестное действие: ${actionName}`);
//     }
// }


// function toggleClassAction(targetSelector, className, event) {
//     const targetElement = resolveTargetElement(targetSelector, event);
//     if (targetElement && className) {
//         targetElement.classList.toggle(className);
//     } else {
//         consoleUtils.warn(`Не удалось найти элемент "${targetSelector}" или отсутствует класс для toggleClass действия.`);
//     }
// }

// async function copyToClipboardAction(target, instance) {
//     const textToCopy = resolveTargetValue(target, instance);
//     if (textToCopy !== null) {
//         errorUtils.safeExecute(async () => {

//             await navigator.clipboard.writeText(textToCopy);
//             instance.$toast.add({
//                 severity: 'success',
//                 summary: 'Скопировано',
//                 detail: 'Текст скопирован в буфер обмена',
//                 life: 3000
//             });
//         
const { validationUtils } = require('@libs/validation/validation/validation-utils');
const { errorUtils } = require('@libs/error-management/error-handler/error-utils');
const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
}, 'err'));
//         }
//     } else {
//         consoleUtils.warn(`Значение цели "${target}" отсутствует или неопределено для copyToClipboard действия.`);
//     }
// }

// function emitEventAction(params, value, instance) {
//     if (params && params.eventName) {
//         instance.virtualEmit(params.target, 'VIRTUAL_EMIT', {action: params.eventName, data: value});
//     } else {
//         consoleUtils.warn(`Имя события отсутствует для emitEvent действия.`);
//     }
// }

// function logAction(logParams) {
//     consoleUtils.log('Log Action:', logParams);
// }

// function submitFormAction(params, instance) {
//     if (params && params.formName) {
//         instance.hub.formManager.submit(params.formName);
//     } else {
//         consoleUtils.warn(`Имя формы отсутствует для submitForm действия.`);
//     }
// }
//         case 'navigateTo':
//             navigateToAction(actionParams, instance);
//             break;
// function navigateToAction(params, instance) {
//     if (params && params.route) {
//         instance.$inertia.visit(params.route);
//     } else {
//         consoleUtils.warn(`Маршрут отсутствует для navigateTo действия.`);
//     }
// }

// function resolveTargetElement(targetSelector, event) {
//     if (targetSelector === 'parent') {
//         return event.target.parentElement;
//     } else if (targetSelector.startsWith('query:')) {
//         const query = targetSelector.slice(6);
//         return event.target.closest(query) || document.querySelector(query);
//     }

//     return null;
// }

// function resolveTargetValue(target, instance) {
//     if (validationUtils.isString(target )) {
//         if (target.startsWith('forms.')) {
//             const path = target.substring(6);
//             return getFormValueByPath(instance.$form.getFormData(), path);
//         } else if (target.startsWith('props.')) {
//             const path = target.substring(6);
//             return getPropValueByPath(instance, path);
//         }
//     }

//     return null;
// }

// function getFormValueByPath(formData, path) {
//     if (!formData) return null;
//     const pathParts = path.split('.');
//     let current = formData;
//     for (const part of pathParts) {
//         if (current && current.hasOwnProperty(part)) {
//             current = current[part];
//         } else {
//             return null;
//         }
//     }
//     return current;
// }

// function getPropValueByPath(instance, path) {
//     const pathParts = path.split('.');
//     let current = instance.$props;
//     for (const part of pathParts) {
//         if (current && current.hasOwnProperty(part)) {
//             current = current[part];
//         } else {
//             return null;
//         }
//     }
//     return current;
// }




