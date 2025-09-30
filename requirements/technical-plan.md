# Technical Plan: "SB29-guard-chrome"
This document outlines the technical implementation details, feature set, and rollout strategy for the SB29 Guard Chrome Extension. For a high-level overview of the project's mission and goals, please see the main [README.md](../README.md).

## 🛣️ Phased Rollout Plan
We will develop this project in two distinct phases to prioritize a fast, secure initial deployment followed by a more robust, long-term architecture.

### Version 1.0: Initial Private Release
For the initial rollout within our district's managed Google Workspace, we will use a direct-to-API architecture.

- **How it Works:** The extension will fetch data directly from the Supabase API. The required API key will be included in the packaged extension code.

- **API Key Security:** To keep the key out of the public GitHub repository, it will be handled via a build-time injection. The key will be stored in a local, git-ignored file (e.g., `config.js`). A simple build script will read this key and insert it into the final JavaScript file before the extension is packaged for upload. This is a safe and acceptable tradeoff for a private, force-installed extension.

### Version 2.0: Enhanced Security & Scalability
For long-term stability and security, we will introduce a secure proxy model.

- **How it Works:** The extension will call a trusted intermediary endpoint hosted by the school. This proxy will be the only service that holds the Supabase API key.

- **Technology:** The proxy will be a lightweight, high-performance binary (written in Go) hosted on a school subdomain. This completely decouples the extension from the secret key, making the system more robust and scalable.

- **Centralized Configuration:** The proxy will not only serve DPA data but also provide configuration details, such as the base URL for the "View Full Details" link in the popup. This allows us to update key settings centrally without having to republish the extension.

## ✅ Feature Set: MVP (Version 1.0)
Our first launch-ready version must do the following:

- **Direct API Fetch:** The background script must successfully fetch and parse data from the Supabase API endpoint.

- **Background URL Monitoring:** The `background.js` script must successfully listen for tab updates and extract the hostname from the current URL.

- **Dynamic Icon:** The extension's icon in the toolbar must change color and shape based on the site's status to support accessibility. We will need to create and include these image assets. Go see the [icon-strategy.yaml](icon-strategy.yaml) for full details: it is the authoratative source. The list below is a summary.

  - **Green Circle:** Approved

  - **Yellow Triangle:** Teaching and Learning approved, not for student accounts

  - **Orange Square:** Status pending, at any level 

  - **Red 'X':** Denied for all use

  - **Purple Diamond:** Unlisted - recommend for review submission

- **Informative Popup:** Clicking the icon opens a `popup.html` that provides a clear summary and a direct link to the official details.

  - **At-a-glance status:** Briefly display the key statuses (e.g., "T&L: Approved", "DPA: Requested").

  - **Primary Call to Action:** A prominent link to "View Full Details on MCS App Hub". This will link directly to the specific page for that resource, ensuring teachers always see the most current, official information without us needing to replicate complex UI.

- **Local Caching & Refresh:** The API data must be stored in `chrome.storage.local` and refreshed periodically (e.g., daily).

## 💻 Tech Stack & Repo Structure
- **Extension Code (V1):** Vanilla JavaScript, HTML, CSS.

- **Build Tooling (V1):** A simple build script (e.g., a shell script or a Node.js file) to manage the API key injection and package the extension into a `.zip` file.

- **Proxy Service (V2):** Go.

- **APIs:** Chrome Extension APIs (`Manifest V3`, `chrome.storage`, `chrome.tabs`, `chrome.action`).

- **Repo:** This is a monorepo containing:

- `/extension`: All source code for the extension.

- `/proxy-go` (for V2): The code for our secure Go proxy service.

- `/docs`: Public-facing static files, primarily the `index.html` which serves as our Privacy Policy.

## 🏁 Definition of Done
Version 1.0 is "done" when a teacher can navigate to a website, see the extension icon change correctly, and click it for details that link back to the official App Hub. The extension must pass the Chrome Web Store review for a private extension, with a clear privacy policy hosted on our GitHub Pages site.