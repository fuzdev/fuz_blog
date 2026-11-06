import { create_context } from '@fuzdev/fuz_ui/context_helpers.ts';

import type { BlogFeed } from './blog.ts';

/**
 * Provides a blog's generated `BlogFeed` to its subtree, read by `BlogPost`
 * and set in the blog's own `src/routes/<dirname>/+layout.svelte`.
 * Kept apart from `blog.ts` so the schemas, the registry, and the build helpers don't import fuz_ui and Svelte.
 */
export const blog_feed_context = create_context<BlogFeed>();
