import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')

  const canSubmit = login.trim().length > 0 && password.length > 0

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
            label="Логин"
            type="text"
            autoComplete="username"
            placeholder="operator@smartup24.uz"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            leadingIcon={<User className="size-5 shrink-0 text-gray-400" />}
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

          <Button type="submit" size="lg" fullWidth disabled={!canSubmit}>
            Войти
          </Button>
        </form>
      </div>
    </div>
  )
}
