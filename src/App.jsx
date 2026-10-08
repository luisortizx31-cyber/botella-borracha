import { useEffect, useState } from 'react'

const RADIO = 150 // px, distancia del centro a cada participante
const VUELTAS_MINIMAS = 5 // vueltas completas antes de frenar en el elegido
const DURACION_MS = 4000
const CLAVE_GUARDADO = 'botella-borracha:participantes'

// Ángulo (en grados, 0 = arriba, sentido horario) del participante i
// sobre N - el mismo ángulo se usa para dibujarlo en el círculo y para
// calcular hacia dónde tiene que girar la botella, así siempre quedan
// alineados.
function anguloDe(indice, total) {
  return (indice * 360) / total
}

// Los participantes quedan guardados en el teléfono (localStorage) -
// no hay servidor ni cuenta, así que al volver a abrir la app siguen
// ahí tal cual se dejaron la última vez.
function cargarParticipantesGuardados() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO)
    return guardado ? JSON.parse(guardado) : []
  } catch (err) {
    console.error('[App] cargarParticipantesGuardados', err)
    return []
  }
}

export default function App() {
  const [participantes, setParticipantes] = useState(cargarParticipantesGuardados)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [rotacion, setRotacion] = useState(0)
  const [girando, setGirando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(participantes))
    } catch (err) {
      console.error('[App] guardar participantes', err)
    }
  }, [participantes])

  function agregarParticipante(e) {
    e.preventDefault()
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    setParticipantes((prev) => [...prev, nombre])
    setNuevoNombre('')
    setSeleccionado(null)
  }

  function quitarParticipante(indice) {
    setParticipantes((prev) => prev.filter((_, i) => i !== indice))
    setSeleccionado(null)
  }

  function girar() {
    if (girando || participantes.length < 2) return
    const indiceElegido = Math.floor(Math.random() * participantes.length)
    const anguloObjetivo = anguloDe(indiceElegido, participantes.length)

    // Cuánto le falta girar, desde el ángulo actual, para llegar
    // exactamente al objetivo (siempre hacia adelante, nunca hacia atrás).
    const anguloActual = ((rotacion % 360) + 360) % 360
    let delta = anguloObjetivo - anguloActual
    if (delta <= 0) delta += 360

    setSeleccionado(null)
    setGirando(true)
    setRotacion((prev) => prev + VUELTAS_MINIMAS * 360 + delta)

    setTimeout(() => {
      setGirando(false)
      setSeleccionado(indiceElegido)
    }, DURACION_MS)
  }

  const puedeGirar = participantes.length >= 2 && !girando

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 px-4 py-8 text-white">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">🍾 Botella Borracha</h1>
        <p className="mt-1 text-sm text-white/70">Agregá a los participantes y tocá la botella para girar</p>
      </div>

      <form onSubmit={agregarParticipante} className="flex w-full max-w-xs gap-2">
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del participante"
          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus-visible:border-fuchsia-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-95"
        >
          + Agregar
        </button>
      </form>

      {participantes.length > 0 && (
        <ul className="flex w-full max-w-xs flex-wrap justify-center gap-2">
          {participantes.map((nombre, i) => (
            <li
              key={i}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                seleccionado === i
                  ? 'border-amber-300 bg-amber-400/20 text-amber-200'
                  : 'border-white/20 bg-white/5 text-white/80'
              }`}
            >
              {nombre}
              <button
                type="button"
                onClick={() => quitarParticipante(i)}
                className="text-white/40 hover:text-white"
                aria-label={`Quitar a ${nombre}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex h-[360px] w-[360px] max-w-full items-center justify-center">
        {/* Círculo guía */}
        <div className="absolute h-[300px] w-[300px] rounded-full border border-dashed border-white/15" />

        {/* Participantes alrededor del círculo */}
        {participantes.map((nombre, i) => {
          const angulo = anguloDe(i, participantes.length)
          const rad = (angulo * Math.PI) / 180
          const x = RADIO * Math.sin(rad)
          const y = -RADIO * Math.cos(rad)
          const esElegido = seleccionado === i
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-bold shadow-lg transition-all ${
                  esElegido
                    ? 'scale-125 border-amber-300 bg-amber-400 text-amber-950'
                    : 'border-white/30 bg-fuchsia-900/80 text-white'
                }`}
              >
                {nombre.slice(0, 2).toUpperCase()}
              </span>
              <span className={`max-w-[70px] truncate text-center text-[11px] ${esElegido ? 'font-bold text-amber-200' : 'text-white/70'}`}>
                {nombre}
              </span>
            </div>
          )
        })}

        {/* Botella */}
        <button
          type="button"
          onClick={girar}
          disabled={!puedeGirar}
          aria-label="Girar la botella"
          className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full outline-none disabled:cursor-not-allowed"
        >
          <div
            className="relative h-44 w-11"
            style={{
              transform: `rotate(${rotacion}deg)`,
              transition: girando ? `transform ${DURACION_MS}ms cubic-bezier(0.12, 0.67, 0.1, 1)` : 'none',
            }}
          >
            {/* pico */}
            <div className="absolute left-1/2 top-0 h-5 w-3 -translate-x-1/2 rounded-t-full bg-emerald-950" />
            {/* cuello */}
            <div className="absolute left-1/2 top-4 h-14 w-4 -translate-x-1/2 bg-emerald-800" />
            {/* cuerpo */}
            <div className="absolute bottom-0 left-1/2 h-28 w-11 -translate-x-1/2 rounded-2xl bg-gradient-to-b from-emerald-700 to-emerald-900 shadow-xl" />
            {/* etiqueta */}
            <div className="absolute bottom-6 left-1/2 h-10 w-9 -translate-x-1/2 rounded-sm bg-amber-100/90" />
          </div>
        </button>
      </div>

      {participantes.length < 2 && (
        <p className="text-center text-sm text-white/50">Agregá al menos 2 participantes para poder girar.</p>
      )}

      {seleccionado !== null && !girando && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 px-6 py-3 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-300">¡Le tocó a!</p>
          <p className="text-2xl font-extrabold text-amber-200">{participantes[seleccionado]}</p>
        </div>
      )}

      {puedeGirar && (
        <button
          type="button"
          onClick={girar}
          className="rounded-2xl bg-fuchsia-600 px-8 py-3 text-base font-bold text-white shadow-lg transition-transform active:scale-95"
        >
          Girar la botella
        </button>
      )}
    </div>
  )
}
