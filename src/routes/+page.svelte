<script lang="ts">
	import {resolve} from '$app/paths';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz_blog} from '@fuzdev/fuz_ui/logos.ts';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import {site_context} from '@fuzdev/fuz_ui/site.svelte.ts';
	import {FUZ_DEV_URL} from '@fuzdev/fuz_ui/constants.ts';

	const site = site_context.get();
</script>

<main class="mx_auto p_lg width_atmost_md">
	<section class="box">
		<header class="pt_sm">
			<Svg data={logo_fuz_blog} size="var(--icon_size_xl3)" />
			<h1 class="mt_xl2 text-align:center">fuz_blog</h1>
		</header>
		<blockquote>blog software from scratch with SvelteKit</blockquote>
	</section>
	<section class="box">
		<div class="mb_lg">
			<Card href={resolve('/docs')}>docs{#snippet icon()}{site.glyph}{/snippet}</Card>
		</div>
		<Card href={resolve('/blog')} icon="🪧">blog</Card>
	</section>
	<section class="mb_xl5 box">
		<a class="chip mb_xl3" href={resolve('/about')}>about</a>
		<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL} />
	</section>
</main>
