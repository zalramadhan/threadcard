import type { Lang } from "./types";

const id = {
  "app.name": "ThreadCard",
  "app.tagline": "Threads → gambar",
  "nav.lang": "Bahasa",
  "theme.toDark": "Aktifkan mode gelap",
  "theme.toLight": "Aktifkan mode terang",

  "hero.title": "Ubah post Threads jadi gambar.",
  "hero.subtitle":
    "Tempel link post publik, atur tampilannya, lalu unduh PNG. Gratis, tanpa login, tanpa watermark.",
  "hero.placeholder": "Tempel link post Threads…",
  "hero.cta": "Buat gambar",
  "hero.note": "Hanya post publik. Tanpa QR, tanpa akun, tanpa pelacakan.",

  "state.loading": "Mengambil post…",
  "state.loadingHint": "Biasanya kurang dari 5 detik.",
  "state.exporting": "Menyiapkan PNG…",

  "error.title": "Post tidak bisa diambil",
  "error.invalid": "Link Threads tidak valid. Pastikan itu link post, bukan profil.",
  "error.notfound": "Post tidak ditemukan atau sudah dihapus.",
  "error.private": "Post ini privat atau tidak bisa diakses.",
  "error.timeout": "Threads terlalu lama merespons. Coba lagi.",
  "error.changed": "Struktur halaman Threads berubah. Coba isi manual.",
  "error.ratelimited": "Terlalu banyak permintaan. Coba lagi nanti.",
  "error.unknown": "Terjadi kesalahan. Coba lagi.",
  "error.retry": "Coba lagi",
  "error.manual": "Isi manual",

  "manual.badge": "Mode manual",
  "manual.title": "Buat kartu tanpa link",
  "manual.hint": "Isi nama, handle, dan teks. Semua bisa diedit lagi di panel kanan.",  "manual.back": "Kembali ke link",
  "notice.og":
    "Data dari metadata terbatas. Lengkapi avatar dan angka manual jika perlu.",
  "notice.manual": "Mode manual aktif. Data tidak diambil dari Threads.",
  "editor.preview": "Pratinjau",
  "editor.look": "Tampilan",
  "editor.theme": "Tema",
  "editor.background": "Background",
  "editor.textColor": "Warna teks",
  "editor.font": "Font",
  "editor.fontSize": "Ukuran teks",
  "editor.padding": "Padding",
  "editor.reset": "Reset tampilan",
  "editor.resetContent": "Reset konten",
  "editor.content": "Konten",
  "editor.name": "Nama tampilan",
  "editor.username": "Username",
  "editor.text": "Teks post",
  "editor.timestamp": "Tanggal",
  "editor.likes": "Like",
  "editor.replies": "Reply",
  "editor.reposts": "Repost",
  "editor.avatar": "Avatar",
  "editor.uploadAvatar": "Upload avatar",
  "editor.removeAvatar": "Hapus avatar",
  "editor.avatarTooLarge": "Avatar maksimal 2 MB.",
  "editor.elements": "Elemen",
  "editor.size": "Ukuran",
  "editor.export": "Ekspor",

  "toggle.avatar": "Avatar",
  "toggle.verified": "Centang biru",
  "toggle.timestamp": "Tanggal",
  "toggle.counts": "Bar interaksi",
  "toggle.media": "Media",

  "font.sans": "Sans",
  "font.serif": "Serif",
  "font.mono": "Mono",

  "aspect.auto": "Auto",
  "aspect.1:1": "1:1",
  "aspect.4:5": "4:5",
  "aspect.9:16": "9:16",

  "action.download": "Unduh PNG",
  "action.downloadAll": "Unduh semua",
  "action.copy": "Salin gambar",
  "action.copied": "Tersalin",
  "action.newPost": "Post lain",
  "action.retry": "Coba lagi",

  "slide.label": "Slide {n} dari {total}",
  "more.label": "Selengkapnya",
  "char.count": "{n}/500",
  "preview.aria": "Pratinjau kartu post Threads",

  "toast.downloaded": "Gambar diunduh.",
  "toast.allDownloaded": "{total} slide diunduh.",
  "toast.exportFailed": "Gagal membuat gambar. Coba lagi.",
  "toast.copySuccess": "Gambar disalin.",
  "toast.copyFallback":
    "Browser ini tidak mendukung salin gambar. Gambar diunduh sebagai gantinya.",
  "toast.multiBlocked":
    "Browser memblokir unduhan ganda. Unduh slide satu per satu.",

  "footer.legal":
    "Gunakan hanya untuk konten publik dan hormati hak pencipta.",
  "footer.disclaimer":
    "ThreadCard bukan produk Meta. Tidak berafiliasi dengan Threads atau Instagram.",
  "footer.privacy": "Tidak ada data yang disimpan di server.",
} as const;

type MessageKey = keyof typeof id;

const en: Record<MessageKey, string> = {
  "app.name": "ThreadCard",
  "app.tagline": "Threads → image",
  "nav.lang": "Language",
  "theme.toDark": "Switch to dark mode",
  "theme.toLight": "Switch to light mode",

  "hero.title": "Turn Threads posts into images.",
  "hero.subtitle":
    "Paste a public post link, style it, then download a PNG. Free, no sign-up, no watermark.",
  "hero.placeholder": "Paste a Threads post link…",
  "hero.cta": "Create image",
  "hero.note": "Public posts only. No QR, no account, no tracking.",

  "state.loading": "Fetching post…",
  "state.loadingHint": "Usually under 5 seconds.",
  "state.exporting": "Preparing PNG…",

  "error.title": "Could not fetch this post",
  "error.invalid":
    "That Threads link is invalid. Make sure it links to a post, not a profile.",
  "error.notfound": "Post not found or deleted.",
  "error.private": "This post is private or unavailable.",
  "error.timeout": "Threads took too long to respond. Try again.",
  "error.changed":
    "Threads page structure changed. Try entering the content manually.",
  "error.ratelimited": "Too many requests. Try again later.",
  "error.unknown": "Something went wrong. Try again.",
  "error.retry": "Try again",
  "error.manual": "Enter manually",

  "manual.badge": "Manual mode",
  "manual.title": "Build a card without a link",
  "manual.hint":
    "Fill in the name, handle, and text. Everything stays editable in the panel.",

  "manual.back": "Back to link",
  "notice.og":
    "This data comes from limited metadata. Fill in the avatar and counts manually if needed.",
  "notice.manual": "Manual mode is active. Nothing is fetched from Threads.",
  "editor.preview": "Preview",
  "editor.look": "Look",
  "editor.theme": "Theme",
  "editor.background": "Background",
  "editor.textColor": "Text color",
  "editor.font": "Font",
  "editor.fontSize": "Text size",
  "editor.padding": "Padding",
  "editor.reset": "Reset look",
  "editor.resetContent": "Reset content",
  "editor.content": "Content",
  "editor.name": "Display name",
  "editor.username": "Username",
  "editor.text": "Post text",
  "editor.timestamp": "Date",
  "editor.likes": "Likes",
  "editor.replies": "Replies",
  "editor.reposts": "Reposts",
  "editor.avatar": "Avatar",
  "editor.uploadAvatar": "Upload avatar",
  "editor.removeAvatar": "Remove avatar",
  "editor.avatarTooLarge": "Avatar must be 2 MB or smaller.",
  "editor.elements": "Elements",
  "editor.size": "Size",
  "editor.export": "Export",

  "toggle.avatar": "Avatar",
  "toggle.verified": "Verified badge",
  "toggle.timestamp": "Date",
  "toggle.counts": "Engagement bar",
  "toggle.media": "Media",

  "font.sans": "Sans",
  "font.serif": "Serif",
  "font.mono": "Mono",

  "aspect.auto": "Auto",
  "aspect.1:1": "1:1",
  "aspect.4:5": "4:5",
  "aspect.9:16": "9:16",

  "action.download": "Download PNG",
  "action.downloadAll": "Download all",
  "action.copy": "Copy image",
  "action.copied": "Copied",
  "action.newPost": "New post",
  "action.retry": "Try again",

  "slide.label": "Slide {n} of {total}",
  "more.label": "See more",
  "char.count": "{n}/500",
  "preview.aria": "Preview of the Threads post card",

  "toast.downloaded": "Image downloaded.",
  "toast.allDownloaded": "{total} slides downloaded.",
  "toast.exportFailed": "Could not create the image. Try again.",
  "toast.copySuccess": "Image copied.",
  "toast.copyFallback":
    "This browser cannot copy images. The image was downloaded instead.",
  "toast.multiBlocked":
    "The browser blocked multiple downloads. Download slides one by one.",

  "footer.legal": "Use public content only and respect creators' rights.",
  "footer.disclaimer":
    "ThreadCard is not a Meta product. Not affiliated with Threads or Instagram.",
  "footer.privacy": "No data is stored on the server.",
};

const messages: Record<Lang, Record<MessageKey, string>> = { id, en };

export function t(
  lang: Lang,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = messages[lang][key] ?? messages.id[key] ?? key;
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name)
      ? String(vars[name])
      : match,
  );
}

export type { MessageKey };
