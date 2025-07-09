import { spawn } from 'child_process';

console.log('🚀 Starting TitleTesterPro services...');

// Start the main server
const server = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
});

// Start the title rotation worker
const worker = spawn('tsx', ['server/workers/titleRotationWorker.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
});

// Handle process termination
const shutdown = () => {
  console.log('\n🛑 Shutting down services...');
  server.kill('SIGTERM');
  worker.kill('SIGTERM');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Monitor process health
server.on('exit', (code) => {
  console.error(`❌ Server exited with code ${code}`);
  shutdown();
});

worker.on('exit', (code) => {
  console.error(`❌ Worker exited with code ${code}`);
  shutdown();
});

console.log('✅ All services started');