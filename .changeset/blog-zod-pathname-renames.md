---
'@fuzdev/fuz_blog': minor
---

break: Zod-validated feed, `pathname` on feed items, and clearer type names

- rename `BlogPostData` → `BlogPostMetadata` and `BlogPostItem` → `BlogFeedItem`
  (the latter parallels `Feed`/`FeedItem` and `BlogFeed`); update imports and any
  `satisfies BlogPostData` in your post modules
- rename `BlogFeedData` → `BlogFeedMetadata` (the consumer-supplied feed config,
  parallel to the author-supplied `BlogPostMetadata`); update `BlogConfig.feed`
  types and imports
- rename `resolve_blog_post_item()` → `resolve_blog_feed_item()` to match its
  `BlogFeedItem` return type and pair with `resolve_blog_config()`
- the blog shapes are now Zod schemas as the source of truth: `BlogPostMetadata`
  is a loose object so consumer post fields pass through, while the generated
  `BlogFeed`/`BlogFeedItem` are strict — `gro gen` now fails if a post is
  malformed or an extra field would leak into the typed feed
- `BlogFeedItem` gains a `pathname` field (the app-relative post path, e.g.
  `/blog/my-post`) computed during `gro gen`; `BlogPostList` links via it instead
  of re-deriving the path from `url` at render time
- `BlogFeedItem.blog_post_id` is now typed `number` (was the `BlogPostId` flavor)
- `Feed`/`FeedItem` in `feed.ts` are now Zod schemas too, with the string fields
  validated to their semantic types: URLs (`home_page_url`, `icon`, `favicon`,
  `url`, `atom.feed_url`, `author.url`) use `z.url()`, `author.email` uses
  `z.email()`, and post `date_published`/`date_modified` use `z.iso.datetime()`.
  A malformed date or URL in a post or feed config now fails `gro gen`
- `create_atom_feed` now XML-escapes all interpolated values, so titles,
  summaries, and URLs containing `&`, `<`, `>`, or `"` (e.g. a link with a query
  string) produce valid Atom instead of malformed XML
- regenerate after upgrading: re-run `gro gen` to rebuild `feed.ts` and `feed.xml`
