#!/usr/bin/env node

// Simple deploy script that auto-confirms
const { spawn } = require('child_process');
const path = require('path');

const cwd = 'c:\\Users\\LB70XE\\OneDrive - ING\\Desktop\\10xDevs_MVP';

console.log('🚀 Deploying to Cloudflare...');

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
