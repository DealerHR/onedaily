import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { checkCourseCreationLimit, UsageStatus } from '../lib/usageValidation';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { Sparkles, BookOpen, ArrowLeft, Check, Loader, CreditCard as Edit2, Plus, Trash2, Upload, FileText, X } from 'lucide-react';

interface GenerateCourseProps {
  onNavigate: (page: string, courseId?: string) => void;
}

interface LessonOutline {
  title: string;
  description: string;
  order_index: number;
}

interface ModuleOutline {
  title: string;
  description: string;
  order_index: number;
  lessons: LessonOutline[];
}

const TONE_OPTIONS = [
  { value: 'instructional', label: 'Instructional', description: 'Clear, structured, and educational' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly and engaging dialogue' },
  { value: 'light-hearted', label: 'Light-hearted', description: 'Fun and entertaining' },
  { value: 'serious', label: 'Serious', description: 'Professional and formal' },
];

export const GenerateCourse = ({ onNavigate }: GenerateCourseProps) => {
  const [step, setStep] = useState<'input' | 'outline'>('input');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30 days');
  const [prerequisites, setPrerequisites] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('conversational');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [courseOutline, setCourseOutline] = useState<ModuleOutline[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfText, setPdfText] = useState('');

  useEffect(() => {
    loadUsageStatus();
  }, []);

  const loadUsageStatus = async () => {
    const status = await checkCourseCreationLimit();
    setUsageStatus(status);
  };

  const handlePdfUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }

    setPdfUploading(true);
    setError('');
    setProgress('Uploading and parsing PDF...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('course-pdfs')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/parse-pdf`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to parse PDF');
      }

      const result = await response.json();
      setPdfText(result.text);
      setPdfFile(file);
      setProgress('');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload PDF');
      setProgress('');
      setPdfFile(null);
      setPdfText('');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
    setPdfText('');
  };

  const handleGenerateOutline = async () => {
    if (!title.trim() || !description.trim() || !learningObjectives.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    const status = await checkCourseCreationLimit();
    if (!status.canCreate) {
      setShowUpgradePrompt(true);
      return;
    }

    setGenerating(true);
    setError('');
    setProgress('Generating campaign outline...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/generate-course-outline`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          target_audience: targetAudience,
          learning_objectives: learningObjectives,
          pdf_content: pdfText || undefined,
          num_sessions: parseInt(duration.match(/\d+/)?.[0] || '30', 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error response:', errorData);
        const errorMsg = errorData?.details
          ? `${errorData.error}: ${errorData.details}`
          : (errorData?.error || 'Failed to generate outline');
        throw new Error(errorMsg);
      }

      const result = await response.json();
      setCourseOutline(result.outline.modules);
      setStep('outline');
      setProgress('');
    } catch (error) {
      console.error('Error generating outline:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate outline');
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveOutlineAndProceed = async () => {
    if (courseOutline.length === 0) {
      setError('No outline to save');
      return;
    }

    setGenerating(true);
    setProgress('Saving campaign outline...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const functionUrl = `${supabaseUrl}/functions/v1/save-course-outline`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          duration,
          prerequisites,
          target_audience: targetAudience,
          tone,
          learning_objectives: learningObjectives,
          modules: courseOutline,
          pdf_content: pdfText || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.upgrade_required) {
          setShowUpgradePrompt(true);
          setGenerating(false);
          return;
        }
        throw new Error(errorData?.error || 'Failed to save outline');
      }

      const result = await response.json();
      await loadUsageStatus();

      onNavigate(`generate-content:${result.course_id}`);
    } catch (error) {
      console.error('Error saving outline:', error);
      setError(error instanceof Error ? error.message : 'Failed to save outline');
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const totalLessons = courseOutline.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Create New OneDaily Campaign</h2>
            <p className="text-slate-600">
              {step === 'input' ? 'Step 1: Define your campaign' : 'Step 2: Review and confirm outline'}
            </p>
          </div>
          {usageStatus && usageStatus.planType === 'free' && (
            <div className="text-right">
              <div className="text-sm text-slate-600">Free Plan</div>
              <div className="text-lg font-semibold text-slate-800">
                {usageStatus.coursesUsed} / {usageStatus.coursesLimit} OneDailys
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-8">
          <div className={`flex items-center gap-2 ${step === 'input' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'input' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {step === 'outline' ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <span className="font-medium">OneDaily Details</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step === 'outline' ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'outline' ? 'bg-blue-100' : 'bg-slate-100'
            }`}>
              2
            </div>
            <span className="font-medium">Review Outline</span>
          </div>
        </div>

        {usageStatus && !usageStatus.canCreate && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-900 font-medium">
              You have reached the free plan limit of {usageStatus.coursesLimit} OneDailys.
            </p>
            <button
              onClick={() => setShowUpgradePrompt(true)}
              className="mt-2 text-sm text-amber-700 underline hover:text-amber-900"
            >
              Contact sales to upgrade
            </button>
          </div>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                OneDaily Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Practical L&D Principles for Managers"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Briefly describe what this OneDaily covers and who it's for..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Training Material (Optional)
              </label>
              <p className="text-sm text-slate-600 mb-3">
                Upload a PDF presentation or document to generate 30 follow-up emails based on its content.
              </p>

              {!pdfFile ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePdfUpload(file);
                      }
                    }}
                    className="hidden"
                    id="pdf-upload"
                    disabled={pdfUploading}
                  />
                  <label
                    htmlFor="pdf-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {pdfUploading ? 'Uploading...' : 'Click to upload PDF'}
                    </span>
                    <span className="text-xs text-slate-500">Max file size: 10MB</span>
                  </label>
                </div>
              ) : (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">{pdfFile.name}</p>
                    <p className="text-xs text-green-700">
                      PDF parsed successfully ({Math.round(pdfFile.size / 1024)} KB)
                    </p>
                  </div>
                  <button
                    onClick={handleRemovePdf}
                    className="flex-shrink-0 p-1 hover:bg-green-100 rounded transition-colors"
                    title="Remove PDF"
                  >
                    <X className="w-5 h-5 text-green-700" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Audience
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., L&D managers, HR professionals, team leaders"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Goals & Objectives *
              </label>
              <textarea
                value={learningObjectives}
                onChange={(e) => setLearningObjectives(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What should participants achieve or experience? List key outcomes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tone
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTone(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      tone === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-slate-800">{option.label}</div>
                    <div className="text-sm text-slate-600">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duration
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prerequisites
                </label>
                <input
                  type="text"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="None"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {progress && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-blue-800">{progress}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateOutline}
              disabled={generating || !usageStatus?.canCreate}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating Outline...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Outline
                </>
              )}
            </button>
          </div>
        )}

        {step === 'outline' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Review Your Campaign Outline</h3>
              <p className="text-sm text-blue-800">
                Review the {courseOutline.length} modules and {totalLessons} daily emails below.
                You can edit titles if needed. After confirming, you'll generate content for each email individually.
              </p>
            </div>

            <div className="space-y-4">
              {courseOutline.map((module, moduleIdx) => (
                <div key={moduleIdx} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-600">{moduleIdx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => {
                          const newOutline = [...courseOutline];
                          newOutline[moduleIdx].title = e.target.value;
                          setCourseOutline(newOutline);
                        }}
                        className="w-full font-semibold text-slate-800 mb-1 px-2 py-1 border border-transparent hover:border-slate-300 rounded focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        value={module.description}
                        onChange={(e) => {
                          const newOutline = [...courseOutline];
                          newOutline[moduleIdx].description = e.target.value;
                          setCourseOutline(newOutline);
                        }}
                        rows={2}
                        className="w-full text-sm text-slate-600 px-2 py-1 border border-transparent hover:border-slate-300 rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="ml-11 space-y-2">
                    {module.lessons.map((lesson, lessonIdx) => (
                      <div key={lessonIdx} className="flex items-start gap-2 text-sm">
                        <span className="text-slate-400 flex-shrink-0">Day {lessonIdx + 1}:</span>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) => {
                            const newOutline = [...courseOutline];
                            newOutline[moduleIdx].lessons[lessonIdx].title = e.target.value;
                            setCourseOutline(newOutline);
                          }}
                          className="flex-1 text-slate-700 px-2 py-1 border border-transparent hover:border-slate-300 rounded focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {progress && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-blue-800">{progress}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('input')}
                disabled={generating}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Back to Edit
              </button>
              <button
                onClick={handleSaveOutlineAndProceed}
                disabled={generating}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirm & Generate Content
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showUpgradePrompt && (
        <UpgradePrompt
          title="Upgrade Required"
          message="You have reached the free plan limit. Contact sales to upgrade your plan."
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
};
