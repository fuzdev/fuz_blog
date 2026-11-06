import { assert, describe, test } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	parse_blog_post_dirname,
	resolve_blog_config,
	resolve_blog_feed_item,
	resolve_blog_post_dirs,
	to_blog_feed_url,
	to_blog_post_dirname,
	to_next_blog_post_id,
	validate_blog_configs,
	BlogFeed,
	BlogFeedItem,
	BlogPostMetadata,
	type BlogConfig,
	type BlogFeedMetadata,
	type BlogPostDir
} from '#lib/blog.ts';

const post: BlogPostMetadata = {
	title: 'Hello Fuz Blog',
	date_published: '2024-07-15T00:00:00.000Z',
	date_modified: '2024-07-15T00:00:00.000Z',
	summary: 'a summary'
};

const post_dir: BlogPostDir = { blog_post_id: 1, slug: 'hello-fuz-blog' };

describe('parse_blog_post_dirname', () => {
	test('parses an id and slug', () => {
		assert.deepEqual(parse_blog_post_dirname('1-hello-fuz-blog'), {
			blog_post_id: 1,
			slug: 'hello-fuz-blog'
		});
		assert.deepEqual(parse_blog_post_dirname('42-a'), { blog_post_id: 42, slug: 'a' });
	});

	test('splits at the first hyphen, so a slug may start with digits', () => {
		assert.deepEqual(parse_blog_post_dirname('1-2024-recap'), {
			blog_post_id: 1,
			slug: '2024-recap'
		});
		assert.deepEqual(parse_blog_post_dirname('3-2024'), { blog_post_id: 3, slug: '2024' });
	});

	test('rejects invalid names', () => {
		for (const name of [
			'1', // bare id
			'1-', // empty slug
			'01-hello', // leading zero
			'0-hello', // zero id
			'1-Hello', // uppercase
			'1-hello_world', // underscore
			'1--hello', // empty run
			'1-hello-', // trailing hyphen
			'1-hello--world', // double hyphen
			'1-héllo', // non-ASCII
			'-1-hello', // no id
			'hello', // no id
			'[post=blog_post_id]',
			'12345678901234567890-a', // beyond the safe integer range
			'9007199254740992-a' // one past Number.MAX_SAFE_INTEGER
		]) {
			assert.equal(parse_blog_post_dirname(name), null, name);
		}
	});

	test('accepts the largest safe integer id', () => {
		assert.deepEqual(parse_blog_post_dirname('9007199254740991-a'), {
			blog_post_id: Number.MAX_SAFE_INTEGER,
			slug: 'a'
		});
	});

	test('round-trips with to_blog_post_dirname', () => {
		assert.equal(to_blog_post_dirname(parse_blog_post_dirname('12-x-y')!), '12-x-y');
	});
});

describe('resolve_blog_post_dirs', () => {
	test('skips names not starting with a digit and sorts by id', () => {
		const dirs = resolve_blog_post_dirs(
			['10-ten', '[post=blog_post_id]', '2-two', 'about', '1-2024-recap'],
			'blog'
		);
		assert.deepEqual(dirs, [
			{ blog_post_id: 1, slug: '2024-recap' },
			{ blog_post_id: 2, slug: 'two' },
			{ blog_post_id: 10, slug: 'ten' }
		]);
	});

	test('allows gaps in ids', () => {
		const dirs = resolve_blog_post_dirs(['1-a', '3-c'], 'blog');
		assert.deepEqual(
			dirs.map((d) => d.blog_post_id),
			[1, 3]
		);
		assert.equal(to_next_blog_post_id(dirs), 4);
	});

	test('throws on a duplicate id', () => {
		assert.throws(
			() => resolve_blog_post_dirs(['1-a', '1-b'], 'blog'),
			/duplicate post id 1 in blog: 1-a and 1-b/
		);
	});

	test('throws on an invalid name starting with a digit', () => {
		for (const name of ['1', '01-a', '1-', '1-A', '2024_recap', '12345678901234567890-a']) {
			assert.throws(
				() => resolve_blog_post_dirs([name], 'blog'),
				new RegExp(`invalid post directory name blog/${name} - expected`),
				name
			);
		}
	});
});

describe('to_next_blog_post_id', () => {
	test('starts at 1', () => {
		assert.equal(to_next_blog_post_id([]), 1);
	});

	test('is one more than the highest id regardless of order', () => {
		assert.equal(
			to_next_blog_post_id([
				{ blog_post_id: 5, slug: 'e' },
				{ blog_post_id: 2, slug: 'b' }
			]),
			6
		);
	});
});

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
});

// The blog listing links each post by its `pathname`, which must be the on-disk
// route under the blog dirname, without any base path carried by `home_page_url`.
describe('post route pathname', () => {
	test('resolves under the blog dirname', () => {
		const item = resolve_blog_feed_item(post_dir, 'blog', 'https://blog.fuz.dev/blog', post);
		assert.equal(new URL(item.url).pathname, item.pathname);
	});

	test('excludes a base path carried by home_page_url', () => {
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

describe('resolve_blog_config', () => {
	const feed: BlogFeedMetadata = {
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: { name: 'Test' }
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

describe('validate_blog_configs', () => {
	const feed: BlogFeedMetadata = {
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: { name: 'Test' }
	};

	test('accepts a valid registry', () => {
		assert.doesNotThrow(() =>
			validate_blog_configs([
				{ dirname: 'blog', feed },
				{ dirname: 'autoblog', feed: { ...feed, home_page_url: 'https://blog.fuz.dev/autoblog/' } }
			])
		);
	});

	test('throws on a dirname with a .. segment, before checking duplicates', () => {
		assert.throws(
			() =>
				validate_blog_configs([
					{ dirname: 'blog', feed },
					{ dirname: 'x/../blog', feed }
				]),
			/invalid blog dirname "x\/\.\.\/blog"/
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
		id: 'https://blog.fuz.dev/',
		title: 'test blog',
		home_page_url: 'https://blog.fuz.dev/blog',
		description: 'desc',
		icon: 'https://blog.fuz.dev/favicon.png',
		favicon: 'https://blog.fuz.dev/favicon.png',
		author: { name: 'Test' },
		atom: { feed_url: 'https://blog.fuz.dev/blog/feed.xml' },
		items: [
			resolve_blog_feed_item(post_dir, 'blog', 'https://blog.fuz.dev/blog', post),
			resolve_blog_feed_item(
				{ blog_post_id: 3, slug: '2024-recap' },
				'blog',
				'https://blog.fuz.dev/blog',
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
