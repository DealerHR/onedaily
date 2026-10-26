import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface ManualCourseCreateProps {
  onNavigate: (page: string) => void;
}

interface DailyEmail {
  id: string;
  day: number;
  title: string;
  content: string;
  contentType: 'html' | 'text';
}

export const ManualCourseCreate = ({ onNavigate }: ManualCourseCreateProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [openingEmail, setOpeningEmail] = useState('');
  const [closingEmail, setClosingEmail] = useState('');
  const [dailyEmails, setDailyEmails] = useState<DailyEmail[]>([
    { id: '1', day: 1, title: 'Day 1', content: '', contentType: 'html' }
  ]);
  const [expandedEmail, setExpandedEmail] = useState<string | null>('opening');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addDailyEmail = () => {
    const newDay = dailyEmails.length + 1;
    setDailyEmails([
      ...dailyEmails,
      {
        id: Date.now().toString(),
        day: newDay,
        title: `Day ${newDay}`,
        content: '',
        contentType: 'html'
      }
    ]);
  };

  const removeDailyEmail = (id: string) => {
    const filtered = dailyEmails.filter(e => e.id !== id);
    const renumbered = filtered.map((email, index) => ({
      ...email,
      day: index + 1,
      title: email.title.startsWith('Day ') ? `Day ${index + 1}` : email.title
    }));
    setDailyEmails(renumbered);
  };

  const updateDailyEmail = (id: string, field: keyof DailyEmail, value: string) => {
    setDailyEmails(dailyEmails.map(email =>
      email.id === id ? { ...email, [field]: value } : email
    ));
  };

  const validateCourse = (): boolean => {
    if (!title.trim()) {
      setError('Please enter a campaign title');
      return false;
    }
    if (!description.trim()) {
      setError('Please enter a campaign description');
      return false;
    }
    if (!openingEmail.trim()) {
      setError('Please write an opening email');
      return false;
    }
    if (dailyEmails.some(e => !e.content.trim())) {
      setError('All daily emails must have content');
      return false;
    }
    if (!closingEmail.trim()) {
      setError('Please write a closing email');
      return false;
    }
    return true;
  };

  const saveCourse = async (publish: boolean = false) => {
    if (!validateCourse()) return;
    if (!user) {
      setError('You must be logged in');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          title,
          description,
          duration: `${dailyEmails.length} days`,
          creation_mode: 'manual',
          onboarding_email: openingEmail,
          conclusion_email: closingEmail,
          status: publish ? 'published' : 'draft',
          is_active: publish
        })
        .select()
        .single();

      if (courseError) throw courseError;

      const moduleData = await supabase
        .from('course_modules')
        .insert({
          course_id: courseData.id,
          title: 'Main Series',
          description: 'Daily emails',
          order_index: 0
        })
        .select()
        .single();

      if (moduleData.error) throw moduleData.error;

      for (let i = 0; i < dailyEmails.length; i++) {
        const email = dailyEmails[i];
        const { error: lessonError } = await supabase
          .from('module_lessons')
          .insert({
            module_id: moduleData.data.id,
            title: email.title,
            content: email.content,
            order_index: i,
            email_subject: `Day ${i + 1}: ${email.title}`,
            email_content: email.content,
            email_content_html: email.contentType === 'html' ? email.content : null,
            email_content_text: email.contentType === 'text' ? email.content : null,
            content_generated_at: new Date().toISOString()
          });

        if (lessonError) throw lessonError;
      }

      if (publish) {
        onNavigate(`course-details:${courseData.id}`);
      } else {
        onNavigate(`course-editor:${courseData.id}`);
      }
    } catch (err) {
      console.error('Error saving course:', err);
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Create OneDaily Manually
          </h1>
          <p className="text-slate-600">
            Build your email campaign from scratch with complete control
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Sales Excellence: 30 Days of High-Impact Skills"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this campaign is about..."
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <button
              onClick={() => setExpandedEmail(expandedEmail === 'opening' ? null : 'opening')}
              className="w-full p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  0
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-800">Opening Email</h3>
                  <p className="text-sm text-slate-600">Welcome message to start the campaign</p>
                </div>
              </div>
              {expandedEmail === 'opening' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {expandedEmail === 'opening' && (
              <div className="p-6">
                <textarea
                  value={openingEmail}
                  onChange={(e) => setOpeningEmail(e.target.value)}
                  placeholder="Write your opening email content here. You can use HTML tags for formatting..."
                  rows={8}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tip: Use HTML tags like &lt;strong&gt;, &lt;em&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt; for formatting
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Daily Emails</h2>
              <button
                onClick={addDailyEmail}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Email
              </button>
            </div>

            <div className="space-y-3">
              {dailyEmails.map((email, index) => (
                <div key={email.id} className="border border-slate-200 rounded-lg">
                  <button
                    onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                    className="w-full p-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                        {email.day}
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-slate-800">{email.title}</h4>
                        <p className="text-xs text-slate-500">
                          {email.content.length > 0 ? `${email.content.length} characters` : 'No content yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dailyEmails.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDailyEmail(email.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {expandedEmail === email.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {expandedEmail === email.id && (
                    <div className="p-4 border-t border-slate-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Title
                        </label>
                        <input
                          type="text"
                          value={email.title}
                          onChange={(e) => updateDailyEmail(email.id, 'title', e.target.value)}
                          placeholder={`Day ${email.day} title`}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Content Type
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => updateDailyEmail(email.id, 'contentType', 'html')}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              email.contentType === 'html'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            HTML
                          </button>
                          <button
                            onClick={() => updateDailyEmail(email.id, 'contentType', 'text')}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                              email.contentType === 'text'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Plain Text
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Content
                        </label>
                        <textarea
                          value={email.content}
                          onChange={(e) => updateDailyEmail(email.id, 'content', e.target.value)}
                          placeholder={
                            email.contentType === 'html'
                              ? 'Write your email content with HTML formatting...'
                              : 'Write your email content in plain text...'
                          }
                          rows={8}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200">
            <button
              onClick={() => setExpandedEmail(expandedEmail === 'closing' ? null : 'closing')}
              className="w-full p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
                  ✓
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-800">Closing Email</h3>
                  <p className="text-sm text-slate-600">Final message to wrap up the campaign</p>
                </div>
              </div>
              {expandedEmail === 'closing' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {expandedEmail === 'closing' && (
              <div className="p-6">
                <textarea
                  value={closingEmail}
                  onChange={(e) => setClosingEmail(e.target.value)}
                  placeholder="Write your closing email content here..."
                  rows={8}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => saveCourse(false)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => saveCourse(true)}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
                {saving ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
