import { supabase } from './supabase';

export interface DomainPlan {
  domain: string;
  plan_type: 'free' | 'paid';
  course_limit: number;
  enrollment_limit_per_course: number;
}

export interface DomainUsage {
  domain: string;
  total_courses: number;
}

export interface UsageStatus {
  canCreate: boolean;
  coursesUsed: number;
  coursesLimit: number;
  planType: 'free' | 'paid';
}

export interface EnrollmentValidation {
  allowed: boolean;
  reason: string;
}

export async function getUserDomain(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const domain = user.email.split('@')[1];
  return domain;
}

export async function getDomainPlan(domain: string): Promise<DomainPlan | null> {
  const { data, error } = await supabase
    .rpc('get_or_create_domain_plan', { user_domain: domain })
    .single();

  if (error) {
    console.error('Error getting domain plan:', error);
    return null;
  }

  return data;
}

export async function checkCourseCreationLimit(): Promise<UsageStatus> {
  const domain = await getUserDomain();
  if (!domain) {
    return { canCreate: false, coursesUsed: 0, coursesLimit: 0, planType: 'free' };
  }

  const plan = await getDomainPlan(domain);
  if (!plan) {
    return { canCreate: false, coursesUsed: 0, coursesLimit: 0, planType: 'free' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { canCreate: false, coursesUsed: 0, coursesLimit: plan.course_limit, planType: plan.plan_type };
  }

  const { data: canCreateResult } = await supabase.rpc('can_create_course', { user_id: user.id });

  const { data: domainCourseCount } = await supabase.rpc('get_domain_course_count', { user_domain: domain });

  const coursesUsed = domainCourseCount || 0;

  if (plan.plan_type === 'paid') {
    return { canCreate: true, coursesUsed, coursesLimit: -1, planType: 'paid' };
  }

  const canCreate = canCreateResult || false;

  return {
    canCreate,
    coursesUsed,
    coursesLimit: plan.course_limit,
    planType: plan.plan_type
  };
}

export async function checkEnrollmentLimit(
  courseId: string,
  recipientEmail: string
): Promise<EnrollmentValidation> {
  const { data, error } = await supabase
    .rpc('can_add_enrollment', {
      course_id_param: courseId,
      recipient_email_param: recipientEmail
    })
    .single();

  if (error) {
    console.error('Error checking enrollment limit:', error);
    return { allowed: false, reason: 'Failed to validate enrollment' };
  }

  return data;
}

export async function getCourseOwnerPlanType(courseId: string): Promise<'free' | 'paid' | null> {
  const { data: course } = await supabase
    .from('courses')
    .select('user_id')
    .eq('id', courseId)
    .single();

  if (!course) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const domain = user.email.split('@')[1];
  const plan = await getDomainPlan(domain);

  return plan?.plan_type || 'free';
}

export async function getCurrentEnrollmentCount(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) {
    console.error('Error getting enrollment count:', error);
    return 0;
  }

  return data || 0;
}

export function extractDomain(email: string): string {
  return email.split('@')[1] || '';
}

export function doDomainsMatch(email1: string, email2: string): boolean {
  return extractDomain(email1) === extractDomain(email2);
}
