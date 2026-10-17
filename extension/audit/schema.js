/**
 * GEO Page Audit — Output Schema
 *
 * This module defines the schema version and JSDoc typedefs
 * for the audit output. All audit results conform to this shape.
 *
 * 0.2: robots/canonical/lang/headingStructure/images in Basic SEO;
 *      visible-text measurement, mainContentLength, externalScriptCount,
 *      thinContent, appShell in LLM readability; validCount/empty,
 *      requiredFields and authorDate in structured data; score re-balanced
 *      (Basic SEO max 45, LLM 30, structured data max 25 — total still 100).
 */

export const SCHEMA_VERSION = '0.2';

/**
 * @typedef {Object} CheckResult
 * @property {boolean} exists
 * @property {string} [content]
 * @property {number} [length]
 * @property {number} [count]
 * @property {boolean} optimal
 * @property {string|null} recommendation - Actionable recommendation, null if check passes
 */

/**
 * @typedef {'good'|'warn'|'bad'|'info'} CheckStatus
 */

/**
 * @typedef {Object} RobotsResult
 * @property {boolean} exists - A meta robots/googlebot tag exists
 * @property {string} content - Combined directives
 * @property {boolean} noindex - noindex or none
 * @property {boolean} nosnippet
 * @property {number|null} maxSnippet - Smallest max-snippet value, null if unset
 * @property {number} dataNosnippetCount - Elements with data-nosnippet (info only)
 * @property {'good'|'warn'|'bad'} status - bad: noindex/nosnippet/max-snippet:0; warn: max-snippet 1–49
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} CanonicalResult
 * @property {boolean} exists
 * @property {number} count - Number of rel=canonical links
 * @property {string} href - First canonical href ('' if none)
 * @property {boolean} absolute
 * @property {boolean|null} pointsElsewhere - Canonical differs from the audited URL (null if unknown)
 * @property {'good'|'warn'|'info'} status
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} LangResult
 * @property {boolean} exists - <html lang> present
 * @property {string} value
 * @property {number} hreflangCount - link rel=alternate hreflang count (info only)
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} HeadingStructureResult
 * @property {number} count - Total h1–h6
 * @property {{from: string, to: string}[]} skips - e.g. [{from: 'h1', to: 'h3'}]
 * @property {boolean} optimal
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} ImagesResult
 * @property {number} total
 * @property {number} missingAlt - <img> without an alt attribute (alt="" counts as present)
 * @property {number} ratio - missingAlt / total (0 if no images)
 * @property {boolean} optimal
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} BasicSEOResult
 * @property {CheckResult} title - Lengths are measured after trimming/collapsing whitespace
 * @property {CheckResult} metaDescription
 * @property {CheckResult} h1
 * @property {CheckResult} h2
 * @property {RobotsResult} robots
 * @property {CanonicalResult} canonical
 * @property {LangResult} lang
 * @property {HeadingStructureResult} headingStructure
 * @property {ImagesResult} images
 */

/**
 * @typedef {Object} LLMReadabilityResult
 * @property {number} textContentLength - Visible body text (no script/style/noscript/template/svg)
 * @property {number|null} mainContentLength - Visible text of main/article/[role=main], null if absent
 * @property {number} scriptContentLength - Inline executable JS (JSON-LD excluded)
 * @property {number} externalScriptCount - Executable <script src> tags
 * @property {number|null} jsToTextRatio
 * @property {boolean} jsFrameworkDetected
 * @property {string|null} frameworkName - e.g. 'Next.js', 'Nuxt', 'React', 'Vue', 'Angular'
 * @property {boolean} thinContent - Visible text < 200 chars
 * @property {boolean} appShell - Thin text + external scripts (client-rendered shell)
 * @property {string} assessment
 * @property {boolean} llmFriendly
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} StructuredDataResult
 * @property {{exists: boolean, count: number, validCount: number, types: string[], errors: number, empty: number}} jsonLd
 *   errors = blocks with invalid JSON; empty = valid JSON without objects (e.g. null)
 * @property {{exists: boolean, count: number}} microdata
 * @property {{exists: boolean, count: number}} openGraph
 * @property {{exists: boolean, count: number}} twitterCards
 * @property {{checked: number, issues: {type: string, missing: string[]}[]}} requiredFields
 *   Checked types: Article/NewsArticle/BlogPosting, Organization, Product, FAQPage
 * @property {{datePublished: string|null, dateModified: string|null, author: string|null, hasDate: boolean, hasAuthor: boolean}} authorDate
 * @property {string} overallAssessment
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} ScoreBreakdown
 * @property {{score: number, maxScore: number}} basicSEO - max 45
 * @property {{score: number, maxScore: number}} llmReadability - max 30
 * @property {{score: number, maxScore: number}} structuredData - max 25
 */

/**
 * @typedef {Object} AuditResult
 * @property {string} schemaVersion
 * @property {string} url
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {{total: number, breakdown: ScoreBreakdown}} score
 * @property {{basicSEO: BasicSEOResult, llmReadability: LLMReadabilityResult, structuredData: StructuredDataResult}} checks
 */
