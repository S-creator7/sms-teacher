import React, { useState, useEffect } from "react";
import { eventsApi } from "../Utility/eventsApi";
import { LuSearch, LuDownload, LuAward, LuUser, LuCalendar, LuTag, LuBookOpen } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Certificates = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
      };
      
      if (searchTerm) params.search = searchTerm;

      const response = await eventsApi.getCertificates(params);
      
      if (response.status && response.resources) {
        setCertificates(response.resources.data || []);
        setTotalPages(response.resources.total_pages || 1);
        setTotal(response.resources.total || 0);
      }
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [currentPage, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCertificates();
  };

  const handleDownloadCertificate = async (studentEventId, studentName) => {
    try {
      setDownloadingId(studentEventId);
      await eventsApi.downloadCertificate(studentEventId);
      toast.success(`Certificate downloaded for ${studentName}`);
    } catch (error) {
      console.error("Error downloading certificate:", error);
      toast.error("Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Sports': 'bg-green-100 text-green-700 border-green-200',
      'Cultural': 'bg-purple-100 text-purple-700 border-purple-200',
      'Academic': 'bg-blue-100 text-blue-700 border-blue-200',
      'Technical': 'bg-orange-100 text-orange-700 border-orange-200',
      'Social': 'bg-pink-100 text-pink-700 border-pink-200',
      'Other': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[category] || colors['Other'];
  };

  const getAchievementColor = (achievement) => {
    if (!achievement) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    const achievementLower = achievement.toLowerCase();
    if (achievementLower.includes('first') || achievementLower.includes('1st')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else if (achievementLower.includes('second') || achievementLower.includes('2nd')) {
      return 'bg-gray-100 text-gray-700 border-gray-200';
    } else if (achievementLower.includes('third') || achievementLower.includes('3rd')) {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    } else if (achievementLower.includes('participat')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-purple-100 text-purple-700 border-purple-200';
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="p-3 md:p-4 space-y-4 font-sans bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors duration-200 group"
              title="Go Back"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Certificates</h1>
              <p className="text-xs text-gray-500 mt-0.5">View and download student achievement certificates</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by student name or event..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:border-[#f86730] focus:ring-1 focus:ring-[#f86730] transition bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#f86730] text-white rounded-md hover:bg-[#e55a29] transition text-sm font-medium"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Certificates List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#f86730] border-t-transparent"></div>
              <p className="mt-3 text-sm text-gray-500">Loading certificates...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="p-8 text-center">
              <LuAward className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No certificates found</p>
              <p className="text-gray-400 text-xs mt-1">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "No certificates have been generated yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Achievement
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {certificates.map((certificate) => (
                      <tr key={certificate.student_event_id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <LuUser className="h-4 w-4 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {certificate.first_name} {certificate.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {certificate.admission_number}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {certificate.class_name} - {certificate.section_name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {certificate.event_name}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(certificate.category)}`}>
                              <LuTag className="h-3 w-3 mr-1" />
                              {certificate.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {certificate.achievement ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getAchievementColor(certificate.achievement)}`}>
                              <LuAward className="h-3 w-3 mr-1" />
                              {certificate.achievement}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                              <LuBookOpen className="h-3 w-3 mr-1" />
                              Participated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center text-xs text-gray-600">
                            <LuCalendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                            {formatDate(certificate.date)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDownloadCertificate(
                              certificate.student_event_id,
                              `${certificate.first_name} ${certificate.last_name}`
                            )}
                            disabled={downloadingId === certificate.student_event_id}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f86730] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {downloadingId === certificate.student_event_id ? (
                              <>
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#f86730] mr-2"></div>
                                <span className="text-xs">Downloading...</span>
                              </>
                            ) : (
                              <>
                                <LuDownload className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                                <span className="text-xs">Download</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      Showing {((currentPage - 1) * 10) + 1} to{' '}
                      {Math.min(currentPage * 10, total)} of {total} results
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-xs text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Certificates;