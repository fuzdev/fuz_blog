---
'@fuzdev/fuz_blog': minor
---

**breaking** feat: the blog and feed schemas are `@fuzdev/fuz_schema` schemas instead of Zod's, and `zod` is no longer a peer dep

- `Feed`, `FeedItem`, `BlogFeedMetadata`, `BlogFeed`, `BlogFeedItem`, `BlogPostMetadata`, `MastodonBlogComments`, and `BlogComments` are fuz_schema schemas with no `.parse`, `.safeParse`, `.shape`, `.omit`, or `.extend`: call `s.parse(BlogFeed, value)` for `{ok: true, value}` or `{ok: false, issues}` in place of `.safeParse`, and `s.parse_or_throw` (throwing `SchemaError`) in place of `.parse`; compose from an object schema's entries, its `def`; the inferred types are unchanged
- raise `@fuzdev/fuz_schema` to `^0.4.0` and `@fuzdev/fuz_util` to `>=0.74.0`, the new peer floors; a site that imports Zod only for fuz_blog can drop it
- `feed.ts` exports `FeedDatetime` (unbranded, and unrelated to fuz_app's Zod `Datetime`), the schema of `date_published` and `date_modified`: a UTC ISO datetime like `2024-07-15T00:00:00.000Z`, as Zod 4.6's `z.iso.datetime()` accepts it, so a time without seconds such as `2024-07-15T00:00Z`, which Zod before 4.6 accepted, now fails
- url fields are `FeedUrl`, exported from `feed.ts`: fuz_util's `Url`, which checks the text with `URL.canParse` and keeps it as written, refusing surrounding whitespace, so a url Zod trimmed, such as `' https://example.com'`, now fails rather than reach the generated feed
- `gro gen` reports invalid post metadata and an invalid generated feed with fuz_schema's `format_issue` text, one issue per line, like `date_modified: expected an ISO datetime, received string`, instead of Zod's `prettifyError`
- the generated `feed.ts` keeps the key order of the `BlogConfig` `feed` where Zod rewrote it in schema order, so re-run `gro gen` after upgrading
