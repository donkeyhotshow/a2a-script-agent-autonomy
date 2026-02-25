<template>
  <div>
    <Dialog
      v-model:visible="visible"
      :modal="true"
      :visible="visible"
      @hide="closeDialog"
    >
      <div class="flex flex-col gap-4">
        <div v-for="(field, index) in fields || []" :key="index" class="dialog-field">
          <RenderJson
            v-model="boundModels[field.model.field]"
            :component="field"
          />
        </div>
        <div class="dialog-actions">
          <Button
            v-for="(action, index) in actions || []"
            :key="index"
            :type="action.type || 'button'"
            v-bind="action.props"
            @click.prevent="handleAction(action)"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script>
import { Button, Dialog } from 'primevue'
import { defineAsyncComponent, reactive } from 'vue'

export default {
  name: 'UniDialog',
  inject: ['hub'],
  components: {
    Button,
    Dialog,
    RenderJson: defineAsyncComponent(() => import('../../../../common/js/Elements/RenderJson.vue')),
  },
  data() {
    return {
      visible: false,
      fields: [],
      actions: [],
      type: null,
      boundModels: reactive({}),
      modalId: null,
    }
  },
  created() {
    this.initializeEventListeners()
    this.registerFormFields()
  },
  computed: {
    // componentProps() {
    //   return this.hub.propsManager.bindModel({
    //     fields: this.fields,
    //     actions: this.actions
    //   }, this.boundModels);
    // }
  },
  methods: {
    // openDialog(dialogConfig) {
    //   this.fields = dialogConfig.fields || [];
    //   this.actions = dialogConfig.actions || [];
    //   this.type = dialogConfig.type || 'default';
    //   this.boundModels = reactive({});
    //   console.log('!!!openDialog boundModels :', boundModels);
    //   this.registerFormFields();

    //   // this.modalId = this.hub.modalManager.show(this.type, {
    //   //   fields: this.fields,
    //   //   actions: this.actions,
    //   //   boundModels: this.boundModels
    //   // });
    //   this.visible = true;
    // },
    // onFieldChange(model, value) {
    //   alert('!!!onFieldChange model :'+model+' value :'+value);
    //   this.boundModels[model] = value;
    // },
    initializeEventListeners() {
      this.hub.notifyManager.on('dialogOpened', this.handleDialogOpen)
    },

    handleDialogOpen(data) {
      this.type = data.type || 'dialog'
      this.fields = data.fields || []
      this.actions = data.actions || []
      this.boundModels = reactive({})
      this.hub.debug('UniDialog', 'handleDialogOpen', `handleDialogOpen boundModels :`, this.boundModels)
      this.registerFormFields()

      // this.modalId = this.hub.modalManager.show(this.type, {
      //   fields: this.fields,
      //   actions: this.actions,
      //   boundModels: this.boundModels
      // });

      this.visible = true
    },
    handleAction(action) {
      this.hub.debug('UniDialog', 'handleAction', `Handling action:`, action)
      if (!action.props.action) return

      // Delegate action handling to ActionManager
      this.hub.actionManager.sendData({
        action: action.props.sendTo,
        payload: this.boundModels,
      })

      // If the action is 'submitForm', call submitForm method
      if (action.props.action === 'submitForm') {
        this.hub.actionManager.submitForm({ form: action.props.form })
      }

      this.closeDialog()
    },
    closeDialog() {
      this.visible = false
      this.hub.notifyManager.emit('DIALOG_CLOSE', { dialog: this.type })
    },
    registerFormFields() {
      this.fields.forEach((field) => {
        if (field.model && field.model.field) {
          const formName = field.model.form || null
          this.hub.formManager.registerForm(formName)
          this.hub.formManager.registerField(formName, field.model.field)
          // Initialize boundModels using FormManager
          this.boundModels[field.model.field] = this.hub.formManager.getData(formName)[field.model.field] || ''
        }
      })
    },
  },
}
</script>

<style scoped>
.dialog-field {
  /* Ваши стили для полей диалога */
}

.dialog-actions {
  /* Ваши стили для действий диалога */
}
</style>
