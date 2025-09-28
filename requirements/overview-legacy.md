# Project: "SB29-guard-chrome" - DPA Status Checker Chrome Extension
## 🚀 Mission: The "Why"
Our goal is to build a simple, privacy-first tool that empowers teachers to make safe choices about digital resources. In an instant, they should know if a website they are visiting respects student data privacy according to our district's standards (Ohio SB29).

This isn't about blocking the internet; it's about providing a gentle, informative nudge in the right direction. We're building a guardian for student data, one browser tab at a time.

## ✨ Core Principles: The Vibe
This project is guided by three core beliefs. Everything we build must align with these:

1. 🕵️‍♂️ **Zero Data Collection.** We are fundamentally committed to privacy. The extension must not transmit user browsing history or any PII to any server, ever. Our architecture will reflect this. We trust our teachers, and they need to be able to trust our tool completely.

2. 🎯 **Keep It Simple.** This extension has one job: display the DPA status of the current website. No feature creep. No bloat. It should be lightweight, fast, and almost invisible until it's needed.

3. 🧘 **Frictionless for Teachers.** The experience should be seamless. The extension will be force-installed by the district, so it needs to just work. No logins, no complex setup, no annoying popups. Just a clear, intuitive indicator.

## 🛣️ Phased Rollout Plan
We will develop this project in two distinct phases to prioritize a fast, secure initial deployment followed by a more robust, long-term architecture.

### Version 1.0: Initial Private Release
For the initial rollout within our district's managed Google Workspace, we will use a direct-to-API architecture.

- **How it Works:** The extension will fetch data directly from the Supabase API. The required API key will be included in the packaged extension code.

-  **API Key Security:** To keep the key out of the public GitHub repository, it will be stored in a local, git-ignored file (e.g., `config.js` or `.env`) and injected into the extension's source code at build time. This is a safe and acceptable tradeoff for a private, force-installed extension.

### Version 2.0: Enhanced Security & Scalability
For long-term stability and security, we will introduce a secure proxy model.

- **How it Works:** The extension will call a trusted intermediary endpoint hosted by the school. This proxy will be the only service that holds the Supabase API key.

- **Technology:** The proxy will be a lightweight, high-performance binary (written in Go) hosted on a school subdomain. This completely decouples the extension from the secret key, making the system more robust and scalable.

- **Centralized Configuration:** The proxy will not only serve DPA data but also provide configuration details, such as the base URL for the "View Full Details" link in the popup. This allows us to update key settings centrally without having to republish the extension.

## ✅ Feature Set: MVP (Version 1.0)
Our first launch-ready version must do the following:

- **Direct API Fetch:** The background script must successfully fetch and parse data from the Supabase API endpoint.

- **Background URL Monitoring:** The `background.js` script must successfully listen for tab updates and extract the hostname from the current URL.

- **Dynamic Icon:** The extension's icon in the toolbar must change color and shape based on the site's status to support accessibility:

  - **Green Circle:** Approved

  - **Yellow Triangle:** Status pending, at any level

  - **Orange Square:** Teaching and Learning approved, not for student accounts

  - **Red 'X':** Denied for all use

  - **Purple Diamond:** Unlisted - recommend for review submission

- **Informative Popup:** Clicking the icon opens a `popup.html` that provides a clear summary and a direct link to the official details.

  - **At-a-glance status:** Briefly display the key statuses (e.g., "T&L: Approved", "DPA: Requested").

  - **Primary Call to Action:** A prominent link to "View Full Details on MCS App Hub". This will link directly to the specific page for that resource, ensuring teachers always see the most current, official information without us needing to replicate complex UI.

- **Local Caching & Refresh:** The API data must be stored in `chrome.storage.local` and refreshed periodically (e.g., daily).

## 💻 Tech Stack & Repo Structure
- **Extension Code (V1):** Vanilla JavaScript, HTML, CSS. A simple build script (e.g., shell or Node.js) will be used to manage the API key injection.

- **Proxy Service (V2):** Go.

- **APIs:** Chrome Extension APIs (`Manifest V3`, `chrome.storage`, `chrome.tabs`, `chrome.action`).

- **Repo:** This is a monorepo containing:

  - `/extension`: All source code for the extension.

  - `/proxy-go` (for V2): The code for our secure Go proxy service.

  - `/docs`: Public-facing static files, primarily the `index.html` which serves as our **Privacy Policy**.

## 🏁 Definition of Done
Version 1.0 is "done" when a teacher can navigate to a website, see the extension icon change correctly, and click it for details that link back to the official App Hub. The extension must pass the Chrome Web Store review for a private extension, with a clear privacy policy hosted on our GitHub Pages site.