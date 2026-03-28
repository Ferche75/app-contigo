import React, { forwardRef } from 'react'
import styles from './Input.module.css'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>((
  {
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    id,
    ...props
  },
  ref
) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  const classNames = [
    styles.input,
    leftIcon && styles.withLeftIcon,
    rightIcon && styles.withRightIcon,
    hasError && styles.error,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftIcon && (
          <div className={styles.leftIcon} aria-hidden="true">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={classNames}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {rightIcon && (
          <div className={styles.rightIcon} aria-hidden="true">
            {rightIcon}
          </div>
        )}
      </div>
      {helperText && !error && (
        <p id={`${inputId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  fullWidth?: boolean
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((
  {
    label,
    helperText,
    error,
    fullWidth = false,
    rows = 4,
    className = '',
    id,
    ...props
  },
  ref
) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  const classNames = [
    styles.textarea,
    hasError && styles.error,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={classNames}
        rows={rows}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
        }
        {...props}
      />
      {helperText && !error && (
        <p id={`${textareaId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${textareaId}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'
