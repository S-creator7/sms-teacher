import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LuUser,
  LuGraduationCap,
  LuBriefcase,
  LuUsers,
  LuFileText,
  LuDownload,
  LuPencil,
  LuTrash2,
  LuPlus,
  LuX,
  LuCircleCheckBig,
  LuTriangleAlert,
  LuExternalLink,
  LuRefreshCw,
  LuShieldCheck,
  LuUpload,
} from "react-icons/lu";
import {
  getProfile,
  updateProfile,
  downloadServiceBook,
  addQualification,
  editQualification,
  deleteQualification,
  addExperience,
  editExperience,
  deleteExperience,
  getNominees,
  addNominee,
  editNominee,
  deleteNominee,
  getDocuments,
  uploadRawFile,
  uploadDocument,
  editDocument,
  deleteDocument,
} from "../../Utility/hrmsApi";
import { getStatusBadge, formatDate } from "../../Utility/hrmsUtils";

// ---------- Backend-exact editable fields ----------
const EDITABLE_FIELDS = [
  "phone",
  "alternate_phone",
  "blood_group",
  "marital_status",
  "current_address",
  "permanent_address",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_phone",
  "profile_picture_url",
];

// ---------- Backend enums ----------
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL_STATUSES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"];
const RELATIONSHIPS = [
  "SPOUSE",
  "SON",
  "DAUGHTER",
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "OTHER",
];

// Nominee benefit types (backend enum)
const BENEFIT_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "EPF", label: "EPF (Provident Fund)" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "GRATUITY", label: "Gratuity" },
];

// Document types (confirmed backend enum values)
const DOC_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "MARKSHEET_10", label: "10th Marksheet" },
  { value: "MARKSHEET_12", label: "12th Marksheet" },
  { value: "GRADUATION_DEGREE", label: "Graduation Degree" },
  { value: "BED_MED_CERT", label: "B.Ed / M.Ed Certificate" },
  { value: "CTET_STET_CERT", label: "CTET / STET Certificate" },
  { value: "POLICE_VERIFICATION", label: "Police Verification" },
  { value: "RELIEVING_LETTER", label: "Relieving Letter" },
  { value: "EXPERIENCE_LETTER", label: "Experience Letter" },
  { value: "MEDICAL_CERT", label: "Medical Certificate" },
  { value: "OTHER", label: "Other Document" },
];

// ---------- Helpers ----------
function cleanValue(v, fallback = "-") {
  if (v === null || v === undefined) return fallback;

  
  if (typeof v === "number") {
    return v === 0 ? fallback : String(v);
  }


  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return fallback;
    if (
      trimmed.startsWith("Unknown Type:") ||
      trimmed.startsWith("Unknown Ty") ||
      trimmed === "string" ||
      trimmed === "null" ||
      trimmed === "undefined"
    ) {
      return fallback;
    }
    return trimmed;
  }

  return v;
}

function validateFile(file) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  if (!file) return "No file selected";
  if (file.size > MAX_SIZE) return "File size must be under 10 MB";
  if (!ALLOWED.includes(file.type)) return "Only PDF, JPG, or PNG allowed";
  return null;
}

function getFileMetaFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const lower = url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(lower)) {
    return { isImage: true, isPdf: false };
  }
  if (lower.includes(".pdf")) {
    return { isImage: false, isPdf: true };
  }
  return { isImage: false, isPdf: false };
}

export default function HrmsProfile() {
  const [activeTab, setActiveTab] = useState("PROFILE");
  const [loading, setLoading] = useState(true);
  const [downloadingBook, setDownloadingBook] = useState(false);

  const [profile, setProfile] = useState(null);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const [qualifications, setQualifications] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [nominees, setNominees] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [modalState, setModalState] = useState({
    type: null,
    data: null,
    isOpen: false,
    isSubmitting: false,
  });

  const [pickedFile, setPickedFile] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({
    type: null,
    id: null,
    title: "",
    isOpen: false,
    isDeleting: false,
  });

  // ===================== LOAD ALL =====================
  const loadAll = async () => {
    try {
      setLoading(true);
      const [profRes, nomRes, docRes] = await Promise.all([
        getProfile(),
        getNominees().catch(() => null),
        getDocuments().catch(() => null),
      ]);

      const pData = profRes?.resources?.data || profRes?.data || null;
      setProfile(pData);

      const extractList = (res, pKey) => {
        const direct = res?.resources?.data ?? res?.data;
        if (Array.isArray(direct)) return direct;
        const fromProfile = pData?.[pKey];
        return Array.isArray(fromProfile) ? fromProfile : [];
      };

      setQualifications(extractList(null, "qualifications"));
      setExperiences(extractList(null, "experiences"));
      setNominees(extractList(nomRes, "nominees"));
      setDocuments(extractList(docRes, "documents"));
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "Failed to load profile & service book"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!modalState.isOpen) setPickedFile(null);
  }, [modalState.isOpen]);

  // ===================== DOWNLOAD SERVICE BOOK =====================
  const handleDownloadBook = async () => {
    try {
      setDownloadingBook(true);
      await downloadServiceBook();
      toast.success("Service Book downloaded successfully");
    } catch (err) {
      toast.error("Failed to download Service Book");
    } finally {
      setDownloadingBook(false);
    }
  };

  // ===================== EDIT PROFILE =====================
  const openEditProfile = () => {
    const f = {};
    EDITABLE_FIELDS.forEach((k) => {
      f[k] = cleanValue(profile?.[k], "");
    });
    setProfileForm(f);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);

      const payload = {};
      EDITABLE_FIELDS.forEach((k) => {
        const val = profileForm[k];
        if (
          val === "" ||
          val === null ||
          val === undefined ||
          (typeof val === "string" &&
            (val.trim() === "" ||
              val.startsWith("Unknown Type:") ||
              val.startsWith("Unknown Ty") ||
              val.trim() === "string"))
        ) {
          payload[k] = null;
        } else {
          payload[k] = typeof val === "string" ? val.trim() : val;
        }
      });

      if (payload.marital_status)
        payload.marital_status = payload.marital_status.toUpperCase();
      if (payload.blood_group)
        payload.blood_group = payload.blood_group.toUpperCase();

      await updateProfile(payload);
      toast.success("Profile updated successfully");
      setIsEditProfileOpen(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // ===================== CRUD HANDLERS =====================
  const uploadAndGetUrl = async (file) => {
    const res = await uploadRawFile(file);
    const url =
      res?.resources?.file?.url ||
      res?.resources?.data?.url ||
      res?.data?.url ||
      res?.file?.url ||
      res?.url;
    if (!url) throw new Error("File upload succeeded but no URL returned");
    return url;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const { type, data } = modalState;

    if (type === "DOC_ADD" && !pickedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setModalState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // ---------- QUALIFICATIONS ----------
      if (type === "QUAL_ADD" || type === "QUAL_EDIT") {
        const payload = {
          degree_name: data.degree_name || null,
          field_of_study: cleanValue(data.field_of_study, null) || null,
          institution_name: data.institution_name || null,
          university_board: cleanValue(data.university_board, null) || null,
          passing_year: data.passing_year || null,
          percentage_or_cgpa:
            cleanValue(data.percentage_or_cgpa, null) || null,
          is_teacher_eligibility: !!data.is_teacher_eligibility,
          certificate_url: cleanValue(data.certificate_url, null) || null,
        };

        if (type === "QUAL_ADD") {
          await addQualification(payload);
          toast.success("Qualification added");
        } else {
          await editQualification(data.qualification_id || data.id, payload);
          toast.success("Qualification updated");
        }
      }

      // ---------- EXPERIENCES ----------
      else if (type === "EXP_ADD" || type === "EXP_EDIT") {
        const payload = {
          previous_institution: data.previous_institution || null,
          designation: data.designation || null,
          subjects_taught: cleanValue(data.subjects_taught, null) || null,
          classes_handled: cleanValue(data.classes_handled, null) || null,
          start_date: data.start_date || null,
          end_date: cleanValue(data.end_date, null) || null,
          relieving_reason: cleanValue(data.relieving_reason, null) || null,
          experience_letter_url:
            cleanValue(data.experience_letter_url, null) || null,
        };

        if (type === "EXP_ADD") {
          await addExperience(payload);
          toast.success("Experience record added");
        } else {
          await editExperience(data.experience_id || data.id, payload);
          toast.success("Experience record updated");
        }
      }

      // ---------- NOMINEES ----------
      else if (type === "NOM_ADD" || type === "NOM_EDIT") {
        // Build payload — optional fields ko skip karo, null nahi bhejo
        const payload = {
          nominee_name: data.nominee_name || null,
          relationship: cleanValue(data.relationship, null) || null,
          share_percentage: parseFloat(data.share_percentage) || 0,
          benefit_type: data.benefit_type || "GENERAL",
        };

        // Optional fields — sirf tab bhejo jab valid value ho
        const cleanDob = cleanValue(data.dob, null);
        if (cleanDob && /^\d{4}-\d{2}-\d{2}$/.test(cleanDob)) {
          payload.dob = cleanDob;
        }
        // agar dob invalid/empty hai to payload mein dob field hi nahi jayega

        const cleanPhone = cleanValue(data.phone, null);
        if (cleanPhone) payload.phone = cleanPhone;

        const cleanAadhaar = cleanValue(data.aadhaar_number, null);
        if (cleanAadhaar) payload.aadhaar_number = cleanAadhaar;

        if (type === "NOM_ADD") {
          await addNominee(payload);
          toast.success("Nominee added");
        } else {
          await editNominee(data.nominee_id || data.id, payload);
          toast.success("Nominee updated");
        }
      }

      // ---------- DOCUMENTS ----------
      else if (type === "DOC_ADD") {
        const fileUrl = await uploadAndGetUrl(pickedFile);
        await uploadDocument({
          document_type: data.document_type,
          document_number:
            cleanValue(data.document_number, null) || undefined,
          file_url: fileUrl,
          file_name: pickedFile.name,
          file_size_kb: Math.round(pickedFile.size / 1024),
        });
        toast.success("Document uploaded successfully");
        setPickedFile(null);
      } else if (type === "DOC_EDIT") {
        let finalUrl = data.file_url;
        let finalFileName = data.file_name || "document";
        let finalSizeKb = data.file_size_kb || 0;

        if (pickedFile) {
          finalUrl = await uploadAndGetUrl(pickedFile);
          finalFileName = pickedFile.name;
          finalSizeKb = Math.round(pickedFile.size / 1024);
        }

        const docId = data.document_id || data.id;
        await editDocument(docId, {
          document_type: data.document_type,
          document_number:
            cleanValue(data.document_number, null) || undefined,
          file_url: finalUrl,
          file_name: finalFileName,
          file_size_kb: finalSizeKb,
        });
        toast.success("Document updated");
        setPickedFile(null);
      }

      setModalState({
        type: null,
        data: null,
        isOpen: false,
        isSubmitting: false,
      });
      loadAll();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Operation failed"
      );
      setModalState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleExecuteDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));

    try {
      if (type === "QUAL") {
        await deleteQualification(id);
        toast.success("Qualification deleted");
      } else if (type === "EXP") {
        await deleteExperience(id);
        toast.success("Experience record deleted");
      } else if (type === "NOM") {
        await deleteNominee(id);
        toast.success("Nominee deleted");
      } else if (type === "DOC") {
        await deleteDocument(id);
        toast.success("Document deleted");
      }

      setDeleteConfirm({
        type: null,
        id: null,
        title: "",
        isOpen: false,
        isDeleting: false,
      });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record");
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // ===================== DERIVED =====================
  const fullNameParts = [
    profile?.first_name,
    profile?.middle_name,
    profile?.last_name,
  ].filter(Boolean);
  const fullName =
    fullNameParts.length > 0 ? fullNameParts.join(" ") : "Faculty Member";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const totalNomineeShare = nominees.reduce(
    (acc, curr) => acc + (parseFloat(curr.share_percentage) || 0),
    0
  );

  const safeProfilePic = cleanValue(profile?.profile_picture_url, null);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ============ TOP HEADER ============ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {safeProfilePic ? (
            <img
              src={safeProfilePic}
              alt={fullName}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-bold text-xl flex items-center justify-center shadow-md">
              {initials}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">
                {fullName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                {cleanValue(profile?.employee_code, "TCH")}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {cleanValue(profile?.designation_title)} &bull;{" "}
              {cleanValue(profile?.department_name)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadAll()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 shadow-sm transition"
            title="Refresh profile"
          >
            <LuRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-orange-500" : ""
                }`}
            />
          </button>
          <button
            onClick={handleDownloadBook}
            disabled={downloadingBook || !profile}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <LuDownload className="w-4 h-4 text-orange-500" />
            {downloadingBook ? "Generating PDF..." : "Download Service Book"}
          </button>
          <button
            onClick={openEditProfile}
            disabled={!profile}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <LuPencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-xs">
        {[
          { key: "PROFILE", label: "Personal & Service Info", Icon: LuUser, count: null },
          { key: "QUALIFICATIONS", label: "Qualifications", Icon: LuGraduationCap, count: qualifications.length },
          { key: "EXPERIENCE", label: "Prior Experience", Icon: LuBriefcase, count: experiences.length },
          { key: "NOMINEES", label: "Nominees", Icon: LuUsers, count: nominees.length },
          { key: "DOCUMENTS", label: "Document Vault", Icon: LuFileText, count: documents.length },
        ].map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 font-bold rounded-xl flex items-center gap-2 transition whitespace-nowrap ${activeTab === key
              ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {count !== null && ` (${count})`}
          </button>
        ))}
      </div>

      {/* ============ TAB 1: PROFILE ============ */}
      {activeTab === "PROFILE" && profile && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  Personal Information
                </h3>
                <span className="text-[10px] font-semibold text-gray-400">
                  Self-Updatable
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Gender</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.gender)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Date of Birth</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {formatDate(profile.dob)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Blood Group</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.blood_group)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Marital Status</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.marital_status)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Phone Number</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.phone)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Alternate Phone</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.alternate_phone)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Official Email</span>
                  <p className="font-semibold text-gray-800 mt-0.5 break-all">
                    {cleanValue(profile.email)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">
                    Current Residential Address
                  </span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.current_address)}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Permanent Address</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.permanent_address)}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Employment */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  Official Employment Details
                </h3>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  Admin Managed
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Employee Code</span>
                  <p className="font-semibold font-mono text-gray-800 mt-0.5">
                    {cleanValue(profile.employee_code)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Status</span>
                  <p className="mt-0.5">
                    <span
                      className={getStatusBadge(
                        cleanValue(profile.status, "ACTIVE")
                      )}
                    >
                      {cleanValue(profile.status, "ACTIVE")}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Designation</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.designation_title)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Department</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.department_name)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Employment Type</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.employment_type)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Staff Category</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.staff_category)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Cadre</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.cadre)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Date of Joining</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {formatDate(profile.doj)}
                  </p>
                </div>
                {cleanValue(profile.probation_end_date, null) && (
                  <div>
                    <span className="text-gray-400">Probation Ends</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {formatDate(profile.probation_end_date)}
                    </p>
                  </div>
                )}
                {cleanValue(profile.confirmation_date, null) && (
                  <div>
                    <span className="text-gray-400">Confirmation Date</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {formatDate(profile.confirmation_date)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Notice Period</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {profile.notice_period_days != null
                      ? `${profile.notice_period_days} days`
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Reporting Manager</span>
                  <p className="font-semibold text-gray-800 mt-0.5">
                    {cleanValue(profile.reporting_manager_name)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 mb-3">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-gray-400">Name</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {cleanValue(profile.emergency_contact_name)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Relation</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {cleanValue(profile.emergency_contact_relation)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Phone</span>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {cleanValue(profile.emergency_contact_phone)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 2: QUALIFICATIONS ============ */}
      {activeTab === "QUALIFICATIONS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Educational & Professional Qualifications
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Degrees, certifications, universities, and marks obtained
              </p>
            </div>
            <button
              onClick={() =>
                setModalState({
                  type: "QUAL_ADD",
                  data: {
                    degree_name: "",
                    field_of_study: "",
                    institution_name: "",
                    university_board: "",
                    passing_year: new Date().getFullYear(),
                    percentage_or_cgpa: "",
                    is_teacher_eligibility: false,
                    certificate_url: "",
                  },
                  isOpen: true,
                  isSubmitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
            >
              <LuPlus className="w-3.5 h-3.5" /> Add Qualification
            </button>
          </div>

          {qualifications.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No educational qualifications added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualifications.map((q) => {
                const qId = q.qualification_id || q.id;
                return (
                  <div
                    key={qId}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 relative"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-gray-900">
                            {cleanValue(q.degree_name)}
                          </h4>
                          {!!q.is_teacher_eligibility && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <LuCircleCheckBig className="w-3 h-3" /> Teaching
                              Eligible
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {cleanValue(q.institution_name)}
                        </p>
                        {cleanValue(q.field_of_study, null) && (
                          <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
                            {q.field_of_study}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setModalState({
                              type: "QUAL_EDIT",
                              data: {
                                qualification_id: qId,
                                degree_name: q.degree_name || "",
                                field_of_study: q.field_of_study || "",
                                institution_name: q.institution_name || "",
                                university_board: q.university_board || "",
                                passing_year:
                                  q.passing_year || new Date().getFullYear(),
                                percentage_or_cgpa:
                                  q.percentage_or_cgpa || "",
                                is_teacher_eligibility:
                                  !!q.is_teacher_eligibility,
                                certificate_url: q.certificate_url || "",
                              },
                              isOpen: true,
                              isSubmitting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-orange-600 transition"
                        >
                          <LuPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "QUAL",
                              id: qId,
                              title: q.degree_name || "Qualification",
                              isOpen: true,
                              isDeleting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-rose-600 transition"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">
                          University / Board:
                        </span>
                        <p className="font-semibold text-gray-800">
                          {cleanValue(q.university_board)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Passing Year:</span>
                        <p className="font-semibold text-gray-800">
                          {cleanValue(q.passing_year)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Score / CGPA:</span>
                        <p className="font-semibold text-gray-800">
                          {cleanValue(q.percentage_or_cgpa)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Field of Study:</span>
                        <p className="font-semibold text-gray-800">
                          {cleanValue(q.field_of_study)}
                        </p>
                      </div>
                    </div>

                    {cleanValue(q.certificate_url, null) && (
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <a
                          href={q.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <LuExternalLink className="w-3.5 h-3.5" /> View
                          Certificate
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 3: EXPERIENCE ============ */}
      {activeTab === "EXPERIENCE" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Prior Employment History
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Past institutions, designations, durations, and letters
              </p>
            </div>
            <button
              onClick={() =>
                setModalState({
                  type: "EXP_ADD",
                  data: {
                    previous_institution: "",
                    designation: "",
                    subjects_taught: "",
                    classes_handled: "",
                    start_date: "",
                    end_date: "",
                    relieving_reason: "",
                    experience_letter_url: "",
                  },
                  isOpen: true,
                  isSubmitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
            >
              <LuPlus className="w-3.5 h-3.5" /> Add Experience
            </button>
          </div>

          {experiences.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No prior work experience added.
            </div>
          ) : (
            <div className="space-y-4">
              {experiences.map((exp) => {
                const expId = exp.experience_id || exp.id;
                return (
                  <div
                    key={expId}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900">
                          {cleanValue(exp.previous_institution)}
                        </h4>
                        <p className="text-xs text-orange-600 font-semibold mt-0.5">
                          {cleanValue(exp.designation)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setModalState({
                              type: "EXP_EDIT",
                              data: {
                                experience_id: expId,
                                previous_institution:
                                  exp.previous_institution || "",
                                designation: exp.designation || "",
                                subjects_taught: exp.subjects_taught || "",
                                classes_handled: exp.classes_handled || "",
                                start_date:
                                  exp.start_date?.split("T")[0] || "",
                                end_date: exp.end_date?.split("T")[0] || "",
                                relieving_reason:
                                  exp.relieving_reason || "",
                                experience_letter_url:
                                  exp.experience_letter_url || "",
                              },
                              isOpen: true,
                              isSubmitting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-orange-600 transition"
                        >
                          <LuPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "EXP",
                              id: expId,
                              title: `${cleanValue(
                                exp.designation,
                                "Experience"
                              )} at ${cleanValue(
                                exp.previous_institution,
                                "Institution"
                              )}`,
                              isOpen: true,
                              isDeleting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-rose-600 transition"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 flex items-center gap-4 flex-wrap">
                      <span>
                        <strong>From:</strong> {formatDate(exp.start_date)}
                      </span>
                      <span>
                        <strong>To:</strong>{" "}
                        {exp.end_date ? formatDate(exp.end_date) : "Present"}
                      </span>
                    </div>

                    {(cleanValue(exp.subjects_taught, null) ||
                      cleanValue(exp.classes_handled, null)) && (
                        <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-gray-100">
                          {cleanValue(exp.subjects_taught, null) && (
                            <div>
                              <span className="text-gray-400">
                                Subjects Taught:
                              </span>
                              <p className="font-semibold text-gray-800">
                                {exp.subjects_taught}
                              </p>
                            </div>
                          )}
                          {cleanValue(exp.classes_handled, null) && (
                            <div>
                              <span className="text-gray-400">
                                Classes Handled:
                              </span>
                              <p className="font-semibold text-gray-800">
                                {exp.classes_handled}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    {cleanValue(exp.relieving_reason, null) && (
                      <div className="text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block mb-1">
                          Relieving Reason:
                        </span>
                        {exp.relieving_reason}
                      </div>
                    )}

                    {cleanValue(exp.experience_letter_url, null) && (
                      <div className="pt-2 border-t border-gray-100">
                        <a
                          href={exp.experience_letter_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <LuExternalLink className="w-3.5 h-3.5" /> View
                          Experience Letter
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ TAB 4: NOMINEES ============ */}
      {activeTab === "NOMINEES" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900">
                  PF & Gratuity Nominees
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${totalNomineeShare === 100
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                >
                  Total Share: {totalNomineeShare}%{" "}
                  {totalNomineeShare === 100 ? "(Complete)" : "(Target: 100%)"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Beneficiaries designated for statutory provident funds &
                benefits
              </p>
            </div>
            <button
              onClick={() =>
                setModalState({
                  type: "NOM_ADD",
                  data: {
                    nominee_name: "",
                    relationship: "SPOUSE",
                    dob: "",
                    phone: "",
                    aadhaar_number: "",
                    share_percentage:
                      100 - totalNomineeShare > 0
                        ? 100 - totalNomineeShare
                        : 0,
                    benefit_type: "GENERAL",
                  },
                  isOpen: true,
                  isSubmitting: false,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
            >
              <LuPlus className="w-3.5 h-3.5" /> Add Nominee
            </button>
          </div>

          {nominees.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No nominees added.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nominees.map((nom) => {
                const nomId = nom.nominee_id || nom.id;
                return (
                  <div
                    key={nomId}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900">
                          {cleanValue(nom.nominee_name)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                            {cleanValue(nom.relationship)}
                          </span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {cleanValue(nom.benefit_type)}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {nom.share_percentage ?? 0}% Share
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setModalState({
                              type: "NOM_EDIT",
                              data: {
                                nominee_id: nomId,
                                nominee_name: nom.nominee_name || "",
                                relationship: nom.relationship || "SPOUSE",
                                dob: nom.dob?.split("T")[0] || "",
                                phone: nom.phone || "",
                                aadhaar_number: nom.aadhaar_number || "",
                                share_percentage: nom.share_percentage ?? 0,
                                benefit_type: nom.benefit_type || "GENERAL",
                              },
                              isOpen: true,
                              isSubmitting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-orange-600 transition"
                        >
                          <LuPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "NOM",
                              id: nomId,
                              title: cleanValue(nom.nominee_name, "Nominee"),
                              isOpen: true,
                              isDeleting: false,
                            })
                          }
                          className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-rose-600 transition"
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">DOB:</span>
                        <p className="font-semibold text-gray-800">
                          {formatDate(nom.dob)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Phone:</span>
                        <p className="font-semibold text-gray-800">
                          {cleanValue(nom.phone)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">
                          Aadhaar Number:
                        </span>
                        <p className="font-semibold text-gray-800 font-mono">
                          {cleanValue(nom.aadhaar_number)}
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

      {/* ============ TAB 5: DOCUMENTS ============ */}
      {activeTab === "DOCUMENTS" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Digital Document Vault
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Statutory ID cards, academic degrees, and verification records
              </p>
            </div>
            <button
              onClick={() => {
                setPickedFile(null);
                setModalState({
                  type: "DOC_ADD",
                  data: {
                    document_type: "AADHAAR",
                    document_number: "",
                    file_url: "",
                    file_name: "",
                    file_size_kb: 0,
                  },
                  isOpen: true,
                  isSubmitting: false,
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition"
            >
              <LuPlus className="w-3.5 h-3.5" /> Upload Document
            </button>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
            <LuShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Compliance Notice:</strong> Documents marked as{" "}
              <span className="font-bold text-emerald-700">VERIFIED</span> by
              HR cannot be edited or deleted. Contact HR for revisions.
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">
              No documents in vault.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => {
                const docId = doc.document_id ?? doc.id;
                const fileUrl =
                  cleanValue(doc.file_url, null) ||
                  cleanValue(doc.document_url, null);
                const fileName =
                  cleanValue(doc.file_name, null) ||
                  cleanValue(doc.document_name, null) ||
                  "Document";
                const isVerified = doc.verification_status === "VERIFIED";
                const meta = getFileMetaFromUrl(fileUrl);

                return (
                  <div
                    key={docId}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        {meta?.isImage && fileUrl ? (
                          <img
                            src={fileUrl}
                            alt={fileName}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                            <LuFileText className="w-5 h-5 text-orange-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">
                            {fileName}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                            {doc.document_type?.replace(/_/g, " ")} &bull;{" "}
                            {cleanValue(doc.document_number, "No Ref")}
                          </p>
                          {doc.file_size_kb > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {doc.file_size_kb} KB
                            </p>
                          )}
                        </div>
                      </div>

                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          <LuCircleCheckBig className="w-3 h-3 text-emerald-700" />{" "}
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <LuExternalLink className="w-3.5 h-3.5" /> View File
                        </a>
                      ) : (
                        <span className="text-gray-400">No File</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setPickedFile(null);
                            setModalState({
                              type: "DOC_EDIT",
                              data: {
                                document_id: docId,
                                document_type: doc.document_type,
                                document_number: doc.document_number || "",
                                file_url: fileUrl,
                                file_name: fileName,
                                file_size_kb: doc.file_size_kb || 0,
                              },
                              isOpen: true,
                              isSubmitting: false,
                            });
                          }}
                          disabled={isVerified}
                          title={
                            isVerified
                              ? "Locked: Document verified by HR"
                              : "Edit document"
                          }
                          className={`p-1.5 rounded-lg text-xs font-semibold transition ${isVerified
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-600 hover:text-orange-600 hover:bg-white"
                            }`}
                        >
                          <LuPencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              type: "DOC",
                              id: docId,
                              title: fileName,
                              isOpen: true,
                              isDeleting: false,
                            })
                          }
                          disabled={isVerified}
                          title={
                            isVerified
                              ? "Locked: Document verified by HR"
                              : "Delete document"
                          }
                          className={`p-1.5 rounded-lg text-xs font-semibold transition ${isVerified
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-600 hover:text-rose-600 hover:bg-white"
                            }`}
                        >
                          <LuTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ MODAL: EDIT PROFILE ============ */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                Edit Personal Profile
              </h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700">Phone</label>

                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={profileForm.phone || ""}
                    onChange={(e) =>
                      setModalState({
                        ...modalState,
                        data: {
                          ...modalState.data,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        },
                      })
                    }
                    required
                    pattern="[0-9]{10}"
                    title="Phone number must be exactly 10 digits"
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />

                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Alternate Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.alternate_phone || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Blood Group
                  </label>
                  <select
                    value={profileForm.blood_group || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        blood_group: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  >
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Marital Status
                  </label>
                  <select
                    value={profileForm.marital_status || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        marital_status: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  >
                    <option value="">Select</option>
                    {MARITAL_STATUSES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700">
                    Current Residential Address
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.current_address || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        current_address: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    value={profileForm.permanent_address || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        permanent_address: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact_name || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        emergency_contact_name: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Emergency Contact Relation
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact_relation || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        emergency_contact_relation: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact_phone || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        emergency_contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700">
                    Profile Picture URL
                  </label>
                  <input
                    type="url"
                    value={profileForm.profile_picture_url || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        profile_picture_url: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ CRUD MODAL: SUB-ENTITIES ============ */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">
                {modalState.type?.includes("QUAL") &&
                  (modalState.type.includes("ADD")
                    ? "Add Qualification"
                    : "Edit Qualification")}
                {modalState.type?.includes("EXP") &&
                  (modalState.type.includes("ADD")
                    ? "Add Prior Experience"
                    : "Edit Prior Experience")}
                {modalState.type?.includes("NOM") &&
                  (modalState.type.includes("ADD")
                    ? "Add Nominee"
                    : "Edit Nominee")}
                {modalState.type?.includes("DOC") &&
                  (modalState.type.includes("ADD")
                    ? "Upload Document"
                    : "Edit Document")}
              </h3>
              <button
                onClick={() =>
                  setModalState({
                    type: null,
                    data: null,
                    isOpen: false,
                    isSubmitting: false,
                  })
                }
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* ---------- Qualification Form ---------- */}
              {modalState.type?.includes("QUAL") && (
                <>
                  <div>
                    <label className="font-semibold text-gray-700">
                      Degree Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={modalState.data?.degree_name || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            degree_name: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. M.Sc. Mathematics"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Field of Study
                    </label>
                    <input
                      type="text"
                      value={modalState.data?.field_of_study || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            field_of_study: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. Mathematics, Physics"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Institution Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={modalState.data?.institution_name || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            institution_name: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. St. Xavier's College"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      University / Board
                    </label>
                    <input
                      type="text"
                      value={modalState.data?.university_board || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            university_board: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. Bangalore University"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Passing Year
                      </label>
                      <input
                        type="number"
                        value={modalState.data?.passing_year || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              passing_year:
                                parseInt(e.target.value, 10) || null,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                        placeholder="e.g. 2020"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        Percentage / CGPA
                      </label>
                      <input
                        type="text"
                        value={modalState.data?.percentage_or_cgpa || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              percentage_or_cgpa: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                        placeholder="e.g. 88.5% or 8.5 CGPA"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Certificate URL
                    </label>
                    <input
                      type="url"
                      value={modalState.data?.certificate_url || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            certificate_url: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                    <input
                      type="checkbox"
                      id="is_teacher_eligibility"
                      checked={!!modalState.data?.is_teacher_eligibility}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            is_teacher_eligibility: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <label
                      htmlFor="is_teacher_eligibility"
                      className="text-xs font-semibold text-emerald-900 cursor-pointer"
                    >
                      This qualification makes me eligible for teaching (B.Ed /
                      M.Ed / CTET / NET etc.)
                    </label>
                  </div>
                </>
              )}

              {/* ---------- Experience Form ---------- */}
              {modalState.type?.includes("EXP") && (
                <>
                  <div>
                    <label className="font-semibold text-gray-700">
                      Previous Institution / School *
                    </label>
                    <input
                      required
                      type="text"
                      value={modalState.data?.previous_institution || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            previous_institution: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. Delhi Public School"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Designation *
                    </label>
                    <input
                      required
                      type="text"
                      value={modalState.data?.designation || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            designation: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. TGT Mathematics"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Subjects Taught
                      </label>
                      <input
                        type="text"
                        value={modalState.data?.subjects_taught || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              subjects_taught: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                        placeholder="e.g. Maths, Physics"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        Classes Handled
                      </label>
                      <input
                        type="text"
                        value={modalState.data?.classes_handled || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              classes_handled: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                        placeholder="e.g. 6-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Start Date *
                      </label>
                      <input
                        required
                        type="date"
                        value={modalState.data?.start_date?.split("T")[0] || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              start_date: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={modalState.data?.end_date?.split("T")[0] || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              end_date: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Relieving Reason
                    </label>
                    <textarea
                      rows={3}
                      value={modalState.data?.relieving_reason || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            relieving_reason: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. Relocated to another city"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Experience Letter URL
                    </label>
                    <input
                      type="url"
                      value={modalState.data?.experience_letter_url || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            experience_letter_url: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {/* ---------- Nominee Form ---------- */}
              {modalState.type?.includes("NOM") && (
                <>
                  <div>
                    <label className="font-semibold text-gray-700">
                      Nominee Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={modalState.data?.nominee_name || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            nominee_name: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Relationship *
                      </label>
                      <select
                        required
                        value={modalState.data?.relationship || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              relationship: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      >
                        <option value="">Select Relationship</option>
                        {RELATIONSHIPS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={modalState.data?.dob?.split("T")[0] || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: { ...modalState.data, dob: e.target.value },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Phone
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={modalState.data?.phone || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                        placeholder="10-digit mobile"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        Aadhaar Number
                      </label>
                      <input
                        type="text"
                        value={modalState.data?.aadhaar_number || ""}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              aadhaar_number: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl font-mono"
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700">
                        Share Percentage (%) *
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={modalState.data?.share_percentage ?? 100}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              share_percentage:
                                parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700">
                        Benefit Type *
                      </label>
                      <select
                        required
                        value={modalState.data?.benefit_type || "GENERAL"}
                        onChange={(e) =>
                          setModalState({
                            ...modalState,
                            data: {
                              ...modalState.data,
                              benefit_type: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      >
                        {BENEFIT_TYPES.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ---------- Document Form ---------- */}
              {modalState.type?.includes("DOC") && (
                <>
                  <div>
                    <label className="font-semibold text-gray-700">
                      Document Type *
                    </label>
                    <select
                      required
                      value={modalState.data?.document_type || "AADHAAR"}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            document_type: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={modalState.data?.document_number || ""}
                      onChange={(e) =>
                        setModalState({
                          ...modalState,
                          data: {
                            ...modalState.data,
                            document_number: e.target.value,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 border border-gray-200 rounded-xl"
                      placeholder="e.g. XXXX-XXXX-9012"
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="font-semibold text-gray-700">
                      Select File *{" "}
                      {modalState.type === "DOC_EDIT" &&
                        "(optional, keeps existing if empty)"}
                    </label>

                    <div className="mt-1">
                      {pickedFile ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            {pickedFile.type.startsWith("image/") ? (
                              <div className="w-12 h-12 rounded-lg bg-white border border-emerald-300 flex items-center justify-center shrink-0 overflow-hidden">
                                <img
                                  src={URL.createObjectURL(pickedFile)}
                                  alt="preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-white border border-emerald-300 flex items-center justify-center shrink-0">
                                <LuFileText className="w-5 h-5 text-emerald-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-emerald-900 truncate">
                                {pickedFile.name}
                              </p>
                              <p className="text-[10px] text-emerald-700">
                                {Math.round(pickedFile.size / 1024)} KB &bull;
                                Ready to upload
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPickedFile(null)}
                            className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-700 shrink-0"
                            title="Remove file"
                          >
                            <LuX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : modalState.type === "DOC_EDIT" &&
                        modalState.data?.file_url ? (
                        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <LuFileText className="w-5 h-5 text-gray-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 truncate">
                                {modalState.data.file_name || "Current file"}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Current file — select new to replace
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-orange-400 cursor-pointer transition">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <LuUpload className="w-5 h-5" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-gray-700">
                              Click to select a file
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              PDF, JPG, PNG &bull; Max 10 MB
                            </p>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const error = validateFile(file);
                              if (error) {
                                toast.error(error);
                                e.target.value = "";
                                return;
                              }
                              setPickedFile(file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    setModalState({
                      type: null,
                      data: null,
                      isOpen: false,
                      isSubmitting: false,
                    })
                  }
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalState.isSubmitting}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm transition disabled:opacity-50"
                >
                  {modalState.isSubmitting
                    ? modalState.type?.includes("DOC")
                      ? "Uploading..."
                      : "Saving..."
                    : "Submit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DELETE CONFIRMATION ============ */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <LuTriangleAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Confirm Deletion
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete{" "}
                <span className="font-bold text-gray-700">
                  "{deleteConfirm.title}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() =>
                  setDeleteConfirm({
                    type: null,
                    id: null,
                    title: "",
                    isOpen: false,
                    isDeleting: false,
                  })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={deleteConfirm.isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {deleteConfirm.isDeleting
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}