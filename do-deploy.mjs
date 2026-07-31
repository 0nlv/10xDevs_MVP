#!/usr/bin/env node
import { spawn } from 'child_process';

const cwd = 'c:\\Users\\LB70XE\\OneDrive - ING\\Desktop\\10xDevs_MVP';

console.log('🚀 Building and deploying to Cloudflare...');

const proc = spawn('npx', ['wrangler', 'deploy'], {
  cwd: cwd,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true
});

// Auto-respond "Y" to any prompts
proc.stdin.write('Y\n');
setTimeout(() => proc.stdin.end(), 1000);

proc.on('close', (code) => {
  console.log(`\n✅ Deploy complete! Exit code: ${code}`);
  process.exit(code);
});
