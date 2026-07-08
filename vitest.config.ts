import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Plugin, defineConfig } from "vitest/config";

// The Cloudflare bundler turns `import x from './f.ttf'` / '*.wasm' into a binary
// module (ArrayBuffer for Data rules, WebAssembly.Module for wasm). vitest/vite has
// no equivalent, so tests that touch src/ogp.ts (fonts + resvg wasm) fail to load.
// This `enforce: 'pre'` load hook serves any .ttf/.wasm as a default-exported
// ArrayBuffer, winning over vite's native wasm plugins. resvg `initWasm` accepts a
// BufferSource and `new Uint8Array(arrayBuffer)` builds the font buffers, so an
// ArrayBuffer is a faithful stand-in for the Worker contract in both cases.
// The resvg wasm lives in node_modules, so it must be inlined (below) for this hook
// to run instead of Node's native ESM-wasm loader (which fails on its `wbg` import).
const BINARY_RE = /\.(ttf|wasm)(\?.*)?$/;

function binaryArrayBufferLoader(): Plugin {
	return {
		name: "binary-arraybuffer-loader",
		enforce: "pre",
		load(id) {
			const path = id.split("?")[0];
			if (!path.endsWith(".ttf") && !path.endsWith(".wasm")) return null;
			const b64 = readFileSync(path).toString("base64");
			return `const _bytes = Uint8Array.from(atob(${JSON.stringify(
				b64,
			)}), (c) => c.charCodeAt(0));\nexport default _bytes.buffer;`;
		},
	};
}

export default defineConfig({
	plugins: [binaryArrayBufferLoader()],
	test: {
		globals: true,
		server: {
			// Pull the resvg wasm through vite's transform pipeline so the loader above
			// serves its bytes instead of Node externalizing it.
			deps: { inline: [/@resvg\/resvg-wasm/] },
		},
	},
	resolve: {
		alias: {
			"~": resolve(__dirname, "./src"),
			// Vitest matches alias against the raw specifier; map the wasm subpath to
			// its real file so the loader hook receives a concrete .wasm path.
			"@resvg/resvg-wasm/index_bg.wasm": resolve(
				__dirname,
				"node_modules/@resvg/resvg-wasm/index_bg.wasm",
			),
		},
	},
	assetsInclude: [/\.(ttf|wasm)(\?.*)?$/],
});
