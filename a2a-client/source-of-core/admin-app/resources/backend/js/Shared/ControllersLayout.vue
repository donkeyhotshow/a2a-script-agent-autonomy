<template>
  <div :class="{ 'dark-mode': darkMode, 'sidebar-collapsed': isSidebarCollapsed }" class="installation-panel">
    <!-- Sidebar -->
    <aside :class="{ 'collapsed': isSidebarCollapsed }" class="sidebar">
      <div class="sidebar-header">
        <h2>System Navigation</h2>
      </div>
      <div v-if="!isSidebarCollapsed" class="sidebar-content">
        <!-- Teleport target for sidebar content -->
        <div id="sidebar-content">
          <!-- Default sidebar content if none is provided -->
          <nav class="navigation-menu">
            <div class="nav-group">
              <h3 class="nav-group-title">Dashboard</h3>
              <a class="nav-item" href="/panel">
                <i class="pi pi-home"></i>
                <span>Home</span>
              </a>
            </div>
          </nav>
        </div>
      </div>
      <button v-if="isSidebarCollapsed" class="sidebar-expand-btn" @click="toggleSidebar">
        <i class="pi pi-angle-right"></i>
      </button>
      <button v-else class="sidebar-collapse-btn" @click="toggleSidebar">
        <i class="pi pi-sign-out"></i>
      </button>
    </aside>
    <!-- Main Content Area -->
    <main class="main-content">
      <header class="header">
        <h1 class="title">
          <!-- Teleport target for header title -->
          <span id="header-title">Admin Dashboard</span>
        </h1>
        <div class="header-actions">
          <!-- Teleport target for header actions -->
          <div id="header-actions">
            <button class="toggle-btn" @click="toggleDarkMode">
              <i :class="darkMode ? 'pi pi-sun' : 'pi pi-moon'"></i>
              <span>{{ darkMode ? 'Light Mode' : 'Dark Mode' }}</span>
            </button>
          </div>
        </div>
      </header>

      <div class="content-container">
        <slot></slot>
      </div>

      <footer class="footer">
        <p>&copy; {{ new Date().getFullYear() }} Admin System</p>
        <p>JSON123 Path Editor модуль выполнен. Дополнить: unit-тесты, UI-оптимизацию и производительность запросов.</p>
      </footer>
    </main>
  </div>
  <Toast position="bottom-right" />
</template>

<script>
import Toast from 'primevue/toast'

export default {
  name: 'ControllersLayout',
  components: { Toast },
  data() {
    return {
      darkMode: false,
      isSidebarCollapsed: true,
    }
  },
  methods: {
    toggleDarkMode() {
      this.darkMode = !this.darkMode
    },
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed
    },
  },
}
</script>

<style lang="scss">
.installation-panel {
  @apply grid min-h-screen;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: "sidebar header" "sidebar content" "sidebar footer";
  background-color: #333;
  color: #f8f8f8;
  transition: grid-template-columns 0.3s ease;

  &.sidebar-collapsed {
    grid-template-columns: 50px 1fr;
  }
}

.sidebar {
  grid-area: sidebar;
  @apply bg-gray-800 p-5 border-r border-gray-600 overflow-y-auto transition-all duration-300;
  width: 250px;
  position: relative;

  &.collapsed {
    width: 50px;
    overflow: hidden;
  }
}

.sidebar-header h2 {
  @apply text-orange-500 text-xl font-semibold uppercase mb-4;
}

.sidebar-content {
  @apply p-2;
}

.navigation-menu {
  @apply space-y-4;
}

.nav-group-title {
  @apply text-gray-400 text-sm uppercase tracking-wider mb-2;
}

.nav-item {
  @apply flex items-center p-2 rounded text-gray-300 hover:bg-gray-700 transition-colors;

  i {
    @apply mr-2 text-gray-400;
  }
}

.main-content {
  grid-area: content;
  @apply p-5 bg-white text-black;
}

.header {
  grid-area: header;
  @apply bg-orange-500 p-5 flex justify-between items-center;
}

.title {
  @apply text-white text-2xl font-bold;
}

.header-actions {
  @apply flex items-center gap-2;
}

.content-container {
  @apply py-4;
}

.footer {
  grid-area: footer;
  @apply bg-gray-800 p-5 text-gray-400 text-center;
}

.dark-mode {
  @apply bg-gray-900 text-gray-100;
}

.dark-mode .sidebar {
  @apply bg-gray-900;
}

.dark-mode .main-content {
  @apply bg-gray-800 text-gray-100;
}

/* Common Component Styles */
.control-panel {
  @apply bg-gray-800 p-5 rounded;
}

.terminal {
  @apply bg-gray-800 p-5 rounded flex-grow;
}

.terminal-output {
  @apply bg-gray-900 p-3 rounded overflow-y-auto font-mono text-xs border h-72;
}

.terminal-output .success {
  @apply text-green-500;
}

.terminal-output .error {
  @apply text-red-500;
}

.terminal-output .info {
  @apply text-blue-500;
}

.dark-mode .control-panel {
  @apply bg-gray-900 text-gray-100;
}

.dark-mode .terminal {
  @apply bg-gray-900;
}

.dark-mode .terminal-output {
  @apply bg-gray-800;
}

/* Repository item hover behavior */
.repo-list li {
  @apply p-2 mb-1 bg-gray-700 rounded cursor-pointer transition-colors;
  position: relative;

  &:hover {
    @apply bg-gray-600;

    .repo-item-content {
      display: block;
    }
  }

  &.active {
    @apply bg-gray-500 border-l-4 border-orange-500;
  }
}

.repo-item-content {
  display: none;
  @apply mt-2 p-2 bg-gray-800 rounded;
}

/* Form Styles */
.grid-form {
  @apply grid gap-6 grid-cols-1 sm:grid-cols-2;
}

.form-group {
  @apply mb-4;
}

.p-float-label {
  @apply block relative;
}

.p-invalid {
  @apply border-red-500;
}

.p-error {
  @apply text-red-500 text-sm;
}

/* Buttons */
.toggle-btn {
  @apply bg-orange-600 text-white border-none py-2 px-4 rounded transition-colors flex items-center gap-2;

  &:hover {
    @apply bg-orange-700;
  }
}

.action-btn {
  @apply bg-orange-500 text-white border-none py-2 px-4 rounded transition-colors;

  &:hover {
    @apply bg-orange-600;
  }

  &:disabled {
    @apply bg-gray-400 cursor-not-allowed;
  }
}

/* Card styles */
.p-card {
  @apply rounded overflow-hidden shadow-md transition-all duration-300;

  &:hover {
    @apply shadow-lg;
  }

  .p-card-title {
    @apply text-lg font-semibold;
  }

  .p-card-content {
    @apply p-4;
  }
}

/* New styles for collapsed sidebar and expand button */
.sidebar-expand-btn {
  @apply absolute top-5 right-0 p-2 bg-orange-500 text-white rounded-full shadow cursor-pointer transition-colors;
  transform: translateX(25%);

  &:hover {
    @apply bg-orange-600;
  }
}

.sidebar.collapsed .sidebar-header h2,
.sidebar.collapsed .sidebar-content {
  display: none;
}

.sidebar.collapsed .sidebar-expand-btn {
  display: block;
}

.sidebar-collapse-btn {
  @apply absolute top-5 right-0 p-2 bg-orange-500 text-white rounded-full shadow cursor-pointer transition-colors;
  transform: translateX(25%);

  &:hover {
    @apply bg-orange-600;
  }
}
</style>
