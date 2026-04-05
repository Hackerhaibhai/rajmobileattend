'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { Smartphone } from 'lucide-react';

import Dashboard from '@/components/dashboard/Dashboard';
import EmployeeList from '@/components/employees/EmployeeList';
import EmployeeForm from '@/components/employees/EmployeeForm';
import AttendanceScreen from '@/components/attendance/AttendanceScreen';
import DailyLogs from '@/components/attendance/DailyLogs';
import MonthlyReport from '@/components/reports/MonthlyReport';
import SalarySummary from '@/components/salary/SalarySummary';
import SettingsScreen from '@/components/settings/SettingsScreen';

import {
  LayoutDashboard,
  Users,
  Camera,
  FileBarChart,
  Settings,
  Wallet,
  CalendarDays,
} from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

function ViewRenderer({ view }: { view: string }) {
  switch (view) {
    case 'dashboard':
      return <Dashboard />;
    case 'employees':
      return <EmployeeList />;
    case 'add-employee':
      return <EmployeeForm editMode={false} />;
    case 'edit-employee':
      return <EmployeeForm editMode={true} />;
    case 'attendance':
      return <AttendanceScreen />;
    case 'daily-logs':
      return <DailyLogs />;
    case 'monthly-report':
      return <MonthlyReport />;
    case 'salary-summary':
      return <SalarySummary />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <Dashboard />;
  }
}

export default function Home() {
  const { currentView, setView, fetchEmployees } = useAppStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const showBottomNav = !['add-employee', 'edit-employee'].includes(currentView);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Raj Mobile Cover</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Kukshi, MP</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {currentView === 'employees' || currentView === 'dashboard' ? (
              <SubNavButton
                icon={CalendarDays}
                label="Logs"
                onClick={() => setView('daily-logs')}
              />
            ) : null}
            {currentView === 'employees' || currentView === 'dashboard' ? (
              <SubNavButton
                icon={Wallet}
                label="Salary"
                onClick={() => setView('salary-summary')}
              />
            ) : null}
            {currentView === 'employees' || currentView === 'dashboard' ? (
              <SubNavButton
                icon={FileBarChart}
                label="Report"
                onClick={() => setView('monthly-report')}
              />
            ) : null}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <ViewRenderer view={currentView} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="bottom-nav sticky bottom-0 z-40 bg-background/90 backdrop-blur-md border-t">
          <div className="flex items-center justify-around px-2 py-1">
            <BottomNavItem
              icon={LayoutDashboard}
              label="Home"
              active={currentView === 'dashboard'}
              onClick={() => setView('dashboard')}
            />
            <BottomNavItem
              icon={Users}
              label="Employees"
              active={
                currentView === 'employees' ||
                currentView === 'add-employee' ||
                currentView === 'edit-employee'
              }
              onClick={() => setView('employees')}
            />
            <BottomNavItem
              icon={Camera}
              label="Attend."
              active={currentView === 'attendance' || currentView === 'daily-logs'}
              onClick={() => setView('attendance')}
              highlight
            />
            <BottomNavItem
              icon={FileBarChart}
              label="Reports"
              active={
                currentView === 'monthly-report' || currentView === 'salary-summary'
              }
              onClick={() => setView('monthly-report')}
            />
            <BottomNavItem
              icon={Settings}
              label="Settings"
              active={currentView === 'settings'}
              onClick={() => setView('settings')}
            />
          </div>
        </nav>
      )}
    </div>
  );
}

function BottomNavItem({
  icon: Icon,
  label,
  active,
  onClick,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bottom-nav-item ${active ? 'active' : ''} ${
        highlight && active ? 'text-emerald-600' : ''
      }`}
    >
      <div
        className={`p-1.5 rounded-xl transition-colors ${
          active
            ? highlight
              ? 'bg-emerald-100'
              : 'bg-primary/10'
            : ''
        }`}
      >
        <Icon
          className={`h-5 w-5 transition-colors ${
            active
              ? highlight
                ? 'text-emerald-600'
                : 'text-primary'
              : 'text-muted-foreground'
          }`}
        />
      </div>
      <span className={`${active ? 'font-semibold' : ''}`}>{label}</span>
    </button>
  );
}

function SubNavButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
