import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, ChefHat, ExternalLink, History, Loader2, ScanLine, Wine } from "lucide-react";
import { WineLabelOCRImport } from "@/components/wine-import/WineLabelOCRImport";
import FoodPairingScanner from "@/components/wine-import/FoodPairingScanner";
import { useAuth } from "@/contexts/AuthContext";
import { trackAppEvent } from "@/lib/analytics";
import {
  SCAN_HISTORY_UPDATED_EVENT,
  getScanHistory,
  type ScanHistoryItem,
} from "@/utils/scanHistory";

const WineMenuScanner = lazy(() => import("@/components/wine-import/WineMenuScanner"));

export type ScanMode = "label" | "wine-menu" | "food-menu" | "dish";


interface ScanHubProps {
  onExtractComplete: Parameters<typeof WineLabelOCRImport>[0]["onExtractComplete"];
  initialMode?: ScanMode;
  mode?: ScanMode;
  variant?: "hub" | "selected" | "legacy";
  pairingDishName?: string | null;
  similarWineName?: string | null;
  onSelectMode?: (mode: ScanMode) => void;
}

const ScannerFallback = () => (
  <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-muted/40">
    <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
    Preparando scanner...
  </div>
);

export const scanOptions = [
  {
    id: "wine-menu" as const,
    icon: ScanLine,
    title: "Carta de vinos",
    description: "Sube la carta y te digo qué pediría primero.",
    accepts: "Hacer foto · Subir archivo/PDF",
  },
  {
    id: "label" as const,
    icon: Wine,
    title: "Etiqueta de vino",
    description: "Identifica una botella, calcula encaje y guárdala.",
    accepts: "Hacer foto · Subir archivo",
  },
  {
    id: "food-menu" as const,
    icon: BookOpen,
    title: "Menú de comida",
    description: "Convierte platos del menú en ideas de vino.",
    accepts: "Hacer foto · Subir archivo/PDF",
  },
  {
    id: "dish" as const,
    icon: ChefHat,
    title: "Plato",
    description: "Haz una foto y encuentra el vino que le va.",
    accepts: "Hacer foto · Subir archivo",
  },
];

const scanTypeLabels: Record<ScanHistoryItem["type"], string> = {
  label: "Etiqueta",
  "wine-menu": "Carta de vinos",
  "food-menu": "Menú de comida",
  dish: "Plato",
};

const formatScanTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
};

const RecentScansSection = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ScanHistoryItem[]>(() => getScanHistory());

  const refresh = useCallback(() => setItems(getScanHistory()), []);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const handler = () => refresh();
    window.addEventListener(SCAN_HISTORY_UPDATED_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SCAN_HISTORY_UPDATED_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  if (!items.length) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <History className="h-4 w-4 text-red-900" />
        Últimos escaneos
      </div>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <li
            key={item.id}
            className="flex items-stretch gap-2 rounded-md border border-stone-100 bg-stone-50/60"
          >
            <button
              type="button"
              onClick={() => navigate(item.route)}
              className="matchrim-pressable flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-900">
                {scanTypeLabels[item.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-950">{item.title}</span>
                {item.subtitle && (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{item.subtitle}</span>
                )}
                <span className="mt-1 block text-[11px] text-slate-400">{formatScanTime(item.createdAt)}</span>
              </span>
            </button>
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="matchrim-pressable inline-flex shrink-0 items-center gap-1.5 self-center rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{item.actionLabel || "Ver ficha"}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};



export const ScanHub = ({
  onExtractComplete,
  initialMode = "label",
  mode,
  variant = "legacy",
  pairingDishName,
  similarWineName,
  onSelectMode,
}: ScanHubProps) => {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState<ScanMode>(initialMode);
  const activeMode = mode ?? selectedMode;

  useEffect(() => {
    trackAppEvent("scan_hub_opened", { userId: user?.id });
  }, [user?.id]);

  useEffect(() => {
    if (!mode) setSelectedMode(initialMode);
  }, [initialMode, mode]);

  const selectMode = (mode: ScanMode) => {
    setSelectedMode(mode);
    trackAppEvent("scan_option_selected", {
      userId: user?.id,
      metadata: { option: mode },
    });
    onSelectMode?.(mode);
  };

  const renderOptions = (compact = false) => (
    <div className={compact ? "grid gap-3 md:grid-cols-2" : "grid gap-3"}>
      {scanOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = activeMode === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => selectMode(option.id)}
            className={`matchrim-pressable group flex min-h-[5.5rem] items-start gap-3 rounded-lg border p-3 text-left sm:gap-4 sm:p-4 ${
              isSelected && variant === "legacy"
                ? "border-red-900 bg-red-50 text-red-950 shadow-sm"
                : "border-stone-200 bg-white text-slate-950 hover:border-red-200 hover:bg-red-50/50"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md sm:h-11 sm:w-11 ${
              isSelected && variant === "legacy" ? "bg-red-900 text-white" : "bg-stone-100 text-red-900"
            }`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{option.title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span>
              <span className="mt-2 inline-flex rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600">
                {option.accepts}
              </span>
            </span>
            {variant === "hub" && (
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-red-800" />
            )}
          </button>
        );
      })}
    </div>
  );

  const renderSelectedScanner = () => (
    <>
      {activeMode === "label" && <WineLabelOCRImport onExtractComplete={onExtractComplete} />}

      {activeMode === "wine-menu" && (
        <Suspense fallback={<ScannerFallback />}>
          <WineMenuScanner
            pairingDishName={pairingDishName}
            similarWineName={similarWineName}
          />
        </Suspense>
      )}

      {activeMode === "food-menu" && <FoodPairingScanner initialMode="menu" lockMode={variant === "selected"} />}

      {activeMode === "dish" && <FoodPairingScanner initialMode="dish" lockMode={variant === "selected"} />}
    </>
  );

  if (variant === "hub") {
    return (
      <div className="space-y-4">
        <div className="rounded-full border border-red-100 bg-red-50/70 px-3 py-2">
          <p className="text-sm leading-5 text-red-900/85">
            <span className="font-semibold text-red-950">En restaurante:</span> carta primero. <span className="font-semibold text-red-950">Con botella:</span> etiqueta.
          </p>
        </div>
        {renderOptions()}
        <RecentScansSection />

      </div>
    );
  }

  if (variant === "selected") {
    return <div className="space-y-6">{renderSelectedScanner()}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm">
        <div className="border-b bg-red-950 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/12">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Escaneo Matchrim</h2>
              <p className="text-sm leading-6 text-white/70">
                Convierte una foto en una decisión útil para tu gusto.
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">Qué tienes delante</h3>
            <p className="text-sm leading-6 text-slate-500">
                Cada flujo te pide hacer foto o subir archivo, sin decisiones duplicadas.
            </p>
          </div>
        </div>

        {renderOptions(true)}
        </div>
      </div>

      {renderSelectedScanner()}

      <RecentScansSection />


      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Cada escaneo ayuda a entender demanda real: qué carta consulta el usuario, qué guarda y qué acaba valorando.
      </div>

    </div>
  );
};

export default ScanHub;
