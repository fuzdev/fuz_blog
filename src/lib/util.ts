import {format} from 'date-fns';
import {strip_end, strip_start} from '@fuzdev/fuz_util/string.ts';

// TODO rename?
export const format_date = (date: string | number | Date): string =>
	format(typeof date === 'string' ? new Date(date) : date, 'PP');

export const to_pathname = (url: string, root: string): string =>
	strip_start(url, strip_end(root, '/'));
