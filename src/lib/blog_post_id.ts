import type { Flavored } from '@fuzdev/fuz_schema/schema.ts';

/**
 * The post id type, its grammar, and its SvelteKit param matcher, kept free of
 * runtime imports because SvelteKit loads param matchers eagerly on the client
 * and imports `src/params.ts` with plain Node at build time, outside Vite - so
 * no `$app/*` or other Vite-resolved imports here, and only type imports, which
 * are erased.
 *
 * @module
 */

/**
 * A post's positive integer id, the first part of its `<id>-<slug>` directory name.
 * Ids are unique within a blog and may have gaps.
 */
export type BlogPostId = Flavored<number, 'BlogPostId'>;

/**
 * Regex source for a post id: a positive integer without leading zeros.
 * Shared by the post directory name pattern and the param matcher so they can't drift.
 */
export const BLOG_POST_ID_SOURCE = '[1-9]\\d*';

const BLOG_POST_ID_PATTERN = new RegExp(`^${BLOG_POST_ID_SOURCE}$`);

/**
 * Checks if `param` is a bare post id like `1`, within the safe integer range
 * so it round-trips through `Number`.
 */
export const is_blog_post_id_param = (param: string): boolean =>
	BLOG_POST_ID_PATTERN.test(param) && Number.isSafeInteger(Number(param));

/**
 * The SvelteKit param matcher for the generated `[post=blog_post_id]` redirect route.
 * Register it under the `blog_post_id` name in the app's `src/params.ts`, e.g.
 * `export const params = defineParams({blog_post_id: blog_post_id_param});`.
 * Without it, the route would match every `/<dirname>/<segment>` path, so
 * client-side navigation to a static file under the blog path would hit the redirect.
 */
export const blog_post_id_param = (param: string): string | undefined =>
	is_blog_post_id_param(param) ? param : undefined;
