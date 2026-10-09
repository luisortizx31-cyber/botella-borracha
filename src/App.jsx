import { useEffect, useState } from 'react'

const RADIO = 150 // px, distancia del centro a cada participante
const VUELTAS_MINIMAS = 5 // vueltas completas antes de frenar en el elegido
const DURACION_MS = 4000

const CLAVE_PARTICIPANTES = 'botella-borracha:participantes'
const CLAVE_MODO = 'botella-borracha:modo'
const CLAVE_VERDAD = 'botella-borracha:preguntasVerdad'
const CLAVE_RETO = 'botella-borracha:preguntasReto'

const PREGUNTAS_VERDAD_POR_DEFECTO = [
  '¿Cuál es tu mayor miedo?',
  '¿A quién de aquí invitarías primero a una fiesta?',
  '¿Cuál es la mentira más grande que has dicho?',
  '¿Qué es lo más vergonzoso que te ha pasado?',
  '¿A quién admiras más y por qué?',
  '¿Cuál es tu secreto mejor guardado?',
]

const RETOS_POR_DEFECTO = [
  'Imita a alguien del grupo hasta que adivinen quién es.',
  'Baila sin música durante 30 segundos.',
  'Déjate tomar una foto haciendo una cara graciosa.',
  'Habla con acento robótico durante las próximas 2 rondas.',
  'Cuenta un chiste, si no da risa haces una penitencia.',
  'Deja que el grupo te peine o te maquille por 1 minuto.',
]

// Ángulo (en grados, 0 = arriba, sentido horario) del participante i
// sobre N - el mismo ángulo se usa para dibujarlo en el círculo y para
// calcular hacia dónde tiene que girar la botella, así siempre quedan
// alineados.
function anguloDe(indice, total) {
  return (indice * 360) / total
}

// Todo queda guardado en el teléfono (localStorage) - no hay servidor
// ni cuenta, así que al volver a abrir la app sigue tal cual se dejó.
function cargarListaGuardada(clave, porDefecto) {
  try {
    const guardado = localStorage.getItem(clave)
    return guardado ? JSON.parse(guardado) : porDefecto
  } catch (err) {
    console.error('[App] cargarListaGuardada', clave, err)
    return porDefecto
  }
}

// Cada pregunta/reto guarda si está "en papelera": al tocar la × no se
// borra de una, pasa a la papelera con opción de restaurar, y solo
// desaparece del todo si la borran también desde ahí.
function cargarPreguntasGuardadas(clave, porDefecto) {
  const lista = cargarListaGuardada(clave, porDefecto.map((texto) => ({ texto, papelera: false })))
  return lista.map((item) => (typeof item === 'string' ? { texto: item, papelera: false } : item))
}

function cargarModoGuardado() {
  try {
    const guardado = localStorage.getItem(CLAVE_MODO)
    return guardado === 'verdad' || guardado === 'reto' || guardado === 'ambos' ? guardado : 'ambos'
  } catch (err) {
    console.error('[App] cargarModoGuardado', err)
    return 'ambos'
  }
}

// Si el modo es "ambos" sortea entre verdad y reto (solo entre las
// categorías que sí tengan preguntas activas) y después sortea una
// pregunta dentro de esa categoría. Las que están en papelera no entran.
function elegirPregunta(modo, preguntasVerdad, preguntasReto) {
  const verdadActivas = preguntasVerdad.filter((p) => !p.papelera)
  const retoActivas = preguntasReto.filter((p) => !p.papelera)

  let tipo = modo
  if (modo === 'ambos') {
    const disponibles = []
    if (verdadActivas.length > 0) disponibles.push('verdad')
    if (retoActivas.length > 0) disponibles.push('reto')
    if (disponibles.length === 0) return null
    tipo = disponibles[Math.floor(Math.random() * disponibles.length)]
  }
  const lista = tipo === 'verdad' ? verdadActivas : retoActivas
  if (lista.length === 0) return null
  const item = lista[Math.floor(Math.random() * lista.length)]
  return { tipo, texto: item.texto }
}

const OPCIONES_MODO = [
  { valor: 'verdad', etiqueta: 'Solo Verdad' },
  { valor: 'reto', etiqueta: 'Solo Reto' },
  { valor: 'ambos', etiqueta: 'Ambos' },
]

export default function App() {
  const [participantes, setParticipantes] = useState(() => cargarListaGuardada(CLAVE_PARTICIPANTES, []))
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [rotacion, setRotacion] = useState(0)
  const [girando, setGirando] = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)

  const [modo, setModo] = useState(cargarModoGuardado)
  const [preguntasVerdad, setPreguntasVerdad] = useState(() => cargarPreguntasGuardadas(CLAVE_VERDAD, PREGUNTAS_VERDAD_POR_DEFECTO))
  const [preguntasReto, setPreguntasReto] = useState(() => cargarPreguntasGuardadas(CLAVE_RETO, RETOS_POR_DEFECTO))
  const [preguntaActual, setPreguntaActual] = useState(null)
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [nuevaVerdad, setNuevaVerdad] = useState('')
  const [nuevoReto, setNuevoReto] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PARTICIPANTES, JSON.stringify(participantes))
    } catch (err) {
      console.error('[App] guardar participantes', err)
    }
  }, [participantes])

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_MODO, modo)
    } catch (err) {
      console.error('[App] guardar modo', err)
    }
  }, [modo])

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_VERDAD, JSON.stringify(preguntasVerdad))
    } catch (err) {
      console.error('[App] guardar preguntas de verdad', err)
    }
  }, [preguntasVerdad])

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_RETO, JSON.stringify(preguntasReto))
    } catch (err) {
      console.error('[App] guardar retos', err)
    }
  }, [preguntasReto])

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

  function agregarVerdad(e) {
    e.preventDefault()
    const texto = nuevaVerdad.trim()
    if (!texto) return
    setPreguntasVerdad((prev) => [...prev, { texto, papelera: false }])
    setNuevaVerdad('')
  }

  function moverVerdadAPapelera(indice) {
    setPreguntasVerdad((prev) => prev.map((p, i) => (i === indice ? { ...p, papelera: true } : p)))
  }

  function restaurarVerdad(indice) {
    setPreguntasVerdad((prev) => prev.map((p, i) => (i === indice ? { ...p, papelera: false } : p)))
  }

  function eliminarVerdadDefinitivo(indice) {
    setPreguntasVerdad((prev) => prev.filter((_, i) => i !== indice))
  }

  function agregarReto(e) {
    e.preventDefault()
    const texto = nuevoReto.trim()
    if (!texto) return
    setPreguntasReto((prev) => [...prev, { texto, papelera: false }])
    setNuevoReto('')
  }

  function moverRetoAPapelera(indice) {
    setPreguntasReto((prev) => prev.map((p, i) => (i === indice ? { ...p, papelera: true } : p)))
  }

  function restaurarReto(indice) {
    setPreguntasReto((prev) => prev.map((p, i) => (i === indice ? { ...p, papelera: false } : p)))
  }

  function eliminarRetoDefinitivo(indice) {
    setPreguntasReto((prev) => prev.filter((_, i) => i !== indice))
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
    setPreguntaActual(null)
    setGirando(true)
    setRotacion((prev) => prev + VUELTAS_MINIMAS * 360 + delta)

    setTimeout(() => {
      setGirando(false)
      setSeleccionado(indiceElegido)
      setPreguntaActual(elegirPregunta(modo, preguntasVerdad, preguntasReto))
    }, DURACION_MS)
  }

  // Vuelve a sortear la pregunta/reto sin tocar al participante elegido
  // ni volver a girar la botella.
  function cambiarPregunta() {
    setPreguntaActual(elegirPregunta(modo, preguntasVerdad, preguntasReto))
  }

  const puedeGirar = participantes.length >= 2 && !girando
  const verdadActivas = preguntasVerdad.filter((p) => !p.papelera)
  const verdadEnPapelera = preguntasVerdad.filter((p) => p.papelera)
  const retoActivas = preguntasReto.filter((p) => !p.papelera)
  const retoEnPapelera = preguntasReto.filter((p) => p.papelera)

  return (
    <div className="relative flex min-h-svh flex-col items-center gap-6 px-4 py-8 text-white">
      <button
        type="button"
        onClick={() => setMostrarConfig(true)}
        aria-label="Configuración"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg"
      >
        ⚙️
      </button>

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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-400/10 px-6 py-4 text-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-300">¡Le tocó a!</p>
            <p className="text-2xl font-extrabold text-amber-200">{participantes[seleccionado]}</p>
          </div>
          {preguntaActual ? (
            <div className="max-w-xs">
              <p
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  preguntaActual.tipo === 'verdad' ? 'text-sky-300' : 'text-rose-300'
                }`}
              >
                {preguntaActual.tipo === 'verdad' ? '💭 Verdad' : '🔥 Reto'}
              </p>
              <p className="mt-1 text-base font-semibold text-white">{preguntaActual.texto}</p>
            </div>
          ) : (
            <p className="max-w-xs text-xs text-white/50">Agregá preguntas en ⚙️ Configuración para que aparezcan acá.</p>
          )}
          <button
            type="button"
            onClick={cambiarPregunta}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 transition-transform active:scale-95"
          >
            🔀 Cambiar pregunta
          </button>
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

      {mostrarConfig && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8"
          onClick={() => setMostrarConfig(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#2a0f3d] p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">⚙️ Configuración</h2>
              <button
                type="button"
                onClick={() => setMostrarConfig(false)}
                aria-label="Cerrar configuración"
                className="text-white/50 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/50">Modo de juego</p>
            <div className="mb-5 flex gap-2">
              {OPCIONES_MODO.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => setModo(op.valor)}
                  className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                    modo === op.valor ? 'bg-fuchsia-600 text-white' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {op.etiqueta}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-sky-300">
                <span>💭 Preguntas de Verdad</span>
                <span className="text-white/40">{verdadActivas.length}</span>
              </p>
              <form onSubmit={agregarVerdad} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={nuevaVerdad}
                  onChange={(e) => setNuevaVerdad(e.target.value)}
                  placeholder="Nueva pregunta"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus-visible:border-sky-400"
                />
                <button type="submit" className="shrink-0 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white">
                  +
                </button>
              </form>
              <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {preguntasVerdad.map(
                  (p, i) =>
                    !p.papelera && (
                      <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80">
                        <span>{p.texto}</span>
                        <button
                          type="button"
                          onClick={() => moverVerdadAPapelera(i)}
                          aria-label={`Quitar pregunta: ${p.texto}`}
                          className="shrink-0 text-white/40 hover:text-white"
                        >
                          ×
                        </button>
                      </li>
                    ),
                )}
                {verdadActivas.length === 0 && <li className="text-xs text-white/40">No hay preguntas de verdad.</li>}
              </ul>

              {verdadEnPapelera.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                    🗑️ Papelera ({verdadEnPapelera.length})
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {preguntasVerdad.map(
                      (p, i) =>
                        p.papelera && (
                          <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                            <span className="text-white/40 line-through">{p.texto}</span>
                            <span className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => restaurarVerdad(i)}
                                aria-label={`Restaurar pregunta: ${p.texto}`}
                                className="text-white/50 hover:text-white"
                              >
                                ↩️
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarVerdadDefinitivo(i)}
                                aria-label={`Eliminar para siempre: ${p.texto}`}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                ×
                              </button>
                            </span>
                          </li>
                        ),
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-rose-300">
                <span>🔥 Retos</span>
                <span className="text-white/40">{retoActivas.length}</span>
              </p>
              <form onSubmit={agregarReto} className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={nuevoReto}
                  onChange={(e) => setNuevoReto(e.target.value)}
                  placeholder="Nuevo reto"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus-visible:border-rose-400"
                />
                <button type="submit" className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">
                  +
                </button>
              </form>
              <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {preguntasReto.map(
                  (p, i) =>
                    !p.papelera && (
                      <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/80">
                        <span>{p.texto}</span>
                        <button
                          type="button"
                          onClick={() => moverRetoAPapelera(i)}
                          aria-label={`Quitar reto: ${p.texto}`}
                          className="shrink-0 text-white/40 hover:text-white"
                        >
                          ×
                        </button>
                      </li>
                    ),
                )}
                {retoActivas.length === 0 && <li className="text-xs text-white/40">No hay retos.</li>}
              </ul>

              {retoEnPapelera.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
                    🗑️ Papelera ({retoEnPapelera.length})
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {preguntasReto.map(
                      (p, i) =>
                        p.papelera && (
                          <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                            <span className="text-white/40 line-through">{p.texto}</span>
                            <span className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => restaurarReto(i)}
                                aria-label={`Restaurar reto: ${p.texto}`}
                                className="text-white/50 hover:text-white"
                              >
                                ↩️
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarRetoDefinitivo(i)}
                                aria-label={`Eliminar para siempre: ${p.texto}`}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                ×
                              </button>
                            </span>
                          </li>
                        ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
