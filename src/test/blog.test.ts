import { assert, describe, test } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	find_blog_post_dir,
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
	type BlogPostDir
} from '#lib/blog.ts';
import {
	create_blog_config,
	create_blog_feed_metadata,
	create_blog_post_metadata
} from './blog_test_helpers.ts';

const post = create_blog_post_metadata();

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

describe('find_blog_post_dir', () => {
	const post_dirs: Array<BlogPostDir> = [
		{ blog_post_id: 1, slug: 'hello' },
		{ blog_post_id: 2, slug: 'dup' },
		{ blog_post_id: 3, slug: 'dup' },
		{ blog_post_id: 4, slug: '2024' },
		{ blog_post_id: 5, slug: '1-x' }
	];

	test('finds a bare id by id', () => {
		assert.deepEqual(find_blog_post_dir(post_dirs, '1', 'blog'), post_dirs[0]);
		// a numeric query is an id, not the slug `2024`
		assert.throws(
			() => find_blog_post_dir(post_dirs, '2024', 'blog'),
			/^no blog post with id 2024$/
		);
	});

	test('finds a directory name exactly', () => {
		assert.deepEqual(find_blog_post_dir(post_dirs, '3-dup', 'blog'), post_dirs[2]);
		assert.deepEqual(find_blog_post_dir(post_dirs, '4-2024', 'blog'), post_dirs[3]);
	});

	test('finds a unique slug', () => {
		assert.deepEqual(find_blog_post_dir(post_dirs, 'hello', 'blog'), post_dirs[0]);
	});

	test('falls back to a slug for a directory name that matches no post', () => {
		assert.deepEqual(find_blog_post_dir(post_dirs, '1-x', 'blog'), post_dirs[4]);
	});

	test('throws on a slug matching more than one post', () => {
		assert.throws(
			() => find_blog_post_dir(post_dirs, 'dup', 'blog'),
			/^slug dup matches more than one blog post - 2-dup, 3-dup - pass the id or directory name instead$/
		);
	});

	test('throws when nothing matches', () => {
		assert.throws(() => find_blog_post_dir(post_dirs, '9', 'blog'), /^no blog post with id 9$/);
		assert.throws(
			() => find_blog_post_dir(post_dirs, 'nope', 'blog'),
			/^no blog post with slug nope$/
		);
		assert.throws(
			() => find_blog_post_dir(post_dirs, '9-hello', 'blog'),
			/^no blog post with directory name or slug 9-hello$/
		);
	});

	test('rejects queries that are not an id, directory name, or slug', () => {
		for (const query of ['', ' 1', '1.0', '-1', '+1', 'Hello', 'a_b', '1-']) {
			assert.throws(
				() => find_blog_post_dir(post_dirs, query, 'blog'),
				/^invalid post .* - expected an id like `1`/,
				query
			);
		}
		// these fit the slug grammar, so they match by slug and find nothing
		for (const query of ['1e3', '0x2', '01']) {
			assert.throws(
				() => find_blog_post_dir(post_dirs, query, 'blog'),
				new RegExp(`^no blog post with slug ${query}$`),
				query
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

describe('resolve_blog_config', () => {
	const blogs: Array<BlogConfig> = [create_blog_config('blog'), create_blog_config('autoblog')];

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
	const config = create_blog_config();
	const with_home_page_url = (home_page_url: string, dirname = 'blog'): BlogConfig => ({
		dirname,
		feed: create_blog_feed_metadata({ home_page_url })
	});

	test('accepts a valid registry', () => {
		assert.doesNotThrow(() =>
			validate_blog_configs([
				{ ...config, scaffold: () => '' },
				with_home_page_url('https://example.com/autoblog/', 'autoblog')
			])
		);
	});

	test('accepts a home_page_url with a deploy base path', () => {
		assert.doesNotThrow(() =>
			validate_blog_configs([with_home_page_url('https://user.github.io/repo/blog')])
		);
	});

	test('accepts a nested dirname', () => {
		assert.doesNotThrow(() =>
			validate_blog_configs([
				with_home_page_url('https://example.com/writing/blog', 'writing/blog')
			])
		);
	});

	test('accepts a non-ASCII dirname, compared percent-encoded in either hex case', () => {
		for (const home_page_url of [
			'https://example.com/café',
			'https://example.com/caf%C3%A9',
			'https://example.com/caf%c3%a9',
			'https://example.com/caf%c3%A9/'
		]) {
			assert.doesNotThrow(
				() => validate_blog_configs([with_home_page_url(home_page_url, 'café')]),
				home_page_url
			);
		}
	});

	test('throws on a config that is not an object', () => {
		for (const value of [null, 'blog', [config]]) {
			assert.throws(
				() => validate_blog_configs([config, value]),
				/^invalid blog config at index 1 - expected an object$/
			);
		}
	});

	test('throws on a non-string dirname', () => {
		assert.throws(
			() => validate_blog_configs([{ ...config, dirname: 1 }]),
			/^invalid blog dirname at index 0 - expected a string, received number$/
		);
		assert.throws(
			() => validate_blog_configs([{ feed: config.feed }]),
			/^invalid blog dirname at index 0 - expected a string, received undefined$/
		);
	});

	test('throws on a malformed dirname before comparing it to home_page_url', () => {
		for (const dirname of [
			'',
			'.',
			'..',
			'../blog',
			'x/../blog',
			'a\\blog',
			'/blog',
			'blog/',
			'a//blog',
			'blog?x',
			'blog#x',
			'bl\tog',
			'x/%2e%2e/blog',
			'blog ',
			'my blog'
		]) {
			assert.throws(
				() => validate_blog_configs([{ ...config, dirname }]),
				/^invalid blog dirname .* - expected route path segments with no leading or trailing slash, no `\.` or `\.\.` segments, and no `\\`, `\?`, `#`, `%`, space, or ASCII control characters$/,
				dirname
			);
		}
	});

	test('throws on a malformed dirname before checking duplicates', () => {
		assert.throws(
			() => validate_blog_configs([config, { ...config, dirname: 'x/../blog' }]),
			/invalid blog dirname "x\/\.\.\/blog"/
		);
	});

	test('throws on a dirname with a route group or param', () => {
		for (const dirname of ['(group)/blog', 'blog/(x)', '[param]', 'blog/[x+25]', 'a]b']) {
			assert.throws(
				() =>
					validate_blog_configs([with_home_page_url('https://example.com/' + dirname, dirname)]),
				/^invalid blog dirname .* - route groups like `\(group\)` and params like `\[param\]` are not supported, the dirname must equal the URL path$/,
				dirname
			);
		}
	});

	test('throws on a dirname registered twice', () => {
		assert.throws(
			() => validate_blog_configs([config, config]),
			/^duplicate blog dirname "blog" in the blogs registry$/
		);
	});

	test('throws on unknown config keys', () => {
		assert.throws(
			() => validate_blog_configs([{ ...config, slug_routes: false }]),
			/^unknown "blog" blog config key "slug_routes" - expected only "dirname", "feed", "scaffold"$/
		);
		assert.throws(
			() => validate_blog_configs([{ ...config, a: 1, b: 2 }]),
			/^unknown "blog" blog config keys "a", "b"/
		);
	});

	test('throws on a scaffold that is not a function', () => {
		assert.throws(
			() => validate_blog_configs([{ ...config, scaffold: 'x' }]),
			/^invalid "blog" scaffold - expected a function or undefined, received string$/
		);
	});

	test('throws on feed metadata with a leftover atom', () => {
		const feed = { ...config.feed, atom: { feed_url: 'https://example.com/blog/feed.xml' } };
		assert.throws(
			() => validate_blog_configs([{ ...config, feed }]),
			/^invalid "blog" feed metadata:\n/
		);
	});

	test('throws when home_page_url does not end with the dirname', () => {
		for (const home_page_url of [
			'https://example.com/',
			'https://example.com/posts',
			'https://example.com/myblog',
			'https://example.com/blog/posts'
		]) {
			assert.throws(
				() => validate_blog_configs([with_home_page_url(home_page_url)]),
				/^"blog" home_page_url ".*" must end with \/blog,/,
				home_page_url
			);
		}
	});

	test('does not decode escapes when comparing home_page_url to the dirname', () => {
		assert.throws(
			() => validate_blog_configs([with_home_page_url('https://example.com/a%2fb', 'a/b')]),
			/must end with \/a\/b,/
		);
	});

	test('throws when home_page_url has a query or fragment', () => {
		for (const home_page_url of [
			'https://example.com/blog?a=1',
			'https://example.com/blog#a',
			// empty, which `URL` reports as no query or fragment
			'https://example.com/blog?',
			'https://example.com/blog#',
			'https://example.com/blog/?'
		]) {
			assert.throws(
				() => validate_blog_configs([with_home_page_url(home_page_url)]),
				/has a query or fragment/,
				home_page_url
			);
		}
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
