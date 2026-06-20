import { Eye, FileText, Paperclip, X } from "lucide-react";
import { useLingui } from "@lingui/react/macro";
import {
  CLIENT_MAX_ATTACHMENT_REQUEST_BYTES,
  formatBytes,
  totalAttachmentBytes,
  type ContextAttachmentDraft,
} from "./use-attachments";

export function AttachmentTray({
  files,
  maxAttachmentBytes,
  maxAttachmentRequestBytes,
  onClear,
  onPreview,
}: {
  files: ContextAttachmentDraft[];
  maxAttachmentBytes: number | null;
  maxAttachmentRequestBytes: number | null;
  onClear: () => void;
  onPreview: (path: string) => void;
}) {
  const { t } = useLingui();
  if (files.length === 0) return null;
  const knownTotalSize = totalAttachmentBytes(files);
  const totalLimit = maxAttachmentRequestBytes ?? CLIENT_MAX_ATTACHMENT_REQUEST_BYTES;
  const totalTooLarge = knownTotalSize > totalLimit;
  return (
    <div
      className={`mb-2 rounded border bg-[#020818]/80 p-2 text-[10px] ${
        totalTooLarge ? "border-red-500/40" : "border-white/10"
      }`}
    >
      <div className="mb-1 flex items-center gap-1 text-neutral-400">
        <Paperclip size={10} className="text-cyan-300" />
        <span>{files.length === 1 ? t`1 attachment` : t`${files.length} attachments`}</span>
        <span className="text-neutral-600">{t`drop files here or use the file button`}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-neutral-500 hover:text-red-300"
          title={t`Clear attachments`}
        >
          <X size={10} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex max-w-full items-center gap-1 rounded bg-white/[0.05] px-1.5 py-1 font-mono text-neutral-300"
            title={file.path ?? file.filename}
          >
            <FileText size={10} className="shrink-0 text-neutral-500" />
            <span className="max-w-40 truncate">{file.filename}</span>
            <span className="rounded bg-white/[0.08] px-1 text-neutral-500">
              {file.source === "clipboard" ? t`clipboard` : file.embedBytes ? t`bytes` : t`path`}
            </span>
            <span className="text-neutral-600">{file.mime}</span>
            <span className="text-neutral-600">{formatBytes(file.size)}</span>
            {file.path && (
              <button
                type="button"
                onClick={() => file.path && onPreview(file.path)}
                className="ml-0.5 text-neutral-500 opacity-0 hover:text-cyan-300 group-hover:opacity-100"
                title={t`Preview file`}
              >
                <Eye size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
      {files.length > 0 && (
        <p className={`mt-1 text-[10px] ${totalTooLarge ? "text-red-300" : "text-neutral-600"}`}>
          {totalTooLarge
            ? t`Known attachment total ${formatBytes(knownTotalSize)} exceeds upload limit ${formatBytes(totalLimit)}.`
            : maxAttachmentBytes === null || maxAttachmentRequestBytes === null
              ? t`Files are checked during send.`
              : t`Before upload: each file up to ${formatBytes(maxAttachmentBytes)}, total up to ${formatBytes(maxAttachmentRequestBytes)}.`}
        </p>
      )}
    </div>
  );
}
