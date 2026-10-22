
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuWallet,
  LuDownload,
  LuEye,
  LuFileText,
  LuChevronLeft,
  LuChevronRight,
  LuX,
  LuCreditCard,
  LuTrendingUp,
  LuCircleArrowDown,
  LuBuilding2,
  LuRefreshCw,
} from "react-icons/lu";
import {
  getPayslips,
  getPayslipDetails,
  downloadPayslip,
  getSalaryStructure,
  getLoans,
} from "../../Utility/hrmsApi";
import {
  getStatusBadge,
  formatDate,
  formatCurrency,
} from "../../Utility/hrmsUtils";

// ===================== HELPERS =====================
function extractArray(res, ...keys) {
  if (!res) return [];

  let root = res?.data ?? res;
  root = root?.resources?.data ?? root?.data ?? root;

  if (Array.isArray(root)) return root;
  if (!root || typeof root !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key];
  }

  if (root.data && typeof root.data === "object") {
    if (Array.isArray(root.data)) return root.data;
    for (const key of keys) {
      if (Array.isArray(root.data[key])) return root.data[key];
    }
  }

  return [];
}

function extractObject(res) {
  if (!res) return null;

  let root = res?.data ?? res;
  root = root?.resources?.data ?? root?.data ?? root;

  if (
    !root ||
    typeof root !== "object" ||
    Array.isArray(root) ||
    Object.keys(root).length === 0
  ) {
    return null;
  }

  return root;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatAmount = (value) =>
  value !== undefined && value !== null && value !== ""
    ? formatCurrency(value)
    : "Not available";

const YesNo = ({ value }) => (
  <span
    className={`font-bold ${
      Number(value) === 1 ? "text-emerald-700" : "text-gray-500"
    }`}
  >
    {Number(value) === 1 ? "Yes" : "No"}
  </span>
);

export default function HrmsPayroll() {
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("PAYSLIPS");
  const [loading, setLoading] = useState(true);

  const [payslips, setPayslips] = useState([]);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [loans, setLoans] = useState([]);

  const [activePayslipModal, setActivePayslipModal] = useState({
    isOpen: false,
    loading: false,
    data: null,
    slipId: null,
  });

  const [downloadingId, setDownloadingId] = useState(null);

  // ===================== LOAD DATA =====================
  const loadPayrollData = async () => {
    try {
      setLoading(true);

      if (activeTab === "PAYSLIPS") {
        const res = await getPayslips(selectedYear);
        setPayslips(
          extractArray(res, "payslips", "items", "data")
        );
      } else if (activeTab === "STRUCTURE") {
        const res = await getSalaryStructure();
        setSalaryStructure(extractObject(res));
      } else if (activeTab === "LOANS") {
        const res = await getLoans();
        setLoans(extractArray(res, "loans", "items", "data"));
      }
    } catch (err) {
      console.error("Payroll loading failed:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load payroll details"
      );

      if (activeTab === "PAYSLIPS") setPayslips([]);
      if (activeTab === "STRUCTURE") setSalaryStructure(null);
      if (activeTab === "LOANS") setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, activeTab]);

  // ===================== DOWNLOAD PAYSLIP =====================
  const handleDownload = async (id, monthName) => {
    if (!id) {
      toast.error("Invalid payslip ID");
      return;
    }

    try {
      setDownloadingId(id);
      await downloadPayslip(id);
      toast.success(
        `Payslip for ${monthName || id} downloaded`
      );
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to download payslip PDF"
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // ===================== VIEW PAYSLIP DETAILS =====================
  const handleViewDetails = async (id) => {
    if (!id) {
      toast.error("Invalid payslip ID");
      return;
    }

    try {
      setActivePayslipModal({
        isOpen: true,
        loading: true,
        data: null,
        slipId: id,
      });

      const res = await getPayslipDetails(id);
      const detail = extractObject(res);

      setActivePayslipModal({
        isOpen: true,
        loading: false,
        data: detail,
        slipId: id,
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to load payslip breakdown"
      );

      setActivePayslipModal({
        isOpen: false,
        loading: false,
        data: null,
        slipId: null,
      });
    }
  };

  const closePayslipModal = () => {
    setActivePayslipModal({
      isOpen: false,
      loading: false,
      data: null,
      slipId: null,
    });
  };

  // ===================== UI =====================
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Payroll & Remuneration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Salary statements, monthly payslips, salary structure
            and loan records
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "PAYSLIPS" && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
              <button
                onClick={() =>
                  setSelectedYear((year) => year - 1)
                }
                className="p-1.5 hover:bg-white rounded-lg text-gray-600"
                title="Previous year"
              >
                <LuChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-gray-800 px-2 min-w-[70px] text-center">
                {selectedYear}
              </span>

              <button
                onClick={() =>
                  setSelectedYear((year) => year + 1)
                }
                disabled={selectedYear >= currentYear}
                className="p-1.5 hover:bg-white rounded-lg text-gray-600 disabled:opacity-30"
                title="Next year"
              >
                <LuChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={loadPayrollData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-sm disabled:opacity-50"
            title="Refresh"
          >
            <LuRefreshCw
              className={`w-4 h-4 ${
                loading ? "animate-spin text-orange-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab("PAYSLIPS")}
          className={`px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 whitespace-nowrap ${
            activeTab === "PAYSLIPS"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <LuWallet className="w-4 h-4" />
          Monthly Payslips ({payslips.length})
        </button>

        <button
          onClick={() => setActiveTab("STRUCTURE")}
          className={`px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 whitespace-nowrap ${
            activeTab === "STRUCTURE"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <LuFileText className="w-4 h-4" />
          Salary Structure (CTC)
        </button>

        <button
          onClick={() => setActiveTab("LOANS")}
          className={`px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 whitespace-nowrap ${
            activeTab === "LOANS"
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <LuCreditCard className="w-4 h-4" />
          Loans & Salary Advances
        </button>
      </div>

      {/* ===================== PAYSLIPS ===================== */}
      {activeTab === "PAYSLIPS" && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-xs text-gray-400 animate-pulse">
              Loading payslip records for {selectedYear}...
            </div>
          ) : payslips.length === 0 ? (
            <div className="bg-white rounded-2xl border p-12 text-center text-xs text-gray-500">
              No payslips found for calendar year {selectedYear}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {payslips.map((slip, idx) => {
                const slipId =
                  slip.payslip_id ?? slip.id ?? null;

                const monthName =
                  slip.month_name ||
                  (slip.month
                    ? MONTHS[slip.month - 1]
                    : null) ||
                  `Month ${slip.month || "-"}`;

                const grossSalary =
                  slip.gross_salary ??
                  slip.gross_earnings ??
                  slip.gross;

                const totalDeductions =
                  slip.total_deductions ??
                  slip.deductions_total;

                const netSalary =
                  slip.net_salary ??
                  slip.net_pay ??
                  slip.net;

                const status = slip.status || "GENERATED";

                const paidOn =
                  slip.payment_date ||
                  slip.payslip_date ||
                  slip.generated_at ||
                  null;

                return (
                  <div
                    key={slipId ?? idx}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 hover:border-orange-200"
                  >
                    <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {monthName} {slip.year || selectedYear}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {paidOn
                            ? `Paid on: ${formatDate(paidOn)}`
                            : "Payment date unavailable"}
                        </p>
                      </div>

                      <span className={getStatusBadge(status)}>
                        {status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Gross Earnings:</span>
                        <span className="font-semibold text-gray-900">
                          {formatAmount(grossSalary)}
                        </span>
                      </div>

                      <div className="flex justify-between text-rose-600">
                        <span>Total Deductions:</span>
                        <span className="font-semibold">
                          {totalDeductions != null
                            ? `-${formatCurrency(totalDeductions)}`
                            : "Not available"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="font-bold text-gray-900">
                          Net Take-Home:
                        </span>
                        <span className="font-black text-base text-emerald-700">
                          {formatAmount(netSalary)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(slipId)}
                        disabled={!slipId}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold disabled:opacity-50"
                      >
                        <LuEye className="w-3.5 h-3.5" />
                        Breakdown
                      </button>

                      <button
                        onClick={() =>
                          handleDownload(slipId, monthName)
                        }
                        disabled={
                          !slipId || downloadingId === slipId
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold disabled:opacity-50"
                      >
                        <LuDownload className="w-3.5 h-3.5" />
                        {downloadingId === slipId
                          ? "Downloading..."
                          : "PDF Slip"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== SALARY STRUCTURE ===================== */}
      {activeTab === "STRUCTURE" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900">
              Annual CTC & Compensation Package
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Salary components, statutory settings and bank details
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">
              Loading salary structure...
            </div>
          ) : !salaryStructure ? (
            <div className="text-center py-12 text-xs text-gray-500">
              No salary structure registered in database.
            </div>
          ) : (
            <div className="space-y-6">
              {/* SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-[11px] font-bold text-orange-700 uppercase">
                    Monthly Gross
                  </span>
                  <p className="text-2xl font-black text-orange-950 mt-1">
                    {formatAmount(salaryStructure.gross_monthly)}
                  </p>
                  <span className="text-[10px] text-orange-600">
                    Fixed + Allowances
                  </span>
                </div>

                

                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-[11px] font-bold text-purple-700 uppercase">
                    Annualized CTC
                  </span>
                  <p className="text-2xl font-black text-purple-950 mt-1">
                    {formatAmount(salaryStructure.ctc_annual)}
                  </p>
                  <span className="text-[10px] text-purple-600">
                    Cost to Company
                  </span>
                </div>
              </div>

              {/* SALARY DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* EARNINGS */}
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                    <LuTrendingUp className="w-4 h-4 text-emerald-600" />
                    Earnings Components
                  </h3>

                  <div className="space-y-2 text-xs">
                    {[
                      ["Basic Salary", "basic_salary"],
                      ["House Rent Allowance (HRA)", "hra"],
                      ["Dearness Allowance (DA)", "da"],
                      ["Travel Allowance (TA)", "ta"],
                      ["Special Allowance", "special_allowance"],
                      ["Class Teacher Allowance", "class_teacher_allowance"],
                      ["HOD Allowance", "hod_allowance"],
                      ["House Master Allowance", "house_master_allowance"],
                    ].map(([label, key]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-gray-700 font-medium">
                          {label}
                        </span>
                        <span className="font-bold text-gray-900 whitespace-nowrap">
                          {formatAmount(salaryStructure[key])}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 font-bold text-emerald-900">
                      <span>Monthly Gross</span>
                      <span>
                        {formatAmount(salaryStructure.gross_monthly)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STATUTORY SETTINGS AND BANK */}
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-rose-800">
                    <LuCircleArrowDown className="w-4 h-4 text-rose-600" />
                    Salary Settings & Bank Details
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        Structure ID
                      </span>
                      <span className="font-bold text-gray-900">
                        {salaryStructure.structure_id ?? "-"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        Effective From
                      </span>
                      <span className="font-bold text-gray-900 text-right">
                        {salaryStructure.effective_from
                          ? formatDate(salaryStructure.effective_from)
                          : "Not available"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        EPF Applicable
                      </span>
                      <YesNo value={salaryStructure.epf_applicable} />
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        ESI Applicable
                      </span>
                      <YesNo value={salaryStructure.esi_applicable} />
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        Professional Tax Applicable
                      </span>
                      <YesNo value={salaryStructure.pt_applicable} />
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5 border-b border-gray-100">
                      <span className="text-gray-700">
                        Bank Name
                      </span>
                      <span className="font-bold text-gray-900">
                        {salaryStructure.bank_name || "Not available"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-3 py-1.5">
                      <span className="text-gray-700">
                        Bank Account
                      </span>
                      <span className="font-bold text-gray-900">
                        {salaryStructure.bank_account_masked ||
                          "Not available"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DEDUCTIONS INFORMATION */}
              {/* <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Deductions & Net Salary
                </h3>

                {Array.isArray(salaryStructure.deductions) &&
                salaryStructure.deductions.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {salaryStructure.deductions.map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="flex justify-between items-center py-1.5 border-b border-gray-100"
                      >
                        <span className="text-gray-700">
                          {item.name ||
                            item.component ||
                            item.component_name ||
                            "Deduction"}
                        </span>
                        <span className="font-bold text-rose-600">
                          -{formatAmount(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    The API has not provided a deductions breakdown
                    or calculated net salary for this structure.
                    These values will appear when the backend returns them.
                  </p>
                )}

                {(salaryStructure.monthly_net != null ||
                  salaryStructure.net_salary != null ||
                  salaryStructure.net_pay != null) && (
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 text-sm font-bold">
                    <span>Net Monthly Salary</span>
                    <span className="text-emerald-700">
                      {formatAmount(
                        salaryStructure.monthly_net ??
                          salaryStructure.net_salary ??
                          salaryStructure.net_pay
                      )}
                    </span>
                  </div>
                )}
              </div> */}
            </div>
          )}
        </div>
      )}

      {/* ===================== LOANS ===================== */}
      {activeTab === "LOANS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900">
              Loans & Salary Advances Ledger
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Track salary advances, loans and EMI deductions
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs text-gray-400">
              Loading loan records...
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-500">
              No active or historical loans found on record.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loans.map((loan, idx) => {
                const loanId =
                  loan.loan_id ??
                  loan.id ??
                  loan.loan_number ??
                  idx;

                return (
                  <div
                    key={loanId}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/40 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {loan.loan_type ||
                            loan.type ||
                            "Salary Advance"}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          Loan #{loan.loan_number || loan.loan_id || loan.id || "-"}
                        </p>
                      </div>

                      <span className={getStatusBadge(loan.status || "ACTIVE")}>
                        {loan.status || "ACTIVE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400">
                          Principal Disbursed:
                        </span>
                        <p className="font-semibold text-gray-900">
                          {formatAmount(
                            loan.principal_amount ?? loan.amount
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">
                          Monthly EMI:
                        </span>
                        <p className="font-semibold text-orange-600">
                          {formatAmount(
                            loan.emi_amount ?? loan.emi
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">
                          Remaining Balance:
                        </span>
                        <p className="font-bold text-rose-600">
                          {formatAmount(
                            loan.balance_amount ??
                              loan.remaining_balance
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">
                          Disbursed Date:
                        </span>
                        <p className="font-semibold text-gray-800">
                          {loan.disbursed_date ||
                          loan.disbursement_date
                            ? formatDate(
                                loan.disbursed_date ??
                                  loan.disbursement_date
                              )
                            : "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== PAYSLIP BREAKDOWN MODAL ===================== */}
      {activePayslipModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <LuBuilding2 className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-gray-900">
                  Payslip Itemized Statement
                </h3>
              </div>

              <button
                onClick={closePayslipModal}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                title="Close"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            {activePayslipModal.loading ? (
              <div className="py-16 text-center text-xs text-gray-400 animate-pulse">
                Fetching itemized breakdown...
              </div>
            ) : !activePayslipModal.data ? (
              <div className="py-12 text-center text-xs text-gray-500">
                Breakdown details not available.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {(() => {
                  const detail = activePayslipModal.data;
                  const earnings = Array.isArray(detail.earnings)
                    ? detail.earnings
                    : [];
                  const deductions = Array.isArray(detail.deductions)
                    ? detail.deductions
                    : [];

                  return (
                    <>
                      {/* PERIOD */}
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-gray-400">Period:</span>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {detail.month_name ||
                              (detail.month
                                ? `${MONTHS[detail.month - 1]} ${
                                    detail.year || ""
                                  }`
                                : "-")}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-400">
                            Working Days:
                          </span>
                          <p className="font-bold text-gray-900 mt-0.5">
                            {detail.working_days ?? "Not available"}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-400">LOP Days:</span>
                          <p className="font-bold text-rose-600 mt-0.5">
                            {detail.lop_days ?? "Not available"}
                          </p>
                        </div>
                      </div>

                      {/* EARNINGS */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">
                          Earnings
                        </h4>

                        <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100/60 space-y-2">
                          {earnings.length === 0 ? (
                            <p className="text-gray-500 py-1">
                              No earnings breakdown provided by API.
                            </p>
                          ) : (
                            earnings.map((item, idx) => (
                              <div
                                key={item.id ?? idx}
                                className="flex justify-between items-center text-gray-700 gap-3"
                              >
                                <span>
                                  {item.name ||
                                    item.component ||
                                    item.component_name ||
                                    "Earning"}
                                </span>
                                <span className="font-bold whitespace-nowrap">
                                  {formatAmount(item.amount)}
                                </span>
                              </div>
                            ))
                          )}

                          <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center font-bold text-emerald-950">
                            <span>Gross Salary:</span>
                            <span>
                              {formatAmount(
                                detail.gross_salary ??
                                  detail.gross_earnings ??
                                  detail.gross
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* DEDUCTIONS */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-rose-800 uppercase tracking-wider text-[11px]">
                          Deductions
                        </h4>

                        <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100/60 space-y-2">
                          {deductions.length === 0 ? (
                            <p className="text-gray-500 py-1">
                              No deductions breakdown provided by API.
                            </p>
                          ) : (
                            deductions.map((item, idx) => (
                              <div
                                key={item.id ?? idx}
                                className="flex justify-between items-center text-gray-700 gap-3"
                              >
                                <span>
                                  {item.name ||
                                    item.component ||
                                    item.component_name ||
                                    "Deduction"}
                                </span>
                                <span className="font-bold text-rose-600 whitespace-nowrap">
                                  -{formatAmount(item.amount)}
                                </span>
                              </div>
                            ))
                          )}

                          <div className="pt-2 border-t border-rose-200/60 flex justify-between items-center font-bold text-rose-950">
                            <span>Total Deductions:</span>
                            <span>
                              {detail.total_deductions != null
                                ? `-${formatCurrency(detail.total_deductions)}`
                                : "Not available"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* NET PAY */}
                      <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl text-white flex justify-between items-center shadow-md gap-3">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                            Net Pay Credited
                          </span>
                          <p className="text-xl font-black mt-0.5">
                            {formatAmount(
                              detail.net_salary ??
                                detail.net_pay ??
                                detail.net
                            )}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            handleDownload(
                              activePayslipModal.slipId,
                              detail.month_name ||
                                (detail.month
                                  ? MONTHS[detail.month - 1]
                                  : "")
                            )
                          }
                          disabled={
                            downloadingId === activePayslipModal.slipId
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-50 disabled:opacity-50"
                        >
                          <LuDownload className="w-3.5 h-3.5" />
                          {downloadingId === activePayslipModal.slipId
                            ? "Downloading..."
                            : "Download PDF"}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
