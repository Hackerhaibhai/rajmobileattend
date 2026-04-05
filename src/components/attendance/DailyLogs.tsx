'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { AttendanceRecord } from '@/types';
import { formatTime, formatHours, formatDate, getEmployeeShortId } from '@/lib/format';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Hash,
  Image as ImageIcon,
  CalendarDays,
  History,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { addDays, subDays, format } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DailyLogs() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoDialog, setPhotoDialog] = useState<{ url: string; name: string } | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<{ name: string; id: string } | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchLogs = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/attendance?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(selectedDate);
  }, [selectedDate, fetchLogs]);

  const fetchEmployeeHistory = async (emp: { name: string; id: string }) => {
    setHistoryEmployee(emp);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/attendance?employeeId=${emp.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data);
      }
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const prevDay = () => setSelectedDate((d) => subDays(d, 1));
  const nextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Logs</h1>
        {!isToday && (
          <Button variant="outline" size="sm" className="rounded-xl" onClick={goToToday}>
            Aaj (Today)
          </Button>
        )}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
        <Button variant="ghost" size="icon" onClick={prevDay} className="h-10 w-10 rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-base">{formatDate(format(selectedDate, 'yyyy-MM-dd'))}</p>
          <p className="text-xs text-muted-foreground">{format(selectedDate, 'EEEE')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={nextDay} className="h-10 w-10 rounded-xl" disabled={isToday}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{presentCount}</p>
          <p className="text-xs text-emerald-600">Present</p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <p className="text-lg font-bold text-red-700 dark:text-red-400">{absentCount}</p>
          <p className="text-xs text-red-600">Absent</p>
        </div>
        <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{halfDayCount}</p>
          <p className="text-xs text-amber-600">Half Day</p>
        </div>
        <div className="text-center p-2 bg-primary/10 rounded-lg">
          <p className="text-lg font-bold text-primary">{formatHours(totalHours)}</p>
          <p className="text-xs text-primary/70">Total</p>
        </div>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Is date ke liye koi record nahi hai</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="overflow-hidden rounded-xl">
                <CardContent className="p-3">
                  {/* Employee Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    {/* Photo */}
                    {record.employee?.facePhoto ? (
                      <img
                        src={record.employee.facePhoto}
                        alt={record.employee.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-sm">
                          {record.employee?.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}

                    {/* Name + ID + Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{record.employee?.name || 'Unknown'}</p>
                        <Badge
                          className={`text-xs border-0 flex-shrink-0 ${
                            record.status === 'present'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : record.status === 'half_day'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          }`}
                        >
                          {record.status === 'half_day' ? 'Half Day' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                          <Hash className="h-2.5 w-2.5" />
                          {getEmployeeShortId(record.employeeId)}
                        </span>
                        <span className="text-xs text-muted-foreground">{record.employee?.phone}</span>
                      </div>
                    </div>

                    {/* History Button */}
                    {record.employee && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg flex-shrink-0"
                        onClick={() => fetchEmployeeHistory({ name: record.employee!.name, id: record.employeeId })}
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>

                  {/* Check-In / Check-Out Times - Clear Display */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                      <LogIn className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-emerald-600 uppercase font-medium">IN</p>
                        <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {record.checkIn ? formatTime(record.checkIn) : '--:--'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
                      <LogOut className="h-4 w-4 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-red-600 uppercase font-medium">OUT</p>
                        <p className="text-base font-bold text-red-700 dark:text-red-400 tabular-nums">
                          {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Hours + Photos + Notes */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {record.totalHours != null && record.totalHours > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <strong className="text-foreground">{formatHours(record.totalHours)}</strong>
                        </span>
                      )}
                      {record.notes && (
                        <span className="text-xs text-muted-foreground italic truncate max-w-[120px]">{record.notes}</span>
                      )}
                    </div>

                    {/* Photo Thumbnails */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {record.checkInPhoto && (
                        <button
                          onClick={() => setPhotoDialog({ url: record.checkInPhoto!, name: `${record.employee?.name} - Check In` })}
                          className="relative group"
                        >
                          <img
                            src={record.checkInPhoto}
                            alt="Check in"
                            className="w-8 h-8 rounded-lg object-cover border border-emerald-200"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="h-3 w-3 text-white" />
                          </div>
                        </button>
                      )}
                      {record.checkOutPhoto && (
                        <button
                          onClick={() => setPhotoDialog({ url: record.checkOutPhoto!, name: `${record.employee?.name} - Check Out` })}
                          className="relative group"
                        >
                          <img
                            src={record.checkOutPhoto}
                            alt="Check out"
                            className="w-8 h-8 rounded-lg object-cover border border-red-200"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon className="h-3 w-3 text-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Photo Dialog */}
      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="sm:max-w-md p-2">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-sm">{photoDialog?.name}</DialogTitle>
          </DialogHeader>
          {photoDialog && (
            <img
              src={photoDialog.url}
              alt={photoDialog.name}
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Employee History Sheet */}
      <Sheet open={!!historyEmployee} onOpenChange={(open) => !open && setHistoryEmployee(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{historyEmployee?.name?.charAt(0)}</span>
              </div>
              <div className="text-left">
                <SheetTitle className="text-base">{historyEmployee?.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {historyEmployee ? getEmployeeShortId(historyEmployee.id) : ''} · Full History
                  </span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-3">
            {historyLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-10">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Koi record nahi</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(80vh-100px)] px-4">
                <div className="space-y-2 pb-4">
                  {historyRecords.map((record, i) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{formatDate(record.date)}</span>
                            </div>
                            <Badge className={`text-xs border-0 ${
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700'
                                : record.status === 'half_day'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {record.status === 'half_day' ? 'Half Day' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-2.5 py-1.5">
                              <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                              <div>
                                <p className="text-[9px] text-emerald-600 uppercase font-medium">IN</p>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                  {record.checkIn ? formatTime(record.checkIn) : '--:--'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-2.5 py-1.5">
                              <LogOut className="h-3.5 w-3.5 text-red-600" />
                              <div>
                                <p className="text-[9px] text-red-600 uppercase font-medium">OUT</p>
                                <p className="text-sm font-bold text-red-700 dark:text-red-400 tabular-nums">
                                  {record.checkOut ? formatTime(record.checkOut) : '--:--'}
                                </p>
                              </div>
                            </div>
                          </div>
                          {record.totalHours != null && record.totalHours > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Total: <strong className="text-foreground">{formatHours(record.totalHours)}</strong></span>
                            </div>
                          )}
                          {record.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{record.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
