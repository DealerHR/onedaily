import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Save, Eye, Sparkles, CreditCard as Edit2, Check, X, Send, Calendar, BookOpen, AlertCircle } from 'lucide-react';

interface CourseEditorProps {
  courseId: string;
  onNavigate: (page: string) => void;
}

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  email_subject: string;
  email_content: string;
  order_index: number;
  learning_objectives: string[];
  content_generated_at: string | null;
  last_edited_at: string | null;
}

export const CourseEditor = ({ courseId, onNavigate }: CourseEditorProps) => {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [regeneratingLesson, setRegeneratingLesson] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [editForm, setEditForm] = useState({
    email_subject: '',
    email_content: '',
  });

  useEffect(() => {
    if (user && courseId) {
      loadCourseData();
    }
  }, [user, courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: modulesData, error: modulesError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('module_lessons')
        .select('*')
        .in('module_id', modulesData?.map(m => m.id) || [])
        .order('order_index');

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson.id);
    setEditForm({
      email_subject: lesson.email_subject,
      email_content: lesson.email_content,
    });
  };

  const cancelEdit = () => {
    setEditingLesson(null);
    setEditForm({ email_subject: '', email_content: '' });
  };

  const saveLesson = async (lessonId: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('module_lessons')
        .update({
          email_subject: editForm.email_subject,
          email_content: editForm.email_content,
          last_edited_at: new Date().toISOString(),
          edited_by: user?.id,
        })
        .eq('id', lessonId);

      if (error) throw error;

      await loadCourseData();
      setEditingLesson(null);
      setEditForm({ email_subject: '', email_content: '' });
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const regenerateLesson = async (lessonId: string) => {
    const confirmed = confirm('This will replace the current lesson content with AI-generated content. Continue?');
    if (!confirmed) return;

    try {
      setRegeneratingLesson(lessonId);

      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-lesson`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            course_id: courseId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate lesson');
      }

      await loadCourseData();
      alert('Lesson regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating lesson:', error);
      alert(error instanceof Error ? error.message : 'Failed to regenerate lesson');
    } finally {
      setRegeneratingLesson(null);
    }
  };

  const publishCourse = async () => {
    const confirmed = confirm('Publishing this campaign will make it available for enrollment and email delivery. Continue?');
    if (!confirmed) return;

    try {
      setPublishing(true);

      const { error } = await supabase
        .from('courses')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', courseId);

      if (error) throw error;

      alert('Campaign published successfully! You can now enroll learners.');
      onNavigate(`course-details:${courseId}`);
    } catch (error) {
      console.error('Error publishing course:', error);
      alert('Failed to publish campaign. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const getLessonsByModule = (moduleId: string) => {
    return lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.order_index - b.order_index);
  };

  const getTotalLessonNumber = (lesson: Lesson) => {
    let count = 0;
    for (const mod of modules) {
      const moduleLessons = getLessonsByModule(mod.id);
      for (const l of moduleLessons) {
        count++;
        if (l.id === lesson.id) return count;
      }
    }
    return count;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading campaign editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{course?.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                    Draft
                  </span>
                  <span className="text-sm text-slate-500">
                    {lessons.length} emails across {modules.length} phases
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={publishCourse}
              disabled={publishing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {publishing ? 'Publishing...' : 'Publish Campaign'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Review and Edit Your Campaign</h3>
              <p className="text-sm text-blue-700 mt-1">
                Review each email below. You can manually edit the content or use AI to regenerate individual emails.
                Once satisfied, publish the campaign to start enrolling learners.
              </p>
            </div>
          </div>
        </div>

        {modules.map((module, moduleIndex) => {
          const moduleLessons = getLessonsByModule(module.id);

          return (
            <div key={module.id} className="mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                      {moduleIndex + 1}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{module.title}</h2>
                      <p className="text-sm text-slate-600">{module.description}</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {moduleLessons.map((lesson) => {
                    const isEditing = editingLesson === lesson.id;
                    const isRegenerating = regeneratingLesson === lesson.id;
                    const dayNumber = getTotalLessonNumber(lesson);

                    return (
                      <div key={lesson.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                                Day {dayNumber}
                              </span>
                              <h3 className="font-semibold text-slate-800">{lesson.title}</h3>
                              {lesson.last_edited_at && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Edited
                                </span>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="space-y-2">
                                <p className="text-sm text-slate-600">
                                  <span className="font-medium">Subject:</span> {lesson.email_subject}
                                </p>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                  {lesson.email_content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                                </p>
                              </div>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => setPreviewLesson(lesson)}
                                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Preview
                              </button>
                              <button
                                onClick={() => startEditLesson(lesson)}
                                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => regenerateLesson(lesson.id)}
                                disabled={isRegenerating}
                                className="px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <Sparkles className="w-4 h-4" />
                                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing && (
                          <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email Subject
                              </label>
                              <input
                                type="text"
                                value={editForm.email_subject}
                                onChange={(e) => setEditForm({ ...editForm, email_subject: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Subject line"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email Content
                              </label>
                              <textarea
                                value={editForm.email_content}
                                onChange={(e) => setEditForm({ ...editForm, email_content: e.target.value })}
                                rows={12}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                placeholder="Lesson content"
                              />
                              <p className="text-xs text-slate-500 mt-2">
                                You can paste plain text or HTML. HTML tags will be preserved and rendered in emails.
                                Plain text will automatically be formatted with paragraph tags.
                              </p>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                              <button
                                onClick={() => saveLesson(lesson.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Email Preview</h3>
                <p className="text-sm text-slate-600">Day {getTotalLessonNumber(previewLesson)}</p>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-slate-600 mb-2">Subject:</p>
                <p className="font-semibold text-slate-800">{previewLesson.email_subject}</p>
              </div>
              <div className="prose prose-slate max-w-none">
                <div dangerouslySetInnerHTML={{ __html: previewLesson.email_content }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
