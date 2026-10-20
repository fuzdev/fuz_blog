<script lang="ts">
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import type { Snippet } from 'svelte';

	const {
		children
	}: {
		children: Snippet;
	} = $props();

	// TODO redirect from the numbers or render UI to navigate to it, maybe in `BlogPost`
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

<!-- TODO 404, needs to work with prerendering -->
<!-- <section>
	<p>
		nothing's here, sorry if this is an
		<a href="https://www.w3.org/Provider/Style/URI">uncool URI</a>
	</p>
</section> -->
