import {assert, describe, test} from 'vitest';

import {
	resolve_blog_config,
	resolve_blog_post_item,
	type BlogConfig,
	type BlogFeedData,
	type BlogPostData,
} from '$lib/blog.ts';

const post: BlogPostData = {
	title: 'Hello Fuz Blog',
	slug: 'hello-fuz-blog',
	date_published: '2024-07-15T00:00:00.000Z',
	date_modified: '2024-07-15T00:00:00.000Z',
	summary: 'a summary',
};

describe('resolve_blog_post_item', () => {
	test('derives id and url from the blog url and post', () => {
		const item = resolve_blog_post_item(1, 'https://blog.fuz.dev/blog', post);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/1');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/hello-fuz-blog');
		assert.equal(item.blog_post_id, 1);
	});

	test('strips a trailing slash from the blog url', () => {
		const item = resolve_blog_post_item(2, 'https://blog.fuz.dev/blog/', post);
		assert.equal(item.id, 'https://blog.fuz.dev/blog/2');
		assert.equal(item.url, 'https://blog.fuz.dev/blog/hello-fuz-blog');
	});

	test('defaults tags to an empty array', () => {
		const item = resolve_blog_post_item(1, 'https://blog.fuz.dev/blog', post);
		assert.deepEqual(item.tags, []);
	});

	test('passes comments through', () => {
		const comments = {type: 'mastodon', url: 'https://mastodon.example/@a/1'} as const;
		const item = resolve_blog_post_item(1, 'https://blog.fuz.dev/blog', {...post, comments});
		assert.deepEqual(item.comments, comments);
	});
});

// The blog listing derives each post's route path with `new URL(item.url).pathname`.
// These lock in that it yields the on-disk route for both routing modes -
// prerendering broke when `home_page_url` moved to the blog index and the old
// derivation dropped the blog path segment.
describe('post route pathname', () => {
	test('slug routes resolve under the blog dirname', () => {
		const item = resolve_blog_post_item(1, 'https://blog.fuz.dev/blog', post);
		assert.equal(new URL(item.url).pathname, '/blog/hello-fuz-blog');
	});

	test('without slug routes, the url is the integer id path', () => {
		const item = resolve_blog_post_item(1, 'https://blog.fuz.dev/blog', post, {slug_routes: false});
		assert.equal(item.url, item.id);
		assert.equal(new URL(item.url).pathname, '/blog/1');
	});
});

describe('resolve_blog_config', () => {
	const feed: BlogFeedData = {
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: {name: 'Test'},
		atom: {feed_url: 'https://blog.fuz.dev/blog/feed.xml'},
	};
	const blogs: Array<BlogConfig> = [
		{dirname: 'blog', feed},
		{dirname: 'autoblog', feed},
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
