/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Phone, Users, User, Clock, Calendar, Plus, X, Trash2, Edit2, CheckCircle2, AlertCircle, Eye, Info } from 'lucide-react';
import { Tuition, Student, SessionLog, Payment } from '../types';
import { dbService, DAYS_OF_WEEK } from '../db';

interface TuitionPageProps {
  tuitions: Tuition[];
  sessionLogs: SessionLog[];
  payments: Payment[];
  refreshData: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const TuitionPage: React.FC<TuitionPageProps> = ({
  tuitions,
  sessionLogs,
  payments,
  refreshData,
  showToast
}) => {
  const [selectedTuition, setSelectedTuition] = useState<Tuition | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Common Form States
  const [formType, setFormType] = useState<'group' | 'single'>('group');
  const [formName, setFormName] = useState('');
  const [formStartTime, setFormStartTime] = useState('10:00 AM');
  const [formEndTime, setFormEndTime] = useState('11:00 AM');
  const [formFee, setFormFee] = useState<number>(500);
  const [formActiveDays, setFormActiveDays] = useState<number[]>([]);
  const [formStudents, setFormStudents] = useState<Omit<Student, 'id'>[]>([
    { studentName: '', guardianPhone: '' }
  ]);

  // Edit states mapping
  const [editName, setEditName] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editFee, setEditFee] = useState<number>(0);
  const [editActiveDays, setEditActiveDays] = useState<number[]>([]);
  const [editStudents, setEditStudents] = useState<Student[]>([]);

  // Toggle active days during selection
  const handleDayToggle = (dayIdx: number, isEdit = false) => {
    if (isEdit) {
      if (editActiveDays.includes(dayIdx)) {
        setEditActiveDays(editActiveDays.filter(d => d !== dayIdx));
      } else {
        setEditActiveDays([...editActiveDays, dayIdx].sort());
      }
    } else {
      if (formActiveDays.includes(dayIdx)) {
        setFormActiveDays(formActiveDays.filter(d => d !== dayIdx));
      } else {
        setFormActiveDays([...formActiveDays, dayIdx].sort());
      }
    }
  };

  // Add more student rows (Group only)
  const handleAddStudentRow = (isEdit = false) => {
    if (isEdit) {
      setEditStudents([...editStudents, { id: 's-' + Math.random().toString(36).substring(2, 9), studentName: '', guardianPhone: '' }]);
    } else {
      setFormStudents([...formStudents, { studentName: '', guardianPhone: '' }]);
    }
  };

  // Remove a student row (Group only)
  const handleRemoveStudentRow = (idx: number, isEdit = false) => {
    if (isEdit) {
      if (editStudents.length === 1) {
        showToast('At least one student is required', 'error');
        return;
      }
      setEditStudents(editStudents.filter((_, i) => i !== idx));
    } else {
      if (formStudents.length === 1) {
        showToast('At least one student is required', 'error');
        return;
      }
      setFormStudents(formStudents.filter((_, i) => i !== idx));
    }
  };

  // Student field changes
  const handleStudentFieldChange = (idx: number, field: 'studentName' | 'guardianPhone', value: string, isEdit = false) => {
    if (isEdit) {
      const updated = [...editStudents];
      updated[idx] = { ...updated[idx], [field]: value };
      setEditStudents(updated);
    } else {
      const updated = [...formStudents];
      updated[idx] = { ...updated[idx], [field]: value };
      setFormStudents(updated);
    }
  };

  // Validate form details
  const validateForm = (
    name: string,
    activeDays: number[],
    studentsList: { studentName: string; guardianPhone: string }[],
    fee: number
  ): boolean => {
    if (!name.trim()) {
      showToast('Tuition name is required', 'error');
      return false;
    }
    if (activeDays.length === 0) {
      showToast('Select at least one active teaching day', 'error');
      return false;
    }
    if (fee <= 0) {
      showToast('Monthly fee must be greater than 0', 'error');
      return false;
    }
    
    // Check if any student names or phones are empty
    for (let i = 0; i < studentsList.length; i++) {
      const s = studentsList[i];
      if (!s.studentName.trim()) {
        showToast(`Student #${i+1} name cannot be empty`, 'error');
        return false;
      }
      const cleanPhone = s.guardianPhone.replace(/\D/g, '');
      if (cleanPhone.length < 8) {
        showToast(`Please enter a valid phone number for student: ${s.studentName}`, 'error');
        return false;
      }
    }
    return true;
  };

  // Create Tuition Handler
  const handleCreateTuition = async () => {
    // Determine list
    const candidateStudents = formType === 'single' 
      ? [ { studentName: formStudents[0].studentName, guardianPhone: formStudents[0].guardianPhone } ]
      : formStudents;

    if (!validateForm(formName, formActiveDays, candidateStudents, formFee)) return;

    try {
      const primaryPhone = candidateStudents[0].guardianPhone;
      const formattedStudents: Student[] = candidateStudents.map(s => ({
        id: 's-' + Math.random().toString(36).substring(2, 11),
        studentName: s.studentName,
        guardianPhone: s.guardianPhone
      }));

      await dbService.addTuition({
        userId: 'demo-tutor-123',
        type: formType,
        tuitionName: formName,
        startTime: formStartTime,
        endTime: formEndTime,
        monthlyFee: Number(formFee),
        activeDays: formActiveDays,
        primaryPhone,
        students: formattedStudents
      });

      showToast('Tuition created successfully!', 'success');
      refreshData();
      
      // Reset
      setShowAddModal(false);
      setFormName('');
      setFormActiveDays([]);
      setFormStudents([{ studentName: '', guardianPhone: '' }]);
    } catch (e) {
      showToast('Failed to add tuition.', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tuition: Tuition) => {
    setEditName(tuition.tuitionName);
    setEditStartTime(tuition.startTime);
    setEditEndTime(tuition.endTime);
    setEditFee(tuition.monthlyFee);
    setEditActiveDays(tuition.activeDays);
    setEditStudents(tuition.students);
    setShowEditModal(true);
    setSelectedTuition(null); // Close details popup
  };

  // Submit Edit Handler
  const handleSaveEdit = async (tuitionId: string) => {
    if (!validateForm(editName, editActiveDays, editStudents, editFee)) return;

    try {
      await dbService.updateTuition(tuitionId, {
        tuitionName: editName,
        startTime: editStartTime,
        endTime: editEndTime,
        monthlyFee: Number(editFee),
        activeDays: editActiveDays,
        students: editStudents,
        primaryPhone: editStudents[0]?.guardianPhone || ''
      });

      showToast('Tuition updated successfully!', 'success');
      refreshData();
      setShowEditModal(false);
    } catch (e) {
      showToast('Failed to update tuition.', 'error');
    }
  };

  // Delete Tuition Handler
  const handleDeleteTuition = async (tuitionId: string) => {
    if (confirm('Are you absolutely sure you want to delete this tuition? This deletes all associated details.')) {
      try {
        await dbService.deleteTuition(tuitionId);
        showToast('Tuition deleted successfully', 'success');
        refreshData();
        setShowEditModal(false);
      } catch (e) {
        showToast('Error deleting tuition.', 'error');
      }
    }
  };

  return (
    <div className="bg-[#F6F7F9] min-h-screen pb-24 md:pb-8">
      {/* Page Header */}
      <div className="bg-white px-4 py-4 border-b border-[#E5E7EB] sticky top-0 z-10 shadow-3xs flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Tuitions</h1>
        
        <button
          onClick={() => {
            setFormType('group');
            setFormName('');
            setFormActiveDays([]);
            setFormStudents([{ studentName: '', guardianPhone: '' }]);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1 px-4 py-2 bg-[#2563EB] text-white hover:bg-blue-700 transition-all font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          id="btn-add-tuition-launcher"
        >
          <Plus size={16} />
          <span>Add Tuition</span>
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 md:max-w-4xl">
        {tuitions.length === 0 ? (
          <div className="bg-[#FFF7EE] rounded-3xl p-10 border border-amber-100 text-center flex flex-col items-center justify-center shadow-xs">
            <Users size={48} className="text-amber-500/80 mb-3" />
            <p className="font-extrabold text-[#1F2937] text-base">No Tuitions Added Yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Click the "Add Tuition" button above to register your first tuition batch or single student!
            </p>
          </div>
        ) : (
          <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {tuitions.map((tuition, idx) => {
              // Calc some states for stats
              const totalClasses = sessionLogs.filter(log => log.tuitionId === tuition.id && log.status === 'completed').length;
              const daysStr = tuition.activeDays.map(d => DAYS_OF_WEEK[d].substring(0, 3)).join(', ');

              return (
                <div
                  key={tuition.id}
                  id={`tuition-card-${idx}`}
                  className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all w-full relative"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex items-start justify-between">
                      <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                        tuition.type === 'group'
                          ? 'bg-[#E0ECFF] text-[#2563EB]'
                          : 'bg-[#E6F8EF] text-[#15803D]'
                      }`}>
                        {tuition.type === 'group' ? 'Group Batch' : 'Single Student'}
                      </span>
                      <span className="text-xs font-extrabold text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {tuition.startTime} - {tuition.endTime}
                      </span>
                    </div>

                    {/* Class Name */}
                    <h2 className="font-black text-gray-800 text-lg mt-2.5 leading-tight">
                      {tuition.tuitionName}
                    </h2>

                    {/* Days schedule */}
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-bold mt-2 pb-3 border-b border-gray-100/80">
                      <Calendar size={13} className="text-gray-400" />
                      <span>{daysStr || 'No days scheduled'}</span>
                    </div>

                    {/* Students and Calling links */}
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Students ({tuition.students.length})
                      </p>
                      {tuition.students.slice(0, 3).map((st, sIdx) => (
                        <div key={st.id} className="flex items-center justify-between text-xs bg-[#FFF7EE]/30 p-1.5 rounded-lg border border-orange-50/50">
                          <span className="font-bold text-gray-700 truncate max-w-[150px]">{st.studentName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-semibold">{st.guardianPhone}</span>
                            <a
                              href={`tel:${st.guardianPhone}`}
                              className="w-7 h-7 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100/50 transition-colors cursor-pointer"
                              title="Call Guardian Dial-link"
                              id={`dial-btn-${idx}-${sIdx}`}
                            >
                              <Phone size={12} />
                            </a>
                          </div>
                        </div>
                      ))}
                      {tuition.students.length > 3 && (
                        <p className="text-[10px] text-gray-400 pl-1 font-semibold">
                          + {tuition.students.length - 3} more students
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing / total classes banner */}
                  <div className="mt-4 pt-3.5 border-t border-gray-100/80 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-extrabold">Monthly Fees</p>
                      <p className="font-extrabold text-[#1F2937] text-sm">
                        {tuition.monthlyFee}৳ <span className="text-[10px] font-normal text-gray-400">per student</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedTuition(tuition)}
                      id={`btn-open-details-${idx}`}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-100 flex items-center gap-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 rounded-xl transition-all font-bold text-xs text-gray-600 cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TUITION DETAILS MODAL */}
      {selectedTuition && (() => {
        // Find logs and payment history
        const logs = sessionLogs.filter(log => log.tuitionId === selectedTuition.id);
        const completedClasses = logs.filter(log => log.status === 'completed').length;
        const totalFees = selectedTuition.students.length * selectedTuition.monthlyFee;
        const historyPayments = payments.filter(p => p.tuitionId === selectedTuition.id && p.status === 'paid');

        // Simple monthly visual calendar for May 2026
        // Sunday to Saturday dates for May
        const calendarDates = Array.from({ length: 31 }, (_, i) => {
          const dayNum = i + 1;
          const dateStr = `2026-05-${dayNum < 10 ? '0' + dayNum : dayNum}`;
          
          // Is this day regularly scheduled?
          const dObj = new Date(dateStr + 'T00:00:00');
          const isReg = selectedTuition.activeDays.includes(dObj.getDay());
          
          // Log results
          const logForDay = logs.find(log => log.date === dateStr);
          
          return {
            dayNum,
            dateStr,
            isReg,
            logForDay
          };
        });

        return (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-slide-up space-y-5">
              
              {/* Close Button & Header */}
              <button
                onClick={() => setSelectedTuition(null)}
                className="absolute right-4 top-4 w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 cursor-pointer transition-all border border-gray-100"
              >
                <X size={18} />
              </button>

              <div className="pt-2">
                <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                  selectedTuition.type === 'group'
                    ? 'bg-[#E0ECFF] text-[#2563EB]'
                    : 'bg-[#E6F8EF] text-[#15803D]'
                }`}>
                  {selectedTuition.type === 'group' ? 'Group Batch' : 'Single Student'}
                </span>
                <h3 className="font-extrabold text-xl text-gray-800 mt-2 pr-8">{selectedTuition.tuitionName}</h3>
                <p className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  <span>{selectedTuition.startTime} - {selectedTuition.endTime}</span>
                </p>
              </div>

              {/* Grid metadata */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Class Routine</span>
                  <span className="font-extrabold text-gray-800">
                    {selectedTuition.activeDays.map(d => DAYS_OF_WEEK[d].substring(0, 3)).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Completed Classes</span>
                  <span className="font-extrabold text-blue-600 font-mono text-sm">{completedClasses} Days</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Fee per student</span>
                  <span className="font-extrabold text-gray-800">{selectedTuition.monthlyFee}৳</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Batch Income</span>
                  <span className="font-extrabold text-[#15803D] font-mono text-sm">{totalFees}৳ / month</span>
                </div>
              </div>

              {/* Students Details */}
              <div>
                <h4 className="font-extrabold text-sm text-gray-800 mb-2.5 flex items-center gap-1.5">
                  <Users size={16} className="text-blue-500" />
                  <span>Active Students ({selectedTuition.students.length})</span>
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedTuition.students.map((st, stIdx) => (
                    <div key={st.id} className="flex items-center justify-between bg-orange-50/20 px-3 py-2.5 rounded-xl border border-orange-100/50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-extrabold text-[10px] text-blue-600 uppercase">
                          {st.studentName.charAt(0)}
                        </div>
                        <span className="font-bold text-xs text-gray-700">{st.studentName}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-gray-400 font-bold">{st.guardianPhone}</span>
                        <a
                          href={`tel:${st.guardianPhone}`}
                          className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Phone size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance Tracker Visual representation for May 2026 */}
              <div>
                <h4 className="font-extrabold text-sm text-gray-800 mb-1 flex items-center gap-1.5">
                  <Calendar size={16} className="text-blue-500" />
                  <span>May 2026 Attendance Overview</span>
                </h4>
                <p className="text-[9px] text-gray-400 font-semibold mb-2.5">
                  Shows calendar days routinely scheduled. Color confirms Done/Cancel states.
                </p>

                <div className="grid grid-cols-7 gap-1 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  {/* Calendar day names */}
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, i) => (
                    <div key={i} className="text-center font-extrabold text-[10px] text-gray-400 py-1">{dayChar}</div>
                  ))}

                  {/* Empty spacers (Since May 1, 2026 is a Friday, Sunday is 26 April, so we have 5 empty pads starting May 1 is Friday, so Sunday index 0 is offset 5) */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="py-2"></div>
                  ))}

                  {calendarDates.map((item, idx) => {
                    let bgCol = 'bg-white text-gray-300';
                    let border = 'border border-gray-100';
                    let tooltip = 'Not routinely scheduled';

                    if (item.isReg) {
                      bgCol = 'bg-blue-50 text-blue-800 font-bold border-blue-100';
                      border = 'border-2';
                      tooltip = 'Scheduled school day';
                      
                      if (item.logForDay) {
                        if (item.logForDay.status === 'completed') {
                          bgCol = 'bg-green-600 text-white';
                          border = 'border-green-600';
                          tooltip = 'Completed class';
                        } else if (item.logForDay.status === 'cancelled') {
                          bgCol = 'bg-red-500 text-white';
                          border = 'border-red-500';
                          tooltip = 'Cancelled class';
                        }
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={`text-center py-2 text-[10px] rounded-lg cursor-default relative group ${bgCol} ${border}`}
                        title={tooltip}
                      >
                        {item.dayNum}
                        
                        {/* Dot indicator */}
                        {item.logForDay && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-extrabold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span>Collected Fees history</span>
                </h4>
                {historyPayments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic pl-1">No payments collected yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {historyPayments.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between text-xs px-3 py-1.5 bg-green-50/40 rounded-lg border border-green-100/50">
                        <span className="font-bold text-gray-700">Fee for {p.studentName} ({p.paymentMonth})</span>
                        <div className="flex items-center gap-2 text-[#16A34A] font-extrabold">
                          <span>+{p.amount}৳</span>
                          <CheckCircle2 size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions Row */}
              <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(selectedTuition)}
                  className="py-3 px-4 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 rounded-2xl flex items-center justify-center gap-2 text-[#374151] font-bold text-sm cursor-pointer transition-all"
                  id="btn-edit-tuition"
                >
                  <Edit2 size={14} />
                  <span>Edit Tuition</span>
                </button>
                <a
                  href={`tel:${selectedTuition.primaryPhone}`}
                  className="py-3 px-4 bg-[#2563EB] hover:bg-blue-700 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm cursor-pointer transition-all"
                >
                  <Phone size={14} />
                  <span>Contact Group</span>
                </a>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ADD TUITION FORM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-slide-up space-y-5">
            
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 cursor-pointer transition-all border border-gray-100"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-xl text-gray-800 pt-2">Add Tuition</h3>

            {/* Type tabs toggle */}
            <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => {
                  setFormType('group');
                  if (formStudents.length === 1 && formStudents[0].studentName === '') {
                    // pre-load some blank values
                  }
                }}
                className={`py-2 p font-bold text-sm rounded-xl transition-all ${formType === 'group' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Group Batch
              </button>
              <button
                onClick={() => {
                  setFormType('single');
                  setFormStudents([{ studentName: '', guardianPhone: '' }]);
                }}
                className={`py-2 font-bold text-sm rounded-xl transition-all ${formType === 'single' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Single Student
              </button>
            </div>

            {/* Form Fields container */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  {formType === 'group' ? 'Batch / Group Name' : ' Tuition Name'}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={formType === 'group' ? 'e.g. Rahim Group - Dhaka' : 'e.g. Tanvir Rahman - Math'}
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-3xs"
                  id="inp-form-name"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <select
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['08:00 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '07:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <select
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['09:00 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Fee */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Monthly Fee amount (৳)</label>
                <input
                  type="number"
                  value={formFee || ''}
                  onChange={(e) => setFormFee(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-3xs"
                  id="inp-form-fee"
                  min="1"
                />
                <span className="text-[10px] text-gray-400 font-semibold block mt-1">
                  For group batch, fee per student will be used to calculate total.
                </span>
              </div>

              {/* Active days checkboxes */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Select Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const isSel = formActiveDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayToggle(idx)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                            : 'bg-[#FFF7EE] border-gray-200 text-gray-600 hover:bg-gray-150'
                        }`}
                        id={`add-day-box-${idx}`}
                      >
                        {day.substring(0,3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Students Sub-form layout */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">
                    {formType === 'group' ? 'Students list' : 'Student details'}
                  </label>
                  {formType === 'group' && (
                    <button
                      onClick={() => handleAddStudentRow()}
                      className="text-xs font-bold text-blue-600 flex items-center gap-0.5 hover:text-blue-800"
                    >
                      <Plus size={14} />
                      <span>Add Student</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {formStudents.map((st, sIdx) => (
                    <div key={sIdx} className="flex gap-2 items-center bg-gray-50 border border-gray-100 p-3 rounded-2xl relative">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.studentName}
                          onChange={(e) => handleStudentFieldChange(sIdx, 'studentName', e.target.value)}
                          placeholder="Student Name"
                          className="bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 w-full"
                        />
                        <input
                          type="tel"
                          value={st.guardianPhone}
                          onChange={(e) => handleStudentFieldChange(sIdx, 'guardianPhone', e.target.value)}
                          placeholder="Guardian Phone"
                          className="bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 w-full"
                        />
                      </div>
                      {formType === 'group' && (
                        <button
                          onClick={() => handleRemoveStudentRow(sIdx)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTuition}
                className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-all text-center shadow-md shadow-blue-50"
                id="btn-save-new-tuition"
              >
                Save Tuition
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT TUITION FORM MODAL */}
      {showEditModal && selectedTuition === null && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-slide-up space-y-5">
            
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 cursor-pointer transition-all border border-gray-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between pt-2 pr-8">
              <h3 className="font-extrabold text-xl text-gray-800">Edit Tuition Batch</h3>
              <button
                onClick={() => handleDeleteTuition(editStudents[0]?.id || '')} // Simulating by tuition trigger
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer font-bold text-xs"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tuition Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <select
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '06:00 PM', '07:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <select
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Fee */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Monthly Fee per student (৳)</label>
                <input
                  type="number"
                  value={editFee || ''}
                  onChange={(e) => setEditFee(Number(e.target.value))}
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Routine checkboxes */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Class Days Routine</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const isSel = editActiveDays.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayToggle(idx, true)}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-[#FFF7EE] border-gray-250 text-gray-600'
                        }`}
                      >
                        {day.substring(0,3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Edit students list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">Students list</label>
                  <button
                    onClick={() => handleAddStudentRow(true)}
                    className="text-xs font-bold text-blue-600 flex items-center gap-0.5"
                  >
                    <Plus size={14} />
                    <span>Add Student</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editStudents.map((st, sIdx) => (
                    <div key={st.id} className="flex gap-2 items-center bg-gray-50 border border-gray-100 p-3 rounded-2xl relative">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={st.studentName}
                          onChange={(e) => handleStudentFieldChange(sIdx, 'studentName', e.target.value, true)}
                          placeholder="Student Name"
                          className="bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 w-full"
                        />
                        <input
                          type="tel"
                          value={st.guardianPhone}
                          onChange={(e) => handleStudentFieldChange(sIdx, 'guardianPhone', e.target.value, true)}
                          placeholder="Guardian Phone"
                          className="bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 w-full"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveStudentRow(sIdx, true)}
                        className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Editing footer buttons */}
            {tuitions.find(t => t.students.some(s => s.id === editStudents[0]?.id)) && (() => {
              const matchingTuition = tuitions.find(t => t.students.some(s => s.id === editStudents[0]?.id));
              return (
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                    }}
                    className="py-3.5 bg-white border border-[#D1D5DB] rounded-2xl text-[#374151] font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEdit(matchingTuition?.id || '')}
                    className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-all text-center"
                    id="btn-edit-save-confirm"
                  >
                    Save Changes
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      )}

    </div>
  );
};
