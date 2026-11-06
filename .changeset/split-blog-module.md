---
'@fuzdev/fuz_blog': minor
---

break: split `blog.ts` into focused modules, with no re-exports - update imports to the new paths:

- `blog.ts` → `blog_config.ts`: `BlogConfig`, `BlogPostScaffoldOptions`, `BlogsModule`, `resolve_blog_config`
- `blog.ts` → `blog_post_id.ts`: `BlogPostId`
- `blog.ts` → `blog_feed_context.ts`: `blog_feed_context`

The post directory helpers are in `blog_post_dir.ts`, the registry validation (`validate_blog_configs`) in `blog_config.ts`, and `resolve_blog_post_pathname` in `blog_post_pathname.ts`.

`BlogPostMetadata`, `BlogFeedItem`, `BlogFeedMetadata`, `BlogFeed`, `resolve_blog_feed_item`, and `to_blog_feed_url` stay in `blog.ts`, which no longer imports fuz_ui, so `blog.ts`, `blog_config.ts`, and the gen and task modules' own imports stay free of Svelte (gen still loads each post's `+page.svelte` to read its `post`). Generated `feed.ts` and redirect route files are unchanged. A blog's `src/routes/blogs.ts` imports `BlogConfig` from `blog_config.ts`, and a blog layout imports `blog_feed_context` from `blog_feed_context.ts`.

feat: `BlogPost`'s `meta` and `comments` snippets take `(item: BlogFeedItem, post: BlogPostMetadata)`, passing the `post` prop so a snippet shared across posts can render a consumer's extra metadata fields (existing one-argument snippets still work)

break: remove the `routes_path` option from `CreateBlogPostOptions`, `UpdateBlogPostOptions`, and `BlogGenOptions` - blogs are always at `src/routes/<dirname>`, now resolved by the new `to_blog_dir` in `blog_helpers.ts`
