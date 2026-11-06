import { assert, describe, test } from 'vitest';

import { resolve_blog_post_pathname } from '#lib/blog_post_pathname.ts';

describe('resolve_blog_post_pathname', () => {
	test('resolves a post pathname as an app route', () => {
		assert.equal(resolve_blog_post_pathname('/blog/3-2024-recap'), '/blog/3-2024-recap');
	});
});
