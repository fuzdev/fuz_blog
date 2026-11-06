---
'@fuzdev/fuz_blog': minor
---

break: remove `HashLink.svelte` - use fuz_ui's `Hashlink.svelte`

break: `FeedItemDate`'s `item` prop is `Pick<FeedItem, 'date_published' | 'date_modified'>`, so it also takes `BlogPostMetadata`, and it shows "updated" only when the modified date formats to a different day than the published date (an edit on the publish day, or the same instant written differently, is not an update)

break: `gro task src/lib/update_post.task.ts` names the post by its id, its `<id>-<slug>` directory name, or its slug (failing when the slug matches more than one post); a bare id must be a positive integer without leading zeros, so `1e3`, `0x2`, `1.0`, and ` 1` no longer parse as ids. `UpdateBlogPostOptions` takes `query: string` in place of `blog_post_id`, and `UpdatedBlogPost` adds `slug`. The task logs the updated post. New `find_blog_post_dir` in `blog.ts` resolves a query against a blog's posts.

break: `load_blog_post_modules` is renamed `load_blog_posts` and returns each post's unvalidated `post` export (`Array<unknown>`); `BlogPostModule` is removed

break: the blogs registry check (`validate_blog_configs`) also rejects a config that is not an object, a non-string `dirname`, a `scaffold` that is not a function, and any key besides `dirname`, `feed`, and `scaffold` (e.g. a leftover `slug_routes`); it takes the registry unvalidated (`Array<unknown>`) and asserts it is `Array<BlogConfig>`

fix: the `home_page_url` check compares percent escapes case-insensitively, so `https://example.com/caf%c3%a9` matches `dirname: 'café'`

fix: `BlogPostList` renders its empty message as a paragraph instead of text inside the `<ol>`

New exports: `find_blog_post_dir` (`blog.ts`), `load_fuz_blog_import_path` and `load_blog_posts` (`blog_helpers.ts`), `resolve_blog_post_pathname` (`blog_post_redirect.ts`), and the `FeedUrl` type (`feed.ts`).
