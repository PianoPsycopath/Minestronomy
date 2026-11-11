import { $ } from "./dom.js";
import { exportBedrockAddon } from "../export/McAddonExporter.js";

export class ExportPanel {
  constructor(app) {
    this.app = app;
    this.pendingTexBody = null;

    $("exportAddonBtn").onclick = async () => {
      const btn = $("exportAddonBtn");
      const prev = btn.textContent;
      btn.textContent = "Packaging...";
      await exportBedrockAddon(app.particleLoader, app.skyScene, "Minestronomy");
      btn.textContent = "Exported!";
      setTimeout(() => {
        btn.textContent = prev;
      }, 1400);
    };

    $("customTexInput").onchange = async e => {
      const file = e.target.files?.[0];
      if (!file || !this.pendingTexBody) return;
      await app.particleLoader.setCustomTextureFile(this.pendingTexBody, file);
      app.skyScene.syncStarboxTexturesFromLoader();
      this.renderTextureStatusList();
      e.target.value = "";
    };
  }

  textureEntries() {
    const { configs, starboxConfigs } = this.app.particleLoader;
    return [
      ...Object.entries(configs).map(([key, cfg]) => ({
        targetKey: key,
        label: key === "moon" ? "moon (4x2 phase atlas)" : `${key} (${cfg.material})`,
        cfg
      })),
      ...Object.entries(starboxConfigs).map(([faceKey, cfg]) => ({
        targetKey: `starbox_${faceKey}`,
        label: `starbox ${faceKey.toUpperCase()} (${cfg.material})`,
        cfg
      }))
    ];
  }

  renderTextureStatusList() {
    const list = $("texStatusList");
    if (!list || !this.app.particleLoader) return;
    list.innerHTML = "";

    for (const { targetKey, label, cfg } of this.textureEntries()) {
      const row = document.createElement("div");
      row.className = "tex-row";
      row.innerHTML = `
        <div class="tex-row-left">
          <span class="tex-body-name">${label}</span>
          <span class="tex-path-code">public/${cfg.texturePath}.png</span>
        </div>
        <div class="tex-row-right">
          <span class="tex-badge ${cfg.hasTextureFile ? "ok" : "fallback"}">
            ${cfg.hasTextureFile ? "PNG Loaded" : "Fallback"}
          </span>
          <button class="fc-copy-mini load-png-btn" type="button">Load PNG</button>
        </div>
      `;
      row.querySelector(".load-png-btn").onclick = () => {
        this.pendingTexBody = targetKey;
        $("customTexInput").click();
      };
      list.appendChild(row);
    }
  }
}
