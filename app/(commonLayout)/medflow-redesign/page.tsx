import { permanentRedirect } from 'next/navigation'

// Retire the separate preview URL; MedFlow now lives at its original canonical route.
export default function MedFlowRedesignPage() {
  permanentRedirect('/medflow')
}
