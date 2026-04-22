export function renderLandingPage(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>devcard-ai — AI Builder Passport</title>
  <meta name="description" content="A verifiable AI-builder credential for your GitHub profile. Ship velocity, tool attribution, and archetype — proof you can actually ship with AI." />
  <meta property="og:title" content="devcard-ai — AI Builder Passport" />
  <meta property="og:description" content="A verifiable AI-builder credential for your GitHub profile. Proof you can ship with AI." />
  <meta property="og:image" content="${baseUrl}/og?user=sakimyto&theme=dark" />
  <meta name="twitter:card" content="summary_large_image" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .hero {
      text-align: center;
      padding: 80px 24px 40px;
      max-width: 600px;
    }
    .hero h1 {
      font-size: 2.4rem;
      font-weight: 800;
      background: linear-gradient(135deg, #a371f7, #58a6ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 16px;
    }
    .hero p {
      font-size: 1.1rem;
      color: #8b949e;
      line-height: 1.6;
    }
    .input-section {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 32px;
      flex-wrap: wrap;
      padding: 0 24px;
    }
    input[type="text"] {
      padding: 12px 16px;
      font-size: 16px;
      border: 1px solid #30363d;
      border-radius: 8px;
      background: #161b22;
      color: #c9d1d9;
      width: 260px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: #a371f7; }
    input[type="text"]::placeholder { color: #484f58; }
    button {
      padding: 12px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.85; }
    .btn-primary { background: #a371f7; color: #fff; }
    .btn-secondary {
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
    }
    .preview-area {
      margin-top: 40px;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .preview-area img {
      max-width: 400px;
      width: 100%;
      border-radius: 12px;
    }
    .snippet-box {
      display: none;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px;
      max-width: 500px;
      width: calc(100% - 48px);
      position: relative;
    }
    .snippet-box.visible { display: block; }
    .snippet-box code {
      font-family: 'SF Mono', Consolas, monospace;
      font-size: 13px;
      color: #79c0ff;
      word-break: break-all;
    }
    .snippet-box .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 12px;
      font-size: 12px;
      background: #30363d;
      color: #c9d1d9;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .theme-toggle {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }
    .theme-toggle button {
      padding: 6px 14px;
      font-size: 13px;
      border-radius: 6px;
    }
    .theme-toggle button.active {
      background: #a371f7;
      color: #fff;
      border-color: #a371f7;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      max-width: 640px;
      margin: 48px 24px;
      width: calc(100% - 48px);
    }
    .feature {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 20px;
    }
    .feature h3 { font-size: 14px; color: #f0f6fc; margin-bottom: 6px; }
    .feature p { font-size: 13px; color: #8b949e; line-height: 1.5; }
    footer {
      margin-top: auto;
      padding: 32px;
      color: #484f58;
      font-size: 13px;
    }
    footer a { color: #58a6ff; text-decoration: none; }
    .tools-list {
      margin-top: 8px;
      font-size: 12px;
      color: #6e7681;
      max-width: 500px;
      text-align: center;
      line-height: 1.8;
    }
    .tools-list span {
      display: inline-block;
      padding: 2px 8px;
      background: #21262d;
      border-radius: 12px;
      margin: 2px;
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>AI Builder Passport</h1>
    <p>A verifiable credential for your GitHub profile.<br>Ship velocity, tool fluency, archetype — the signals recruiters of AI-native teams actually look for.</p>
  </div>

  <div class="input-section">
    <input type="text" id="username" placeholder="GitHub username" />
    <button class="btn-primary" onclick="generate()">Generate</button>
  </div>

  <div class="theme-toggle">
    <button class="btn-secondary active" id="btn-light" onclick="setTheme('light')">Light</button>
    <button class="btn-secondary" id="btn-dark" onclick="setTheme('dark')">Dark</button>
  </div>

  <div class="preview-area">
    <img id="preview" alt="" style="display:none" />
    <div class="snippet-box" id="snippet">
      <button class="copy-btn" onclick="copySnippet()">Copy</button>
      <code id="snippet-text"></code>
    </div>
  </div>

  <div class="tools-list">
    <span>Claude</span><span>Codex</span><span>Copilot</span><span>Cursor</span><span>Windsurf</span><span>Aider</span><span>Cody</span><span>Amazon Q</span><span>Gemini</span><span>Devin</span><span>Sweep</span>
  </div>

  <div class="features">
    <div class="feature">
      <h3>Verified, not self-declared</h3>
      <p>Derived from Co-Authored-By commit trailers — the non-fakeable paper trail of real AI usage.</p>
    </div>
    <div class="feature">
      <h3>Ship Velocity</h3>
      <p>Active weeks, AI commits per week, and a 12-week cadence sparkline. "Can they still ship?" — at a glance.</p>
    </div>
    <div class="feature">
      <h3>Builder Archetype</h3>
      <p>AI Native, Pair Programmer, Delegator, or Selective User — so AI-native teams can filter by fit.</p>
    </div>
    <div class="feature">
      <h3>Tier + Badges</h3>
      <p>Tier S–D anchored on tool breadth, AI commit rate, and recency. Shipper, Parallel, TDD-with-AI, and more.</p>
    </div>
  </div>

  <footer>
    <a href="https://github.com/sakimyto/devcard-ai">GitHub</a> · devcard-ai
  </footer>

  <script>
    const BASE = '${baseUrl}'
    let theme = 'light'

    function setTheme(t) {
      theme = t
      document.getElementById('btn-light').classList.toggle('active', t === 'light')
      document.getElementById('btn-dark').classList.toggle('active', t === 'dark')
      const user = document.getElementById('username').value.trim()
      if (user) generate()
    }

    function generate() {
      const user = document.getElementById('username').value.trim()
      if (!user) return
      const url = BASE + '/?user=' + encodeURIComponent(user) + '&theme=' + theme
      const img = document.getElementById('preview')
      img.src = url
      img.style.display = 'block'
      img.alt = user + "'s AI Builder Passport"

      const snippet = '![AI Builder Passport](' + url + ')'
      document.getElementById('snippet-text').textContent = snippet
      document.getElementById('snippet').classList.add('visible')
    }

    function copySnippet() {
      const text = document.getElementById('snippet-text').textContent
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-btn')
        btn.textContent = 'Copied!'
        setTimeout(() => btn.textContent = 'Copy', 1500)
      })
    }

    document.getElementById('username').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generate()
    })
  </script>
</body>
</html>`
}
