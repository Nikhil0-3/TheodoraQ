import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/contexts/AuthContext';
import { Trophy, ArrowLeft, AlertCircle, Medal, TrendingUp } from 'lucide-react';
import Loader from '../../../components/Loader';

/**
 * Class Leaderboard Page for Candidates
 * Shows ranking of all students based on their performance
 */
function ClassLeaderboardPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5000/api/candidate/class/${classId}/leaderboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch leaderboard');
        }

        setLeaderboardData(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && classId) {
      fetchLeaderboard();
    }
  }, [token, classId]);

  const getRankDisplay = (rank) => {
    if (rank === 1) return { icon: '🥇', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (rank === 2) return { icon: '🥈', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    if (rank === 3) return { icon: '🥉', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    return { icon: null, color: 'text-gray-700', bgColor: 'bg-white' };
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
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
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Unable to View Leaderboard</h3>
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
                <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-semibold text-gray-800">
                  Class Leaderboard
                </h1>
              </div>
              <p className="text-gray-500 text-sm ml-14">
                Rankings based on overall performance in {leaderboardData?.classTitle}
              </p>
            </div>

            {/* Class Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Course Code</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{leaderboardData?.courseCode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Students</p>
                  <p className="text-sm font-medium text-gray-900">{leaderboardData?.rankings?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Candidate Rank</p>
                  <p className="text-sm font-bold text-blue-600">
                    #{leaderboardData?.currentUserRank || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your Avg Score</p>
                  <p className="text-sm font-bold text-green-600">
                    {leaderboardData?.currentUserScore !== undefined ? leaderboardData.currentUserScore.toFixed(1) + '%' : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                <h2 className="text-xl font-semibold text-gray-900">Rankings</h2>
              </div>
              
              {leaderboardData?.rankings?.length === 0 ? (
                <div className="p-12 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No rankings available yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {leaderboardData?.rankings?.map((student) => {
                    const rankStyle = getRankDisplay(student.rank);
                    const isCurrentUser = student.userId === user?._id;
                    
                    return (
                      <div 
                        key={student.userId}
                        className={`px-6 py-4 transition-colors ${
                          isCurrentUser 
                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Left: Rank, Medal, and Name */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Rank/Medal */}
                            <div className="flex-shrink-0 w-12 text-center">
                              {rankStyle.icon ? (
                                <span className="text-2xl">{rankStyle.icon}</span>
                              ) : (
                                <span className={`text-lg font-bold ${rankStyle.color}`}>
                                  #{student.rank}
                                </span>
                              )}
                            </div>
                            
                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-base font-medium truncate ${
                                isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {student.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">
                                {student.registrationNumber}
                              </p>
                            </div>
                          </div>
                          
                          {/* Right: Stats */}
                          <div className="flex items-center gap-6 flex-shrink-0">
                            {/* Completed Assignments */}
                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-0.5">Completed</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {student.completedAssignments}/{student.totalAssignments}
                              </p>
                            </div>
                            
                            {/* Average Score */}
                            <div className="text-center min-w-[80px]">
                              <p className="text-xs text-gray-500 mb-0.5">Avg Score</p>
                              <p className={`text-lg font-bold ${
                                student.averageScore >= 80 ? 'text-green-600' :
                                student.averageScore >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {student.averageScore.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ClassLeaderboardPage;
