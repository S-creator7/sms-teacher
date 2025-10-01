import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Profile, ProfileUpdate, ChangePassword as ChangePasswordApi } from "../Utility/teacherApi";
import Input from "../components/CustomInput";
import userAvatar from "../../src/assets/user.png";
import { UserContext } from "../components/Provider";

let didFetchProfile = false;

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { profile } = useContext(UserContext);

  const handleSubmit = () => {
    setError("");
    setSuccess("");
    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    const employee_id = profile?.employee_id;
    if (!employee_id) {
      setError("Missing employee ID.");
      return;
    }
    setLoading(true);
    ChangePasswordApi({ employee_id, current_password: currentPassword, password: newPassword })
      .then((res) => {
        if (res?.status) {
          setSuccess("Password changed successfully.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          setError(res?.message || "Failed to change password.");
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || err?.message || "Failed to change password.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
            <p className="text-gray-600 mt-2">Update your password to keep your account secure</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Changing Password...
                  </span>
                ) : (
                  "Change Password"
                )}
              </button>

              <Link to="/user-profile" className="flex-1">
                <button className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200">
                  Cancel
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileManagement() {
  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");
  const { profile, setProfile } = useContext(UserContext);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty }
  } = useForm();

  const profileImage = watch("profile");
  const currentProfileImage = profile?.user_assets?.profile?.[0];

  const [pageLoading, setPageLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (didFetchProfile || profile?.employee_id) return;
    didFetchProfile = true;
    setPageLoading(true);
    setServerError("");
    setServerSuccess("");
    try {
      const response = await Profile();
      if (response?.status) {
        const data = response?.resources?.data || {};
        setProfile(data);
        reset({
          first_name: data?.first_name || "",
          middle_name: data?.middle_name || "",
          last_name: data?.last_name || "",
          email: data?.email || "",
          phone_number: data?.phone_number || "",
          gender: data?.gender || "",
          dob: data?.dob ? data.dob.split("T")[0] : "",
          department: data?.department || "",
          designation: data?.designation || "",
          user_address: data?.address || "",
        });
      }
    } catch {
      setServerError("Failed to load profile data.");
    } finally {
      setPageLoading(false);
    }
  }, [profile?.employee_id, reset, setProfile]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchProfile();
  }, [fetchProfile]);

  const toggleEdit = () => {
    setIsEditing(prev => !prev);
    if (isEditing) {
      reset({
        first_name: profile?.first_name || "",
        middle_name: profile?.middle_name || "",
        last_name: profile?.last_name || "",
        email: profile?.email || "",
        phone_number: profile?.phone_number || "",
        gender: profile?.gender || "",
        dob: profile?.dob ? profile.dob.split("T")[0] : "",
        department: profile?.department || "",
        designation: profile?.designation || "",
        user_address: profile?.address || "",
      });
    }
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    ["first_name", "middle_name", "last_name", "gender", "dob", "department", "designation"].forEach(field => {
      if (data[field] !== undefined) formData.append(field, data[field]);
    });
    if (data.user_address !== undefined) formData.append("address", data.user_address);
    if (data.profile?.[0]) formData.append("profile", data.profile[0]);
    if (data.cover?.[0]) formData.append("cover", data.cover[0]);

    try {
      setServerError("");
      setServerSuccess("");
      const response = await ProfileUpdate(formData);
      if (response?.status) {
        setIsEditing(false);
        setServerSuccess("Profile updated successfully.");
        await fetchProfile();
      } else {
        setServerError(response?.message || "Update failed.");
      }
    } catch (error) {
      setServerError(error.response?.data?.message || error.message || "Update failed");
    }
  };

  const RegisteredInput = (props) => <Input {...props} register={register} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Profile</h1>
              <p className="text-gray-600 mt-1">Manage your personal and professional information</p>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={toggleEdit}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="profile-form"
                    disabled={!isDirty}
                    className="px-6 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={toggleEdit}
                  className="px-6 py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 focus:outline-none transition-all duration-200"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {serverError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800">{serverError}</p>
            </div>
          </div>
        )}

        {serverSuccess && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <p className="text-sm font-medium text-green-800">{serverSuccess}</p>
            </div>
          </div>
        )}

        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-8 border-b border-gray-200">
              <div className="flex flex-col items-center text-center">
                <div className="relative group mb-4">
                  <img
                    src={
                      profileImage && profileImage[0]
                        ? URL.createObjectURL(profileImage[0])
                        : currentProfileImage || userAvatar
                    }
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <input
                        type="file"
                        accept="image/*"
                        {...register("profile")}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-gray-600 mt-1">{profile?.designation} • {profile?.department}</p>
                <p className="text-gray-500 text-sm mt-1">{profile?.email}</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input type="text" name="employee_id" label="Employee ID" value={profile?.employee_id || ""} disabled={true} />
                <Input type="text" name="role_name" label="Role" value={profile?.role_name || ""} disabled={true} />
                <RegisteredInput type="text" name="first_name" label="First Name" value={profile?.first_name} placeholder="Enter first name" disabled={!isEditing} required error={errors.first_name} />
                <RegisteredInput type="text" name="middle_name" label="Middle Name" value={profile?.middle_name} placeholder="Enter middle name" disabled={!isEditing} />
                <RegisteredInput type="text" name="last_name" label="Last Name" value={profile?.last_name} placeholder="Enter last name" disabled={!isEditing} required error={errors.last_name} />
                <Input type="email" name="email" label="Email" value={profile?.email || ""} disabled={true} />
                <Input type="tel" name="phone_number" label="Phone Number" value={profile?.phone_number || ""} disabled={true} />
                <RegisteredInput type="date" name="dob" label="Date of Birth" value={profile?.dob} disabled={!isEditing} />
                <RegisteredInput type="text" name="department" label="Department" value={profile?.department} placeholder="Department" disabled={!isEditing} />
                <RegisteredInput type="text" name="designation" label="Designation" value={profile?.designation} placeholder="Designation" disabled={!isEditing} />

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
                    rows={3}
                    placeholder="Enter your address"
                    disabled={!isEditing}
                    value={profile?.address}
                    {...register("user_address")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {profile?.schoolDetail && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">School Information</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700">School:</span>
                    <span className="text-gray-900">{profile.schoolDetail.school_name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Board:</span>
                    <span className="text-gray-900">{profile.schoolDetail.affiliation_board}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="text-gray-900 text-right">{profile.schoolDetail.address}, {profile.schoolDetail.city}</span>
                  </div>
                </div>
              </div>
            )}

            {profile?.today_attendance && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 ml-3">Today's Attendance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`font-semibold ${profile.today_attendance.status === 'Present' ? 'text-green-600' :
                        profile.today_attendance.status === 'Absent' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                        {profile.today_attendance.is_attendance_marked ?
                          (profile.today_attendance.status || 'Present') : 'Not Marked'}
                      </span>
                    </div>
                    {profile.today_attendance.in_time && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">In Time:</span>
                        <span className="text-gray-900">{profile.today_attendance.in_time}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {profile.today_attendance.out_time && (
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Out Time:</span>
                        <span className="text-gray-900">{profile.today_attendance.out_time}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Approval:</span>
                      <span className={`font-semibold ${profile.today_attendance.approval_status === 'approved' ? 'text-green-600' :
                        profile.today_attendance.approval_status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                        {profile.today_attendance.approval_status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Qualifications</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {profile?.qualificationsDetail?.map((qualification, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Qualification:</span>
                          <p className="text-gray-900 mt-1">{qualification.qualification}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Institute:</span>
                          <p className="text-gray-900 mt-1">{qualification.institute}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Year of Passing:</span>
                          <p className="text-gray-900 mt-1">{qualification.year_of_passing}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
              </div>
              <div className="p-6">
                <Link to="/user-profile/change-password">
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-all duration-200"
                  >
                    <svg className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Teaching Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 ml-3">Subjects</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile?.subjectDetail?.map((subject) => (
                      <span key={subject.subject_id} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium">
                        {subject.subject_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 ml-3">Classrooms</h3>
                  </div>
                  <div className="space-y-3">
                    {profile?.classroomsDetail?.map((classroom) => (
                      <div key={classroom.classroom_id} className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="font-semibold text-gray-900">{classroom.class_name} - Section {classroom.section_name}</span>
                          <div className="flex flex-wrap gap-1">
                            {classroom.subjectList?.map((subject) => (
                              <span key={subject.subject_id} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                                {subject.subject_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {pageLoading && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-lg shadow">
              <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0"></path>
              </svg>
              <span className="text-sm font-medium text-gray-700">Loading profile...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserProfileApp() {
  return (
    <Routes>
      <Route index element={<ProfileManagement />} />
      <Route path="change-password" element={<ChangePassword />} />
    </Routes>
  );
}