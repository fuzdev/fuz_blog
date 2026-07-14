# fuz_blog

> Blog template with feed generation and Mastodon comments

fuz_blog (`@fuzdev/fuz_blog`) is a SvelteKit blog template and reusable library
for adding blogs to projects. It provides Atom feed generation and Mastodon
comments integration.

For coding conventions, see Skill(fuz-stack).

## Committing

`git add` and `git commit` are denied by `.claude/settings.local.json` in
this repo — make the edits and stop, the user commits.

## Gro commands

```bash
gro check        # typecheck, test, lint, format check (run before committing)
gro typecheck    # typecheck only
gro test         # run tests with vitest
gro gen          # regenerate .gen files (feed.xml, slug routes, feed.ts)
gro build        # build for production
gro post "Title" # scaffold a new blog post
gro update_post  # update date_modified on existing post
```

IMPORTANT for AI agents: Do NOT run `gro dev` - the developer will manage the
dev server.

### Task arguments

Both `gro post` and `gro update_post` support additional flags:

```bash
gro post "Title" --date 2024-07-10T16:04:49.688Z  # custom date
gro post "Title" --blog autoblog                  # target a specific registered blog
gro update_post 1 --date 2024-07-10T16:04:49.688Z # update specific post
gro update_post 1 --blog autoblog                 # update in a specific blog
```

Arguments use Zod schemas for validation. The tasks auto-detect whether they're
running in the fuz_blog library itself or in a consuming project, adjusting
import paths accordingly.

Blogs are declared in the consumer's `src/routes/blogs.ts`, which exports
`blogs: Array<BlogConfig>` — one entry per blog with a route `dirname`, feed
metadata, optional `slug_routes: false` (integer-id post URLs, no generated
slug routes), and an optional `scaffold` function customizing what `gro post`
generates for that blog. `--blog` defaults to the first registered entry.

Each blog generates its own `src/routes/<dirname>/feed.ts`. Components read the
active feed from `blog_feed_context`, so with more than one blog set each blog's
feed in its own subtree — e.g. a `src/routes/<dirname>/+layout.svelte` calling
`blog_feed_context.set(feed)` — rather than a single root layout for all of them.

Comments are opt-in: `BlogPost.svelte` is mastodon-free and takes a `comments`
snippet; `BlogPostComments.svelte` carries the Mastodon rendering, and
importing it is what requires the optional `@fuzdev/fuz_mastodon` peer.

## Key dependencies

- Svelte 5 - component framework
- SvelteKit - application framework
- date-fns - date formatting
- fuz_css (@fuzdev/fuz_css) - CSS framework
- fuz_ui (@fuzdev/fuz_ui) - UI components, docs system
- fuz_mastodon (@fuzdev/fuz_mastodon) - Mastodon embedding for comments

## Scope

fuz_blog is a **blog template and library**:

- Blog post types and feed generation
- Atom/RSS feed publishing
- Mastodon comments integration
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
│   ├── blog.ts             # BlogPostData, BlogFeed types, blog_feed_context
│   ├── blog_helpers.ts     # resolve_blog_post_item, collect_blog_post_ids
│   ├── blog.gen.ts         # generates feed.xml, feed.ts, slug routes
│   ├── feed.ts             # Feed, FeedItem types, create_atom_feed
│   ├── util.ts             # format_date helper
│   ├── BlogPost.svelte     # main post wrapper component
│   ├── BlogPostHeader.svelte
│   ├── FeedItemDate.svelte # date formatting component
│   ├── HashLink.svelte     # anchor link with hover icon
│   ├── post.task.ts        # gro post task
│   └── update_post.task.ts # gro update_post task
├── test/                   # test files (not co-located)
└── routes/
    ├── blog/
    │   ├── blog.ts         # blog feed metadata (author, title, etc.)
    │   ├── feed.ts         # generated BlogFeed object
    │   ├── +page.svelte    # blog listing page
    │   ├── 1/+page.svelte  # numeric post routes
    │   └── [slug]/         # generated slug routes (redirect to numeric)
    └── docs/               # documentation pages
```

### Core concepts

**Numeric ID + Slug routing**: Posts are stored with numeric IDs
(`/blog/1/+page.svelte`) for stable paths. The gen system creates slug-based
routes (`/blog/hello-fuz-blog/`) that import from the numeric routes, enabling
human-readable URLs without path coupling.

**BlogPostId**: Uses `Flavored<number, 'BlogPostId'>` for type-safe post IDs
that remain compatible with plain numbers.

**BlogPostData**: Author-defined metadata exported from each post's
`<script module>`. Fields: `title`, `slug`, `date_published`, `date_modified`,
`summary`, `tags?`, `comments?`.

**BlogPostItem**: Extended version with computed fields (`id`, `url`,
`blog_post_id`) generated during `gro gen`.

**BlogFeed**: Complete feed structure inheriting from Feed interface, provided
via `blog_feed_context`.

### Code generation flow

`blog.gen.ts` runs during `gro gen`:

1. Scans `/src/routes/blog/` for sequential numeric directories (1, 2, 3...)
2. Loads each post's `BlogPostData` from module exports
3. Generates three outputs:
   - `/static/blog/feed.xml` - Atom feed for RSS readers
   - `/src/routes/blog/feed.ts` - serialized BlogFeed object for runtime
   - `/src/routes/blog/[slug]/+page.svelte` - slug route files that re-export
     from numeric

### Key library files

types and data:

- `blog.ts` - `BlogPostData`, `BlogPostItem`, `BlogPostId`, `BlogFeed`,
  `BlogComments`, `blog_feed_context`
- `feed.ts` - `Feed`, `FeedItem` interfaces (JSON Feed 1.1 compatible),
  `create_atom_feed()`
- `blog_helpers.ts` - `resolve_blog_post_item()`, `collect_blog_post_ids()`,
  `load_blog_post_modules()`
- `util.ts` - `format_date()` for consistent date formatting

components:

- `BlogPost.svelte` - main wrapper with header, content, and Mastodon comments
- `BlogPostHeader.svelte` - title and metadata display
- `FeedItemDate.svelte` - formatted date with "updated" indicator
- `HashLink.svelte` - section anchor with hover-visible link icon

tasks:

- `post.task.ts` - `gro post "Title"` scaffolds new posts with sequential ID
- `update_post.task.ts` - `gro update_post [id]` updates `date_modified`

### Svelte 5 patterns

Components use Svelte 5 runes API with optional `Snippet` props (`footer`,
`separator`) for customization. See `BlogPost.svelte` for the pattern.

### Context system

Uses the standardized context pattern from fuz_ui:

- `blog_feed_context` - provides `BlogFeed` data throughout the app
- `mastodon_cache_context` - (from fuz_mastodon) optional dev cache for comments

Set `blog_feed_context` in your root layout with the generated feed.

## Creating a blog post

Run the task:

```bash
gro post "My Post Title"
```

This creates `/src/routes/blog/[next_id]/+page.svelte` with scaffolded metadata
and runs `gro gen` to update feed and routes.

## Using as a library

Import `BlogPost.svelte` and wrap your content, passing the `post` prop from
your page's module exports.

## Development patterns

### Mastodon dev cache

For offline development with Mastodon comments, use the dev cache:

1. Set `mastodon_cache_context` in your layout with cache data
2. Capture live data by logging API responses during online development
3. Store in `mastodon_dev_cache_data.ts` for consistent offline testing

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
- **Partial test coverage** - `src/test/blog_helpers.test.ts` covers the
  post-item/URL and blog-config logic; most components and tasks are untested

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API
- Prettier with tabs, 100 char width
- Node >= 22.15
- Tests in `src/test/` (not co-located)

## Related projects

- [`fuz_css`](../fuz_css/CLAUDE.md) - CSS framework
- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components and docs system
- [`fuz_mastodon`](../fuz_mastodon/CLAUDE.md) - Mastodon embedding
