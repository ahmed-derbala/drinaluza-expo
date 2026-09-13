import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths to files
const repoAPath = path.join(__dirname, '../package.json');
const repoAAppJsonPath = path.join(__dirname, '../app.json');
const repoAName = 'drinaluza-expo';

const repoBPath = path.join(__dirname, '../../drinaluza-expo-releases/package.json');
const repoBName = 'drinaluza-expo-releases';

try {
  // 1. Read Repo A's version
  const pkgA = JSON.parse(fs.readFileSync(repoAPath, 'utf8'));
  const versionA = pkgA.version;

  // 2. Update Repo A's app.json expo.version
  if (fs.existsSync(repoAAppJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(repoAAppJsonPath, 'utf8'));
    
    // Ensure expo object exists before assigning version
    appJson.expo = appJson.expo || {};
    appJson.expo.version = versionA;

    fs.writeFileSync(repoAAppJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
    console.log(`✅ Successfully updated ${repoAName}'s app.json expo.version to ${versionA}.`);
  } else {
    console.warn(`⚠️ Could not find ${repoAName}'s app.json at: ${repoAAppJsonPath}`);
  }

  // 3. Read Repo B, update the version, and write it back
  if (fs.existsSync(repoBPath)) {
    const pkgB = JSON.parse(fs.readFileSync(repoBPath, 'utf8'));
    pkgB.version = versionA;

    fs.writeFileSync(repoBPath, JSON.stringify(pkgB, null, 2) + '\n', 'utf8');
    console.log(`✅ Successfully copied version ${versionA} from ${repoAName} to ${repoBName}.`);
  } else {
    console.error(`❌ Could not find ${repoBName}'s package.json at: ${repoBPath}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error syncing versions:', error.message);
  process.exit(1);
}