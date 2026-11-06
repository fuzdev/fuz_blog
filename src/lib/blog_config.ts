import * as s from '@fuzdev/fuz_schema/schema.ts';
import { strip_end } from '@fuzdev/fuz_util/string.ts';

import { BlogFeedMetadata } from './blog.ts';
import type { BlogPostId } from './blog_post_id.ts';

/**
 * The blogs registry, the consumer's `src/routes/blogs.ts`: each blog's
 * `BlogConfig`, the registry's validation, and resolving a blog by its `dirname`.
 * Free of node, gro, and Svelte imports, so gen, the tasks, and routes share it.
 *
 * @module
 */

/**
 * A single blog's configuration in the consumer's `src/routes/blogs.ts` registry.
 */
export interface BlogConfig {
	/**
	 * Route directory under `src/routes`, and the blog's base path segment -
	 * so it equals the URL path, with no route groups or params, no leading or
	 * trailing slash, and no characters a URL would change (see
	 * `validate_blog_configs`). Post `pathname`s derive from it.
	 */
	dirname: string;

	/**
	 * Feed-level metadata. Post `id`s and `url`s and the feed's own URL derive
	 * from `home_page_url`, so set it to the blog's index page - its pathname must
	 * end with `/<dirname>`, after any deploy base path.
	 */
	feed: BlogFeedMetadata;

	/**
	 * Customizes the post file `gro task src/lib/post.task.ts` scaffolds for this blog.
	 * Defaults to `scaffold_blog_post`.
	 */
	scaffold?: (options: BlogPostScaffoldOptions) => string;
}

/**
 * The options `gro task src/lib/post.task.ts` passes to a `BlogConfig` `scaffold`.
 */
export interface BlogPostScaffoldOptions {
	title: string;
	/**
	 * The new post's id, the first part of its `<id>-<slug>` directory name.
	 */
	blog_post_id: BlogPostId;
	/**
	 * The new post's slug, the second part of its `<id>-<slug>` directory name.
	 * Not post metadata - available for scaffolds that reference it in content.
	 */
	slug: string;
	/**
	 * Used for both `date_published` and `date_modified`.
	 */
	date: string;
	/**
	 * Import specifier for fuz_blog modules -
	 * `#lib` inside fuz_blog itself, `@fuzdev/fuz_blog` in consumers.
	 */
	fuz_blog_import_path: string;
}

/**
 * The shape of the consumer's `src/routes/blogs.ts` module.
 */
export interface BlogsModule {
	blogs: Array<BlogConfig>;
}

// the keys of `BlogConfig`, so a misspelled or removed option fails instead of being ignored
const BLOG_CONFIG_KEYS: ReadonlySet<string> = new Set(
	Object.keys({ dirname: true, feed: true, scaffold: true } satisfies Record<
		keyof BlogConfig,
		true
	>)
);

/**
 * Validates the blogs registry, called by `load_blogs_module` so `gro gen` and the
 * post tasks check it before touching any post file: each config is an object with
 * only `BlogConfig` keys and a function or omitted `scaffold`, each
 * `dirname` is a well-formed and unique string, each `feed` is a strict `BlogFeedMetadata`
 * (so a leftover `atom`, now derived, fails), and each `home_page_url` has no query
 * or fragment and a pathname (trailing slash ignored) ending with `/<dirname>`,
 * optionally after a deploy base path (e.g. `https://user.github.io/repo/blog`).
 * Post `url`s and the feed URL derive from `home_page_url` while the posts are
 * routes under `src/routes/<dirname>`, so a mismatch would publish broken links.
 * @param blogs - the registry's `blogs` export, unvalidated
 * @throws Error naming the first invalid blog
 */
export const validate_blog_configs: (
	blogs: Array<unknown>
) => asserts blogs is Array<BlogConfig> = (blogs) => {
	const dirnames: Set<string> = new Set();
	for (const [i, config] of blogs.entries()) {
		if (typeof config !== 'object' || config === null || Array.isArray(config)) {
			throw new Error(`invalid blog config at index ${i} - expected an object`);
		}
		const { dirname, feed, scaffold } = config as Record<string, unknown>;
		if (typeof dirname !== 'string') {
			throw new Error(
				`invalid blog dirname at index ${i} - expected a string, received ${dirname === null ? 'null' : typeof dirname}`
			);
		}
		const segments = dirname.split('/');
		// these change what `URL` or the router sees - `\\` becomes `/`, `?` and `#` start a query or
		// fragment, `%` reads as an escape when routes match, `URL` trims trailing spaces and drops
		// tabs and newlines - the negated range matches U+0000-U+0020 and U+007F
		if (
			/[\\?#%]|[^\u0021-\u007e\u0080-\uffff]/.test(dirname) ||
			segments.some((segment) => segment === '' || segment === '.' || segment === '..')
		) {
			throw new Error(
				`invalid blog dirname ${JSON.stringify(dirname)} - expected route path segments with no leading or trailing slash, ` +
					'no `.` or `..` segments, and no `\\`, `?`, `#`, `%`, space, or ASCII control characters'
			);
		}
		// the dirname must equal the URL path, which route groups and params do not
		if (segments.some((segment) => /^\(.*\)$/.test(segment) || /[[\]]/.test(segment))) {
			throw new Error(
				`invalid blog dirname ${JSON.stringify(dirname)} - route groups like \`(group)\` and params like \`[param]\` ` +
					'are not supported, the dirname must equal the URL path'
			);
		}
		// two blogs with one `dirname` would write the same files
		if (dirnames.has(dirname)) {
			throw new Error(`duplicate blog dirname ${JSON.stringify(dirname)} in the blogs registry`);
		}
		dirnames.add(dirname);

		const unknown_keys = Object.keys(config).filter((key) => !BLOG_CONFIG_KEYS.has(key));
		if (unknown_keys.length > 0) {
			throw new Error(
				`unknown ${JSON.stringify(dirname)} blog config ${unknown_keys.length === 1 ? 'key' : 'keys'} ` +
					`${unknown_keys.map((key) => JSON.stringify(key)).join(', ')} - expected only ` +
					[...BLOG_CONFIG_KEYS].map((key) => JSON.stringify(key)).join(', ')
			);
		}
		if (scaffold !== undefined && typeof scaffold !== 'function') {
			throw new Error(
				`invalid ${JSON.stringify(dirname)} scaffold - expected a function or undefined, received ${typeof scaffold}`
			);
		}

		const parsed = s.parse(BlogFeedMetadata, feed);
		if (!parsed.ok) {
			throw new Error(
				`invalid ${JSON.stringify(dirname)} feed metadata:\n${parsed.issues.map(s.format_issue).join('\n')}`
			);
		}

		const { home_page_url } = parsed.value;
		// the raw string, since `URL` reports an empty `?` or `#` as no query or fragment
		if (/[?#]/.test(home_page_url)) {
			throw new Error(
				`${JSON.stringify(dirname)} home_page_url ${JSON.stringify(home_page_url)} has a query or fragment - post and feed URLs append to it`
			);
		}
		// both percent-encoded, so a dirname with non-ASCII characters compares equal - `URL` encodes
		// the dirname (which has no `%`) with uppercase hex but keeps the home_page_url's escapes as
		// written, so only that side needs its hex case normalized
		const pathname = to_uppercase_escapes(strip_end(new URL(home_page_url).pathname, '/'));
		const dirname_pathname = new URL('https://localhost/' + dirname).pathname;
		if (!pathname.endsWith(dirname_pathname)) {
			throw new Error(
				`${JSON.stringify(dirname)} home_page_url ${JSON.stringify(home_page_url)} must end with /${dirname}, ` +
					`the blog's route under src/routes, after any deploy base path - post and feed URLs derive from it`
			);
		}
	}
};

// uppercases the hex digits of percent escapes, `%c3%a9` to `%C3%A9`
const to_uppercase_escapes = (pathname: string): string =>
	pathname.replace(/%[0-9a-f]{2}/gi, (escape) => escape.toUpperCase());

/**
 * Resolves a `BlogConfig` from the registry by its `dirname`,
 * defaulting to the first registered blog when `dirname` is omitted.
 * Throws when `dirname` matches no registered blog.
 */
export const resolve_blog_config = (
	blogs: Array<BlogConfig>,
	dirname: string | undefined
): BlogConfig => {
	const config = dirname ? blogs.find((b) => b.dirname === dirname) : blogs[0];
	if (!config) {
		throw new Error(
			`unknown blog ${JSON.stringify(dirname)}, expected one of: ` +
				blogs.map((b) => b.dirname).join(', ')
		);
	}
	return config;
};
