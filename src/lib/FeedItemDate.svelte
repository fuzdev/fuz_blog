<script lang="ts">
	import type { FeedItem } from './feed.ts';
	import { format_date } from './util.ts';

	const {
		item
	}: {
		/**
		 * A feed item or post metadata, anything with the two dates.
		 */
		item: Pick<FeedItem, 'date_published' | 'date_modified'>;
	} = $props();

	const published = $derived(format_date(item.date_published));
	const modified = $derived(format_date(item.date_modified));
</script>

<!-- a modified date on the publish date's UTC day formats the same, so it's not shown as an update -->
{published}{#if modified !== published}, updated {modified}{/if}
