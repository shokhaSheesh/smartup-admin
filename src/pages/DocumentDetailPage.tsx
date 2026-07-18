import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Eye, ShieldAlert } from 'lucide-react'
import { FormCard, Field, PageCard, PageHeader } from '@/components/ui/PageCard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ChargeTypeBadge, DocStatusBadge } from '@/components/ui/StatusBadge'
import { companies, currentAdmin, documents } from '@/data/mock'
import type { AdminDocument, Company } from '@/types/admin'
import { chargeTypeLabel, docDirectionLabel } from '@/types/labels'
import { formatDate, formatDateTime, formatInn, formatMoney } from '@/lib/format'

type LineItem = {
  name: string
  unit: string
  qty: number
  price: number
  total: number
}

const ITEM_NAMES = [
  'Услуги по договору, этап 1',
  'Услуги по договору, этап 2',
  'Материалы и комплектующие',
  'Транспортно-экспедиционные услуги',
  'Сервисное обслуживание',
]

/** Deterministic pseudo-random from the document id, so the body is stable across renders. */
function seedOf(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Builds a plausible line-item breakdown whose net + НДС (12%) equals the
 * document amount. The split is derived from the document id, not random.
 */
function buildLineItems(doc: AdminDocument): {
  items: LineItem[]
  net: number
  vat: number
} {
  const seed = seedOf(doc.id)
  const count = 2 + (seed % 3)
  const net = Math.round(doc.amount / 1.12)
  const vat = doc.amount - net

  const weights = Array.from({ length: count }, (_, i) => 2 + ((seed >> (i * 3)) % 7))
  const weightSum = weights.reduce((a, b) => a + b, 0)

  let allocated = 0
  const items = weights.map((w, i) => {
    const isLast = i === count - 1
    const total = isLast ? net - allocated : Math.round((net * w) / weightSum)
    allocated += total
    const qty = 1 + ((seed >> (i * 2)) % 9)
    return {
      name: ITEM_NAMES[(seed + i) % ITEM_NAMES.length],
      unit: i % 2 === 0 ? 'шт' : 'усл',
      qty,
      price: Math.round(total / qty),
      total,
    }
  })

  return { items, net, vat }
}

function PartyBlock({
  title,
  inn,
  name,
  company,
}: {
  title: string
  inn: string
  name: string
  company: Company | undefined
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4">
      <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">{title}</span>
      <span className="text-base font-semibold text-slate-800">{name}</span>
      <div className="flex flex-col gap-1 text-sm text-slate-600">
        <span>ИНН: {formatInn(inn)}</span>
        {company && (
          <>
            <span>Адрес: {company.address}</span>
            <span>Директор: {company.directorName}</span>
            <span>Банк: {company.bankName}</span>
            <span>
              Р/с: {company.accountNumber} · МФО: {company.mfo}
            </span>
            <span>Тел.: {company.phone}</span>
          </>
        )}
        {!company && <span className="text-gray-400">Реквизиты контрагента вне платформы</span>}
      </div>
    </div>
  )
}

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const doc = useMemo(() => documents.find((d) => d.id === id), [id])
  const [revealedAt, setRevealedAt] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!doc) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Документ не найден" />
        <PageCard>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-gray-400">
              Документ с идентификатором «{id}» отсутствует в реестре.
            </p>
            <Button hierarchy="secondary-gray" onClick={() => navigate('/documents')}>
              Назад к реестру
            </Button>
          </div>
        </PageCard>
      </div>
    )
  }

  const sender = companies.find((c) => c.inn === doc.senderInn)
  const receiver = companies.find((c) => c.inn === doc.receiverInn)
  const { items, net, vat } = buildLineItems(doc)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`${doc.type} № ${doc.number}`}
        subtitle={`${docDirectionLabel[doc.direction]} · создан ${formatDate(doc.createdAt)}`}
        actions={
          <>
            <Button
              hierarchy="secondary-gray"
              leadingIcon={<ArrowLeft className="size-4" />}
              onClick={() => navigate('/documents')}
            >
              Назад к реестру
            </Button>
            <Button leadingIcon={<Download className="size-4" />} onClick={() => undefined}>
              Скачать PDF
            </Button>
          </>
        }
      />

      <FormCard title="Метаданные">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Номер">{doc.number}</Field>
          <Field label="Тип">{doc.type}</Field>
          <Field label="Направление">{docDirectionLabel[doc.direction]}</Field>
          <Field label="Статус">
            <DocStatusBadge status={doc.status} />
          </Field>
          <Field label="Сумма">{formatMoney(doc.amount)} сум</Field>
          <Field label="Создан">{formatDateTime(doc.createdAt)}</Field>
          <Field label="Отправлен">{formatDateTime(doc.sentAt)}</Field>
          <Field label="Списание">
            <span className="flex flex-col items-start gap-1">
              <ChargeTypeBadge type={doc.chargeType} />
              <span className="text-xs text-gray-500">
                {doc.chargeAmount > 0
                  ? `${formatMoney(doc.chargeAmount)} сум`
                  : doc.chargeType
                    ? `Без списания с баланса (${chargeTypeLabel[doc.chargeType]})`
                    : 'Не тарифицировался'}
              </span>
            </span>
          </Field>
          <Field label="Отправитель">
            <span className="flex flex-col">
              <span>{doc.senderName}</span>
              <span className="text-xs text-gray-500">ИНН {formatInn(doc.senderInn)}</span>
            </span>
          </Field>
          <Field label="Получатель">
            <span className="flex flex-col">
              <span>{doc.receiverName}</span>
              <span className="text-xs text-gray-500">ИНН {formatInn(doc.receiverInn)}</span>
            </span>
          </Field>
        </div>
      </FormCard>

      {revealedAt === null ? (
        <PageCard>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-amber-50">
              <Eye className="size-6 text-amber-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Содержимое документа скрыто</h2>
            <p className="max-w-lg text-sm text-gray-500">
              Доступ к содержимому документа арендатора является чувствительным действием. При
              открытии в журнал аудита будет записано ваше имя, номер документа, время и IP-адрес.
            </p>
            <Button
              leadingIcon={<Eye className="size-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              Показать содержимое
            </Button>
          </div>
        </PageCard>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <p className="text-sm text-amber-700">
              Просмотр записан в журнал аудита — {currentAdmin.fullName},{' '}
              {formatDateTime(revealedAt)}.
            </p>
          </div>

          <PageCard>
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-slate-800">{doc.type}</h2>
                  <span className="text-sm text-gray-500">
                    № {doc.number} от {formatDate(doc.createdAt)}
                  </span>
                </div>
                <DocStatusBadge status={doc.status} />
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
                <PartyBlock
                  title="Поставщик"
                  inn={doc.senderInn}
                  name={doc.senderName}
                  company={sender}
                />
                <PartyBlock
                  title="Покупатель"
                  inn={doc.receiverInn}
                  name={doc.receiverName}
                  company={receiver}
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-900">
                        №
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-900">
                        Наименование
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-900">
                        Ед. изм.
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-900">
                        Кол-во
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-900">
                        Цена
                      </th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-900">
                        Сумма
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.name + i} className="border-b border-gray-200 last:border-b-0">
                        <td className="px-4 py-3 text-gray-900">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-900">{item.unit}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{item.qty}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-900">
                          {formatMoney(item.price)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap text-gray-900">
                          {formatMoney(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto flex w-full max-w-sm flex-col gap-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Сумма без НДС</span>
                  <span className="whitespace-nowrap">{formatMoney(net)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>НДС 12%</span>
                  <span className="whitespace-nowrap">{formatMoney(vat)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold text-slate-800">
                  <span>Итого к оплате</span>
                  <span className="whitespace-nowrap">{formatMoney(doc.amount)} сум</span>
                </div>
              </div>
            </div>
          </PageCard>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setRevealedAt(new Date().toISOString())}
        title="Показать содержимое документа"
        confirmLabel="Показать содержимое"
        description={
          <span>
            Вы собираетесь открыть содержимое документа{' '}
            <b className="font-semibold text-slate-800">
              {doc.type} № {doc.number}
            </b>{' '}
            ({doc.senderName} → {doc.receiverName}). Укажите основание — оно будет сохранено в
            журнале аудита.
          </span>
        }
      />
    </div>
  )
}
