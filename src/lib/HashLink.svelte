<script lang="ts">
	import type {Snippet} from 'svelte';

	// TODO maybe move to fuz_ui

	const {
		slug,
		children,
	}: {
		slug: string;
		children: Snippet;
	} = $props();
</script>

<div class="hash-link" id={slug}>
	{@render children()}
	<a class="icon_button" href="#{slug}">🔗</a>
</div>

<style>
	.hash-link {
		display: flex;
		align-items: center;
		position: relative;
	}
	a {
		--icon_size: var(--icon_size_sm);
		position: absolute;
		left: calc(var(--icon_size, var(--icon_size_md)) * -1 - var(--space_xl));
		opacity: 0;
		font-size: var(--font_size_lg);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: var(--space_md);
	}
	.hash-link:hover a {
		opacity: 1;
	}
</style>
