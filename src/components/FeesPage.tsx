/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Landmark, Check, Coins, DollarSign, Calendar, Sliders, ChevronDown, CheckCircle, ArrowRight, UserPlus, FileText, Plus, X } from 'lucide-react';
import { Tuition, Payment, Student } from '../types';
import { dbService } from '../db';

interface FeesPageProps {
  tuitions: Tuition[];
  payments: Payment[];
  refreshData: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const FeesPage: React.FC<FeesPageProps> = ({
  tuitions,
  payments,
  refreshData,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'receivable' | 'paid'>('all');
  const [confirmPayment, setConfirmPayment] = useState<Payment | null>(null);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  // Add Custom Payment States
  const [newPayTuitionId, setNewPayTuitionId] = useState('');
  const [newPayStudentId, setNewPayStudentId] = useState('');
  const [newPayAmount, setNewPayAmount] = useState<number>(0);
  const [newPayMonth, setNewPayMonth] = useState('2026-05');
  const [newPayStatus, setNewPayStatus] = useState<'paid' | 'unpaid' | 'overdue'>('unpaid');

  // Dynamic calculations from payments collection
  const totalReceivable = payments
    .filter(p => p.status === 'unpaid' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalCollected = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const thisMonthExpected = payments
    .filter(p => p.paymentMonth === '2026-05')
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueDues = payments
    .filter(p => p.status === 'overdue' || (p.paymentMonth < '2026-05' && p.status === 'unpaid'))
    .reduce((sum, p) => sum + p.amount, 0);

  // Select tuition inside form triggers automatic student listing
  const selectedTuitionInForm = tuitions.find(t => t.id === newPayTuitionId);

  // Collect Payment confirmation
  const handleCollectConfirm = async () => {
    if (!confirmPayment) return;

    try {
      await dbService.collectPayment(confirmPayment.id);
      showToast(`Payment of ৳${confirmPayment.amount} collected successfully!`, 'success');
      refreshData();
      setConfirmPayment(null);
    } catch (e) {
      showToast('Error collecting payment.', 'error');
    }
  };

  // Add payment form submission
  const handleAddNewPayment = async () => {
    if (!newPayTuitionId || !newPayStudentId || newPayAmount <= 0) {
      showToast('Please select tuition, student, and input positive amount', 'error');
      return;
    }

    const matchingT = tuitions.find(t => t.id === newPayTuitionId);
    const matchingS = matchingT?.students.find(s => s.id === newPayStudentId);

    if (!matchingT || !matchingS) return;

    try {
      await dbService.addCustomPayment({
        tuitionId: newPayTuitionId,
        studentId: newPayStudentId,
        studentName: matchingS.studentName,
        userId: 'demo-tutor-123',
        amount: Number(newPayAmount),
        paymentMonth: newPayMonth,
        paymentDate: newPayStatus === 'paid' ? '2026-05-24' : '',
        status: newPayStatus
      });

      showToast('Payment record added', 'success');
      refreshData();
      setShowAddPaymentModal(false);
      setNewPayTuitionId('');
      setNewPayStudentId('');
      setNewPayAmount(0);
    } catch (e) {
      showToast('Error adding payment.', 'error');
    }
  };

  // Find fee items mapped to tuitions for selected tab filters
  const renderedTuitionsList = tuitions.map(tuition => {
    const tuitionPayments = payments.filter(p => p.tuitionId === tuition.id);
    
    // Filter payments based on activeTab
    let filteredPays = tuitionPayments;
    if (activeTab === 'receivable') {
      filteredPays = tuitionPayments.filter(p => p.status === 'unpaid' || p.status === 'overdue');
    } else if (activeTab === 'paid') {
      filteredPays = tuitionPayments.filter(p => p.status === 'paid');
    }

    return {
      tuition,
      studentPayments: filteredPays
    };
  }).filter(item => item.studentPayments.length > 0);

  return (
    <div className="bg-[#F6F7F9] min-h-screen pb-24 md:pb-8">
      {/* Page Header */}
      <div className="bg-white px-4 py-4 border-b border-[#E5E7EB] sticky top-0 z-10 shadow-3xs flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Fees</h1>
        
        <button
          onClick={() => {
            setNewPayTuitionId('');
            setNewPayStudentId('');
            setNewPayStatus('unpaid');
            setNewPayAmount(0);
            setShowAddPaymentModal(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all font-bold text-xs rounded-xl shadow-xs cursor-pointer border border-blue-150"
          id="btn-add-payment-modal-launcher"
        >
          <Plus size={16} />
          <span>Add Payment</span>
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 md:max-w-4xl space-y-6">
        {/* KPI Dashboard Top Widgets (GORGEOUS GRID!) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Receivable */}
          <div className="bg-white rounded-3xl p-4.5 border border-[#E5E7EB] shadow-3xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total Receivable</p>
              <h2 className="text-base font-black text-gray-800 mt-0.5">৳ {totalReceivable.toLocaleString()}</h2>
            </div>
          </div>

          {/* Card 2: Collected */}
          <div className="bg-white rounded-3xl p-4.5 border border-[#E5E7EB] shadow-3xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E6F8EF] flex items-center justify-center text-[#15803D] shrink-0">
              <Coins size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Total Collected</p>
              <h2 className="text-base font-black text-gray-800 mt-0.5">৳ {totalCollected.toLocaleString()}</h2>
            </div>
          </div>

          {/* Card 3: This Month */}
          <div className="bg-white rounded-3xl p-4.5 border border-[#E5E7EB] shadow-3xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">This Month</p>
              <h2 className="text-base font-black text-gray-800 mt-0.5">৳ {thisMonthExpected.toLocaleString()}</h2>
            </div>
          </div>

          {/* Card 4: Overdue */}
          <div className="bg-white rounded-3xl p-4.5 border border-[#E5E7EB] shadow-3xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Overdue</p>
              <h2 className="text-base font-black text-gray-800 mt-0.5">৳ {overdueDues.toLocaleString()}</h2>
            </div>
          </div>
        </div>

        {/* Filter Navigation list Tabs */}
        <div className="flex border-b border-[#E5E7EB]">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 font-extrabold text-sm transition-all focus:outline-none cursor-pointer relative ${
              activeTab === 'all' ? 'text-blue-600 font-black' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>All Tuitions</span>
            {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-slide-in"></div>}
          </button>
          <button
            onClick={() => setActiveTab('receivable')}
            className={`flex-1 py-3 font-extrabold text-sm transition-all focus:outline-none cursor-pointer relative ${
              activeTab === 'receivable' ? 'text-blue-600 font-black' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Receivable</span>
            {activeTab === 'receivable' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-slide-in"></div>}
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`flex-1 py-3 font-extrabold text-sm transition-all focus:outline-none cursor-pointer relative ${
              activeTab === 'paid' ? 'text-blue-600 font-black' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Paid History</span>
            {activeTab === 'paid' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 animate-slide-in"></div>}
          </button>
        </div>

        {/* Tuition batches matching search lists */}
        {renderedTuitionsList.length === 0 ? (
          <div className="bg-[#FFF7EE] rounded-3xl p-10 border border-amber-100 text-center flex flex-col items-center justify-center shadow-xs">
            <Coins size={44} className="text-amber-500/80 mb-3" />
            <p className="font-extrabold text-[#1F2937] text-base">No Matching Payments Found</p>
            <p className="text-sm text-gray-400 mt-1">Nothing to show for this category filter yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {renderedTuitionsList.map(({ tuition, studentPayments }, batchIdx) => {
              const activeTimes = `${tuition.startTime} - ${tuition.endTime}`;

              return (
                <div
                  key={tuition.id}
                  id={`fees-tuition-card-${batchIdx}`}
                  className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-3xs space-y-4 hover:shadow-xs transition-shadow"
                >
                  {/* Card Title batch row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${
                        tuition.type === 'group'
                          ? 'bg-[#E0ECFF] text-[#2563EB]'
                          : 'bg-[#E6F8EF] text-[#15803D]'
                      }`}>
                        {tuition.type === 'group' ? 'Group Batch' : 'Single Student'}
                      </span>
                      <h3 className="font-black text-gray-800 text-base mt-1.5 leading-tight">{tuition.tuitionName}</h3>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">Next Payment: 05 Jun 2026</p>
                    </div>
                    <span className="text-xs font-bold text-gray-500 font-mono">{activeTimes}</span>
                  </div>

                  <div className="text-xs font-semibold text-gray-500 bg-[#FFF7EE]/30 p-2.5 rounded-xl border border-orange-50 flex items-center justify-between">
                    <span>Fees: ৳{tuition.monthlyFee} per student</span>
                    <span>Total monthly: ৳{(tuition.monthlyFee * tuition.students.length).toLocaleString()} / month</span>
                  </div>

                  {/* Student Rows details */}
                  <div className="space-y-3 pt-1">
                    {studentPayments.map((p, idx) => {
                      const matchingS = tuition.students.find(s => s.id === p.studentId);
                      const sPhone = matchingS ? matchingS.guardianPhone : 'No Phone';
                      
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between hover:bg-gray-50/50 p-2 rounded-2xl transition-colors border-b border-gray-50"
                        >
                          <div>
                            <p className="font-bold text-xs text-gray-800">{p.studentName}</p>
                            <p className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">{sPhone}</p>
                            <p className="text-[9px] font-extrabold text-blue-500 mt-0.5">Month: {p.paymentMonth}</p>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Status badge */}
                            {p.status === 'paid' ? (
                              <div className="bg-[#DCFCE7] text-[#16A34A] text-xs font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-3xs">
                                <Check size={12} />
                                <span>Paid</span>
                              </div>
                            ) : (
                              <div className="bg-[#FEE2E2] text-[#DC2626] text-xs font-extrabold px-3 py-1.5 rounded-full shadow-3xs">
                                <span>Due ৳{p.amount}</span>
                              </div>
                            )}

                            {/* Collect trigger */}
                            {p.status !== 'paid' && (
                              <button
                                onClick={() => setConfirmPayment(p)}
                                id={`btn-collect-payment-${idx}`}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                              >
                                Collect
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COLLECT PAYMENT CONFIRMATION MODAL */}
      {confirmPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-slide-up text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle size={32} />
            </div>

            <div>
              <h3 className="font-extrabold text-lg text-gray-800">Confirm Fee Collection</h3>
              <p className="text-xs text-gray-500 mt-1">
                Collecting fee for student <span className="font-extrabold text-blue-600">{confirmPayment.studentName}</span>
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between text-xs font-semibold mx-auto border border-gray-100 max-w-xs">
              <span className="text-gray-500">Collected Amount:</span>
              <span className="font-extrabold text-green-600 text-base font-mono">৳{confirmPayment.amount}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setConfirmPayment(null)}
                className="py-3 bg-white border border-[#D1D5DB] hover:bg-gray-50 text-[#374151] rounded-2xl font-bold text-sm cursor-pointer transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCollectConfirm}
                className="py-3 bg-[#16A34A] hover:bg-[#14833c] text-white rounded-2xl font-bold text-sm cursor-pointer transition-colors shadow-md shadow-green-100"
                id="btn-confirm-collect-payment"
              >
                Yes, Collect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PAYMENT RECORD MODAL */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-slide-up space-y-5">
            
            <button
              onClick={() => setShowAddPaymentModal(false)}
              className="absolute right-4 top-4 w-9 h-9 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 cursor-pointer transition-all border border-gray-100"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-xl text-gray-800 pt-2">Log Tuition Payment</h3>
            <p className="text-xs text-gray-500">Manually issue a monthly tuition billing/fee slip for a specific student is useful.</p>

            <div className="space-y-4">
              {/* Select Tuition */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Tuition Batch</label>
                <select
                  value={newPayTuitionId}
                  onChange={(e) => {
                    setNewPayTuitionId(e.target.value);
                    const t = tuitions.find(x => x.id === e.target.value);
                    if (t) {
                      setNewPayStudentId(t.students[0]?.id || '');
                      setNewPayAmount(t.monthlyFee);
                    }
                  }}
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Batch / Tuition --</option>
                  {tuitions.map(t => (
                    <option key={t.id} value={t.id}>{t.tuitionName}</option>
                  ))}
                </select>
              </div>

              {/* Select Student */}
              {selectedTuitionInForm && (
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Student</label>
                  <select
                    value={newPayStudentId}
                    onChange={(e) => setNewPayStudentId(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {selectedTuitionInForm.students.map(s => (
                      <option key={s.id} value={s.id}>{s.studentName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Amount (৳)</label>
                <input
                  type="number"
                  value={newPayAmount || ''}
                  onChange={(e) => setNewPayAmount(Number(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Months */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
                  <select
                    value={newPayMonth}
                    onChange={(e) => setNewPayMonth(e.target.value)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    {['2026-03', '2026-04', '2026-05', '2026-06'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={newPayStatus}
                    onChange={(e) => setNewPayStatus(e.target.value as any)}
                    className="w-full bg-[#FFF7EE] border border-[#E5E7EB] rounded-2xl p-3.5 text-sm font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="unpaid">Unpaid / Due</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm cursor-pointer hover:bg-gray-50 transition-all text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewPayment}
                className="py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm cursor-pointer transition-all text-center"
              >
                Log Payment
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
