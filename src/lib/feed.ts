import {z} from 'zod';

// TODO publish `feed.json` not just the Atom `feed.xml`

// TODO also publish rss probably

// TODO finish mapping with Atom and RSS
// https://www.jsonfeed.org/mappingrssandatom/

export const FeedItem = z.strictObject({
	id: z.string(),
	title: z.string(),
	url: z.url(),
	date_published: z.iso.datetime(),
	date_modified: z.iso.datetime(),
	summary: z.string(),
	// TODO
	// content_text: string;
	// content_html: string;
	// image?: string;
	// external_url?: string;
	tags: z.array(z.string()).optional(),
});
export type FeedItem = z.infer<typeof FeedItem>;

/**
 * This is designed to extend JSON Feed 1.1 with namespaced data for other specs like Atom.
 * It's still a work in progress, and I'll add features as I need them,
 * and eventually this will be extracted to a standalone library.
 * https://www.jsonfeed.org/version/1.1/
 */
export const Feed = z.strictObject({
	id: z.string(),
	title: z.string(),
	home_page_url: z.url(),
	description: z.string(),
	icon: z.url(),
	favicon: z.url(),
	author: z.strictObject({
		name: z.string(),
		url: z.url().optional(),
		email: z.email().optional(),
	}),
	// TODO date_modified for entire feed?
	items: z.array(FeedItem),
	atom: z.strictObject({
		feed_url: z.url(),
	}),
	// TODO should these be on the root?
	// yes if the goal is to match the data structure of JSON Feed as much as possible,
	// no if the goal is to put shared properties on the root and format-specific properties in a namespace
	// jsonfeed: {version, feed_url, expired?}
	// TODO support RSS
});
export type Feed = z.infer<typeof Feed>;

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
  </entry>`,
		)
		.join('\n')}

</feed>
`;
};
