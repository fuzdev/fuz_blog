---
'@fuzdev/fuz_blog': minor
---

break: `atom` is removed from `BlogConfig.feed` (`BlogFeedMetadata`) - `gro gen` derives the generated feed's `atom.feed_url` from `home_page_url` as `<home_page_url>/feed.xml`, where it writes `static/<dirname>/feed.xml`; new `to_blog_feed_url` in `blog.ts`

Migrate: delete `atom` from each blog's `feed` in `src/routes/blogs.ts`, and link feeds with `to_blog_feed_url(blog.feed.home_page_url)` where you read `blog.feed.atom.feed_url` (e.g. the root layout's alternate links). The generated `BlogFeed` still carries `atom.feed_url`.

`load_blogs_module` now validates the registry with the new `validate_blog_configs` (in `blog.ts`), so `gro gen` and the post tasks check it before touching any post file; gen fails with an error naming the blog or post when:

- a `dirname` is not route path segments - empty, `.` or `..` segments, a leading or trailing slash, or a `\`, `?`, `#`, `%`, space, or ASCII control character, or a route group or param segment like `(group)` or `[param]` - the dirname must equal the URL path
- a blog's `home_page_url` pathname (trailing slash ignored) does not end with `/<dirname>`, after any deploy base path, or the url has a query or fragment - post and feed URLs derive from it
- two blogs in the registry share a `dirname`
- a blog's `feed` fails strict `BlogFeedMetadata` validation, including a leftover `atom`

`gro gen` also fails on a post whose `date_modified` is before its `date_published`.

`gro task src/lib/update_post.task.ts` refuses a `--date` before the post's `date_published` when the file has exactly one quoted `date_published` value.
