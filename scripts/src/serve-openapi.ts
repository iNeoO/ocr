import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = "localhost";
const port = 3001;
const openApiPath = path.resolve(__dirname, "..", "..", "doc", "openapi.json");

const getHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OCR API Reference</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference("#app", {
        url: "http://${host}:${port}/openapi.json",
      });
    </script>
  </body>
</html>`;

const server = createServer((req, res) => {
	if (req.url === "/openapi.json") {
		const openApiDocument = readFileSync(openApiPath, "utf-8");
		res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
		res.end(openApiDocument);
		return;
	}

	res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
	res.end(getHtml());
});

server.listen(port, host, () => {
	console.log(`Scalar docs available at http://${host}:${port}`);
});
