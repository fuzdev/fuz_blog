---
'@fuzdev/fuz_blog': minor
---

fix: `format_date` renders the UTC calendar date (via `Intl.DateTimeFormat`, same `Jul 10, 2024` format), so a post near midnight UTC no longer shows a different day depending on the build machine's timezone; `BlogPostList` orders posts newest first by `date_published` like the Atom feed instead of by reversed id, through the new `compare_feed_items` / `sort_feed_items`; Atom entries get a deterministic tie-break; the feed `<updated>` takes the latest of each item's `date_modified` and `date_published`; the template sets `blog_feed_context` in `src/routes/blog/+layout.svelte` instead of the root layout; drop the `date-fns` dependency
