import { afterEach, assert, beforeEach, describe, test } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assert_rejects } from '@fuzdev/fuz_util/testing.ts';

import {
	collect_blog_post_dirs,
	create_blog_gen_outputs,
	create_blog_post,
	load_blogs_module,
	to_blog_post_slug,
	update_blog_post
} from '#lib/blog_helpers.ts';
import type { BlogConfig } from '#lib/blog_config.ts';
import { create_blog_config, create_blog_post_metadata } from './blog_test_helpers.ts';

const config = create_blog_config();

const DATE = '2024-07-15T00:00:00.000Z';

let dir: string;
let blog_dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'fuz_blog_test_'));
	blog_dir = join(dir, 'src/routes/blog');
	await mkdir(blog_dir, { recursive: true });
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const write_route = async (name: string, content = '<p>post</p>\n'): Promise<void> => {
	await mkdir(join(blog_dir, name), { recursive: true });
	await writeFile(join(blog_dir, name, '+page.svelte'), content, 'utf8');
};

describe('load_blogs_module', () => {
	const write_blogs = (blogs: Array<BlogConfig>): Promise<void> =>
		writeFile(
			join(dir, 'src/routes/blogs.ts'),
			`export const blogs = ${JSON.stringify(blogs)};\n`,
			'utf8'
		);

	test('loads a valid registry', async () => {
		await write_blogs([config]);
		const { blogs } = await load_blogs_module(dir);
		assert.equal(blogs[0]!.dirname, 'blog');
	});

	test('validates the registry before returning it', async () => {
		await write_blogs([{ ...config, dirname: '../blog' }]);
		await assert_rejects(() => load_blogs_module(dir), /^invalid blog dirname "\.\.\/blog"/);
	});

	test('throws on a missing or empty blogs export', async () => {
		await assert_rejects(() => load_blogs_module(dir), /^expected a blogs registry at /);
		await write_blogs([]);
		await assert_rejects(() => load_blogs_module(dir), /to export a non-empty `blogs` array$/);
	});
});

describe('collect_blog_post_dirs', () => {
	test('returns an empty array for a missing blog directory', async () => {
		assert.deepEqual(await collect_blog_post_dirs(join(dir, 'nope'), 'nope'), []);
	});

	test('finds post directories with gaps, sorted by id, ignoring other routes and files', async () => {
		await write_route('3-three');
		await write_route('1-one');
		await write_route('about');
		await mkdir(join(blog_dir, '[post=blog_post_id]'));
		await writeFile(join(blog_dir, 'feed.ts'), '', 'utf8');
		assert.deepEqual(await collect_blog_post_dirs(blog_dir, 'blog'), [
			{ blog_post_id: 1, slug: 'one' },
			{ blog_post_id: 3, slug: 'three' }
		]);
	});

	test('throws on a post directory without a +page.svelte', async () => {
		await mkdir(join(blog_dir, '1-one'));
		await assert_rejects(
			() => collect_blog_post_dirs(blog_dir, 'blog'),
			/blog\/1-one has no \+page\.svelte/
		);
	});

	test('throws on a bare id directory', async () => {
		await write_route('1');
		await assert_rejects(
			() => collect_blog_post_dirs(blog_dir, 'blog'),
			/invalid post directory name blog\/1 - expected `<id>-<slug>`/
		);
	});
});

describe('to_blog_post_slug', () => {
	test('slugifies a title', () => {
		assert.equal(to_blog_post_slug('Hello World'), 'hello-world');
	});

	test('normalizes underscores to hyphens', () => {
		assert.equal(to_blog_post_slug('Hello fuz_blog'), 'hello-fuz-blog');
		assert.equal(to_blog_post_slug('_a__b_'), 'a-b');
	});

	test('is empty for a title without slug characters', () => {
		assert.equal(to_blog_post_slug('!!!'), '');
	});
});

describe('create_blog_post', () => {
	test('writes the next post at <id>-<slug> after the highest id', async () => {
		await write_route('1-one');
		await write_route('4-four');
		const created = await create_blog_post({
			dir,
			config,
			title: 'Hello World',
			date: DATE,
			fuz_blog_import_path: '#lib'
		});
		assert.equal(created.blog_post_id, 5);
		assert.equal(created.slug, 'hello-world');
		assert.equal(created.path, join(blog_dir, '5-hello-world', '+page.svelte'));
		const content = await readFile(created.path, 'utf8');
		assert.include(content, `date_modified: '${DATE}'`);
		assert.notInclude(content, 'slug');
	});

	test('derives the slug from the title when the given slug is empty', async () => {
		const created = await create_blog_post({
			dir,
			config,
			title: 'Hi There',
			slug: '',
			date: DATE,
			fuz_blog_import_path: '#lib'
		});
		assert.equal(created.slug, 'hi-there');
	});

	test('takes a slug override', async () => {
		const created = await create_blog_post({
			dir,
			config,
			title: '!!!',
			slug: 'bangs',
			date: DATE,
			fuz_blog_import_path: '#lib'
		});
		assert.equal(created.path, join(blog_dir, '1-bangs', '+page.svelte'));
	});

	test('passes the id and slug to a custom scaffold', async () => {
		const created = await create_blog_post({
			dir,
			config,
			title: 'Hi',
			date: DATE,
			fuz_blog_import_path: '#lib',
			scaffold: ({ blog_post_id, slug }) => `<p>${blog_post_id} ${slug}</p>`
		});
		assert.include(await readFile(created.path, 'utf8'), '<p>1 hi</p>');
	});

	test('throws on an empty or invalid slug without writing', async () => {
		for (const [title, slug, pattern] of [
			['!!!', undefined, /^cannot derive a slug from the title "!!!" - pass one explicitly/],
			// an empty slug counts as not given
			['!!!', '', /^cannot derive a slug from the title "!!!"/],
			['Hi', 'Bad Slug', /^invalid slug "Bad Slug" - a slug is .*runs$/],
			['Hi', '-a', /^invalid slug "-a"/]
		] as const) {
			await assert_rejects(
				() =>
					create_blog_post({ dir, config, title, slug, date: DATE, fuz_blog_import_path: '#lib' }),
				pattern
			);
		}
		assert.deepEqual(await readdir(blog_dir), []);
	});
});

describe('update_blog_post', () => {
	const post_content = (date_modified: string): string =>
		`<script lang="ts" module>\n\texport const post = {\n\t\ttitle: 'Hi',\n\t\tdate_modified: ${date_modified},\n\t};\n</script>\n`;

	test('rewrites date_modified in the post with the id', async () => {
		await write_route('2-two', post_content(`'2020-01-01T00:00:00.000Z'`));
		const updated = await update_blog_post({ dir, config, query: '2', date: DATE });
		assert.deepEqual(updated, {
			blog_post_id: 2,
			path: join(blog_dir, '2-two', '+page.svelte'),
			slug: 'two'
		});
		assert.include(await readFile(updated.path, 'utf8'), `date_modified: '${DATE}',`);
	});

	test('finds the post by directory name or slug', async () => {
		await write_route('1-one', post_content(`'2020-01-01T00:00:00.000Z'`));
		await write_route('2-two', post_content(`'2020-01-01T00:00:00.000Z'`));
		assert.equal(
			(await update_blog_post({ dir, config, query: '2-two', date: DATE })).blog_post_id,
			2
		);
		assert.equal(
			(await update_blog_post({ dir, config, query: 'one', date: DATE })).blog_post_id,
			1
		);
	});

	test('accepts a double-quoted value', async () => {
		await write_route('1-one', post_content(`"2020-01-01T00:00:00.000Z"`));
		const updated = await update_blog_post({ dir, config, query: '1', date: DATE });
		assert.include(await readFile(updated.path, 'utf8'), `date_modified: '${DATE}',`);
	});

	test('throws when no post has the id', async () => {
		await write_route('1-one', post_content(`'x'`));
		await assert_rejects(
			() => update_blog_post({ dir, config, query: '2', date: DATE }),
			/^no blog post with id 2$/
		);
	});

	test("throws on a date before the post's date_published, without writing", async () => {
		const content =
			`<script lang="ts" module>\n\texport const post = {\n\t\tdate_published: '${DATE}',\n` +
			`\t\tdate_modified: '${DATE}',\n\t};\n</script>\n`;
		await write_route('1-one', content);
		await assert_rejects(
			() => update_blog_post({ dir, config, query: '1', date: '2024-07-14T23:59:59.999Z' }),
			/is before the post's date_published "2024-07-15T00:00:00\.000Z"/
		);
		assert.equal(await readFile(join(blog_dir, '1-one', '+page.svelte'), 'utf8'), content);
		// the same instant passes
		await update_blog_post({ dir, config, query: '1', date: '2024-07-15T00:00:00Z' });
	});

	test('throws unless exactly one date_modified matches', async () => {
		await write_route('1-one', post_content('some_variable'));
		await write_route('2-two', post_content(`'a'`) + post_content(`'b'`));
		for (const [query, count] of [
			['1', 0],
			['2', 2]
		] as const) {
			await assert_rejects(
				() => update_blog_post({ dir, config, query, date: DATE }),
				new RegExp(`found ${count}$`)
			);
		}
	});
});

describe('create_blog_gen_outputs', () => {
	const post = create_blog_post_metadata({
		title: 'Hi',
		date_published: DATE,
		date_modified: DATE,
		model: 'an extra field that stays out of the feed'
	});
	const autoblog = create_blog_config('autoblog');
	const ROOT = '/project';
	const create = (blogs: Parameters<typeof create_blog_gen_outputs>[0]['blogs']) =>
		create_blog_gen_outputs({
			dir: ROOT,
			fuz_blog_import_path: '@fuzdev/fuz_blog',
			origin_path: 'src/lib/blog.gen.ts',
			blogs
		});

	test('writes the feeds and a redirect route for each blog with posts', () => {
		const outputs = create([
			{
				config,
				post_dirs: [
					{ blog_post_id: 1, slug: 'one' },
					{ blog_post_id: 3, slug: 'three' }
				],
				posts: [post, post],
				redirect_route_exists: false
			},
			{
				config: autoblog,
				post_dirs: [{ blog_post_id: 2, slug: 'two' }],
				posts: [post],
				redirect_route_exists: true
			}
		]);
		assert.deepEqual(
			outputs.map((o) => o.filename),
			[
				'/project/static/blog/feed.xml',
				'/project/src/routes/blog/feed.ts',
				'/project/src/routes/blog/[post=blog_post_id]/+page.ts',
				'/project/static/autoblog/feed.xml',
				'/project/src/routes/autoblog/feed.ts',
				'/project/src/routes/autoblog/[post=blog_post_id]/+page.ts'
			]
		);
		const [feed_xml, feed_ts, redirect_ts] = outputs.map((o) => o.content);
		assert.include(feed_xml, '<link rel="alternate" href="https://example.com/blog/3-three" />');
		assert.include(feed_ts, "import type {BlogFeed} from '@fuzdev/fuz_blog/blog.ts';");
		assert.include(feed_ts, '"pathname":"/blog/3-three"');
		assert.notInclude(feed_ts, 'model');
		assert.include(redirect_ts, "from '@fuzdev/fuz_blog/blog_post_redirect.ts'");
		assert.include(redirect_ts, "import {feed} from '../feed.ts';");
		assert.include(redirect_ts, '// generated by src/lib/blog.gen.ts');
		assert.include(outputs[4]!.content, '"pathname":"/autoblog/2-two"');
	});

	test('derives the feed url from home_page_url', () => {
		const outputs = create([
			{
				config: { ...config, feed: { ...config.feed, home_page_url: 'https://example.com/blog/' } },
				post_dirs: [],
				posts: [],
				redirect_route_exists: false
			}
		]);
		const [feed_xml, feed_ts] = outputs.map((o) => o.content);
		assert.include(
			feed_xml,
			'<link href="https://example.com/blog/feed.xml" rel="self" type="application/atom+xml" />'
		);
		assert.include(feed_ts, '"atom":{"feed_url":"https://example.com/blog/feed.xml"}');
	});

	test('accepts a home_page_url with a deploy base path', () => {
		const outputs = create([
			{
				config: {
					...config,
					feed: { ...config.feed, home_page_url: 'https://user.github.io/repo/blog' }
				},
				post_dirs: [{ blog_post_id: 1, slug: 'one' }],
				posts: [post],
				redirect_route_exists: false
			}
		]);
		assert.include(outputs[0]!.content, 'href="https://user.github.io/repo/blog/feed.xml"');
		assert.include(outputs[1]!.content, '"pathname":"/blog/1-one"');
	});

	test('validates the blogs registry', () => {
		assert.throws(
			() =>
				create([
					{ config, post_dirs: [], posts: [], redirect_route_exists: false },
					{ config, post_dirs: [], posts: [], redirect_route_exists: false }
				]),
			/^duplicate blog dirname "blog"/
		);
	});

	test('throws when a post was modified before it was published', () => {
		assert.throws(
			() =>
				create([
					{
						config,
						post_dirs: [{ blog_post_id: 2, slug: 'two' }],
						posts: [{ ...post, date_modified: '2024-07-14T23:59:59.999Z' }],
						redirect_route_exists: false
					}
				]),
			/post "blog\/2-two" has a date_modified "2024-07-14T23:59:59\.999Z" before its date_published "2024-07-15T00:00:00\.000Z"/
		);
	});

	test('compares dates as instants, not strings', () => {
		// the same instant, but as strings modified sorts first ('.' < 'Z'), so a string compare throws
		assert.doesNotThrow(() =>
			create([
				{
					config,
					post_dirs: [{ blog_post_id: 1, slug: 'one' }],
					posts: [
						{
							...post,
							date_published: '2024-07-15T00:00:00Z',
							date_modified: '2024-07-15T00:00:00.000Z'
						}
					],
					redirect_route_exists: false
				}
			])
		);
	});

	test('writes no redirect route for a blog without posts', () => {
		const outputs = create([{ config, post_dirs: [], posts: [], redirect_route_exists: false }]);
		assert.deepEqual(
			outputs.map((o) => o.filename),
			['/project/static/blog/feed.xml', '/project/src/routes/blog/feed.ts']
		);
		assert.include(outputs[1]!.content, '"items":[]');
	});

	test('throws when a blog without posts has a redirect route on disk', () => {
		assert.throws(
			() => create([{ config, post_dirs: [], posts: [], redirect_route_exists: true }]),
			/blog has no posts.* - delete \/project\/src\/routes\/blog\/\[post=blog_post_id\]\/\+page\.ts/
		);
	});

	test('throws on invalid post metadata, naming the post directory', () => {
		assert.throws(
			() =>
				create([
					{
						config,
						post_dirs: [{ blog_post_id: 4, slug: 'four' }],
						posts: [{ ...post, date_modified: '2024-07-15' }],
						redirect_route_exists: false
					}
				]),
			/invalid post metadata at blog\/4-four:\ndate_modified: expected an ISO datetime/
		);
	});
});
