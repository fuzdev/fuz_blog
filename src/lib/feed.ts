import * as s from '@fuzdev/fuz_schema/schema.ts';
import { Url } from '@fuzdev/fuz_util/url.ts';

// TODO publish `feed.json` not just the Atom `feed.xml`

// TODO also publish rss probably

// TODO finish mapping with Atom and RSS
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
 * This is designed to extend JSON Feed 1.1 with namespaced data for other specs like Atom.
 * It's still a work in progress, and I'll add features as I need them,
 * and eventually this will be extracted to a standalone library.
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
	// TODO date_modified for entire feed?
	items: s.array(FeedItem),
	atom: s.object({
		feed_url: FeedUrl
	})
	// TODO should these be on the root?
	// yes if the goal is to match the data structure of JSON Feed as much as possible,
	// no if the goal is to put shared properties on the root and format-specific properties in a namespace
	// jsonfeed: {version, feed_url, expired?}
	// TODO support RSS
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

export const create_atom_feed = (data: Feed): string => {
	const items = data.items
		.slice()
		.sort((a, b) => (new Date(a.date_published) > new Date(b.date_published) ? -1 : 1)); // TODO maybe add an option to customize this? maybe by `date_modified`?

	const updated: string = items
		.reduce((latest, item) => {
			const modified = new Date(item.date_modified || item.date_published);
			return modified > latest ? modified : latest;
		}, new Date(0))
		.toISOString();

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
