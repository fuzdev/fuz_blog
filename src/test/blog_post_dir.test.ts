import { assert, describe, test } from 'vitest';

import {
	find_blog_post_dir,
	parse_blog_post_dirname,
	resolve_blog_post_dirs,
	to_blog_post_dirname,
	to_next_blog_post_id,
	type BlogPostDir
} from '#lib/blog_post_dir.ts';

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
