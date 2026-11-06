import type { Flavored } from '@fuzdev/fuz_schema/schema.ts';
import { strip_end } from '@fuzdev/fuz_util/string.ts';
import { create_context } from '@fuzdev/fuz_ui/context_helpers.ts';
import { omit } from '@fuzdev/fuz_util/object.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { FeedDatetime, Feed, FeedUrl } from './feed.ts';
import { BLOG_POST_ID_SOURCE, is_blog_post_id_param } from './blog_post_id.ts';

// the `Feed` entries a blog author configures, shared by `BlogFeedMetadata` and `BlogFeed` -
// without `items`, from the posts, and `atom`, derived from `home_page_url`
const blog_feed_metadata_entries = omit(Feed.def, ['items', 'atom']);

/**
 * A blog's configured feed metadata: the `Feed` fields without `items`, which
 * come from the posts, and `atom`, which `gro gen` derives from `home_page_url`
 * (see `to_blog_feed_url`).
 */
export const BlogFeedMetadata = s.object(blog_feed_metadata_entries);
export type BlogFeedMetadata = s.Infer<typeof BlogFeedMetadata>;

/**
 * Derives a blog's Atom feed URL from its `home_page_url`. `gro gen` writes the
 * feed to `static/<dirname>/feed.xml`, served beside the blog's index, so the URL
 * is `<home_page_url>/feed.xml` (a trailing slash on `home_page_url` is ignored).
 */
export const to_blog_feed_url = (home_page_url: string): string =>
	join_blog_url(home_page_url, 'feed.xml');

// appends a path segment to a blog's `home_page_url`, ignoring its trailing slash
const join_blog_url = (home_page_url: string, segment: string): string =>
	strip_end(home_page_url, '/') + '/' + segment;

// Shared metadata fields, reused by the loose author input (`BlogPostMetadata`)
// and the strict feed entry (`BlogFeedItem`).
const blog_post_metadata_shape = {
	title: s.string,
	date_published: FeedDatetime, // TODO maybe calculated instead of manually defined?
	date_modified: FeedDatetime, // TODO maybe calculated instead of manually defined?
	summary: s.string,
	tags: s.optional(s.array(s.string))
};

/**
 * The author-defined metadata for each post. Loose so a consumer can add its own
 * fields (e.g. an autoblog's `model`); the extras stay on the page's `post` and
 * do not reach the generated `BlogFeed` (see `resolve_blog_feed_item`).
 * The slug is not metadata - it comes from the post's `<id>-<slug>` directory
 * name (see `parse_blog_post_dirname`).
 */
export const BlogPostMetadata = s.loose_object(blog_post_metadata_shape);
export type BlogPostMetadata = s.Infer<typeof BlogPostMetadata>;

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

/**
 * A post's positive integer id, the first part of its `<id>-<slug>` directory name.
 * Ids are unique within a blog and may have gaps.
 */
export type BlogPostId = Flavored<number, 'BlogPostId'>;

/**
 * A post directory's identity, parsed from its `<id>-<slug>` name by `parse_blog_post_dirname`.
 */
export interface BlogPostDir {
	blog_post_id: BlogPostId;
	slug: string;
}

// a slug is lowercase ASCII letters and digits in hyphen-separated runs
const BLOG_POST_SLUG_SOURCE = '[a-z0-9]+(?:-[a-z0-9]+)*';

/**
 * Matches a post slug: lowercase ASCII letters and digits in hyphen-separated runs.
 */
export const BLOG_POST_SLUG_PATTERN = new RegExp(`^${BLOG_POST_SLUG_SOURCE}$`);

// a post directory name, `<id>-<slug>`
const BLOG_POST_DIRNAME_PATTERN = new RegExp(
	`^(${BLOG_POST_ID_SOURCE})-(${BLOG_POST_SLUG_SOURCE})$`
);

/**
 * Parses a post directory name like `1-hello-world` into its id and slug.
 * The slug may itself start with digits (`1-2024-recap` is id 1, slug `2024-recap`).
 * @returns the id and slug, or `null` when `name` is not a valid post directory name
 * or its id is beyond the safe integer range
 */
export const parse_blog_post_dirname = (name: string): BlogPostDir | null => {
	const matched = BLOG_POST_DIRNAME_PATTERN.exec(name);
	if (!matched) return null;
	const blog_post_id = Number(matched[1]);
	if (!Number.isSafeInteger(blog_post_id)) return null;
	return { blog_post_id, slug: matched[2]! };
};

/**
 * Formats a post's directory name, `<id>-<slug>` - the inverse of `parse_blog_post_dirname`.
 */
export const to_blog_post_dirname = (post_dir: BlogPostDir): string =>
	post_dir.blog_post_id + '-' + post_dir.slug;

/**
 * Validates a blog's post directory names, returning the posts sorted by id.
 * A name starting with a digit claims to be a post and must parse with
 * `parse_blog_post_dirname`; other names (`[post=blog_post_id]`, a consumer's own routes)
 * are skipped.
 * @param names - the names of the subdirectories of a blog's route directory
 * @param blog_dirname - the blog's `dirname`, for error messages
 * @throws Error on an invalid post directory name or a duplicate id
 */
export const resolve_blog_post_dirs = (
	names: Array<string>,
	blog_dirname: string
): Array<BlogPostDir> => {
	const post_dirs: Array<BlogPostDir> = [];
	const names_by_id: Map<BlogPostId, string> = new Map();
	for (const name of names) {
		if (!/^\d/.test(name)) continue;
		const post_dir = parse_blog_post_dirname(name);
		if (!post_dir) {
			throw new Error(
				`invalid post directory name ${blog_dirname}/${name} - expected \`<id>-<slug>\`, ` +
					'a positive safe integer id without leading zeros and a slug of lowercase ASCII letters and digits in hyphen-separated runs'
			);
		}
		const existing = names_by_id.get(post_dir.blog_post_id);
		if (existing !== undefined) {
			throw new Error(
				`duplicate post id ${post_dir.blog_post_id} in ${blog_dirname}: ${existing} and ${name}`
			);
		}
		names_by_id.set(post_dir.blog_post_id, name);
		post_dirs.push(post_dir);
	}
	return post_dirs.sort((a, b) => a.blog_post_id - b.blog_post_id);
};

/**
 * Finds a blog's post by a query naming it: a bare id like `1` matches by id,
 * an `<id>-<slug>` directory name like `1-hello-world` matches that directory
 * exactly, and anything else matching `BLOG_POST_SLUG_PATTERN` matches by slug.
 * A directory name that matches no post falls back to matching by slug, since
 * a slug may itself look like `<id>-<slug>` (`5-1-x` has the slug `1-x`).
 * An existing directory name wins over an equal slug of another post.
 * Slugs are not unique across ids, so a slug matching more than one post throws -
 * query by id or directory name instead.
 * @param post_dirs - the blog's posts, from `resolve_blog_post_dirs`
 * @param query - the post's id, directory name, or slug
 * @param blog_dirname - the blog's `dirname`, for error messages
 * @throws Error when `query` is none of the three forms or matches no post or
 * more than one
 */
export const find_blog_post_dir = (
	post_dirs: Array<BlogPostDir>,
	query: string,
	blog_dirname: string
): BlogPostDir => {
	if (is_blog_post_id_param(query)) {
		const blog_post_id = Number(query);
		const found = post_dirs.find((d) => d.blog_post_id === blog_post_id);
		if (!found) throw new Error(`no ${blog_dirname} post with id ${blog_post_id}`);
		return found;
	}
	const parsed = parse_blog_post_dirname(query);
	if (parsed) {
		const found = post_dirs.find(
			(d) => d.blog_post_id === parsed.blog_post_id && d.slug === parsed.slug
		);
		if (found) return found;
	} else if (!BLOG_POST_SLUG_PATTERN.test(query)) {
		throw new Error(
			`invalid post ${JSON.stringify(query)} - expected an id like \`1\`, a directory name like \`1-hello-world\`, or a slug like \`hello-world\``
		);
	}
	const matches = post_dirs.filter((d) => d.slug === query);
	if (matches.length === 0) {
		throw new Error(
			`no ${blog_dirname} post with ${parsed ? 'directory name or ' : ''}slug ${query}`
		);
	}
	if (matches.length > 1) {
		throw new Error(
			`slug ${query} matches more than one ${blog_dirname} post - ${matches.map(to_blog_post_dirname).join(', ')} - pass the id or directory name instead`
		);
	}
	return matches[0]!;
};

/**
 * The id for a new post, one more than the highest existing id, so a deleted
 * post's id is not reused unless it was the highest.
 */
export const to_next_blog_post_id = (post_dirs: Array<BlogPostDir>): BlogPostId =>
	post_dirs.reduce((max, d) => Math.max(max, d.blog_post_id), 0) + 1;

/**
 * A feed entry, derived from a `BlogPostMetadata` by `resolve_blog_feed_item`.
 * Strict, so a leaked consumer field fails the generated feed's validation.
 */
export const BlogFeedItem = s.object({
	id: meta(s.string, {
		description:
			'the stable feed entry id, an absolute URL keyed by `blog_post_id` (e.g. `https://example.com/blog/1`) that redirects to `url`'
	}),
	url: meta(FeedUrl, {
		description:
			'canonical absolute URL to the post, its directory name (e.g. `https://example.com/blog/1-my-post`)'
	}),
	pathname: meta(s.string, {
		description:
			'app-relative route of the post (e.g. `/blog/1-my-post`), without any base path, for in-app links via `resolve`'
	}),
	blog_post_id: meta(s.number, {
		description: 'positive integer id from the post directory name'
	}),
	slug: meta(s.string, { description: 'the slug from the post directory name' }),
	...blog_post_metadata_shape,
	tags: s.array(s.string) // required in the feed entry
});
export type BlogFeedItem = s.Infer<typeof BlogFeedItem>;

/**
 * A blog's complete feed, generated by `gro gen` into `src/routes/<dirname>/feed.ts`:
 * the configured `BlogFeedMetadata`, the derived `atom.feed_url`, and the post entries.
 */
export const BlogFeed = s.object({
	...blog_feed_metadata_entries,
	atom: Feed.def.atom,
	items: s.array(BlogFeedItem)
});
export type BlogFeed = s.Infer<typeof BlogFeed>;

export const blog_feed_context = create_context<BlogFeed>();

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

/**
 * Derives a `BlogFeedItem` (the feed entry) from a post, its directory's id and
 * slug, and its blog's `dirname` and `home_page_url`. Emits only `BlogFeedItem`
 * fields - a consumer's extra post metadata stays on the page's `post` for its
 * component to render, and does not leak into the typed generated feed.
 * @param post_dir - the post's id and slug, from its directory name
 * @param dirname - the blog's route directory under `src/routes`, from its `BlogConfig`
 * @param home_page_url - the blog's index url, from its `feed.home_page_url`
 * @param post - the author-defined post metadata
 */
export const resolve_blog_feed_item = (
	post_dir: BlogPostDir,
	dirname: string,
	home_page_url: string,
	post: BlogPostMetadata
): BlogFeedItem => {
	const { blog_post_id, slug } = post_dir;
	const post_dirname = to_blog_post_dirname(post_dir);
	// copy fields explicitly - this is the strip seam; spreading `...post` would
	// leak a consumer's extra metadata into the typed feed (see the TSDoc above)
	return {
		// the bare id resolves through the generated redirect route
		id: join_blog_url(home_page_url, String(blog_post_id)),
		url: join_blog_url(home_page_url, post_dirname),
		// the on-disk route, not `new URL(url).pathname` - that includes any `paths.base`,
		// which `resolve` adds again
		pathname: '/' + dirname + '/' + post_dirname,
		blog_post_id,
		slug,
		title: post.title,
		date_published: post.date_published,
		date_modified: post.date_modified,
		summary: post.summary,
		tags: post.tags ?? []
	};
};
