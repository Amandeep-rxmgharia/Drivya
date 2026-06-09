import { useState } from "react";
import {
  Folder,
  FileText,
  LayoutGrid,
  ArrowUpDown,
  Image,
  MousePointer,
  Tag,
} from "lucide-react";
import { SettingSection, SettingRow } from "../setting-primitives";
import {
  SettingToggle,
  SettingSelect,
  SettingRadioGroup,
} from "../setting-controls";

export default function FileSection() {
  const [uploadLocation, setUploadLocation] = useState("root");
  const [namingConflict, setNamingConflict] = useState("ask");
  const [defaultView, setDefaultView] = useState("grid");
  const [defaultSort, setDefaultSort] = useState("modified-desc");
  const [thumbnails, setThumbnails] = useState("all");
  const [previewBehavior, setPreviewBehavior] = useState("preview");
  const [autoTagging, setAutoTagging] = useState("metadata");
  const [foldersFirst, setFoldersFirst] = useState(true);

  return (
    <div className="space-y-6">
      {/* Upload Defaults */}
      <SettingSection
        id="upload-defaults"
        icon={Folder}
        title="Upload Defaults"
        description="Configure default behavior for new uploads."
      >
        <SettingRow
          label="Default Upload Location"
          description="Where files go when no specific folder is chosen."
        >
          <SettingSelect
            value={uploadLocation}
            onChange={setUploadLocation}
            options={[
              { value: "root", label: "My Drive root" },
              { value: "last", label: "Last used folder" },
              { value: "ask", label: "Always ask" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="File Naming Conflicts"
          description="What happens when a file with the same name already exists."
        >
          <SettingSelect
            value={namingConflict}
            onChange={setNamingConflict}
            options={[
              { value: "ask", label: "Ask every time" },
              { value: "rename", label: "Auto-rename" },
              { value: "replace", label: "Replace existing" },
              { value: "keep", label: "Keep both" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Display Preferences */}
      <SettingSection
        id="display-prefs"
        icon={LayoutGrid}
        title="Display Preferences"
        description="How files appear across your drive."
      >
        <SettingRow
          label="Default View"
          description="Default layout for file listings."
        >
          <SettingSelect
            value={defaultView}
            onChange={setDefaultView}
            options={[
              { value: "grid", label: "Grid view" },
              { value: "list", label: "List view" },
              { value: "compact", label: "Compact list" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Default Sort"
          description="How files are ordered by default."
        >
          <SettingSelect
            value={defaultSort}
            onChange={setDefaultSort}
            options={[
              { value: "modified-desc", label: "Last modified (newest)" },
              { value: "modified-asc", label: "Last modified (oldest)" },
              { value: "name-asc", label: "Name (A → Z)" },
              { value: "name-desc", label: "Name (Z → A)" },
              { value: "size-desc", label: "Size (largest)" },
              { value: "size-asc", label: "Size (smallest)" },
              { value: "type", label: "File type" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="Folders First"
          description="Always show folders before files regardless of sort order."
        >
          <SettingToggle checked={foldersFirst} onChange={setFoldersFirst} />
        </SettingRow>
      </SettingSection>

      {/* Previews & Thumbnails */}
      <SettingSection
        id="thumbnails"
        icon={Image}
        title="Previews & Thumbnails"
        description="Control visual previews for your files."
      >
        <SettingRow
          label="Thumbnail Generation"
          description="Automatically generate visual previews for files."
        >
          <SettingSelect
            value={thumbnails}
            onChange={setThumbnails}
            options={[
              { value: "all", label: "All file types" },
              { value: "images", label: "Images only" },
              { value: "disabled", label: "Disabled" },
            ]}
          />
        </SettingRow>

        <SettingRow
          label="File Click Behavior"
          description="What happens when you click a file."
        >
          <SettingSelect
            value={previewBehavior}
            onChange={setPreviewBehavior}
            options={[
              { value: "preview", label: "Preview in-app" },
              { value: "download", label: "Download immediately" },
              { value: "ask", label: "Ask every time" },
            ]}
          />
        </SettingRow>
      </SettingSection>

      {/* Auto-Tagging */}
      <SettingSection
        id="auto-tagging"
        icon={Tag}
        title="Automatic Tagging"
        description="AI-powered file categorization and tagging."
      >
        <SettingRow
          label="Tagging Level"
          description="How Drivya categorizes your files."
          vertical
        >
          <SettingRadioGroup
            value={autoTagging}
            onChange={setAutoTagging}
            options={[
              {
                value: "full",
                label: "Full Auto-Tagging",
                description:
                  "AI analyzes content: image recognition, OCR, document topics, audio transcription.",
              },
              {
                value: "metadata",
                label: "Metadata Only",
                description:
                  "Tags based on file type, date, and size. No content analysis.",
              },
              {
                value: "disabled",
                label: "Disabled",
                description:
                  "No automatic tags. You can still add tags manually.",
              },
            ]}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
}
