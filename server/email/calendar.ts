export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addWorkingDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }
  
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setTime(result.getTime() + (hours * 60 * 60 * 1000));
  return result;
}

export function getNextWorkingDay(date: Date): Date {
  const result = new Date(date);
  
  if (isWeekend(result)) {
    while (isWeekend(result)) {
      result.setDate(result.getDate() + 1);
    }
    result.setHours(9, 0, 0, 0);
  }
  
  return result;
}

export function calculateScheduledTime(
  baseDate: Date,
  delayHours: number,
  delayType: 'hours' | 'working_days'
): Date {
  if (delayType === 'working_days') {
    const days = Math.ceil(delayHours / 24);
    const scheduled = addWorkingDays(baseDate, days);
    scheduled.setHours(10, 0, 0, 0);
    return scheduled;
  } else {
    const scheduled = addHours(baseDate, delayHours);
    return getNextWorkingDay(scheduled);
  }
}
