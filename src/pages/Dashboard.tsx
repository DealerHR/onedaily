import { useAuth } from '../contexts/AuthContext';
import { Bell, Mail, Users, TrendingUp, Calendar, Megaphone, Crown, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkCourseCreationLimit, UsageStatus } from '../lib/usageValidation';
import { useEffect, useState } from 'react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  created_at: string;
  is_active: boolean;
  status: string;
  module_count?: number;
  lesson_count?: number;
  generated_count?: number;
}

interface DashboardStats {
  courseCount: number;
  enrollmentCount: number;
  deliveryCount: number;
}

export const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    courseCount: 0,
    enrollmentCount: 0,
    deliveryCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadUsageStatus();
    }
  }, [user]);

  const loadUsageStatus = async () => {
    const status = await checkCourseCreationLimit();
    setUsageStatus(status);
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          duration,
          created_at,
          is_active,
          status
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Get all course IDs for this user
      const userCourseIds = (coursesData || []).map(c => c.id);

      // Count enrollments for user's courses
      const { count: enrollmentCount } = await supabase
        .from('course_enrollments')
        .select('id', { count: 'exact', head: true })
        .in('course_id', userCourseIds.length > 0 ? userCourseIds : ['']);

      // Count deliveries for user's courses
      const { count: deliveryCount } = await supabase
        .from('lesson_deliveries')
        .select('id', { count: 'exact', head: true })
        .in('course_id', userCourseIds.length > 0 ? userCourseIds : [''])
        .eq('status', 'sent');

      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { data: modules } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', course.id);

          const moduleIds = (modules || []).map(m => m.id);

          const { data: lessons } = await supabase
            .from('module_lessons')
            .select('id, content_generated_at')
            .in('module_id', moduleIds.length > 0 ? moduleIds : ['']);

          const generatedCount = (lessons || []).filter(l => l.content_generated_at).length;

          return {
            ...course,
            module_count: modules?.length || 0,
            lesson_count: lessons?.length || 0,
            generated_count: generatedCount,
          };
        })
      );

      const activeCourses = coursesWithCounts.filter(c => c.is_active);

      setCourses(coursesWithCounts);
      setStats({
        courseCount: activeCourses.length,
        enrollmentCount: enrollmentCount || 0,
        deliveryCount: deliveryCount || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Welcome back, {profile?.full_name}
          </h1>
          <p className="text-slate-600">
            Create engaging daily content with AI-powered generation
          </p>
        </div>

        {usageStatus && usageStatus.planType === 'free' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Free Plan</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    You're using {usageStatus.coursesUsed} of {usageStatus.coursesLimit} OneDailys
                  </p>
                  <div className="w-48 h-2 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all"
                      style={{ width: `${(usageStatus.coursesUsed / usageStatus.coursesLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <a
                href="mailto:sales@onedaily.com?subject=Upgrade to Paid Plan"
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
              >
                Upgrade Plan
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active OneDailys</p>
                <p className="text-2xl font-bold text-slate-800">{stats.courseCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Team Members Enrolled</p>
                <p className="text-2xl font-bold text-slate-800">{stats.enrollmentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-sky-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Emails Delivered</p>
                <p className="text-2xl font-bold text-slate-800">{stats.deliveryCount}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : courses.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800">Your OneDailys</h2>
              <button
                onClick={() => onNavigate('course-creation-choice')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Create New OneDaily
              </button>
            </div>
            <div className="grid gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-800">
                          {course.title}
                        </h3>
                        {course.status === 'draft' && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            Draft
                          </span>
                        )}
                        {course.status === 'published' && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Published
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{course.duration}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Megaphone className="w-4 h-4" />
                          <span>{course.module_count} phases</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4" />
                          <span>{course.lesson_count} emails</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {course.status === 'published' && (course.lesson_count ?? 0) > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${((course.generated_count ?? 0) / (course.lesson_count ?? 1)) * 100}%`,
                                backgroundColor: (course.generated_count ?? 0) === (course.lesson_count ?? 0) ? '#16a34a' : '#f59e0b',
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {course.generated_count ?? 0} / {course.lesson_count} emails generated
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {course.status === 'draft' && (
                        <button
                          onClick={() => onNavigate(`course-editor:${course.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Edit & Publish
                        </button>
                      )}
                      {course.status === 'published' && (course.generated_count ?? 0) < (course.lesson_count ?? 0) && (
                        <button
                          onClick={() => onNavigate(`generate-content:${course.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                        >
                          <Zap className="w-4 h-4" />
                          {(course.generated_count ?? 0) === 0 ? 'Generate Content' : 'Continue Generating'}
                        </button>
                      )}
                      {course.status === 'published' && (
                        <button
                          onClick={() => onNavigate(`course-details:${course.id}`)}
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 border border-blue-100 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Ready to Launch Your First OneDaily?
            </h2>
            <p className="text-slate-600 mb-6">
              Transform your ideas into engaging daily content with AI.
              Create learning journeys, performance updates, team communications, motivational messages, or anything you imagine.
            </p>
            <button
              onClick={() => onNavigate('course-creation-choice')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold inline-flex items-center gap-2"
            >
              <Bell className="w-5 h-5" />
              Create Your First OneDaily
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Quick Tips
          </h2>
          <ul className="space-y-3 text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Define clear goals for your OneDaily to get the best AI-generated content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-600 mt-1">•</span>
              <span>Break messaging into 5-10 day OneDailys for optimal engagement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-sky-600 mt-1">•</span>
              <span>Review and customize generated content before enrolling team members</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
