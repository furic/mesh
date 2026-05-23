import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Vercel adapter. Routes default to Node serverless functions; individual
		// routes can opt into the Edge runtime later via `export const config`.
		adapter: adapter()
	}
};

export default config;
