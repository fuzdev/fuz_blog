<script lang="ts">
	import '@fuzdev/fuz_css/style.css';
	import '@fuzdev/fuz_css/theme.css';
	import '@fuzdev/fuz_code/theme.css';
	import '$routes/fuz.css';
	import '$routes/style.css';

	import Themed from '@fuzdev/fuz_ui/Themed.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import ContextmenuRoot from '@fuzdev/fuz_ui/ContextmenuRoot.svelte';
	import {contextmenu_attachment} from '@fuzdev/fuz_ui/contextmenu_state.svelte.js';
	import {Library, library_context} from '@fuzdev/fuz_ui/library.svelte.js';
	import type {Snippet} from 'svelte';

	import Settings from '$routes/Settings.svelte';
	import {blog_feed_context} from '$lib/blog.js';
	import {feed} from '$routes/blog/feed.js';
	import {library_json} from '$routes/library.js';

	const {
		children,
	}: {
		children: Snippet;
	} = $props();

	library_context.set(new Library(library_json));

	blog_feed_context.set(feed);

	let show_settings = $state(false);
</script>

<svelte:head>
	<title>fuz_blog</title>
	<!-- TODO add JSONFeed -->
	<link rel="alternate" type="application/atom+xml" title="Atom" href={feed.atom.feed_url} />
</svelte:head>

<svelte:body
	{@attach contextmenu_attachment([
		{
			snippet: 'text',
			props: {
				content: 'Settings',
				icon: '?',
				run: () => {
					show_settings = true;
				},
			},
		},
		{
			snippet: 'text',
			props: {
				content: 'Reload',
				icon: '⟳',
				run: () => {
					location.reload();
				},
			},
		},
	])}
/>

<Themed>
	<ContextmenuRoot>
		{@render children()}
		{#if show_settings}
			<Dialog onclose={() => (show_settings = false)}>
				<div class="pane p_md width_atmost_md mx_auto">
					<Settings />
				</div>
			</Dialog>
		{/if}
	</ContextmenuRoot>
</Themed>
