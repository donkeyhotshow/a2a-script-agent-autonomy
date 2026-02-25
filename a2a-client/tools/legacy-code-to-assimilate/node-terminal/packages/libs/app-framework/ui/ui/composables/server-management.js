import { ref, computed } from 'vue';

/**
 * Server Management Composable
 * Provides server management functionality
 */
export function useServerManagement() {
  const servers = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const serverCount = computed(() => servers.value.length);

  const activeServers = computed(() =>
    servers.value.filter(server => server.status === 'running')
  );

  const fetchServers = async () => {
    loading.value = true;
    error.value = null;
    try {
      // Placeholder for server fetching logic
      // servers.value = await apiClient.get('/api/servers');
      console.log('Fetching servers...');
    } catch (err) {
      error.value = err.message;
      console.error('Failed to fetch servers:', err);
    } finally {
      loading.value = false;
    }
  };

  const startServer = async (serverId) => {
    try {
      // Placeholder for server start logic
      console.log('Starting server:', serverId);
    } catch (err) {
      error.value = err.message;
      console.error('Failed to start server:', err);
    }
  };

  const stopServer = async (serverId) => {
    try {
      // Placeholder for server stop logic
      console.log('Stopping server:', serverId);
    } catch (err) {
      error.value = err.message;
      console.error('Failed to stop server:', err);
    }
  };

  return {
    servers,
    loading,
    error,
    serverCount,
    activeServers,
    fetchServers,
    startServer,
    stopServer
  };
}
