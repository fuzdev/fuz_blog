<script lang="ts">
	import FeedItemDate from './FeedItemDate.svelte';
	import type {BlogFeedItem} from './blog.ts';

	const {
		item,
	}: {
		item: BlogFeedItem;
	} = $props();
</script>

<header>
	<h1 class="mt_xl5 mb_lg">{item.title}</h1>
	<p class="mb_xl5">
		<FeedItemDate {item} />
	</p>
</header>
