<script lang="ts">
	import '../app.css';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Sync auth store with page data
	$effect(() => {
		authStore.setAuth(data.session, data.profile);
	});
</script>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>
