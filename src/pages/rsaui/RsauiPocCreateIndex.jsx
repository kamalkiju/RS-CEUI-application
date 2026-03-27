import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRsaUI } from '../../context/RsaUIContext.jsx'

export default function RsauiPocCreateIndex() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const { createDraft } = useRsaUI()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    const q = new URLSearchParams(sp)
    const mode = q.get('mode') || 'edit'
    const hasSub = Boolean(q.get('submission'))

    if (mode === 'view' && hasSub) {
      navigate(`/rsaui/poc/create/view?${q.toString()}`, { replace: true })
      return
    }

    if (!hasSub) {
      q.set('submission', createDraft())
      q.set('mode', 'edit')
    } else if (!q.get('mode')) {
      q.set('mode', 'edit')
    }
    navigate(`/rsaui/poc/create/select?${q.toString()}`, { replace: true })
  }, [createDraft, navigate, sp])

  return null
}
