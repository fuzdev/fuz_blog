<script lang="ts">
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import type { Snippet } from 'svelte';

	import { blog_feed_context } from '#lib/blog.ts';
	import { feed } from './feed.ts';

	const {
		children
	}: {
		children: Snippet;
	} = $props();

	blog_feed_context.set(feed);
</script>

<div class="column align-items:center mt_xl3">
	<Breadcrumb />
</div>
<div class="column align-items:center flex:1 p_xl2">
	{@render children()}
</div>
<div class="column align-items:center mt_xl3 mb_xl9">
	<Breadcrumb />
</div>

<!-- TODO a 404 page for the blog, needs to work with prerendering -->
