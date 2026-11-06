---
'@fuzdev/fuz_blog': minor
---

break: posts live at `src/routes/<dirname>/<id>-<slug>/+page.svelte` and the slug comes from the directory name; `gro gen` writes a `[post=blog_post_id]` route redirecting `/<dirname>/<id>` to the post, `slug` is gone from `BlogPostMetadata`, and `BlogConfig.slug_routes` is removed

Migrate each blog:

- rename every post directory from `<id>/` to `<id>-<slug>/`, e.g. `blog/1/` to `blog/1-hello-world/`
- remove `slug` from each post's `post` metadata
- delete the slug route directories older versions generated, e.g. `blog/hello-world/`
- drop `slug_routes` from `src/routes/blogs.ts`
- register the redirect route's param matcher in `src/params.ts` (add it to an existing `defineParams` call if there is one): `export const params = defineParams({blog_post_id: blog_post_id_param});` with `defineParams` from `@sveltejs/kit/params` and `blog_post_id_param` from `@fuzdev/fuz_blog/blog_post_id.ts`
- run `gro gen`

Post URLs become `/<dirname>/<id>-<slug>`, and feed entry ids stay `<home_page_url>/<id>`, which redirect to the post.
The old `/<dirname>/<slug>` URLs no longer resolve.
A blog without posts gets no redirect route.
`post.task.ts` takes `--slug`, and both tasks validate `--date` as a UTC ISO datetime.

`BlogPost` finds its feed item by matching the current route to the item's `pathname`, so rendering a post off its own route needs an explicit `item`. It also emits a `<link rel="canonical">` on the post's own route.

API: `collect_blog_post_ids` is replaced by `collect_blog_post_dirs`; `to_next_blog_post_id` moves to `blog.ts` and takes `BlogPostDir`s; `to_blog_post_path` and `resolve_blog_feed_item` take a `BlogPostDir` in place of the id, and `resolve_blog_feed_item` drops its `slug_routes` option; `BlogPostScaffoldOptions` gains `blog_post_id`. New: `parse_blog_post_dirname`, `to_blog_post_dirname`, `resolve_blog_post_dirs`, `BLOG_POST_SLUG_PATTERN`, and `BlogPostDir` in `blog.ts`; `blog_post_id.ts` with `BLOG_POST_ID_SOURCE`, `is_blog_post_id_param`, and `blog_post_id_param`; `blog_post_redirect.ts` with `find_blog_feed_item_by_param`, `to_blog_post_redirect_entries`, and `blog_post_redirect`; and `to_blog_post_slug`, `create_blog_gen_outputs`, `BlogGenInput`, `BlogGenOptions`, `BlogGenOutput`, `BLOG_POST_REDIRECT_ROUTE_DIRNAME`, and `to_blog_post_redirect_route_path` in `blog_helpers.ts`.
