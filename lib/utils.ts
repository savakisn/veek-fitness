import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Negative ids mark optimistic rows that aren't saved yet.
let tempId = 0;
export const nextTempId = () => --tempId;
