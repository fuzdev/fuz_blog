---
'@fuzdev/fuz_blog': minor
---

**breaking** fix: `BlogPostList` no longer doubles a non-empty `paths.base` - `BlogFeedItem.pathname` is now the base-free app route (`/<dirname>/<slug-or-id>`), and `resolve_blog_feed_item` takes the blog's `dirname` as its second argument; re-run `gro gen` to regenerate feeds
