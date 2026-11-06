import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import type { BlogFeedMetadata } from './blog.ts';
import { validate_blog_configs, type BlogConfig } from './blog_config.ts';

/**
 * Plans wiring fuz_blog into a SvelteKit project, for `init.task.ts`: from the
 * project's state, the files to create, the existing files to leave alone, and
 * the edits to existing files to suggest. Pure and free of node, gro, and Svelte
 * imports - `load_blog_init_state` reads the state and `write_blog_init_files`
 * writes the planned files.
 *
 * @module
 */

/**
 * The options of `init.task.ts`, before defaults from `package.json`.
 */
export interface BlogInitOptions {
	/** The new blog's `dirname`. */
	dirname: string;
	/** The site URL including any deploy base path, defaulting to `package.json` `homepage`. */
	url?: string;
	/** The feed title, defaulting to `<package name> <dirname>`. */
	title?: string;
	/** The feed description, defaulting to `package.json` `description`, then the title. */
	description?: string;
	/** The feed author as `Name <email> (url)`, defaulting to `package.json` `author`. */
	author?: string;
	/** The feed's `icon` and `favicon` URL, defaulting to `<url>/favicon.png`. */
	icon?: string;
}

/**
 * The `package.json` fields `plan_blog_init` reads.
 */
export interface BlogInitPackageJson {
	name?: string;
	description?: string;
	homepage?: string;
	author?: unknown;
}

/**
 * The project's state as `plan_blog_init` needs it, read by `load_blog_init_state`.
 * Paths are relative to the project root.
 */
export interface BlogInitState {
	package_json: BlogInitPackageJson;
	/** SvelteKit's `files.routes`, which fuz_blog requires to be `src/routes`. */
	routes_path: string;
	routes_dir_exists: boolean;
	/** The paths from `to_blog_init_paths` that exist. */
	existing_paths: ReadonlySet<string>;
	/** The existing `src/routes/blogs.ts` registry's blogs, validated, or `null` when missing. */
	blogs: Array<BlogConfig> | null;
	/** The existing param matchers module, or the one to create, e.g. `src/params.ts`. */
	params_path: string;
	/** The param matchers module's content, `null` when missing. */
	params_content: string | null;
	/** The root `+layout.svelte`'s content, `null` when missing. */
	root_layout_content: string | null;
}

/**
 * One planned step of `plan_blog_init`: create a missing file, leave an existing
 * one alone, or suggest an edit the user makes by hand.
 */
export type BlogInitAction =
	| { kind: 'create'; path: string; content: string }
	| { kind: 'exists'; path: string }
	| { kind: 'suggest'; path: string; message: string; snippet: string };

export interface BlogInitPlan {
	/** The new blog's config, validated, written to or suggested for `blogs.ts`. */
	config: BlogConfig;
	actions: Array<BlogInitAction>;
	/**
	 * Whether the registry includes the blog after the plan is applied, so `gro gen`
	 * can write its `feed.ts` - false when the entry is only suggested, in which case
	 * the blog's routes, which import that `feed.ts`, wait for the next run.
	 */
	blog_registered: boolean;
	/** Likely mistakes that don't stop the plan, like a repo URL as the site URL. */
	warnings: Array<string>;
}

export const BLOG_INIT_BLOGS_PATH = 'src/routes/blogs.ts';
export const BLOG_INIT_ROOT_LAYOUT_PATH = 'src/routes/+layout.svelte';

export interface BlogInitPaths {
	blogs: string;
	gen: string;
	post_task: string;
	update_post_task: string;
	layout: string;
	page: string;
}

/**
 * The project files `plan_blog_init` creates when missing, by role.
 */
export const to_blog_init_paths = (dirname: string): BlogInitPaths => ({
	blogs: BLOG_INIT_BLOGS_PATH,
	gen: 'src/lib/blog.gen.ts',
	post_task: 'src/lib/post.task.ts',
	update_post_task: 'src/lib/update_post.task.ts',
	layout: `src/routes/${dirname}/+layout.svelte`,
	page: `src/routes/${dirname}/+page.svelte`
});

/**
 * Parses an npm `author`, a `Name <email> (url)` string or a `{name, email, url}`
 * object, into feed author metadata. Returns `null` for a missing or nameless author.
 */
export const parse_blog_init_author = (author: unknown): BlogFeedMetadata['author'] | null => {
	if (typeof author === 'string') {
		const match = /^([^<(]*?)\s*(?:<([^>]*)>)?\s*(?:\(([^)]*)\))?$/.exec(author.trim());
		const name = match?.[1];
		if (!name) return null;
		const email = match[2]?.trim();
		const url = match[3]?.trim();
		return { name, ...(url && { url }), ...(email && { email }) };
	}
	if (typeof author === 'object' && author !== null) {
		const { name, url, email } = author as Record<string, unknown>;
		if (typeof name !== 'string' || !name.trim()) return null;
		return {
			name: name.trim(),
			...(typeof url === 'string' && url && { url }),
			...(typeof email === 'string' && email && { email })
		};
	}
	return null;
};

/**
 * Plans `init.task.ts`: resolves the new blog's config from `options` and
 * `package.json`, validates it with `validate_blog_configs`, and lists an action
 * for each file - creating only missing files and suggesting edits to existing
 * ones, so running it again changes nothing. Generated files import from
 * `@fuzdev/fuz_blog` and are unformatted.
 * @throws Error when run in fuz_blog itself, without a `src/routes` directory,
 * without a site URL or author, or when the resolved config is invalid
 */
export const plan_blog_init = (options: BlogInitOptions, state: BlogInitState): BlogInitPlan => {
	const { dirname } = options;
	const { package_json } = state;

	if (package_json.name === '@fuzdev/fuz_blog') {
		throw new Error('fuz_blog is already wired up - run init in a project that depends on it');
	}
	if (state.routes_path !== 'src/routes') {
		throw new Error(
			`fuz_blog requires SvelteKit's routes at src/routes, but this project configures ${state.routes_path}`
		);
	}
	if (!state.routes_dir_exists) {
		throw new Error('no src/routes directory - run init in the root of a SvelteKit project');
	}

	const { config, warnings } = resolve_blog_init_config(options, package_json);

	const paths = to_blog_init_paths(dirname);
	const actions: Array<BlogInitAction> = [];
	const create_unless_exists = (path: string, content: string): void => {
		actions.push(
			state.existing_paths.has(path) ? { kind: 'exists', path } : { kind: 'create', path, content }
		);
	};

	// the registry - the blog's routes import its generated `feed.ts`, so they wait
	// until the blog is registered and gen can write it
	const already_registered = !!state.blogs?.some((b) => b.dirname === dirname);
	const deferred_route_paths = [paths.layout, paths.page].filter(
		(path) => !state.existing_paths.has(path)
	);
	if (!state.blogs) {
		create_unless_exists(paths.blogs, render_blogs_module(config));
	} else if (already_registered) {
		actions.push({ kind: 'exists', path: paths.blogs });
	} else {
		actions.push({
			kind: 'suggest',
			path: paths.blogs,
			message:
				`add the ${JSON.stringify(dirname)} blog to the \`blogs\` array, then run init again` +
				(deferred_route_paths.length
					? ` to create ${deferred_route_paths.join(' and ')} and run \`gro gen\``
					: ' or `gro gen`'),
			snippet: to_ts_literal(config) + ','
		});
	}
	const blog_registered = !state.blogs || already_registered;

	// the gen file and tasks, run by path so they must be local
	create_unless_exists(paths.gen, `export {gen} from '@fuzdev/fuz_blog/blog.gen.ts';\n`);
	create_unless_exists(paths.post_task, `export * from '@fuzdev/fuz_blog/post.task.ts';\n`);
	create_unless_exists(
		paths.update_post_task,
		`export * from '@fuzdev/fuz_blog/update_post.task.ts';\n`
	);

	// the param matcher for the generated redirect route
	if (state.params_content === null) {
		actions.push({ kind: 'create', path: state.params_path, content: PARAMS_MODULE });
	} else if (/\bblog_post_id\s*:/.test(state.params_content)) {
		actions.push({ kind: 'exists', path: state.params_path });
	} else {
		actions.push({
			kind: 'suggest',
			path: state.params_path,
			message:
				'register the `blog_post_id` param matcher for the generated redirect route, importing it and adding it to your `defineParams` call',
			snippet: `import {blog_post_id_param} from '@fuzdev/fuz_blog/blog_post_id.ts';\n\nblog_post_id: blog_post_id_param,`
		});
	}

	// the blog's routes
	if (blog_registered) {
		create_unless_exists(paths.layout, BLOG_LAYOUT);
		create_unless_exists(paths.page, BLOG_PAGE);
	}

	// feed discovery from every page
	if (state.root_layout_content === null) {
		actions.push({ kind: 'create', path: BLOG_INIT_ROOT_LAYOUT_PATH, content: ROOT_LAYOUT });
	} else if (state.root_layout_content.includes('application/atom+xml')) {
		actions.push({ kind: 'exists', path: BLOG_INIT_ROOT_LAYOUT_PATH });
	} else {
		actions.push({
			kind: 'suggest',
			path: BLOG_INIT_ROOT_LAYOUT_PATH,
			message:
				"link each blog's Atom feed so feed readers discover it from any page - add these imports to its `<script>` and this `<svelte:head>` block",
			snippet: ROOT_LAYOUT_FEED_LINKS
		});
	}

	return { config, actions, blog_registered, warnings };
};

const resolve_blog_init_config = (
	options: BlogInitOptions,
	package_json: BlogInitPackageJson
): { config: BlogConfig; warnings: Array<string> } => {
	const { dirname } = options;

	const raw_url = options.url ?? package_json.homepage;
	if (!raw_url) {
		throw new Error(
			'no site URL - pass `--url https://www.example.com` or set `homepage` in package.json'
		);
	}
	const url = raw_url.trim().replace(/\/+$/, '');
	const url_source = options.url ? '`--url`' : 'package.json `homepage`';
	const warnings: Array<string> = [];
	if (URL.canParse(url) && /(^|\.)(github\.com|npmjs\.com)$/.test(new URL(url).hostname)) {
		warnings.push(
			`the site URL ${JSON.stringify(url)} from ${url_source} looks like a repo or package page - pass \`--url\` with the URL the site deploys to`
		);
	}

	const author = parse_blog_init_author(options.author ?? package_json.author);
	if (!author) {
		throw new Error(
			options.author !== undefined
				? `invalid \`--author\` ${JSON.stringify(options.author)} - expected \`Name <email> (url)\` with the email and url optional`
				: 'no author - pass `--author "Your Name <you@example.com> (https://www.example.com)"` or set `author` in package.json'
		);
	}

	const name = package_json.name?.replace(/^@[^/]+\//, '');
	// the dirname distinguishes a project's blogs, e.g. `site blog` and `site notes`
	const title = options.title ?? (name ? `${name} ${dirname}` : dirname);
	const home_page_url = `${url}/${dirname}`;
	const icon = options.icon ?? `${url}/favicon.png`;

	const config: BlogConfig = {
		dirname,
		feed: {
			title,
			id: home_page_url,
			home_page_url,
			description: options.description ?? package_json.description ?? title,
			icon,
			favicon: icon,
			author
		}
	};

	// validate before anything is written
	try {
		validate_blog_configs([config]);
	} catch (err) {
		const author_source = options.author !== undefined ? '`--author`' : 'package.json `author`';
		throw new Error(
			`invalid blog config (site URL ${JSON.stringify(raw_url)} from ${url_source}, author from ${author_source}; ` +
				`\`--url\` and \`--author\` override package.json): ${to_error_message(err)}`
		);
	}

	return { config, warnings };
};

const render_blogs_module = (
	config: BlogConfig
): string => `import type {BlogConfig} from '@fuzdev/fuz_blog/blog_config.ts';

export const blogs: Array<BlogConfig> = [
	${to_ts_literal(config, '\t')},
];
`;

const PARAMS_MODULE = `import {defineParams} from '@sveltejs/kit/params';
import {blog_post_id_param} from '@fuzdev/fuz_blog/blog_post_id.ts';

// \`blog_post_id\` matches the generated \`[post=blog_post_id]\` redirect routes
export const params = defineParams({blog_post_id: blog_post_id_param});
`;

// interpolated so gro's dist pass, which rewrites relative `.ts` import specifiers
// to `.js` even inside template strings, leaves the generated imports alone
const FEED_MODULE = './feed.ts';
const BLOGS_MODULE = './blogs.ts';

const BLOG_LAYOUT = `<script lang="ts">
	import type {Snippet} from 'svelte';
	import {blog_feed_context} from '@fuzdev/fuz_blog/blog_feed_context.ts';

	import {feed} from '${FEED_MODULE}';

	const {children}: {children: Snippet} = $props();

	// \`BlogPost\` in this subtree reads the blog's feed from context
	blog_feed_context.set(feed);
</script>

{@render children()}
`;

const BLOG_PAGE = `<script lang="ts">
	import BlogPostList from '@fuzdev/fuz_blog/BlogPostList.svelte';

	import {feed} from '${FEED_MODULE}';
</script>

<svelte:head>
	<title>{feed.title}</title>
</svelte:head>

<BlogPostList {feed} />
`;

const ROOT_LAYOUT = `<script lang="ts">
	import type {Snippet} from 'svelte';
	import {to_blog_feed_url} from '@fuzdev/fuz_blog/blog.ts';

	import {blogs} from '${BLOGS_MODULE}';

	const {children}: {children: Snippet} = $props();
</script>

<svelte:head>
	{#each blogs as blog (blog.dirname)}
		<link
			rel="alternate"
			type="application/atom+xml"
			title={blog.feed.title}
			href={to_blog_feed_url(blog.feed.home_page_url)}
		/>
	{/each}
</svelte:head>

{@render children()}
`;

const ROOT_LAYOUT_FEED_LINKS = `<script lang="ts">
	// ...
	import {to_blog_feed_url} from '@fuzdev/fuz_blog/blog.ts';

	import {blogs} from '${BLOGS_MODULE}';
	// ...
</script>

<svelte:head>
	<!-- ... -->
	{#each blogs as blog (blog.dirname)}
		<link
			rel="alternate"
			type="application/atom+xml"
			title={blog.feed.title}
			href={to_blog_feed_url(blog.feed.home_page_url)}
		/>
	{/each}
</svelte:head>`;

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

// serializes JSON-like data as a TS literal - single-quoted strings and bare
// identifier keys - so a suggested snippet reads like the code it goes into
const to_ts_literal = (value: unknown, indent = ''): string => {
	if (typeof value === 'string') {
		return `'${JSON.stringify(value).slice(1, -1).replaceAll('\\"', '"').replaceAll("'", "\\'")}'`;
	}
	if (Array.isArray(value)) {
		if (!value.length) return '[]';
		const inner = indent + '\t';
		return `[\n${value.map((v) => inner + to_ts_literal(v, inner) + ',\n').join('')}${indent}]`;
	}
	if (typeof value === 'object' && value !== null) {
		const entries = Object.entries(value).filter(([, v]) => v !== undefined);
		if (!entries.length) return '{}';
		const inner = indent + '\t';
		return `{\n${entries
			.map(
				([k, v]) =>
					`${inner}${IDENTIFIER_PATTERN.test(k) ? k : JSON.stringify(k)}: ${to_ts_literal(v, inner)},\n`
			)
			.join('')}${indent}}`;
	}
	return String(value);
};
