import { useMemo, useState } from 'react'
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react'
import { FormCard, PageHeader } from '@/components/ui/PageCard'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { billingSettings } from '@/data/mock'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------ local helpers */

type ConnectionStatus = 'connected' | 'error' | 'checking'

const connectionLabel: Record<ConnectionStatus, string> = {
  connected: 'Подключено',
  error: 'Ошибка',
  checking: 'Проверка',
}

const connectionDot: Record<ConnectionStatus, string> = {
  connected: 'bg-Smart-green',
  error: 'bg-red-500',
  checking: 'bg-amber-400',
}

const connectionText: Record<ConnectionStatus, string> = {
  connected: 'text-emerald-600',
  error: 'text-red-600',
  checking: 'text-amber-600',
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap',
        connectionText[status],
      )}
    >
      <span
        className={cn(
          'size-2.5 rounded-full',
          connectionDot[status],
          status === 'checking' && 'animate-pulse',
        )}
      />
      {connectionLabel[status]}
    </span>
  )
}

/** Labelled textarea matching the Input outline geometry. */
function Textarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      <span className="text-sm font-medium leading-5 text-slate-700">{label}</span>
      <div className="flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 resize-none bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
        />
      </div>
    </div>
  )
}

type TemplateKey = 'lowBalance' | 'expiringSubscription' | 'failedPayment'

const TEMPLATE_META: Array<{ key: TemplateKey; label: string; hint: string }> = [
  {
    key: 'lowBalance',
    label: 'Низкий баланс',
    hint: 'Доступные переменные: {company}, {balance}, {docs_left}',
  },
  {
    key: 'expiringSubscription',
    label: 'Истекающая подписка',
    hint: 'Доступные переменные: {company}, {plan}, {days_left}, {period_end}',
  },
  {
    key: 'failedPayment',
    label: 'Неуспешный платёж',
    hint: 'Доступные переменные: {company}, {amount}, {method}',
  },
]

/** Substitutes template variables with sample values for the preview. */
const PREVIEW_VALUES: Record<string, string> = {
  '{company}': 'ООО «Тошкент Савдо»',
  '{balance}': '145 000,00 сум',
  '{docs_left}': '3',
  '{plan}': 'Бизнес',
  '{days_left}': '5',
  '{period_end}': '31.07.2026',
  '{amount}': '450 000,00 сум',
  '{method}': 'Карта',
}

function renderPreview(template: string): string {
  return Object.entries(PREVIEW_VALUES).reduce(
    (text, [token, value]) => text.split(token).join(value),
    template,
  )
}

const CURRENCY_OPTIONS = [
  { value: 'UZS', label: 'UZS — сум' },
  { value: 'USD', label: 'USD — доллар США' },
]

const ROUNDING_OPTIONS = [
  { value: 'integer', label: 'До целого сума' },
  { value: 'hundred', label: 'До 100 сум' },
  { value: 'thousand', label: 'До 1 000 сум' },
]

const PERIOD_START_OPTIONS = [
  { value: 'signup', label: 'От даты активации подписки' },
  { value: 'month_start', label: 'С 1-го числа календарного месяца' },
]

const ALLOWANCE_RESET_OPTIONS = [
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'never', label: 'Не сбрасывается' },
]

const RETENTION_OPTIONS = [
  { value: '12', label: '12 месяцев' },
  { value: '36', label: '36 месяцев' },
  { value: '60', label: '60 месяцев' },
]

const INTEGRATION_META = [
  { key: 'gnk', label: 'ГНК / Налоговый комитет' },
  { key: 'eimzo', label: 'E-Imzo' },
  { key: 'payments', label: 'Платёжный провайдер' },
] as const

type IntegrationKey = (typeof INTEGRATION_META)[number]['key']

type SettingsState = {
  currency: string
  rounding: string
  freeAllowance: string
  allowanceReset: string
  periodStart: string
  autoRenew: boolean
  carryOverQuota: boolean
  templates: Record<TemplateKey, string>
  endpoints: Record<IntegrationKey, string>
  auditRetention: string
  documentRetention: string
  maintenance: boolean
}

const initialSettings: SettingsState = {
  currency: billingSettings.currency,
  rounding: 'integer',
  freeAllowance: String(billingSettings.freeMonthlyAllowance),
  allowanceReset: 'monthly',
  periodStart: 'signup',
  autoRenew: true,
  carryOverQuota: false,
  templates: {
    lowBalance:
      'Здравствуйте! На балансе {company} осталось {balance}. Этого хватит примерно на {docs_left} документов. Пополните баланс, чтобы отправка не остановилась.',
    expiringSubscription:
      'Подписка «{plan}» компании {company} истекает через {days_left} дн. ({period_end}). Продлите подписку, чтобы сохранить квоту и цену за документ.',
    failedPayment:
      'Платёж на сумму {amount} для {company} не прошёл ({method}). Проверьте реквизиты и повторите оплату — документы не отправляются при нулевом балансе.',
  },
  endpoints: {
    gnk: 'https://api.soliq.uz/v1/edoc',
    eimzo: 'https://eimzo.smartup24.uz/api/sign',
    payments: 'https://api.payme.uz/merchant',
  },
  auditRetention: '36',
  documentRetention: '60',
  maintenance: false,
}

const INTEGRATION_STATUS: Record<IntegrationKey, ConnectionStatus> = {
  gnk: 'connected',
  eimzo: 'connected',
  payments: 'error',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(initialSettings)
  const [previewKey, setPreviewKey] = useState<TemplateKey | null>('lowBalance')
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(initialSettings),
    [settings],
  )

  function patch(next: Partial<SettingsState>) {
    setSettings((prev) => ({ ...prev, ...next }))
    setSaved(false)
  }

  function setTemplate(key: TemplateKey, value: string) {
    setSettings((prev) => ({ ...prev, templates: { ...prev.templates, [key]: value } }))
    setSaved(false)
  }

  function setEndpoint(key: IntegrationKey, value: string) {
    setSettings((prev) => ({ ...prev, endpoints: { ...prev.endpoints, [key]: value } }))
    setSaved(false)
  }

  function requestMaintenanceChange() {
    if (settings.maintenance) {
      // Turning maintenance off restores service — no confirmation needed.
      patch({ maintenance: false })
      return
    }
    setMaintenanceOpen(true)
  }

  function confirmMaintenance(reason: string) {
    // In a real build the reason travels with the request to the audit log.
    void reason
    patch({ maintenance: true })
    setMaintenanceOpen(false)
  }

  const freeAllowanceNumber = Number(settings.freeAllowance) || 0

  return (
    <div className="flex flex-col gap-4 pb-24">
      <PageHeader
        title="Настройки платформы"
        subtitle="Общие правила биллинга, уведомлений, интеграций и хранения данных"
      />

      {/* ------------------------------------------------- currency & rounding */}
      <FormCard title="Валюта и округление">
        <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Select
            label="Валюта платформы"
            options={CURRENCY_OPTIONS}
            value={settings.currency}
            onChange={(v) => patch({ currency: v })}
          />
          <Select
            label="Правило округления"
            options={ROUNDING_OPTIONS}
            value={settings.rounding}
            onChange={(v) => patch({ rounding: v })}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Округление применяется к итоговой стоимости списания за документ и к суммам в
          счетах. Тарифы в справочнике хранятся без округления.
        </p>
      </FormCard>

      {/* ------------------------------------------------------ free allowance */}
      <FormCard title="Бесплатный лимит по умолчанию">
        <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Input
            label="Документов в месяц"
            type="number"
            min={0}
            value={settings.freeAllowance}
            onChange={(e) => patch({ freeAllowance: e.target.value })}
            hint={`Текущее значение: ${formatNumber(freeAllowanceNumber)} документов`}
          />
          <Select
            label="Сброс лимита"
            options={ALLOWANCE_RESET_OPTIONS}
            value={settings.allowanceReset}
            onChange={(v) => patch({ allowanceReset: v })}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Лимит применяется ко всем новым компаниям. Тарифицируются только{' '}
          {billingSettings.billableRule.toLowerCase()}.
        </p>
      </FormCard>

      {/* --------------------------------------------------- billing period */}
      <FormCard title="Правила биллингового периода">
        <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Select
            label="Начало периода"
            options={PERIOD_START_OPTIONS}
            value={settings.periodStart}
            onChange={(v) => patch({ periodStart: v })}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <Checkbox
            checked={settings.autoRenew}
            onChange={(v) => patch({ autoRenew: v })}
          >
            <span className="text-sm text-slate-700">
              Автопродление подписок по умолчанию
            </span>
          </Checkbox>
          <Checkbox
            checked={settings.carryOverQuota}
            onChange={(v) => patch({ carryOverQuota: v })}
          >
            <span className="text-sm text-slate-700">
              Переносить неиспользованную квоту на следующий период
            </span>
          </Checkbox>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gray-400" />
          <span className="text-sm text-gray-500">
            Пропорциональный перерасчёт (pro-rata) не применяется: при смене тарифа внутри
            периода новый тариф оплачивается полностью, а остаток старого не возвращается.
          </span>
        </div>
      </FormCard>

      {/* ------------------------------------------------ notification templates */}
      <FormCard title="Шаблоны уведомлений">
        <div className="flex flex-col gap-6">
          {TEMPLATE_META.map((t) => (
            <div key={t.key} className="flex flex-col gap-2">
              <Textarea
                label={t.label}
                value={settings.templates[t.key]}
                onChange={(v) => setTemplate(t.key, v)}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">{t.hint}</span>
                <button
                  type="button"
                  onClick={() => setPreviewKey(previewKey === t.key ? null : t.key)}
                  className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-Smart-blue hover:underline"
                >
                  <Eye className="size-4" />
                  {previewKey === t.key ? 'Скрыть предпросмотр' : 'Предпросмотр'}
                </button>
              </div>
              {previewKey === t.key && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                  <span className="text-xs text-gray-500">Предпросмотр</span>
                  <p className="mt-1 text-sm text-slate-800">
                    {renderPreview(settings.templates[t.key])}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </FormCard>

      {/* --------------------------------------------------------- integrations */}
      <FormCard title="Интеграции">
        <div className="flex flex-col gap-5">
          {INTEGRATION_META.map((integration) => (
            <div key={integration.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium leading-5 text-slate-700">
                  {integration.label}
                </span>
                <StatusIndicator status={INTEGRATION_STATUS[integration.key]} />
              </div>
              <div className="flex items-end gap-3">
                <Input
                  value={settings.endpoints[integration.key]}
                  onChange={(e) => setEndpoint(integration.key, e.target.value)}
                  placeholder="https://"
                />
                <Button
                  hierarchy="secondary-gray"
                  size="md"
                  leadingIcon={<RefreshCw className="size-4" />}
                  className="shrink-0"
                >
                  Проверить
                </Button>
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      {/* -------------------------------------------------------- data retention */}
      <FormCard title="Хранение данных">
        <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Select
            label="Журнал аудита"
            options={RETENTION_OPTIONS}
            value={settings.auditRetention}
            onChange={(v) => patch({ auditRetention: v })}
          />
          <Select
            label="Документы и вложения"
            options={RETENTION_OPTIONS}
            value={settings.documentRetention}
            onChange={(v) => patch({ documentRetention: v })}
          />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Минимальный срок хранения журнала аудита — 12 месяцев, уменьшить его нельзя.
        </p>
      </FormCard>

      {/* --------------------------------------------------------- maintenance */}
      <FormCard title="Режим обслуживания">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium leading-5 text-slate-700">
              {settings.maintenance ? 'Платформа недоступна для клиентов' : 'Платформа работает'}
            </span>
            <span className="text-sm text-gray-500">
              При включении все компании увидят страницу обслуживания, отправка документов
              будет остановлена.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.maintenance}
            onClick={requestMaintenanceChange}
            className={cn(
              'flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition',
              settings.maintenance ? 'bg-red-500' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'size-5 rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)] transition',
                settings.maintenance && 'translate-x-5',
              )}
            />
          </button>
        </div>
        {settings.maintenance && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
            <span className="text-sm text-red-600">
              Режим обслуживания активен. Клиенты не могут войти в систему и отправлять
              документы.
            </span>
          </div>
        )}
      </FormCard>

      {/* ---------------------------------------------------------- action bar */}
      <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-[0px_-4px_12px_0px_rgba(0,0,0,0.06)]">
        {saved && (
          <span className="mr-auto text-sm font-medium text-emerald-600">
            Настройки сохранены
          </span>
        )}
        {!saved && dirty && (
          <span className="mr-auto text-sm text-gray-500">Есть несохранённые изменения</span>
        )}
        <Button
          hierarchy="secondary-gray"
          disabled={!dirty}
          onClick={() => {
            setSettings(initialSettings)
            setSaved(false)
          }}
        >
          Отменить
        </Button>
        <Button
          disabled={!dirty}
          onClick={() => setSaved(true)}
        >
          Сохранить
        </Button>
      </div>

      <ConfirmDialog
        open={maintenanceOpen}
        onClose={() => setMaintenanceOpen(false)}
        onConfirm={confirmMaintenance}
        title="Включить режим обслуживания"
        confirmLabel="Включить"
        destructive
        description="Платформа станет недоступна всем компаниям: вход, отправка и подписание документов будут остановлены до отключения режима."
      />
    </div>
  )
}
