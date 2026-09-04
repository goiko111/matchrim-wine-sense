import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, ChefHat, ChevronRight, ExternalLink, History, Loader2, ScanLine, ShoppingBag, Wine } from "lucide-react";
import { MultiWineLabelScanner } from "@/components/wine-import/MultiWineLabelScanner";
import { WineLabelOCRImport } from "@/components/wine-import/WineLabelOCRImport";
import FoodPairingScanner from "@/components/wine-import/FoodPairingScanner";
import WineShopLinkAdvisor from "@/components/wine-import/WineShopLinkAdvisor";
import { useAuth } from "@/contexts/AuthContext";
import { trackAppEvent } from "@/lib/analytics";
import {
  SCAN_HISTORY_UPDATED_EVENT,
  getScanHistory,
  type ScanHistoryItem,
} from "@/utils/scanHistory";

const WineMenuScanner = lazy(() => import("@/components/wine-import/WineMenuScanner"));

export type ScanMode = "label" | "wine-menu" | "food-menu" | "dish" | "shop-link";


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
  <div className="matchrim-soft-surface flex min-h-40 items-center justify-center rounded-lg border-dashed">
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
    description: "Identifica una etiqueta o varias botellas sin mezclarlas.",
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
  {
    id: "shop-link" as const,
    icon: ShoppingBag,
    title: "Encontrar vino",
    description: "Dime presupuesto, ocasión o tienda y te digo qué buscaría.",
    accepts: "Pregunta abierta · Enlace opcional",
  },
];

const scanTypeLabels: Record<ScanMode, string> = {
  label: "Etiqueta",
  "wine-menu": "Carta de vinos",
  "food-menu": "Menú de comida",
  dish: "Plato",
  "shop-link": "Encontrar vino",
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
    <section>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <History className="h-4 w-4 text-red-900" />
        Últimos escaneos
      </div>
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {items.slice(0, 5).map((item) => (
          <li
            key={item.id}
            className="flex items-stretch gap-2"
          >
            <button
              type="button"
              onClick={() => navigate(item.route)}
                className="matchrim-pressable flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left"
            >
              <span className="matchrim-status-pill mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
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
                className="matchrim-pressable inline-flex shrink-0 items-center gap-1.5 self-center rounded-md px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{item.actionLabel || "Ver ficha"}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
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
    <div className={compact ? "grid gap-3 md:grid-cols-2" : "grid gap-3 md:grid-cols-2"}>
      {scanOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = activeMode === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => selectMode(option.id)}
            className={`matchrim-pressable group flex min-h-[6rem] items-start gap-3 rounded-lg border p-3 text-left sm:gap-4 sm:p-4 ${
              isSelected && variant === "legacy"
                ? "border-red-900 bg-red-50 text-red-950 shadow-sm"
                : option.id === "wine-menu"
                  ? "border-red-900/20 bg-white text-slate-950 shadow-elegant hover:border-red-900/35"
                  : "border-stone-200 bg-white text-slate-950 hover:border-stone-300"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md sm:h-11 sm:w-11 ${
              isSelected && variant === "legacy" || option.id === "wine-menu" ? "bg-red-950 text-white" : "matchrim-icon-tile"
            }`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{option.title}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">{option.description}</span>
              <span className="matchrim-status-pill mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-medium">
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
      {activeMode === "label" && <MultiWineLabelScanner onExtractComplete={onExtractComplete} />}

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

      {activeMode === "shop-link" && <WineShopLinkAdvisor />}
    </>
  );

  if (variant === "hub") {
    const primaryOptions = scanOptions.slice(0, 2);
    const secondaryOptions = scanOptions.slice(2);

    return (
      <div className="space-y-7">
        <div className="grid gap-3 sm:grid-cols-2">
          {primaryOptions.map((option) => {
            const Icon = option.icon;
            const isMenu = option.id === "wine-menu";
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectMode(option.id)}
                className={`matchrim-pressable flex min-h-[7.5rem] items-start gap-4 rounded-lg p-4 text-left shadow-sm ${
                  isMenu
                    ? "bg-emerald-950 text-white"
                    : "border border-slate-200 bg-white text-slate-950"
                }`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  isMenu ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-900"
                }`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-lg font-bold">{option.title}</span>
                  <span className={`mt-1 block text-sm leading-5 ${isMenu ? "text-white/72" : "text-slate-500"}`}>
                    {option.description}
                  </span>
                </span>
                <ChevronRight className={`mt-1 h-5 w-5 shrink-0 ${isMenu ? "text-white/45" : "text-slate-400"}`} />
              </button>
            );
          })}
        </div>

        <section aria-labelledby="more-scan-options-title">
          <h2 id="more-scan-options-title" className="text-sm font-bold text-slate-950">También puedes</h2>
          <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
            {secondaryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectMode(option.id)}
                  className="matchrim-pressable flex min-h-[4.75rem] w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <Icon className="h-[1.1rem] w-[1.1rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-950">{option.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </section>

        <RecentScansSection />
      </div>
    );
  }

  if (variant === "selected") {
    return <div className="space-y-6">{renderSelectedScanner()}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="matchrim-surface overflow-hidden rounded-lg">
        <div className="border-b border-white/10 matchrim-ink-panel p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/12 text-amber-200">
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
