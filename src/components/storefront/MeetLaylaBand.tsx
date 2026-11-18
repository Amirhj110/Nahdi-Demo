import { Mic, PhoneOff, Volume2 } from 'lucide-react'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function MeetLaylaBand() {
  const { dict } = useLocale()
  const { openPanel, beginVoiceCall } = useLayla()

  return (
    <section className="page-wrap mt-10">
      <div className="band relative grid overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_85%_20%,#2b5f9b,var(--navy)_55%,var(--navy2))] p-6 text-white sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:p-11">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[12.5px] font-bold">
            ✦ IDRAK Voice Agent · IDRAK Chat Agent
          </span>
          <h2 className="mt-4 text-[25px] font-black leading-[1.15] sm:text-[32px] lg:text-[38px] lg:leading-[1.1]">
            {dict.bandH}
          </h2>
          <p className="mt-3 max-w-[520px] text-[14px] leading-relaxed text-[#c7d9ee] sm:text-[16px]">
            {dict.bandP}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dict.caps.map(([icon, color, title, desc]) => (
              <div
                key={title}
                className="flex gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-3.5"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] text-[17px]"
                  style={{ background: color }}
                  aria-hidden
                >
                  {icon}
                </span>
                <div>
                  <b className="block text-[14px] font-bold sm:text-[14.5px]">{title}</b>
                  <span className="mt-0.5 block text-[12px] leading-snug text-[#b9cde3] sm:text-[12.5px]">
                    {desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#1fa463] to-[#28c47a] px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(31,164,99,0.35)]"
              onClick={() => {
                openPanel()
                void beginVoiceCall()
              }}
            >
              📞 {dict.callNow}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-[13.5px] font-bold text-white backdrop-blur"
              onClick={openPanel}
            >
              💬 {dict.chatNow}
            </button>
          </div>
        </div>

        <div className="phone mx-auto mt-6 hidden w-[280px] justify-self-center rounded-[38px] border border-white/12 bg-[#0a1f38] p-3 shadow-[0_30px_60px_rgba(0,0,0,0.35)] lg:mt-0 lg:block lg:w-[300px]">
          <div className="flex h-[520px] flex-col items-center rounded-[28px] bg-gradient-to-b from-[#16477a] to-[#0d2c4f] px-[18px] py-[30px] text-center lg:h-[560px]">
            <small className="text-[12px] text-[#a9c4e3]">IDRAK Voice Agent · 00:42</small>
            <div className="relative my-6 size-[140px] lg:size-[150px]">
              <span className="absolute inset-[-14px] animate-pulse rounded-full border-2 border-[rgba(110,180,255,0.45)]" />
              <span
                className="absolute inset-[-14px] animate-pulse rounded-full border-2 border-[rgba(110,180,255,0.45)]"
                style={{ animationDelay: '1s' }}
              />
              <img
                src="/layla.jpg"
                alt=""
                className="relative size-full rounded-full border-4 border-white/20 object-cover object-[50%_30%]"
              />
            </div>
            <b className="text-[20px]">{dict.lShort}</b>
            <small className="mt-1 text-[12px] text-[#a9c4e3]">{dict.speaking}</small>
            <div className="mt-3.5 flex h-[26px] items-center gap-[3px]" aria-hidden>
              {Array.from({ length: 16 }).map((_, i) => (
                <i
                  key={i}
                  className="w-1 rounded-sm bg-[#7fc0ff]"
                  style={{
                    height: `${8 + ((i * 7) % 18)}px`,
                    animation: `wv 1s ease-in-out ${i * 0.06}s infinite`,
                  }}
                />
              ))}
            </div>
            <div className="mt-[18px] min-h-[84px] rounded-2xl bg-white/10 p-3 text-[13px] leading-relaxed text-white/95">
              {dict.phoneCap}
            </div>
            <div className="mt-auto flex gap-[18px]">
              <span className="grid size-[52px] place-items-center rounded-full bg-white/14">
                <Mic className="size-5 opacity-80" />
              </span>
              <span className="grid size-[52px] place-items-center rounded-full bg-[var(--red)]">
                <PhoneOff className="size-5" />
              </span>
              <span className="grid size-[52px] place-items-center rounded-full bg-white/14">
                <Volume2 className="size-5 opacity-80" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
