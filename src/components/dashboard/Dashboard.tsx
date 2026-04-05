'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import type { DashboardStats, AttendanceRecord, Employee } from '@/types';
import { formatCurrency, formatHours, getCurrentTime, getTodayDate, formatTime, getCurrentTimeHHmm, getEmployeeShortId } from '@/lib/format';
import {
  Users,
  UserCheck,
  Clock,
  IndianRupee,
  Plus,
  ScanFace,
  TrendingUp,
  ShieldCheck,
  ShieldX,
  Loader2,
  LogIn,
  LogOut,
  Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import dynamic from 'next/dynamic';

const AutoCapture = dynamic(
  () => import('@/components/attendance/AutoCapture').then((m) => m.default),
  { ssr: false }
);

type FaceRecognitionResult = {
  matched: boolean;
  employeeId: string | null;
  employeeName: string | null;
  confidence: string | null;
  message: string;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [weeklyData, setWeeklyData] = useState<{ day: string; hours: number }[]>([]);
  const { setView, activeEmployees } = useAppStore();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [phase, setPhase] = useState<'capture' | 'scanning' | 'recognized' | 'failed'>('capture');
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(null);
  const [failMessage, setFailMessage] = useState('');

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(getCurrentTime()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, attendanceRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch(`/api/attendance?date=${getTodayDate()}`),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (attendanceRes.ok) setAllRecords(await attendanceRes.json());
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date().getDay();
      setWeeklyData(days.map((day, i) => ({ day, hours: i <= today - 1 ? Math.round(Math.random() * 40 + 20) / 10 : 0 })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const checkedInRecords = allRecords.filter((r) => r.checkIn && !r.checkOut);
  const getRecord = (eid: string) => allRecords.find((r) => r.employeeId === eid);

  // ===== AUTO CAPTURE → RECOGNIZE → CHECK-IN/OUT =====
  const handleAutoCaptured = async (photoBase64: string) => {
    setFacePhoto(photoBase64);
    setPhase('scanning');

    try {
      const res = await fetch('/api/face-recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: photoBase64 }),
      });
      const result: FaceRecognitionResult = await res.json();

      if (result.matched && result.employeeId) {
        const emp = activeEmployees.find((e) => e.id === result.employeeId);
        if (emp) {
          setRecognizedEmployee(emp);
          setPhase('recognized');

          setTimeout(async () => {
            const record = getRecord(emp.id);
            const now = getCurrentTimeHHmm();

            if (!record) {
              const r = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: emp.id, checkIn: now, date: getTodayDate(), checkInPhoto: photoBase64 }),
              });
              if (r.ok) toast.success(`${emp.name} checked in at ${formatTime(now)}`); else toast.error('Check-in failed');
            } else if (record.checkIn && !record.checkOut) {
              const r = await fetch(`/api/attendance/${record.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkOut: now, checkOutPhoto: photoBase64 }),
              });
              if (r.ok) toast.success(`${emp.name} checked out at ${formatTime(now)}`); else toast.error('Check-out failed');
            } else {
              toast.info(`${emp.name} already completed today`);
            }
            await fetchDashboard();
            closeScanner();
          }, 1500);
        } else {
          setPhase('failed');
          setFailMessage('Employee not found');
        }
      } else {
        setPhase('failed');
        setFailMessage(result.message || 'Face not matched');
      }
    } catch {
      setPhase('failed');
      setFailMessage('Network error');
    }
  };

  const closeScanner = () => {
    setScannerOpen(false);
    setTimeout(() => {
      setPhase('capture');
      setFacePhoto(null);
      setRecognizedEmployee(null);
      setFailMessage('');
    }, 300);
  };

  const handleRetry = () => {
    setPhase('capture');
    setFacePhoto(null);
    setRecognizedEmployee(null);
    setFailMessage('');
  };

  const statCards = [
    { title: 'Active Employees', value: stats?.activeEmployees ?? '--', icon: Users, color: 'text-amber-600 bg-amber-100' },
    { title: 'Checked In Today', value: stats?.checkedInToday ?? '--', icon: UserCheck, color: 'text-emerald-600 bg-emerald-100' },
    { title: 'Hours Today', value: stats?.totalHoursToday != null ? formatHours(stats.totalHoursToday) : '--', icon: Clock, color: 'text-orange-600 bg-orange-100' },
    { title: 'Pending Salary', value: stats?.pendingSalary != null ? formatCurrency(stats.pendingSalary) : '--', icon: IndianRupee, color: 'text-rose-600 bg-rose-100' },
  ];

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Clock */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">{getTodayDate()}</p>
        <h2 className="text-4xl font-bold tracking-tight">{currentTime}</h2>
        <p className="text-sm text-muted-foreground">Kukshi, MP</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((c) => (
            <Card key={c.title} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{c.title}</p>
                  <p className="text-xl font-bold">{c.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${c.color}`}><c.icon className="h-5 w-5" /></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* BIG CAPTURE BUTTON — One Click, Done! */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Button
          size="lg"
          className="w-full h-16 text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-transform"
          onClick={() => setScannerOpen(true)}
        >
          <ScanFace className="h-6 w-6 mr-2" />
          Capture — Check-In / Out
        </Button>
        <p className="text-[10px] text-center text-muted-foreground mt-1.5">
          Ek click — face scan — auto check-in/out
        </p>
      </motion.div>

      {/* Add Employee */}
      <Button size="lg" className="w-full h-12 text-base font-semibold rounded-xl" variant="outline" onClick={() => setView('add-employee')}>
        <Plus className="h-5 w-5 mr-2" />Add Employee
      </Button>

      {/* Weekly Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Weekly Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} formatter={(v: number) => [`${v}h`, 'Hours']} />
                <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Currently Working */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />Currently Working
            {checkedInRecords.length > 0 && <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-auto">{checkedInRecords.length} active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : checkedInRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No employees checked in yet today</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {checkedInRecords.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {r.employee?.facePhoto ? (
                      <img src={r.employee.facePhoto} alt={r.employee.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">{r.employee?.name?.charAt(0) || '?'}</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{r.employee?.name || 'Unknown'}</p>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          <Hash className="h-2.5 w-2.5 inline mr-0.5" />{r.employee ? getEmployeeShortId(r.employee.id) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground"><LogIn className="h-3 w-3 inline mr-0.5 text-emerald-600" />Since {r.checkIn ? formatTime(r.checkIn) : ''}</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 status-pulse">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== AUTO SCAN DIALOG ===== */}
      <Dialog open={scannerOpen} onOpenChange={(o) => !o && closeScanner()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-emerald-600" />
              Face Scan
            </DialogTitle>
            <DialogDescription>
              {phase === 'capture' && 'Camera auto-capture karega — face frame mein rakhein'}
              {phase === 'scanning' && 'Face recognize ho raha hai...'}
              {phase === 'recognized' && 'Done! Check-in/out ho gaya'}
              {phase === 'failed' && 'Face recognize nahi hua'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {/* Phase 1: Auto Capture — camera opens, 2 sec countdown, auto snaps */}
              {phase === 'capture' && (
                <motion.div key="auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AutoCapture onCaptured={handleAutoCaptured} />
                </motion.div>
              )}

              {/* Phase 2: Scanning */}
              {phase === 'scanning' && (
                <motion.div key="scanning" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-8 gap-4">
                  {facePhoto && (
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-400">
                      <img src={facePhoto} alt="Scanning" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div className="w-40 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/50" animate={{ y: [-60, 60, -60] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                      </div>
                      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">Recognizing face...</span>
                  </div>
                </motion.div>
              )}

              {/* Phase 3: Recognized ✅ */}
              {phase === 'recognized' && recognizedEmployee && (
                <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-6 gap-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }} className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-4 ring-emerald-400 shadow-xl shadow-emerald-600/20">
                    {recognizedEmployee.facePhoto ? (
                      <img src={recognizedEmployee.facePhoto} alt={recognizedEmployee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <ShieldCheck className="h-10 w-10 text-emerald-600" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{recognizedEmployee.name}</motion.p>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground"><Hash className="h-3 w-3 inline mr-0.5" />{getEmployeeShortId(recognizedEmployee.id)}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Verified</Badge>
                    </motion.div>
                  </div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-2 text-sm text-emerald-600">
                    {getRecord(recognizedEmployee.id)?.checkIn && !getRecord(recognizedEmployee.id)?.checkOut
                      ? <><LogOut className="h-4 w-4" /><span>Checking out...</span></>
                      : <><LogIn className="h-4 w-4" /><span>Checking in...</span></>}
                  </motion.div>
                </motion.div>
              )}

              {/* Phase 4: Failed ❌ */}
              {phase === 'failed' && (
                <motion.div key="fail" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-6 gap-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center ring-4 ring-red-300">
                    <ShieldX className="h-10 w-10 text-red-500" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">Not Recognized</p>
                    <p className="text-sm text-muted-foreground mt-1">{failMessage}</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={handleRetry}>Try Again</Button>
                    <Button variant="ghost" className="flex-1 h-12 rounded-xl" onClick={closeScanner}>Close</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
