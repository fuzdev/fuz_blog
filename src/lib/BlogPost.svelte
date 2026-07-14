<script lang="ts">
	import type {SvelteHTMLElements} from 'svelte/elements';
	import type {Snippet} from 'svelte';

	import BlogPostHeader from './BlogPostHeader.svelte';
	import {blog_feed_context, type BlogPostData, type BlogPostItem} from './blog.ts';

	const {
		post,
		item: item_prop,
		attrs,
		meta,
		footer,
		comments,
		children,
	}: {
		post: BlogPostData;
		/**
		 * The resolved feed item. Defaults to looking `post.slug` up in
		 * `blog_feed_context`; pass it explicitly to skip the context.
		 */
		item?: BlogPostItem;
		attrs?: SvelteHTMLElements['article'] | undefined;
		/**
		 * Renders in the header after `BlogPostHeader`, e.g. for post provenance.
		 */
		meta?: Snippet<[item: BlogPostItem]>;
		footer?: Snippet;
		/**
		 * Renders after `footer`, usually with `BlogPostComments`.
		 * Importing `BlogPostComments.svelte` is what opts into the
		 * `@fuzdev/fuz_mastodon` peer dependency.
		 */
		comments?: Snippet<[item: BlogPostItem]>;
		children: Snippet;
	} = $props();

	// TODO maybe clean up the type vs `post`
	const item = $derived(
		item_prop ?? blog_feed_context.get_maybe()?.items.find((i) => i.slug === post.slug),
	);
</script>

<svelte:head>
	<!-- TODO title suffix like - ryanatkn.com/blog -->
	<title>{post.title}</title>
</svelte:head>

<div class="blog_post width_atmost_md">
	{#if item}
		<article {...attrs}>
			<BlogPostHeader {item} />
			{@render meta?.(item)}
			{@render children()}
			{@render footer?.()}
			{@render comments?.(item)}
		</article>
	{:else}
		<div>cannot find post <code>{post.slug}</code></div>
	{/if}
</div>
