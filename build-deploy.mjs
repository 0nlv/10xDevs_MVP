#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildAndDeploy() {
  try {
    console.log('🔨 Building...');
    const buildResult = await execAsync('npm run build', {
      cwd: 'c:\\Users\\LB70XE\\OneDrive - ING\\Desktop\\10xDevs_MVP',
      shell: 'cmd.exe'
    });
    console.log(buildResult.stdout);
    
    console.log('\n🚀 Deploying...');
    const deployResult = await execAsync('npx wrangler deploy', {
      cwd: 'c:\\Users\\LB70XE\\OneDrive - ING\\Desktop\\10xDevs_MVP',
      shell: 'cmd.exe',
      input: 'Y\n'
    });
    console.log(deployResult.stdout);
    
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

buildAndDeploy();
