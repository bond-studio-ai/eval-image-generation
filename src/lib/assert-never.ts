/**
 * Exhaustiveness guard for discriminated-union `switch` statements. Use in the
 * `default` branch: if every union member is handled the branch is unreachable
 * and `value` narrows to `never`; adding a new member without a matching `case`
 * becomes a compile error here. Also throws at runtime on malformed input.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
