import { assert, describe, test } from 'vitest';

import { blog_post_id_param, is_blog_post_id_param } from '#lib/blog_post_id.ts';

describe('is_blog_post_id_param', () => {
	test('accepts positive safe integers without leading zeros', () => {
		for (const param of ['1', '42', '9007199254740991']) {
			assert.ok(is_blog_post_id_param(param), param);
		}
	});

	test('rejects everything else', () => {
		for (const param of [
			'',
			'0',
			'01',
			'-1',
			'1.0',
			'1e3',
			' 1',
			'1-hello',
			'feed.xml',
			'photo.png',
			'9007199254740992'
		]) {
			assert.ok(!is_blog_post_id_param(param), param);
		}
	});
});

describe('blog_post_id_param', () => {
	test('returns the param when it matches and undefined otherwise', () => {
		assert.equal(blog_post_id_param('7'), '7');
		assert.equal(blog_post_id_param('photo.png'), undefined);
	});
});
