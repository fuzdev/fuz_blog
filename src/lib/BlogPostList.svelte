<script lang="ts">
	import FeedItemDate from './FeedItemDate.svelte';
	import type { BlogFeed } from './blog.ts';
	import { resolve_blog_post_pathname } from './blog_post_redirect.ts';
	import { sort_feed_items } from './feed.ts';

	const { feed }: { feed: BlogFeed } = $props();

	// newest first, the order of the Atom feed
	const items = $derived(sort_feed_items(feed.items));
	// the absolute `feed_url` includes any deploy base path, so its pathname is the link
	const feed_pathname = $derived(new URL(feed.atom.feed_url).pathname);
</script>

<section class="blog">
	{#if items.length}
		<!-- `reversed` counts down to the oldest post at 1, a chronological rank, not the post id -->
		<ol class="panel" reversed>
			{#each items as item (item.id)}
				<li class="blog-card">
					<a href={resolve_blog_post_pathname(item.pathname)}>{item.title}</a>
					<div class="date"><FeedItemDate {item} /></div>
				</li>
			{/each}
		</ol>
	{:else}
		<p>no blog posts yet!</p>
	{/if}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="feed-link chip" href={feed_pathname} download>Atom feed</a>
</section>

<style>
	.blog {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space_xl3) 0;
	}
	ol {
		background-color: var(--shade_10);
		padding: var(--space_sm) var(--space_sm) var(--space_sm) var(--space_xl4);
		box-shadow: var(--shadow_inset_xs)
			color-mix(
				in hsl,
				var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_30),
				transparent
			);
	}
	.blog-card {
		font-size: var(--font_size_lg);
		max-width: var(--distance_sm);
		background-color: var(--shade_00);
		border-width: var(--border_width);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--border_radius_xs);
		margin-bottom: var(--space_xl);
		margin-top: var(--space_sm);
		padding: var(--space_md);
		/* TODO review this pattern, maybe use elsewhere */
		box-shadow: var(
			--card_shadow,
			var(--shadow_bottom_sm)
				color-mix(
					in hsl,
					var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_40),
					transparent
				)
		);
	}
	.date {
		font-size: var(--font_size_md);
		margin-top: var(--space_xs);
	}
	.feed-link {
		margin-top: var(--space_xl);
	}
</style>
