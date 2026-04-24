"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, FileText, Upload, Loader2, ArrowRight } from "lucide-react";
import { useCheckout } from "@/lib/store";

type DocKey = "pan" | "aadhaar" | "license";

interface DocSpec {
  key: DocKey;
  title: string;
  subtitle: string;
  formats: string;
}

const DOCS: DocSpec[] = [
  { key: "pan", title: "PAN Card", subtitle: "For tax compliance", formats: "JPG, PNG, PDF · max 5MB" },
  { key: "aadhaar", title: "Aadhaar Card", subtitle: "Identity verification", formats: "Front & back · JPG, PNG" },
  { key: "license", title: "Driving License", subtitle: "Proof of authorisation", formats: "Front & back · JPG, PNG, PDF" },
];

type Status = "idle" | "uploading" | "verified";

export default function DocumentsStep() {
  const router = useRouter();
  const { setDocument, documents } = useCheckout();
  const [status, setStatus] = useState<Record<DocKey, Status>>({
    pan: documents.pan ? "verified" : "idle",
    aadhaar: documents.aadhaar ? "verified" : "idle",
    license: documents.license ? "verified" : "idle",
  });

  const simulateUpload = (key: DocKey) => {
    setStatus((s) => ({ ...s, [key]: "uploading" }));
    setTimeout(() => {
      setStatus((s) => ({ ...s, [key]: "verified" }));
      setDocument(key, true);
    }, 1400);
  };

  const allDone = Object.values(status).every((s) => s === "verified");

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label-amber label">Step one</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
          Paperwork, <span className="italic">briefly</span>.
        </h1>
        <p className="mt-6 max-w-xl text-bone-300">
          We verify three documents before you proceed. Everything is encrypted,
          and nothing leaves our infrastructure without your signature.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {DOCS.map((doc, i) => (
          <DocCard
            key={doc.key}
            doc={doc}
            index={i}
            status={status[doc.key]}
            onUpload={() => simulateUpload(doc.key)}
          />
        ))}
      </div>

      <div className="mt-16 flex items-center justify-between border-t border-ink-500 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400 tabular">
          {Object.values(status).filter((s) => s === "verified").length} / 3 verified
        </p>
        <button
          disabled={!allDone}
          onClick={() => router.push("/checkout/payment")}
          className="group flex items-center gap-3 bg-amber px-8 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-bone-500 enabled:hover:bg-amber-soft"
        >
          Continue to payment
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-enabled:group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}

function DocCard({
  doc,
  status,
  onUpload,
  index,
}: {
  doc: DocSpec;
  status: Status;
  onUpload: () => void;
  index: number;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`relative border p-6 transition-colors ${
        status === "verified"
          ? "border-signal-sage/40 bg-signal-sage/[0.03]"
          : dragOver
            ? "border-amber bg-amber/5"
            : "border-ink-500 bg-ink-800"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (status === "idle") onUpload();
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center border border-ink-500">
          <FileText className="h-4 w-4 text-bone-300" strokeWidth={1.5} />
        </div>
        <StatusBadge status={status} />
      </div>

      <h3 className="mt-8 font-display text-2xl text-bone-100">{doc.title}</h3>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-bone-400">
        {doc.subtitle}
      </p>

      <div className="mt-6 border-t border-ink-500 pt-5">
        {status === "idle" && (
          <button
            onClick={onUpload}
            className="group/btn flex w-full items-center justify-between gap-3 border border-dashed border-ink-400 px-4 py-4 text-left transition hover:border-amber"
          >
            <div>
              <p className="font-mono text-xs text-bone-100">Drop or click to upload</p>
              <p className="mt-1 font-mono text-[10px] text-bone-400">{doc.formats}</p>
            </div>
            <Upload
              className="h-4 w-4 text-bone-400 transition group-hover/btn:text-amber"
              strokeWidth={1.5}
            />
          </button>
        )}
        {status === "uploading" && (
          <div className="flex items-center gap-3 border border-ink-500 px-4 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-amber" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="font-mono text-xs text-bone-100">Verifying…</p>
              <div className="mt-2 h-0.5 bg-ink-500">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2 }}
                  className="h-full bg-amber"
                />
              </div>
            </div>
          </div>
        )}
        {status === "verified" && (
          <div className="flex items-center gap-3 border border-signal-sage/30 bg-signal-sage/[0.04] px-4 py-4">
            <div className="flex h-6 w-6 items-center justify-center bg-signal-sage">
              <Check className="h-3 w-3 text-ink-900" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-mono text-xs text-signal-sage">Verified</p>
              <p className="mt-0.5 font-mono text-[10px] text-bone-400">
                {doc.title.toLowerCase()}_{Math.floor(Math.random() * 9000 + 1000)}.pdf
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label =
    status === "verified" ? "Verified" : status === "uploading" ? "Processing" : "Pending";
  const cls =
    status === "verified"
      ? "text-signal-sage"
      : status === "uploading"
        ? "text-amber"
        : "text-bone-500";
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider ${cls}`}>{label}</span>
  );
}
