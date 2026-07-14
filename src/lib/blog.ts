import type {Component} from 'svelte';
import type {Flavored, OmitStrict} from '@fuzdev/fuz_util/types.ts';
import {strip_end} from '@fuzdev/fuz_util/string.ts';
import {create_context} from '@fuzdev/fuz_ui/context_helpers.ts';

import type {Feed} from './feed.ts';

// TODO inconsistent naming with `BlogPostData` and `BlogPostItem`,
// consider `BlogItem` or `BlogFeedItem`?
// maybe `Metadata` instead of `Data` in both cases?
// also think about `BlogFeedItem` instead of `BlogPostItem`
export type BlogFeedData = OmitStrict<Feed, 'items'>;

export interface BlogFeed extends Feed {
	items: Array<BlogPostItem>;
}

/**
 * The author-defined data for each post.
 */
export interface BlogPostData {
	title: string;
	slug: string;
	date_published: string; // TODO maybe calculated instead of manually defined?
	date_modified: string; // TODO maybe calculated instead of manually defined?
	summary: string;
	tags?: Array<string>;
	comments?: BlogComments;
}

// TODO support other comment providers
export type BlogComments = MastodonBlogComments;

export interface MastodonBlogComments {
	url: string;
	type: 'mastodon';
}

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
	feed: BlogFeedData;

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
	post: BlogPostData;
	default: Component<any>; // TODO types
}

export type BlogPostId = Flavored<number, 'BlogPostId'>;

export interface BlogPostItem extends BlogPostData {
	/**
	 * Absolute URL to the post keyed by `blog_post_id`
	 * (e.g. `https://example.com/blog/1`), also used as the feed entry id.
	 */
	id: string;

	/**
	 * Absolute URL to the post keyed by `slug`
	 * (e.g. `https://example.com/blog/my-post`).
	 * Equals `id` when the blog's `slug_routes` is `false`.
	 */
	url: string;

	/**
	 * Incrementing 1-based integer.
	 */
	blog_post_id: BlogPostId; // TODO maybe random?

	tags: Array<string>; // required
}

export const blog_feed_context = create_context<BlogFeed>();

/**
 * Resolves a `BlogConfig` from the registry by its `dirname`,
 * defaulting to the first registered blog when `dirname` is omitted.
 * Throws when `dirname` matches no registered blog.
 */
export const resolve_blog_config = (
	blogs: Array<BlogConfig>,
	dirname: string | undefined,
): BlogConfig => {
	const config = dirname ? blogs.find((b) => b.dirname === dirname) : blogs[0];
	if (!config) {
		throw new Error(
			`unknown blog ${JSON.stringify(dirname)}, expected one of: ` +
				blogs.map((b) => b.dirname).join(', '),
		);
	}
	return config;
};

/**
 * Derives a `BlogPostItem` (the feed entry) from a post and its blog's
 * `home_page_url`. Emits only `BlogPostItem` fields - a consumer's extra post
 * metadata stays on the page's `post` for its component to render, and does not
 * leak into the typed generated feed.
 * @param blog_post_id - the post's incrementing 1-based id
 * @param home_page_url - the blog's index url, from its `feed.home_page_url`
 * @param post - the author-defined post metadata
 * @param options - `slug_routes: false` makes `url` the integer-id `id`
 */
export const resolve_blog_post_item = (
	blog_post_id: BlogPostId,
	home_page_url: string,
	post: BlogPostData,
	options?: {slug_routes?: boolean},
): BlogPostItem => {
	const base = strip_end(home_page_url, '/');
	const id = base + '/' + blog_post_id;
	return {
		id,
		// without slug routes, posts are addressed by their integer id
		url: (options?.slug_routes ?? true) ? base + '/' + post.slug : id,
		blog_post_id,
		title: post.title,
		slug: post.slug,
		date_published: post.date_published,
		date_modified: post.date_modified,
		summary: post.summary,
		tags: post.tags ?? [],
		comments: post.comments,
	};
};
