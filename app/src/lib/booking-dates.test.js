import { expect, test } from 'bun:test';
import { bookingDates } from './booking-dates';

test('booking date picker starts on the clinic date and spans 30 days across years', () => {
  const dates = bookingDates(new Date('2026-12-31T22:00:00Z'));
  expect(dates).toHaveLength(30);
  expect(dates[0]).toBe('2027-01-01');
  expect(dates[29]).toBe('2027-01-30');
  expect(new Set(dates).size).toBe(30);
  expect(bookingDates(new Date('2028-02-28T12:00:00Z'))[1]).toBe('2028-02-29');
});
