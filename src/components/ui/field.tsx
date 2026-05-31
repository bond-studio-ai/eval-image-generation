import { type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "./cn";

/**
 * Standard label/hint wrapper for a form control. Pair with `<TextInput>`,
 * `<Textarea>`, or any custom control — pass `controlId` if the field already
 * has its own id, otherwise `Field` generates one and forwards it via render
 * prop so the `<label htmlFor>` and control stay wired up.
 */
interface FieldProps {
  label: ReactNode;
  /** Optional helper text below the control. */
  hint?: ReactNode;
  /** Optional error message; replaces `hint` and recolors when present. */
  error?: ReactNode;
  /** Show an asterisk next to the label. */
  required?: boolean;
  /** Render an "optional" badge next to the label. */
  optional?: boolean;
  className?: string;
  /** Pre-bound control id; skip to have Field generate one and pass via render prop. */
  controlId?: string;
  children: ReactNode | ((controlId: string) => ReactNode);
}

const LABEL_CLASS = "text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide";

export function Field({ label, hint, error, required, optional, className, controlId, children }: FieldProps) {
  const autoId = useId();
  const id = controlId ?? autoId;
  const helper = error ?? hint;
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {required && <span className="text-danger-500"> *</span>}
        {optional && <span className="text-text-muted normal-case"> (optional)</span>}
      </label>
      {typeof children === "function" ? children(id) : children}
      {helper && <p className={cn("text-caption mt-1", error ? "text-danger-700" : "text-text-muted")}>{helper}</p>}
    </div>
  );
}

const CONTROL_CLASS =
  "rounded-input border-border-strong bg-surface text-body text-text-primary placeholder:text-text-disabled focus:border-primary-500 focus:ring-primary-500 w-full border px-3 py-2 focus:ring-1 focus:outline-none disabled:bg-surface-muted disabled:text-text-disabled";

/**
 * Standard single-line text input. Use directly for free-form text or as the
 * control inside a `<Field>`. For numeric values prefer the consuming
 * component's own `inputMode='numeric'` / regex constraints.
 */
export function TextInput({ className, type = "text", ref, ...rest }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} type={type} className={cn(CONTROL_CLASS, className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL_CLASS, className)} {...rest} />;
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Inline label rendered to the right of the checkbox. */
  label?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Brand-styled checkbox. Use `label` to render an inline `<label>` with the
 * checkbox and text together; omit `label` when the caller wants to compose
 * the surrounding layout manually.
 */
export function Checkbox({ label, className, ref, ...rest }: CheckboxProps) {
  const input = <input ref={ref} type="checkbox" className={cn("border-border-strong text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer rounded", className)} {...rest} />;
  if (label === undefined) return input;
  return (
    <label className="text-body text-text-primary inline-flex cursor-pointer items-center gap-2 select-none">
      {input}
      {label}
    </label>
  );
}
