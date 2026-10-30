// Alert.alert has no buttons on the web preview; the browser dialog stands in for it.
export function confirmUndo(title: string, onConfirm: () => void): void {
  if (globalThis.confirm?.(`Geri almak istediğine emin misin?\n"${title}" yeniden yapılacaklar listesine dönecek.`)) onConfirm();
}

export function confirmAsk(title: string, message: string, _ok: string, onConfirm: () => void): void {
  if (globalThis.confirm?.(`${title}\n${message}`)) onConfirm();
}
