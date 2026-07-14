# @fuzdev/fuz_blog

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

- break: multi-blog support, mastodon decoupling, and task fixes ([#22](https://github.com/fuzdev/fuz_blog/pull/22))
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

- cache Mastodon data in dev ([#7](https://github.com/ryanatkn/fuz_blog/pull/7)) ([713d598](https://github.com/ryanatkn/fuz_blog/commit/713d598))
- loosen peer deps temporarily ([367a921](https://github.com/ryanatkn/fuz_blog/commit/367a921))

## 0.6.0

### Minor Changes

- upgrade deps ([e06cb14](https://github.com/ryanatkn/fuz_blog/commit/e06cb14))
  - `@ryanatkn/fuz@0.116.0` from `0.115.0`
  - `@ryanatkn/fuz_mastodon@0.21.0` from `0.20.0`
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

- add automatic Mastodon comments ([#5](https://github.com/ryanatkn/fuz_blog/pull/5))

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
