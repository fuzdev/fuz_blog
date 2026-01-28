<script lang="ts">
	import {asset, resolve} from '$app/paths';

	import FeedItemDate from '$lib/FeedItemDate.svelte';
	import {blog_feed_context} from '$lib/blog.js';
	import {to_pathname} from '$lib/util.js';

	const feed = blog_feed_context.get();

	const items = feed.items.slice().reverse();
</script>

<section class="blog">
	<ol class="panel" reversed>
		{#each items as item (item)}
			<li class="blog_card">
				<a href={resolve(to_pathname(item.url, feed.home_page_url) as any)}>{item.title}</a>
				<div class="date"><FeedItemDate {item} /></div>
			</li>
		{:else}
			no blog posts yet!
		{/each}
	</ol>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a class="feed_link chip" href={asset('/blog/feed.xml')} download>Atom feed</a>
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
		box-shadow: var(--shadow_inset_xs) var(--shadow_color_1);
	}
	.blog_card {
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
	.feed_link {
		margin-top: var(--space_xl);
	}
</style>
