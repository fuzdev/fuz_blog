import { resolve } from '$app/paths';
import type { Path } from '$app/types';

/**
 * Resolves a post's app-relative `pathname` (a `BlogFeedItem` field) to an href
 * under the deploy base path, with kit's `resolve`.
 * Imports `$app/paths`, so it runs only in SvelteKit.
 */
export const resolve_blog_post_pathname = (pathname: string): string =>
	// every post `pathname` is a literal app route, and kit's `Path` drops the leading `/`
	resolve(pathname.slice(1) as Path);
