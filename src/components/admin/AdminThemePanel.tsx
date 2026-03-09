"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from "@/lib/theme-settings";

type UploadTarget = "logo" | "background";
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function AdminThemePanel() {
  const [settings, setSettings] = useState<SiteThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const previewStyle = useMemo<CSSProperties>(
    () => ({
      backgroundColor: settings.headerBackgroundColor,
      backgroundImage: settings.headerBackgroundImageUrl ? `url("${settings.headerBackgroundImageUrl}")` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    [settings.headerBackgroundColor, settings.headerBackgroundImageUrl],
  );
  const colorInputValue = useMemo(
    () =>
      HEX_COLOR_RE.test(settings.headerBackgroundColor)
        ? settings.headerBackgroundColor
        : DEFAULT_THEME_SETTINGS.headerBackgroundColor,
    [settings.headerBackgroundColor],
  );

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/theme", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error("Impossible de charger le theme");
        return;
      }
      setSettings(normalizeThemeSettings(json?.data));
    } catch {
      toast.error("Erreur reseau pendant le chargement");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(next: SiteThemeSettings) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(next),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error("Impossible d'enregistrer le theme");
        return;
      }
      const normalized = normalizeThemeSettings(json?.data ?? next);
      setSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success("Theme enregistre");
    } catch {
      toast.error("Erreur reseau pendant la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(target: UploadTarget, file: File | null) {
    if (!file) return;
    setUploading(target);
    try {
      const formData = new FormData();
      formData.set("target", target);
      formData.set("file", file);

      const response = await fetch("/api/admin/theme/upload", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error("Upload impossible");
        return;
      }
      const normalized = normalizeThemeSettings(json?.data?.settings ?? settings);
      setSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success(target === "logo" ? "Logo mis a jour" : "Fond mis a jour");
    } catch {
      toast.error("Erreur reseau pendant l'upload");
    } finally {
      if (target === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (target === "background" && backgroundInputRef.current) backgroundInputRef.current.value = "";
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[color:var(--bg-700)]/50 bg-[color:var(--bg-700)]/35 p-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-75">Apercu</h3>
          <p className="text-sm opacity-70">Voici le rendu du bloc logo du header.</p>
        </div>
        <div className="rounded-lg border border-[color:var(--bg-700)]/60 p-4" style={previewStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.headerLogoUrl}
            alt="Logo header"
            className="mx-auto block h-auto max-h-36 max-w-full"
          />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="theme-logo-url">URL du logo</Label>
          <Input
            id="theme-logo-url"
            value={settings.headerLogoUrl}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                headerLogoUrl: event.target.value,
              }))
            }
            placeholder="/img/mon-logo.gif"
            className="border-[color:var(--bg-600)]/70 bg-[color:var(--bg-800)]/30"
          />
          <div className="flex items-center gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleUpload("logo", file);
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
            >
              {uploading === "logo" ? "Upload..." : "Importer logo"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="theme-bg-color">Couleur de fond</Label>
          <div className="flex items-center gap-2">
            <Input
              id="theme-bg-color"
              type="color"
              value={colorInputValue}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  headerBackgroundColor: event.target.value,
                }))
              }
              className="h-11 w-16 border-[color:var(--bg-600)]/70 bg-[color:var(--bg-800)]/30 p-1"
            />
            <Input
              value={settings.headerBackgroundColor}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  headerBackgroundColor: event.target.value,
                }))
              }
              className="border-[color:var(--bg-600)]/70 bg-[color:var(--bg-800)]/30"
              placeholder="#204E84"
            />
          </div>

          <Label htmlFor="theme-bg-url">Image de fond (optionnel)</Label>
          <Input
            id="theme-bg-url"
            value={settings.headerBackgroundImageUrl ?? ""}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                headerBackgroundImageUrl: event.target.value || null,
              }))
            }
            placeholder="/uploads/theme/background.jpg"
            className="border-[color:var(--bg-600)]/70 bg-[color:var(--bg-800)]/30"
          />
          <div className="flex items-center gap-2">
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleUpload("background", file);
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploading === "background"}
            >
              {uploading === "background" ? "Upload..." : "Importer fond"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  headerBackgroundImageUrl: null,
                }))
              }
            >
              Retirer image
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={saving || loading}
          onClick={() => void saveSettings(DEFAULT_THEME_SETTINGS)}
        >
          Valeurs par defaut
        </Button>
        <Button
          type="button"
          disabled={saving || loading}
          onClick={() => void saveSettings(settings)}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {loading ? <p className="text-sm opacity-70">Chargement...</p> : null}
    </div>
  );
}
