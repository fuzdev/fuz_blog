import type { Component } from 'svelte';
import type { Flavored } from '@fuzdev/fuz_util/types.ts';
import { strip_end } from '@fuzdev/fuz_util/string.ts';
import { create_context } from '@fuzdev/fuz_ui/context_helpers.ts';
import { z } from 'zod';

import { Feed } from './feed.ts';

/**
 * A feed's metadata, without its `items`.
 */
export const BlogFeedMetadata = Feed.omit({ items: true });
export type BlogFeedMetadata = z.infer<typeof BlogFeedMetadata>;

export const MastodonBlogComments = z.strictObject({
	url: z.string(),
	type: z.literal('mastodon')
});
export type MastodonBlogComments = z.infer<typeof MastodonBlogComments>;

// TODO support other comment providers
export const BlogComments = MastodonBlogComments;
export type BlogComments = z.infer<typeof BlogComments>;

// Shared metadata fields, reused by the loose author input (`BlogPostMetadata`)
// and the strict feed entry (`BlogFeedItem`).
const blog_post_metadata_shape = {
	title: z.string(),
	slug: z.string(),
	date_published: z.iso.datetime(), // TODO maybe calculated instead of manually defined?
	date_modified: z.iso.datetime(), // TODO maybe calculated instead of manually defined?
	summary: z.string(),
	tags: z.array(z.string()).optional(),
	comments: BlogComments.optional()
};

/**
 * The author-defined metadata for each post. Loose so a consumer can add its own
 * fields (e.g. an autoblog's `model`); the extras stay on the page's `post` and
 * do not reach the generated `BlogFeed` (see `resolve_blog_feed_item`).
 */
export const BlogPostMetadata = z.looseObject(blog_post_metadata_shape);
export type BlogPostMetadata = z.infer<typeof BlogPostMetadata>;

/**
 * A single blog's configuration in the consumer's `src/routes/blogs.ts` registry.
 */
export interface BlogConfig {
	/**
	 * Route directory under `src/routes`, and the blog's base path segment.
	 */
	dirname: string;

	/**
	 * Feed-level metadata. Post URLs derive from `home_page_url`,
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
	 * Customizes the post file `gro post` scaffolds for this blog.
	 * Defaults to `scaffold_blog_post`.
	 */
	scaffold?: (options: BlogPostScaffoldOptions) => string;
}

/**
 * The options `gro post` passes to a `BlogConfig` `scaffold`.
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
	 * `$lib` inside fuz_blog itself, `@fuzdev/fuz_blog` in consumers.
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
export const BlogFeedItem = z.strictObject({
	id: z.string().meta({
		description:
			'absolute URL to the post keyed by `blog_post_id` (e.g. `https://example.com/blog/1`), also the feed entry id'
	}),
	url: z.url().meta({
		description:
			'absolute URL to the post keyed by `slug` (e.g. `https://example.com/blog/my-post`); equals `id` when the blog’s `slug_routes` is `false`'
	}),
	pathname: z.string().meta({
		description: 'app-relative path to the post (e.g. `/blog/my-post`), for in-app links'
	}),
	blog_post_id: z.number().meta({ description: 'incrementing 1-based integer' }), // TODO maybe random?
	...blog_post_metadata_shape,
	tags: z.array(z.string()) // required in the feed entry
});
export type BlogFeedItem = z.infer<typeof BlogFeedItem>;

export const BlogFeed = BlogFeedMetadata.extend({
	items: z.array(BlogFeedItem)
});
export type BlogFeed = z.infer<typeof BlogFeed>;

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
 * `home_page_url`. Emits only `BlogFeedItem` fields - a consumer's extra post
 * metadata stays on the page's `post` for its component to render, and does not
 * leak into the typed generated feed.
 * @param blog_post_id - the post's incrementing 1-based id
 * @param home_page_url - the blog's index url, from its `feed.home_page_url`
 * @param post - the author-defined post metadata
 * @param options - `slug_routes: false` makes `url` the integer-id `id`
 */
export const resolve_blog_feed_item = (
	blog_post_id: BlogPostId,
	home_page_url: string,
	post: BlogPostMetadata,
	options?: { slug_routes?: boolean }
): BlogFeedItem => {
	const base = strip_end(home_page_url, '/');
	const id = base + '/' + blog_post_id;
	// without slug routes, posts are addressed by their integer id
	const url = (options?.slug_routes ?? true) ? base + '/' + post.slug : id;
	// copy fields explicitly - this is the strip seam; spreading `...post` would
	// leak a consumer's extra metadata into the typed feed (see the TSDoc above)
	return {
		id,
		url,
		pathname: new URL(url).pathname,
		blog_post_id,
		title: post.title,
		slug: post.slug,
		date_published: post.date_published,
		date_modified: post.date_modified,
		summary: post.summary,
		tags: post.tags ?? [],
		comments: post.comments
	};
};
