import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Path } from '$app/types';

import type { BlogFeed, BlogFeedItem } from './blog.ts';
import { is_blog_post_id_param } from './blog_post_id.ts';

/**
 * Helpers for the `[post=blog_post_id]` route `gro gen` writes in each blog with posts,
 * which redirects a bare post id like `/blog/1` to the post's canonical
 * `/blog/1-my-post`. The id path is each feed entry's stable `id`, so it keeps
 * resolving when a post's slug changes.
 *
 * @module
 */

/**
 * Finds a feed's item by the param of the generated redirect route, which must
 * be a bare post id like `1` - `01` and `1.0` find nothing.
 */
export const find_blog_feed_item_by_param = (
	feed: BlogFeed,
	param: string
): BlogFeedItem | undefined => {
	if (!is_blog_post_id_param(param)) return undefined;
	const blog_post_id = Number(param);
	return feed.items.find((item) => item.blog_post_id === blog_post_id);
};

/**
 * The `entries` of the generated `[post=blog_post_id]` route: every post's bare id,
 * so prerendering writes a redirect page for each.
 */
export const to_blog_post_redirect_entries = (feed: BlogFeed): Array<{ post: string }> =>
	feed.items.map((item) => ({ post: String(item.blog_post_id) }));

/**
 * The `load` of the generated `[post=blog_post_id]` route: redirects a bare post id to the
 * post's canonical path, or 404s. Prerendering writes the redirect as a page
 * with a meta refresh.
 * @param feed - the blog's generated feed
 * @param param - the `post` route param
 * @throws Redirect 308 to the post's `pathname` under the base path
 * @throws HttpError 404 when no post has the id
 */
export const blog_post_redirect = (feed: BlogFeed, param: string): never => {
	const item = find_blog_feed_item_by_param(feed, param);
	if (!item) error(404, 'post not found');
	// every post `pathname` is a literal app route, and kit's `Path` drops the leading `/`
	redirect(308, resolve(item.pathname.slice(1) as Path));
};
