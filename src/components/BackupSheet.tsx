import { useRef, useState } from "react";
import { DownloadSimpleIcon, UploadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Press, Sheet, toast } from "./ui";
import { store, useApp } from "../state/store";
import { backupFileName, makeBackup, readBackup, type Restored } from "../logic/backup";
import { shareFile } from "../lib/native";

/** Save everything to one file, or bring it back on another phone or browser. */
export function BackupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [found, setFound] = useState<Restored | null>(null);
  // Two selectors: an object from one selector would be new on every read and loop.
  const counts = { cvs: useApp((s) => s.docs.length), apps: useApp((s) => s.applications.length) };
  const close = () => { setFound(null); onClose(); };

  return (
    <Sheet open={open} onClose={close} title="Backup">
      <p className="muted" style={{ margin: "0 0 16px", fontSize: 15 }}>
        Your CVs are saved only on this device. Save a backup file to keep them safe, or to move them to a new phone.
      </p>
      <Press className="btn primary block" onClick={async () => {
        await shareFile(new Blob([makeBackup(store.get())], { type: "application/json" }), backupFileName(), "CV Wala backup");
        toast("Backup saved");
      }}>
        <DownloadSimpleIcon size={18} weight="bold" /> Save backup file
      </Press>
      <p className="caption" style={{ textAlign: "center" }}>
        {counts.cvs} CV{counts.cvs === 1 ? "" : "s"} and {counts.apps} application{counts.apps === 1 ? "" : "s"}. Keep the file in Google Drive, email or WhatsApp.
      </p>

      <div className="spacer" />
      <Press className="btn plain block" onClick={() => fileRef.current?.click()}>
        <UploadSimpleIcon size={18} weight="bold" /> Restore from a file
      </Press>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) setFound(readBackup(await f.text()));
        }} />

      {found && !found.ok && <p className="caption" style={{ color: "var(--red)" }}>{found.error}</p>}
      {found?.ok && (
        <div className="card pad" style={{ marginTop: 14 }}>
          <div className="req">
            <WarningCircleIcon size={22} weight="fill" color="var(--orange)" />
            <div>
              <b>Replace everything on this device?</b>
              <span className="muted" style={{ fontSize: 14 }}>
                The backup has {found.cvs} CV{found.cvs === 1 ? "" : "s"} and {found.applications} application{found.applications === 1 ? "" : "s"}
                {found.exportedAt ? `, saved on ${new Date(found.exportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}. What's here now will be removed.
              </span>
            </div>
          </div>
          <div className="grid2" style={{ marginTop: 14 }}>
            <Press className="btn plain sm" onClick={() => setFound(null)}>Cancel</Press>
            <Press className="btn primary sm" style={{ background: "var(--red)" }} onClick={() => { store.restoreAll(found.state); toast("Backup restored"); close(); }}>Replace</Press>
          </div>
        </div>
      )}
    </Sheet>
  );
}
