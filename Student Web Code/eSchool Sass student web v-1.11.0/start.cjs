async function startServer() {
  const { spawn } = await import('node:child_process');
  const server = spawn(process.execPath, ['server.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NODE_PORT: '8001',
    },
    stdio: 'inherit',
  });

  server.on('error', (error) => {
    console.error('Failed to start the Student Web Portal server:', error.message);
    process.exitCode = 1;
  });

  server.on('exit', (code, signal) => {
    process.exitCode = signal ? 1 : (code ?? 0);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.kill(signal));
  }
}

startServer().catch((error) => {
  console.error('Failed to start the Student Web Portal server:', error.message);
  process.exitCode = 1;
});
