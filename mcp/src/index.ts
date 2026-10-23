import { env } from './config/env';
import { startHttp } from './transports/http';
import { startStdio } from './transports/stdio';

const bootstrap = async () => {
  if (env.transport === 'http') {
    await startHttp();
    return;
  }

  await startStdio();
};

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('MCP server failed:', error);
    process.exitCode = 1;
  });
}
