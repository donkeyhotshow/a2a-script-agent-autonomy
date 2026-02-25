
const { SystemInfoCollector } = require('../index');
const os = require('os');
const { execSync } = require('child_process');

// Мок-объект для globalLogger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
};

// Мокируем os и child_process для изоляции тестов
jest.mock('os');
jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

describe('SystemInfoCollector', () => {
    let collector;

    beforeEach(() => {
        collector = new SystemInfoCollector(mockLogger);
        jest.clearAllMocks();
    });

    describe('getOSInfo', () => {
        test('should return correct OS information', () => {
            os.platform.mockReturnValue('win32');
            os.type.mockReturnValue('Windows_NT');
            os.release.mockReturnValue('10.0.19045');
            os.arch.mockReturnValue('x64');

            const osInfo = collector.getOSInfo();
            expect(osInfo).toEqual({
                platform: 'win32',
                type: 'Windows_NT',
                release: '10.0.19045',
                arch: 'x64',
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Collecting OS information.');
        });
    });

    describe('getCPUInfo', () => {
        test('should return correct CPU information', () => {
            os.cpus.mockReturnValue([
                { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz', speed: 3700, times: {} },
                { model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz', speed: 3700, times: {} },
            ]);

            const cpuInfo = collector.getCPUInfo();
            expect(cpuInfo).toEqual({
                model: 'Intel(R) Core(TM) i7-8700K CPU @ 3.70GHz',
                cores: 2,
                speed: 3700,
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Collecting CPU information.');
        });

        test('should handle no CPU information gracefully', () => {
            os.cpus.mockReturnValue([]);
            const cpuInfo = collector.getCPUInfo();
            expect(cpuInfo).toEqual({
                model: 'N/A',
                cores: 0,
                speed: 0,
            });
            expect(mockLogger.warn).toHaveBeenCalledWith('No CPU information available.');
        });
    });

    describe('getMemoryInfo', () => {
        test('should return correct memory information', () => {
            os.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16 GB
            os.freemem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8 GB

            const memInfo = collector.getMemoryInfo();
            expect(memInfo).toEqual({
                total: '16.00 GB',
                free: '8.00 GB',
                used: '8.00 GB',
            });
            expect(mockLogger.debug).toHaveBeenCalledWith('Collecting memory information.');
        });
    });

    describe('getDiskInfo', () => {
        test('should return correct disk information on Windows', () => {
            os.platform.mockReturnValue('win32');
            execSync.mockReturnValueOnce(
                '  Filesystem      Size  Used Avail Use% Mounted on\nC:\\      100G  50G   50G  50% /\n'
            );

            const diskInfo = collector.getDiskInfo();
            expect(diskInfo).toEqual([
                {
                    filesystem: 'C:\\',
                    size: '100G',
                    used: '50G',
                    avail: '50G',
                    use_percentage: '50%',
                    mounted_on: '/',
                },
            ]);
            expect(mockLogger.debug).toHaveBeenCalledWith('Collecting disk information.');
            expect(execSync).toHaveBeenCalledWith('wmic logicaldisk get Caption,Size,Freespace', { encoding: 'utf8' });
        });

        test('should return correct disk information on Linux/macOS', () => {
            os.platform.mockReturnValue('linux');
            execSync.mockReturnValueOnce(
                'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/sda1       10000000 5000000   5000000  50% /\n'
            );

            const diskInfo = collector.getDiskInfo();
            expect(diskInfo).toEqual([
                {
                    filesystem: '/dev/sda1',
                    size: '10000000',
                    used: '5000000',
                    avail: '5000000',
                    use_percentage: '50%',
                    mounted_on: '/',
                },
            ]);
            expect(mockLogger.debug).toHaveBeenCalledWith('Collecting disk information.');
            expect(execSync).toHaveBeenCalledWith('df -kP', { encoding: 'utf8' });
        });

        test('should handle errors during disk info collection', () => {
            os.platform.mockReturnValue('linux');
            execSync.mockImplementationOnce(() => {
                throw new Error('Mock df error');
            });

            const diskInfo = collector.getDiskInfo();
            expect(diskInfo).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error collecting disk information'));
        });
    });
});
