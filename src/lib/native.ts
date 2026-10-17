import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = Capacitor.isNativePlatform();

export const haptic = {
  tap: () => isNative && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  success: () => isNative && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  select: () => isNative && Haptics.selectionChanged().catch(() => {}),
};

/** Saves/shares a file: native share sheet on iOS/Android, Web Share on mobile web, download otherwise. */
export async function shareFile(blob: Blob, fileName: string, title: string) {
  if (isNative) {
    const data = await blobToBase64(blob);
    const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title, url: uri, dialogTitle: title });
    return;
  }
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function shareText(text: string, title: string) {
  if (isNative) return Share.share({ title, text, dialogTitle: title });
  if (navigator.share) {
    try {
      return await navigator.share({ title, text });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  await copy(text);
}

export const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = Object.assign(document.createElement("textarea"), { value: text });
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
