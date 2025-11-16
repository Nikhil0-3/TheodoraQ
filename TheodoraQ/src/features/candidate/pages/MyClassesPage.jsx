import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';
import { BookOpen, Users, Calendar, ArrowRight } from 'lucide-react';
import Loader from '../../../components/Loader';

/**
 * My Classes Page for Candidates
 * Shows all classes the candidate has joined
 */
function MyClassesPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch classes where the candidate is enrolled
  useEffect(() => {
    const fetchMyClasses = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:5000/api/candidate/my-classes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch classes');
        }

        setClasses(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && user) {
      fetchMyClasses();
    }
  }, [token, user]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-800 mb-1">
            My Classes
          </h1>
          <p className="text-gray-500 text-sm">Your enrolled classes</p>
        </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="text-lg">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader />
            </div>
          ) : classes.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Join your first class to get started
              </p>
              <button
                onClick={() => navigate('/candidate/join-class')}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Join Class
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            // Classes Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((classItem) => (
                <div 
                  key={classItem._id}
                  onClick={() => navigate(`/candidate/class/${classItem._id}/assignments`)}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  {/* Card Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-gray-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-gray-700" />
                      </div>
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md">
                        Enrolled
                      </span>
                    </div>

                    <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                      {classItem.title}
                    </h3>
                    
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-10">
                      {classItem.description || 'No description'}
                    </p>

                    <div className="space-y-2.5 pb-4 mb-4 border-b border-gray-100">
                      <div className="inline-flex">
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md font-medium">
                          {classItem.courseCode}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>{classItem.students?.length || 0} students</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(classItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/candidate/class/${classItem._id}/assignments`);
                      }}
                    >
                      View Assignments
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}

export default MyClassesPage;
