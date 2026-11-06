import { afterEach, assert, describe, test } from 'vitest';

import { format_date } from '#lib/util.ts';

const original_tz = process.env.TZ;

afterEach(() => {
	if (original_tz === undefined) delete process.env.TZ;
	else process.env.TZ = original_tz;
});

describe('format_date', () => {
	test('formats the medium en-US date', () => {
		assert.equal(format_date('2024-07-10T16:04:49.688Z'), 'Jul 10, 2024');
		assert.equal(format_date(new Date('2024-07-10T16:04:49.688Z')), 'Jul 10, 2024');
		assert.equal(format_date(Date.parse('2024-07-10T16:04:49.688Z')), 'Jul 10, 2024');
	});

	test('uses the UTC calendar date near midnight in any timezone', () => {
		const cases: Array<[tz: string, datetime: string, local_day: number]> = [
			['America/Los_Angeles', '2024-07-10T02:00:00.000Z', 9], // UTC-7, the previous local day
			['Pacific/Kiritimati', '2024-07-10T23:30:00.000Z', 11] // UTC+14, the next local day
		];
		// setting `TZ` mid-process takes effect only off worker threads, so this relies on vitest's default `forks` pool
		for (const [tz, datetime, local_day] of cases) {
			process.env.TZ = tz;
			// the runtime's local date disagrees with UTC, so the test exercises the timezone
			assert.equal(new Date(datetime).getDate(), local_day, tz);
			assert.equal(format_date(datetime), 'Jul 10, 2024', tz);
		}
	});
});
