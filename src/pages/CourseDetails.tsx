import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { checkEnrollmentLimit, getUserDomain, getDomainPlan } from '../lib/usageValidation';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { BookOpen, Calendar, Mail, Users, ArrowLeft, Send, Plus, Eye, Play, Clock, Archive, CheckCircle, TrendingUp, MailOpen, MousePointerClick, BarChart3, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

interface CourseDetailsProps {
  courseId: string;
  onNavigate: (page: string) => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  prerequisites: string;
  onboarding_email: string;
  conclusion_email: string;
  created_at: string;
  is_active: boolean;
  status: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  module_summary: string;
  module_introduction: string;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  order_index: number;
  learning_objectives: string[];
}

interface Enrollment {
  id: string;
  recipient_email: string;
  recipient_name: string;
  start_date: string;
  current_lesson_index: number;
  status: string;
  created_at: string;
}

interface LessonDelivery {
  id: string;
  enrollment_id: string;
  lesson_id: string | null;
  module_title: string;
  lesson_title: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  delivery_type: string;
}

export const CourseDetails = ({ courseId, onNavigate }: CourseDetailsProps) => {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [deliveries, setDeliveries] = useState<LessonDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [previewDelivery, setPreviewDelivery] = useState<LessonDelivery | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'enrollments' | 'schedule' | 'analytics'>('overview');
  const [analytics, setAnalytics] = useState({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<'single' | 'bulk'>('single');
  const [enrollForm, setEnrollForm] = useState({
    recipientEmail: '',
    recipientName: '',
    startDate: new Date().toISOString().split('T')[0],
    deliveryTime: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [bulkEnrollForm, setBulkEnrollForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    deliveryTime: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<Array<{name: string, email: string}>>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [enrollmentLimit, setEnrollmentLimit] = useState<number>(10);
  const [selectedEnrollmentFilter, setSelectedEnrollmentFilter] = useState<string>('all');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>('all');
  const [scheduleView, setScheduleView] = useState<'list' | 'grouped'>('grouped');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedEnrollments, setExpandedEnrollments] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && courseId) {
      loadCourseData();
      loadEnrollmentLimit();
      loadAnalytics();
    }
  }, [user, courseId]);

  const loadEnrollmentLimit = async () => {
    const domain = await getUserDomain();
    if (domain) {
      const plan = await getDomainPlan(domain);
      if (plan) {
        setEnrollmentLimit(plan.enrollment_limit_per_course);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data: enrollmentData } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', courseId);

      const enrollmentIds = enrollmentData?.map(e => e.id) || [];

      if (enrollmentIds.length === 0) {
        setAnalytics({
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          openRate: 0,
          clickRate: 0,
        });
        return;
      }

      const { data: deliveryData } = await supabase
        .from('lesson_deliveries')
        .select('id, opened_at, clicked_at, status')
        .in('enrollment_id', enrollmentIds);

      const totalSent = deliveryData?.filter(d => d.status === 'sent').length || 0;
      const totalOpened = deliveryData?.filter(d => d.opened_at).length || 0;
      const totalClicked = deliveryData?.filter(d => d.clicked_at).length || 0;

      setAnalytics({
        totalSent,
        totalOpened,
        totalClicked,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      if (modulesData && modulesData.length > 0) {
        const moduleIds = modulesData.map(m => m.id);
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('module_lessons')
          .select('*')
          .in('module_id', moduleIds)
          .order('order_index');

        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);
      }

      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (enrollmentsError) throw enrollmentsError;
      setEnrollments(enrollmentsData || []);

      const enrollmentIds = enrollmentsData?.map(e => e.id) || [];
      if (enrollmentIds.length > 0) {
        const { data: deliveriesData, error: deliveriesError } = await supabase
          .from('lesson_deliveries')
          .select('*')
          .in('enrollment_id', enrollmentIds)
          .order('scheduled_for');

        if (deliveriesError) throw deliveriesError;
        setDeliveries(deliveriesData || []);
      }

    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCsvFile = (file: File): Promise<Array<{name: string, email: string}>> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          const recipients: Array<{name: string, email: string}> = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || (i === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email')))) {
              continue;
            }

            const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));

            if (parts.length >= 2) {
              const name = parts[0];
              const email = parts[1];

              if (email && email.includes('@')) {
                recipients.push({ name, email });
              }
            }
          }

          resolve(recipients);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    try {
      const recipients = await parseCsvFile(file);
      setBulkPreview(recipients);
    } catch (error) {
      alert('Error parsing CSV file. Please check the format.');
      console.error(error);
    }
  };

  const handleBulkEnroll = async () => {
    if (bulkPreview.length === 0) {
      alert('Please upload a CSV file with recipients');
      return;
    }

    const invalidEmails = bulkPreview.filter(r => !r.email.includes('@') || !r.email.includes('.'));
    if (invalidEmails.length > 0) {
      alert(`Found ${invalidEmails.length} invalid email(s). Please check your CSV file.`);
      return;
    }

    setEnrolling(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const recipient of bulkPreview) {
        try {
          const validation = await checkEnrollmentLimit(courseId, recipient.email);

          if (!validation.allowed) {
            failedCount++;
            errors.push(`${recipient.email}: ${validation.reason}`);
            continue;
          }

          const { error } = await supabase
            .from('course_enrollments')
            .insert({
              course_id: courseId,
              assigned_by: user?.id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              start_date: bulkEnrollForm.startDate,
              delivery_time: bulkEnrollForm.deliveryTime,
              timezone: bulkEnrollForm.timezone,
              status: 'active'
            });

          if (error) {
            failedCount++;
            errors.push(`${recipient.email}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err) {
          failedCount++;
          errors.push(`${recipient.email}: Unexpected error`);
        }
      }

      if (successCount > 0) {
        alert(`Successfully enrolled ${successCount} student(s)${failedCount > 0 ? `\n\nFailed: ${failedCount}\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}` : ''}`);
        setShowEnrollModal(false);
        setBulkPreview([]);
        setCsvFile(null);
        loadCourseData();
      } else {
        alert(`Failed to enroll any students:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }
    } catch (error) {
      console.error('Error enrolling students:', error);
      alert('Failed to enroll students. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollForm.recipientEmail || !enrollForm.recipientName) {
      alert('Please fill in all fields');
      return;
    }

    const validation = await checkEnrollmentLimit(courseId, enrollForm.recipientEmail);

    if (!validation.allowed) {
      setUpgradeMessage(validation.reason);
      setShowUpgradePrompt(true);
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          course_id: courseId,
          assigned_by: user?.id,
          recipient_email: enrollForm.recipientEmail,
          recipient_name: enrollForm.recipientName,
          start_date: enrollForm.startDate,
          delivery_time: enrollForm.deliveryTime,
          timezone: enrollForm.timezone,
          status: 'active'
        });

      if (error) throw error;

      setShowEnrollModal(false);
      setEnrollForm({
        recipientEmail: '',
        recipientName: '',
        startDate: new Date().toISOString().split('T')[0],
        deliveryTime: '09:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      loadCourseData();
    } catch (error) {
      console.error('Error enrolling student:', error);
      alert('Failed to enroll student. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleCourseActivation = async () => {
    if (!course) return;

    const action = course.is_active ? 'deactivate' : 'activate';
    const confirmMsg = course.is_active
      ? 'Deactivate this campaign? It will no longer count toward your domain limits, but enrollments will be paused.'
      : 'Reactivate this campaign? It will count toward your domain limits again.';

    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('courses')
      .update({ is_active: !course.is_active })
      .eq('id', courseId);

    if (error) {
      alert(`Failed to ${action} campaign: ${error.message}`);
      console.error(`Error ${action}ing course:`, error);
    } else {
      alert(`Campaign ${action}d successfully!`);
      loadCourseData();
    }
  };

  const getLessonsForModule = (moduleId: string) => {
    return lessons.filter(l => l.module_id === moduleId);
  };

  const handleDeleteCourse = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        throw error;
      }

      onNavigate('dashboard');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSendEmail = async (deliveryId: string) => {
    setSendingEmail(deliveryId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/send-daily-lesson`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ delivery_id: deliveryId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      await loadCourseData();
      alert('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(null);
    }
  };

  const getEnrollmentForDelivery = (enrollmentId: string) => {
    return enrollments.find(e => e.id === enrollmentId);
  };

  const toggleEnrollmentExpanded = (enrollmentId: string) => {
    setExpandedEnrollments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(enrollmentId)) {
        newSet.delete(enrollmentId);
      } else {
        newSet.add(enrollmentId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-600">Campaign not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => onNavigate('dashboard')}
          className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          {!course.is_active && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <Archive className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">This OneDaily is deactivated</p>
                <p className="text-sm text-amber-700">It doesn't count toward your domain limits, but enrollments are paused.</p>
              </div>
            </div>
          )}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{course.title}</h1>
              <p className="text-slate-600 mb-4">{course.description}</p>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{modules.length} phases</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{lessons.length} emails</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{enrollments.length} enrollments</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEnrollModal(true)}
                disabled={!course.is_active}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Enroll Recipient
            </button>
              <button
                onClick={toggleCourseActivation}
                className={`px-4 py-2 rounded-lg transition-colors font-medium inline-flex items-center gap-2 ${
                  course.is_active
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {course.is_active ? (
                  <>
                    <Archive className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Reactivate
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-slate-200">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'content'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Campaign Content
              </button>
              <button
                onClick={() => setActiveTab('enrollments')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'enrollments'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Enrollments
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Email Schedule
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Onboarding Email</h2>
              <div className="prose max-w-none text-slate-600">
                <div dangerouslySetInnerHTML={{ __html: course.onboarding_email.replace(/\n/g, '<br/>') }} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Conclusion Email</h2>
              <div className="prose max-w-none text-slate-600">
                <div dangerouslySetInnerHTML={{ __html: course.conclusion_email.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            {modules.map((module, moduleIndex) => {
              const moduleLessons = getLessonsForModule(module.id);
              return (
                <div key={module.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">
                      {module.title}
                    </h2>
                    <p className="text-slate-600 mb-4">{module.description}</p>
                  </div>

                  <div className="space-y-3">
                    {moduleLessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                      >
                        <h3 className="font-semibold text-slate-800 mb-2">
                          Email {lessonIndex + 1}: {lesson.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{lesson.content.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'enrollments' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Campaign Enrollments</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {enrollments.length} / {enrollmentLimit === -1 ? '∞' : enrollmentLimit} students enrolled
                </p>
              </div>
              <button
                onClick={() => setShowEnrollModal(true)}
                disabled={enrollmentLimit !== -1 && enrollments.length >= enrollmentLimit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Enroll Recipient
              </button>
            </div>

            {enrollments.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No enrollments yet</p>
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Enroll First Recipient
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Start Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-800">{enrollment.recipient_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{enrollment.recipient_email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(enrollment.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            enrollment.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : enrollment.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {enrollment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          Email {enrollment.current_lesson_index + 1} of {lessons.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {deliveries.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No scheduled emails yet</p>
                <p className="text-sm text-slate-500 mt-2">Enroll students to see their email delivery schedule</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-200">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Filter by Recipient</label>
                      <select
                        value={selectedEnrollmentFilter}
                        onChange={(e) => setSelectedEnrollmentFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Recipients ({enrollments.length})</option>
                        {enrollments.map((enrollment) => (
                          <option key={enrollment.id} value={enrollment.id}>
                            {enrollment.recipient_name} ({enrollment.recipient_email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Filter by Status</label>
                      <select
                        value={scheduleStatusFilter}
                        onChange={(e) => setScheduleStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="sent">Sent</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedEnrollmentFilter('all');
                          setScheduleStatusFilter('all');
                        }}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setScheduleView('list')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        scheduleView === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      List View
                    </button>
                    <button
                      onClick={() => setScheduleView('grouped')}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        scheduleView === 'grouped'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Grouped by Recipient
                    </button>
                  </div>
                </div>
                {scheduleView === 'grouped' ? (
                  <div className="divide-y divide-slate-200">
                    {enrollments
                      .filter(enrollment => selectedEnrollmentFilter === 'all' || enrollment.id === selectedEnrollmentFilter)
                      .map((enrollment) => {
                        const enrollmentDeliveries = deliveries
                          .filter(d => d.enrollment_id === enrollment.id)
                          .filter(d => scheduleStatusFilter === 'all' || d.status === scheduleStatusFilter)
                          .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

                        const pendingCount = enrollmentDeliveries.filter(d => d.status === 'pending').length;
                        const sentCount = enrollmentDeliveries.filter(d => d.status === 'sent').length;
                        const nextDelivery = enrollmentDeliveries.find(d => d.status === 'pending' && new Date(d.scheduled_for) >= new Date());

                        if (enrollmentDeliveries.length === 0) return null;

                        const isExpanded = expandedEnrollments.has(enrollment.id);
                        const failedCount = enrollmentDeliveries.filter(d => d.status === 'failed').length;

                        return (
                          <div key={enrollment.id} className="p-6">
                            <div
                              className="flex items-start justify-between cursor-pointer hover:bg-slate-50 -m-6 p-6 rounded-lg transition-colors"
                              onClick={() => toggleEnrollmentExpanded(enrollment.id)}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <button className="mt-1 text-slate-400 hover:text-slate-600 transition-colors">
                                  {isExpanded ? (
                                    <ChevronUp className="w-5 h-5" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-slate-800">{enrollment.recipient_name}</h3>
                                  <p className="text-sm text-slate-600">{enrollment.recipient_email}</p>
                                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                    <span>Started: {new Date(enrollment.start_date).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                      {sentCount} sent
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                      {pendingCount} pending
                                    </span>
                                    {failedCount > 0 && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        {failedCount} failed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {nextDelivery && (
                                <div className="text-right">
                                  <p className="text-xs text-slate-500 mb-1">Next Email</p>
                                  <p className="text-sm font-medium text-slate-800">{nextDelivery.lesson_title}</p>
                                  <p className="text-xs text-slate-600">{new Date(nextDelivery.scheduled_for).toLocaleDateString()}</p>
                                </div>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-4 space-y-2">
                                {enrollmentDeliveries.map((delivery, idx) => (
                                  <div key={delivery.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-medium text-slate-500">Day {idx + 1}</span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        delivery.delivery_type === 'onboarding'
                                          ? 'bg-green-100 text-green-700'
                                          : delivery.delivery_type === 'lesson'
                                          ? 'bg-blue-100 text-blue-700'
                                          : delivery.delivery_type === 'transition'
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {delivery.delivery_type}
                                      </span>
                                      <span className="text-sm text-slate-800">{delivery.lesson_title}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-slate-600">{new Date(delivery.scheduled_for).toLocaleDateString()}</span>
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        delivery.status === 'sent'
                                          ? 'bg-green-100 text-green-700'
                                          : delivery.status === 'failed'
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {delivery.status}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewDelivery(delivery);
                                          }}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Preview"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        {(delivery.status === 'pending' || delivery.status === 'failed') && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSendEmail(delivery.id);
                                            }}
                                            disabled={sendingEmail === delivery.id}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                            title={delivery.status === 'failed' ? 'Resend' : 'Send now'}
                                          >
                                            {sendingEmail === delivery.id ? (
                                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : delivery.status === 'failed' ? (
                                              <RefreshCw className="w-4 h-4" />
                                            ) : (
                                              <Play className="w-4 h-4" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Day</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Recipient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Content</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Scheduled For</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {deliveries
                        .filter(delivery => {
                          if (selectedEnrollmentFilter !== 'all' && delivery.enrollment_id !== selectedEnrollmentFilter) {
                            return false;
                          }
                          if (scheduleStatusFilter !== 'all' && delivery.status !== scheduleStatusFilter) {
                            return false;
                          }
                          return true;
                        })
                        .map((delivery, index) => {
                        const enrollment = getEnrollmentForDelivery(delivery.enrollment_id);
                        const scheduledDate = new Date(delivery.scheduled_for);
                        const isPast = scheduledDate < new Date();

                      return (
                        <tr key={delivery.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">
                            Day {index + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {enrollment?.recipient_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              delivery.delivery_type === 'onboarding'
                                ? 'bg-green-100 text-green-700'
                                : delivery.delivery_type === 'lesson'
                                ? 'bg-blue-100 text-blue-700'
                                : delivery.delivery_type === 'transition'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {delivery.delivery_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-800">
                            <div className="max-w-md">
                              <div className="font-medium">{delivery.lesson_title}</div>
                              {delivery.module_title && (
                                <div className="text-xs text-slate-500">{delivery.module_title}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {scheduledDate.toLocaleDateString()} {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {isPast && delivery.status === 'pending' && (
                              <div className="text-xs text-amber-600 mt-1">Due for sending</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {delivery.status === 'sent' ? (
                              <div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  Sent
                                </span>
                                {delivery.sent_at && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    {new Date(delivery.sent_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : delivery.status === 'failed' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Failed
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewDelivery(delivery)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Preview email"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {(delivery.status === 'pending' || delivery.status === 'failed') && (
                                <button
                                  onClick={() => handleSendEmail(delivery.id)}
                                  disabled={sendingEmail === delivery.id}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                  title={delivery.status === 'failed' ? 'Resend' : 'Send now'}
                                >
                                  {sendingEmail === delivery.id ? (
                                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : delivery.status === 'failed' ? (
                                    <RefreshCw className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
              {deliveries.filter(delivery => {
                if (selectedEnrollmentFilter !== 'all' && delivery.enrollment_id !== selectedEnrollmentFilter) {
                  return false;
                }
                if (scheduleStatusFilter !== 'all' && delivery.status !== scheduleStatusFilter) {
                  return false;
                }
                return true;
              }).length === 0 && (
                <div className="p-8 text-center border-t border-slate-200">
                  <p className="text-slate-500">No emails match the selected filters</p>
                </div>
              )}
            </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">Total Emails Sent</h3>
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.totalSent}</p>
                <p className="text-sm text-slate-500 mt-1">Delivered to learners</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">Email Opens</h3>
                  <MailOpen className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.totalOpened}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.openRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-green-600">{analytics.openRate}%</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-600">Email Clicks</h3>
                  <MousePointerClick className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{analytics.totalClicked}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${analytics.clickRate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-purple-600">{analytics.clickRate}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Engagement Overview</h2>
                  <p className="text-sm text-slate-600">Track how learners interact with your campaign emails</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-4">Open Rate</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Opened</span>
                      <span className="text-sm font-medium text-slate-800">{analytics.totalOpened}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Not Opened</span>
                      <span className="text-sm font-medium text-slate-800">{analytics.totalSent - analytics.totalOpened}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Open Rate</span>
                        <span className="text-lg font-bold text-green-600">{analytics.openRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-4">Click Rate</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Clicked</span>
                      <span className="text-sm font-medium text-slate-800">{analytics.totalClicked}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Not Clicked</span>
                      <span className="text-sm font-medium text-slate-800">{analytics.totalSent - analytics.totalClicked}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Click Rate</span>
                        <span className="text-lg font-bold text-purple-600">{analytics.clickRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {analytics.totalSent === 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">No data yet</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Analytics will appear once you start sending course emails to enrolled learners.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Enrolled Learners</h3>
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="w-5 h-5" />
                <span className="text-2xl font-bold">{enrollments.length}</span>
                <span className="text-sm text-slate-600">total enrollments</span>
              </div>
              {enrollmentLimit > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Limit Usage</span>
                    <span className="font-medium text-slate-800">{enrollments.length} / {enrollmentLimit}</span>
                  </div>
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((enrollments.length / enrollmentLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {previewDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Email Preview</h2>
                <p className="text-sm text-slate-600 mt-1">{previewDelivery.lesson_title}</p>
              </div>
              <button
                onClick={() => setPreviewDelivery(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-700">Type:</span>
                    <span className="ml-2 text-slate-600 capitalize">{previewDelivery.delivery_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Status:</span>
                    <span className="ml-2 text-slate-600 capitalize">{previewDelivery.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Scheduled:</span>
                    <span className="ml-2 text-slate-600">
                      {new Date(previewDelivery.scheduled_for).toLocaleString()}
                    </span>
                  </div>
                  {previewDelivery.sent_at && (
                    <div>
                      <span className="font-medium text-slate-700">Sent:</span>
                      <span className="ml-2 text-slate-600">
                        {new Date(previewDelivery.sent_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="prose max-w-none">
                  {previewDelivery.delivery_type === 'onboarding' && course && (
                    <div>
                      <h3 className="text-2xl font-bold text-green-600 mb-4">Welcome to {course.title}!</h3>
                      <p className="text-slate-700 mb-4">{course.description}</p>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: course.onboarding_email.replace(/\n/g, '<br/>') }} />
                      </div>
                    </div>
                  )}

                  {previewDelivery.delivery_type === 'lesson' && previewDelivery.lesson_id && (
                    <div>
                      {(() => {
                        const lesson = lessons.find(l => l.id === previewDelivery.lesson_id);
                        if (!lesson) return <p className="text-slate-500">Lesson not found</p>;

                        return (
                          <div>
                            <div className="text-sm text-blue-600 font-medium mb-2">{previewDelivery.module_title}</div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-4">{lesson.title}</h3>
                            <div className="text-slate-700 mb-6" dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n\n/g, '<br/><br/>') }} />
                            {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
                              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <h4 className="font-bold text-amber-800 mb-2">Learning Objectives:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {lesson.learning_objectives.map((obj, idx) => (
                                    <li key={idx} className="text-amber-900">{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {previewDelivery.delivery_type === 'transition' && (
                    <div>
                      <h3 className="text-2xl font-bold text-purple-600 mb-4">Module Transition</h3>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-slate-700">{previewDelivery.module_title}</p>
                      </div>
                    </div>
                  )}

                  {previewDelivery.delivery_type === 'completion' && course && (
                    <div>
                      <h3 className="text-2xl font-bold text-orange-600 mb-4">Campaign Complete!</h3>
                      <p className="text-slate-700 mb-4">Congratulations on completing {course.title}!</p>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div dangerouslySetInnerHTML={{ __html: course.conclusion_email.replace(/\n/g, '<br/>') }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-slate-800">Enroll Recipients</h2>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setEnrollmentMode('single');
                    setBulkPreview([]);
                    setCsvFile(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    enrollmentMode === 'single'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Single Recipient
                </button>
                <button
                  onClick={() => setEnrollmentMode('bulk')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    enrollmentMode === 'bulk'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bulk Upload
                </button>
              </div>
            </div>

            <div className="p-6">
              {enrollmentMode === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={enrollForm.recipientName}
                      onChange={(e) => setEnrollForm({ ...enrollForm, recipientName: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter student name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={enrollForm.recipientEmail}
                      onChange={(e) => setEnrollForm({ ...enrollForm, recipientEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="student@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={enrollForm.startDate}
                      onChange={(e) => setEnrollForm({ ...enrollForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Delivery Time
                    </label>
                    <input
                      type="time"
                      value={enrollForm.deliveryTime}
                      onChange={(e) => setEnrollForm({ ...enrollForm, deliveryTime: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Daily emails will be sent at this time in your timezone ({enrollForm.timezone})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">CSV Format</h3>
                    <p className="text-sm text-blue-800 mb-2">
                      Upload a CSV file with the following columns:
                    </p>
                    <code className="text-xs bg-white px-2 py-1 rounded block text-blue-900">
                      Name, Email
                    </code>
                    <p className="text-xs text-blue-700 mt-2">
                      Example: John Doe, john@example.com
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Upload CSV File
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {bulkPreview.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Preview ({bulkPreview.length} students)
                      </label>
                      <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                              <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {bulkPreview.map((recipient, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800">{recipient.name}</td>
                                <td className="px-4 py-2 text-slate-600">{recipient.email}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={bulkEnrollForm.startDate}
                      onChange={(e) => setBulkEnrollForm({ ...bulkEnrollForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Delivery Time
                    </label>
                    <input
                      type="time"
                      value={bulkEnrollForm.deliveryTime}
                      onChange={(e) => setBulkEnrollForm({ ...bulkEnrollForm, deliveryTime: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      All students will receive emails at this time in your timezone ({bulkEnrollForm.timezone})
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setBulkPreview([]);
                  setCsvFile(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={enrollmentMode === 'single' ? handleEnroll : handleBulkEnroll}
                disabled={enrolling || (enrollmentMode === 'bulk' && bulkPreview.length === 0)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : enrollmentMode === 'single' ? 'Enroll Recipient' : `Enroll ${bulkPreview.length} Recipients`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpgradePrompt && (
        <UpgradePrompt
          title="Upgrade Required"
          message={upgradeMessage || "Please upgrade to continue"}
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Delete OneDaily</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this OneDaily? This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-slate-600 mb-6 space-y-1">
              <li>All modules and daily emails</li>
              <li>All enrollments and delivery schedules</li>
              <li>All analytics data</li>
            </ul>
            <p className="text-red-600 font-medium mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete OneDaily
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
