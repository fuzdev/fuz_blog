import { assert, describe, test } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	resolve_blog_config,
	resolve_blog_feed_item,
	BlogFeed,
	BlogFeedItem,
	BlogPostMetadata,
	type BlogConfig,
	type BlogFeedMetadata
} from '#lib/blog.ts';

const post: BlogPostMetadata = {
	title: 'Hello Fuz Blog',
	slug: 'hello-fuz-blog',
	date_published: '2024-07-15T00:00:00.000Z',
	date_modified: '2024-07-15T00:00:00.000Z',
	summary: 'a summary'
};

describe('resolve_blog_feed_item', () => {
	test('derives id and url from the blog url and post', () => {
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/1');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/hello-fuz-blog');
		assert.equal(item.blog_post_id, 1);
	});

	test('strips a trailing slash from the blog url', () => {
		const item = resolve_blog_feed_item(2, 'blog', 'https://blog.fuz.dev/blog/', post);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/2');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/hello-fuz-blog');
	});

	test('defaults tags to an empty array', () => {
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.deepEqual(item.tags, []);
	});

	test('passes comments through', () => {
		const comments = { type: 'mastodon', url: 'https://mastodon.example/@a/1' } as const;
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', {
			...post,
			comments
		});
		assert.deepEqual(item.comments, comments);
	});

	test('emits only BlogFeedItem fields even when the post carries extras', () => {
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', {
			...post,
			model: 'some-model'
		});
		assert.ok(!('model' in item));
		// strict schema throws if a consumer field leaked into the feed entry
		s.parse_or_throw(BlogFeedItem, item);
	});
});

// The blog listing links each post by its `pathname`. These lock in that
// `resolve_blog_feed_item` computes the on-disk route for both routing modes -
// prerendering broke when `home_page_url` moved to the blog index and the old
// derivation dropped the blog path segment.
describe('post route pathname', () => {
	test('slug routes resolve under the blog dirname', () => {
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.equal(item.pathname, '/blog/hello-fuz-blog');
		assert.equal(new URL(item.url).pathname, item.pathname);
	});

	test('without slug routes, the url is the integer id path', () => {
		const item = resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', post, {
			slug_routes: false
		});
		assert.equal(item.url, item.id);
		assert.equal(item.pathname, '/blog/1');
	});

	test('excludes a base path carried by home_page_url', () => {
		// `resolve` adds the base once, so `pathname` must not carry it
		const item = resolve_blog_feed_item(1, 'blog', 'https://example.com/base/blog', post);
		assert.equal(item.url, 'https://example.com/base/blog/hello-fuz-blog');
		assert.equal(item.pathname, '/blog/hello-fuz-blog');
	});
});

describe('resolve_blog_config', () => {
	const feed: BlogFeedMetadata = {
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: { name: 'Test' },
		atom: { feed_url: 'https://blog.fuz.dev/blog/feed.xml' }
	};
	const blogs: Array<BlogConfig> = [
		{ dirname: 'blog', feed },
		{ dirname: 'autoblog', feed }
	];

	test('defaults to the first blog when no dirname is given', () => {
		assert.equal(resolve_blog_config(blogs, undefined).dirname, 'blog');
	});

	test('finds a blog by dirname', () => {
		assert.equal(resolve_blog_config(blogs, 'autoblog').dirname, 'autoblog');
	});

	test('throws listing the known dirnames for an unknown blog', () => {
		assert.throws(() => resolve_blog_config(blogs, 'nope'), /expected one of: blog, autoblog/);
	});
});

describe('BlogPostMetadata', () => {
	test("keeps a consumer's extra fields", () => {
		const parsed = s.parse(BlogPostMetadata, { ...post, model: 'some-model' });
		assert.ok(parsed.ok);
		assert.equal(parsed.value.model, 'some-model');
	});

	test('rejects a malformed date with the field path', () => {
		const parsed = s.parse(BlogPostMetadata, { ...post, date_modified: '2024-07-15' });
		assert.ok(!parsed.ok);
		assert.deepEqual(parsed.issues.map(s.format_issue), [
			'date_modified: expected an ISO datetime, received string'
		]);
	});

	test('rejects unknown comment providers', () => {
		const parsed = s.parse(BlogPostMetadata, {
			...post,
			comments: { type: 'bluesky', url: 'https://bsky.app/x' }
		});
		assert.ok(!parsed.ok);
	});
});

describe('BlogFeed', () => {
	const feed: BlogFeed = {
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: { name: 'Test' },
		atom: { feed_url: 'https://blog.fuz.dev/blog/feed.xml' },
		items: [resolve_blog_feed_item(1, 'blog', 'https://blog.fuz.dev/blog', post)]
	};

	test('accepts a generated feed', () => {
		assert.ok(s.parse(BlogFeed, feed).ok);
	});

	test('rejects an item with a leaked field', () => {
		const parsed = s.parse(BlogFeed, { ...feed, items: [{ ...feed.items[0], model: 'x' }] });
		assert.ok(!parsed.ok);
		assert.deepEqual(parsed.issues[0]!.path, ['items', 0, 'model']);
	});

	test('rejects an unknown feed field', () => {
		assert.ok(!s.parse(BlogFeed, { ...feed, extra: 1 }).ok);
	});
});
