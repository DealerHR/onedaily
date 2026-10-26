import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle, Circle, Loader, RefreshCw, Code } from 'lucide-react';

interface GenerateCourseContentProps {
  courseId: string;
  onNavigate: (page: string, courseId?: string) => void;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  learning_objectives: string[];
  order_index: number;
  youtube_video_url: string | null;
  youtube_video_title: string | null;
  content_generated_at: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  target_audience: string;
  tone: string;
  learning_objectives: string;
}

export const GenerateCourseContent = ({ courseId, onNavigate }: GenerateCourseContentProps) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [generating, setGenerating] = useState(false);
  const [contentTab, setContentTab] = useState<'preview' | 'html'>('preview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
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

      const modulesWithLessons: Module[] = [];
      for (const module of modulesData || []) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('module_lessons')
          .select('*')
          .eq('module_id', module.id)
          .order('order_index');

        if (lessonsError) throw lessonsError;

        modulesWithLessons.push({
          ...module,
          lessons: lessonsData || []
        });
      }

      setModules(modulesWithLessons);

      const firstUngenerated = modulesWithLessons
        .flatMap(m => m.lessons)
        .find(l => !l.content_generated_at);

      if (firstUngenerated) {
        setSelectedLesson(firstUngenerated);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateLessonContent = async (lesson: Lesson) => {
    if (!course) return;

    setGenerating(true);
    try {
      const module = modules.find(m => m.id === lesson.module_id);
      if (!module) throw new Error('Module not found');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/generate-lesson-content`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: course.id,
          course_title: course.title,
          course_description: course.description,
          module_title: module.title,
          module_description: module.description,
          lesson_title: lesson.title,
          lesson_description: lesson.content,
          lesson_order: lesson.order_index,
          total_lessons_in_module: module.lessons.length,
          target_audience: course.target_audience,
          tone: course.tone,
          learning_objectives: course.learning_objectives,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to generate lesson content');
      }

      const result = await response.json();

      const { error: updateError } = await supabase
        .from('module_lessons')
        .update({
          content: result.lesson.content,
          learning_objectives: result.lesson.learning_objectives,
          youtube_video_url: result.lesson.youtube_video_url,
          youtube_video_title: result.lesson.youtube_video_title,
          email_subject: lesson.title,
          email_content: result.lesson.content,
          content_generated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id);

      if (updateError) throw updateError;

      await loadCourseData();

      const nextLesson = modules
        .flatMap(m => m.lessons)
        .find(l => !l.content_generated_at && l.id !== lesson.id);

      if (nextLesson) {
        setSelectedLesson(nextLesson);
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      alert('Failed to generate lesson content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const allLessonsGenerated = modules.every(m =>
    m.lessons.every(l => l.content_generated_at)
  );

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const generatedLessons = modules.reduce((sum, m) =>
    sum + m.lessons.filter(l => l.content_generated_at).length, 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-slate-600 hover:text-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{course?.title}</h1>
                <p className="text-sm text-slate-600">
                  Generate content for {totalLessons} daily emails
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                {generatedLessons} / {totalLessons} completed
              </div>
              {allLessonsGenerated && (
                <button
                  onClick={() => onNavigate('course-details', courseId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  View Campaign
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(generatedLessons / totalLessons) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h2 className="font-semibold text-slate-800 mb-4">Campaign Outline</h2>
              <div className="space-y-3">
                {modules.map((module, moduleIdx) => (
                  <div key={module.id} className="space-y-2">
                    <div className="font-medium text-slate-700 text-sm">
                      Module {moduleIdx + 1}: {module.title}
                    </div>
                    <div className="space-y-1 ml-4">
                      {module.lessons.map((lesson, lessonIdx) => (
                        <button
                          key={lesson.id}
                          onClick={() => { setSelectedLesson(lesson); setContentTab('preview'); }}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                            selectedLesson?.id === lesson.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {lesson.content_generated_at ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          )}
                          <span className="truncate">
                            Day {lessonIdx + 1}: {lesson.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedLesson ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {selectedLesson.title}
                    </h2>
                    {!selectedLesson.content_generated_at && (
                      <p className="text-slate-600">{selectedLesson.content}</p>
                    )}
                  </div>
                  {selectedLesson.content_generated_at && (
                    <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      Generated
                    </span>
                  )}
                </div>

                {!selectedLesson.content_generated_at ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        Click the button below to generate high-quality content for this email.
                        The AI will create comprehensive, actionable content based on your campaign objectives.
                      </p>
                    </div>
                    <button
                      onClick={() => generateLessonContent(selectedLesson)}
                      disabled={generating}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Generating Content...
                        </>
                      ) : (
                        <>
                          Generate Email Content
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1 border-b border-slate-200">
                      <button
                        onClick={() => setContentTab('preview')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          contentTab === 'preview'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => setContentTab('html')}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          contentTab === 'html'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        HTML
                      </button>
                    </div>

                    {contentTab === 'preview' ? (
                      <div className="prose max-w-none">
                        <div className="bg-slate-50 rounded-lg p-6">
                          <div
                            className="text-slate-700"
                            dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                          />
                        </div>

                        {selectedLesson.learning_objectives && selectedLesson.learning_objectives.length > 0 && (
                          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">Learning Objectives:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedLesson.learning_objectives.map((obj, idx) => (
                                <li key={idx} className="text-blue-800">{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {selectedLesson.youtube_video_url && (
                          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">Recommended Video:</h4>
                            <a
                              href={selectedLesson.youtube_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline"
                            >
                              {selectedLesson.youtube_video_title}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-[600px]">
                        <pre className="text-sm text-slate-300 whitespace-pre-wrap break-all font-mono">
                          {selectedLesson.content}
                        </pre>
                      </div>
                    )}

                    <button
                      onClick={() => generateLessonContent(selectedLesson)}
                      disabled={generating}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate Content
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-slate-600">Select an email from the outline to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
