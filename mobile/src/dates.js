// Dates travel to and from the server as 'YYYY-MM-DD' strings with no time
// zone. toISOString() converts to UTC first, which in British Summer Time can
// roll the date back a day — so always build the string from local parts.
export function isoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function today() {
  return isoDate(new Date());
}

// 'Friday 2 October'
export function longDay(text) {
  return fromIsoDate(text).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// 'Fri 2 Oct'
export function shortDay(text) {
  return fromIsoDate(text).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// '14:30:00' → '14:30'
export function shortTime(text) {
  return text ? text.slice(0, 5) : '';
}

// The weeks shown for one month, Monday first, padded with nulls before the
// 1st and after the last day so every row has seven cells.
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // getDay() counts from Sunday = 0. Shift so Monday = 0.
  const leadingBlanks = (first.getDay() + 6) % 7;

  const cells = Array(leadingBlanks).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(isoDate(new Date(year, month, day)));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let start = 0; start < cells.length; start += 7) {
    weeks.push(cells.slice(start, start + 7));
  }
  return weeks;
}
