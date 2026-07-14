---
'@fuzdev/fuz_blog': minor
---

break: prop-driven listing, reusable post scaffolding, and pure blog helpers

- new `BlogPostList.svelte` renders a feed's post list from a `feed` prop, so a
  consumer with more than one blog can reuse the listing instead of copying the
  `/blog` route
- `BlogPost.svelte` gains an optional `item` prop (falling back to
  `blog_feed_context`) and a `meta` snippet that renders in the header — e.g.
  `{#snippet meta(item)}<MyProvenance {item} />{/snippet}` — for post provenance
- `resolve_blog_post_item` and `resolve_blog_config` move from `blog_helpers.ts`
  to `blog.ts` (pure, no node/gro imports); `resolve_blog_config` now throws a
  plain `Error` instead of a gro `TaskError`
- `resolve_blog_post_item` takes a `{slug_routes}` option (replacing the inline
  `url = id` override the generator did) and now preserves extra fields from
  consumer post types so they reach the generated feed
- new `create_blog_post` helper carries the `gro post` body (scaffold, format,
  write); `post.task.ts` is a thin wrapper over it, and a consumer can call it
  from its own task with a custom `scaffold` to thread extra flags without
  forking the task
- `gro post` now formats through gro's in-process `format_file`, so
  `@fuzdev/gro >=0.206` is required
