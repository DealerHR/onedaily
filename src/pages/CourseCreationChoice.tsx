import { Sparkles, Pencil } from 'lucide-react';

interface CourseCreationChoiceProps {
  onNavigate: (page: string) => void;
}

export const CourseCreationChoice = ({ onNavigate }: CourseCreationChoiceProps) => {
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Create Your OneDaily
          </h1>
          <p className="text-slate-600">
            Choose how you want to build your daily email campaign
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onNavigate('generate-course')}
            className="group bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 p-8 text-left transition-all hover:shadow-lg"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              AI-Powered Generation
            </h2>
            <p className="text-slate-600 mb-4">
              Let AI create your entire email campaign based on your topic, goals, and optional training materials. Perfect for quickly building structured learning journeys.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Auto-generate entire campaign structure and content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Upload PDFs or presentations for context</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Edit and customize before publishing</span>
              </li>
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
              Generate with AI
              <span>→</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('manual-course-create')}
            className="group bg-white rounded-xl border-2 border-slate-200 hover:border-green-500 p-8 text-left transition-all hover:shadow-lg"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Pencil className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Manual Creation
            </h2>
            <p className="text-slate-600 mb-4">
              Craft your email campaign from scratch with full control. Write each email exactly as you want it. Ideal for custom messaging and specific content.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Complete creative control over every email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Add emails one by one with custom content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Support for HTML formatting or plain text</span>
              </li>
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 text-green-600 font-medium group-hover:gap-3 transition-all">
              Create Manually
              <span>→</span>
            </div>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-slate-600 hover:text-slate-800 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
