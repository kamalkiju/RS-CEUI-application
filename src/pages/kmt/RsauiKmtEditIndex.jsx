import { Navigate, useSearchParams } from 'react-router-dom'

export default function RsauiKmtEditIndex() {
  const [sp] = useSearchParams()
  const submission = sp.get('submission')
  if (submission) {
    const q = new URLSearchParams(sp)
    return <Navigate to={`/kmt/edit/select?${q.toString()}`} replace />
  }
  return <Navigate to="/kmt/document-review/rsaui/review" replace />
}
