interface Assignment {
  type: string;
  title: string;
  description: string;
}

interface Lesson {
  title: string;
  content: string;
  learning_objectives: string[];
  assignments: Assignment[];
}

export function generateOnboardingEmail(
  recipientName: string,
  courseTitle: string,
  courseDescription: string,
  onboardingContent: string,
  totalDays: number,
  startDate: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; margin-bottom: 20px; }
    .header h1 { color: #1e40af; margin: 0 0 6px 0; font-size: 32px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 15px; margin: 0; }
    .welcome-badge { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 20px; border-radius: 10px; text-align: center; margin: 16px 0; }
    .welcome-badge h2 { margin: 0; font-size: 22px; }
    .greeting { font-size: 16px; color: #374151; margin-bottom: 16px; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .info-box { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 16px; border-radius: 8px; margin: 16px 0; }
    .info-box h3 { color: #1e40af; margin: 0 0 10px 0; font-size: 17px; }
    .info-box p { margin: 6px 0; color: #1e40af; font-size: 14px; }
    .highlight-box { background: #fef3c7; border: 2px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .highlight-box p { margin: 0; color: #92400e; font-size: 14px; line-height: 1.6; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 15px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 Welcome!</h1>
      <p class="subtitle">Your OneDaily Learning Journey Begins</p>
    </div>

    <p class="greeting">Hello ${recipientName || 'Learner'},</p>

    <div class="welcome-badge">
      <h2>${courseTitle}</h2>
    </div>

    <p style="color: #374151; font-size: 16px; margin-bottom: 25px;">${courseDescription}</p>

    <div class="content-section">
      ${onboardingContent.split('\n\n').map(para => `<p>${para}</p>`).join('')}
    </div>

    <div class="info-box">
      <h3>📅 Your Learning Schedule</h3>
      <p><strong>Duration:</strong> ${totalDays} days of daily emails</p>
      <p><strong>Start Date:</strong> ${new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Delivery:</strong> One email every day at the same time</p>
    </div>

    <div class="highlight-box">
      <p><strong>💡 How It Works:</strong> Each day, you'll receive a focused email with practical insights, actionable advice, and brief exercises. This isn't about lengthy articles—it's about daily practice and building habits. Take 10-15 minutes each day to read, reflect, and apply what you learn.</p>
    </div>

    <div class="footer">
      <p class="encouragement">Your first lesson arrives tomorrow! 🚀</p>
      <p>Get ready to transform your skills one day at a time.</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateLessonEmail(
  recipientName: string,
  moduleTitle: string,
  lessonTitle: string,
  dayNumber: number,
  lesson: Lesson
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; margin-bottom: 16px; }
    .brand { color: #1e40af; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
    .header h1 { color: #1e40af; margin: 0 0 4px 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .day-badge { display: inline-block; background: #1e40af; color: white; padding: 5px 14px; border-radius: 16px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
    .module-badge { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .lesson-title { color: #1e40af; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .practice-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 8px; margin: 16px 0; border: 2px solid #fbbf24; }
    .practice-box h3 { color: #92400e; margin: 0 0 10px 0; font-size: 16px; }
    .practice-box p { margin: 6px 0; color: #78350f; line-height: 1.6; }
    .action-item { background: #eff6ff; padding: 12px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #3b82f6; }
    .action-item h4 { color: #1e40af; margin: 0 0 6px 0; font-size: 15px; }
    .action-item p { color: #475569; margin: 0; font-size: 13px; line-height: 1.6; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 14px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <h1>📚 Day ${dayNumber}</h1>
      <p class="subtitle">${moduleTitle}</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div style="margin: 16px 0;">
      <h2 class="lesson-title">${lessonTitle}</h2>
    </div>

    <div class="content-section">
      ${lesson.content.split('\n\n').map(para => `<p>${para}</p>`).join('')}
    </div>

    ${lesson.learning_objectives && lesson.learning_objectives.length > 0 ? `
      <div class="practice-box">
        <h3>🎯 Today's Focus</h3>
        ${lesson.learning_objectives.map(obj => `<p>• ${obj}</p>`).join('')}
      </div>
    ` : ''}

    ${lesson.assignments && lesson.assignments.length > 0 ? `
      <div style="margin: 16px 0;">
        <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">📝 Put It Into Practice</h3>
        ${lesson.assignments.map(assignment => `
          <div class="action-item">
            <h4>${assignment.title}</h4>
            ${assignment.description ? `<p>${assignment.description}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="footer">
      <p class="encouragement">See you tomorrow! 🌟</p>
      <p>You're building momentum one day at a time.</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateModuleTransitionEmail(
  recipientName: string,
  completedModuleTitle: string,
  completedModuleSummary: string,
  nextModuleTitle: string,
  nextModuleIntroduction: string,
  dayNumber: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #3b82f6; margin-bottom: 16px; }
    .brand { color: #1e40af; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
    .header h1 { color: #1e40af; margin: 0 0 4px 0; font-size: 28px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .celebration-badge { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 16px; border-radius: 10px; text-align: center; margin: 16px 0; }
    .celebration-badge h2 { margin: 0 0 6px 0; font-size: 20px; }
    .celebration-badge p { margin: 0; font-size: 13px; opacity: 0.9; }
    .summary-section { background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .summary-section h3 { color: #1e40af; margin: 0 0 12px 0; font-size: 17px; }
    .summary-section p { margin: 0 0 12px 0; line-height: 1.6; color: #1e40af; }
    .summary-section p:last-child { margin-bottom: 0; }
    .preview-section { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .preview-section h3 { color: #1e40af; margin: 0 0 12px 0; font-size: 17px; }
    .preview-section p { margin: 0 0 12px 0; line-height: 1.6; color: #1e40af; }
    .preview-section p:last-child { margin-bottom: 0; }
    .divider { height: 2px; background: linear-gradient(to right, #60a5fa, #3b82f6); margin: 20px 0; border-radius: 2px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #3b82f6; font-weight: 600; font-size: 14px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <h1>🎉 Module Complete!</h1>
      <p class="subtitle">Day ${dayNumber} - Time to Reflect & Move Forward</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div class="celebration-badge">
      <h2>✓ ${completedModuleTitle}</h2>
      <p>Module Completed Successfully</p>
    </div>

    <div class="summary-section">
      <h3>📚 What You've Accomplished</h3>
      ${completedModuleSummary.split('\n\n').map(para => `<p>${para}</p>`).join('')}
    </div>

    <div class="divider"></div>

    <div class="preview-section">
      <h3>🚀 What's Next: ${nextModuleTitle}</h3>
      ${nextModuleIntroduction.split('\n\n').map(para => `<p>${para}</p>`).join('')}
    </div>

    <div style="background: #fef3c7; border: 2px solid #fbbf24; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;"><strong>💡 Take a Moment:</strong> Before diving into the next module, reflect on how you'll apply what you've learned. Real growth comes from practice, not just knowledge.</p>
    </div>

    <div class="footer">
      <p class="encouragement">Ready for the next chapter! 🌟</p>
      <p>Your next lesson arrives tomorrow.</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function generateCompletionEmail(
  recipientName: string,
  courseTitle: string,
  conclusionContent: string,
  totalDays: number
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 650px; margin: 0 auto; padding: 16px; background: #f9fafb; }
    .container { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f59e0b; margin-bottom: 16px; }
    .brand { color: #d97706; margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
    .header h1 { color: #d97706; margin: 0 0 4px 0; font-size: 30px; font-weight: 700; }
    .header .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .celebration-section { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 16px 0; border: 2px solid #f59e0b; }
    .celebration-section h2 { margin: 0 0 8px 0; font-size: 24px; color: #92400e; }
    .celebration-section p { margin: 0; font-size: 14px; color: #78350f; }
    .content-section { background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b; }
    .content-section p { margin: 0 0 12px 0; line-height: 1.6; color: #374151; }
    .content-section p:last-child { margin-bottom: 0; }
    .stats-box { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center; }
    .stats-box p { color: #1e40af; margin: 6px 0; font-size: 15px; }
    .stats-box .big-number { font-size: 42px; font-weight: 700; color: #1e40af; margin: 12px 0; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e5e7eb; text-align: center; }
    .footer p { color: #6b7280; font-size: 13px; margin: 6px 0; }
    .footer .encouragement { color: #d97706; font-weight: 600; font-size: 16px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p class="brand">OneDaily</p>
      <h1>🏆 Congratulations!</h1>
      <p class="subtitle">You've Completed Your Learning Journey</p>
    </div>

    <p style="color: #374151; font-size: 15px; margin-bottom: 12px;">Hello ${recipientName || 'Learner'},</p>

    <div class="celebration-section">
      <h2>${courseTitle}</h2>
      <p>Campaign Completed</p>
    </div>

    <div class="stats-box">
      <p>You showed up every day for</p>
      <div class="big-number">${totalDays}</div>
      <p>consecutive days</p>
    </div>

    <div class="content-section">
      ${conclusionContent.split('\n\n').map(para => `<p>${para}</p>`).join('')}
    </div>

    <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;"><strong>Remember:</strong> The real measure of success isn't completing this campaign—it's what you do with what you've learned. Keep practicing, keep growing, keep showing up.</p>
    </div>

    <div class="footer">
      <p class="encouragement">You did it! 🎉</p>
      <p>Your dedication to daily practice has created lasting change.</p>
      <p style="margin-top: 20px;">Powered by <strong>OneDaily</strong></p>
      <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
  `;
}
