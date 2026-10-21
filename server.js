// Direct entry point running src/server.ts via ts-node without needing a dist folder
require('ts-node/register/transpile-only');
require('./src/server.ts');
