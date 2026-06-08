import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { SectionHeading } from '../components/SectionHeading';
import { customerApi, toApiMessage } from '../lib/api';
import { useCustomerAuth } from '../lib/auth';

const registrationSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  username: z.string().min(4, 'Username must be at least 4 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegistrationValues = z.infer<typeof registrationSchema>;

export function RegisterPage() {
  const { signIn, ready } = useCustomerAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await customerApi.register(values);
      setSuccessEmail(values.email);
      setSubmitError(null);
    } catch (error) {
      setSubmitError(toApiMessage(error, 'Unable to create your account right now'));
      setSuccessEmail(null);
    }
  });

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 md:px-6">
      <SectionHeading
        eyebrow="Customer Account"
        title="Create your Oflio account"
        description="Register once to keep your order history tied to your customer identity instead of looking orders up manually by email."
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-600">
            <div className="text-lg font-semibold text-slate-950">What changes after registration</div>
            <div className="mt-4 grid gap-3">
              {[
                'Your account can sign in to the storefront with the managed identity provider.',
                'New orders created while signed in are attached to your customer identity automatically.',
                'Your account page can load owned order history without exposing other customers\' purchases.',
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-white px-4 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {successEmail ? (
            <div className="market-panel rounded-[34px] px-6 py-6 text-sm leading-7 text-slate-700">
              <div className="text-lg font-semibold text-slate-950">Account created</div>
              <p className="mt-3">Your customer account for <span className="font-semibold text-slate-950">{successEmail}</span> is ready.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8]"
                  onClick={() => void signIn(true, successEmail)}
                >
                  {ready ? 'Sign in now' : 'Preparing sign in...'}
                </button>
                <Link to="/shop" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  Keep shopping
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <div className="market-panel rounded-[34px] px-6 py-6">
          <form className="grid gap-5" onSubmit={onSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                First name
                <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <input className="w-full bg-transparent outline-none" placeholder="Maya" {...register('firstName')} />
                </span>
                {errors.firstName ? <span className="text-sm text-rose-700">{errors.firstName.message}</span> : null}
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Last name
                <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                  <input className="w-full bg-transparent outline-none" placeholder="Patel" {...register('lastName')} />
                </span>
                {errors.lastName ? <span className="text-sm text-rose-700">{errors.lastName.message}</span> : null}
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email address
              <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <input className="w-full bg-transparent outline-none" placeholder="maya@example.com" {...register('email')} />
              </span>
              {errors.email ? <span className="text-sm text-rose-700">{errors.email.message}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Username
              <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <input className="w-full bg-transparent outline-none" placeholder="maya.patel" {...register('username')} />
              </span>
              {errors.username ? <span className="text-sm text-rose-700">{errors.username.message}</span> : null}
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Password
              <span className="field-shell rounded-[22px] bg-white px-4 py-3 shadow-[0_12px_25px_rgba(15,23,42,0.04)]">
                <input type="password" className="w-full bg-transparent outline-none" placeholder="Create a password" {...register('password')} />
              </span>
              {errors.password ? <span className="text-sm text-rose-700">{errors.password.message}</span> : null}
            </label>

            {submitError ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-full bg-[#0f63ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1155d8] disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => void signIn()}
              >
                Already have an account?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
