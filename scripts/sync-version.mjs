import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo A
const repoAPath = path.join(__dirname, '../package.json');
const appConfigPaths = [
  path.join(__dirname, '../app.json'),
  path.join(__dirname, '../app.dev.json'),
  path.join(__dirname, '../app.prod.json'),
];

const repoAName = 'drinaluza-expo';

// Repo B
const repoBPath = path.join(
  __dirname,
  '../../drinaluza-expo-releases/package.json'
);
const repoBName = 'drinaluza-expo-releases';

try {
  // 1. Read Repo A's package.json version
  const pkgA = JSON.parse(fs.readFileSync(repoAPath, 'utf8'));
  const versionA = pkgA.version;

  if (!versionA) {
    throw new Error(`${repoAName}/package.json does not contain a version.`);
  }

  console.log(`📦 ${repoAName} version: ${versionA}`);

  // 2. Update expo.version in all Expo config files
  for (const appConfigPath of appConfigPaths) {
    if (!fs.existsSync(appConfigPath)) {
      console.warn(`⚠️ Could not find: ${appConfigPath}`);
      continue;
    }

    const appConfig = JSON.parse(
      fs.readFileSync(appConfigPath, 'utf8')
    );

    // Ensure expo object exists
    appConfig.expo ??= {};

    appConfig.expo.version = versionA;

    fs.writeFileSync(
      appConfigPath,
      JSON.stringify(appConfig, null, 2) + '\n',
      'utf8'
    );

    console.log(
      `✅ Updated ${path.basename(appConfigPath)} expo.version → ${versionA}`
    );
  }

  // 3. Update Repo B's package.json version
  if (fs.existsSync(repoBPath)) {
    const pkgB = JSON.parse(fs.readFileSync(repoBPath, 'utf8'));

    pkgB.version = versionA;

    fs.writeFileSync(
      repoBPath,
      JSON.stringify(pkgB, null, 2) + '\n',
      'utf8'
    );

    console.log(
      `✅ Updated ${repoBName}/package.json version → ${versionA}`
    );
  } else {
    console.error(
      `❌ Could not find ${repoBName}'s package.json at: ${repoBPath}`
    );
    process.exit(1);
  }

  console.log('🎉 Version synchronization completed successfully.');
} catch (error) {
  console.error('❌ Error syncing versions:', error.message);
  process.exit(1);
}