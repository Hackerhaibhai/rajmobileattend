import { create } from 'zustand';
import type { AppView, Employee, AttendanceRecord } from '@/types';
import { getTodayDate, getCurrentMonth } from '@/lib/format';

interface AppState {
  currentView: AppView;
  selectedEmployeeId: string | null;
  selectedMonth: string;
  sidebarOpen: boolean;

  // Employee data
  employees: Employee[];
  activeEmployees: Employee[];

  // Navigation
  setView: (view: AppView) => void;
  selectEmployee: (id: string | null) => void;
  setMonth: (month: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // CRUD operations (call API routes)
  fetchEmployees: () => Promise<void>;
  createEmployee: (data: Partial<Employee>) => Promise<Employee>;
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;

  // Attendance
  checkIn: (employeeId: string, checkIn: string, date: string, checkInPhoto?: string) => Promise<void>;
  checkOut: (attendanceId: string, checkOut: string, checkOutPhoto?: string, notes?: string) => Promise<void>;

  // Refresh data
  refresh: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  selectedEmployeeId: null,
  selectedMonth: getCurrentMonth(),
  sidebarOpen: false,

  employees: [],
  activeEmployees: [],

  setView: (view) => set({ currentView: view }),
  selectEmployee: (id) => set({ selectedEmployeeId: id }),
  setMonth: (month) => set({ selectedMonth: month }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  fetchEmployees: async () => {
    try {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      const employees: Employee[] = await res.json();
      set({
        employees,
        activeEmployees: employees.filter((e) => e.isActive),
      });
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  },

  createEmployee: async (data) => {
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create employee' }));
      throw new Error(err.error || 'Failed to create employee');
    }
    const employee: Employee = await res.json();
    set((state) => ({
      employees: [...state.employees, employee],
      activeEmployees: [...state.activeEmployees, employee],
    }));
    return employee;
  },

  updateEmployee: async (id, data) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update employee' }));
      throw new Error(err.error || 'Failed to update employee');
    }
    const employee: Employee = await res.json();
    set((state) => ({
      employees: state.employees.map((e) => (e.id === id ? employee : e)),
      activeEmployees: state.activeEmployees
        .map((e) => (e.id === id ? employee : e))
        .filter((e) => e.isActive),
    }));
    return employee;
  },

  deleteEmployee: async (id) => {
    const res = await fetch(`/api/employees/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete employee');
    set((state) => ({
      employees: state.employees.map((e) =>
        e.id === id ? { ...e, isActive: false } : e
      ),
      activeEmployees: state.activeEmployees.filter((e) => e.id !== id),
    }));
  },

  checkIn: async (employeeId, checkIn, date, checkInPhoto) => {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, checkIn, date, checkInPhoto }),
    });
    if (!res.ok) throw new Error('Failed to check in');
  },

  checkOut: async (attendanceId, checkOut, checkOutPhoto, notes) => {
    const res = await fetch(`/api/attendance/${attendanceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkOut, checkOutPhoto, notes }),
    });
    if (!res.ok) throw new Error('Failed to check out');
    const record: AttendanceRecord = await res.json();
    return record;
  },

  refresh: async () => {
    await get().fetchEmployees();
  },
}));
