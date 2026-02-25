<?php

declare(strict_types=1);

namespace App\Search;

interface SearchAlgorithmInterface
{
    /**
     * Возвращает описание алгоритма
     */
    public function getDescription(): string;

    /**
     * Индексирует документы для последующего поиска
     *
     * @param array<string, string> $documents Массив документов, где ключ - путь к файлу, значение - содержимое
     */
    public function indexDocuments(array $documents): void;

    /**
     * Выполняет поиск по индексированным документам
     *
     * @param string $query Поисковый запрос
     * @param int $limit Максимальное количество результатов
     * @return array<array{
     *     path: string,
     *     relevance: float,
     *     matches: array<array{
     *         field: string,
     *         value: string,
     *         context: string
     *     }>,
     *     tags: array{
     *         keywords: array<string>,
     *         description: string
     *     }
     * }>
     */
    public function search(string $query, int $limit = 5): array;

    /**
     * Сохраняет модель в файл
     *
     * @param string $path Путь к файлу для сохранения
     */
    public function saveModel(string $path): void;

    /**
     * Загружает модель из файла
     *
     * @param string $path Путь к файлу с моделью
     */
    public function loadModel(string $path): void;

    /**
     * Возвращает название алгоритма
     *
     * @return string
     */
    public function getName(): string;

    /**
     * Возвращает параметры алгоритма
     *
     * @return array
     */
    public function getParameters(): array;

    /**
     * Устанавливает параметры алгоритма
     *
     * @param array $parameters
     * @return void
     */
    public function setParameters(array $parameters): void;
} 