const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(repoRoot, 'release');

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function main() {
  if (!fs.existsSync(releaseDir)) {
    console.log('release directory does not exist');
    return;
  }
  const artifacts = fs
    .readdirSync(releaseDir)
    .filter((name) => /\.(exe|msi|zip|7z)$/i.test(name))
    .map((name) => {
      const filePath = path.join(releaseDir, name);
      const stat = fs.statSync(filePath);
      return {
        name,
        path: filePath,
        size: stat.size,
        sha256: sha256(filePath),
      };
    })
    .sort((a, b) => b.size - a.size);

  if (!artifacts.length) {
    console.log('no release artifacts found');
    return;
  }

  console.log('Release artifacts:');
  for (const item of artifacts) {
    console.log(`- ${item.name}`);
    console.log(`  path: ${item.path}`);
    console.log(`  size: ${formatSize(item.size)}`);
    console.log(`  sha256: ${item.sha256}`);
    if (/Setup .*\.exe$/i.test(item.name) && item.size < 1024 * 1024) {
      console.log('  warning: installer is suspiciously small; prefer portable artifact.');
    }
  }
}

main();
