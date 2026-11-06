<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	import BlogPostHeader from './BlogPostHeader.svelte';
	import type { BlogPostMetadata, BlogFeedItem } from './blog.ts';
	import { blog_feed_context } from './blog_feed_context.ts';

	const {
		post,
		item,
		attrs,
		meta,
		footer,
		comments,
		children
	}: {
		/**
		 * The author-defined metadata the post exports from its `<script module>`,
		 * including any fields a consumer adds beyond `BlogPostMetadata`,
		 * like an autoblog's `model`. Sets the page title.
		 */
		post: BlogPostMetadata;
		/**
		 * The resolved feed item. Defaults to the `blog_feed_context` item whose
		 * `pathname` is the current route; pass it explicitly to skip the context,
		 * e.g. when rendering a post outside its own route.
		 */
		item?: BlogFeedItem;
		attrs?: SvelteHTMLElements['article'] | undefined;
		/**
		 * Renders after `BlogPostHeader`, e.g. for post provenance from `post`'s extra fields.
		 */
		meta?: Snippet<[item: BlogFeedItem, post: BlogPostMetadata]>;
		footer?: Snippet;
		/**
		 * Renders after `footer`, for a post's comments.
		 */
		comments?: Snippet<[item: BlogFeedItem, post: BlogPostMetadata]>;
		children: Snippet;
	} = $props();

	const feed = blog_feed_context.get_maybe();

	// two roles: `post` is the author's metadata as written, extras included, while the item
	// is the strict feed entry `gro gen` derived from it, adding the id, slug, and URLs
	// post routes are static, so the route id is the item's `pathname`
	const resolved_item = $derived(item ?? feed?.items.find((i) => i.pathname === page.route.id));
</script>

<svelte:head>
	<!-- TODO title suffix like - ryanatkn.com/blog -->
	<title>{post.title}</title>
	<!-- only on the post's own route, not when an explicit `item` renders it elsewhere -->
	{#if resolved_item && resolved_item.pathname === page.route.id}
		<link rel="canonical" href={resolved_item.url} />
	{/if}
</svelte:head>

<div class="blog_post width_atmost_md">
	{#if resolved_item}
		<article {...attrs}>
			<BlogPostHeader item={resolved_item} />
			{@render meta?.(resolved_item, post)}
			{@render children()}
			{@render footer?.()}
			{@render comments?.(resolved_item, post)}
		</article>
	{:else}
		<div>cannot find post <code>{page.route.id}</code></div>
	{/if}
</div>
