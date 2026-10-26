import { AlertCircle, Mail } from 'lucide-react';

interface UpgradePromptProps {
  title: string;
  message: string;
  onClose?: () => void;
}

export const UpgradePrompt = ({ title, message, onClose }: UpgradePromptProps) => {
  const handleContactSales = () => {
    window.location.href = 'mailto:sales@onedaily.com?subject=Upgrade to Paid Plan';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-600">{message}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Upgrade to Paid Plan</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Unlimited campaigns</li>
            <li>• Unlimited enrollments per campaign</li>
            <li>• Priority support</li>
            <li>• Custom domain features</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContactSales}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mail className="w-4 h-4" />
            Contact Sales
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Our sales team will help you choose the best plan for your organization
        </p>
      </div>
    </div>
  );
};
