'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { SubmitMedFlowMemberResult } from '@/service/medflow-members'
import { MedFlowContent } from './medflow-content'
import { MedFlowEffects } from './medflow-effects'
import {
  createMedFlowSubmitAction,
  type MedFlowFormValues,
  medFlowEmailPattern
} from './medflow-submit'

export const MedFlowExperience = () => {
  const [apiError, setApiError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitMedFlowMemberResult | null>(null)
  const [successName, setSuccessName] = useState('')
  const isSubmittingRef = useRef(false)
  const {
    formState: { errors },
    handleSubmit,
    register,
    watch
  } = useForm<MedFlowFormValues>({
    defaultValues: { consent: false, email: '', name: '' },
    mode: 'onSubmit'
  })
  const name = watch('name').trim()
  const email = watch('email').trim()
  const hasConsent = watch('consent')
  const submitWaitlist = createMedFlowSubmitAction({
    isSubmittingRef,
    setApiError,
    setIsSubmitting,
    setResult,
    setSuccessName
  })

  useEffect(() => {
    if (result?.ok) document.querySelector<HTMLElement>('#mf-success-title')?.focus()
  }, [result])

  return (
    <>
      <MedFlowEffects active={Boolean(result?.ok)} />
      <MedFlowContent
        apiError={apiError}
        emailError={errors.email?.message}
        nameError={errors.name?.message}
        consentError={errors.consent?.message}
        isSubmitting={isSubmitting}
        canSubmit={Boolean(name && email && hasConsent)}
        onInput={() => setApiError('')}
        onSubmit={handleSubmit(submitWaitlist)}
        registerEmail={register('email', {
          pattern: { message: 'Enter a valid email address.', value: medFlowEmailPattern },
          required: 'Please enter your email.',
          setValueAs: (value: string) => value.trim()
        })}
        registerConsent={register('consent', {
          required: 'Please agree to the data processing terms above to continue.'
        })}
        registerName={register('name', {
          required: 'Please tell us your name.',
          setValueAs: (value: string) => value.trim()
        })}
        result={result}
        successName={successName}
      />
    </>
  )
}
