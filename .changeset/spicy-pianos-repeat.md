---
'@fuzdev/fuz_blog': minor
---

break: multi-blog support, mastodon decoupling, and task fixes

- blogs are declared in a `src/routes/blogs.ts` registry exporting
  `blogs: Array<BlogConfig>`, replacing `src/routes/blog/blog.ts` — each entry
  is `{dirname, feed, slug_routes?, scaffold?}` (the `BlogModule` type is gone)
- post URLs now derive from `feed.home_page_url`, so set it to the blog's index
  page (e.g. `https://www.example.com/blog`) rather than the site root
- `gro post` and `gro update_post` accept `--blog <dirname>` targeting any
  registered blog (default: the first entry); `BlogConfig.scaffold` customizes
  the scaffolded post file per blog
- `slug_routes: false` opts a blog out of generated slug redirect routes, and
  its post URLs become the integer id paths
- `BlogPost.svelte` no longer imports `@fuzdev/fuz_mastodon` or renders
  comments itself, and its `separator` prop is gone — pass the new `comments`
  snippet instead, e.g.
  `{#snippet comments(item)}<BlogPostComments {item} />{/snippet}`; the new
  `BlogPostComments.svelte` carries the mastodon rendering and separators, and
  `@fuzdev/fuz_mastodon` is now an optional peer dependency (only needed if
  you import `BlogPostComments.svelte`)
- removed the now-unused `to_pathname` helper from `util.ts` — the blog listing
  derives each post's route path from `item.url` directly
