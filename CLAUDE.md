# fuz_blog

> Blog template with feed generation

fuz_blog (`@fuzdev/fuz_blog`) is a SvelteKit blog template and reusable library
for adding blogs to projects. It provides Atom feed generation.

For coding conventions, see Skill(fuz-stack).

## Gro commands

```bash
gro check        # typecheck, test, lint, format check (run before committing)
gro typecheck    # typecheck only
gro test         # run tests with vitest
gro gen          # regenerate .gen files (feed.xml, feed.ts, redirect route)
gro build        # build for production
gro task src/lib/post.task.ts "Title" # scaffold a new blog post
gro task src/lib/update_post.task.ts  # update date_modified on existing post
```

### Task arguments

Both tasks support additional flags:

```bash
gro task src/lib/post.task.ts "Title" --date 2024-07-10T16:04:49.688Z  # custom date
gro task src/lib/post.task.ts "Title" --blog autoblog                  # target a specific registered blog
gro task src/lib/post.task.ts "Title" --slug custom-slug               # override the slug derived from the title
gro task src/lib/update_post.task.ts 1 --date 2024-07-10T16:04:49.688Z # update specific post
gro task src/lib/update_post.task.ts 1 --blog autoblog                 # update in a specific blog
```

Arguments use `@fuzdev/fuz_schema` schemas for validation, as do the blog and
feed schemas. The tasks auto-detect whether they're running in the fuz_blog
library itself or in a consuming project, adjusting import paths accordingly.

Blogs are declared in the consumer's `src/routes/blogs.ts`, which exports
`blogs: Array<BlogConfig>` — one entry per blog with a route `dirname`, feed
metadata (`BlogFeedMetadata`), and an optional `scaffold` function customizing what
`gro task src/lib/post.task.ts` generates for that blog. `--blog` defaults to
the first registered entry. The feed's `home_page_url` is the blog's index
page: its pathname must end with `/<dirname>`, after any deploy base path
(`https://user.github.io/repo/blog` for `dirname: 'blog'`), because post URLs
derive from it while the posts are routes under `src/routes/<dirname>`. The
feed's own URL is derived too, `<home_page_url>/feed.xml` via
`to_blog_feed_url()`, matching where gen writes `static/<dirname>/feed.xml` —
it is not configured.

Each blog generates its own `src/routes/<dirname>/feed.ts` and, once it has
posts, `src/routes/<dirname>/[post=blog_post_id]/+page.ts`. That route's
`blog_post_id` matcher must be registered in the app's `src/params.ts` (SvelteKit's
default `files.params` location; one file for all blogs, and SvelteKit fails
the build naming the matcher when it's missing), added to the existing
`defineParams` call if the app already has one:

```ts
import {defineParams} from '@sveltejs/kit/params';
import {blog_post_id_param} from '@fuzdev/fuz_blog/blog_post_id.ts';

export const params = defineParams({blog_post_id: blog_post_id_param});
```

Components read the
active feed from `blog_feed_context`, so with more than one blog set each blog's
feed in its own subtree — e.g. a `src/routes/<dirname>/+layout.svelte` calling
`blog_feed_context.set(feed)` — rather than a single root layout for all of them.

Comments are opt-in: `BlogPost.svelte` takes a `comments` snippet that renders
after `footer`; fuz_blog ships no comment provider.

Wiring in a consumer: gro discovers `*.gen.ts` only in the local project and
runs a project task only by its path, so a consuming project keeps thin local
files that reuse fuz_blog's logic — `src/lib/blog.gen.ts` can be
`export {gen} from '@fuzdev/fuz_blog/blog.gen.ts'`, and `src/lib/post.task.ts`
can re-export or wrap fuz_blog's task
(`export * from '@fuzdev/fuz_blog/post.task.ts'`), run as
`gro task src/lib/post.task.ts`. To scaffold a custom post shape with
extra flags (e.g. a `--model` field), write a small task that parses its own
`Args` and calls `create_blog_post` with its own `scaffold` closure.

## Key dependencies

- Svelte 5 - component framework
- SvelteKit - application framework
- fuz_schema (@fuzdev/fuz_schema) - blog, feed, and task args schemas
- fuz_css (@fuzdev/fuz_css) - semantic-first CSS framework and design system
- fuz_ui (@fuzdev/fuz_ui) - UI components, docs system

## Scope

fuz_blog is a **blog template and library**:

- Blog post types and feed generation
- Atom/RSS feed publishing
- Reusable Svelte components for other blog projects

### What fuz_blog does NOT include

- CMS or admin interface
- Database storage
- Dynamic content (static generation only)
- Authentication

## Architecture

### Directory structure

```
src/
├── lib/                    # exportable library code
│   ├── blog.ts             # types, blog_feed_context, post dirname parsing, resolve_blog_feed_item
│   ├── blog_helpers.ts     # node build helpers: load_blogs_module, collect_blog_post_dirs, create_blog_post
│   ├── blog_post_id.ts     # post id grammar + the blog_post_id param matcher
│   ├── blog_post_redirect.ts # entries + load for the generated redirect route
│   ├── blog.gen.ts         # generates feed.xml, feed.ts, redirect route
│   ├── feed.ts             # Feed, FeedItem types, create_atom_feed
│   ├── util.ts             # format_date helper
│   ├── BlogPost.svelte     # main post wrapper component
│   ├── BlogPostList.svelte # prop-driven post listing (takes a `feed`)
│   ├── BlogPostHeader.svelte
│   ├── FeedItemDate.svelte # date formatting component
│   ├── HashLink.svelte     # anchor link with hover icon
│   ├── post.task.ts        # post scaffolding task
│   └── update_post.task.ts # date_modified update task
├── test/                   # test files (not co-located)
└── routes/
    ├── blogs.ts            # blogs registry (Array<BlogConfig>)
    ├── blog/
    │   ├── feed.ts         # generated BlogFeed object
    │   ├── +layout.svelte  # sets blog_feed_context for this blog's subtree
    │   ├── +page.svelte    # blog listing page (uses BlogPostList)
    │   ├── 1-hello-fuz-blog/ # a post, one `<id>-<slug>` directory each
    │   └── [post=blog_post_id]/+page.ts # generated redirect from `/blog/<id>` to the post
    └── docs/               # documentation pages
```

### Core concepts

**`<id>-<slug>` post directories**: Each post is a real route at
`src/routes/<dirname>/<id>-<slug>/+page.svelte` (e.g. `blog/1-hello-fuz-blog/`),
so its canonical URL is its directory and the author keeps full control of the
route (its own `+page.ts`, colocated assets). The id is a positive integer
without leading zeros, and the slug is lowercase ASCII letters and digits in
hyphen-separated runs; the slug comes only from the directory name. Any blog
subdirectory starting with a digit must match `<id>-<slug>` or `gro gen` fails
(so a bare `1/` fails); other subdirectories are ignored. Ids may
have gaps and must be unique; new posts take the highest id plus one.

**Redirect route**: for a blog with posts, `gro gen` writes
`<dirname>/[post=blog_post_id]/+page.ts`, whose `entries` list every post's bare
id and whose `load` redirects `/blog/1` to `/blog/1-hello-fuz-blog` (308, a
meta-refresh page when prerendered) and 404s an unknown id. The `blog_post_id`
matcher (`blog_post_id_param`) admits only bare ids, so client-side navigation
to other paths under the blog, like static files, never reaches the route. A
blog without posts gets no redirect route, since prerendering rejects a dynamic
route with no entries; gen can't delete files, so it fails asking you to delete a
leftover one. The logic lives in `blog_post_redirect.ts` so the generated file
stays tiny.

**BlogPostId**: Uses `Flavored<number, 'BlogPostId'>` for type-safe post IDs
that remain compatible with plain numbers.

**BlogPostMetadata**: Author-defined metadata exported from each post's
`<script module>`. Fields: `title`, `date_published`, `date_modified`,
`summary`, `tags?`. A fuz_schema `loose_object`, so a consumer can
add its own fields (they stay on the page's `post` and never reach the feed).

**BlogFeedItem**: The strict feed entry, with computed fields (`id`, `url`,
`pathname`, `blog_post_id`, `slug`) derived during `gro gen`. `id` is
`<home_page_url>/<id>` (stable across slug changes, resolving via the redirect),
`url` is `<home_page_url>/<id>-<slug>`, and `pathname` is `/<dirname>/<id>-<slug>`.

**BlogFeedMetadata**: The configured feed fields — `Feed` without `items` (from
the posts) and `atom` (derived).

**BlogFeed**: Complete feed structure extending `Feed`: the metadata, the
derived `atom.feed_url`, and the items, provided via `blog_feed_context`.
Validated at gen time (a strict `object`), so a malformed post or a leaked field
fails `gro gen`.

### Code generation flow

`blog.gen.ts` runs during `gro gen`:

1. Loads the blogs registry with `load_blogs_module()`, which validates it with
   `validate_blog_configs()` (the post tasks share this, so nothing touches a
   post file first) — well-formed, unique `dirname`s, a strict
   `BlogFeedMetadata`, and a `home_page_url` without query or fragment whose
   pathname ends with `/<dirname>`
2. Scans `/src/routes/blog/` for `<id>-<slug>` post directories, sorted by id,
   and validates each post's `BlogPostMetadata` from module exports, with
   `date_modified` no earlier than `date_published`
3. Generates three outputs:
   - `/static/blog/feed.xml` - Atom feed for RSS readers
   - `/src/routes/blog/feed.ts` - serialized BlogFeed object for runtime
   - `/src/routes/blog/[post=blog_post_id]/+page.ts` - redirects bare post ids
     to their posts, only when the blog has posts

The pure part, from loaded posts to outputs, is `create_blog_gen_outputs()` in
`blog_helpers.ts`.

### Key library files

types and data:

- `blog.ts` - `BlogPostMetadata`, `BlogFeedItem`, `BlogPostId`, `BlogPostDir`,
  `BlogFeedMetadata`, `BlogFeed`, `BlogConfig`, `blog_feed_context`, and the pure
  `to_blog_feed_url()` / `validate_blog_configs()` / `parse_blog_post_dirname()` /
  `resolve_blog_post_dirs()` / `resolve_blog_config()` / `resolve_blog_feed_item()`
- `blog_post_id.ts` - `BLOG_POST_ID_SOURCE`, `is_blog_post_id_param()`, and the
  `blog_post_id_param` matcher, dependency-free since SvelteKit loads matchers
  eagerly on the client
- `blog_post_redirect.ts` - `find_blog_feed_item_by_param()`,
  `to_blog_post_redirect_entries()`, and `blog_post_redirect()` for the
  generated redirect route (imports `$app/paths`, so SvelteKit-only)
- `feed.ts` - `Feed`, `FeedItem` fuz_schema schemas (JSON Feed 1.1 field
  names, not a conformant JSON Feed), `FeedDatetime` (a UTC ISO datetime
  string), `FeedUrl`, `compare_feed_items()` / `sort_feed_items()` (newest
  first by `date_published`, ties by `id` descending with numeric collation),
  `create_atom_feed()` (entries in that order; feed `<updated>` is the latest
  item date, or the Unix epoch for a feed with no items, keeping gen output
  deterministic)
- `blog_helpers.ts` - node build helpers: `load_blogs_module()`,
  `collect_blog_post_dirs()`, `load_blog_post_modules()`, `create_blog_post()`,
  `update_blog_post()`, `scaffold_blog_post()`, `to_blog_post_slug()`,
  `create_blog_gen_outputs()`, `to_blog_post_redirect_route_path()`,
  `BLOG_POST_REDIRECT_ROUTE_DIRNAME`
- `util.ts` - `format_date()`, the UTC calendar date like `Jul 10, 2024`, so
  prerendered dates don't depend on the build machine's timezone

components:

- `BlogPost.svelte` - main post wrapper (header, `meta`, content, `footer`,
  `comments`); finds its feed item by matching the current route id to an
  item's `pathname`, or takes an explicit `item` to render a post off its own
  route; emits a canonical link only on the post's own route
- `BlogPostList.svelte` - prop-driven post listing rendered from a `feed`,
  ordered like the Atom feed by `sort_feed_items`, numbered as a reversed `<ol>`
  (a chronological rank, not the post id), linking the feed at its `feed_url`
  pathname
- `BlogPostHeader.svelte` - title and metadata display
- `FeedItemDate.svelte` - formatted date with "updated" indicator
- `HashLink.svelte` - section anchor with hover-visible link icon

tasks:

- `post.task.ts` - `gro task src/lib/post.task.ts "Title"` scaffolds a new post
  at `<id>-<slug>/`, the slug from the title or `--slug`
- `update_post.task.ts` - `gro task src/lib/update_post.task.ts [id]` updates `date_modified`,
  failing unless exactly one `date_modified` value matches, or when the date is
  before the post's `date_published` (when the file has exactly one quoted value)

### Svelte 5 patterns

Components use Svelte 5 runes API with optional `Snippet` props (`meta`,
`footer`, `comments`) for customization. See `BlogPost.svelte` for the pattern.

### Context system

Uses the standardized context pattern from fuz_ui:

- `blog_feed_context` - provides a blog's `BlogFeed` to its subtree

Set `blog_feed_context` with the generated feed in the blog's own
`src/routes/<dirname>/+layout.svelte`, as the template does, or pass the
feed/item directly as props to `BlogPostList` / `BlogPost`. The template's root
`+layout.svelte` only links each registered blog's feed for autodiscovery,
deriving the URLs from `blogs.ts` with `to_blog_feed_url()`.

## Creating a blog post

Run the task:

```bash
gro task src/lib/post.task.ts "My Post Title"
```

This creates `/src/routes/blog/<next_id>-<slug>/+page.svelte` with scaffolded
metadata and runs `gro gen` to update the feed and the redirect route. To change
a post's slug, rename its directory and run `gro gen`; its id URL keeps working.

## Using as a library

Import `BlogPost.svelte` and wrap your content, passing the `post` prop from
your page's module exports.

## Development patterns

### Settings and theming

The app uses `ThemeRoot` wrapper from fuz_ui and provides a Settings dialog
accessible from the context menu for theme customization.

### SvelteKit configuration

- `prerender = true` - full static generation
- `ssr = true` - server-side rendering enabled
- Uses SvelteKit static adapter

## Known limitations

- **Hard-coded `src/routes/` path** - Route scanning assumes standard SvelteKit
  structure
- **Partial test coverage** - `src/test/` covers post directory parsing and
  discovery, the post-item/URL and blog-config logic, the redirect helper, post
  creation and updating, the schemas, feed ordering and Atom output, and UTC date
  formatting; the components and the task wrappers are untested

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API
- tsv (`gro format`) with tabs, 100 char width
- Node >= 24.14
- Tests in `src/test/` (not co-located)

## Related projects

- [`fuz_css`](../fuz_css/CLAUDE.md) - semantic-first CSS framework
- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components and docs system
