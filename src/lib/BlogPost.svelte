<script lang="ts">
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';

	import BlogPostHeader from './BlogPostHeader.svelte';
	import { blog_feed_context, type BlogPostMetadata, type BlogFeedItem } from './blog.ts';

	const {
		post,
		item,
		attrs,
		meta,
		footer,
		comments,
		children
	}: {
		post: BlogPostMetadata;
		/**
		 * The resolved feed item. Defaults to the `blog_feed_context` item whose
		 * `pathname` is the current route; pass it explicitly to skip the context,
		 * e.g. when rendering a post outside its own route.
		 */
		item?: BlogFeedItem;
		attrs?: SvelteHTMLElements['article'] | undefined;
		/**
		 * Renders after `BlogPostHeader`, e.g. for post provenance.
		 */
		meta?: Snippet<[item: BlogFeedItem]>;
		footer?: Snippet;
		/**
		 * Renders after `footer`, for a post's comments.
		 */
		comments?: Snippet<[item: BlogFeedItem]>;
		children: Snippet;
	} = $props();

	const feed = blog_feed_context.get_maybe();

	// TODO maybe clean up the type vs `post`
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
			{@render meta?.(resolved_item)}
			{@render children()}
			{@render footer?.()}
			{@render comments?.(resolved_item)}
		</article>
	{:else}
		<div>cannot find post <code>{page.route.id}</code></div>
	{/if}
</div>
