export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatTime(timeStr: string | null): string {
  if (!timeStr) return '--:--';
  // Handle HH:mm format directly
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  }
  // Fallback: parse as ISO date string
  const date = new Date(timeStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  return timeStr;
}

export function getCurrentTimeHHmm(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getEmployeeShortId(fullId: string): string {
  return fullId.slice(-6).toUpperCase();
}

export function calcRunningDuration(checkInHHmm: string): string {
  const [inH, inM] = checkInHHmm.split(':').map(Number);
  const now = new Date();
  const inMinutes = inH * 60 + inM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let diff = nowMinutes - inMinutes;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h ${m}m`;
}
