import { useNavigate } from 'react-router-dom'
import { useSendWithActions } from '../../hooks/useSendWithActions'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'

export function QuickActions() {
  const { dict, locale } = useLocale()
  const { beginVoiceCall, openPanel, sendMessage } = useLayla()
  const sendWithActions = useSendWithActions()
  const navigate = useNavigate()
  const { setOpenedByLayla } = useNav()

  const actions = [
    {
      label: dict.quick[0],
      run: () => {
        openPanel()
        void beginVoiceCall()
      },
    },
    {
      label: dict.quick[1],
      run: () => {
        setOpenedByLayla(true, dict.opened)
        navigate('/skin-scan')
        void sendMessage(
          locale === 'ar'
            ? 'أريد فحص البشرة من صورة سيلفي'
            : 'I want to check my skin from a selfie / skin scan',
        )
      },
    },
    {
      label: dict.quick[2],
      run: () => void sendWithActions('Build me a morning and night routine'),
    },
    {
      label: dict.quick[3],
      run: () => {
        openPanel()
        navigate('/c/deals')
      },
    },
    {
      label: dict.quick[4],
      run: () => void sendWithActions('Show cart'),
    },
  ]

  return (
    <div className="flex gap-1 overflow-x-auto border-t border-[var(--line)] bg-[#eef4f9] px-3 pb-0 pt-1.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {actions.map(({ label, run }) => (
        <button
          key={label[1]}
          type="button"
          onClick={run}
          className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[#e3eaf1] bg-white/90 px-1.5 py-1 text-[10px] font-semibold text-[var(--blue)] sm:text-[10.5px]"
        >
          <span aria-hidden className="text-[11px]">
            {label[0]}
          </span>
          <span>{label[1]}</span>
        </button>
      ))}
    </div>
  )
}