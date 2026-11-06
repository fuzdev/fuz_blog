import { assert, describe, test } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	compare_feed_items,
	create_atom_feed,
	FeedDatetime,
	Feed,
	type FeedItem,
	FeedUrl,
	sort_feed_items
} from '#lib/feed.ts';

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

const to_item = (n: number, date_published: string, date_modified = date_published): FeedItem => ({
	id: `https://example.com/blog/${n}`,
	title: `post ${n}`,
	url: `https://example.com/blog/${n}-post`,
	date_published,
	date_modified,
	summary: ''
});

const to_entry_ids = (xml: string): Array<string> =>
	Array.from(xml.matchAll(/<entry>\s*<id>([^<]+)<\/id>/g), (m) => m[1]!);

// the feed-level element, indented by two spaces where an entry's is indented by four
const to_feed_updated = (xml: string): string | undefined =>
	/^ {2}<updated>([^<]+)<\/updated>$/m.exec(xml)?.[1];

describe('compare_feed_items', () => {
	test('breaks numerically equal ids by code units', () => {
		const date = '2024-01-01T00:00:00Z';
		const a = { ...to_item(9, date), id: 'https://example.com/blog/09' };
		const b = to_item(9, date);
		assert.notEqual(compare_feed_items(a, b), 0);
		assert.deepEqual(
			sort_feed_items([a, b]).map((i) => i.id),
			sort_feed_items([b, a]).map((i) => i.id)
		);
	});

	test('orders by `date_published`, newest first, not by id', () => {
		const items = [
			to_item(1, '2024-01-01T00:00:00Z'),
			to_item(2, '2024-03-01T00:00:00Z'),
			to_item(3, '2024-02-01T00:00:00Z') // published before 2, e.g. a backdated post
		];
		assert.deepEqual(
			sort_feed_items(items).map((i) => i.title),
			['post 2', 'post 3', 'post 1']
		);
	});

	test('compares instants, not strings, across fractional second lengths', () => {
		const a = to_item(1, '2024-01-01T00:00:00Z');
		const b = to_item(2, '2024-01-01T00:00:00.5Z'); // later, though it sorts lower as a string
		assert.deepEqual(
			sort_feed_items([a, b]).map((i) => i.title),
			['post 2', 'post 1']
		);
	});

	test('breaks date ties by id descending, numerically', () => {
		const date = '2024-01-01T00:00:00Z';
		const items = [to_item(9, date), to_item(10, date), to_item(2, date)];
		assert.deepEqual(
			sort_feed_items(items).map((i) => i.title),
			['post 10', 'post 9', 'post 2']
		);
	});

	test('is a consistent comparator', () => {
		const date = '2024-01-01T00:00:00Z';
		const a = to_item(1, date);
		const b = to_item(2, date);
		assert.equal(compare_feed_items(a, a), 0);
		assert.equal(compare_feed_items(a, { ...a }), 0);
		assert.equal(Math.sign(compare_feed_items(a, b)), -Math.sign(compare_feed_items(b, a)));
		assert.notEqual(compare_feed_items(a, b), 0);
	});

	test('sorts the same regardless of input order', () => {
		const items = [
			to_item(1, '2024-01-01T00:00:00Z'),
			to_item(2, '2024-01-01T00:00:00Z'),
			to_item(3, '2023-01-01T00:00:00Z')
		];
		const expected = sort_feed_items(items).map((i) => i.id);
		assert.deepEqual(
			sort_feed_items(items.slice().reverse()).map((i) => i.id),
			expected
		);
	});

	test('does not mutate its input', () => {
		const items = [to_item(1, '2024-01-01T00:00:00Z'), to_item(2, '2024-02-01T00:00:00Z')];
		sort_feed_items(items);
		assert.deepEqual(
			items.map((i) => i.title),
			['post 1', 'post 2']
		);
	});
});

describe('create_atom_feed', () => {
	test('counts `date_published` when it is later than `date_modified`', () => {
		const xml = create_atom_feed({
			...feed,
			items: [to_item(1, '2024-06-01T00:00:00Z', '2024-01-01T00:00:00Z')]
		});
		assert.equal(to_feed_updated(xml), '2024-06-01T00:00:00.000Z');
	});

	test('writes entries newest first by `date_published`', () => {
		const xml = create_atom_feed({
			...feed,
			items: [
				to_item(1, '2024-01-01T00:00:00Z'),
				to_item(2, '2024-03-01T00:00:00Z'),
				to_item(3, '2024-02-01T00:00:00Z')
			]
		});
		assert.deepEqual(to_entry_ids(xml), [
			'https://example.com/blog/2',
			'https://example.com/blog/3',
			'https://example.com/blog/1'
		]);
	});

	test('sets the feed `updated` to the latest item date', () => {
		const xml = create_atom_feed({
			...feed,
			items: [
				to_item(1, '2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z'),
				to_item(2, '2024-03-01T00:00:00Z')
			]
		});
		assert.equal(to_feed_updated(xml), '2024-06-01T00:00:00.000Z');
	});

	test('sets the feed `updated` to the epoch with no items', () => {
		const xml = create_atom_feed({ ...feed, items: [] });
		assert.equal(to_feed_updated(xml), '1970-01-01T00:00:00.000Z');
		assert.deepEqual(to_entry_ids(xml), []);
	});

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

describe('FeedUrl', () => {
	test('takes an absolute url as written', () => {
		for (const value of ['https://example.com', 'https://example.com/blog/1', 'mailto:a@b.co']) {
			assert.ok(s.parse(FeedUrl, value).ok, value);
		}
	});

	test('refuses a relative url and one with surrounding whitespace', () => {
		for (const value of [
			'/blog/1',
			' https://example.com',
			'https://example.com\n',
			'\thttps://example.com'
		]) {
			assert.ok(!s.parse(FeedUrl, value).ok, value);
		}
	});
});

describe('FeedDatetime', () => {
	test('accepts UTC datetimes with seconds and any fractional digits', () => {
		for (const value of [
			'2024-07-15T00:00:00.000Z',
			'2024-07-15T23:59:59Z',
			'2024-07-15T12:34:56.1Z',
			'2024-07-15T12:34:56.123456789Z',
			'2024-02-29T00:00:00Z', // leap year
			'2000-02-29T00:00:00Z', // leap century
			new Date(0).toISOString()
		]) {
			assert.ok(s.parse(FeedDatetime, value).ok, value);
		}
	});

	test('rejects other forms', () => {
		for (const value of [
			'2024-07-15', // date only
			'2024-07-15T00:00Z', // no seconds
			'2024-07-15T00:00:00', // no offset
			'2024-07-15T00:00:00+00:00', // numeric offset
			'2024-07-15T00:00:00.Z', // empty fraction
			'2024-07-15t00:00:00Z', // lowercase separator
			'2024-07-15 00:00:00Z', // space separator
			'2024-07-15T24:00:00Z', // hour out of range
			'2024-07-15T00:60:00Z', // minute out of range
			'2024-07-15T00:00:60Z', // leap second
			'2024-02-30T00:00:00Z', // day out of range
			'2023-02-29T00:00:00Z', // not a leap year
			'1900-02-29T00:00:00Z', // not a leap century
			'2024-13-01T00:00:00Z', // month out of range
			' 2024-07-15T00:00:00Z', // padded
			'+002024-07-15T00:00:00Z' // expanded year
		]) {
			assert.ok(!s.parse(FeedDatetime, value).ok, value);
		}
	});
});

describe('Feed', () => {
	test('accepts a valid feed', () => {
		assert.ok(s.parse(Feed, feed).ok);
	});

	test('validates urls with `URL.canParse`', () => {
		assert.ok(s.parse(Feed, { ...feed, icon: 'mailto:a@example.com' }).ok);
		const parsed = s.parse(Feed, { ...feed, icon: 'icon.png' });
		assert.ok(!parsed.ok);
		assert.deepEqual(parsed.issues.map(s.format_issue), ['icon: expected a URL, received string']);
	});

	test('validates the author email', () => {
		assert.ok(s.parse(Feed, { ...feed, author: { name: 'a', email: 'a.b+c@example.com' } }).ok);
		for (const email of ['a@b', '.a@example.com', 'a..b@example.com', 'a.@example.com']) {
			assert.ok(!s.parse(Feed, { ...feed, author: { name: 'a', email } }).ok, email);
		}
	});

	test('rejects unknown keys', () => {
		assert.ok(!s.parse(Feed, { ...feed, atom: { feed_url: feed.atom.feed_url, x: 1 } }).ok);
	});
});
