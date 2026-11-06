import { assert, describe, test } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	resolve_blog_feed_item,
	to_blog_feed_url,
	BlogFeed,
	BlogFeedItem,
	BlogPostMetadata
} from '#lib/blog.ts';
import type { BlogPostDir } from '#lib/blog_post_dir.ts';
import { create_blog_feed_metadata, create_blog_post_metadata } from './blog_test_helpers.ts';

const post = create_blog_post_metadata();

const post_dir: BlogPostDir = { blog_post_id: 1, slug: 'hello-fuz-blog' };

describe('resolve_blog_feed_item', () => {
	test('derives id, url, pathname, and slug from the post directory', () => {
		const item = resolve_blog_feed_item(post_dir, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/1');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/1-hello-fuz-blog');
		assert.equal(item.pathname, '/blog/1-hello-fuz-blog');
		assert.equal(item.slug, 'hello-fuz-blog');
		assert.equal(item.blog_post_id, 1);
	});

	test('strips a trailing slash from the blog url', () => {
		const item = resolve_blog_feed_item(
			{ blog_post_id: 2, slug: 'x' },
			'blog',
			'https://blog.fuz.dev/blog/',
			post
		);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/2');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/2-x');
	});

	test('defaults tags to an empty array', () => {
		const item = resolve_blog_feed_item(post_dir, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.deepEqual(item.tags, []);
	});

	test('emits only BlogFeedItem fields even when the post carries extras', () => {
		const item = resolve_blog_feed_item(post_dir, 'blog', 'https://blog.fuz.dev/blog', {
			...post,
			model: 'some-model'
		});
		assert.ok(!('model' in item));
		// strict schema throws if a consumer field leaked into the feed entry
		s.parse_or_throw(BlogFeedItem, item);
	});

	test('excludes a base path carried by home_page_url from the pathname', () => {
		// `resolve` adds the base once, so `pathname` must not carry it
		const item = resolve_blog_feed_item(post_dir, 'blog', 'https://example.com/base/blog', post);
		assert.equal(item.url, 'https://example.com/base/blog/1-hello-fuz-blog');
		assert.equal(item.pathname, '/blog/1-hello-fuz-blog');
	});
});

describe('to_blog_feed_url', () => {
	test('appends feed.xml to the blog index url', () => {
		assert.equal(
			to_blog_feed_url('https://blog.fuz.dev/blog'),
			'https://blog.fuz.dev/blog/feed.xml'
		);
	});

	test('ignores a trailing slash', () => {
		assert.equal(
			to_blog_feed_url('https://user.github.io/repo/blog/'),
			'https://user.github.io/repo/blog/feed.xml'
		);
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
});

describe('BlogFeed', () => {
	const feed: BlogFeed = {
		...create_blog_feed_metadata(),
		atom: { feed_url: 'https://example.com/blog/feed.xml' },
		items: [
			resolve_blog_feed_item(post_dir, 'blog', 'https://example.com/blog', post),
			resolve_blog_feed_item(
				{ blog_post_id: 3, slug: '2024-recap' },
				'blog',
				'https://example.com/blog',
				post
			)
		]
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
