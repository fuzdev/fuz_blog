<script lang="ts">
	import type {SvelteHTMLElements} from 'svelte/elements';
	import type {Snippet} from 'svelte';

	import BlogPostHeader from './BlogPostHeader.svelte';
	import {blog_feed_context, type BlogPostMetadata, type BlogFeedItem} from './blog.ts';

	const {
		post,
		item,
		attrs,
		meta,
		footer,
		comments,
		children,
	}: {
		post: BlogPostMetadata;
		/**
		 * The resolved feed item. Defaults to looking `post.slug` up in
		 * `blog_feed_context`; pass it explicitly to skip the context.
		 */
		item?: BlogFeedItem;
		attrs?: SvelteHTMLElements['article'] | undefined;
		/**
		 * Renders after `BlogPostHeader`, e.g. for post provenance.
		 */
		meta?: Snippet<[item: BlogFeedItem]>;
		footer?: Snippet;
		/**
		 * Renders after `footer`, usually with `BlogPostComments`.
		 * Importing `BlogPostComments.svelte` is what opts into the
		 * `@fuzdev/fuz_mastodon` peer dependency.
		 */
		comments?: Snippet<[item: BlogFeedItem]>;
		children: Snippet;
	} = $props();

	// TODO maybe clean up the type vs `post`
	const resolved_item = $derived(
		item ?? blog_feed_context.get_maybe()?.items.find((i) => i.slug === post.slug),
	);
</script>

<svelte:head>
	<!-- TODO title suffix like - ryanatkn.com/blog -->
	<title>{post.title}</title>
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
		<div>cannot find post <code>{post.slug}</code></div>
	{/if}
</div>
