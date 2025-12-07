# 🚀 Quick Start Guide for Bolt.new

## Step-by-Step Setup (5 minutes)

### Option A: Upload Files Directly (Recommended)

1. **Go to Bolt.new**
   - Visit https://bolt.new
   - Sign in with your GitHub account (free)

2. **Create New Project**
   - Click "New Project"
   - Select "React + Vite" template

3. **Upload Your Files**
   - Delete the default files in the `src` folder
   - Upload all files from this project:
     ```
     /seo-audit-tool/
     ├── index.html
     ├── package.json
     ├── vite.config.js
     ├── README.md
     └── src/
         ├── App.jsx
         ├── App.css
         ├── index.jsx
         └── index.css
     ```

4. **Run the Project**
   - Bolt will automatically install dependencies
   - Click the "Preview" button
   - Your SEO tool is now live! 🎉

---

### Option B: Paste Code in Chat (Alternative)

1. **Start New Chat in Bolt**
   - Go to https://bolt.new
   - Start a new conversation

2. **Paste This Prompt:**
   ```
   Create a React app with the following structure:

   File: src/App.jsx
   [paste content of App.jsx]

   File: src/App.css
   [paste content of App.css]

   File: src/index.jsx
   [paste content of index.jsx]

   File: index.html
   [paste content of index.html]

   File: package.json
   [paste content of package.json]
   ```

3. **Bolt will build it for you**
   - It will create all files
   - Install dependencies
   - Start the development server

---

## Testing Your Tool

Once the app is running:

1. **Enter a URL** in the input field (e.g., `https://example.com`)
2. **Click "Analyze"** button
3. **View Results:**
   - Overall SEO Score (0-100)
   - Basic SEO checks
   - LLM Readability assessment
   - Structured Data detection

---

## Troubleshooting

### ❌ "CORS Error" or "Failed to Fetch"
**Solution**: Some websites block external access. Try these instead:
- `https://example.com`
- `https://en.wikipedia.org/wiki/Main_Page`
- `https://www.github.com`

### ❌ App not loading
**Solution**: 
1. Check that all files are in the correct location
2. Make sure `package.json` has the right dependencies
3. Try refreshing the Bolt preview

### ❌ Blank results
**Solution**: Make sure you're entering a full URL with `https://`

---

## Bolt.new Free Tier Limits

✅ **What's Included:**
- Unlimited projects
- Live preview
- Code editing
- Deployment to StackBlitz

⚠️ **Limitations:**
- Limited backend capabilities
- CORS proxy required for URL fetching
- Cannot use headless browsers (Puppeteer)

---

## Next Steps

Once you have the basic version working:

1. **Test with your own websites**
2. **Share the link** with colleagues
3. **Customize the design** (edit `App.css`)
4. **Add more checks** (see README.md for ideas)
5. **Deploy publicly** (Bolt makes this easy!)

---

## Deployment Options

### Option 1: Keep on Bolt
- Your project is automatically hosted on Bolt
- Get a shareable link
- Free on their platform

### Option 2: Export to Vercel/Netlify
- Download project from Bolt
- Deploy to Vercel or Netlify
- Get custom domain

### Option 3: GitHub Pages
- Export code to GitHub
- Enable GitHub Pages
- Free hosting

---

## Tips for Best Results

1. **Start with well-known sites** to test functionality
2. **Use full URLs** including `https://`
3. **Check multiple pages** of your site
4. **Compare scores** with competitors
5. **Act on recommendations** to improve SEO

---

## Need Help?

If you encounter issues:
1. Check the browser console for errors (F12)
2. Make sure all files are properly copied
3. Verify the URL format includes `https://`
4. Try a different website URL

---

Happy auditing! 🎉
