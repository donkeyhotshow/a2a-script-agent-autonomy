<template>
  <!--   <DataTable v-bind="component.props" :value="component.data">
    <template v-for="(col, index) in component.columns" :key="index">
      <Column :field="col.field" :header="col.header" />
    </template>
  </DataTable> -->
  <div class="card">
    <DataTable
      v-model:expandedRows="expandedRows"
      :filters="filters"
      :metaKeySelection="metaKeySelection"
      :paginator="paginator"
      :responsiveLayout="'scroll'"
      :rows="rows"
      :selection="selectedProduct"
      :selectionMode="selectionMode"
      :sortField="sortField"
      :sortOrder="sortOrder"
      :value="products"
      dataKey="id"
      tableStyle="min-width: 60rem"
      @rowCollapse="onRowCollapse"
      @rowExpand="onRowExpand"
      @rowSelect="onRowSelect"
      @rowUnselect="onRowUnselect"
    >
      <template #header>
        <div class="flex flex-wrap justify-end gap-2">
          <Button icon="pi pi-plus" label="Expand All" text @click="expandAll" />
          <Button icon="pi pi-minus" label="Collapse All" text @click="collapseAll" />
        </div>
      </template>

      <!-- Expander Column -->
      <Column expander style="width: 5rem" />

      <!-- Dynamic Columns -->
      <template v-for="(col, index) in component.columns" :key="index">
        <Column
          v-if="!col.children"
          :field="col.field"
          :filter="col.filter"
          :filterMatchMode="col.filterMatchMode"
          :header="col.header"
          :headerStyle="col.headerStyle"
          :sortable="col.sortable"
          :sortableOrder="col.sortOrder"
          :style="col.style"
        >
          <template #body="slotProps">
            <component
              :is="getColumnComponent(col)"
              :data="slotProps.data"
              v-bind="col.bodyProps"
            >
              {{ col.template ? col.template(slotProps.data) : slotProps.data[col.field] }}
            </component>
          </template>
        </Column>
      </template>

      <!-- Expansion Template -->
      <template #expansion="slotProps">
        <div class="p-4">
          <h5>Details for {{ slotProps.data.name }}</h5>
          <DataTable :value="slotProps.data.details" dataKey="detailId">
            <Column field="detailName" filter header="Detail Name" sortable />
            <Column field="detailValue" filter header="Detail Value" sortable />
          </DataTable>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script>
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Rating from 'primevue/rating'


export default {
  name: 'CustomDataTable',
  components: {
    DataTable,
    Column,
    Button,
    Tag,
    Rating,
  },
  props: {
    component: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      products: [],
      expandedRows: {},
      selectedProduct: null,
      selectionMode: 'single',
      metaKeySelection: false,
      filters: {},
      paginator: true,
      rows: 10,
      sortField: null,
      sortOrder: null,
    }
  },
  mounted() {


  },
  methods: {
    onRowExpand(event) {
      this.$toast.add({ severity: 'info', summary: 'Row Expanded', detail: event.data.name, life: 3000 })
    },
    onRowCollapse(event) {
      this.$toast.add({ severity: 'success', summary: 'Row Collapsed', detail: event.data.name, life: 3000 })
    },
    onRowSelect(event) {
      this.$toast.add({ severity: 'info', summary: 'Row Selected', detail: `Name: ${event.data.name}`, life: 3000 })
    },
    onRowUnselect(event) {
      this.$toast.add({ severity: 'warn', summary: 'Row Unselected', detail: `Name: ${event.data.name}`, life: 3000 })
    },
    expandAll() {
      this.expandedRows = this.products.reduce((acc, product) => {
        acc[product.id] = true
        return acc
      }, {})
    },
    collapseAll() {
      this.expandedRows = {}
    },
    getColumnComponent(col) {
      switch (col.type) {
      case 'Tag':
        return 'Tag'
      case 'Rating':
        return 'Rating'
      default:
        return 'span'
      }
    },
    formatCurrency(value) {
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    },
    getSeverity(product) {
      switch (product.inventoryStatus) {
      case 'INSTOCK':
        return 'success'
      case 'LOWSTOCK':
        return 'warn'
      case 'OUTOFSTOCK':
        return 'danger'
      default:
        return null
      }
    },
  },
}
</script>

<style scoped>
.card {
  padding: 1rem;
}
</style>


