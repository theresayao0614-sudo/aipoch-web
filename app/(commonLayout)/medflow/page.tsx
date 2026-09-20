import './medflow.css'
import { MedFlowExperience } from './medflow-experience'
import { medFlowMetadata } from './medflow-metadata'

export const metadata = medFlowMetadata

const MedFlowPage = () => {
  return (
    <main id="top" className="medflow-page">
      <MedFlowExperience />
    </main>
  )
}

export default MedFlowPage
