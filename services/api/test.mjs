import { buildServer } from './src/server.js';

async function main() {
  try {
    console.log('Building server...');
    const server = await buildServer();
    console.log('✅ Server built successfully');

    console.log('Starting server on port 3000...');
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('✅ Server listening on http://localhost:3000');

    // Test health endpoint
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log('✅ Health check:', data);

    // Test session creation
    const sessionResponse = await fetch('http://localhost:3000/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '测试会话' })
    });
    const session = await sessionResponse.json();
    console.log('✅ Session created:', session);

    // Close server after 2 seconds
    setTimeout(async () => {
      await server.close();
      console.log('✅ Server closed');
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
