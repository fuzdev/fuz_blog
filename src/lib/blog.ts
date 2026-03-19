import type {Component} from 'svelte';
import type {Flavored, OmitStrict} from '@fuzdev/fuz_util/types.js';
import {create_context} from '@fuzdev/fuz_ui/context_helpers.js';

import type {Feed} from './feed.js';

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

export interface BlogModule {
	blog: BlogFeedData;
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
