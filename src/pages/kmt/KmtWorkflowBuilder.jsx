import { useState } from 'react'
import Layout from '../../components/Layout.jsx'
import WorkflowBuilderBody, { DEFAULT_WF_EDGES, DEFAULT_WF_NODES } from '../../components/kmt/WorkflowBuilderBody.jsx'

export default function KmtWorkflowBuilder() {
  const [nodes, setNodes] = useState(DEFAULT_WF_NODES)
  const [edges, setEdges] = useState(DEFAULT_WF_EDGES)

  return (
    <Layout>
      <div className="kmt-page kmt-wf">
        <div className="kmt-wf__head">
          <h1 className="kmt-page__title">Workflow Builder</h1>
          <p className="kmt-page__sub">Drag nodes onto the canvas and connect them. Configure each node in the panel.</p>
        </div>
        <WorkflowBuilderBody nodes={nodes} setNodes={setNodes} edges={edges} setEdges={setEdges} compact={false} showTimeline />
      </div>
    </Layout>
  )
}
