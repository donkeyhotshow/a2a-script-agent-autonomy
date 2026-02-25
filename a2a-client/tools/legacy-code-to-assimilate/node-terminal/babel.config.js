module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    node: 'current',
                },
            },
        ],
    ],
    plugins: [
        // Добавляем поддержку import.meta.url
        ['@babel/plugin-syntax-import-meta'],
    ],
};
