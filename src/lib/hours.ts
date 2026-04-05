/**
 * Calculate total hours worked between check-in and check-out times.
 * Times are in "HH:mm" format.
 */
export function calculateHours(checkIn: string, checkOut: string): number {
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  return Math.round(((outH + outM / 60) - (inH + inM / 60)) * 100) / 100;
}

/**
 * Split total hours into regular and overtime based on standard work hours.
 */
export function splitHours(
  totalHours: number,
  standardHours: number = 9
): { regular: number; overtime: number } {
  if (totalHours <= standardHours)
    return { regular: totalHours, overtime: 0 };
  return {
    regular: standardHours,
    overtime: Math.round((totalHours - standardHours) * 100) / 100,
  };
}
