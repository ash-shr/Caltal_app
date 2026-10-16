import { format, parseISO } from 'date-fns';

// Dates travel to and from the server as 'YYYY-MM-DD' strings with no time
// zone. format() builds them from the local date, so British Summer Time
// can't roll them back a day the way toISOString() would.
export const isoDate = date => format(date, 'yyyy-MM-dd');

export const today = () => isoDate(new Date());

// 'Friday 16 October'
export const longDay = text => format(parseISO(text), 'EEEE d MMMM');

// '14:30:00' → '14:30'
export const shortTime = text => (text ? text.slice(0, 5) : '');
