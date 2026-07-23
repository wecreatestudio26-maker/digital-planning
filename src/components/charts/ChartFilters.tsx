import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Filter, X } from "lucide-react";

export type ChartFilterState = {
  min: number;
  max: number;
  categories: string[];
  statuses: string[];
  dateFrom: string;
  dateTo: string;
};

export type ChartFilterConfig = {
  valueRange?: { min: number; max: number; step?: number; label?: string; format?: (n: number) => string };
  categories?: string[];
  statuses?: { value: string; label: string }[];
  dateRange?: boolean;
};

export function defaultFilterState(cfg: ChartFilterConfig): ChartFilterState {
  return {
    min: cfg.valueRange?.min ?? 0,
    max: cfg.valueRange?.max ?? 0,
    categories: cfg.categories ?? [],
    statuses: (cfg.statuses ?? []).map((s) => s.value),
    dateFrom: "",
    dateTo: "",
  };
}

export function isFilterActive(cfg: ChartFilterConfig, state: ChartFilterState): boolean {
  if (cfg.valueRange && (state.min !== cfg.valueRange.min || state.max !== cfg.valueRange.max)) return true;
  if (cfg.categories && state.categories.length !== cfg.categories.length) return true;
  if (cfg.statuses && state.statuses.length !== cfg.statuses.length) return true;
  if (cfg.dateRange && (state.dateFrom || state.dateTo)) return true;
  return false;
}

type Props = {
  config: ChartFilterConfig;
  value: ChartFilterState;
  onChange: (v: ChartFilterState) => void;
};

export function ChartFilters({ config, value, onChange }: Props) {
  const { t } = useTranslation();
  const fmt = config.valueRange?.format ?? ((n: number) => String(n));
  const active = useMemo(() => isFilterActive(config, value), [config, value]);

  const toggle = (arr: string[], key: string): string[] =>
    arr.includes(key) ? arr.filter((x) => x !== key) : [...arr, key];

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4 text-primary" />
            {t("chartFilters.title")}
            {active && (
              <span className="rounded-full bg-primary/15 text-primary text-[10px] px-2 py-0.5 font-medium">
                {t("chartFilters.active")}
              </span>
            )}
          </div>
          {active && (
            <Button variant="ghost" size="sm" onClick={() => onChange(defaultFilterState(config))}>
              <X className="h-3.5 w-3.5" /> {t("chartFilters.clear")}
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {config.valueRange && (
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs text-muted-foreground">
                {config.valueRange.label ?? t("chartFilters.valueRange")}: {fmt(value.min)} — {fmt(value.max)}
              </Label>
              <Slider
                min={config.valueRange.min}
                max={config.valueRange.max}
                step={config.valueRange.step ?? 1}
                value={[value.min, value.max]}
                onValueChange={([mn, mx]) => onChange({ ...value, min: mn, max: mx })}
                className="mt-2"
              />
            </div>
          )}

          {config.dateRange && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("chartFilters.dateRange")}</Label>
              <div className="flex items-center gap-1.5">
                <Input type="date" value={value.dateFrom} onChange={(e) => onChange({ ...value, dateFrom: e.target.value })} className="h-8 text-xs" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" value={value.dateTo} onChange={(e) => onChange({ ...value, dateTo: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
          )}
        </div>

        {config.categories && config.categories.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("chartFilters.categories")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {config.categories.map((c) => {
                const on = value.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ ...value, categories: toggle(value.categories, c) })}
                    className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                      on ? "bg-primary/15 border-primary/50 text-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {config.statuses && config.statuses.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("chartFilters.statuses")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {config.statuses.map((s) => {
                const on = value.statuses.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onChange({ ...value, statuses: toggle(value.statuses, s.value) })}
                    className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                      on ? "bg-primary/15 border-primary/50 text-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
