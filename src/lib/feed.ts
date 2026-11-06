import * as s from '@fuzdev/fuz_schema/schema.ts';
import { Url } from '@fuzdev/fuz_util/url.ts';

// TODO publish `feed.json` and RSS beside the Atom `feed.xml`, finishing the mapping between them
// https://www.jsonfeed.org/mappingrssandatom/

// the pattern of Zod 4's default `z.iso.datetime()`: a calendar-valid date, a time with
// seconds and any fractional digits, and a `Z` offset (no numeric offset, no local time)
const DATETIME_PATTERN =
	/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|02-(?:0[1-9]|1\d|2[0-8])))T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/;

/**
 * An ISO 8601 UTC datetime string like `2024-07-15T00:00:00.000Z`, the form
 * `Date.prototype.toISOString` writes. The date must exist on the calendar,
 * seconds are required, fractional seconds take any number of digits, and the
 * offset must be `Z`. The output is the input unchanged.
 */
export const FeedDatetime = s.pipe(s.string, s.regex(DATETIME_PATTERN, 'an ISO datetime'));
export type FeedDatetime = s.Infer<typeof FeedDatetime>;

/**
 * An absolute URL as fuz_util's `Url` takes it, with no surrounding
 * whitespace: the text is kept as written, so padding would reach the
 * generated feed, where it fails here instead.
 */
export const FeedUrl = s.pipe(
	Url,
	s.check((v: string) => v === v.trim(), 'a URL without surrounding whitespace')
);
export type FeedUrl = s.Infer<typeof FeedUrl>;

// the email pattern of Zod's `z.email()`, in the form without lookaheads
const EMAIL_PATTERN =
	/^(?:[A-Za-z0-9_'+-]+\.)*[A-Za-z0-9_'+-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
const Email = s.pipe(s.string, s.regex(EMAIL_PATTERN, 'an email'));

export const FeedItem = s.object({
	id: s.string,
	title: s.string,
	url: FeedUrl,
	date_published: FeedDatetime,
	date_modified: FeedDatetime,
	summary: s.string,
	// TODO
	// content_text: string;
	// content_html: string;
	// image?: string;
	// external_url?: string;
	tags: s.optional(s.array(s.string))
});
export type FeedItem = s.Infer<typeof FeedItem>;

/**
 * A blog's feed data, rendered to Atom by `create_atom_feed`. Field names follow
 * JSON Feed 1.1 where the two overlap, but the shape is not a conformant JSON Feed:
 * it has a feed-level `id` (Atom's), a single `author` with `email`, the Atom
 * `feed_url` under an unprefixed `atom` key, no `version`, and items with a
 * `summary` but no `content_html` or `content_text`. Publishing `feed.json`
 * means mapping to the spec, not serializing this as is.
 * https://www.jsonfeed.org/version/1.1/
 */
export const Feed = s.object({
	id: s.string,
	title: s.string,
	home_page_url: FeedUrl,
	description: s.string,
	icon: FeedUrl,
	favicon: FeedUrl,
	author: s.object({
		name: s.string,
		url: s.optional(FeedUrl),
		email: s.optional(Email)
	}),
	items: s.array(FeedItem),
	atom: s.object({
		feed_url: FeedUrl
	})
	// TODO should these be on the root?
	// yes if the goal is to match the data structure of JSON Feed as much as possible,
	// no if the goal is to put shared properties on the root and format-specific properties in a namespace
	// jsonfeed: {version, feed_url, expired?}
});
export type Feed = s.Infer<typeof Feed>;

/**
 * Escapes a value for safe interpolation into XML text or a double-quoted
 * attribute. Without it a `&` (e.g. in a URL query string) or a `<` in a title
 * produces malformed Atom that readers reject.
 */
const escape_xml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');

// numeric collation orders ids like `.../blog/9` before `.../blog/10`
const id_collator = new Intl.Collator('en', { numeric: true });

/**
 * Compares feed items newest first: by `date_published` descending, then by
 * `id` descending with numeric collation (so `https://example.com/blog/10`
 * sorts before `https://example.com/blog/9`), then by `id` code units.
 * For valid `FeedDatetime` values it's a total order, so the sort is deterministic for any input order.
 * `create_atom_feed` and `BlogPostList` both order items with it.
 */
export const compare_feed_items = (a: FeedItem, b: FeedItem): number => {
	// `Date.parse`, not string comparison: fractional seconds vary in length
	const by_date = Date.parse(b.date_published) - Date.parse(a.date_published);
	if (by_date !== 0) return by_date;
	const by_id = id_collator.compare(b.id, a.id);
	if (by_id !== 0) return by_id;
	return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
};

/**
 * Returns a copy of `items` sorted newest first by `compare_feed_items`.
 */
export const sort_feed_items = <T extends FeedItem>(items: ReadonlyArray<T>): Array<T> =>
	items.slice().sort(compare_feed_items);

/**
 * Renders a feed as Atom XML, entries newest first (see `compare_feed_items`).
 * The feed-level `<updated>` is the latest `date_modified` or `date_published`
 * across the items. Atom requires the element, so a feed with no items gets
 * the Unix epoch, `1970-01-01T00:00:00.000Z` - a fixed value keeps the
 * generated `feed.xml` deterministic, where the current time would change it
 * on every `gro gen`. Expects parsed `Feed` data; an unparseable date throws.
 */
export const create_atom_feed = (data: Feed): string => {
	const items = sort_feed_items(data.items);

	const updated = new Date(
		items.reduce(
			(latest, item) =>
				Math.max(latest, Date.parse(item.date_modified), Date.parse(item.date_published)),
			0
		)
	).toISOString();

	return `<?xml version="1.0" encoding="UTF-8" ?>

<feed xmlns="http://www.w3.org/2005/Atom">

  <id>${escape_xml(data.id)}</id>
  <title>${escape_xml(data.title)}</title>
  <subtitle>${escape_xml(data.description)}</subtitle>
  <link href="${escape_xml(data.home_page_url)}" />
  <link href="${escape_xml(data.atom.feed_url)}" rel="self" type="application/atom+xml" />
  <updated>${updated}</updated>
  <icon>${escape_xml(data.icon)}</icon>
  <author>
    <name>${escape_xml(data.author.name)}</name>
    ${data.author.email ? `<email>${escape_xml(data.author.email)}</email>` : ''}
    ${data.author.url ? `<uri>${escape_xml(data.author.url)}</uri>` : ''}
  </author>
  ${items
		.map(
			(item) =>
				`
  <entry>
    <id>${escape_xml(item.id)}</id>
    <title>${escape_xml(item.title)}</title>
    <link rel="alternate" href="${escape_xml(item.url)}" />
    <published>${item.date_published}</published>
    <updated>${item.date_modified}</updated>
    <summary>${escape_xml(item.summary)}</summary>
    ${item.tags ? item.tags.map((tag) => `<category term="${escape_xml(tag)}" />`).join('') : ''}
  </entry>`
		)
		.join('\n')}

</feed>
`;
};
