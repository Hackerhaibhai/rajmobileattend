'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/useAppStore';
import type { Employee } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Plus, Search, Pencil, UserCircle, Phone, IndianRupee, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function EmployeeList() {
  const { employees, setView, selectEmployee, deleteEmployee, fetchEmployees } = useAppStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEmployees();
      setLoading(false);
    };
    load();
  }, [fetchEmployees]);

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.phone.includes(search)
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast.success('Employee deactivated successfully');
    } catch {
      toast.error('Failed to deactivate employee');
    }
  };

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total</p>
        </div>
        <Button
          className="rounded-xl h-12 px-4 text-base font-semibold"
          onClick={() => setView('add-employee')}
        >
          <Plus className="h-5 w-5 mr-1" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12 rounded-xl text-base"
        />
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <UserCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((employee, index) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => {
                  selectEmployee(employee.id);
                  setView('edit-employee');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Photo */}
                    {employee.facePhoto ? (
                      <img
                        src={employee.facePhoto}
                        alt={employee.name}
                        className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-lg">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">{employee.name}</h3>
                        <Badge
                          variant={employee.isActive ? 'default' : 'secondary'}
                          className={
                            employee.isActive
                              ? 'bg-emerald-100 text-emerald-700 border-0 text-xs'
                              : 'bg-red-100 text-red-700 border-0 text-xs'
                          }
                        >
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground mt-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm">{employee.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <IndianRupee className="h-3 w-3 text-primary" />
                        <span className="text-sm font-medium">
                          {formatCurrency(employee.hourlyRate)}/hr
                        </span>
                        {employee.overtimeRate && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (OT: {formatCurrency(employee.overtimeRate)}/hr)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          selectEmployee(employee.id);
                          setView('edit-employee');
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {employee.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Employee?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deactivate {employee.name}. Their attendance history will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(employee.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
