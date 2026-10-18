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

    await t.test('returns green (#7fcf9a) for scores 80 and above', () => {
        assert.equal(getScoreColor(100), '#7fcf9a');
        assert.equal(getScoreColor(80), '#7fcf9a');
        assert.equal(getScoreColor(85), '#7fcf9a');
    });

    await t.test('returns amber (#e8b44c) for scores between 60 and 79', () => {
        assert.equal(getScoreColor(79), '#e8b44c');
        assert.equal(getScoreColor(60), '#e8b44c');
        assert.equal(getScoreColor(70), '#e8b44c');
    });

    await t.test('returns red (#ef7d6d) for scores below 60', () => {
        assert.equal(getScoreColor(59), '#ef7d6d');
        assert.equal(getScoreColor(0), '#ef7d6d');
        assert.equal(getScoreColor(30), '#ef7d6d');
        assert.equal(getScoreColor(-10), '#ef7d6d');
    });
});
