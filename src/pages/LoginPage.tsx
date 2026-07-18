import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck, Info } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

export default function LoginPage() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)

  const codeInvalid = touched && code.length > 0 && code.length !== 6
  const canSubmit = login.trim().length > 0 && password.length > 0 && code.length === 6

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#28374A] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-center gap-2">
          <LogoMark size={40} />
          <span className="text-2xl font-semibold tracking-tight text-slate-900">
            smartup
          </span>
        </div>

        <h1 className="mt-6 text-center text-lg font-semibold text-slate-800">
          Вход в панель оператора
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Доступ только для сотрудников платформы Smartup24 Doc
        </p>

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input
            label="Email / Логин"
            type="text"
            autoComplete="username"
            placeholder="operator@smartup24.uz"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            leadingIcon={<Mail className="size-5 shrink-0 text-gray-400" />}
          />

          <Input
            label="Пароль"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leadingIcon={<Lock className="size-5 shrink-0 text-gray-400" />}
          />

          <Input
            label="Код двухфакторной аутентификации"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 цифр из приложения"
            value={code}
            destructive={codeInvalid}
            hint={
              codeInvalid
                ? 'Код должен состоять из 6 цифр'
                : 'Введите текущий код TOTP из приложения-аутентификатора'
            }
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            leadingIcon={<ShieldCheck className="size-5 shrink-0 text-gray-400" />}
            className={cn('tracking-[0.3em]', code.length === 0 && 'tracking-normal')}
          />

          <Button type="submit" size="lg" fullWidth disabled={!canSubmit}>
            Войти
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="text-sm leading-5 text-slate-700">
            Количество попыток входа ограничено. Все неуспешные попытки, включая IP-адрес
            и время, записываются в журнал аудита.
          </p>
        </div>
      </div>
    </div>
  )
}
