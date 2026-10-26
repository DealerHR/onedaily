import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { CourseCreationChoice } from './pages/CourseCreationChoice';
import { GenerateCourse } from './pages/GenerateCourse';
import { GenerateCourseContent } from './pages/GenerateCourseContent';
import { ManualCourseCreate } from './pages/ManualCourseCreate';
import { CourseDetails } from './pages/CourseDetails';
import { CourseEditor } from './pages/CourseEditor';
import { Admin } from './pages/Admin';
import { Layout } from './components/Layout';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const renderAuthPage = () => {
      switch (currentPage) {
        case 'signin':
          return <SignIn onToggleMode={() => setCurrentPage('signup')} />;
        case 'signup':
          return <SignUp onToggleMode={() => setCurrentPage('signin')} />;
        default:
          return <Landing onNavigate={setCurrentPage} />;
      }
    };
    return renderAuthPage();
  }

  const renderPage = () => {
    if (currentPage.startsWith('course-details:')) {
      const courseId = currentPage.split(':')[1];
      return <CourseDetails courseId={courseId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('course-editor:')) {
      const courseId = currentPage.split(':')[1];
      return <CourseEditor courseId={courseId} onNavigate={setCurrentPage} />;
    }

    if (currentPage.startsWith('generate-content:')) {
      const courseId = currentPage.split(':')[1];
      return <GenerateCourseContent courseId={courseId} onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'course-creation-choice':
        return <CourseCreationChoice onNavigate={setCurrentPage} />;
      case 'generate-course':
        return <GenerateCourse onNavigate={setCurrentPage} />;
      case 'manual-course-create':
        return <ManualCourseCreate onNavigate={setCurrentPage} />;
      case 'admin':
        return <Admin />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
