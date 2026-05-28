import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths to both package.json files
const repoAPath = path.join(__dirname, 'package.json');
// Adjust '../repo-b' to match the actual relative path to Repo B on your machine
const repoBPath = path.join(__dirname, '../drinaluza-expo-releases/package.json');

try {
  // 1. Read Repo A's version
  const pkgA = JSON.parse(fs.readFileSync(repoAPath, 'utf8'));
  const versionA = pkgA.version;

  // 2. Read Repo B, update the version, and write it back
  if (fs.existsSync(repoBPath)) {
    const pkgB = JSON.parse(fs.readFileSync(repoBPath, 'utf8'));
    pkgB.version = versionA;

    // fs.writeFileSync formats the JSON nicely with a 2-space indent and a trailing newline
    fs.writeFileSync(repoBPath, JSON.stringify(pkgB, null, 2) + '\n', 'utf8');
    
    console.log(`✅ Successfully copied version ${versionA} from Repo A to Repo B.`);
  } else {
    console.error(`❌ Could not find Repo B's package.json at: ${repoBPath}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error syncing versions:', error.message);
  process.exit(1);
}