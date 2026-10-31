import type { Component } from 'svelte';
import type { Flavored } from '@fuzdev/fuz_schema/schema.ts';
import { strip_end } from '@fuzdev/fuz_util/string.ts';
import { create_context } from '@fuzdev/fuz_ui/context_helpers.ts';
import { omit } from '@fuzdev/fuz_util/object.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { FeedDatetime, Feed, FeedUrl } from './feed.ts';

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
	slug: s.string,
	date_published: FeedDatetime, // TODO maybe calculated instead of manually defined?
	date_modified: FeedDatetime, // TODO maybe calculated instead of manually defined?
	summary: s.string,
	tags: s.optional(s.array(s.string))
};

/**
 * The author-defined metadata for each post. Loose so a consumer can add its own
 * fields (e.g. an autoblog's `model`); the extras stay on the page's `post` and
 * do not reach the generated `BlogFeed` (see `resolve_blog_feed_item`).
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
	 * Generate a slug redirect route for each post.
	 * When `false`, post URLs are the integer id paths.
	 * @default true
	 */
	slug_routes?: boolean;

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

export type BlogPostId = Flavored<number, 'BlogPostId'>;

/**
 * A feed entry, derived from a `BlogPostMetadata` by `resolve_blog_feed_item`.
 * Strict, so a leaked consumer field fails the generated feed's validation.
 */
export const BlogFeedItem = s.object({
	id: meta(s.string, {
		description:
			'absolute URL to the post keyed by `blog_post_id` (e.g. `https://example.com/blog/1`), also the feed entry id'
	}),
	url: meta(FeedUrl, {
		description:
			'absolute URL to the post keyed by `slug` (e.g. `https://example.com/blog/my-post`); equals `id` when the blog’s `slug_routes` is `false`'
	}),
	pathname: meta(s.string, {
		description:
			'app-relative route of the post (e.g. `/blog/my-post`), without any base path, for in-app links via `resolve`'
	}),
	blog_post_id: meta(s.number, { description: 'incrementing 1-based integer' }), // TODO maybe random?
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
 * Derives a `BlogFeedItem` (the feed entry) from a post and its blog's
 * `dirname` and `home_page_url`. Emits only `BlogFeedItem` fields - a
 * consumer's extra post metadata stays on the page's `post` for its component
 * to render, and does not leak into the typed generated feed.
 * @param blog_post_id - the post's incrementing 1-based id
 * @param dirname - the blog's route directory under `src/routes`, from its `BlogConfig`
 * @param home_page_url - the blog's index url, from its `feed.home_page_url`
 * @param post - the author-defined post metadata
 * @param options - `slug_routes: false` makes `url` the integer-id `id`
 */
export const resolve_blog_feed_item = (
	blog_post_id: BlogPostId,
	dirname: string,
	home_page_url: string,
	post: BlogPostMetadata,
	options?: { slug_routes?: boolean }
): BlogFeedItem => {
	const base = strip_end(home_page_url, '/');
	const id = base + '/' + blog_post_id;
	// without slug routes, posts are addressed by their integer id
	const slug_routes = options?.slug_routes ?? true;
	const url = slug_routes ? base + '/' + post.slug : id;
	// copy fields explicitly - this is the strip seam; spreading `...post` would
	// leak a consumer's extra metadata into the typed feed (see the TSDoc above)
	return {
		id,
		url,
		// the on-disk route, not `new URL(url).pathname` - that includes any `paths.base`,
		// which `resolve` adds again
		pathname: '/' + dirname + '/' + (slug_routes ? post.slug : blog_post_id),
		blog_post_id,
		title: post.title,
		slug: post.slug,
		date_published: post.date_published,
		date_modified: post.date_modified,
		summary: post.summary,
		tags: post.tags ?? []
	};
};
