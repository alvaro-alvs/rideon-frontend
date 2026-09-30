"use client";

interface VehiclePlatePreviewProps {
  plate?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  interactive?: boolean;
}

export function VehiclePlatePreview({
  plate = "",
  size = "md",
  className = "",
}: VehiclePlatePreviewProps) {
  const cleanPlate = (plate || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const formattedPlate =
    cleanPlate.length > 0
      ? cleanPlate.slice(0, 7)
      : "RIDEON";

  const isComplete = cleanPlate.length >= 7;

  if (size === "sm") {
    return (
      <div
        className={`inline-flex items-center overflow-hidden rounded border border-neutral-700 bg-neutral-900 shadow-sm transition-all duration-200 ${className}`}
        title={`Placa: ${cleanPlate || "Sem placa"}`}
      >
        <div className="flex h-full items-center bg-blue-700 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-white">
          <span>BR</span>
        </div>
        <div className="bg-white px-2 py-0.5 font-mono text-[11px] font-black tracking-widest text-neutral-900">
          {cleanPlate || "--- • ---"}
        </div>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        className={`relative inline-flex flex-col overflow-hidden rounded-xl border-2 border-neutral-700 bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300 ${
          isComplete ? "border-blue-500 shadow-blue-500/20 ring-blue-500/30" : ""
        } ${className}`}
        style={{ minWidth: "220px", maxWidth: "260px" }}
      >
        {/* Mercosul Blue Header */}
        <div className="flex items-center justify-between bg-blue-700 px-3 py-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <span className="flex size-2 items-center justify-center rounded-full bg-amber-400 text-[6px] font-bold text-neutral-900">
              ★
            </span>
            <span className="text-[9px] font-extrabold tracking-widest uppercase">
              MERCOSUL
            </span>
          </div>
          <span className="text-[10px] font-black tracking-widest">BRASIL</span>
          <div className="flex size-3.5 items-center justify-center rounded-[2px] bg-emerald-700 p-0.5">
            <div className="size-2 rotate-45 bg-amber-400">
              <div className="size-1 rounded-full bg-blue-600 m-0.5" />
            </div>
          </div>
        </div>

        {/* Plate Digits Area */}
        <div className="relative flex items-center justify-center bg-neutral-50 px-4 py-3.5">
          {/* Holographic watermark subtle effect */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />
          <span
            className={`font-mono text-2xl font-black tracking-[0.25em] transition-colors ${
              cleanPlate ? "text-neutral-950" : "text-neutral-400"
            }`}
          >
            {formattedPlate}
          </span>
        </div>

        {/* Bottom subtle border stripe */}
        <div className="h-1 bg-gradient-to-r from-blue-700 via-neutral-300 to-blue-700" />
      </div>
    );
  }

  // Default "md" size
  return (
    <div
      className={`inline-flex flex-col overflow-hidden rounded-lg border border-neutral-700 bg-white shadow-md transition-transform duration-200 ${className}`}
    >
      <div className="flex items-center justify-between bg-blue-700 px-2.5 py-0.5 text-white">
        <span className="text-[7px] font-black tracking-wider">MERCOSUL</span>
        <span className="text-[8px] font-black tracking-wider">BRASIL</span>
      </div>
      <div className="bg-neutral-50 px-3 py-1 text-center font-mono text-xs font-black tracking-widest text-neutral-950">
        {cleanPlate || "PLACA"}
      </div>
    </div>
  );
}
