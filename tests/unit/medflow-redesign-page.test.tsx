import { expect, test } from 'bun:test'
import MedFlowRedesignPage from '../../app/(commonLayout)/medflow-redesign/page'

test('the retired preview redirects permanently to the original MedFlow route', () => {
  let redirect: unknown
  try {
    MedFlowRedesignPage()
  } catch (error) {
    redirect = error
  }
  expect(redirect).toMatchObject({ digest: expect.stringContaining(';/medflow;308;') })
})
