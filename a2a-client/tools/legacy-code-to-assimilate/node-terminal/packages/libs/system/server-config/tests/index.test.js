const { readDisabledFromConfig } = require('../index.cjs');

describe('readDisabledFromConfig', () => {
  let mockFileUtils;
  let mockPathUtils;

  beforeEach(() => {
    mockFileUtils = {
      readFileSync: jest.fn(),
      existsSync: jest.fn(),
    };
    mockPathUtils = {
      join: jest.fn((...args) => args.join('/')),
    };
  });

  test('should return an empty array by default if no config is found', () => {
    mockFileUtils.existsSync.mockReturnValue(false);
    const result = readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(result).toEqual([]);
    expect(mockFileUtils.existsSync).toHaveBeenCalled();
    expect(mockFileUtils.readFileSync).not.toHaveBeenCalled();
  });

  test('should return an empty array if config file exists but is empty/invalid', () => {
    mockFileUtils.existsSync.mockReturnValue(true);
    mockFileUtils.readFileSync.mockReturnValue(''); // Empty content
    const result = readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(result).toEqual([]);
    expect(mockFileUtils.existsSync).toHaveBeenCalled();
    expect(mockFileUtils.readFileSync).toHaveBeenCalled();
  });

  test('should return an empty array if config file exists but contains non-array JSON', () => {
    mockFileUtils.existsSync.mockReturnValue(true);
    mockFileUtils.readFileSync.mockReturnValue(JSON.stringify({ someKey: 'someValue' }));
    const result = readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(result).toEqual([]);
    expect(mockFileUtils.existsSync).toHaveBeenCalled();
    expect(mockFileUtils.readFileSync).toHaveBeenCalled();
  });

  test('should return disabled tools from config file if valid', () => {
    const disabledTools = ['tool1', 'tool2'];
    mockFileUtils.existsSync.mockReturnValue(true);
    mockFileUtils.readFileSync.mockReturnValue(JSON.stringify(disabledTools));
    const result = readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(result).toEqual(disabledTools);
    expect(mockFileUtils.existsSync).toHaveBeenCalled();
    expect(mockFileUtils.readFileSync).toHaveBeenCalled();
  });

  test('should handle errors during file read gracefully', () => {
    mockFileUtils.existsSync.mockReturnValue(true);
    mockFileUtils.readFileSync.mockImplementation(() => {
      throw new Error('File read error');
    });
    const result = readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(result).toEqual([]);
  });

  test('should use pathUtils.join to construct config path', () => {
    mockFileUtils.existsSync.mockReturnValue(false);
    readDisabledFromConfig(mockFileUtils, mockPathUtils);
    expect(mockPathUtils.join).toHaveBeenCalledWith(expect.any(String), 'config', 'disabled-tools.json');
  });
});
