import { assert, describe, test } from 'vitest';

import { create_atom_feed, type Feed } from '$lib/feed.ts';

const feed: Feed = {
	id: 'https://example.com/',
	title: 'Cats & Dogs',
	home_page_url: 'https://example.com/blog',
	description: 'a <b> & c',
	icon: 'https://example.com/icon.png',
	favicon: 'https://example.com/favicon.png',
	author: { name: 'A & B' },
	items: [
		{
			id: 'https://example.com/blog/1',
			title: 'Tips & <Tricks>',
			url: 'https://example.com/blog/1?a=1&b=2',
			date_published: '2024-07-15T00:00:00.000Z',
			date_modified: '2024-07-15T00:00:00.000Z',
			summary: 'x < y & z',
			tags: ['a & b']
		}
	],
	atom: { feed_url: 'https://example.com/blog/feed.xml' }
};

describe('create_atom_feed', () => {
	test('escapes special characters in text, attributes, and urls', () => {
		const xml = create_atom_feed(feed);
		// no raw special characters leak into the output
		assert.ok(!xml.includes('Tips & <Tricks>'));
		assert.ok(xml.includes('Tips &amp; &lt;Tricks&gt;'));
		// a url with a query string is escaped inside its attribute
		assert.ok(xml.includes('href="https://example.com/blog/1?a=1&amp;b=2"'));
		// tags are escaped in the `term` attribute
		assert.ok(xml.includes('<category term="a &amp; b" />'));
		// every ampersand in the whole document is a valid XML entity
		assert.ok(!/&(?!(amp|lt|gt|quot|apos|#\d+);)/.test(xml), 'all ampersands are escaped');
	});
});
