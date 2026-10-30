import { Alert } from 'react-native';

export function confirmUndo(title: string, onConfirm: () => void): void {
  Alert.alert('Geri almak istediğine emin misin?', `"${title}" yeniden yapılacaklar listesine dönecek.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Geri al', style: 'destructive', onPress: onConfirm },
  ]);
}

export function confirmAsk(title: string, message: string, ok: string, onConfirm: () => void, destructive = false): void {
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
