'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Camera, RotateCcw, Save, User, Check } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const CameraCapture = dynamic(
  () => import('@/components/attendance/CameraCapture').then((m) => m.default),
  { ssr: false }
);

export default function EmployeeForm({ editMode = false }: { editMode?: boolean }) {
  const {
    setView,
    selectedEmployeeId,
    employees,
    createEmployee,
    updateEmployee,
    fetchEmployees,
  } = useAppStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editMode);

  const existingEmployee = editMode
    ? employees.find((e) => e.id === selectedEmployeeId)
    : null;

  useEffect(() => {
    if (editMode && existingEmployee) {
      setName(existingEmployee.name);
      setPhone(existingEmployee.phone);
      setHourlyRate(existingEmployee.hourlyRate.toString());
      setOvertimeRate(existingEmployee.overtimeRate?.toString() || '');
      setFacePhoto(existingEmployee.facePhoto);
      setLoading(false);
    } else if (editMode && !existingEmployee) {
      fetchEmployees().then(() => setLoading(false));
    }
  }, [editMode, existingEmployee, fetchEmployees]);

  const handleCapture = (photo: string) => {
    setFacePhoto(photo);
    setShowCamera(false);
    toast.success('Photo captured successfully');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter employee name');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter phone number');
      return;
    }
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      toast.error('Please enter a valid hourly rate');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        phone: phone.trim(),
        hourlyRate: parseFloat(hourlyRate),
        overtimeRate: overtimeRate ? parseFloat(overtimeRate) : null,
        facePhoto,
      };

      if (editMode && selectedEmployeeId) {
        await updateEmployee(selectedEmployeeId, data);
        toast.success('Employee updated successfully');
      } else {
        await createEmployee(data);
        toast.success('Employee added successfully');
      }
      setView('employees');
    } catch (error) {
      toast.error(editMode ? 'Failed to update employee' : 'Failed to add employee');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => setView('employees')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            {editMode ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {editMode ? 'Update employee details' : 'Register a new employee'}
          </p>
        </div>
      </div>

      {/* Face Photo Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Face Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCamera ? (
            <CameraCapture
              onCapture={handleCapture}
              onSkip={() => setShowCamera(false)}
            />
          ) : facePhoto ? (
            <div className="space-y-3">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex justify-center"
              >
                <img
                  src={facePhoto}
                  alt="Employee face"
                  className="w-36 h-36 rounded-2xl object-cover border-2 border-primary/30"
                />
              </motion.div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowCamera(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-xl text-red-500"
                  onClick={() => setFacePhoto(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                <User className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <Button
                className="rounded-xl"
                onClick={() => setShowCamera(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Face Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Optional: Helps with attendance verification
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Employee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium">
              Full Name *
            </Label>
            <Input
              id="name"
              placeholder="Enter employee name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-base font-medium">
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 rounded-xl text-base"
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate" className="text-base font-medium">
                Hourly Rate (₹) *
              </Label>
              <Input
                id="hourlyRate"
                type="number"
                placeholder="e.g. 50"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="h-12 rounded-xl text-base"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeRate" className="text-base font-medium">
                OT Rate (₹)
              </Label>
              <Input
                id="overtimeRate"
                type="number"
                placeholder="Optional"
                value={overtimeRate}
                onChange={(e) => setOvertimeRate(e.target.value)}
                className="h-12 rounded-xl text-base"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full h-14 text-base font-semibold rounded-xl"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </div>
        ) : (
          <>
            <Check className="h-5 w-5 mr-2" />
            {editMode ? 'Update Employee' : 'Save Employee'}
          </>
        )}
      </Button>
    </div>
  );
}
