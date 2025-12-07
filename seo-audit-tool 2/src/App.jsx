import React, { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const analyzeURL = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      // Validate URL
      const urlObj = new URL(url);
      
      // Use a CORS proxy for the free tier
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Perform checks
      const auditResults = {
        url: url,
        basicSEO: checkBasicSEO(doc),
        llmReadability: checkLLMReadability(html, doc),
        structuredData: checkStructuredData(doc),
        overallScore: 0
      };
      
      // Calculate overall score
      auditResults.overallScore = calculateScore(auditResults);
      
      setResults(auditResults);
    } catch (err) {
      setError(`Error analyzing URL: ${err.message}. Make sure the URL is accessible and includes http:// or https://`);
    } finally {
      setLoading(false);
    }
  };

  const checkBasicSEO = (doc) => {
    const title = doc.querySelector('title');
    const metaDesc = doc.querySelector('meta[name="description"]');
    const h1 = doc.querySelector('h1');
    const h2 = doc.querySelectorAll('h2');
    
    return {
      title: {
        exists: !!title,
        content: title ? title.textContent : '',
        length: title ? title.textContent.length : 0,
        optimal: title && title.textContent.length >= 30 && title.textContent.length <= 60
      },
      metaDescription: {
        exists: !!metaDesc,
        content: metaDesc ? metaDesc.getAttribute('content') : '',
        length: metaDesc ? metaDesc.getAttribute('content').length : 0,
        optimal: metaDesc && metaDesc.getAttribute('content').length >= 120 && metaDesc.getAttribute('content').length <= 160
      },
      h1: {
        exists: !!h1,
        count: doc.querySelectorAll('h1').length,
        content: h1 ? h1.textContent : '',
        optimal: doc.querySelectorAll('h1').length === 1
      },
      h2: {
        exists: h2.length > 0,
        count: h2.length,
        optimal: h2.length >= 2
      }
    };
  };

  const checkLLMReadability = (html, doc) => {
    // Check ratio of visible text content vs script tags
    const scriptTags = doc.querySelectorAll('script');
    const scriptContent = Array.from(scriptTags).reduce((acc, script) => acc + script.textContent.length, 0);
    
    // Get text content from body
    const body = doc.querySelector('body');
    const textContent = body ? body.textContent.trim().length : 0;
    
    // Check for common JS frameworks
    const hasReact = html.includes('react') || html.includes('React');
    const hasVue = html.includes('vue') || html.includes('Vue');
    const hasAngular = html.includes('angular') || html.includes('ng-');
    
    // Simple heuristic: if script content is more than 50% of text, likely JS-heavy
    const jsHeavy = scriptContent > textContent * 0.5;
    
    return {
      textContentLength: textContent,
      scriptContentLength: scriptContent,
      ratio: textContent > 0 ? (scriptContent / textContent).toFixed(2) : 'N/A',
      jsFrameworkDetected: hasReact || hasVue || hasAngular,
      frameworkName: hasReact ? 'React' : hasVue ? 'Vue' : hasAngular ? 'Angular' : 'None',
      assessment: jsHeavy ? 'JS-Heavy (Potential LLM Issues)' : 'HTML-Rich (LLM-Friendly)',
      llmFriendly: !jsHeavy && textContent > 1000
    };
  };

  const checkStructuredData = (doc) => {
    const jsonLd = doc.querySelectorAll('script[type="application/ld+json"]');
    const microdata = doc.querySelectorAll('[itemscope]');
    const ogTags = doc.querySelectorAll('meta[property^="og:"]');
    const twitterTags = doc.querySelectorAll('meta[name^="twitter:"]');
    
    let structuredDataTypes = [];
    
    // Parse JSON-LD
    jsonLd.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type']) {
          structuredDataTypes.push(data['@type']);
        }
      } catch (e) {
        // Invalid JSON-LD
      }
    });
    
    return {
      jsonLd: {
        exists: jsonLd.length > 0,
        count: jsonLd.length,
        types: structuredDataTypes
      },
      microdata: {
        exists: microdata.length > 0,
        count: microdata.length
      },
      openGraph: {
        exists: ogTags.length > 0,
        count: ogTags.length
      },
      twitterCards: {
        exists: twitterTags.length > 0,
        count: twitterTags.length
      },
      overallAssessment: (jsonLd.length > 0 || microdata.length > 0) ? 'Good' : 'Missing'
    };
  };

  const calculateScore = (audit) => {
    let score = 0;
    
    // Basic SEO (40 points)
    if (audit.basicSEO.title.optimal) score += 10;
    else if (audit.basicSEO.title.exists) score += 5;
    
    if (audit.basicSEO.metaDescription.optimal) score += 10;
    else if (audit.basicSEO.metaDescription.exists) score += 5;
    
    if (audit.basicSEO.h1.optimal) score += 10;
    else if (audit.basicSEO.h1.exists) score += 5;
    
    if (audit.basicSEO.h2.optimal) score += 10;
    else if (audit.basicSEO.h2.exists) score += 5;
    
    // LLM Readability (30 points)
    if (audit.llmReadability.llmFriendly) score += 30;
    else if (audit.llmReadability.textContentLength > 500) score += 15;
    
    // Structured Data (30 points)
    if (audit.structuredData.jsonLd.exists) score += 15;
    if (audit.structuredData.openGraph.exists) score += 10;
    if (audit.structuredData.twitterCards.exists) score += 5;
    
    return score;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🤖 AI SEO Consultant</h1>
        <p>Optimize your site for search engines and AI crawlers</p>
      </header>

      <main className="main">
        <div className="input-section">
          <input
            type="url"
            placeholder="Enter URL (e.g., https://example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && analyzeURL()}
            className="url-input"
          />
          <button 
            onClick={analyzeURL} 
            disabled={loading}
            className="analyze-btn"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && (
          <div className="error-box">
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {results && (
          <div className="results">
            <div className="score-section">
              <div className="score-circle" style={{ borderColor: getScoreColor(results.overallScore) }}>
                <div className="score-value" style={{ color: getScoreColor(results.overallScore) }}>
                  {results.overallScore}
                </div>
                <div className="score-label">Overall Score</div>
              </div>
              <p className="score-description">
                {results.overallScore >= 80 ? '🎉 Excellent! Your site is well-optimized.' :
                 results.overallScore >= 60 ? '👍 Good, but there\'s room for improvement.' :
                 '⚠️ Needs work. Follow the recommendations below.'}
              </p>
            </div>

            <div className="section">
              <h2>📋 Basic SEO</h2>
              
              <div className="check-item">
                <div className="check-header">
                  <span className={results.basicSEO.title.optimal ? 'status-good' : results.basicSEO.title.exists ? 'status-warning' : 'status-bad'}>
                    {results.basicSEO.title.optimal ? '✓' : results.basicSEO.title.exists ? '⚠' : '✗'}
                  </span>
                  <strong>Title Tag</strong>
                </div>
                {results.basicSEO.title.exists ? (
                  <>
                    <p className="check-content">"{results.basicSEO.title.content}"</p>
                    <p className="check-meta">Length: {results.basicSEO.title.length} characters (Optimal: 30-60)</p>
                  </>
                ) : (
                  <p className="check-recommendation">❌ Missing title tag - Add one immediately!</p>
                )}
              </div>

              <div className="check-item">
                <div className="check-header">
                  <span className={results.basicSEO.metaDescription.optimal ? 'status-good' : results.basicSEO.metaDescription.exists ? 'status-warning' : 'status-bad'}>
                    {results.basicSEO.metaDescription.optimal ? '✓' : results.basicSEO.metaDescription.exists ? '⚠' : '✗'}
                  </span>
                  <strong>Meta Description</strong>
                </div>
                {results.basicSEO.metaDescription.exists ? (
                  <>
                    <p className="check-content">"{results.basicSEO.metaDescription.content}"</p>
                    <p className="check-meta">Length: {results.basicSEO.metaDescription.length} characters (Optimal: 120-160)</p>
                  </>
                ) : (
                  <p className="check-recommendation">❌ Missing meta description - Add one to improve click-through rates!</p>
                )}
              </div>

              <div className="check-item">
                <div className="check-header">
                  <span className={results.basicSEO.h1.optimal ? 'status-good' : results.basicSEO.h1.exists ? 'status-warning' : 'status-bad'}>
                    {results.basicSEO.h1.optimal ? '✓' : results.basicSEO.h1.exists ? '⚠' : '✗'}
                  </span>
                  <strong>H1 Heading</strong>
                </div>
                {results.basicSEO.h1.exists ? (
                  <>
                    <p className="check-content">"{results.basicSEO.h1.content}"</p>
                    <p className="check-meta">Count: {results.basicSEO.h1.count} (Should have exactly 1)</p>
                  </>
                ) : (
                  <p className="check-recommendation">❌ Missing H1 tag - Add a clear main heading!</p>
                )}
              </div>

              <div className="check-item">
                <div className="check-header">
                  <span className={results.basicSEO.h2.optimal ? 'status-good' : results.basicSEO.h2.exists ? 'status-warning' : 'status-bad'}>
                    {results.basicSEO.h2.optimal ? '✓' : results.basicSEO.h2.exists ? '⚠' : '✗'}
                  </span>
                  <strong>H2 Headings</strong>
                </div>
                <p className="check-meta">Count: {results.basicSEO.h2.count} (Recommended: 2+)</p>
                {!results.basicSEO.h2.optimal && (
                  <p className="check-recommendation">⚠️ Add more H2 headings to structure your content better</p>
                )}
              </div>
            </div>

            <div className="section">
              <h2>🤖 LLM Readability</h2>
              <div className="check-item">
                <div className="check-header">
                  <span className={results.llmReadability.llmFriendly ? 'status-good' : 'status-warning'}>
                    {results.llmReadability.llmFriendly ? '✓' : '⚠'}
                  </span>
                  <strong>Assessment: {results.llmReadability.assessment}</strong>
                </div>
                <p className="check-meta">Text Content: {results.llmReadability.textContentLength} characters</p>
                <p className="check-meta">Script Content: {results.llmReadability.scriptContentLength} characters</p>
                <p className="check-meta">JS Framework: {results.llmReadability.frameworkName}</p>
                
                {!results.llmReadability.llmFriendly && (
                  <p className="check-recommendation">
                    ⚠️ Your site appears to be JavaScript-heavy. AI crawlers may have difficulty reading your content.
                    Consider implementing server-side rendering (SSR) or static site generation (SSG).
                  </p>
                )}
                {results.llmReadability.llmFriendly && (
                  <p className="check-recommendation">
                    ✓ Great! Your content is readily accessible to AI crawlers and LLMs.
                  </p>
                )}
              </div>
            </div>

            <div className="section">
              <h2>🏷️ Structured Data</h2>
              
              <div className="check-item">
                <div className="check-header">
                  <span className={results.structuredData.jsonLd.exists ? 'status-good' : 'status-bad'}>
                    {results.structuredData.jsonLd.exists ? '✓' : '✗'}
                  </span>
                  <strong>JSON-LD Schema</strong>
                </div>
                {results.structuredData.jsonLd.exists ? (
                  <>
                    <p className="check-meta">Found {results.structuredData.jsonLd.count} schema(s)</p>
                    {results.structuredData.jsonLd.types.length > 0 && (
                      <p className="check-meta">Types: {results.structuredData.jsonLd.types.join(', ')}</p>
                    )}
                  </>
                ) : (
                  <p className="check-recommendation">❌ No JSON-LD structured data found. Add schema markup to help search engines understand your content!</p>
                )}
              </div>

              <div className="check-item">
                <div className="check-header">
                  <span className={results.structuredData.openGraph.exists ? 'status-good' : 'status-bad'}>
                    {results.structuredData.openGraph.exists ? '✓' : '✗'}
                  </span>
                  <strong>Open Graph Tags</strong>
                </div>
                <p className="check-meta">Found {results.structuredData.openGraph.count} tags</p>
                {!results.structuredData.openGraph.exists && (
                  <p className="check-recommendation">❌ Add Open Graph tags for better social media sharing</p>
                )}
              </div>

              <div className="check-item">
                <div className="check-header">
                  <span className={results.structuredData.twitterCards.exists ? 'status-good' : 'status-warning'}>
                    {results.structuredData.twitterCards.exists ? '✓' : '⚠'}
                  </span>
                  <strong>Twitter Card Tags</strong>
                </div>
                <p className="check-meta">Found {results.structuredData.twitterCards.count} tags</p>
                {!results.structuredData.twitterCards.exists && (
                  <p className="check-recommendation">⚠️ Consider adding Twitter Card tags for better Twitter sharing</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Built with ❤️ for better AI-optimized web experiences</p>
      </footer>
    </div>
  );
}

export default App;
