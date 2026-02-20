import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('handles invalid JSON-LD gracefully', async () => {
    // Mock successful fetch with HTML containing invalid JSON-LD
    // One valid script, one invalid script
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Valid JSON-LD"
            }
          </script>
          <script type="application/ld+json">
            {
              "invalid": "json",
              missing_closing_brace
          </script>
        </head>
        <body>
          <h1>Hello World</h1>
        </body>
      </html>
    `;

    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockHtml,
    });

    render(<App />);

    // Find input and button
    const input = screen.getByPlaceholderText(/Enter URL/i);
    const button = screen.getByText('Analyze');

    // Type URL and click
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);

    // Wait for analysis to complete and results to appear
    await waitFor(() => {
      expect(screen.getByText('Overall Score')).toBeInTheDocument();
    });

    // Verify structured data section
    // It should find 2 script tags total
    expect(screen.getByText(/Found 2 schema\(s\)/i)).toBeInTheDocument();

    // Verify types: should only list "Organization"
    // The invalid one should be ignored and not crash the app
    expect(screen.getByText(/Types: Organization/i)).toBeInTheDocument();

    // Verify no error message is displayed
    expect(screen.queryByText(/Error analyzing URL/i)).not.toBeInTheDocument();
  });
});
