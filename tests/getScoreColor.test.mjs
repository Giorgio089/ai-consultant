import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('getScoreColor', async (t) => {
    // Read the popup.js file as a string
    const popupSource = await fs.readFile(new URL('../extension/popup.js', import.meta.url), 'utf8');

    // Extract the getScoreColor function
    // This approach is needed because popup.js is an ES module that directly references browser globals
    // which makes it difficult to import in a Node.js test environment without jsdom
    const match = popupSource.match(/function getScoreColor\s*\([^)]*\)\s*{[^}]*}/);
    if (!match) throw new Error("Could not find getScoreColor in popup.js");

    // Evaluate the function in current context
    const getScoreColor = new Function(`
        ${match[0]}
        return getScoreColor;
    `)();

    await t.test('returns green (#34d399) for scores 80 and above', () => {
        assert.equal(getScoreColor(100), '#34d399');
        assert.equal(getScoreColor(80), '#34d399');
        assert.equal(getScoreColor(85), '#34d399');
    });

    await t.test('returns yellow (#fbbf24) for scores between 60 and 79', () => {
        assert.equal(getScoreColor(79), '#fbbf24');
        assert.equal(getScoreColor(60), '#fbbf24');
        assert.equal(getScoreColor(70), '#fbbf24');
    });

    await t.test('returns red (#f87171) for scores below 60', () => {
        assert.equal(getScoreColor(59), '#f87171');
        assert.equal(getScoreColor(0), '#f87171');
        assert.equal(getScoreColor(30), '#f87171');
        assert.equal(getScoreColor(-10), '#f87171');
    });
});
