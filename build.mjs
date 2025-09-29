// build.mjs
import fs from 'fs';
import path from 'path';

const configPath = './config.js';
const sourceDir = 'extension';
const buildDir = 'build';

async function build() {
    // 1. Load secrets
    if (!fs.existsSync(configPath)) {
        console.error(`🔴 Error: Configuration file not found at ${configPath}`);
        process.exit(1);
    }
    const config = await import(configPath);
    const { API_KEY, API_URI, API_HOST } = config.default;

    if (!API_KEY || !API_URI || !API_HOST) {
        console.error('🔴 Error: Required values are missing from config.js.');
        process.exit(1);
    }

    // ✨ AUTOMATICALLY CREATE MANIFEST HOST PATTERN ✨
    const manifestHostPattern = `${API_HOST}/*`;

    // 2. Prepare build directory
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir, { recursive: true });

    // 3. Copy files and replace placeholders
    const filesToProcess = ['manifest.json', 'background.js'];
    const allFiles = fs.readdirSync(sourceDir, { withFileTypes: true });

    for (const file of allFiles) {
        const sourcePath = path.join(sourceDir, file.name);
        const destPath = path.join(buildDir, file.name);

        if (file.isDirectory()) {
            fs.cpSync(sourcePath, destPath, { recursive: true });
            continue;
        }
        
        if (filesToProcess.includes(file.name)) {
            let content = fs.readFileSync(sourcePath, 'utf8');
            content = content.replace(/__API_KEY_PLACEHOLDER__/g, API_KEY);
            content = content.replace(/__API_URI_PLACEHOLDER__/g, API_URI);
            // Use the derived pattern for the manifest
            content = content.replace(/__API_HOST_PLACEHOLDER__/g, manifestHostPattern);
            fs.writeFileSync(destPath, content);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }

    console.log('✅ Build complete! Extension is ready in the /build directory.');
}

build();
