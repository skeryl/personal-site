import { millisecondsToMinutes, millisecondsToSeconds, millisecondsToHours } from 'date-fns';

export function formatMillis(millis: number): string {
	const hours = millisecondsToHours(millis);
	return `${hours > 0 ? `${hours}:` : ''}${String(millisecondsToMinutes(millis) % 60).padStart(2, '0')}:${String(millisecondsToSeconds(millis) % 60).padStart(2, '0')}`;
}
