import { ArrowRight, Mail, Bell, Clock, Target, CheckCircle, Users, TrendingUp, Zap, MessageSquare, Megaphone, BarChart3 } from 'lucide-react';

interface LandingProps {
  onNavigate: (page: string) => void;
}

export const Landing = ({ onNavigate }: LandingProps) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/1_Daily_Logo_SVG.svg" alt="OneDaily AI" className="h-12" />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('signin')}
                className="px-6 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors hidden sm:block"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-medium"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 backdrop-blur-sm text-white rounded-full text-sm font-bold mb-6 shadow-lg">
                <Bell className="w-4 h-4 text-blue-400" />
                Transform How You Connect With Your Team
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                Engage Your Team
                <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mt-2">
                  One Nudge. Every Day.
                </span>
              </h1>
              <p className="text-lg text-blue-100 mb-8 leading-relaxed max-w-2xl">
                Daily email nudges powered by AI. Communicate learning content, performance insights, corporate updates, or motivational messages to your team consistently.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
                <div className="text-center">
                  <p className="text-3xl font-black bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">85%</p>
                  <p className="text-xs text-blue-200 mt-1.5 font-semibold">Engagement Rate</p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">Daily</p>
                  <p className="text-xs text-blue-200 mt-1.5 font-semibold">Consistent Reach</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">90%</p>
                  <p className="text-xs text-blue-200 mt-1.5 font-semibold">Time Saved</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onNavigate('signup')}
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all font-bold text-base flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  <span className="relative z-10">Start Your Campaign</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <button
                  onClick={() => onNavigate('signin')}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-xl hover:bg-white/20 hover:border-white/50 transition-all font-bold text-base"
                >
                  See How It Works
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-3xl blur-3xl opacity-30"></div>
              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
                <div className="space-y-3">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-white/50 transform hover:scale-105 transition-transform">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Day 1: Welcome Nudge</h3>
                        <p className="text-xs text-blue-600 font-semibold">Delivered today</p>
                      </div>
                    </div>
                    <p className="text-slate-700 text-xs font-medium">Welcome to the team! Here's what you need to know about our culture...</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full w-full"></div>
                      </div>
                      <span className="text-xs font-bold text-blue-600">Read</span>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/40 opacity-90 transform hover:scale-105 transition-transform">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Day 2: Q1 Goals Update</h3>
                        <p className="text-xs text-cyan-600 font-semibold">Scheduled for tomorrow</p>
                      </div>
                    </div>
                    <p className="text-slate-700 text-xs font-medium">Your performance metrics and targets for this quarter...</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 bg-cyan-200 rounded-full h-2">
                        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-2 rounded-full w-2/3"></div>
                      </div>
                      <span className="text-xs font-bold text-cyan-600">66%</span>
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg border border-white/30 opacity-75 transform hover:scale-105 transition-transform">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Day 3: Skills Spotlight</h3>
                        <p className="text-xs text-emerald-600 font-semibold">Scheduled in 2 days</p>
                      </div>
                    </div>
                    <p className="text-slate-700 text-xs">Today's micro-lesson: Effective communication...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)'
        }}></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center text-white">
            <h2 className="text-4xl font-black mb-6">Daily Nudges That Drive Engagement</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              From onboarding to performance updates, learning content to corporate communications.
              OneDaily keeps your team connected, informed, and engaged with consistent daily touchpoints.
            </p>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-md rounded-2xl p-8 border border-blue-500/30 shadow-xl">
                <p className="text-5xl font-black bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent mb-3">85%</p>
                <p className="text-white font-bold text-lg">Open Rate</p>
                <p className="text-xs text-blue-200 mt-2 font-semibold">Daily Nudges</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 backdrop-blur-md rounded-2xl p-8 border border-cyan-500/30 shadow-xl">
                <p className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-3">100%</p>
                <p className="text-white font-bold text-lg">Reach</p>
                <p className="text-xs text-cyan-200 mt-2 font-semibold">Every Employee</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 backdrop-blur-md rounded-2xl p-8 border border-emerald-500/30 shadow-xl">
                <p className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent mb-3">90%</p>
                <p className="text-white font-bold text-lg">Time Saved</p>
                <p className="text-xs text-emerald-200 mt-2 font-semibold">AI Generation</p>
              </div>
              <div className="bg-gradient-to-br from-violet-500/20 to-violet-600/10 backdrop-blur-md rounded-2xl p-8 border border-violet-500/30 shadow-xl">
                <p className="text-5xl font-black bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent mb-3">3min</p>
                <p className="text-white font-bold text-lg">Daily Read</p>
                <p className="text-xs text-violet-200 mt-2 font-semibold">Quick & Effective</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything You Need for Employee Engagement
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Powerful features designed for HR and L&D teams to communicate, educate, and inspire
              employees through consistent daily touchpoints.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 shadow-sm border border-blue-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Content</h3>
              <p className="text-slate-600 leading-relaxed">
                Transform your ideas into engaging nudge campaigns using advanced AI.
                Generate learning content, updates, or motivational messages instantly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-8 shadow-sm border border-cyan-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Automated Delivery</h3>
              <p className="text-slate-600 leading-relaxed">
                Schedule and automate your nudge campaigns. Set it once and let the system handle
                daily distribution to your team.
              </p>
            </div>

            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-8 shadow-sm border border-sky-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Megaphone className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Purpose Nudges</h3>
              <p className="text-slate-600 leading-relaxed">
                Send learning content, performance insights, corporate updates, wellness tips,
                or any message that drives employee engagement.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 shadow-sm border border-blue-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Flexible Enrollment</h3>
              <p className="text-slate-600 leading-relaxed">
                Enroll teams, departments, or individual employees. Manage all recipients
                and track engagement from one central dashboard.
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-8 shadow-sm border border-cyan-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Customizable Messages</h3>
              <p className="text-slate-600 leading-relaxed">
                Tailor every nudge to your organization's voice and needs. Edit, refine, and
                personalize messages before delivery.
              </p>
            </div>

            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-8 shadow-sm border border-sky-100 hover:shadow-xl hover:scale-105 transition-all">
              <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Campaign Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Track delivery status, monitor open rates, and measure the impact of your
                communication campaigns in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Launch Campaigns in Three Simple Steps
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From concept to daily nudges in minutes, not weeks
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Define Your Campaign</h3>
              <p className="text-slate-600 leading-relaxed">
                Specify your goals whether it's learning, performance updates, or team engagement.
                Our AI understands your objectives.
              </p>
            </div>

            <div className="text-center bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-sky-500 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-sky-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Generate Nudges</h3>
              <p className="text-slate-600 leading-relaxed">
                AI creates a structured campaign with daily nudges. Review, edit, and customize
                each message to match your voice.
              </p>
            </div>

            <div className="text-center bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-500 text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-sky-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Engage & Track</h3>
              <p className="text-slate-600 leading-relaxed">
                Enroll your team and launch. The system delivers daily nudges automatically
                and tracks engagement in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Why HR & L&D Teams Choose OneDaily
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">Save 90% of Content Creation Time</h3>
                    <p className="text-slate-600">What used to take weeks now takes minutes with AI-powered nudge generation for any use case.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-gradient-to-br from-cyan-50 to-sky-50 p-6 rounded-xl border border-cyan-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">Meet Employees Where They Are</h3>
                    <p className="text-slate-600">No special apps or platforms. Deliver nudges directly to the inbox they check every day.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-gradient-to-br from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">Build Consistent Engagement</h3>
                    <p className="text-slate-600">Daily touchpoints create lasting habits and keep your team connected to organizational goals.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">Versatile Communication Channel</h3>
                    <p className="text-slate-600">From learning to performance updates, wellness to culture building - all in one platform.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 rounded-2xl blur-2xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-12 shadow-2xl border border-blue-200">
                <div className="text-center">
                  <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                    <TrendingUp className="w-16 h-16 text-blue-600" />
                  </div>
                  <p className="text-7xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">85%</p>
                  <p className="text-2xl font-bold text-slate-900 mb-2">Engagement Rate</p>
                  <p className="text-slate-600 font-medium">with daily email nudges</p>
                  <div className="mt-8 pt-6 border-t border-blue-200">
                    <p className="text-sm text-slate-600 italic">
                      "Consistent daily touchpoints drive lasting behavior change and organizational alignment"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-cyan-600 to-sky-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Engage Your Team Daily?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join innovative HR and L&D teams who are building stronger, more connected organizations through daily nudges.
          </p>
          <button
            onClick={() => onNavigate('signup')}
            className="px-10 py-5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 hover:shadow-2xl hover:scale-105 transition-all font-bold text-xl inline-flex items-center gap-3"
          >
            Start Your Campaign Today
            <ArrowRight className="w-6 h-6" />
          </button>
          <p className="text-sm text-blue-100 mt-6">
            No credit card required • Free to start • 5-minute setup
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/1_Daily_Logo_SVG.svg" alt="OneDaily AI" className="h-10" />
            </div>
            <p className="text-slate-600 text-sm">AI-powered employee engagement platform for modern organizations</p>
          </div>

          <div className="border-t border-slate-300 pt-6">
            <p className="text-center text-slate-500 text-sm">&copy; 2026 OneDaily AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
