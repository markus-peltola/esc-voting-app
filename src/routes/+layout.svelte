<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Sync auth store with page data
	$effect(() => {
		authStore.setAuth(data.session, data.profile);
	});

	onMount(() => {
		const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event, session) => {
			if (session?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<div class="min-h-screen bg-gray-50">
	{@render children()}
</div>
