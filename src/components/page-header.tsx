import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div>
      {backHref && (
        <Link href={backHref} className="mb-4 inline-block text-sm text-gray-600 hover:text-gray-900">
          &larr; {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            typeof subtitle === 'string'
              ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              : <div className="mt-1 text-sm text-gray-600">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export function PrimaryLinkButton({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: boolean;
}) {
  return (
    <Link
      href={href}
      className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
    >
      {icon && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
      {children}
    </Link>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
