import { generateOpenAPIDocument } from '@trpc/openapi';
import { createClient } from '@hey-api/openapi-ts';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { createTRPCHeyApiTypeResolvers } from '@trpc/openapi/heyapi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const routerPath = path.resolve(
	__dirname,
	"..",
	"..",
	"apps",
	"backend",
	"src",
	"appRouter.ts",
);
const outputDir = path.resolve(__dirname, '..', 'client', 'generated');
const docDir = path.resolve(__dirname, '..', '..', 'doc');
const specPath = path.resolve(docDir, 'openapi.json');

async function main() {
  // Generate the OpenAPI document from the router
  const doc = await generateOpenAPIDocument(routerPath, {
    exportName: 'AppRouter',
    title: 'Example API',
    version: '1.0.0',
  });

  mkdirSync(docDir, { recursive: true });
  writeFileSync(specPath, JSON.stringify(doc, null, 2) + '\n');
  console.log('OpenAPI spec written to', specPath);

  rmSync(outputDir, { recursive: true, force: true });

  await createClient({
    input: specPath,
    output: outputDir,
    plugins: [
      {
        name: '@hey-api/typescript',
        '~resolvers': createTRPCHeyApiTypeResolvers(),
      },
      {
        name: '@hey-api/sdk',
        operations: { strategy: 'single' },
      },
    ],
    logs: { level: 'info' },
  });

  console.log('SDK generated at', outputDir);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
