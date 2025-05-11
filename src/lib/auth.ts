import { goto } from '$app/navigation';

export function checkAuth(redirectTo: string = '/') {
	const userId = localStorage.getItem('user_id');
	const username = localStorage.getItem('username');
	if (!userId) {
		goto(redirectTo);
		return null;
	}
	return { userId, username };
}

export function isAdmin(userId: string | null) {
	return userId === import.meta.env.VITE_ADMIN_USER;
}
