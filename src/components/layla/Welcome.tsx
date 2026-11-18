import { Camera, Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'
import { useNav } from '../../state/NavContext'

export function Welcome() {
  const { dict, locale, setLocale } = useLocale()
  const { beginVoiceCall, openPanel, sendMessage } = useLayla()
  const navigate = useNavigate()
  const { setOpenedByLayla } = useNav()

  return (
    <div className="welcome mx-3 mt-3 rounded-[20px] bg-white px-4 py-5 text-center shadow-[0_6px_24px_rgba(20,56,92,0.08)] sm:mx-4 sm:px-5">
      <div className="relative mx-auto mb-2.5 size-[84px] sm:size-[92px]">
        <span className="absolute inset-[-8px] animate-pulse rounded-full border-2 border-[#cfe2f4] opacity-70" />
        <img
          src="/layla.jpg"
          alt="Layla"
          className="relative size-full rounded-full object-cover object-[50%_30%] shadow-[0_0_0_5px_#eaf2f9]"
        />
      </div>
      <h3 className="text-[17px] font-extrabold text-[var(--navy2)] sm:text-[18px]">{dict.wTitle}</h3>
      <p className="mx-auto mt-1.5 max-w-[280px] text-[12.5px] leading-relaxed text-[#5c6b7a] sm:text-[13.5px]">
        {dict.wDesc}
      </p>

      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.6px] text-[#7b8a99]">
        {dict.wLang}
      </div>
      <div className="mt-1.5 flex flex-row flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
            locale === 'en'
              ? 'border-[var(--blue)] bg-[var(--sky)] text-[var(--blue)]'
              : 'border-[#dbe5ee] bg-[#f7fafc] text-[#5c6b7a]'
          }`}
          onClick={() => setLocale('en')}
        >
          English
        </button>
        <button
          type="button"
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
            locale === 'ar'
              ? 'border-[var(--blue)] bg-[var(--sky)] text-[var(--blue)]'
              : 'border-[#dbe5ee] bg-[#f7fafc] text-[#5c6b7a]'
          }`}
          onClick={() => setLocale('ar')}
        >
          العربية
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="flex flex-row items-center justify-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-bold shadow-[0_6px_14px_rgba(91,79,194,0.22)]"
          style={{
            background: 'linear-gradient(135deg,#2c6ba4,#7b4fc2)',
            color: '#ffffff',
          }}
          onClick={() => void beginVoiceCall()}
        >
          <Mic className="size-3.5 shrink-0" color="#ffffff" strokeWidth={2.4} />
          <span style={{ color: '#ffffff' }}>{dict.wTalk}</span>
        </button>
        <button
          type="button"
          className="flex flex-row items-center justify-center gap-1.5 rounded-[10px] px-2 py-1.5 text-[11px] font-bold shadow-[0_6px_14px_rgba(232,93,154,0.22)]"
          style={{
            background: 'linear-gradient(135deg,#e85d9a,#f39c22)',
            color: '#ffffff',
          }}
          onClick={() => {
            openPanel()
            setOpenedByLayla(true, dict.opened)
            navigate('/skin-scan')
            void sendMessage(
              locale === 'ar'
                ? 'أريد فحص البشرة من صورة سيلفي'
                : 'I want to check my skin from a selfie / skin scan',
            )
          }}
        >
          <Camera className="size-3.5 shrink-0" color="#ffffff" strokeWidth={2.4} />
          <span style={{ color: '#ffffff' }}>{dict.wScan}</span>
        </button>
      </div>
    </div>
  )
}
