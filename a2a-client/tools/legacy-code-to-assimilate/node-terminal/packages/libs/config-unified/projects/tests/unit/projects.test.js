import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectsConfigManager } from '../index.cjs';
import path from 'path';
import fs from 'fs/promises';

const testConfigPath = path.join(__dirname, 'temp-config.json');
const testSchemaPath = path.join(__dirname, '..\schema.json');

// Mock the fs module to prevent actual file system operations during tests
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  const mockFs = {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(() => Promise.resolve()), // Assume file always exists
  };
  return mockFs;
});

describe('ProjectsConfigManager', () => {
  let manager;
  let mockConfig;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfig = {
      projects: [
        { id: 'p1', name: 'Project Alpha', status: 'active', priority: 60, startDate: '2024-01-01' },
        { id: 'p2', name: 'Project Beta', status: 'on-hold', priority: 80, startDate: '2024-03-15' },
      ],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Test projects config'
      }
    };
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    fs.writeFile.mockResolvedValue(undefined);

    manager = new ProjectsConfigManager(testConfigPath, testSchemaPath, true);
    await manager.loadConfig(); // Load initial config
  });

  it('should return all projects', async () => {
    const projects = await manager.getAllProjects();
    expect(projects).toEqual(mockConfig.projects);
  });

  it('should return a project by ID', async () => {
    const project = await manager.getProject('p1');
    expect(project).toEqual(mockConfig.projects[0]);
  });

  it('should return null if project not found', async () => {
    const project = await manager.getProject('nonexistent');
    expect(project).toBeNull();
  });

  it('should add a new project', async () => {
    const newProject = { id: 'p3', name: 'Project Gamma', status: 'active', priority: 70, startDate: '2024-05-01' };
    await manager.addProject(newProject);

    const configAfterAdd = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterAdd.projects).toHaveLength(3);
    expect(configAfterAdd.projects[2]).toEqual(expect.objectContaining({ ...newProject, created: expect.any(String) }));
  });

  it('should throw error if adding duplicate project ID', async () => {
    const duplicateProject = { id: 'p1', name: 'Project Alpha Clone', status: 'active', priority: 60, startDate: '2024-01-01' };
    await expect(manager.addProject(duplicateProject)).rejects.toThrow('Project with ID p1 already exists.');
  });

  it('should update an existing project', async () => {
    const updates = { name: 'New Project Alpha', priority: 90 };
    const updatedProject = await manager.updateProject('p1', updates);

    expect(updatedProject).toEqual(expect.objectContaining({ ...mockConfig.projects[0], ...updates, updated: expect.any(String) }));
    const configAfterUpdate = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterUpdate.projects[0]).toEqual(expect.objectContaining({ ...mockConfig.projects[0], ...updates, updated: expect.any(String) }));
  });

  it('should throw error if updating non-existent project', async () => {
    const updates = { name: 'nonexistent' };
    await expect(manager.updateProject('nonexistent', updates)).rejects.toThrow('Project with ID nonexistent not found.');
  });

  it('should delete a project', async () => {
    await manager.deleteProject('p1');

    const configAfterDelete = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterDelete.projects).toHaveLength(1);
    expect(configAfterDelete.projects[0].id).toBe('p2');
  });

  it('should throw error if deleting non-existent project', async () => {
    await expect(manager.deleteProject('nonexistent')).rejects.toThrow('Project with ID nonexistent not found.');
  });
});

