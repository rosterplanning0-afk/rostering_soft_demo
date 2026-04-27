'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types';
import FormField, { Input, Select, Button } from '@/components/FormField';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            full_name: fullName, 
            role 
          } 
        },
      });
      if (signUpError) throw signUpError;
      
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 -left-20 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30 mb-6 group transition-transform hover:-rotate-3">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
             </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight text-center">Join RosterPro</h1>
          <p className="mt-2 text-slate-400">Create your demo account to start planning</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 transition-all hover:shadow-emerald-500/5">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-medium animate-in fade-in zoom-in-95">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full Name">
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </FormField>

            <FormField label="Work Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </FormField>

            <FormField label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
            </FormField>

            <FormField label="Assigned Role">
              <Select 
                value={role} 
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="bg-white/5 border-white/10 text-white"
              >
                <option value="employee" className="bg-slate-900">Employee</option>
                <option value="manager" className="bg-slate-900">Manager</option>
                <option value="roster_planner" className="bg-slate-900">Roster Planner</option>
                <option value="system_admin" className="bg-slate-900">System Admin</option>
              </Select>
            </FormField>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base mt-2 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20">
              {loading ? 'Processing...' : 'Create Demo Account'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link href="/auth/login" className="text-emerald-400 font-semibold hover:underline decoration-2 underline-offset-4 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
