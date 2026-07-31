const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = 'c:\\Users\\LB70XE\\OneDrive - ING\\Desktop\\10xDevs_MVP';

console.log('🧹 Cleaning old build artifacts...');
try {
  const dirsToRemove = [
    path.join(projectDir, '.output'),
    path.join(projectDir, 'dist'),
    path.join(projectDir, 'node_modules', '.astro')
  ];
  
  dirsToRemove.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`  Removing: ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
} catch (err) {
  console.error('Cleanup error:', err.message);
}

console.log('\n🚀 Building...');
try {
  execSync('npm run build', {
    cwd: projectDir,
    stdio: 'inherit',
    shell: process.env.ComSpec || 'cmd.exe'
  });
  console.log('\n✅ Build completed!');
  
  // Check if .output exists
  if (fs.existsSync(path.join(projectDir, '.output', '_worker.js'))) {
    console.log('✅ .output/_worker.js found - ready for deploy');
  } else {
    console.log('❌ .output/_worker.js NOT found - build incomplete');
    process.exit(1);
  }
} catch (err) {
  console.error('Build error:', err.message);
  process.exit(1);
}
