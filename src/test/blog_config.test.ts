import { assert, describe, test } from 'vitest';

import { resolve_blog_config, validate_blog_configs, type BlogConfig } from '#lib/blog_config.ts';
import { create_blog_config, create_blog_feed_metadata } from './blog_test_helpers.ts';

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
