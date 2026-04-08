import { generateOpenAPIDocument } from '@trpc/openapi';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

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

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
