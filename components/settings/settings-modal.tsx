"use client";

import * as React from "react";
import {
  FileText,
  Layout,
  Shield,
  Info,
  RotateCcw,
  Settings,
  Loader2,
  Eye,
  Pencil,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/settings";
import { useWorkspaceLayoutStore } from "@/stores/layout";
import { type SettingsSection, type UserSettings, defaultUserSettings } from "./types";
import { useToast } from "@/hooks/use-toast";

type SettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const settingsSections: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: "editor", label: "Editor", icon: FileText },
  { id: "appearance", label: "Appearance", icon: Layout },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "about", label: "About", icon: Info },
];

function deepEqual(a: UserSettings, b: UserSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [activeSection, setActiveSection] = React.useState<SettingsSection>("editor");
  const { settings, fetchSettings, saveSettings, resetToDefaults, initialized, loading, saving } = useSettingsStore();
  const { setCentered } = useWorkspaceLayoutStore();
  const { toast } = useToast();

  // Local draft state for form
  const [draft, setDraft] = React.useState<UserSettings>(settings);
  const hasChanges = !deepEqual(draft, settings);

  // Sync draft with settings when settings change (after fetch or external update)
  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  // Fetch settings when modal opens
  React.useEffect(() => {
    if (open && !initialized) {
      void fetchSettings();
    }
  }, [open, initialized, fetchSettings]);

  // Reset draft when modal closes
  React.useEffect(() => {
    if (!open) {
      setDraft(settings);
    }
  }, [open, settings]);

  const handleSave = async () => {
    try {
      await saveSettings(draft);
      // Apply appearance settings immediately
      setCentered(draft.appearance.centeredLayout);
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all settings to defaults?")) {
      return;
    }
    try {
      await resetToDefaults();
      setDraft(defaultUserSettings);
      setCentered(defaultUserSettings.appearance.centeredLayout);
      toast({ title: "Settings reset to defaults" });
    } catch {
      toast({ title: "Failed to reset settings", variant: "destructive" });
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      const discard = window.confirm("You have unsaved changes. Discard them?");
      if (!discard) return;
    }
    onOpenChange(newOpen);
  };

  // Update functions for draft
  const updateDraftEditor = (updates: Partial<UserSettings["editor"]>) => {
    setDraft((prev) => ({ ...prev, editor: { ...prev.editor, ...updates } }));
  };

  const updateDraftAppearance = (updates: Partial<UserSettings["appearance"]>) => {
    setDraft((prev) => ({ ...prev, appearance: { ...prev.appearance, ...updates } }));
  };

  const updateDraftPrivacy = (updates: Partial<UserSettings["privacy"]>) => {
    setDraft((prev) => ({ ...prev, privacy: { ...prev.privacy, ...updates } }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl md:h-[70vh] md:max-h-[520px] h-auto max-h-[85vh] p-0 gap-0 overflow-hidden rounded-lg border-sidebar-border">
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar navigation - hidden on mobile */}
          <div className="hidden md:flex w-48 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <Settings className="h-4 w-4" />
                Settings
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-2">
              <nav className="flex flex-col gap-0.5 py-2">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
                        activeSection === section.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>
          </div>

          {/* Mobile section selector */}
          <div className="md:hidden bg-sidebar shrink-0">
            <DialogHeader className="p-4 pb-2">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <Settings className="h-4 w-4" />
                Settings
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-3">
              <Select
                value={activeSection}
                onValueChange={(value) => setActiveSection(value as SettingsSection)}
              >
                <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <SelectItem key={section.id} value={section.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {section.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-6 h-full">
                  <SettingsContent
                    section={activeSection}
                    draft={draft}
                    updateDraftEditor={updateDraftEditor}
                    updateDraftAppearance={updateDraftAppearance}
                    updateDraftPrivacy={updateDraftPrivacy}
                    onReset={handleReset}
                    hasChanges={hasChanges}
                    saving={saving}
                    onSave={handleSave}
                  />
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SettingsContentProps = {
  section: SettingsSection;
  draft: UserSettings;
  updateDraftEditor: (updates: Partial<UserSettings["editor"]>) => void;
  updateDraftAppearance: (updates: Partial<UserSettings["appearance"]>) => void;
  updateDraftPrivacy: (updates: Partial<UserSettings["privacy"]>) => void;
  onReset: () => void;
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
};

function SettingsContent({
  section,
  draft,
  updateDraftEditor,
  updateDraftAppearance,
  updateDraftPrivacy,
  onReset,
  hasChanges,
  saving,
  onSave,
}: SettingsContentProps) {
  const saveButton = section !== "about" && (
    <div className="flex justify-end mt-auto pt-4">
      <Button
        onClick={onSave}
        disabled={!hasChanges || saving}
        className="min-w-24"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        {section === "editor" && <EditorSettings draft={draft} updateDraft={updateDraftEditor} />}
        {section === "appearance" && <AppearanceSettings draft={draft} updateDraft={updateDraftAppearance} />}
        {section === "privacy" && <PrivacySettings draft={draft} updateDraft={updateDraftPrivacy} onReset={onReset} />}
        {section === "about" && <AboutSection />}
      </div>
      {saveButton}
    </div>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="space-y-0.5 min-w-0">
        <Label className="text-sm font-medium text-foreground">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function EditorSettings({
  draft,
  updateDraft,
}: {
  draft: UserSettings;
  updateDraft: (updates: Partial<UserSettings["editor"]>) => void;
}) {
  const currentMode = draft.editor.defaultMode;
  const ModeIcon = currentMode === "preview" ? Eye : Pencil;
  const modeLabel = currentMode === "preview" ? "Preview" : "Edit";

  return (
    <SettingsGroup
      title="Editor"
      description="Configure how documents open and behave."
    >
      <SettingRow
        label="Default mode"
        description="Mode used when opening a document"
      >
        <ButtonGroup>
          <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none">
            <ModeIcon className="h-4 w-4" />
            {modeLabel}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="end">
              <DropdownMenuItem 
                className="flex items-center gap-2"
                onClick={() => updateDraft({ defaultMode: "preview" })}
              >
                <Eye className="h-4 w-4" />
                <span className="text-sm">Preview</span>
                {currentMode === "preview" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center gap-2"
                onClick={() => updateDraft({ defaultMode: "edit" })}
              >
                <Pencil className="h-4 w-4" />
                <span className="text-sm">Edit</span>
                {currentMode === "edit" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </SettingRow>
    </SettingsGroup>
  );
}

function AppearanceSettings({
  draft,
  updateDraft,
}: {
  draft: UserSettings;
  updateDraft: (updates: Partial<UserSettings["appearance"]>) => void;
}) {
  return (
    <SettingsGroup
      title="Appearance"
      description="Customize the layout of the editor."
    >
      <SettingRow
        label="Centered layout"
        description="Center content with maximum width constraint"
      >
        <Switch
          checked={draft.appearance.centeredLayout}
          onCheckedChange={(checked) => updateDraft({ centeredLayout: checked })}
          className="data-[state=unchecked]:bg-muted"
        />
      </SettingRow>
    </SettingsGroup>
  );
}

function PrivacySettings({
  draft,
  updateDraft,
  onReset,
}: {
  draft: UserSettings;
  updateDraft: (updates: Partial<UserSettings["privacy"]>) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      <SettingsGroup
        title="Privacy"
        description="Control how your data is stored."
      >
        <SettingRow
          label="Remember last file"
          description="Reopen the last viewed file on launch"
        >
          <Switch
            checked={draft.privacy.rememberLastOpenedFile}
            onCheckedChange={(checked) => updateDraft({ rememberLastOpenedFile: checked })}
            className="data-[state=unchecked]:bg-muted"
          />
        </SettingRow>
      </SettingsGroup>

      <Separator className="bg-border" />

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
        <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg bg-destructive/5">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-medium text-foreground">Reset all settings</p>
            <p className="text-xs text-muted-foreground">
              Restore all settings to their default values
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <SettingsGroup
        title="About Vault"
        description="Information about this application."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">V</span>
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Vault</h4>
              <p className="text-xs text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            A modern note-taking app with Markdown support and AI features.
          </p>

          <Separator className="bg-border" />

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Built with</span>
              <span className="text-foreground">Next.js, React</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage</span>
              <span className="text-foreground">S3 + Redis</span>
            </div>
          </div>

          <Separator className="bg-border" />

          <Button variant="outline" size="sm" className="border-input" asChild>
            <a
              href="https://github.com/Ramgopalbhat10/notes"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>
      </SettingsGroup>
    </div>
  );
}

export { SettingsModal as default };

