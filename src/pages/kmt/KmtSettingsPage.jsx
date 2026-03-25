import { useState } from 'react'
import Layout from '../../components/Layout.jsx'

export default function KmtSettingsPage() {
  const [slaBufm, setSlaBufm] = useState(3)
  const [slaKmt, setSlaKmt] = useState(2)
  const [emailOnPublish, setEmailOnPublish] = useState(true)
  const [emailOnReject, setEmailOnReject] = useState(true)
  const [requireDualKmt, setRequireDualKmt] = useState(false)
  const [autoPublish, setAutoPublish] = useState(false)

  return (
    <Layout>
      <div className="kmt-page kmt-settings">
        <h1 className="kmt-page__title">Settings</h1>
        <p className="kmt-page__sub">Defaults and notification preferences.</p>

        <section className="kmt-settings__section">
          <h2>Approval SLA defaults</h2>
          <label className="kmt-field">
            <span>BUFM review SLA (days)</span>
            <input type="number" min={0} className="kmt-input kmt-input--narrow" value={slaBufm} onChange={e => setSlaBufm(+e.target.value)} />
          </label>
          <label className="kmt-field">
            <span>KMT review SLA (days)</span>
            <input type="number" min={0} className="kmt-input kmt-input--narrow" value={slaKmt} onChange={e => setSlaKmt(+e.target.value)} />
          </label>
        </section>

        <section className="kmt-settings__section">
          <h2>Notification preferences</h2>
          <label className="kmt-field kmt-field--row">
            <input type="checkbox" checked={emailOnPublish} onChange={e => setEmailOnPublish(e.target.checked)} />
            <span>Email on publish</span>
          </label>
          <label className="kmt-field kmt-field--row">
            <input type="checkbox" checked={emailOnReject} onChange={e => setEmailOnReject(e.target.checked)} />
            <span>Email on rejection</span>
          </label>
        </section>

        <section className="kmt-settings__section">
          <h2>Workflow rules</h2>
          <label className="kmt-field kmt-field--row">
            <input type="checkbox" checked={requireDualKmt} onChange={e => setRequireDualKmt(e.target.checked)} />
            <span>Require dual KMT approval for commercial templates</span>
          </label>
          <label className="kmt-field kmt-field--row">
            <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} />
            <span>Auto-publish RSAUI after KMT approval (no manual gate)</span>
          </label>
        </section>
      </div>
    </Layout>
  )
}
