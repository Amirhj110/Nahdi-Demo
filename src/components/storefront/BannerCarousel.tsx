import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATALOG } from '../../data/catalog'
import { useLayla } from '../../state/LaylaContext'
import { useLocale } from '../../state/LocaleContext'

export function BannerCarousel() {
  const { dict } = useLocale()
  const { openPanel, beginVoiceCall } = useLayla()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slides = dict.slides
  const artImages = [
    [CATALOG[5]?.imageUrl, CATALOG[0]?.imageUrl, CATALOG[7]?.imageUrl],
    null,
    [CATALOG[4]?.imageUrl, CATALOG[6]?.imageUrl, CATALOG[11]?.imageUrl],
  ] as const

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [slides.length])

  return (
    <section className="hero2 relative h-auto min-h-[250px] overflow-hidden sm:h-[330px] sm:min-h-0">
      {slides.map((slide, i) => {
        const active = i === index
        const arts = artImages[i]
        const isCall = 'call' in slide && slide.call
        return (
          <div
            key={i}
            className={`slide absolute inset-0 grid items-center gap-2 px-[4%] transition-opacity duration-700 sm:grid-cols-[1fr_1.1fr] sm:px-[8%] lg:px-[12%] ${
              active
                ? 'relative z-[1] opacity-100 pointer-events-auto sm:absolute'
                : 'pointer-events-none opacity-0 max-sm:hidden'
            }`}
            style={{ background: slide.bg }}
            aria-hidden={!active}
          >
            <div className="relative z-[1] max-w-xl py-7 sm:py-0">
              <h1
                className="text-[20px] font-bold leading-[1.25] text-[#111] sm:text-[26px] lg:text-[30px]"
                dangerouslySetInnerHTML={{ __html: slide.h }}
              />
              {'sub' in slide && slide.sub && (
                <div className="sub2 mt-1.5 text-[14px] font-medium text-[#222] sm:mt-2 sm:text-[18px] lg:text-[20px]">
                  {slide.sub}
                </div>
              )}
              {'big' in slide && slide.big && (
                <div className="big mt-0.5 text-[58px] font-extrabold leading-[0.95] tracking-[-2px] text-[#111] sm:text-[72px] lg:text-[96px] lg:tracking-[-3px]">
                  {slide.big}
                  <small className="ms-1 text-[24px] font-extrabold tracking-normal sm:text-[32px] lg:text-[38px]">
                    %
                  </small>
                </div>
              )}
              {'p' in slide && slide.p && (
                <p className="mt-2.5 max-w-[420px] text-[12.5px] leading-relaxed text-[#333] sm:mt-2.5 sm:text-[15px]">
                  {slide.p}
                </p>
              )}
              <button
                type="button"
                className="mt-3 rounded-[4px] bg-[var(--blue)] px-5 py-2.5 text-[13px] font-bold text-white sm:mt-[18px] sm:px-11"
                onClick={() => {
                  if (isCall) {
                    openPanel()
                    void beginVoiceCall()
                    return
                  }
                  if ('go' in slide && slide.go) navigate(`/c/${slide.go}`)
                }}
              >
                {slide.b}
              </button>
            </div>

            <div
              className={`art relative mx-auto hidden h-[200px] w-full max-w-[360px] sm:block lg:h-[280px] ${
                active ? '' : ''
              }`}
            >
              {isCall ? (
                <div className="absolute start-[12%] top-3 size-[200px] rounded-full bg-white/50 p-2 shadow-[0_20px_40px_rgba(31,79,125,0.25)] lg:start-[18%] lg:top-5 lg:size-[250px]">
                  <img
                    src="/layla.jpg"
                    alt=""
                    className="size-full rounded-full object-cover object-[50%_30%]"
                  />
                  <span className="absolute bottom-4 end-2 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--blue)] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
                    🎙 {dict.speaking}
                  </span>
                </div>
              ) : (
                (arts || []).filter(Boolean).map((src, j) => (
                  <img
                    key={`${i}-${j}`}
                    src={src}
                    alt=""
                    className="pp absolute object-contain drop-shadow-[0_18px_22px_rgba(18,58,99,0.2)]"
                    style={{
                      width: j === 0 ? '52%' : j === 1 ? '46%' : '40%',
                      insetInlineStart: `${[4, 36, 66][j]}%`,
                      top: `${[18, 8, 28][j]}%`,
                      zIndex: 3 - j,
                      animation: `float ${5.5 + j}s ease-in-out infinite`,
                      animationDelay: `${-j * 2}s`,
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}

      <button
        type="button"
        aria-label="Previous slide"
        className="arrow absolute inset-y-0 start-2 z-[2] my-auto hidden size-9 place-items-center rounded-full bg-white/85 text-[var(--navy)] shadow sm:grid sm:start-3"
        onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        className="arrow absolute inset-y-0 end-2 z-[2] my-auto hidden size-9 place-items-center rounded-full bg-white/85 text-[var(--navy)] shadow sm:grid sm:end-3"
        onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
      >
        <ChevronRight className="size-5" />
      </button>

      <div className="dots absolute bottom-3 start-4 z-[2] flex gap-1.5 sm:bottom-[18px] sm:start-[3%]">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={`h-[7px] rounded-full transition-all ${
              i === index ? 'w-6 bg-[#5b6b7b]' : 'w-[7px] bg-[#c9cfd6]'
            }`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  )
}
