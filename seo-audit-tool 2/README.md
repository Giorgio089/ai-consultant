# 🤖 AI SEO Consultant

An AI-based SEO audit tool that analyzes websites for:
- Basic SEO standards (meta tags, heading structure)
- LLM readability (HTML vs JavaScript-rendered content)
- Structured data (JSON-LD, Open Graph, Twitter Cards)

## Features

✅ **Basic SEO Checks**
- Title tag optimization (30-60 characters)
- Meta description optimization (120-160 characters)
- H1 and H2 heading structure
- Content hierarchy validation

✅ **LLM Readability Analysis**
- Detects JavaScript-heavy sites
- Identifies JS frameworks (React, Vue, Angular)
- Assesses AI crawler accessibility
- Recommends SSR/SSG when needed

✅ **Structured Data Detection**
- JSON-LD schema markup
- Open Graph tags for social sharing
- Twitter Card metadata
- Microdata detection

✅ **Overall SEO Score**
- 0-100 scoring system
- Color-coded results (green/yellow/red)
- Actionable recommendations

## How to Use in Bolt.new (Free Tier)

### Method 1: Copy-Paste (Easiest)

1. Go to **[bolt.new](https://bolt.new)**
2. Create a new project
3. Copy all files from this repository
4. Paste them into Bolt's file editor
5. Click "Run" or "Preview"

### Method 2: Import from GitHub

1. Push this code to a GitHub repository
2. In Bolt.new, use "Import from GitHub"
3. Paste your repository URL

### Method 3: Manual Setup

1. In Bolt.new, create a new React + Vite project
2. Replace the default files with the ones provided here:
   - `src/App.jsx`
   - `src/App.css`
   - `src/index.jsx`
   - `src/index.css`
   - `index.html`
   - `package.json`
   - `vite.config.js`

## Usage

1. Enter any URL (must include `https://`)
2. Click "Analyze"
3. View detailed SEO audit results
4. Follow recommendations to improve your site

## Example URLs to Test

- `https://example.com`
- `https://www.google.com`
- Your own website!

## Known Limitations (Free Tier)

⚠️ **CORS Issues**: Some websites may block cross-origin requests. The tool uses a CORS proxy (`allorigins.win`) to work around this, but some sites may still be inaccessible.

⚠️ **JavaScript Rendering**: The current version analyzes the initial HTML. For full JavaScript rendering detection, you'd need a backend service with headless browser capabilities (like Puppeteer).

## Future Enhancements

- [ ] Batch URL analysis
- [ ] Historical score tracking
- [ ] PDF report generation
- [ ] Competitor comparison
- [ ] Page speed metrics
- [ ] Mobile-friendliness check
- [ ] Robots.txt analysis
- [ ] Sitemap validation
- [ ] Backlink analysis

## Tech Stack

- **Frontend**: React 18
- **Styling**: Custom CSS
- **Build Tool**: Vite
- **Deployment**: Bolt.new / StackBlitz

## Scoring System

- **80-100**: Excellent ✅
- **60-79**: Good 👍
- **0-59**: Needs Work ⚠️

### Score Breakdown:
- Basic SEO: 40 points
- LLM Readability: 30 points
- Structured Data: 30 points

## Contributing

Feel free to fork and improve this tool! Some areas that could use enhancement:

1. Better JavaScript rendering detection
2. More structured data types
3. Accessibility checks
4. Performance metrics
5. Security headers analysis

## License

MIT License - Feel free to use this for your own projects!

---

Built with ❤️ for better AI-optimized web experiences
