'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAppStore } from '@/store/useAppStore';
import type { AttendanceRecord, Employee } from '@/types';
import {
  formatTime,
  formatHours,
  formatDate,
  getCurrentTime,
  getTodayDate,
  getCurrentTimeHHmm,
  getEmployeeShortId,
  calcRunningDuration,
} from '@/lib/format';
import {
  LogIn,
  LogOut,
  UserCircle,
  Clock,
  CheckCircle,
  History,
  Hash,
  Timer,
  Calendar,
  ArrowDown,
  IndianRupee,
  ScanFace,
  ShieldCheck,
  ShieldX,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const CameraCapture = dynamic(
  () => import('@/components/attendance/CameraCapture').then((m) => m.default),
  { ssr: false }
);

type FaceRecognitionResult = {
  matched: boolean;
  employeeId: string | null;
  employeeName: string | null;
  confidence: string | null;
  message: string;
};

export default function AttendanceScreen() {
  const { activeEmployees, fetchEmployees } = useAppStore();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [checkAction, setCheckAction] = useState<{
    type: 'checkin' | 'checkout';
    employee: Employee;
    attendanceId?: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runningDurations, setRunningDurations] = useState<Record<string, string>>({});

  // Face recognition state
  const [faceScannerOpen, setFaceScannerOpen] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'idle' | 'scanning' | 'recognized' | 'failed'>('idle');
  const [faceResult, setFaceResult] = useState<FaceRecognitionResult | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [recognizedEmployee, setRecognizedEmployee] = useState<Employee | null>(null);

  // Live clock + running duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
      const durations: Record<string, string> = {};
      attendance.forEach((a) => {
        if (a.checkIn && !a.checkOut) {
          durations[a.employeeId] = calcRunningDuration(a.checkIn);
        }
      });
      setRunningDurations(durations);
    }, 1000);
    return () => clearInterval(timer);
  }, [attendance]);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attendance?date=${getTodayDate()}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, [fetchAttendance, fetchEmployees]);

  const getEmployeeAttendance = (employeeId: string) => {
    return attendance.find((a) => a.employeeId === employeeId);
  };

  const fetchEmployeeHistory = async (employee: Employee) => {
    setHistoryEmployee(employee);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/attendance?employeeId=${employee.id}`);
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

  const handleCheckIn = async (employee: Employee, photo?: string) => {
    setProcessing(true);
    try {
      const now = getCurrentTimeHHmm();
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          checkIn: now,
          date: getTodayDate(),
          checkInPhoto: photo || null,
        }),
      });
      if (!res.ok) throw new Error('Check-in failed');
      toast.success(`${employee.name} checked in at ${formatTime(now)}`);
      await fetchAttendance();
    } catch {
      toast.error('Failed to check in');
    } finally {
      setProcessing(false);
      setCheckAction(null);
    }
  };

  const handleCheckOut = async (employee: Employee, attendanceId: string, photo?: string) => {
    setProcessing(true);
    try {
      const now = getCurrentTimeHHmm();
      const res = await fetch(`/api/attendance/${attendanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkOut: now,
          checkOutPhoto: photo || null,
        }),
      });
      if (!res.ok) throw new Error('Check-out failed');
      toast.success(`${employee.name} checked out at ${formatTime(now)}`);
      await fetchAttendance();
    } catch {
      toast.error('Failed to check out');
    } finally {
      setProcessing(false);
      setCheckAction(null);
    }
  };

  // ===== FACE RECOGNITION FLOW =====
  const handleFaceCaptured = async (photoBase64: string) => {
    setFacePhoto(photoBase64);
    setFaceStatus('scanning');
    setFaceResult(null);

    try {
      const res = await fetch('/api/face-recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: photoBase64 }),
      });

      const result: FaceRecognitionResult = await res.json();

      if (result.matched && result.employeeId) {
        // Find employee in active employees
        const emp = activeEmployees.find((e) => e.id === result.employeeId);
        if (emp) {
          setRecognizedEmployee(emp);
          setFaceStatus('recognized');
          setFaceResult(result);

          // Wait 1.5 seconds for visual feedback, then auto check-in/out
          setTimeout(async () => {
            const record = getEmployeeAttendance(emp.id);
            if (!record) {
              await handleCheckIn(emp, photoBase64);
            } else if (record.checkIn && !record.checkOut) {
              await handleCheckOut(emp, record.id, photoBase64);
            }
            // Close scanner after action
            setFaceScannerOpen(false);
            setTimeout(() => {
              setFaceStatus('idle');
              setFaceResult(null);
              setRecognizedEmployee(null);
              setFacePhoto(null);
            }, 300);
          }, 1500);
        } else {
          setFaceStatus('failed');
          setFaceResult({ ...result, message: 'Employee not found in active list' });
        }
      } else {
        setFaceStatus('failed');
        setFaceResult(result);
      }
    } catch (err) {
      console.error('Face recognition error:', err);
      setFaceStatus('failed');
      setFaceResult({
        matched: false,
        employeeId: null,
        employeeName: null,
        confidence: 'none',
        message: 'Network error. Please try again.',
      });
    }
  };

  const handleRetryFace = () => {
    setFaceStatus('idle');
    setFaceResult(null);
    setFacePhoto(null);
    setRecognizedEmployee(null);
  };

  const handleCloseFaceScanner = () => {
    setFaceScannerOpen(false);
    setTimeout(() => {
      setFaceStatus('idle');
      setFaceResult(null);
      setFacePhoto(null);
      setRecognizedEmployee(null);
    }, 300);
  };

  const handleCapture = (photoBase64: string) => {
    if (!checkAction) return;
    if (checkAction.type === 'checkin') {
      handleCheckIn(checkAction.employee, photoBase64);
    } else if (checkAction.type === 'checkout' && checkAction.attendanceId) {
      handleCheckOut(checkAction.employee, checkAction.attendanceId, photoBase64);
    }
  };

  const handleSkipCamera = () => {
    if (!checkAction) return;
    if (checkAction.type === 'checkin') {
      handleCheckIn(checkAction.employee);
    } else if (checkAction.type === 'checkout' && checkAction.attendanceId) {
      handleCheckOut(checkAction.employee, checkAction.attendanceId);
    }
  };

  const handleCheckClick = (employee: Employee) => {
    const record = getEmployeeAttendance(employee.id);
    if (!record) {
      setCheckAction({ type: 'checkin', employee });
    } else if (record.checkIn && !record.checkOut) {
      setCheckAction({ type: 'checkout', employee, attendanceId: record.id });
    }
  };

  const checkedInCount = attendance.filter((a) => a.checkIn && !a.checkOut).length;
  const todayHours = attendance.reduce((s, r) => s + (r.totalHours || 0), 0);
  const completedCount = attendance.filter((a) => a.checkIn && a.checkOut).length;

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header with Clock */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-xs text-muted-foreground">{getTodayDate()}</p>
          </div>
          <p className="text-3xl font-bold text-primary tabular-nums">{currentTime}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">{checkedInCount}</span>
            <span className="text-muted-foreground">checked in</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{completedCount}</span>
            <span className="text-muted-foreground">done</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{formatHours(todayHours)}</span>
            <span className="text-muted-foreground">total</span>
          </span>
        </div>
      </div>

      {/* ===== FACE RECOGNITION CARD ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
                <ScanFace className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">Face Recognition</h2>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                  Scan face to auto check-in / check-out
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <Button
              size="lg"
              className="w-full h-14 text-base font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
              onClick={() => setFaceScannerOpen(true)}
            >
              <ScanFace className="h-5 w-5 mr-2" />
              Scan Face
            </Button>
            <p className="text-[10px] text-center text-emerald-600/60 dark:text-emerald-400/60 mt-2">
              Face will be matched with registered employee photos
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== MANUAL SECTION HEADER ===== */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground px-2">Or tap employee to check-in manually</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : activeEmployees.length === 0 ? (
        <div className="text-center py-12">
          <UserCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Koi active employee nahi hai</p>
          <p className="text-sm text-muted-foreground">Pehle employees add karein</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeEmployees.map((employee, index) => {
            const record = getEmployeeAttendance(employee.id);
            const isCheckedIn = !!record?.checkIn;
            const isCheckedOut = !!record?.checkOut;
            const status = isCheckedOut
              ? 'completed'
              : isCheckedIn
              ? 'checked-in'
              : 'not-checked-in';
            const shortId = getEmployeeShortId(employee.id);

            return (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.04 }}
              >
                <Card className="overflow-hidden rounded-2xl">
                  <CardContent className="p-0">
                    {/* Employee Header Row */}
                    <div className="flex items-center gap-3 p-4 pb-3">
                      {employee.facePhoto ? (
                        <img
                          src={employee.facePhoto}
                          alt={employee.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
                          <span className="text-primary font-bold text-lg">
                            {employee.name.charAt(0)}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base truncate">{employee.name}</p>
                          {employee.facePhoto && (
                            <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <ScanFace className="h-2.5 w-2.5 mr-0.5" />
                              Face
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            <Hash className="h-3 w-3" />
                            {shortId}
                          </span>
                          <span className="text-xs text-muted-foreground">{employee.phone}</span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl flex-shrink-0"
                        onClick={() => fetchEmployeeHistory(employee)}
                      >
                        <History className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>

                    {/* Check-in / Check-out Times */}
                    <div className="px-4 pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl p-3 text-center ${
                          status === 'not-checked-in'
                            ? 'bg-muted/50'
                            : 'bg-emerald-50 dark:bg-emerald-950/30'
                        }`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Check-In</span>
                          </div>
                          <p className={`text-2xl font-bold tabular-nums ${
                            status === 'not-checked-in' ? 'text-muted-foreground/40' : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {record?.checkIn ? formatTime(record.checkIn) : '--:--'}
                          </p>
                        </div>

                        <div className={`rounded-xl p-3 text-center ${
                          status !== 'completed'
                            ? 'bg-muted/50'
                            : 'bg-red-50 dark:bg-red-950/30'
                        }`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <LogOut className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">Check-Out</span>
                          </div>
                          <p className={`text-2xl font-bold tabular-nums ${
                            status !== 'completed' ? 'text-muted-foreground/40' : 'text-red-700 dark:text-red-400'
                          }`}>
                            {record?.checkOut ? formatTime(record.checkOut) : '--:--'}
                          </p>
                        </div>
                      </div>

                      {/* Duration / Status Row */}
                      <div className="flex items-center justify-between mt-2 px-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {status === 'checked-in' && (
                            <span className="text-sm font-semibold text-primary flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {runningDurations[employee.id] || '...'}
                              <span className="text-xs text-muted-foreground font-normal">running</span>
                            </span>
                          )}
                          {status === 'completed' && record?.totalHours != null && (
                            <span className="text-sm font-semibold text-foreground">
                              {formatHours(record.totalHours)}
                              <span className="text-xs text-muted-foreground ml-1">total</span>
                            </span>
                          )}
                          {status === 'not-checked-in' && (
                            <span className="text-sm text-muted-foreground">Not yet</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IndianRupee className="h-3 w-3" />
                          <span>{employee.hourlyRate}/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {status !== 'completed' && (
                      <div className="px-4 pb-4">
                        <Button
                          size="lg"
                          className={`w-full h-13 text-base font-bold rounded-xl ${
                            status === 'checked-in'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          onClick={() => handleCheckClick(employee)}
                          disabled={processing}
                        >
                          {status === 'checked-in' ? (
                            <>
                              <LogOut className="h-5 w-5 mr-2" />
                              Check-Out Now
                            </>
                          ) : (
                            <>
                              <LogIn className="h-5 w-5 mr-2" />
                              Check-In Now
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {status === 'completed' && (
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-center gap-2 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Completed for today</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ===== FACE SCANNER DIALOG ===== */}
      <Dialog open={faceScannerOpen} onOpenChange={(open) => !open && handleCloseFaceScanner()}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-emerald-600" />
              Face Recognition
            </DialogTitle>
            <DialogDescription>
              {faceStatus === 'idle' && 'Apna face camera ke saamne rakhein aur Capture dabayein'}
              {faceStatus === 'scanning' && 'Face recognize ho raha hai...'}
              {faceStatus === 'recognized' && 'Face recognized! Auto check-in/out ho raha hai...'}
              {faceStatus === 'failed' && 'Face recognize nahi hua'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            <AnimatePresence mode="wait">
              {(faceStatus === 'idle') && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CameraCapture
                    onCapture={handleFaceCaptured}
                    showSkip={false}
                  />
                </motion.div>
              )}

              {faceStatus === 'scanning' && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-8 gap-4"
                >
                  {/* Scanning preview with captured photo */}
                  {facePhoto && (
                    <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-emerald-400">
                      <img src={facePhoto} alt="Scanning" className="w-full h-full object-cover" />
                      {/* Scanning line animation */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="w-40 h-0.5 bg-emerald-400 shadow-lg shadow-emerald-400/50"
                          animate={{ y: [-60, 60, -60] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                      {/* Corner brackets */}
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
                  <p className="text-xs text-muted-foreground">AI matching registered faces</p>
                </motion.div>
              )}

              {faceStatus === 'recognized' && recognizedEmployee && (
                <motion.div
                  key="recognized"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-6 gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                    className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center ring-4 ring-emerald-400 shadow-xl shadow-emerald-600/20"
                  >
                    {recognizedEmployee.facePhoto ? (
                      <img
                        src={recognizedEmployee.facePhoto}
                        alt={recognizedEmployee.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <ShieldCheck className="h-10 w-10 text-emerald-600" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      {recognizedEmployee.name}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center justify-center gap-2 mt-1"
                    >
                      <span className="text-xs text-muted-foreground">
                        <Hash className="h-3 w-3 inline mr-0.5" />
                        {getEmployeeShortId(recognizedEmployee.id)}
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/50 dark:text-emerald-400 text-xs">
                        Verified
                      </Badge>
                    </motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-sm text-emerald-600"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Auto checking {getEmployeeAttendance(recognizedEmployee.id)?.checkIn ? 'out' : 'in'}...</span>
                  </motion.div>
                </motion.div>
              )}

              {faceStatus === 'failed' && (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-6 gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center ring-4 ring-red-300"
                  >
                    <ShieldX className="h-10 w-10 text-red-500" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">Not Recognized</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {faceResult?.message || 'Face not matched with any registered employee'}
                    </p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl"
                      onClick={handleRetryFace}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 h-12 rounded-xl"
                      onClick={handleCloseFaceScanner}
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Check-in Camera Dialog */}
      <Dialog
        open={!!checkAction}
        onOpenChange={(open) => {
          if (!open) setCheckAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checkAction?.type === 'checkin'
                ? `Check In: ${checkAction?.employee.name}`
                : `Check Out: ${checkAction?.employee.name}`}
            </DialogTitle>
            <DialogDescription>
              Face frame mein rakhein aur Capture dabayein
            </DialogDescription>
          </DialogHeader>

          {processing ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-10 w-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-muted-foreground">Processing...</p>
            </div>
          ) : (
            <div className="py-2">
              <CameraCapture onCapture={handleCapture} onSkip={handleSkipCamera} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full History Sheet */}
      <Sheet open={!!historyEmployee} onOpenChange={(open) => !open && setHistoryEmployee(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-3">
              {historyEmployee?.facePhoto ? (
                <img
                  src={historyEmployee.facePhoto}
                  alt={historyEmployee.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">{historyEmployee?.name?.charAt(0)}</span>
                </div>
              )}
              <div className="text-left">
                <SheetTitle>{historyEmployee?.name}</SheetTitle>
                <SheetDescription>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {historyEmployee ? getEmployeeShortId(historyEmployee.id) : ''} · Full Attendance History
                  </span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4">
            {historyLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Koi attendance record nahi mila</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(85vh-120px)] px-4">
                <div className="space-y-2 pb-4">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {historyRecords.filter((r) => r.status === 'present' || r.status === 'half_day').length}
                      </p>
                      <p className="text-xs text-emerald-600">Days Worked</p>
                    </div>
                    <div className="text-center p-2.5 bg-primary/10 rounded-xl">
                      <p className="text-lg font-bold text-primary">
                        {formatHours(historyRecords.reduce((s, r) => s + (r.totalHours || 0), 0))}
                      </p>
                      <p className="text-xs text-primary/70">Total Hours</p>
                    </div>
                    <div className="text-center p-2.5 bg-red-50 dark:bg-red-950/30 rounded-xl">
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">
                        {historyRecords.filter((r) => r.status === 'absent').length}
                      </p>
                      <p className="text-xs text-red-600">Absent</p>
                    </div>
                  </div>

                  {historyRecords.map((record, i) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <Card className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{formatDate(record.date)}</span>
                            </div>
                            <Badge
                              className={`text-xs border-0 ${
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

                          <div className="grid grid-cols-2 gap-2">
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

                          {record.totalHours != null && record.totalHours > 0 && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Total: <strong className="text-foreground">{formatHours(record.totalHours)}</strong></span>
                            </div>
                          )}

                          {record.notes && (
                            <p className="text-xs text-muted-foreground mt-1.5 italic flex items-center gap-1">
                              <ArrowDown className="h-3 w-3" />
                              {record.notes}
                            </p>
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
