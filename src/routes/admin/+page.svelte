<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import { FANTASY_CONFIG } from '$lib/config/fantasy';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Tab = 'events' | 'participants' | 'drafts' | 'results' | 'test-users';
	let activeTab = $state<Tab>('events');
	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	// Test users
	let testUserCount = $state(5);
	let testUserPassword = $state('test123');

	// Events tab
	let events = $state<any[]>([]);
	let newEvent = $state({
		title: '',
		year: new Date().getFullYear(),
		type: 'voting' as 'voting' | 'fantasy',
		status: 'upcoming' as 'upcoming' | 'active' | 'closed'
	});

	// Participants tab
	let selectedEventId = $state<string>('');
	let selectedEvent = $state<any | null>(null);
	let eventParticipants = $state<any[]>([]);
	let allParticipants = $state<any[]>([]);
	let newParticipant = $state({
		country: '',
		artist: '',
		song: '',
		year: new Date().getFullYear()
	});
	let selectedParticipantId = $state<string>('');
	let runningOrder = $state<number>(1);

	// Drafts tab
	let draftEventId = $state<string>('');
	let fantasyEvents = $state<any[]>([]);
	let draftUsers = $state<any[]>([]);
	let selectedUserIds = $state<string[]>([]);
	let currentDraft = $state<any | null>(null);

	// Results tab
	let resultsEventId = $state<string>('');
	let resultsParticipants = $state<any[]>([]);
	let positions = $state<Map<string, number>>(new Map());
	let points = $state<Map<string, number>>(new Map());

	$effect(() => {
		loadEvents();
		loadAllParticipants();
		loadUsers();
	});

	async function loadEvents() {
		const { data: eventData, error: eventError } = await data.supabase
			.from('events')
			.select('*')
			.order('year', { ascending: false });

		if (!eventError) {
			events = eventData || [];
			fantasyEvents = events.filter(e => e.type === 'fantasy');
		}
	}

	async function loadAllParticipants() {
		const { data: participantData } = await data.supabase
			.from('participants')
			.select('*')
			.order('year', { ascending: false })
			.order('country', { ascending: true });

		allParticipants = participantData || [];
	}

	async function loadUsers() {
		const { data: userData } = await data.supabase
			.from('profiles')
			.select('id, username')
			.order('username', { ascending: true });

		draftUsers = userData || [];
	}

	async function createEvent() {
		error = '';
		success = '';
		loading = true;

		try {
			const { error: insertError } = await data.supabase
				.from('events')
				.insert([newEvent]);

			if (insertError) throw insertError;

			success = 'Event created successfully!';
			newEvent = {
				title: '',
				year: new Date().getFullYear(),
				type: 'voting',
				status: 'upcoming'
			};
			await loadEvents();
		} catch (err: any) {
			error = err.message || 'Failed to create event';
		} finally {
			loading = false;
		}
	}

	async function updateEventStatus(eventId: string, status: string) {
		error = '';
		loading = true;

		try {
			const { error: updateError } = await data.supabase
				.from('events')
				.update({ status })
				.eq('id', eventId);

			if (updateError) throw updateError;

			success = `Event ${status}!`;
			await loadEvents();
		} catch (err: any) {
			error = err.message || 'Failed to update event';
		} finally {
			loading = false;
		}
	}

	async function loadEventParticipants(eventId: string) {
		const event = events.find(e => e.id === eventId);
		selectedEvent = event;

		const { data: epData } = await data.supabase
			.from('event_participants')
			.select(`
				id,
				running_order,
				participant:participants (
					id,
					country,
					artist,
					song
				)
			`)
			.eq('event_id', eventId)
			.order('running_order', { ascending: true });

		eventParticipants = (epData || []).map((item: any) => ({
			ep_id: item.id,
			id: item.participant.id,
			country: item.participant.country,
			artist: item.participant.artist,
			song: item.participant.song,
			running_order: item.running_order
		}));
	}

	async function createParticipant() {
		error = '';
		success = '';
		loading = true;

		try {
			const { error: insertError } = await data.supabase
				.from('participants')
				.insert([newParticipant]);

			if (insertError) throw insertError;

			success = 'Participant created successfully!';
			newParticipant = { country: '', artist: '', song: '', year: new Date().getFullYear() };
			await loadAllParticipants();
		} catch (err: any) {
			error = err.message || 'Failed to create participant';
		} finally {
			loading = false;
		}
	}

	async function addParticipantToEvent() {
		error = '';
		success = '';
		loading = true;

		try {
			const { error: insertError } = await data.supabase
				.from('event_participants')
				.insert([{
					event_id: selectedEventId,
					participant_id: selectedParticipantId,
					running_order: runningOrder
				}]);

			if (insertError) throw insertError;

			success = 'Participant added to event!';
			selectedParticipantId = '';
			runningOrder = eventParticipants.length + 2;
			await loadEventParticipants(selectedEventId);
		} catch (err: any) {
			error = err.message || 'Failed to add participant';
		} finally {
			loading = false;
		}
	}

	async function removeParticipantFromEvent(epId: string) {
		error = '';
		loading = true;

		try {
			const { error: deleteError } = await data.supabase
				.from('event_participants')
				.delete()
				.eq('id', epId);

			if (deleteError) throw deleteError;

			success = 'Participant removed from event!';
			await loadEventParticipants(selectedEventId);
		} catch (err: any) {
			error = err.message || 'Failed to remove participant';
		} finally {
			loading = false;
		}
	}

	async function loadDraft(eventId: string) {
		const { data: draftData } = await data.supabase
			.from('fantasy_drafts')
			.select('*')
			.eq('event_id', eventId)
			.single();

		currentDraft = draftData;
	}

	async function initializeDraft() {
		error = '';
		success = '';
		loading = true;

		try {
			if (selectedUserIds.length < 2) {
				throw new Error('Select at least 2 users for the draft');
			}

			// Count participants for this event
			const { count: participantCount } = await data.supabase
				.from('event_participants')
				.select('*', { count: 'exact', head: true })
				.eq('event_id', draftEventId);

			if (!participantCount || participantCount === 0) {
				throw new Error('No participants in this event. Add participants first.');
			}

			// Calculate team size: each user can pick as many as possible
			// Formula: min(floor(total_participants / total_users), MAX_PICKS_PER_DRAFTER)
			const calculatedTeamSize = Math.floor(participantCount / selectedUserIds.length);
			const teamSize = Math.min(calculatedTeamSize, FANTASY_CONFIG.MAX_PICKS_PER_DRAFTER);

			if (teamSize < 1) {
				throw new Error(`Not enough participants (${participantCount}) for ${selectedUserIds.length} users. Need at least ${selectedUserIds.length} participants.`);
			}

			// Shuffle turn order
			const turnOrder = [...selectedUserIds].sort(() => Math.random() - 0.5);

			const { error: insertError } = await data.supabase
				.from('fantasy_drafts')
				.insert([{
					event_id: draftEventId,
					turn_order: turnOrder,
					current_turn_index: 0,
					current_round: 1,
					is_forward: true,
					status: 'pending',
					team_size: teamSize
				}]);

			if (insertError) throw insertError;

			const capMessage = calculatedTeamSize > FANTASY_CONFIG.MAX_PICKS_PER_DRAFTER
				? ` (capped at ${FANTASY_CONFIG.MAX_PICKS_PER_DRAFTER} max)`
				: '';
			success = `✅ Draft initialized! Each user will pick ${teamSize} participants${capMessage}.`;
			await loadDraft(draftEventId);
		} catch (err: any) {
			error = err.message || 'Failed to initialize draft';
		} finally {
			loading = false;
		}
	}

	async function updateDraftStatus(status: string) {
		error = '';
		loading = true;

		try {
			const { error: updateError } = await data.supabase
				.from('fantasy_drafts')
				.update({ status })
				.eq('event_id', draftEventId);

			if (updateError) throw updateError;

			success = `Draft ${status}!`;
			await loadDraft(draftEventId);
		} catch (err: any) {
			error = err.message || 'Failed to update draft';
		} finally {
			loading = false;
		}
	}

	async function loadResultsParticipants(eventId: string) {
		const { data: epData } = await data.supabase
			.from('event_participants')
			.select(`
				participant:participants (
					id,
					country,
					artist,
					song
				)
			`)
			.eq('event_id', eventId);

		resultsParticipants = (epData || []).map((item: any) => item.participant);

		// Load existing results
		const { data: resultsData } = await data.supabase
			.from('fantasy_results')
			.select('*')
			.eq('event_id', eventId);

		const newPositions = new Map<string, number>();
		const newPoints = new Map<string, number>();
		for (const result of resultsData || []) {
			newPositions.set(result.participant_id, result.final_position);
			newPoints.set(result.participant_id, result.points);
		}
		positions = newPositions;
		points = newPoints;
	}

	async function saveResults() {
		error = '';
		success = '';
		loading = true;

		try {
			// Delete existing results
			await data.supabase
				.from('fantasy_results')
				.delete()
				.eq('event_id', resultsEventId);

			// Insert only participants with an explicitly entered final position.
			// Unset participants should remain absent from fantasy_results so the UI can show TBA.
			const resultsData = resultsParticipants
				.filter((p) => positions.has(p.id))
				.map(p => ({
					event_id: resultsEventId,
					participant_id: p.id,
					final_position: positions.get(p.id) ?? 0,
					points: points.get(p.id) ?? 0
				}));

			if (resultsData.length > 0) {
				const { error: insertError } = await data.supabase
					.from('fantasy_results')
					.insert(resultsData);

				if (insertError) throw insertError;
			}

			success = 'Results saved successfully!';
		} catch (err: any) {
			error = err.message || 'Failed to save results';
		} finally {
			loading = false;
		}
	}

	async function createTestUsers() {
		error = '';
		success = '';
		loading = true;

		try {
			const createdUsers: string[] = [];

			for (let i = 1; i <= testUserCount; i++) {
				const email = `testuser${i}@test.com`;
				const username = `TestUser${i}`;

				// Create user with Supabase Auth
				const { data: authData, error: signUpError } = await data.supabase.auth.signUp({
					email,
					password: testUserPassword,
					options: {
						data: {
							username
						},
						emailRedirectTo: undefined
					}
				});

				if (signUpError) {
					console.error(`Failed to create ${email}:`, signUpError);
					continue;
				}

				if (authData.user) {
					// Update profile with username
					await data.supabase
						.from('profiles')
						.update({ username })
						.eq('id', authData.user.id);

					createdUsers.push(email);
				}
			}

			if (createdUsers.length > 0) {
				success = `✅ Created ${createdUsers.length} test users! Email: testuser1-${testUserCount}@test.com, Password: ${testUserPassword}`;
			} else {
				error = 'Failed to create test users. They may already exist.';
			}

			await loadUsers(); // Reload users for draft section
		} catch (err: any) {
			error = err.message || 'Failed to create test users';
		} finally {
			loading = false;
		}
	}

	async function deleteAllTestUsers() {
		if (!confirm('Are you sure you want to delete ALL test users? This cannot be undone!')) {
			return;
		}

		error = '';
		success = '';
		loading = true;

		try {
			// Get all test users
			const { data: testUsers } = await data.supabase
				.from('profiles')
				.select('id')
				.like('username', 'TestUser%');

			if (!testUsers || testUsers.length === 0) {
				error = 'No test users found';
				loading = false;
				return;
			}

			// Delete from profiles (cascade will handle votes/predictions)
			for (const user of testUsers) {
				await data.supabase.auth.admin.deleteUser(user.id);
			}

			success = `✅ Deleted ${testUsers.length} test users`;
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to delete test users';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50">
	<Navigation
		supabase={data.supabase}
		currentPage="admin"
		initialSession={data.session}
		initialProfile={data.profile}
	/>

	<main class="container-eurovision py-8">
		<!-- Tabs -->
		<div class="mb-6 border-b border-gray-200">
			<nav class="flex flex-wrap gap-6">
				<button
					onclick={() => activeTab = 'events'}
					class="pb-3 px-1 font-semibold transition-colors border-b-2"
					class:border-danger-500={activeTab === 'events'}
					class:text-danger-600={activeTab === 'events'}
					class:border-transparent={activeTab !== 'events'}
					class:text-gray-600={activeTab !== 'events'}
				>
					Events
				</button>
				<button
					onclick={() => activeTab = 'participants'}
					class="pb-3 px-1 font-semibold transition-colors border-b-2"
					class:border-danger-500={activeTab === 'participants'}
					class:text-danger-600={activeTab === 'participants'}
					class:border-transparent={activeTab !== 'participants'}
					class:text-gray-600={activeTab !== 'participants'}
				>
					Participants
				</button>
				<button
					onclick={() => activeTab = 'drafts'}
					class="pb-3 px-1 font-semibold transition-colors border-b-2"
					class:border-danger-500={activeTab === 'drafts'}
					class:text-danger-600={activeTab === 'drafts'}
					class:border-transparent={activeTab !== 'drafts'}
					class:text-gray-600={activeTab !== 'drafts'}
				>
					Fantasy Drafts
				</button>
				<button
					onclick={() => activeTab = 'results'}
					class="pb-3 px-1 font-semibold transition-colors border-b-2"
					class:border-danger-500={activeTab === 'results'}
					class:text-danger-600={activeTab === 'results'}
					class:border-transparent={activeTab !== 'results'}
					class:text-gray-600={activeTab !== 'results'}
				>
					Results
				</button>
				<button
					onclick={() => activeTab = 'test-users'}
					class="pb-3 px-1 font-semibold transition-colors border-b-2"
					class:border-danger-500={activeTab === 'test-users'}
					class:text-danger-600={activeTab === 'test-users'}
					class:border-transparent={activeTab !== 'test-users'}
					class:text-gray-600={activeTab !== 'test-users'}
				>
					🧪 Test Users
				</button>
			</nav>
		</div>

		<!-- Messages -->
		{#if error}
			<div class="mb-6 p-4 bg-danger-50 border-2 border-danger-200 text-danger-700 rounded-lg animate-slide-up">
				{error}
			</div>
		{/if}

		{#if success}
			<div class="mb-6 p-4 bg-success-500 text-white rounded-lg animate-slide-up font-semibold">
				{success}
			</div>
		{/if}

		<!-- Events Tab -->
		{#if activeTab === 'events'}
			<div class="space-y-6">
				<!-- Create Event -->
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Create New Event</h2>
					<form onsubmit={(e) => { e.preventDefault(); createEvent(); }} class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="title" class="block text-sm font-semibold text-gray-700 mb-2">
									Event Title
								</label>
								<input
									id="title"
									type="text"
									bind:value={newEvent.title}
									required
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
									placeholder="Eurovision 2026"
								/>
							</div>

							<div>
								<label for="year" class="block text-sm font-semibold text-gray-700 mb-2">
									Year
								</label>
								<input
									id="year"
									type="number"
									bind:value={newEvent.year}
									required
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								/>
							</div>

							<div>
								<label for="type" class="block text-sm font-semibold text-gray-700 mb-2">
									Event Type
								</label>
								<select
									id="type"
									bind:value={newEvent.type}
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								>
									<option value="voting">Voting</option>
									<option value="fantasy">Fantasy</option>
								</select>
							</div>

							<div>
								<label for="status" class="block text-sm font-semibold text-gray-700 mb-2">
									Status
								</label>
								<select
									id="status"
									bind:value={newEvent.status}
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								>
									<option value="upcoming">Upcoming</option>
									<option value="active">Active</option>
									<option value="closed">Closed</option>
								</select>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Creating...' : '➕ Create Event'}
						</button>
					</form>
				</div>

				<!-- Events List -->
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">All Events</h2>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b-2 border-gray-200">
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Year</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
									<th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each events as event}
									<tr class="border-b border-gray-100">
										<td class="py-3 px-4 font-semibold text-gray-800">{event.title}</td>
										<td class="py-3 px-4 text-gray-700">{event.year}</td>
										<td class="py-3 px-4">
											<span class="inline-block px-2 py-1 rounded text-xs font-semibold"
												class:bg-primary-100={event.type === 'voting'}
												class:text-primary-700={event.type === 'voting'}
												class:bg-purple-100={event.type === 'fantasy'}
												class:text-purple-700={event.type === 'fantasy'}
											>
												{event.type}
											</span>
										</td>
										<td class="py-3 px-4">
											<span class="inline-block px-2 py-1 rounded text-xs font-semibold"
												class:bg-gray-100={event.status === 'upcoming'}
												class:text-gray-700={event.status === 'upcoming'}
												class:bg-success-100={event.status === 'active'}
												class:text-success-700={event.status === 'active'}
												class:bg-danger-100={event.status === 'closed'}
												class:text-danger-700={event.status === 'closed'}
											>
												{event.status}
											</span>
										</td>
										<td class="py-3 px-4">
											<div class="flex gap-2">
												{#if event.status !== 'active'}
													<button
														onclick={() => updateEventStatus(event.id, 'active')}
														class="text-xs text-success-600 hover:text-success-700 font-semibold"
														disabled={loading}
													>
														Activate
													</button>
												{/if}
												{#if event.status !== 'closed'}
													<button
														onclick={() => updateEventStatus(event.id, 'closed')}
														class="text-xs text-danger-600 hover:text-danger-700 font-semibold"
														disabled={loading}
													>
														Close
													</button>
												{/if}
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		{/if}

		<!-- Participants Tab -->
		{#if activeTab === 'participants'}
			<div class="space-y-6">
				<!-- Create Participant -->
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Create New Participant</h2>
					<form onsubmit={(e) => { e.preventDefault(); createParticipant(); }} class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div>
								<label for="year" class="block text-sm font-semibold text-gray-700 mb-2">
									Year
								</label>
								<input
									id="year"
									type="number"
									bind:value={newParticipant.year}
									required
									min="2020"
									max="2030"
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								/>
							</div>

							<div>
								<label for="country" class="block text-sm font-semibold text-gray-700 mb-2">
									Country
								</label>
								<input
									id="country"
									type="text"
									bind:value={newParticipant.country}
									required
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
									placeholder="Sweden"
								/>
							</div>

							<div>
								<label for="artist" class="block text-sm font-semibold text-gray-700 mb-2">
									Artist
								</label>
								<input
									id="artist"
									type="text"
									bind:value={newParticipant.artist}
									required
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
									placeholder="Artist Name"
								/>
							</div>

							<div>
								<label for="song" class="block text-sm font-semibold text-gray-700 mb-2">
									Song
								</label>
								<input
									id="song"
									type="text"
									bind:value={newParticipant.song}
									required
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
									placeholder="Song Title"
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Creating...' : '➕ Create Participant'}
						</button>
					</form>
				</div>

				<!-- Event Selection -->
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Manage Event Participants</h2>
					<div class="mb-4">
						<label for="event-select" class="block text-sm font-semibold text-gray-700 mb-2">
							Select Event
						</label>
						<select
							id="event-select"
							bind:value={selectedEventId}
							onchange={(e) => loadEventParticipants(e.currentTarget.value)}
							class="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
						>
							<option value="">Choose an event...</option>
							{#each events as event}
								<option value={event.id}>{event.title} ({event.year})</option>
							{/each}
						</select>
					</div>

					{#if selectedEventId}
						<!-- Add Participant to Event -->
						<div class="mb-6 p-4 bg-gray-50 rounded-lg">
							<h3 class="text-lg font-bold text-gray-800 mb-3">Add Participant to Event</h3>
							<form onsubmit={(e) => { e.preventDefault(); addParticipantToEvent(); }} class="space-y-3">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label for="participant-select" class="block text-sm font-semibold text-gray-700 mb-2">
											Participant ({selectedEvent?.year || 'Select event'})
										</label>
										<select
											id="participant-select"
											bind:value={selectedParticipantId}
											required
											disabled={loading}
											class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
										>
											<option value="">Choose a participant...</option>
											{#each allParticipants.filter(p => p.year === selectedEvent?.year) as participant}
												<option value={participant.id}>
													{participant.country} - {participant.artist}
												</option>
											{/each}
										</select>
										{#if selectedEvent && allParticipants.filter(p => p.year === selectedEvent.year).length === 0}
											<p class="text-xs text-danger-600 mt-1">No participants found for {selectedEvent.year}. Create participants first.</p>
										{/if}
									</div>

									<div>
										<label for="running-order" class="block text-sm font-semibold text-gray-700 mb-2">
											Running Order
										</label>
										<input
											id="running-order"
											type="number"
											bind:value={runningOrder}
											required
											min="1"
											disabled={loading}
											class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={loading || !selectedParticipantId}
									class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? 'Adding...' : '➕ Add to Event'}
								</button>
							</form>
						</div>

						<!-- Event Participants List -->
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b-2 border-gray-200">
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Order</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Country</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Artist</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Song</th>
										<th class="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each eventParticipants as participant}
										<tr class="border-b border-gray-100">
											<td class="py-3 px-4 font-semibold text-gray-800">#{participant.running_order}</td>
											<td class="py-3 px-4 text-gray-700">{participant.country}</td>
											<td class="py-3 px-4 text-gray-700">{participant.artist}</td>
											<td class="py-3 px-4 text-gray-600 italic">"{participant.song}"</td>
											<td class="py-3 px-4">
												<button
													onclick={() => removeParticipantFromEvent(participant.ep_id)}
													class="text-xs text-danger-600 hover:text-danger-700 font-semibold"
													disabled={loading}
												>
													Remove
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Fantasy Drafts Tab -->
		{#if activeTab === 'drafts'}
			<div class="space-y-6">
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Fantasy Draft Management</h2>

					<div class="mb-4">
						<label for="draft-event-select" class="block text-sm font-semibold text-gray-700 mb-2">
							Select Fantasy Event
						</label>
						<select
							id="draft-event-select"
							bind:value={draftEventId}
							onchange={(e) => loadDraft(e.currentTarget.value)}
							class="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
						>
							<option value="">Choose a fantasy event...</option>
							{#each fantasyEvents as event}
								<option value={event.id}>{event.title} ({event.year})</option>
							{/each}
						</select>
					</div>

					{#if draftEventId}
						{#if !currentDraft}
							<!-- Initialize Draft -->
							<div class="p-4 bg-gray-50 rounded-lg">
								<h3 class="text-lg font-bold text-gray-800 mb-3">Initialize Draft</h3>
								<p class="text-sm text-gray-600 mb-4">Select users to participate in the draft. The turn order will be randomized.</p>

								<div class="space-y-2 mb-4">
									{#each draftUsers as user}
										<label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
											<input
												type="checkbox"
												value={user.id}
												checked={selectedUserIds.includes(user.id)}
												onchange={(e) => {
													if (e.currentTarget.checked) {
														selectedUserIds = [...selectedUserIds, user.id];
													} else {
														selectedUserIds = selectedUserIds.filter(id => id !== user.id);
													}
												}}
												class="w-4 h-4"
											/>
											<span class="text-gray-700">{user.username}</span>
										</label>
									{/each}
								</div>

								<p class="text-sm text-gray-600 mb-3">Selected: {selectedUserIds.length} users</p>

								<button
									onclick={initializeDraft}
									disabled={loading || selectedUserIds.length < 2}
									class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{loading ? 'Initializing...' : '🎲 Initialize Draft'}
								</button>
							</div>
						{:else}
							<!-- Draft Info -->
							<div class="space-y-4">
								<div class="p-4 bg-gray-50 rounded-lg">
									<h3 class="text-lg font-bold text-gray-800 mb-2">Draft Status</h3>
									<div class="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span class="text-gray-600">Status:</span>
											<span class="ml-2 font-semibold"
												class:text-gray-700={currentDraft.status === 'pending'}
												class:text-success-600={currentDraft.status === 'open'}
												class:text-danger-600={currentDraft.status === 'closed'}
											>
												{currentDraft.status}
											</span>
										</div>
										<div>
											<span class="text-gray-600">Participants:</span>
											<span class="ml-2 font-semibold text-gray-800">{currentDraft.turn_order.length} users</span>
										</div>
										<div>
											<span class="text-gray-600">Team Size:</span>
											<span class="ml-2 font-semibold text-purple-600">{currentDraft.team_size} picks each</span>
										</div>
										<div>
											<span class="text-gray-600">Current Round:</span>
											<span class="ml-2 font-semibold text-gray-800">{currentDraft.current_round} / {currentDraft.team_size}</span>
										</div>
										<div>
											<span class="text-gray-600">Direction:</span>
											<span class="ml-2 font-semibold text-gray-800">
												{currentDraft.is_forward ? '→ Forward' : '← Backward'}
											</span>
										</div>
									</div>
								</div>

								<div class="flex gap-3">
									{#if currentDraft.status === 'pending'}
										<button
											onclick={() => updateDraftStatus('open')}
											disabled={loading}
											class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loading ? 'Opening...' : '🎯 Open Draft'}
										</button>
									{/if}
									{#if currentDraft.status === 'open'}
										<button
											onclick={() => updateDraftStatus('closed')}
											disabled={loading}
											class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loading ? 'Closing...' : '🔒 Close Draft'}
										</button>
									{/if}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Results Tab -->
		{#if activeTab === 'results'}
			<div class="space-y-6">
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">Enter Final Results</h2>

					<div class="mb-4">
						<label for="results-event-select" class="block text-sm font-semibold text-gray-700 mb-2">
							Select Event
						</label>
						<select
							id="results-event-select"
							bind:value={resultsEventId}
							onchange={(e) => loadResultsParticipants(e.currentTarget.value)}
							class="w-full md:w-auto px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
						>
							<option value="">Choose an event...</option>
							{#each events as event}
								<option value={event.id}>{event.title} ({event.year})</option>
							{/each}
						</select>
					</div>

					{#if resultsEventId && resultsParticipants.length > 0}
						<form onsubmit={(e) => { e.preventDefault(); saveResults(); }} class="space-y-4">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead>
										<tr class="border-b-2 border-gray-200">
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Country</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Artist</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Final Position</th>
											<th class="text-left py-3 px-4 font-semibold text-gray-700">Points</th>
										</tr>
									</thead>
									<tbody>
										{#each resultsParticipants as participant}
											<tr class="border-b border-gray-100">
												<td class="py-3 px-4 font-semibold text-gray-800">{participant.country}</td>
												<td class="py-3 px-4 text-gray-700">{participant.artist}</td>
												<td class="py-3 px-4">
													<input
														type="number"
														value={positions.get(participant.id) || ''}
														oninput={(e) => {
															const val = parseInt(e.currentTarget.value);
															if (!isNaN(val)) {
																positions.set(participant.id, val);
																positions = positions;
															}
														}}
														min="0"
														max="26"
														placeholder="0 = DNQ"
														disabled={loading}
														class="w-24 px-3 py-1 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
													/>
												</td>
												<td class="py-3 px-4">
													<input
														type="number"
														value={points.get(participant.id) || ''}
														oninput={(e) => {
															const val = parseInt(e.currentTarget.value);
															if (!isNaN(val)) {
																points.set(participant.id, val);
																points = points;
															}
														}}
														min="0"
														placeholder="0"
														disabled={loading}
														class="w-24 px-3 py-1 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
													/>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							<button
								type="submit"
								disabled={loading}
								class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Saving...' : '💾 Save Results'}
							</button>
						</form>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Test Users Tab -->
		{#if activeTab === 'test-users'}
			<div class="space-y-6">
				<div class="card-eurovision p-6">
					<h2 class="text-xl font-bold text-gray-800 mb-4">🧪 Create Test Users</h2>
					<p class="text-sm text-gray-600 mb-6">
						Quickly create multiple test users for development and testing. All test users will have the username pattern "TestUser1", "TestUser2", etc.
					</p>

					<div class="p-4 bg-accent-50 border-2 border-accent-200 text-accent-800 rounded-lg mb-6">
						<p class="text-sm font-semibold mb-2">💡 Tip: Disable Email Confirmation</p>
						<p class="text-sm">
							In Supabase Dashboard → Authentication → Providers → Email → Uncheck "Enable email confirmations"
							<br />
							This allows test users to work immediately without email verification.
						</p>
					</div>

					<div class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="user-count" class="block text-sm font-semibold text-gray-700 mb-2">
									Number of Users to Create
								</label>
								<input
									id="user-count"
									type="number"
									bind:value={testUserCount}
									min="1"
									max="50"
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								/>
							</div>

							<div>
								<label for="user-password" class="block text-sm font-semibold text-gray-700 mb-2">
									Password for All Test Users
								</label>
								<input
									id="user-password"
									type="text"
									bind:value={testUserPassword}
									disabled={loading}
									class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
								/>
							</div>
						</div>

						<div class="flex gap-3">
							<button
								onclick={createTestUsers}
								disabled={loading}
								class="btn-accent disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Creating...' : `👥 Create ${testUserCount} Test User${testUserCount > 1 ? 's' : ''}`}
							</button>

							<button
								onclick={deleteAllTestUsers}
								disabled={loading}
								class="px-4 py-2 bg-danger-500 text-white font-semibold rounded-lg hover:bg-danger-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Deleting...' : '🗑️ Delete All Test Users'}
							</button>
						</div>
					</div>
				</div>

				<!-- Info Card -->
				<div class="card-eurovision p-6">
					<h3 class="text-lg font-bold text-gray-800 mb-4">Test User Details</h3>
					<div class="space-y-3 text-sm">
						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="font-semibold text-gray-700 mb-1">Email Format:</p>
							<p class="text-gray-600 font-mono">testuser1@test.com, testuser2@test.com, ...</p>
						</div>

						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="font-semibold text-gray-700 mb-1">Username Format:</p>
							<p class="text-gray-600 font-mono">TestUser1, TestUser2, ...</p>
						</div>

						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="font-semibold text-gray-700 mb-1">Password:</p>
							<p class="text-gray-600 font-mono">{testUserPassword}</p>
						</div>

						<div class="p-4 bg-primary-50 border-2 border-primary-200 rounded-lg">
							<p class="text-sm text-primary-800">
								<strong>Note:</strong> These users are for testing only. You can delete all test users at once using the "Delete All Test Users" button.
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>
</div>
