import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import axios from 'axios'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react'

export interface RegisterFormData {
  firstName: string
  lastName: string
  mobileNumber: string
  matricNumber: string
  password: string
  confirmPassword: string
}

export interface APIResponse {
  status: 'success' | 'error'
  message: string
  data?: { user_id: string; username: string; created_at: string }
  errors?: Record<string, string[]>
}

type FormField = keyof RegisterFormData
type FieldErrors = Partial<Record<FormField, string>>

const initialForm: RegisterFormData = {
  firstName: '',
  lastName: '',
  mobileNumber: '',
  matricNumber: '',
  password: '',
  confirmPassword: '',
}

const backendFieldMap: Record<string, FormField> = {
  first_name: 'firstName',
  last_name: 'lastName',
  mobile_number: 'mobileNumber',
  phone_number: 'mobileNumber',
  matric_number: 'matricNumber',
  username: 'matricNumber',
  confirm_password: 'confirmPassword',
  password: 'password',
}

function validateForm(form: RegisterFormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.firstName.trim()) errors.firstName = 'Enter your first name.'
  if (!form.lastName.trim()) errors.lastName = 'Enter your last name.'
  if (!/^\+234[0-9]{10}$/.test(form.mobileNumber)) {
    errors.mobileNumber = 'Use the Nigerian format +2348012345678.'
  }
  if (!/^UG\d{2}\/[A-Z]{2,4}\/\d{4}$/i.test(form.matricNumber.trim())) {
    errors.matricNumber = 'Enter a valid number, e.g. UG19/CS/1042.'
  }
  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    errors.password = 'Use 8+ characters with at least one uppercase letter and one number.'
  }
  if (!form.confirmPassword || form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords must match.'
  }
  return errors
}

function TextField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  inputMode,
  onChange,
  onBlur,
  error,
  icon,
  type = 'text',
  suffix,
  hint,
  maxLength,
}: {
  id: FormField
  label: string
  value: string
  placeholder: string
  autoComplete?: string
  inputMode?: 'text' | 'tel'
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  icon: ReactNode
  type?: string
  suffix?: ReactNode
  hint?: ReactNode
  maxLength?: number
}) {
  const hasError = Boolean(error)
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`h-12 w-full rounded-lg border bg-white pl-10 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 ${hasError ? 'border-rose-400' : 'border-slate-200'}`}
        />
        {suffix}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export default function RegisterForm() {
  const [form, setForm] = useState<RegisterFormData>(initialForm)
  const [touched, setTouched] = useState<Partial<Record<FormField, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registeredUser, setRegisteredUser] = useState('')
  const dialogCloseRef = useRef<HTMLButtonElement>(null)

  const validationErrors = validateForm(form)
  const isValid = Object.keys(validationErrors).length === 0
  const matricIsValid = /^UG\d{2}\/[A-Z]{2,4}\/\d{4}$/i.test(form.matricNumber.trim())
  const passwordChecks = [
    { label: '8+ characters', passed: form.password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(form.password) },
    { label: 'One number', passed: /[0-9]/.test(form.password) },
  ]

  useEffect(() => {
    if (!registeredUser) return
    dialogCloseRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRegisteredUser('')
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [registeredUser])

  function updateField(field: FormField, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
    setNotice('')
  }

  function fieldError(field: FormField) {
    return serverErrors[field] || (touched[field] ? validationErrors[field] : undefined)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({
      firstName: true,
      lastName: true,
      mobileNumber: true,
      matricNumber: true,
      password: true,
      confirmPassword: true,
    })
    setServerErrors({})
    setNotice('')
    if (!isValid) return

    setIsSubmitting(true)
    try {
      const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
      const response = await axios.post<APIResponse>(
        `${baseUrl}/api/v1/auth/register/`,
        {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          mobile_number: form.mobileNumber,
          matric_number: form.matricNumber.trim().toUpperCase(),
          password: form.password,
          confirm_password: form.confirmPassword,
        },
        { headers: { 'Content-Type': 'application/json' } },
      )

      if (response.status === 201 && response.data.status === 'success') {
        setRegisteredUser(response.data.data?.username || form.matricNumber.trim().toUpperCase())
        setForm(initialForm)
        setTouched({})
      } else {
        setNotice(response.data.message || 'Registration could not be completed. Please try again.')
      }
    } catch (error: unknown) {
      if (axios.isAxiosError<APIResponse>(error)) {
        const responseData = error.response?.data
        if (responseData?.errors) {
          const mapped: FieldErrors = {}
          for (const [backendKey, messages] of Object.entries(responseData.errors)) {
            const field = backendFieldMap[backendKey]
            if (field && messages.length) mapped[field] = messages[0]
          }
          setServerErrors(mapped)
        }
        setNotice(responseData?.message || 'We could not reach the registration service. Check your connection and try again.')
      } else {
        setNotice('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="portal-bg min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-8 flex items-center justify-between gap-4 sm:mb-10">
          <a href="#registration" className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400">
            <span className="grid size-10 place-items-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/20">
              <Fingerprint size={23} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold tracking-wide text-white">CROWNBIRD</span>
              <span className="block text-xs text-slate-400">CHDC PORTAL</span>
            </span>
          </a>
          <div className="privacy-pulse flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-semibold tracking-wide text-emerald-100 sm:px-4 sm:text-xs">
            <LockKeyhole size={14} aria-hidden="true" />
            <span>PII ISOLATION ENABLED <span className="mx-1 text-emerald-300/60">•</span> AES-256 ENCRYPTED</span>
          </div>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] lg:gap-14">
          <section className="hidden pt-8 text-white lg:block" aria-labelledby="portal-heading">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
              <ShieldCheck size={16} aria-hidden="true" /> Student case privacy system
            </p>
            <h1 id="portal-heading" className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-tight">
              Your identity stays <span className="text-teal-300">yours.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Create your private student account to access the CHDC mobile application and its confidential support services.
            </p>
            <div className="mt-12 flex max-w-md items-start gap-4 border-t border-white/10 pt-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-teal-300">
                <ShieldCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Private by design</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Your student identity is kept separate from sensitive case records.</p>
              </div>
            </div>
          </section>

          <section id="registration" className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65)] ring-1 ring-white/10" aria-labelledby="form-heading">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                <span className="size-1.5 rounded-full bg-teal-500" /> Student registration
              </div>
              <h2 id="form-heading" className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">Create your account</h2>
              <p className="mt-2 text-sm text-slate-500">Enter your student details to get started.</p>
            </div>

            <form className="space-y-5 px-5 py-6 sm:px-8 sm:py-7" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="firstName" label="First name" value={form.firstName} placeholder="e.g. Ada" autoComplete="given-name" icon={<UserRound size={17} />} onChange={(value) => updateField('firstName', value)} onBlur={() => setTouched((current) => ({ ...current, firstName: true }))} error={fieldError('firstName')} />
                <TextField id="lastName" label="Last name" value={form.lastName} placeholder="e.g. Okafor" autoComplete="family-name" icon={<UserRound size={17} />} onChange={(value) => updateField('lastName', value)} onBlur={() => setTouched((current) => ({ ...current, lastName: true }))} error={fieldError('lastName')} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="mobileNumber" label="Mobile number" value={form.mobileNumber} placeholder="+2348012345678" autoComplete="tel" inputMode="tel" maxLength={14} icon={<Smartphone size={17} />} onChange={(value) => updateField('mobileNumber', value.replace(/\s/g, ''))} onBlur={() => setTouched((current) => ({ ...current, mobileNumber: true }))} error={fieldError('mobileNumber')} hint="Nigerian number with country code" />
                <TextField id="matricNumber" label="Matriculation number" value={form.matricNumber} placeholder="UG19/CS/1042" autoComplete="username" maxLength={14} icon={<Fingerprint size={17} />} suffix={form.matricNumber && matricIsValid ? <CheckCircle2 className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600" size={18} aria-label="Valid matriculation number" /> : undefined} onChange={(value) => updateField('matricNumber', value)} onBlur={() => setTouched((current) => ({ ...current, matricNumber: true }))} error={fieldError('matricNumber')} hint={!fieldError('matricNumber') && form.matricNumber && !matricIsValid ? <span className="text-rose-700">Use the format UG19/CS/1042.</span> : 'Your matric number will be your login username.'} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="password" label="Password" value={form.password} placeholder="Create a password" autoComplete="new-password" type={showPassword ? 'text' : 'password'} icon={<LockKeyhole size={17} />} suffix={<button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} onChange={(value) => updateField('password', value)} onBlur={() => setTouched((current) => ({ ...current, password: true }))} error={fieldError('password')} hint={form.password ? <span className="flex flex-wrap gap-x-3 gap-y-1">{passwordChecks.map((check) => <span key={check.label} className={check.passed ? 'text-emerald-700' : 'text-slate-500'}>{check.passed ? <Check size={12} className="mr-0.5 inline" /> : null}{check.label}</span>)}</span> : '8+ characters, one uppercase letter and one number'} />
                <TextField id="confirmPassword" label="Confirm password" value={form.confirmPassword} placeholder="Re-enter password" autoComplete="new-password" type={showConfirmPassword ? 'text' : 'password'} icon={<LockKeyhole size={17} />} suffix={<button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} onChange={(value) => updateField('confirmPassword', value)} onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))} error={fieldError('confirmPassword')} hint={form.confirmPassword && form.password === form.confirmPassword ? <span className="text-emerald-700">Passwords match.</span> : undefined} />
              </div>

              {notice && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800" role="alert">{notice}</p>}

              <div className="rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3.5">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-teal-700" size={19} aria-hidden="true" />
                  <p className="text-xs leading-5 text-slate-700"><span className="font-bold text-slate-900">Privacy guarantee:</span> Your identity is isolated from case logs and anonymized as aliases (e.g., Pink Flame) on mobile.</p>
                </div>
              </div>

              <button type="submit" disabled={!isValid || isSubmitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">
                {isSubmitting ? <><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> Creating your account...</> : <>Create account <ArrowRight size={17} aria-hidden="true" /></>}
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-400">Your details are encrypted in transit and used only to create your student account.</p>
            </form>
          </section>
        </div>

        <footer className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-[11px] text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Crownbird CHDC</span>
          <span className="flex items-center gap-1.5"><LockKeyhole size={12} aria-hidden="true" /> Secure student registration</span>
        </footer>
      </div>

      {registeredUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRegisteredUser('') }}>
          <section role="dialog" aria-modal="true" aria-labelledby="success-heading" aria-describedby="success-description" className="success-dialog w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between">
              <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={25} aria-hidden="true" /></span>
              <button ref={dialogCloseRef} type="button" onClick={() => setRegisteredUser('')} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-600" aria-label="Close registration confirmation"><X size={19} /></button>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Registration complete</p>
            <h2 id="success-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-950">You’re all set.</h2>
            <p id="success-description" className="mt-2 text-sm leading-6 text-slate-600">Your CHDC student account has been created. Use this username when you sign in:</p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Username</span>
              <span className="mt-1 block font-mono text-base font-semibold text-slate-900">{registeredUser}</span>
            </div>
            <div className="mt-5 flex gap-3 rounded-lg bg-teal-50 px-4 py-3.5">
              <Smartphone size={18} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-700">Download the <span className="font-semibold">CHDC mobile application</span> from your app store. Open it and log in with your matriculation number and the password you just created.</p>
            </div>
            <button type="button" onClick={() => setRegisteredUser('')} className="mt-6 h-11 w-full rounded-lg bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">Done</button>
          </section>
        </div>
      )}
    </main>
  )
}