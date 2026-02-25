module.exports = {
    testRegex: 'tests/js/.*Test.js$',
    rootDir: '.',
    transform: {
        '^.+\\.m?[jt]sx?$': 'babel-jest',
        '^.+\\.vue$': 'vue-jest', // Transform .vue files
        '^.+\\.js$': 'babel-jest',  // Transform .js files
    },
    moduleFileExtensions: ['js', 'jsx', 'json', 'vue'],
    moduleNameMapper: {
        '^@common/(.*)$': '<rootDir>/resources/common/$1',
        '^@assets/(.*)$': '<rootDir>/resources/assets/$1',
        // '^@/(.*)$': '<rootDir>/resources/backend/js/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/tests/__mocks__/fileMock.js',
        '\\.(json)$': 'identity-obj-proxy',
    },
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    transformIgnorePatterns: ['/node_modules/'],
    testEnvironment: 'jsdom',
}
// module.exports = {
//     preset: '@vue/cli-plugin-unit-jest/presets/no-babel',
//     testEnvironment: 'jsdom',
//     transform: {
//         '^.+\\.vue$': 'vue-jest',
//         '^.+\\.js$': 'babel-jest'
//     },
//     moduleFileExtensions: ['js', 'json', 'vue', 'ts'],
//     collectCoverage: true,
//     coverageReporters: ['html', 'text-summary'],
// };

// module.exports = {
//     preset: '@vue/cli-plugin-unit-jest',
//     testEnvironment: 'jsdom',
//     transform: {
//         '^.+\\.vue$': '@vue/vue3-jest',
//         '^.+\\.js$': 'babel-jest'
//     },
//     moduleFileExtensions: ['js', 'json', 'vue']
// };
