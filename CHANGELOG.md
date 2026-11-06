# @fuzdev/fuz_blog

## 0.38.0

### Minor Changes

- break: `atom` is removed from `BlogConfig.feed` (`BlogFeedMetadata`) - `gro gen` derives the generated feed's `atom.feed_url` from `home_page_url` as `<home_page_url>/feed.xml`, where it writes `static/<dirname>/feed.xml`; new `to_blog_feed_url` in `blog.ts` ([79c58b8](https://github.com/fuzdev/fuz_blog/commit/79c58b8))
  
  Migrate: delete `atom` from each blog's `feed` in `src/routes/blogs.ts`, and link feeds with `to_blog_feed_url(blog.feed.home_page_url)` where you read `blog.feed.atom.feed_url` (e.g. the root layout's alternate links). The generated `BlogFeed` still carries `atom.feed_url`.
  
  `load_blogs_module` now validates the registry with the new `validate_blog_configs` (in `blog_config.ts`), so `gro gen` and the post tasks check it before touching any post file; gen fails with an error naming the blog or post when:
  
  - a `dirname` is not route path segments - empty, `.` or `..` segments, a leading or trailing slash, or a `\`, `?`, `#`, `%`, space, or ASCII control character, or a route group or param segment like `(group)` or `[param]` - the dirname must equal the URL path
  - a blog's `home_page_url` pathname (trailing slash ignored) does not end with `/<dirname>`, after any deploy base path, or the url has a query or fragment - post and feed URLs derive from it
  - two blogs in the registry share a `dirname`
  - a blog's `feed` fails strict `BlogFeedMetadata` validation, including a leftover `atom`
  
  `gro gen` also fails on a post whose `date_modified` is before its `date_published`.
  
  `gro task src/lib/update_post.task.ts` refuses a `--date` before the post's `date_published` when the file has exactly one quoted `date_published` value.
- feat: `BlogPost` is generic over its `post` (`T extends BlogPostMetadata`), and the `meta` and `comments` snippets receive `post: T`, so a consumer's extra post fields are typed in snippets - `T` is inferred from the `post` prop, so a post declared `{...} satisfies BlogPostMetadata` with a `model: 'x'` field gives snippets `post.model: string`, and a shared snippet can type its `post` param with the consumer's own type (e.g. `BlogPostMetadata & {model: string}`), checked against each post that passes it ([7dc4c1c](https://github.com/fuzdev/fuz_blog/commit/7dc4c1c))
  
  Existing call sites and one-arg snippets are unchanged. One tightening: when `post` is declared with `satisfies`, an inline snippet reading a field the post doesn't declare is now a type error rather than `unknown`, and the component's instance type now takes a type argument.
- feat: add `init.task.ts`, run in a consumer as `gro task node_modules/@fuzdev/fuz_blog/dist/init.task.js`, which wires fuz_blog into a SvelteKit project: it creates the missing `src/routes/blogs.ts`, `src/lib/blog.gen.ts`, `src/lib/post.task.ts`, `src/lib/update_post.task.ts`, `src/params.ts`, the blog's `+layout.svelte` and `+page.svelte`, and a root `+layout.svelte` linking the feeds, prints the code to add to existing files instead of editing them, then runs `gro gen`. Feed metadata defaults from `package.json` and is validated before anything is written. The pure planner is `plan_blog_init` in the new `blog_init.ts`, and `load_blogs_registry` is a lenient registry loader that allows an empty `blogs` array. ([e92f92b](https://github.com/fuzdev/fuz_blog/commit/e92f92b))
  
  fix: the generated redirect route imports `../feed.ts` in consumers - gro's dist pass had rewritten the specifier in fuz_blog's published template to `../feed.js`
- break: posts live at `src/routes/<dirname>/<id>-<slug>/+page.svelte` and the slug comes from the directory name; `gro gen` writes a `[post=blog_post_id]` route redirecting `/<dirname>/<id>` to the post, `slug` is gone from `BlogPostMetadata`, and `BlogConfig.slug_routes` is removed ([85c8a44](https://github.com/fuzdev/fuz_blog/commit/85c8a44))
  
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
  
  API: `collect_blog_post_ids` is replaced by `collect_blog_post_dirs`; `to_next_blog_post_id` moves to `blog_post_dir.ts` and takes `BlogPostDir`s; `to_blog_post_path` and `resolve_blog_feed_item` take a `BlogPostDir` in place of the id, and `resolve_blog_feed_item` drops its `slug_routes` option; `BlogPostScaffoldOptions` gains `blog_post_id`. New: `parse_blog_post_dirname`, `to_blog_post_dirname`, `resolve_blog_post_dirs`, `BLOG_POST_SLUG_PATTERN`, and `BlogPostDir` in `blog_post_dir.ts`; `blog_post_id.ts` with `BLOG_POST_ID_SOURCE`, `is_blog_post_id_param`, and `blog_post_id_param`; `blog_post_redirect.ts` with `find_blog_feed_item_by_param`, `to_blog_post_redirect_entries`, and `blog_post_redirect`; and `to_blog_post_slug`, `create_blog_gen_outputs`, `BlogGenInput`, `BlogGenOptions`, `BlogGenOutput`, `BLOG_POST_REDIRECT_ROUTE_DIRNAME`, and `to_blog_post_redirect_route_path` in `blog_helpers.ts`.
- break: split `blog.ts` into focused modules, with no re-exports - update imports to the new paths: ([83c1efc](https://github.com/fuzdev/fuz_blog/commit/83c1efc))
  
  - `blog.ts` → `blog_config.ts`: `BlogConfig`, `BlogPostScaffoldOptions`, `BlogsModule`, `resolve_blog_config`
  - `blog.ts` → `blog_post_id.ts`: `BlogPostId`
  - `blog.ts` → `blog_feed_context.ts`: `blog_feed_context`
  
  The post directory helpers are in `blog_post_dir.ts`, the registry validation (`validate_blog_configs`) in `blog_config.ts`, and `resolve_blog_post_pathname` in `blog_post_pathname.ts`.
  
  `BlogPostMetadata`, `BlogFeedItem`, `BlogFeedMetadata`, `BlogFeed`, `resolve_blog_feed_item`, and `to_blog_feed_url` stay in `blog.ts`, which no longer imports fuz_ui, so `blog.ts`, `blog_config.ts`, and the gen and task modules' own imports stay free of Svelte (gen still loads each post's `+page.svelte` to read its `post`). Generated `feed.ts` and redirect route files are unchanged. A blog's `src/routes/blogs.ts` imports `BlogConfig` from `blog_config.ts`, and a blog layout imports `blog_feed_context` from `blog_feed_context.ts`.
  
  feat: `BlogPost`'s `meta` and `comments` snippets take `(item: BlogFeedItem, post: BlogPostMetadata)`, passing the `post` prop so a snippet shared across posts can render a consumer's extra metadata fields (existing one-argument snippets still work)
  
  break: remove the `routes_path` option from `CreateBlogPostOptions`, `UpdateBlogPostOptions`, and `BlogGenOptions` - blogs are always at `src/routes/<dirname>`, now resolved by the new `to_blog_dir` in `blog_helpers.ts`
- break: remove `HashLink.svelte` - use fuz_ui's `Hashlink.svelte` ([65c0370](https://github.com/fuzdev/fuz_blog/commit/65c0370))
  
  break: `FeedItemDate`'s `item` prop is `Pick<FeedItem, 'date_published' | 'date_modified'>`, so it also takes `BlogPostMetadata`, and it shows "updated" only when the modified date formats to a different day than the published date (an edit on the publish day, or the same instant written differently, is not an update)
  
  break: `gro task src/lib/update_post.task.ts` names the post by its id, its `<id>-<slug>` directory name, or its slug (failing when the slug matches more than one post); a bare id must be a positive integer without leading zeros, so `1e3`, `0x2`, `1.0`, and ` 1` no longer parse as ids. `UpdateBlogPostOptions` takes `query: string` in place of `blog_post_id`, and `UpdatedBlogPost` adds `slug`. The task logs the updated post. New `find_blog_post_dir` in `blog_post_dir.ts` resolves a query against a blog's posts.
  
  break: `load_blog_post_modules` is renamed `load_blog_posts` and returns each post's unvalidated `post` export (`Array<unknown>`); `BlogPostModule` is removed
  
  break: the blogs registry check (`validate_blog_configs`) also rejects a config that is not an object, a non-string `dirname`, a `scaffold` that is not a function, and any key besides `dirname`, `feed`, and `scaffold` (e.g. a leftover `slug_routes`); it takes the registry unvalidated (`Array<unknown>`) and asserts it is `Array<BlogConfig>`
  
  fix: the `home_page_url` check compares percent escapes case-insensitively, so `https://example.com/caf%c3%a9` matches `dirname: 'café'`
  
  fix: `BlogPostList` renders its empty message as a paragraph instead of text inside the `<ol>`
  
  New exports: `find_blog_post_dir` (`blog_post_dir.ts`), `load_fuz_blog_import_path` and `load_blog_posts` (`blog_helpers.ts`), `resolve_blog_post_pathname` (`blog_post_pathname.ts`), and the `FeedUrl` type (`feed.ts`).
- fix: `format_date` renders the UTC calendar date (via `Intl.DateTimeFormat`, same `Jul 10, 2024` format), so a post near midnight UTC no longer shows a different day depending on the build machine's timezone; `BlogPostList` orders posts newest first by `date_published` like the Atom feed instead of by reversed id, through the new `compare_feed_items` / `sort_feed_items`; Atom entries get a deterministic tie-break; the feed `<updated>` takes the latest of each item's `date_modified` and `date_published`; the template sets `blog_feed_context` in `src/routes/blog/+layout.svelte` instead of the root layout; drop the `date-fns` dependency ([a6ab2f8](https://github.com/fuzdev/fuz_blog/commit/a6ab2f8))

### Patch Changes

- fix: docs and the `post` task's error name the `gro task src/lib/post.task.ts` form gro 0.224 requires ([d7c62a1](https://github.com/fuzdev/fuz_blog/commit/d7c62a1))

## 0.37.0

### Minor Changes

- Update dependencies (BREAKING CHANGES) ([9d19986](https://github.com/fuzdev/fuz_blog/commit/9d19986))

  Breaking dependency changes:

  - @fuzdev/fuz_util: 0.78.0 → 0.79.0 (minor)
  - @fuzdev/fuz_css: 0.71.1 → 0.72.0 (minor)
  - @fuzdev/gro: 0.222.0 → 0.223.0 (minor)
  - @fuzdev/fuz_ui: 0.220.0 → 0.221.0 (minor)

- chore: upgrade fuz_css 0.71.1, fuz_ui 0.220.0, fuz_util 0.78.0 and gro 0.222.0 ([687aa87](https://github.com/fuzdev/fuz_blog/commit/687aa87))

## 0.36.0

### Minor Changes

- deps: bump fuz_ui 0.218.0 ([1d1411f](https://github.com/fuzdev/fuz_blog/commit/1d1411f))
- break: remove Mastodon comments: `BlogPostComments.svelte`, the `comments` post metadata field, `BlogComments` and `MastodonBlogComments`, and the optional `@fuzdev/fuz_mastodon` peer dep are gone; the `BlogPost` `comments` snippet stays for rendering your own ([832b2e9](https://github.com/fuzdev/fuz_blog/commit/832b2e9))

## 0.35.0

### Minor Changes

- **breaking** chore: peer '@fuzdev/fuz_schema' `^0.5.0`, which caps a parse at a hundred issues (a `SchemaError` lists the first ten and `and N more`), labels every issue beneath a `message`, and refuses a `pipe` action narrower than the step before it ([08e0505](https://github.com/fuzdev/fuz_blog/commit/08e0505))
- chore: upgrade deps ([3e1f730](https://github.com/fuzdev/fuz_blog/commit/3e1f730))

## 0.34.0

### Minor Changes

- **breaking** feat: the blog and feed schemas are `@fuzdev/fuz_schema` schemas instead of Zod's, and `zod` is no longer a peer dep ([f65b7f5](https://github.com/fuzdev/fuz_blog/commit/f65b7f5))

  - `Feed`, `FeedItem`, `BlogFeedMetadata`, `BlogFeed`, `BlogFeedItem`, and `BlogPostMetadata` are fuz_schema schemas with no `.parse`, `.safeParse`, `.shape`, `.omit`, or `.extend`: call `s.parse(BlogFeed, value)` for `{ok: true, value}` or `{ok: false, issues}` in place of `.safeParse`, and `s.parse_or_throw` (throwing `SchemaError`) in place of `.parse`; compose from an object schema's entries, its `def`; the inferred types are unchanged
  - raise `@fuzdev/fuz_schema` to `^0.4.0` , `@fuzdev/fuz_util` to `>=0.76.0`, and `@fuzdev/gro` to `>=0.219.0`, the new peer floors; a site that imports Zod only for fuz_blog can drop it
  - `feed.ts` exports `FeedDatetime` (unbranded, and unrelated to fuz_app's Zod `Datetime`), the schema of `date_published` and `date_modified`: a UTC ISO datetime like `2024-07-15T00:00:00.000Z`, as Zod 4.6's `z.iso.datetime()` accepts it, so a time without seconds such as `2024-07-15T00:00Z`, which Zod before 4.6 accepted, now fails
  - url fields are `FeedUrl`, exported from `feed.ts`: fuz_util's `Url`, which checks the text with `URL.canParse` and keeps it as written, refusing surrounding whitespace, so a url Zod trimmed, such as `' https://example.com'`, now fails rather than reach the generated feed
  - `gro gen` reports invalid post metadata and an invalid generated feed with fuz_schema's `format_issue` text, one issue per line, like `date_modified: expected an ISO datetime, received string`, instead of Zod's `prettifyError`
  - the generated `feed.ts` keeps the key order of the `BlogConfig` `feed` where Zod rewrote it in schema order, so re-run `gro gen` after upgrading

## 0.33.1

### Patch Changes

- fix: `BlogPostId` imports `Flavored` from `@fuzdev/fuz_schema/schema.ts`, so it keeps its type with fuz_util `0.74.0`, which no longer re-exports it from `types.ts` ([62f4928](https://github.com/fuzdev/fuz_blog/commit/62f4928))

## 0.33.0

### Minor Changes

- **breaking** fix: `BlogPostList` no longer doubles a non-empty `paths.base` - `BlogFeedItem.pathname` is now the base-free app route (`/<dirname>/<slug-or-id>`), and `resolve_blog_feed_item` takes the blog's `dirname` as its second argument; re-run `gro gen` to regenerate feeds ([08bb4e1](https://github.com/fuzdev/fuz_blog/commit/08bb4e1))
- **breaking** feat: the `post` and `update_post` task `Args` are `@fuzdev/fuz_schema` schemas instead of Zod's, for Gro `0.217.0` ([5a681dc](https://github.com/fuzdev/fuz_blog/commit/5a681dc))

  - install `@fuzdev/fuz_schema` `^0.2.0`, a new peer dep, and raise `@fuzdev/gro` to `>=0.217.0` and `@fuzdev/fuz_util` to `>=0.73.0`, the new peer floors
  - a site that re-exports `task` and `Args` from `@fuzdev/fuz_blog/post.task.ts` or `update_post.task.ts` needs no source change; a task that wraps or extends one of these `Args` rewrites it with fuz_schema, see Gro's `0.217.0` changelog
  - the `Args` type is unchanged; an invalid arg's error is fuz_schema's `format_issue` text, like `blog: expected string, received boolean`, instead of Zod's
  - the `zod` peer stays, for the blog and feed schemas

## 0.32.0

### Minor Changes

- chore: bump the `@fuzdev/fuz_css` peer to `>=0.65.0` and the `@fuzdev/fuz_ui` peer to `>=0.210.0` ([df375ca](https://github.com/fuzdev/fuz_blog/commit/df375ca))
- **breaking** feat: support SvelteKit 3 (`@sveltejs/kit` peer `^3`, `@fuzdev/gro` peer `>=0.214.0`, the first Gro that supports SvelteKit 3) ([942a881](https://github.com/fuzdev/fuz_blog/commit/942a881))

## 0.31.0

### Minor Changes

- break: Zod-validated feed, `pathname` on feed items, and clearer type names ([d76d843](https://github.com/fuzdev/fuz_blog/commit/d76d843))

  - rename `BlogPostData` → `BlogPostMetadata` and `BlogPostItem` → `BlogFeedItem`
    (the latter parallels `Feed`/`FeedItem` and `BlogFeed`); update imports and any
    `satisfies BlogPostData` in your post modules
  - rename `BlogFeedData` → `BlogFeedMetadata` (the consumer-supplied feed config,
    parallel to the author-supplied `BlogPostMetadata`); update `BlogConfig.feed`
    types and imports
  - rename `resolve_blog_post_item()` → `resolve_blog_feed_item()` to match its
    `BlogFeedItem` return type and pair with `resolve_blog_config()`
  - the blog shapes are now Zod schemas as the source of truth: `BlogPostMetadata`
    is a loose object so consumer post fields pass through, while the generated
    `BlogFeed`/`BlogFeedItem` are strict — `gro gen` now fails if a post is
    malformed or an extra field would leak into the typed feed
  - `BlogFeedItem` gains a `pathname` field (the app-relative post path, e.g.
    `/blog/my-post`) computed during `gro gen`; `BlogPostList` links via it instead
    of re-deriving the path from `url` at render time
  - `BlogFeedItem.blog_post_id` is now typed `number` (was the `BlogPostId` flavor)
  - `Feed`/`FeedItem` in `feed.ts` are now Zod schemas too, with the string fields
    validated to their semantic types: URLs (`home_page_url`, `icon`, `favicon`,
    `url`, `atom.feed_url`, `author.url`) use `z.url()`, `author.email` uses
    `z.email()`, and post `date_published`/`date_modified` use `z.iso.datetime()`.
    A malformed date or URL in a post or feed config now fails `gro gen`
  - `create_atom_feed` now XML-escapes all interpolated values, so titles,
    summaries, and URLs containing `&`, `<`, `>`, or `"` (e.g. a link with a query
    string) produce valid Atom instead of malformed XML
  - regenerate after upgrading: re-run `gro gen` to rebuild `feed.ts` and `feed.xml`

- feat: reusable `update_blog_post` helper ([f5424dc](https://github.com/fuzdev/fuz_blog/commit/f5424dc))
  - new `update_blog_post` helper in `blog_helpers.ts` carries the `gro update_post`
    body (resolve the post path, rewrite `date_modified`, write), mirroring
    `create_blog_post`; `update_post.task.ts` is now a thin wrapper over it, so a
    consumer can call it from its own task
  - the `date_modified` rewrite now matches `'[^']*'` instead of a greedy `'.*'`

## 0.30.1

### Patch Changes

- fix: keep `resolve_blog_post_item` to the `BlogPostItem` contract ([22d1250](https://github.com/fuzdev/fuz_blog/commit/22d1250))

  0.30.0 spread the whole `post` into the feed item, which leaked a consumer's
  extra post metadata (e.g. an autoblog's `model`) into the generated, typed
  `feed.ts` and failed its `BlogFeed` type-check. The item now emits only
  `BlogPostItem` fields; extra metadata stays on the page's `post` for its
  component to render.

## 0.30.0

### Minor Changes

- break: prop-driven listing, reusable post scaffolding, and pure blog helpers ([0bd539c](https://github.com/fuzdev/fuz_blog/commit/0bd539c))
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

## 0.29.0

### Minor Changes

- break: multi-blog support, a comments snippet, and task fixes ([#22](https://github.com/fuzdev/fuz_blog/pull/22))
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
  - `BlogPost.svelte` no longer renders comments itself, and its `separator`
    prop is gone — pass the new `comments` snippet instead
  - removed the now-unused `to_pathname` helper from `util.ts` — the blog listing
    derives each post's route path from `item.url` directly

## 0.28.1

### Patch Changes

- chore: change to `.ts` imported extensions ([401f2dc](https://github.com/fuzdev/fuz_blog/commit/401f2dc))

## 0.28.0

### Minor Changes

- chore: bump fuz_ui peer dep ([6d39ca9](https://github.com/fuzdev/fuz_blog/commit/6d39ca9))

## 0.27.0

### Minor Changes

- deps: upgrade `@fuzdev/fuz_ui@0.203.0` ([c3ee545](https://github.com/fuzdev/fuz_blog/commit/c3ee545))

## 0.26.0

### Minor Changes

- chore: fix peer deps ([3aa0fd1](https://github.com/fuzdev/fuz_blog/commit/3aa0fd1))
- chore: upgrade peer deps ([a19d202](https://github.com/fuzdev/fuz_blog/commit/a19d202))

## 0.25.0

### Minor Changes

- bump node@24.14 ([4547e46](https://github.com/fuzdev/fuz_blog/commit/4547e46))
- chore: update styling patterns ([cdafaae](https://github.com/fuzdev/fuz_blog/commit/cdafaae))
- chore: upgrade peer deps ([a628143](https://github.com/fuzdev/fuz_blog/commit/a628143))

## 0.24.1

### Patch Changes

- fix gro peer dep ([852378d](https://github.com/fuzdev/fuz_blog/commit/852378d))

## 0.24.0

### Minor Changes

- migrate to @fuzdev/gro from @ryanatkn/gro and upgrade peer deps ([db012a4](https://github.com/fuzdev/fuz_blog/commit/db012a4))

## 0.23.0

### Minor Changes

- migrate to PascalCase for BlogPostN ([73270d6](https://github.com/fuzdev/fuz_blog/commit/73270d6))

## 0.22.0

### Minor Changes

- upgrade deps ([#15](https://github.com/fuzdev/fuz_blog/pull/15))

## 0.21.0

### Minor Changes

- upgrade gro ([26ae56a](https://github.com/fuzdev/fuz_blog/commit/26ae56a))

## 0.20.0

### Minor Changes

- move to fuzdev ([c06ccef](https://github.com/fuzdev/fuz_blog/commit/c06ccef))

## 0.19.0

### Minor Changes

- upgrade deps ([457ce96](https://github.com/ryanatkn/fuz_blog/commit/457ce96))

## 0.18.0

### Minor Changes

- rename `PascalCase` from `Upper_Snake_Case` (lol) ([ecb0187](https://github.com/ryanatkn/fuz_blog/commit/ecb0187))
- upgrade peer deps ([ecb0187](https://github.com/ryanatkn/fuz_blog/commit/ecb0187))

## 0.17.0

### Minor Changes

- upgrade peer deps ([#12](https://github.com/ryanatkn/fuz_blog/pull/12))

## 0.16.0

### Minor Changes

- update peer deps ([f5a6ec3](https://github.com/ryanatkn/fuz_blog/commit/f5a6ec3))
- upgrade deps ([#11](https://github.com/ryanatkn/fuz_blog/pull/11))

## 0.15.0

### Minor Changes

- upgrade @ryanatkn/moss@0.36 ([6d3d94c](https://github.com/ryanatkn/fuz_blog/commit/6d3d94c))

## 0.14.0

### Minor Changes

- bump node@22.15 from 22.11 ([d67ccec](https://github.com/ryanatkn/fuz_blog/commit/d67ccec))

## 0.13.0

### Minor Changes

- upgrade deps ([cace7c5](https://github.com/ryanatkn/fuz_blog/commit/cace7c5))

## 0.12.0

### Minor Changes

- bump node@22.11 ([#8](https://github.com/ryanatkn/fuz_blog/pull/8))

## 0.11.0

### Minor Changes

- upgrade peer dep to Svelte 5 ([9a045cd](https://github.com/ryanatkn/fuz_blog/commit/9a045cd))

## 0.10.0

### Minor Changes

- update to use `create_context` helper ([4269430](https://github.com/ryanatkn/fuz_blog/commit/4269430))

## 0.9.0

### Minor Changes

- upgrade date-fns ([2795bc9](https://github.com/ryanatkn/fuz_blog/commit/2795bc9))

## 0.8.0

### Minor Changes

- bump required node version to `20.17` ([48b4dce](https://github.com/ryanatkn/fuz_blog/commit/48b4dce))

## 0.7.0

### Minor Changes

- loosen peer deps temporarily ([367a921](https://github.com/ryanatkn/fuz_blog/commit/367a921))

## 0.6.0

### Minor Changes

- upgrade deps ([e06cb14](https://github.com/ryanatkn/fuz_blog/commit/e06cb14))
  - `@ryanatkn/fuz@0.116.0` from `0.115.0`
  - `@ryanatkn/moss@0.9.0` from `0.8.0`

## 0.5.1

### Patch Changes

- upgrade peer deps ([161bca7](https://github.com/ryanatkn/fuz_blog/commit/161bca7))

## 0.5.0

### Minor Changes

- pin peer deps ([#6](https://github.com/ryanatkn/fuz_blog/pull/6))

## 0.4.1

### Patch Changes

- add optional separator snippet to `BlogPost` ([effd757](https://github.com/ryanatkn/fuz_blog/commit/effd757))

## 0.4.0

### Minor Changes

- add automatic comments ([#5](https://github.com/ryanatkn/fuz_blog/pull/5))

## 0.3.0

### Minor Changes

- add `gro post` title support ([#4](https://github.com/ryanatkn/fuz_blog/pull/4), [067f9b0](https://github.com/ryanatkn/fuz_blog/commit/067f9b007900a57487d02f43b96231f2ae039ddb))
- update blog post footer ([#4](https://github.com/ryanatkn/fuz_blog/pull/4))
  - unpublish `BlogPostFooter`
  - add `footer` snippet prop to `BlogPost`

### Patch Changes

- add `gro update_post` task ([#4](https://github.com/ryanatkn/fuz_blog/pull/4))

## 0.2.0

### Minor Changes

- add gro peer dep ([8800dc6](https://github.com/ryanatkn/fuz_blog/commit/8800dc6))

## 0.1.5

### Patch Changes

- fix blog post page title ([03d38a2](https://github.com/ryanatkn/fuz_blog/commit/03d38a2))

## 0.1.4

### Patch Changes

- fix import to package not local in feed generation ([3ec86cf](https://github.com/ryanatkn/fuz_blog/commit/3ec86cf))

## 0.1.3

### Patch Changes

- fix import to blog.ts not .js ([f4be22d](https://github.com/ryanatkn/fuz_blog/commit/f4be22d))

## 0.1.2

### Patch Changes

- fix path import in blog helpers ([595b886](https://github.com/ryanatkn/fuz_blog/commit/595b886))

## 0.1.1

### Patch Changes

- fix prop type generation by adding peerDependencies ([003f894](https://github.com/ryanatkn/fuz_blog/commit/003f894))

## 0.1.0

### Minor Changes

- init ([#1](https://github.com/ryanatkn/fuz_blog/pull/1))
