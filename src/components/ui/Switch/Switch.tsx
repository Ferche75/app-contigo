import React, { forwardRef } from 'react'
import styles from './Switch.module.css'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
  helperText?: string
  switchSize?: 'small' | 'medium' | 'large'
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>((
  {
    label,
    helperText,
    switchSize = 'medium',
    className = '',
    id,
    ...props
  },
  ref
) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`${styles.container} ${className}`}>
      <label className={styles.wrapper} htmlFor={switchId}>
        <div className={styles.switchWrapper}>
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className={styles.input}
            {...props}
          />
          <span className={`${styles.track} ${styles[switchSize]}`} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
        </div>
        {(label || helperText) && (
          <div className={styles.text}>
            {label && <span className={styles.label}>{label}</span>}
            {helperText && <span className={styles.helperText}>{helperText}</span>}
          </div>
        )}
      </label>
    </div>
  )
})

Switch.displayName = 'Switch'
