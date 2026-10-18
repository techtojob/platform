/** Une clases de CSS ignorando las vacías: cn("a", activo && "b", undefined) → "a b". */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}
