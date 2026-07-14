import type {Component} from 'svelte';
import type {Flavored, OmitStrict} from '@fuzdev/fuz_util/types.ts';
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
	 * Blog post path with `blog_post_id`.
	 */
	id: string;

	/**
	 * Blog post path with `slug`.
	 */
	url: string;

	/**
	 * Incrementing 1-based integer.
	 */
	blog_post_id: BlogPostId; // TODO maybe random?

	tags: Array<string>; // required
}

export const blog_feed_context = create_context<BlogFeed>();
