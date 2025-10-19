import fs from 'fs';
import path from 'path';

// --- Configuration ---
const configPath = './config.js';
const sourceDir = 'extension'; // Assumes your source files are in /extension
const buildDir = 'build';

// Helper function to read and parse a JSON file reliably
function readJsonFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
}

const packageJson = readJsonFile('./package.json');

async function build() {
    console.log('🚀 Starting extension build process...');

    // 1. Load secrets from config.js
    if (!fs.existsSync(configPath)) {
        console.error(`🔴 Error: Configuration file not found at ${configPath}`);
        process.exit(1);
    }
    const config = await import(configPath);
    const { API_KEY, API_URI, API_HOST } = config.default;

    if (!API_KEY || !API_URI || !API_HOST) {
        console.error('🔴 Error: Required API values are missing from config.js.');
        process.exit(1);
    }

    // 2. Prepare build directory
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir, { recursive: true });

    // 3. Process and create the final manifest.json
    console.log('   - Building manifest.json...');
    const manifestTemplatePath = path.join(sourceDir, 'manifest.template.json');
    if (!fs.existsSync(manifestTemplatePath)) {
        console.error(`🔴 Error: manifest.template.json not found in /${sourceDir}`);
        process.exit(1);
    }
    let manifestContent = fs.readFileSync(manifestTemplatePath, 'utf8');

    // --- DIAGNOSTIC LOGGING ---
    console.log('   - Values being used for manifest replacement:');
    console.log(`     - Name:        ${packageJson.displayName}`);
    console.log(`     - Version:     ${packageJson.version}`);
    console.log(`     - Description: ${packageJson.description}`);
    // --- END DIAGNOSTIC LOGGING ---

    // Replace metadata from package.json
    manifestContent = manifestContent.replace(/<% name %>/g, packageJson.displayName);
    manifestContent = manifestContent.replace(/<% version %>/g, packageJson.version);
    manifestContent = manifestContent.replace(/<% description %>/g, packageJson.description);

    // Replace secrets from config.js
    const manifestHostPattern = `${API_HOST}/*`;
    manifestContent = manifestContent.replace(/__API_HOST_PLACEHOLDER__/g, manifestHostPattern);
    
    // --- Write the processed manifest to the build directory ---
    fs.writeFileSync(path.join(buildDir, 'manifest.json'), manifestContent);

    // 4. Copy all other files and replace placeholders where needed
    console.log('   - Processing and copying source files...');
    const allFiles = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    // --- Create the dynamic User-Agent string ---
    const userAgentString = `${packageJson.displayName.replace(/\s+/g, '-')}-Chrome-Extension/${packageJson.version}`;
    console.log('   - Generating User-Agent:', userAgentString);

    for (const file of allFiles) {
        const sourcePath = path.join(sourceDir, file.name);
        const destPath = path.join(buildDir, file.name);

        if (file.name === 'manifest.template.json') {
            continue;
        }

        if (file.isDirectory()) {
            fs.cpSync(sourcePath, destPath, { recursive: true });
            continue;
        }
        
        if (file.name === 'background.js') {
            let content = fs.readFileSync(sourcePath, 'utf8');
            content = content.replace(/__API_KEY_PLACEHOLDER__/g, API_KEY);
            content = content.replace(/__API_URI_PLACEHOLDER__/g, API_URI);
            content = content.replace(/__USER_AGENT_PLACEHOLDER__/g, userAgentString);
            fs.writeFileSync(destPath, content);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }

    console.log(`✅ Build complete! Final extension is ready in the /${buildDir} directory.`);
}

build();

