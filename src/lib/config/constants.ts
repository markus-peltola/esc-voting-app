/**
 * Global Application Constants
 */

export const APP_CONFIG = {
	/** Application name */
	NAME: 'ESC Voting & Fantasy League',

	/** Short app name for mobile */
	SHORT_NAME: 'ESC Vote',

	/** Application description */
	DESCRIPTION: 'Eurovision Song Contest voting and fantasy league application',

	/** Current year */
	YEAR: new Date().getFullYear(),
} as const;

/**
 * Route paths for navigation
 */
export const ROUTES = {
	HOME: '/',
	LOGIN: '/login',
	REGISTER: '/register',
	VOTE: '/vote',
	MY_VOTES: '/my-votes',
	RESULTS: '/results',
	FANTASY_DRAFT: '/fantasy/draft',
	FANTASY_RESULTS: '/fantasy/results',
	PROFILE: '/profile',
	ADMIN: '/admin/manage',
} as const;

/**
 * Event status values
 */
export const EVENT_STATUS = {
	UPCOMING: 'upcoming',
	ACTIVE: 'active',
	CLOSED: 'closed',
} as const;

/**
 * Event types
 */
export const EVENT_TYPES = {
	VOTING: 'voting',
	FANTASY: 'fantasy',
} as const;

/**
 * Draft status values
 */
export const DRAFT_STATUS = {
	PENDING: 'pending',
	OPEN: 'open',
	CLOSED: 'closed',
} as const;

/**
 * Toast notification duration (milliseconds)
 */
export const TOAST_DURATION = {
	SHORT: 3000,
	MEDIUM: 5000,
	LONG: 7000,
} as const;

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
	FAST: 150,
	NORMAL: 200,
	SLOW: 300,
} as const;

/**
 * Breakpoints for responsive design (matches Tailwind defaults)
 */
export const BREAKPOINTS = {
	SM: 640,
	MD: 768,
	LG: 1024,
	XL: 1280,
	'2XL': 1536,
} as const;
