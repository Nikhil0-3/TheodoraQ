import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';
import { Users, ArrowLeft, AlertCircle, User } from 'lucide-react';
import Loader from '../../../components/Loader';

/**
 * Class Roster Page for Candidates
 * Shows all students enrolled in the class (if enabled by admin)
 */
function ClassRosterPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [classData, setClassData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClassRoster = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5000/api/candidate/class/${classId}/roster`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch class roster');
        }

        setClassData(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && classId) {
      fetchClassRoster();
    }
  }, [token, classId]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/candidate/class/${classId}/assignments`)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Assignments</span>
        </button>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader />
          </div>
        ) : error ? (
          // Error State
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Unable to View Roster</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate(`/candidate/class/${classId}/assignments`)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Assignments
            </button>
          </div>
        ) : (
          <>
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="w-5 h-5 text-gray-700" />
                </div>
                <h1 className="text-3xl font-semibold text-gray-800">
                  Class Roster
                </h1>
              </div>
              <p className="text-gray-500 text-sm ml-14">
                {classData?.students?.length || 0} student{classData?.students?.length !== 1 ? 's' : ''} enrolled in {classData?.title}
              </p>
            </div>

            {/* Class Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Course Code</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{classData?.courseCode}</p>
                </div>
                {classData?.semester && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Semester</p>
                    <p className="text-sm font-medium text-gray-900">{classData.semester}</p>
                  </div>
                )}
                {classData?.academicYear && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Academic Year</p>
                    <p className="text-sm font-medium text-gray-900">{classData.academicYear}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Enrolled Students</h2>
              </div>
              
              {classData?.students?.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No students enrolled yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {classData?.students?.map((student, index) => (
                    <div 
                      key={student._id || index}
                      className="px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: Avatar and Name */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <p className="text-base font-medium text-gray-900 truncate">
                            {student.name}
                          </p>
                        </div>
                        
                        {/* Right: Registration Number */}
                        <div className="flex-shrink-0">
                          <p className="text-sm text-gray-600 font-mono font-medium">
                            {student.registrationNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ClassRosterPage;
