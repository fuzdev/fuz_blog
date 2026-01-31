# fuz_blog

> Blog template with feed generation and Mastodon comments

fuz_blog (`@fuzdev/fuz_blog`) is a SvelteKit blog template and reusable library
for adding blogs to projects. It provides Atom feed generation and Mastodon
comments integration.

For coding conventions, see [`fuz-stack`](../fuz-stack/CLAUDE.md).

## Gro commands

```bash
gro check        # typecheck, test, lint, format check (run before committing)
gro test         # run tests with vitest
gro gen          # regenerate .gen files (feed.xml, slug routes, feed.ts)
gro build        # build for production
gro post "Title" # scaffold a new blog post
gro update_post  # update date_modified on existing post
```

IMPORTANT for AI agents: Do NOT run `gro dev` - the developer will manage the
dev server.

## Key dependencies

- Svelte 5 - component framework
- SvelteKit - application framework
- date-fns - date formatting
- fuz_css (@fuzdev/fuz_css) - CSS framework
- fuz_ui (@fuzdev/fuz_ui) - UI components, docs system
- fuz_mastodon (@fuzdev/fuz_mastodon) - Mastodon embedding for comments

## Architecture

### Directory structure

```
src/
├── lib/                    # exportable library code
│   ├── blog.ts             # BlogPostData, BlogFeed types, blog_feed_context
│   ├── blog_helpers.ts     # resolve_blog_post_item, collect_blog_post_ids
│   ├── blog.gen.ts         # generates feed.xml, feed.ts, slug routes
│   ├── feed.ts             # Feed, FeedItem types, create_atom_feed
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

**BlogPostData**: Author-defined metadata exported from each post's `<script module>`:

```typescript
export const post: BlogPostData = {
  title: 'Hello fuz_blog',
  slug: 'hello-fuz-blog',
  date_published: '2024-07-10T16:04:49.688Z',
  date_modified: '2024-07-15T18:27:36.477Z',
  summary: 'fuz_blog is now a reusable library',
  tags: ['blog software', 'sveltekit'],
  comments: {url: 'https://fosstodon.org/@ryanatkn/...', type: 'mastodon'},
};
```

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

- `blog.ts` - `BlogPostData`, `BlogPostItem`, `BlogFeed`, `BlogComments`,
  `blog_feed_context`
- `feed.ts` - `Feed`, `FeedItem` interfaces (JSON Feed 1.1 compatible),
  `create_atom_feed()`
- `blog_helpers.ts` - `resolve_blog_post_item()`, `collect_blog_post_ids()`,
  `load_blog_post_modules()`

components:

- `BlogPost.svelte` - main wrapper with header, content, and Mastodon comments
- `BlogPostHeader.svelte` - title and metadata display
- `FeedItemDate.svelte` - formatted date with "updated" indicator
- `HashLink.svelte` - section anchor with hover-visible link icon

tasks:

- `post.task.ts` - `gro post "Title"` scaffolds new posts with sequential ID
- `update_post.task.ts` - `gro update_post [id]` updates `date_modified`

### Context system

Uses the standardized context pattern from fuz_ui:

- `blog_feed_context` - provides `BlogFeed` data throughout the app
- `mastodon_cache_context` - (from fuz_mastodon) optional dev cache for comments

Set in layout, consumed by components:

```svelte
<script>
  import {blog_feed_context} from '@fuzdev/fuz_blog/blog.js';
  import {feed} from './blog/feed.js';

  blog_feed_context.set(feed);
</script>
```

## Creating a blog post

Run the task:

```bash
gro post "My Post Title"
```

This creates `/src/routes/blog/[next_id]/+page.svelte` with scaffolded metadata
and runs `gro gen` to update feed and routes.

## Using as a library

Install and import components for your own blog:

```svelte
<script>
  import BlogPost from '@fuzdev/fuz_blog/BlogPost.svelte';
  import {post} from './+page.svelte';
</script>

<BlogPost {post}>
  <!-- your content -->
</BlogPost>
```

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
