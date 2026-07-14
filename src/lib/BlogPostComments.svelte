<script lang="ts">
	import type {Snippet} from 'svelte';
	import Toot from '@fuzdev/fuz_mastodon/Toot.svelte';
	import {mastodon_cache_context} from '@fuzdev/fuz_mastodon/mastodon_cache.svelte.ts';

	import type {BlogPostItem} from './blog.ts';

	const {
		item,
		separator = default_separator,
	}: {
		item: BlogPostItem;
		separator?: Snippet;
	} = $props();

	const cache = mastodon_cache_context.get_maybe();
</script>

<!-- Renders a post's comments, currently only from Mastodon.
Importing this component is what opts into the `@fuzdev/fuz_mastodon`
peer dependency - `BlogPost.svelte` itself is mastodon-free. -->

{#if item.comments}
	{@render separator()}
	<!-- TODO the storage key is weird -->
	<!-- TODO use local cache in dev -->
	<section>
		<h2>Comments</h2>
		{#if !cache || cache.data !== undefined}
			<Toot
				url={item.comments.url}
				include_replies
				initial_autoload
				reply_filter={(toot) => ({type: 'favourited_by', favourited_by: [toot.account.acct]})}
				settings_storage_key="{item.id}_comments_settings"
				cache={cache?.data}
			/>
		{/if}
	</section>
	{@render separator()}
{/if}

{#snippet default_separator()}<hr />{/snippet}
