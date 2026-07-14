---
'@fuzdev/fuz_blog': patch
---

fix: keep `resolve_blog_post_item` to the `BlogPostItem` contract

0.30.0 spread the whole `post` into the feed item, which leaked a consumer's
extra post metadata (e.g. an autoblog's `model`) into the generated, typed
`feed.ts` and failed its `BlogFeed` type-check. The item now emits only
`BlogPostItem` fields; extra metadata stays on the page's `post` for its
component to render.
