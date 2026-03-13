import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../extension/audit/runAudit.js';

test('calculateScore', async (t) => {
    await t.test('calculates max score correctly', () => {
        const checks = {
            basicSEO: {
                title: { optimal: true, exists: true },
                metaDescription: { optimal: true, exists: true },
                h1: { optimal: true, exists: true },
                h2: { optimal: true, exists: true },
            },
            llmReadability: {
                llmFriendly: true,
                textContentLength: 1000,
            },
            structuredData: {
                jsonLd: { exists: true },
                openGraph: { exists: true },
                twitterCards: { exists: true },
            },
        };

        const result = calculateScore(checks);

        assert.equal(result.total, 100);
        assert.deepEqual(result.breakdown, {
            basicSEO: { score: 40, maxScore: 40 },
            llmReadability: { score: 30, maxScore: 30 },
            structuredData: { score: 30, maxScore: 30 },
        });
    });

    await t.test('calculates partial score when elements exist but are not optimal', () => {
        const checks = {
            basicSEO: {
                title: { optimal: false, exists: true },
                metaDescription: { optimal: false, exists: true },
                h1: { optimal: false, exists: true },
                h2: { optimal: false, exists: true },
            },
            llmReadability: {
                llmFriendly: false,
                textContentLength: 600, // > 500 triggers partial score
            },
            structuredData: {
                jsonLd: { exists: false },
                openGraph: { exists: true }, // +10
                twitterCards: { exists: false },
            },
        };

        const result = calculateScore(checks);

        assert.equal(result.total, 20 + 15 + 10); // 45
        assert.deepEqual(result.breakdown, {
            basicSEO: { score: 20, maxScore: 40 },
            llmReadability: { score: 15, maxScore: 30 },
            structuredData: { score: 10, maxScore: 30 },
        });
    });

    await t.test('calculates zero score when nothing exists', () => {
        const checks = {
            basicSEO: {
                title: { optimal: false, exists: false },
                metaDescription: { optimal: false, exists: false },
                h1: { optimal: false, exists: false },
                h2: { optimal: false, exists: false },
            },
            llmReadability: {
                llmFriendly: false,
                textContentLength: 100, // < 500
            },
            structuredData: {
                jsonLd: { exists: false },
                openGraph: { exists: false },
                twitterCards: { exists: false },
            },
        };

        const result = calculateScore(checks);

        assert.equal(result.total, 0);
        assert.deepEqual(result.breakdown, {
            basicSEO: { score: 0, maxScore: 40 },
            llmReadability: { score: 0, maxScore: 30 },
            structuredData: { score: 0, maxScore: 30 },
        });
    });

    await t.test('calculates basicSEO correctly based on different combinations', () => {
        const checks = {
            basicSEO: {
                title: { optimal: true, exists: true }, // 10
                metaDescription: { optimal: false, exists: true }, // 5
                h1: { optimal: false, exists: false }, // 0
                h2: { optimal: true, exists: true }, // 10
            },
            llmReadability: { llmFriendly: false, textContentLength: 0 },
            structuredData: { jsonLd: { exists: false }, openGraph: { exists: false }, twitterCards: { exists: false } },
        };

        const result = calculateScore(checks);
        assert.equal(result.breakdown.basicSEO.score, 25);
    });

    await t.test('calculates llmReadability correctly', () => {
        const checksLlmFriendly = {
            basicSEO: { title: {}, metaDescription: {}, h1: {}, h2: {} },
            llmReadability: { llmFriendly: true, textContentLength: 0 }, // 30
            structuredData: { jsonLd: {}, openGraph: {}, twitterCards: {} },
        };
        assert.equal(calculateScore(checksLlmFriendly).breakdown.llmReadability.score, 30);

        const checksTextLength = {
            basicSEO: { title: {}, metaDescription: {}, h1: {}, h2: {} },
            llmReadability: { llmFriendly: false, textContentLength: 501 }, // 15
            structuredData: { jsonLd: {}, openGraph: {}, twitterCards: {} },
        };
        assert.equal(calculateScore(checksTextLength).breakdown.llmReadability.score, 15);
    });

    await t.test('calculates structuredData correctly', () => {
        const checks = {
            basicSEO: { title: {}, metaDescription: {}, h1: {}, h2: {} },
            llmReadability: { llmFriendly: false, textContentLength: 0 },
            structuredData: { jsonLd: { exists: true }, openGraph: { exists: false }, twitterCards: { exists: true } }, // 15 + 0 + 5 = 20
        };
        assert.equal(calculateScore(checks).breakdown.structuredData.score, 20);
    });
});
