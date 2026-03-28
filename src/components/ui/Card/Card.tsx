import React from 'react'
import styles from './Card.module.css'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'small' | 'medium' | 'large'
  interactive?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  interactive = false,
  className = '',
  ...props
}) => {
  const classNames = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    interactive && styles.interactive,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className={`${styles.header} ${className}`} {...props}>
      {icon && <div className={styles.headerIcon}>{icon}</div>}
      <div className={styles.headerContent}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  )
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  scrollable?: boolean
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  scrollable = false,
  className = '',
  ...props
}) => {
  const classNames = [
    styles.content,
    scrollable && styles.scrollable,
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  )
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`${styles.footer} ${className}`} {...props}>
      {children}
    </div>
  )
}
