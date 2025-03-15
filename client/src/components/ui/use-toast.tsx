
import { useCallback, type RefObject } from "react"
import { toast } from "./toast"

export function useToast() {
  const callback = useCallback(() => {
    return toast
  }, [])

  return callback()
}
