import type { BlogFeedMetadata, BlogPostMetadata } from '#lib/blog.ts';
import type { BlogConfig } from '#lib/blog_config.ts';

/**
 * Creates valid feed metadata for a blog at `https://example.com/blog`.
 */
export const create_blog_feed_metadata = (
	overrides?: Partial<BlogFeedMetadata>
): BlogFeedMetadata => ({
	id: 'https://example.com/',
	title: 'test blog',
	home_page_url: 'https://example.com/blog',
	description: 'desc',
	icon: 'https://example.com/favicon.png',
	favicon: 'https://example.com/favicon.png',
	author: { name: 'Test' },
	...overrides
});

/**
 * Creates a valid config for a blog, with `home_page_url` at `https://example.com/<dirname>`.
 */
export const create_blog_config = (dirname = 'blog'): BlogConfig => ({
	dirname,
	feed: create_blog_feed_metadata({ home_page_url: 'https://example.com/' + dirname })
});

/**
 * Creates valid post metadata, published and modified at the same instant.
 */
export const create_blog_post_metadata = (
	overrides?: Partial<BlogPostMetadata>
): BlogPostMetadata => ({
	title: 'Hello Fuz Blog',
	date_published: '2024-07-15T00:00:00.000Z',
	date_modified: '2024-07-15T00:00:00.000Z',
	summary: 'a summary',
	...overrides
});
