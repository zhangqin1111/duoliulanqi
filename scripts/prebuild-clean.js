const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(repoRoot, 'release');
const patterns = [/\.blockmap$/i, /\.tmp$/i, /-unpacked$/i, /^builder-/i];

function removeTarget(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`removed ${path.relative(repoRoot, target)}`);
}

function main() {
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const name of fs.readdirSync(releaseDir)) {
    const full = path.join(releaseDir, name);
    const stat = fs.statSync(full);
    const shouldRemove =
      patterns.some((pattern) => pattern.test(name)) ||
      (stat.isFile() && /Setup .*\.exe$/i.test(name) && stat.size < 1024 * 1024);
    if (shouldRemove) removeTarget(full);
  }
  console.log('prebuild clean complete');
}

main();
