'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { EmployeeSalary } from '@/types';
import { formatCurrency, formatHours, getMonthName } from '@/lib/format';
import {
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Clock,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  Plus,
  Minus,
} from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth } from 'date-fns';
import dynamic from 'next/dynamic';
import ShareButtons from '@/components/share/ShareButtons';

const ShareableSalaryCard = dynamic(
  () => import('@/components/share/ShareableSalaryCard').then((m) => m.default),
  { ssr: false }
);

export default function SalarySummary() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const monthStr = format(selectedMonth, 'yyyy-MM');
  const title = `Salary-Report-${monthStr}`;

  const fetchSalaries = useCallback(async (month: Date) => {
    try {
      setLoading(true);
      const mStr = format(month, 'yyyy-MM');
      const res = await fetch(`/api/salary?month=${mStr}`);
      if (res.ok) {
        const data = await res.json();
        setSalaries(data);
      }
    } catch (error) {
      console.error('Failed to fetch salary data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalaries(selectedMonth);
  }, [selectedMonth, fetchSalaries]);

  const prevMonth = () => setSelectedMonth((d) => subMonths(d, 1));
  const nextMonth = () => {
    const now = new Date();
    const next = addMonths(selectedMonth, 1);
    if (next <= startOfMonth(now)) {
      setSelectedMonth(next);
    }
  };

  const totalRegular = salaries.reduce((sum, s) => sum + s.regularPay, 0);
  const totalOvertime = salaries.reduce((sum, s) => sum + s.overtimePay, 0);
  const totalAdjustments = salaries.reduce((sum, s) => sum + s.adjustments, 0);
  const totalSalary = salaries.reduce((sum, s) => sum + s.totalSalary, 0);

  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM');

  const handleShare = () => {
    setShowShareCard(true);
    // Wait for card to render, then share
    setTimeout(() => {
      const el = document.getElementById('shareable-report');
      if (el) {
        // Scroll into view to make sure it's rendered
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salary Summary</h1>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-base">{getMonthName(monthStr)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="h-10 w-10 rounded-xl"
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Total Summary */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Regular Pay</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalRegular)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Overtime Pay</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalOvertime)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CircleDollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Adjustments</span>
            </div>
            <p className={`text-lg font-bold ${totalAdjustments >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalAdjustments >= 0 ? '+' : ''}{formatCurrency(totalAdjustments)}
            </p>
          </Card>
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Salary</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalSalary)}</p>
          </Card>
        </div>
      )}

      {/* Share Button - Big and Prominent */}
      {!loading && salaries.length > 0 && (
        <ShareButtons elementId="shareable-report" title={title} />
      )}

      {/* Employee Salary List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Employee-wise Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : salaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Is mahine ke liye koi salary data nahi hai
            </p>
          ) : (
            <div className="space-y-2">
              {salaries.map((salary) => (
                <div key={salary.employeeId}>
                  <div
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() =>
                      setExpandedId(expandedId === salary.employeeId ? null : salary.employeeId)
                    }
                  >
                    {salary.employeePhoto ? (
                      <img src={salary.employeePhoto} alt={salary.employeeName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">{salary.employeeName.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{salary.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {salary.daysWorked} days · {formatHours(salary.totalHours)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base">{formatCurrency(salary.totalSalary)}</p>
                      {salary.adjustments !== 0 && (
                        <p className={`text-xs ${salary.adjustments > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {salary.adjustments > 0 ? '+' : ''}{formatCurrency(salary.adjustments)} adj
                        </p>
                      )}
                    </div>
                  </div>

                  {expandedId === salary.employeeId && (
                    <div className="mt-1 p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regular Hours</span>
                        <span className="font-medium">{formatHours(salary.regularHours)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overtime Hours</span>
                        <span className="font-medium">{formatHours(salary.overtimeHours)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Regular Pay</span>
                        <span className="font-medium">{formatCurrency(salary.regularPay)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overtime Pay</span>
                        <span className="font-medium">{formatCurrency(salary.overtimePay)}</span>
                      </div>
                      {salary.adjustments !== 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            {salary.adjustments > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            Adjustments
                          </span>
                          <span className={`font-medium ${salary.adjustments > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(salary.adjustments))}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(salary.totalSalary)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grand Total */}
      {!loading && salaries.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-base">Grand Total ({salaries.length} employees)</span>
            </div>
            <span className="text-2xl font-bold text-primary">{formatCurrency(totalSalary)}</span>
          </CardContent>
        </Card>
      )}

      {/* Hidden Shareable Card (only rendered when needed for screenshot) */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <ShareableSalaryCard month={monthStr} salaries={salaries} show={showShareCard} />
      </div>
    </div>
  );
}
