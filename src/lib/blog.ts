import type { Component } from 'svelte';
import type { Flavored } from '@fuzdev/fuz_schema/schema.ts';
import { strip_end } from '@fuzdev/fuz_util/string.ts';
import { create_context } from '@fuzdev/fuz_ui/context_helpers.ts';
import { omit } from '@fuzdev/fuz_util/object.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { FeedDatetime, Feed, FeedUrl } from './feed.ts';
import { BLOG_POST_ID_SOURCE } from './blog_post_id.ts';

// the `Feed` entries without `items`, shared by `BlogFeedMetadata` and `BlogFeed`
const blog_feed_metadata_entries = omit(Feed.def, ['items']);

/**
 * A feed's metadata, without its `items`.
 */
export const BlogFeedMetadata = s.object(blog_feed_metadata_entries);
export type BlogFeedMetadata = s.Infer<typeof BlogFeedMetadata>;

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
	 * so it equals the URL path, with no route groups and no leading or
	 * trailing slash. Post `pathname`s derive from it.
	 */
	dirname: string;

	/**
	 * Feed-level metadata. Post `id`s and `url`s derive from `home_page_url`,
	 * so set it to the blog's index page.
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

export interface BlogPostModule {
	post: BlogPostMetadata;
	default: Component<any>; // TODO types
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

export const BlogFeed = s.object({
	...blog_feed_metadata_entries,
	items: s.array(BlogFeedItem)
});
export type BlogFeed = s.Infer<typeof BlogFeed>;

export const blog_feed_context = create_context<BlogFeed>();

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
	const base = strip_end(home_page_url, '/');
	const post_dirname = to_blog_post_dirname(post_dir);
	// copy fields explicitly - this is the strip seam; spreading `...post` would
	// leak a consumer's extra metadata into the typed feed (see the TSDoc above)
	return {
		// the bare id resolves through the generated redirect route
		id: base + '/' + blog_post_id,
		url: base + '/' + post_dirname,
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
