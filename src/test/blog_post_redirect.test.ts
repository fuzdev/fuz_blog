import { assert, describe, test } from 'vitest';
import { isHttpError, isRedirect } from '@sveltejs/kit';

import {
	blog_post_redirect,
	find_blog_feed_item_by_param,
	to_blog_post_redirect_entries
} from '#lib/blog_post_redirect.ts';
import { resolve_blog_feed_item, type BlogFeed, type BlogPostMetadata } from '#lib/blog.ts';

const post: BlogPostMetadata = {
	title: 'Hello',
	date_published: '2024-07-15T00:00:00.000Z',
	date_modified: '2024-07-15T00:00:00.000Z',
	summary: 'a summary'
};

const home_page_url = 'https://example.com/blog';

const feed: BlogFeed = {
	id: 'https://example.com/',
	title: 'test blog',
	home_page_url,
	description: 'desc',
	icon: 'https://example.com/favicon.png',
	favicon: 'https://example.com/favicon.png',
	author: { name: 'Test' },
	atom: { feed_url: 'https://example.com/blog/feed.xml' },
	items: [
		resolve_blog_feed_item({ blog_post_id: 1, slug: 'hello' }, 'blog', home_page_url, post),
		resolve_blog_feed_item({ blog_post_id: 3, slug: '2024-recap' }, 'blog', home_page_url, post)
	]
};

const catch_thrown = (fn: () => unknown): unknown => {
	try {
		fn();
	} catch (err) {
		return err;
	}
	assert.fail('expected a throw');
};

describe('find_blog_feed_item_by_param', () => {
	test('finds an item by its bare id', () => {
		assert.equal(find_blog_feed_item_by_param(feed, '1')?.pathname, '/blog/1-hello');
		assert.equal(find_blog_feed_item_by_param(feed, '3')?.pathname, '/blog/3-2024-recap');
	});

	test('finds nothing for an unknown or non-canonical id', () => {
		for (const param of ['2', '01', '1.0', ' 1', '1-hello', 'hello', '', '0']) {
			assert.equal(find_blog_feed_item_by_param(feed, param), undefined, param);
		}
	});
});

describe('to_blog_post_redirect_entries', () => {
	test('lists every post by bare id', () => {
		assert.deepEqual(to_blog_post_redirect_entries(feed), [{ post: '1' }, { post: '3' }]);
	});
});

describe('blog_post_redirect', () => {
	test('redirects a bare id to the canonical pathname with a 308', () => {
		const thrown = catch_thrown(() => blog_post_redirect(feed, '3'));
		assert(isRedirect(thrown));
		assert.equal(thrown.status, 308);
		assert.equal(thrown.location, '/blog/3-2024-recap');
	});

	test('404s an unknown or non-canonical id', () => {
		for (const param of ['2', '01', 'hello']) {
			const thrown = catch_thrown(() => blog_post_redirect(feed, param));
			assert(isHttpError(thrown, 404), param);
		}
	});
});
