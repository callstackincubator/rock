// Template functions for ad-hoc iOS distribution
export function templateIndexHtml({
  appName,
  version,
  bundleIdentifier,
}: {
  appName: string;
  version: string;
  bundleIdentifier: string;
}) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Download ${appName} for iOS</title>
      <style>
        :root {
          /* Light mode variables */
          --bg-primary: #ffffff;
          --bg-secondary: #f5f5f7;
          --text-primary: #1d1d1f;
          --text-secondary: #86868b;
          --accent-primary: #8232ff;
          --accent-hover: rgba(130, 50, 255, 0.3);
          --border-color: #e5e5e7;
          --shadow-color: rgba(0, 0, 0, 0.1);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            /* Dark mode variables */
            --bg-primary: #1c1c1e;
            --bg-secondary: #2c2c2e;
            --text-primary: #ffffff;
            --text-secondary: #8e8e93;
            --accent-primary: #8232ff;
            --accent-hover: rgba(130, 50, 255, 0.4);
            --border-color: #38383a;
            --shadow-color: rgba(0, 0, 0, 0.3);
          }
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            Oxygen, Ubuntu, Cantarell, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-size: 16px;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .container {
          text-align: center;
          max-width: 500px;
          width: 100%;
        }

        .app-icon {
          width: 100px;
          height: 100px;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: var(--text-primary);
          background: var(--bg-secondary);
          border-radius: 25px;
          transition: background-color 0.3s ease;
        }

        h1 {
          color: var(--text-primary);
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 15px;
          overflow-wrap: break-word;
          transition: color 0.3s ease;
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 30px;
          transition: color 0.3s ease;
        }

        .version {
          color: var(--text-primary);
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 10px;
          transition: color 0.3s ease;
        }

        .download-button {
          background: var(--accent-primary);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px var(--shadow-color);
        }

        .download-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--accent-hover);
        }

        .download-button:active {
          transform: translateY(0);
        }

        .instructions {
          background: var(--bg-secondary);
          border-radius: 4px;
          padding: 20px;
          margin-top: 20px;
          text-align: left;
          border: 1px solid var(--border-color);
          transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .instructions h3 {
          color: var(--text-primary);
          font-size: 16px;
          margin-bottom: 10px;
          transition: color 0.3s ease;
        }

        .instructions ol {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.6;
          padding-left: 20px;
          transition: color 0.3s ease;
        }

        .instructions li {
          margin-bottom: 8px;
        }

        .adhoc-info {
          text-align: left;
          margin-top: 20px;
          padding: 1em 2em;
          border-left: 3px solid var(--accent-primary);
          background: var(--bg-primary);
          border-radius: 4px;
          transition: background-color 0.3s ease;
        }

        .adhoc-info-title {
          font-weight: 600;
          margin-bottom: 10px;
          color: var(--text-primary);
          transition: color 0.3s ease;
        }

        .adhoc-info-text {
          color: var(--text-primary);
          margin: 0;
          transition: color 0.3s ease;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          font-size: 12px;
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }

        .link {
          color: var(--accent-primary);
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .link:hover {
          text-decoration: underline;
        }

        .toast {
          padding: 1em 3em;
          font-size: 14px;
          border: 1px solid var(--accent-primary);
          color: var(--text-primary);
          position: fixed;
          bottom: 1em;
          left: 50%;
          transform: translateX(-50%);
          max-width: 500px;
          width: calc(100% - 2em);
          text-align: left;
          border-radius: 4px;
          background-color: var(--bg-primary);
          display: none;
          box-shadow: 0 8px 24px var(--shadow-color);
          transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }

        .toast-visible {
          display: block;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .toast-icon {
          font-size: 1em;
          position: absolute;
          left: 1em;
          top: 50%;
          transform: translateY(-50%);
        }

        .toast-close {
          font-size: 1em;
          padding: 0.5em;
          cursor: pointer;
          position: absolute;
          right: 1em;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          transition: color 0.3s ease;
        }

        .toast-close:hover {
          color: var(--text-primary);
        }

        /* Smooth transitions for all elements */
        * {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="app-icon">📱</div>

        <div id="home-screen-toast" class="toast">
          <span class="toast-icon">💡</span>
          <p>Check Home Screen to see installation progress</p>
          <span class="toast-close" onclick="hideToast()">✕</span>
        </div>
  
        <h1>${appName}</h1>
        <p class="version">${bundleIdentifier} (${version})</p>
        <p class="subtitle">
          Download and install the latest version of our iOS app directly to your
          device.
        </p>
  
        <a href="#" id="install-link" class="download-button" onclick="showToast()">
          Install App
        </a>
  
        <script>
          // Update the link dynamically to point to the manifest.plist
          const link = document.getElementById('install-link');
          const currentUrl = window.location.href;
          const manifestUrl = currentUrl.replace('index.html', 'manifest.plist');
          link.href = \`itms-services://?action=download-manifest&url=\${encodeURIComponent(manifestUrl)}\`;

          function showToast() {
            setTimeout(() => {
              const toast = document.getElementById('home-screen-toast');
              toast.classList.add('toast-visible');
            }, 2000);
          }

          function hideToast() {
            const toast = document.getElementById('home-screen-toast');
            toast.classList.remove('toast-visible');
          }
        </script>
  
        <div class="instructions">
          <h3>Installation Instructions:</h3>
          <ol>
            <li>Tap the "Install App" button above</li>
            <li>When prompted, tap "Install" in the popup dialog</li>
            <li>The app will now start installing and will be available on your home screen</li>
          </ol>
        </div>
  
        <div class="adhoc-info">
          <p class="adhoc-info-title">Ad-hoc Distribution</p>
          <p class="adhoc-info-text">
            This app is distributed via ad-hoc distribution for testing purposes. 
            Your device must either be enrolled in enterprise distribution or have its UDID added to the app's provisioning profile.
            <br><br>
            Learn more at <a class="link" href="https://rnef.dev/docs/cli#ad-hoc-distribution">RNEF Ad-hoc documentation</a>.
          </p>
        </div>
        <div class="footer">
          <p>
            Generated with <a class="link" href="https://rnef.dev">RNEF</a> by
            <a class="link" href="https://callstack.com">Callstack</a>
          </p>
        </div>
      </div>
    </body>
  </html>
  `;
}

export function templateManifestPlist({
  baseUrl,
  ipaName,
  bundleIdentifier,
  version,
  appName,
  platformIdentifier,
}: {
  baseUrl: string;
  ipaName: string;
  bundleIdentifier: string;
  version: string;
  appName: string;
  platformIdentifier: string;
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
      <key>items</key>
      <array>
          <dict>
              <key>assets</key>
              <array>
                  <dict>
                      <key>kind</key>
                      <string>software-package</string>
                      <key>url</key>
                      <string>${baseUrl}/${ipaName}</string>
                  </dict>
              </array>
              <key>metadata</key>
              <dict>
                  <key>bundle-identifier</key>
                  <string>${bundleIdentifier}</string>
                  <key>bundle-version</key>
                  <string>${version}</string>
                  <key>kind</key>
                  <string>software</string>
                  <key>platform-identifier</key>
                  <string>${
                    platformIdentifier ?? 'com.apple.platform.iphoneos'
                  }</string>
                  <key>title</key>
                  <string>${appName}</string>
              </dict>
          </dict>
        </array>
      </dict>
    </plist>`;
}
