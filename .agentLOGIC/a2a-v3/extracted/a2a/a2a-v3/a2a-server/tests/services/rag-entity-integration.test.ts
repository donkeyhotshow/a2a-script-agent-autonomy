import {describe, it, expect} from 'vitest';
import {EntityFileScorer} from '../../src/services/rag/entity-file-scorer.js';
import {EntityContextAssembler} from '../../src/services/rag/entity-context-assembler.js';
import type {EntityQuery, FileScore, SearchResult} from '../../src/services/rag/types.js';
import type {
    RecognizedEntity,
    RecognitionResult,
} from '../../src/types/entity.types.js';

describe('EntityFileScorer', () => {
    it('boosts results that mention requested entities and relations', () => {
        const scorer = new EntityFileScorer();

        const sampleResults: SearchResult[] = [
            {
                id: 'user-model',
                filePath: 'app/Models/User.php',
                content: 'class User extends Model { public function posts() { return $this->hasMany(Post::class); } }',
                lineStart: 1,
                lineEnd: 22,
                score: 0.8,
            },
            {
                id: 'post-controller',
                filePath: 'app/Controllers/PostController.php',
                content: 'class PostController extends Controller { public function store() {} }',
                lineStart: 1,
                lineEnd: 16,
                score: 0.75,
            },
            {
                id: 'vue-component',
                filePath: 'resources/js/components/UserProfile.vue',
                content: '<script setup>defineProps({ user: Object });</script>',
                lineStart: 1,
                lineEnd: 8,
                score: 0.6,
            },
        ];

        const query: EntityQuery = {
            names: ['User', 'Post'],
            types: ['MODEL', 'CONTROLLER'],
            relations: ['hasMany'],
            filePatterns: ['*.php'],
            contextDepth: 3,
        };

        const scored = scorer.scoreFiles(sampleResults, query);

        expect(scored[0].file.filePath).toBe('app/Models/User.php');
        expect(scored[0].entityScore).toBeGreaterThan(0);
        expect(scored[0].relationshipScore).toBeGreaterThan(0);
        expect(scored[0].file.metadata?.entityScore).toBeDefined();
        expect(scored[0].file.metadata?.explanation).toContain('Score');
    });
});

describe('EntityContextAssembler', () => {
    const recognizedEntity: RecognizedEntity = {
        id: 'model-user',
        type: 'MODEL',
        name: 'User',
        path: 'app/Models/User.php',
    };

    const stubRecognizer = (): RecognitionResult => ({
        entities: [recognizedEntity],
        relations: [],
    });

    it('respects file and token limits while describing related files', () => {
        const assembler = new EntityContextAssembler(stubRecognizer);

        const scoredFiles: FileScore[] = [
            {
                file: {
                    id: 'user-file',
                    filePath: 'app/Models/User.php',
                    content: 'class User extends Model {}',
                    lineStart: 1,
                    lineEnd: 10,
                    score: 0.95,
                    metadata: {},
                },
                baseScore: 0.8,
                entityScore: 0.6,
                relationshipScore: 0.4,
                finalScore: 0.95,
            },
            {
                file: {
                    id: 'controller-file',
                    filePath: 'app/Controllers/PostController.php',
                    content: 'class PostController extends Controller {}',
                    lineStart: 1,
                    lineEnd: 8,
                    score: 0.75,
                    metadata: {},
                },
                baseScore: 0.7,
                entityScore: 0.3,
                relationshipScore: 0.1,
                finalScore: 0.75,
            },
            {
                file: {
                    id: 'request-file',
                    filePath: 'app/Http/Requests/PostRequest.php',
                    content: 'class PostRequest extends FormRequest {}',
                    lineStart: 1,
                    lineEnd: 12,
                    score: 0.65,
                    metadata: {},
                },
                baseScore: 0.6,
                entityScore: 0.25,
                relationshipScore: 0.05,
                finalScore: 0.65,
            },
        ];

        const enriched = assembler.assemble(scoredFiles, 2, 100);

        expect(enriched.length).toBe(2);
        expect(enriched[0].entities).toHaveLength(1);
        expect(enriched[0].entities[0].name).toBe('User');
        expect(enriched[0].relatedFiles).toContain('app/Controllers/PostController.php');
        expect(enriched[0].relatedFiles).not.toContain('app/Models/User.php');
        expect(enriched[0].relevanceExplanation).toContain('Final');
        expect(enriched[0].finalScore).toBeCloseTo(0.95, 3);
    });
});
