import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Shield, Users, Activity, Calendar, Settings, Save, Key, ChevronDown, ChevronUp, Crown, Trash2, UserX, UserCheck } from 'lucide-react';

type UserWithStats = Profile & {
  usage_count: number;
  domain?: string;
  plan_type?: string;
  course_count?: number;
  enrollment_count?: number;
  emails_sent?: number;
};

const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (Most Capable)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast & Affordable)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Fastest)' },
];

const CLAUDE_MODELS = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (Most Intelligent)' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Best Balance)' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Fastest)' },
];

export const Admin = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiProvider, setApiProvider] = useState<'openai' | 'claude'>('openai');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [senderName, setSenderName] = useState('OneDaily');
  const [senderEmail, setSenderEmail] = useState('courses@resend.dev');
  const [emailSignature, setEmailSignature] = useState('Best regards,\n{sender_name}\n{organization}');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [savingSender, setSavingSender] = useState(false);
  const [senderSaveMessage, setSenderSaveMessage] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadAIProviderSettings();
      loadOpenAISettings();
      loadSenderSettings();
    }
  }, [isAdmin]);

  const loadAIProviderSettings = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_provider')
      .maybeSingle();

    if (!error && data) {
      setApiProvider(data.setting_value as 'openai' | 'claude');
    }
  };

  const saveAIProviderSettings = async () => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        setting_key: 'ai_provider',
        setting_value: apiProvider,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'setting_key'
      });

    if (error) {
      console.error('Error saving AI provider:', error);
      return false;
    }
    return true;
  };

  const loadOpenAISettings = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('openai_settings')
      .select('api_key, anthropic_api_key, selected_model')
      .eq('user_id', user.user.id)
      .maybeSingle();

    if (!error && data) {
      setOpenaiApiKey(data.api_key || '');
      setAnthropicApiKey(data.anthropic_api_key || '');
      setSelectedModel(data.selected_model || 'gpt-4o-mini');
    }
  };

  const loadSenderSettings = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('sender_name, sender_email, email_signature, organization')
      .eq('id', user.user.id)
      .maybeSingle();

    if (!error && data) {
      setSenderName(data.sender_name || 'OneDaily');
      setSenderEmail(data.sender_email || 'courses@resend.dev');
      setEmailSignature(data.email_signature || 'Best regards,\n{sender_name}\n{organization}');
    }
  };

  const saveSenderSettings = async () => {
    setSavingSender(true);
    setSenderSaveMessage('');

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setSenderSaveMessage('Error: Not authenticated');
      setSavingSender(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        sender_name: senderName,
        sender_email: senderEmail,
        email_signature: emailSignature,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.user.id);

    if (error) {
      setSenderSaveMessage('Error saving sender settings');
      console.error('Error saving sender settings:', error);
    } else {
      setSenderSaveMessage('Sender settings saved successfully!');
      setTimeout(() => setSenderSaveMessage(''), 3000);
    }

    setSavingSender(false);
  };

  const saveOpenAISettings = async () => {
    setSaving(true);
    setSaveMessage('');

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setSaveMessage('Error: Not authenticated');
      setSaving(false);
      return;
    }

    const providerSaved = await saveAIProviderSettings();
    if (!providerSaved) {
      setSaveMessage('Error saving AI provider settings');
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from('openai_settings')
      .select('id')
      .eq('user_id', user.user.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from('openai_settings')
        .update({
          api_key: openaiApiKey || null,
          anthropic_api_key: anthropicApiKey || null,
          selected_model: selectedModel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('openai_settings')
        .insert({
          user_id: user.user.id,
          api_key: openaiApiKey || null,
          anthropic_api_key: anthropicApiKey || null,
          selected_model: selectedModel,
        });
      error = result.error;
    }

    if (error) {
      setSaveMessage('Error saving settings');
      console.error('Error saving settings:', error);
    } else {
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }

    setSaving(false);
  };

  const loadUsers = async () => {
    setLoading(true);

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error loading auth users:', authError);
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error loading profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: statsRows } = await supabase.rpc('get_admin_user_stats');
    const statsMap = new Map(
      (statsRows || []).map((r: { user_id: string; campaign_count: number; enrollment_count: number; emails_sent: number }) => [r.user_id, r])
    );

    const domains = [...new Set((profiles || []).map(p => {
      const authUser = authUsers?.users.find(u => u.id === p.id);
      return (authUser?.email || p.email || '').split('@')[1] || '';
    }).filter(Boolean))];

    const planResults = await Promise.all(
      domains.map(domain =>
        supabase
          .from('domain_plans')
          .select('domain, plan_type')
          .eq('domain', domain)
          .maybeSingle()
          .then(({ data }) => data)
      )
    );
    const planMap = new Map(planResults.filter(Boolean).map(p => [p!.domain, p!.plan_type]));

    const usersWithStats: UserWithStats[] = (profiles || []).map((profile) => {
      const authUser = authUsers?.users.find(u => u.id === profile.id);
      const userEmail = authUser?.email || profile.email || '';
      const domain = userEmail.split('@')[1] || '';
      const stats = statsMap.get(profile.id);

      return {
        ...profile,
        usage_count: 0,
        domain,
        plan_type: planMap.get(domain) || 'free',
        course_count: Number(stats?.campaign_count) || 0,
        enrollment_count: Number(stats?.enrollment_count) || 0,
        emails_sent: Number(stats?.emails_sent) || 0,
      };
    });

    setUsers(usersWithStats);
    setLoading(false);
  };

  const upgradeDomain = async (domain: string) => {
    if (!domain) return;

    const confirmUpgrade = confirm(`Upgrade domain "${domain}" to paid plan with unlimited campaigns and enrollments?`);
    if (!confirmUpgrade) return;

    const { error } = await supabase
      .from('domain_plans')
      .upsert({
        domain,
        plan_type: 'paid',
        course_limit: 999999,
        enrollment_limit_per_course: 999999,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'domain'
      });

    if (error) {
      alert('Error upgrading domain: ' + error.message);
      console.error('Error upgrading domain:', error);
    } else {
      alert(`Domain "${domain}" upgraded to paid plan successfully!`);
      loadUsers();
    }
  };

  const toggleUserActivation = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMsg = currentStatus
      ? 'Deactivate this user? They will lose all access to the platform immediately.'
      : 'Reactivate this user? They will regain full access to the platform.';

    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert(`Failed to ${action} user: ${error.message}`);
      console.error(`Error ${action}ing user:`, error);
    } else {
      alert(`User ${action}d successfully!`);
      loadUsers();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
            <p className="text-slate-600">You don't have permission to access the admin panel.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-slate-600">Manage users and monitor platform usage</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">{users.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Total Tool Usage</h3>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {users.reduce((sum, user) => sum + user.usage_count, 0)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-600">Active Admins</h3>
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-800">
              {users.filter(u => u.is_admin).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <button
            onClick={() => setShowEmailSettings(!showEmailSettings)}
            className="w-full p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-slate-800">Email Sender Settings</h2>
                  <p className="text-sm text-slate-600 mt-1">Configure how your campaign emails appear to recipients</p>
                </div>
              </div>
              {showEmailSettings ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </button>

          {showEmailSettings && (
            <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="OneDaily"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                This name will appear as the sender of all campaign emails
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sender Email
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="courses@resend.dev"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be a verified domain in your Resend account (currently: courses@resend.dev)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Signature
              </label>
              <textarea
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                rows={4}
                placeholder="Best regards,&#10;{sender_name}&#10;{organization}"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                This signature will be added at the end of all campaign emails. Use {'{sender_name}'} and {'{organization}'} as placeholders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveSenderSettings}
                disabled={savingSender || !senderName || !senderEmail}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {savingSender ? 'Saving...' : 'Save Sender Settings'}
              </button>
              {senderSaveMessage && (
                <span className={`text-sm ${senderSaveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {senderSaveMessage}
                </span>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <button
            onClick={() => setShowApiSettings(!showApiSettings)}
            className="w-full p-6 border-b border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h2 className="text-xl font-semibold text-slate-800">AI Provider Settings</h2>
                  <p className="text-sm text-slate-600 mt-1">Configure AI API for campaign generation (OpenAI or Claude)</p>
                </div>
              </div>
              {showApiSettings ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </button>

          {showApiSettings && (
            <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                AI Provider
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setApiProvider('openai');
                    setSelectedModel('gpt-4o-mini');
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    apiProvider === 'openai'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-800">OpenAI</div>
                  <div className="text-xs text-slate-600 mt-1">ChatGPT Models</div>
                </button>
                <button
                  onClick={() => {
                    setApiProvider('claude');
                    setSelectedModel('claude-haiku-4-5');
                  }}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    apiProvider === 'claude'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-800">Claude</div>
                  <div className="text-xs text-slate-600 mt-1">Anthropic Models</div>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                All platform users will use the selected AI provider for campaign generation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Key className="w-4 h-4 inline mr-2" />
                Anthropic API Key
              </label>
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">
                Get your API key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com/settings/keys</a>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {(apiProvider === 'openai' ? OPENAI_MODELS : CLAUDE_MODELS).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {apiProvider === 'openai'
                  ? 'GPT-4o Mini recommended for best balance of speed and cost'
                  : 'Claude Haiku 4.5 recommended for best balance of speed and cost'
                }
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={saveOpenAISettings}
                disabled={saving || (apiProvider === 'openai' && !openaiApiKey) || (apiProvider === 'claude' && !anthropicApiKey)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {saveMessage && (
                <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMessage}
                </span>
              )}
            </div>
          </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">All Users</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Campaigns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Enrolled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Emails Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.is_active ? 'opacity-60 bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-800">{user.full_name}</p>
                            {!user.is_active && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                <UserX className="w-3 h-3" />
                                Deactivated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.domain || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {user.plan_type === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Crown className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">
                          {user.course_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">
                          {user.enrollment_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-800">
                          {user.emails_sent || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.plan_type !== 'paid' && user.domain && (
                            <button
                              onClick={() => upgradeDomain(user.domain!)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 transition-colors"
                            >
                              <Crown className="w-3 h-3" />
                              Upgrade
                            </button>
                          )}
                          <button
                            onClick={() => toggleUserActivation(user.id, user.is_active)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              user.is_active
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="w-3 h-3" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                Activate
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
