import {format} from 'date-fns';

export const format_date = (date: string | number | Date): string =>
	format(typeof date === 'string' ? new Date(date) : date, 'PP');
