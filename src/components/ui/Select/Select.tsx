import React, { forwardRef } from 'react'
import styles from './Select.module.css'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options: SelectOption[]
  fullWidth?: boolean
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>((
  {
    label,
    helperText,
    error,
    options,
    fullWidth = false,
    placeholder,
    className = '',
    id,
    ...props
  },
  ref
) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
  const hasError = !!error

  const classNames = [
    styles.select,
    hasError && styles.error,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={`${styles.container} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <select
          ref={ref}
          id={selectId}
          className={classNames}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className={styles.chevron} size={20} aria-hidden="true" />
      </div>
      {helperText && !error && (
        <p id={`${selectId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'
