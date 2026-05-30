import Link from "next/link";
import { Button, LinkButton } from "@/components/ui/button";
import { ArrowLeftIcon, PlusIcon } from "@/components/ui/icons";

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
        <Link href={backHref} className="text-caption text-text-secondary hover:text-text-primary mb-4 inline-flex items-center gap-1">
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {title && <h1 className="text-display text-text-primary">{title}</h1>}
          {subtitle && (typeof subtitle === "string" ? <p className="text-body text-text-secondary mt-1">{subtitle}</p> : <div className="text-body text-text-secondary mt-1">{subtitle}</div>)}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Backward-compatible wrapper around the new `LinkButton` primitive.
 *
 * @deprecated Prefer `<LinkButton>` from `@/components/ui` directly.
 */
export function PrimaryLinkButton({ href, children, icon }: { href: string; children: React.ReactNode; icon?: boolean }) {
  return (
    <LinkButton href={href} variant="primary" iconLeft={icon ? <PlusIcon className="size-4" /> : undefined}>
      {children}
    </LinkButton>
  );
}

/**
 * Backward-compatible wrapper around the new `Button` primitive.
 *
 * @deprecated Prefer `<Button>` from `@/components/ui` directly.
 */
export function PrimaryButton({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} loading={loading}>
      {children}
    </Button>
  );
}
