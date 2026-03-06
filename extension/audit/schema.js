/**
 * AI SEO Consultant — Output Schema v0.1
 *
 * This module defines the schema version and JSDoc typedefs
 * for the audit output. All audit results conform to this shape.
 */

export const SCHEMA_VERSION = '0.1';

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
 * @typedef {Object} BasicSEOResult
 * @property {CheckResult} title
 * @property {CheckResult} metaDescription
 * @property {CheckResult} h1
 * @property {CheckResult} h2
 */

/**
 * @typedef {Object} LLMReadabilityResult
 * @property {number} textContentLength
 * @property {number} scriptContentLength
 * @property {number|string} jsToTextRatio
 * @property {boolean} jsFrameworkDetected
 * @property {string|null} frameworkName
 * @property {string} assessment
 * @property {boolean} llmFriendly
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} StructuredDataResult
 * @property {{exists: boolean, count: number, types: string[], errors: number}} jsonLd
 * @property {{exists: boolean, count: number}} microdata
 * @property {{exists: boolean, count: number}} openGraph
 * @property {{exists: boolean, count: number}} twitterCards
 * @property {string} overallAssessment
 * @property {string|null} recommendation
 */

/**
 * @typedef {Object} ScoreBreakdown
 * @property {{score: number, maxScore: number}} basicSEO
 * @property {{score: number, maxScore: number}} llmReadability
 * @property {{score: number, maxScore: number}} structuredData
 */

/**
 * @typedef {Object} AuditResult
 * @property {string} schemaVersion
 * @property {string} url
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {{total: number, breakdown: ScoreBreakdown}} score
 * @property {{basicSEO: BasicSEOResult, llmReadability: LLMReadabilityResult, structuredData: StructuredDataResult}} checks
 */
