<script lang="ts">
	import type {SvelteHTMLElements} from 'svelte/elements';
	import type {Snippet} from 'svelte';

	import BlogPostHeader from './BlogPostHeader.svelte';
	import {blog_feed_context, type BlogPostData, type BlogPostItem} from './blog.ts';

	const {
		post,
		attrs,
		footer,
		comments,
		children,
	}: {
		post: BlogPostData;
		attrs?: SvelteHTMLElements['article'] | undefined;
		footer?: Snippet;
		/**
		 * Renders after `footer`, usually with `BlogPostComments`.
		 * Importing `BlogPostComments.svelte` is what opts into the
		 * `@fuzdev/fuz_mastodon` peer dependency.
		 */
		comments?: Snippet<[item: BlogPostItem]>;
		children: Snippet;
	} = $props();

	const feed = blog_feed_context.get();

	// TODO maybe clean up the type vs `post`
	const item = feed.items.find((i) => i.slug === post.slug);
</script>

<svelte:head>
	<!-- TODO title suffix like - ryanatkn.com/blog -->
	<title>{post.title}</title>
</svelte:head>

<div class="blog_post width_atmost_md">
	{#if item}
		<article {...attrs}>
			<BlogPostHeader {item} />
			{@render children()}
			{@render footer?.()}
			{@render comments?.(item)}
		</article>
	{:else}
		<div>cannot find post <code>{post.slug}</code></div>
	{/if}
</div>
