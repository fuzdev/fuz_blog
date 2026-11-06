<script lang="ts">
	import 'virtual:fuz.css';
	import '@fuzdev/fuz_code/theme.css';
	import './style.css';

	import ThemeRoot from '@fuzdev/fuz_ui/ThemeRoot.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import DialogContent from '@fuzdev/fuz_ui/DialogContent.svelte';
	import ContextmenuRoot from '@fuzdev/fuz_ui/ContextmenuRoot.svelte';
	import { contextmenu_attachment } from '@fuzdev/fuz_ui/contextmenu_state.svelte.ts';
	import { SiteState, site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { logo_fuz_blog } from '@fuzdev/fuz_ui/logos.ts';
	import type { Snippet } from 'svelte';
	import pkg_json from 'virtual:pkg.json';
	import { to_blog_feed_url } from '#lib/blog.ts';

	import Settings from './Settings.svelte';
	import { blogs } from './blogs.ts';

	const {
		children
	}: {
		children: Snippet;
	} = $props();

	site_context.set(new SiteState({ icon: logo_fuz_blog, pkg_json }));

	let show_settings = $state.raw(false);
</script>

<svelte:head>
	<title>fuz_blog</title>
	<!-- site-wide feed autodiscovery, each blog's feed context is set in its own layout -->
	{#each blogs as blog (blog.dirname)}
		<link
			rel="alternate"
			type="application/atom+xml"
			title={blog.feed.title}
			href={to_blog_feed_url(blog.feed.home_page_url)}
		/>
	{/each}
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
				}
			}
		},
		{
			snippet: 'text',
			props: {
				content: 'Reload',
				icon: '⟳',
				run: () => {
					location.reload();
				}
			}
		}
	])}
/>

<ThemeRoot>
	<ContextmenuRoot>
		{@render children()}
		{#if show_settings}
			<Dialog onclose={() => (show_settings = false)}>
				<DialogContent>
					<Settings />
				</DialogContent>
			</Dialog>
		{/if}
	</ContextmenuRoot>
</ThemeRoot>
