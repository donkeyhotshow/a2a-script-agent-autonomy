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
  projectsFail?: boolean;
} = {}) {
  const {
    projects = [],
    sessions = [],
    files = [],
    connected = true,
    usePromiseProtocol = true,
    projectsFail = false
  } = options;

  // Status endpoint (legacy)
  await page.route('**/api/status', (route: Route) => {
    route.fulfill({
      status: connected ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(connected ? mockApiResponses.status : { error: 'Not connected' })
    });
  });

  // /api/a2a - Projects from .a2a-client (Storage)
  await page.route('**/api/a2a/projects', (route: Route) => {
    if (projectsFail && route.request().method() === 'GET') {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
      return;
    }
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects })
      });
    } else if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      const projList = body?.projects ?? projects;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, projects: projList })
      });
    }
  });

  await page.route('**/api/a2a/projects/*/data', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ index: { files }, files: [] })
    });
  });

  await page.route('**/api/a2a/projects/*/files/**', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: mockApiResponses.fileContent.content
    });
  });

  const sessionsForA2a = sessions.map(s => ({
    id: s.id,
    title: s.id,
    createdAt: s.createdAt
  }));
  await page.route('**/api/a2a/projects/*/sessions', (route: Route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessions: sessionsForA2a })
      });
    } else if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, session: { id: 'sess-new', messages: [] } })
      });
    }
  });

  await page.route('**/api/a2a/projects/*/sessions/*', (route: Route) => {
    const url = route.request().url();
    const match = url.match(/\/sessions\/([^/]+)/);
    const sess = sessions.find(s => s.id === (match?.[1] ?? ''));
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sess || { id: match?.[1], messages: [] })
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.success)
      });
    }
  });

  // /api/v1 - Server sessions (Sessions.js)
  const sessionsData = sessions.map(s => ({
    ...s,
    messages: s.messages?.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      contentText: m.content,
      status: m.pending ? 'pending' : 'completed',
      promiseId: m.promiseId
    })) ?? []
  }));
  await page.route('**/api/v1/sessions**', (route: Route) => {
    const url = route.request().url();
    const idMatch = url.match(/\/api\/v1\/sessions\/([^/?]+)/);
    
    if (route.request().method() === 'POST' && !idMatch) {
      const sessionId = 'sess-new-' + Date.now();
      const newSession = { id: sessionId, status: 'active', messages: [] };
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newSession })
      });
    } else if (route.request().method() === 'GET' && !idMatch) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: sessionsData })
      });
    } else if (idMatch) {
      const sessionId = idMatch[1];
      const session = sessionsData.find(s => s.id === sessionId) || { id: sessionId, status: 'active', messages: [] };
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: session })
      });
    }
  });

  // /api/v1/requests - promise-based protocol
  await page.route('**/api/v1/requests', (route: Route) => {
    if (route.request().method() === 'POST') {
      const promiseId = 'prm-' + Date.now();
      const result = { id: 'msg-srv-1', role: 'server' as const, content: 'Response' };
      promiseStore.set(promiseId, { status: 'pending' });
      setTimeout(() => {
        promiseStore.set(promiseId, { status: 'completed', result });
      }, 100);
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { promiseId } })
      });
    }
  });

  await page.route('**/api/v1/requests/*/status', (route: Route) => {
    const match = route.request().url().match(/\/requests\/([^/]+)\/status/);
    const promiseId = match?.[1] ?? '';
    const data = promiseStore.get(promiseId);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { status: data?.status ?? 'pending', result: data?.result, error: data?.error }
      })
    });
  });

  await page.route('**/api/v1/requests/*/result', (route: Route) => {
    const match = route.request().url().match(/\/requests\/([^/]+)\/result/);
    const promiseId = match?.[1] ?? '';
    const data = promiseStore.get(promiseId);
    const result = data?.result?.content ?? data?.result;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { result: result ?? 'Done' } })
    });
  });

  // Legacy /api/sessions/* (fallback)
  await page.route('**/api/sessions/*', (route: Route) => {
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
