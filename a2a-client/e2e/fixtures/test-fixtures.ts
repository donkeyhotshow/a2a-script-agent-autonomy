import { test as base, Page, BrowserContext, Route } from '@playwright/test';

/**
 * Custom test fixtures for A2A Client E2E tests
 * Supports new promise-based protocol
 */

// API mock data types
export interface Project {
  id: string;
  name: string;
  path: string;
  serverUrl?: string;
  stats?: {
    filesCount: number;
    sessionsCount: number;
  };
  indexStatus?: string;
}

export interface Session {
  id: string;
  status: 'active' | 'waiting' | 'completed';
  messages: Message[];
  createdAt?: string;
}

export interface Message {
  id?: string;
  role: 'user' | 'server';
  content: string;
  pending?: boolean;
  promiseId?: string;
}

export interface FileItem {
  path: string;
  content?: string;
}

// Promise-based protocol types
export interface PromiseResponse {
  promiseId: string;
  status: 'pending' | 'completed' | 'failed';
  result?: Message;
  error?: string;
}

// Mock API responses
export const mockApiResponses = {
  status: { status: 'ok', indexStatus: 'ready' },
  
  emptyProjects: { data: { projects: [] } },
  
  sampleProjects: {
    data: {
      projects: [
        {
          id: 'proj-1',
          name: 'Test Project',
          path: '/test/project',
          serverUrl: 'http://localhost:3000/api/v1',
          stats: { filesCount: 42, sessionsCount: 5 },
          indexStatus: 'built'
        },
        {
          id: 'proj-2',
          name: 'Another Project',
          path: '/another/path',
          stats: { filesCount: 10, sessionsCount: 2 },
          indexStatus: 'pending'
        }
      ] as Project[]
    }
  },
  
  emptySessions: { sessions: [] },
  
  sampleSessions: {
    sessions: [
      {
        id: 'sess-1',
        status: 'active',
        messages: [
          { id: 'msg-1', role: 'user' as const, content: 'Hello' },
          { id: 'msg-2', role: 'server' as const, content: 'Hi there!' }
        ],
        createdAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'sess-2',
        status: 'waiting' as const,
        messages: [
          { id: 'msg-3', role: 'user' as const, content: 'Task in progress...', pending: true, promiseId: 'promise-123' }
        ],
        createdAt: '2024-01-15T11:00:00Z'
      }
    ] as Session[]
  },
  
  newProject: { id: 'proj-new', name: 'New Project', path: '/new/path' },
  
  newSession: { session_id: 'sess-new', status: 'active', messages: [] },
  
  files: {
    files: [
      'src/index.js',
      'src/app.js',
      'src/utils.js',
      'package.json',
      'README.md'
    ]
  },
  
  fileContent: { content: '// Sample file content\nconsole.log("Hello");' },
  
  success: { success: true },
  
  // Promise-based protocol responses
  promiseCreated: { promiseId: 'promise-test-123', status: 'pending' },
  
  promisePending: { promiseId: 'promise-test-123', status: 'pending' },
  
  promiseCompleted: (content: string = 'Server response') => ({
    promiseId: 'promise-test-123',
    status: 'completed',
    result: {
      id: 'msg-server-1',
      role: 'server' as const,
      content
    }
  }),
  
  promiseFailed: { promiseId: 'promise-test-123', status: 'failed', error: 'Processing error' }
};

// Store for promise states (for simulating async processing)
const promiseStore = new Map<string, { status: string; result?: Message; error?: string }>();

// Helper to setup API mocks with promise-based protocol
export async function setupApiMocks(page: Page, options: {
  projects?: Project[];
  sessions?: Session[];
  files?: string[];
  connected?: boolean;
  usePromiseProtocol?: boolean;
} = {}) {
  const {
    projects = [],
    sessions = [],
    files = [],
    connected = true,
    usePromiseProtocol = true
  } = options;

  // Status endpoint
  await page.route('**/api/status', (route: Route) => {
    route.fulfill({
      status: connected ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(connected ? mockApiResponses.status : { error: 'Not connected' })
    });
  });

  // Projects endpoints
  await page.route('**/api/projects', (route: Route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { projects } })
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'proj-new', ...body })
      });
    }
  });

  // Single project endpoints
  await page.route('**/api/projects/*', (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/projects\/([^/]+)/);
    const projectId = match ? match[1] : null;
    
    if (route.request().method() === 'DELETE') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.success)
      });
    } else if (route.request().method() === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.success)
      });
    } else {
      const project = projects.find(p => p.id === projectId);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(project || {})
      });
    }
  });

  // Project select endpoint
  await page.route('**/api/projects/*/select', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.success)
    });
  });

  // Project index endpoint
  await page.route('**/api/projects/*/index', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.success)
    });
  });

  // Sessions endpoints
  await page.route('**/api/sessions*', (route: Route) => {
    const url = route.request().url();
    
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const sessionId = 'sess-new-' + Date.now();
      
      if (usePromiseProtocol) {
        // Return promiseId for session creation
        const promiseId = 'promise-sess-' + Date.now();
        promiseStore.set(promiseId, { status: 'completed', result: { id: sessionId, role: 'server', content: 'Session created' } });
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ promiseId, session_id: sessionId, status: 'active' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.newSession)
        });
      }
    } else {
      // GET with query params
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions })
      });
    }
  });

  // Single session endpoint
  await page.route('**/api/sessions/*', (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/sessions\/([^/]+)/);
    const sessionId = match ? match[1] : null;
    const session = sessions.find(s => s.id === sessionId);
    
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session || { id: sessionId, status: 'active', messages: [] })
    });
  });

  // Session messages endpoint - with promise protocol support
  await page.route('**/api/sessions/*/messages', (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      
      if (usePromiseProtocol) {
        // Return promiseId instead of immediate result
        const promiseId = 'promise-msg-' + Date.now();
        promiseStore.set(promiseId, { status: 'pending' });
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ promiseId, status: 'pending' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.success)
        });
      }
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages: [] })
      });
    }
  });

  // Session continue endpoint
  await page.route('**/api/sessions/*/continue', (route: Route) => {
    if (usePromiseProtocol) {
      const promiseId = 'promise-continue-' + Date.now();
      promiseStore.set(promiseId, { status: 'pending' });
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ promiseId, status: 'pending' })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.success)
      });
    }
  });

  // Promise endpoint - for polling results
  await page.route('**/api/promises/*', (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/api\/promises\/([^/]+)/);
    const promiseId = match ? match[1] : null;
    
    const promiseData = promiseStore.get(promiseId || '');
    
    if (promiseData) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          promiseId,
          status: promiseData.status,
          result: promiseData.result,
          error: promiseData.error
        })
      });
    } else {
      // Default: return pending status
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ promiseId, status: 'pending' })
      });
    }
  });

  // Session updates endpoint
  await page.route('**/api/sessions/*/updates', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [], status: 'active' })
    });
  });

  // Files endpoint
  await page.route('**/api/files', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ files })
    });
  });

  // Single file endpoint
  await page.route('**/api/files/**', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.fileContent)
    });
  });

  // Chat endpoint
  await page.route('**/api/chat', (route: Route) => {
    if (usePromiseProtocol) {
      const promiseId = 'promise-chat-' + Date.now();
      promiseStore.set(promiseId, { status: 'pending' });
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ promiseId, status: 'pending' })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.success)
      });
    }
  });

  // Index build endpoint
  await page.route('**/api/index/build', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockApiResponses.success)
    });
  });

  // Project endpoint (current)
  await page.route('**/api/project', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(projects[0] || {})
    });
  });
}

// Helper to simulate promise completion
export async function completePromise(page: Page, promiseId: string, result: Message) {
  promiseStore.set(promiseId, { status: 'completed', result });
}

// Helper to simulate promise failure
export async function failPromise(page: Page, promiseId: string, error: string) {
  promiseStore.set(promiseId, { status: 'failed', error });
}

// Helper to get promise state
export function getPromiseState(promiseId: string) {
  return promiseStore.get(promiseId);
}

// Clear promise store
export function clearPromiseStore() {
  promiseStore.clear();
}

// Extend base test with custom fixtures
export const test = base.extend<{
  mockPage: Page;
}>({
  mockPage: async ({ page }, use) => {
    // Setup default mocks
    await setupApiMocks(page);
    await use(page);
  }
});

export { expect } from '@playwright/test';
