import re
import sys

file_path = "apps/web/src/pages/create/AudioCreatePage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import for useCategories
if "useCategories" not in content:
    content = content.replace("import { useTranslation } from 'react-i18next';", "import { useTranslation } from 'react-i18next';\nimport { useCategories } from '../../hooks/useCategories';")

# 2. Move constants inside component
match = re.search(r'(const STEP_LABELS: Record<WizardStep, string> = \{.*?const SFX_SOURCE_OPTIONS = \[.*?\];)', content, re.DOTALL)
if match:
    constants_block = match.group(1)
    
    # Remove CATEGORIES and SUBCATEGORIES_BY_CATEGORY completely
    constants_block = re.sub(r'const CATEGORIES = \[.*?\];\n', '', constants_block, flags=re.DOTALL)
    constants_block = re.sub(r'const SUBCATEGORIES_BY_CATEGORY: Record<string, \{ id: string; label: string \}\[\]> = \{.*?\}];\n\}\n', '', constants_block, flags=re.DOTALL)
    # The previous regex might fail if the spacing is off. Let's do it safer.
    constants_block = re.sub(r'const CATEGORIES = \[.*?\];\n', '', constants_block, flags=re.DOTALL)
    # Actually, SUBCATEGORIES_BY_CATEGORY ends with "  }\n];\n}" or similar.
    constants_block = re.sub(r'const SUBCATEGORIES_BY_CATEGORY: Record<string, \{ id: string; label: string \}\[\]> = \{.*?\n\};\n', '', constants_block, flags=re.DOTALL)
    
    # Remove from global
    content = content.replace(match.group(1), "")
    
    # Insert inside component
    component_start_pattern = r'(export function AudioCreatePage\(\) \{\n)'
    
    insert_block = f"""  const {{ t }} = useTranslation();
  const {{ categoryOptions, getSubcategoryOptions }} = useCategories(world);

{constants_block}
"""
    # Use re.sub to inject right after export function AudioCreatePage() {
    content = re.sub(component_start_pattern, r'\1' + insert_block, content, count=1)

# 3. Replace CATEGORIES.map with categoryOptions.map
content = content.replace("CATEGORIES.map(c", "categoryOptions.map(c")
content = content.replace("c.label", "c.label")
content = content.replace("(SUBCATEGORIES_BY_CATEGORY[category] || []).map", "getSubcategoryOptions(category).map")

# 4. Remove 1-cut limit
content = content.replace("if (editCuts.length >= 1) return;", "if (editCuts.length >= 100) return;")

# 5. Fix Auto Ducking toggle
bad_toggle = """<label className="acp-toggle acp-toggle--sm">
                        <input type="checkbox" checked={autoDuckEnabled} onChange={e => setAutoDuckEnabled(e.target.checked)} />
                        <span className="acp-toggle__track" />
                      </label>"""
good_toggle = """<button type="button" className={`acp-toggle-switch acp-toggle-switch--sm ${autoDuckEnabled ? 'acp-toggle-switch--on' : ''}`} onClick={() => setAutoDuckEnabled(!autoDuckEnabled)}>
                        <span className="acp-toggle-switch__thumb" />
                      </button>"""
content = content.replace(bad_toggle, good_toggle)

# 6. Fix missing spaces
content = content.replace("{t('audiocreate:teleprompterAutocue')}<span", "{t('audiocreate:teleprompterAutocue')} <span")
content = content.replace("workspace_premium</span>\n              <span>", "workspace_premium</span>\n              <span> ")
content = content.replace("photo_camera</span> {t('audiocreate:camera')}<span", "photo_camera</span> {t('audiocreate:camera')} <span")
content = content.replace("auto_awesome</span> {t('audiocreate:intelligentShellAi')}<span", "auto_awesome</span> {t('audiocreate:intelligentShellAi')} <span")
content = content.replace("{t('audiocreate:intelligentGenerationAi')}<span", "{t('audiocreate:intelligentGenerationAi')} <span")
content = content.replace("teleprompter</span>\n              {t('audiocreate:youCanImportTeleprompterTextAsTranslatio')", "teleprompter</span> {t('audiocreate:youCanImportTeleprompterTextAsTranslatio')}")

# 7. Add controls to final preview
final_audio_bad = """<audio
                    ref={previewAudioRef}
                    src={previewAudioUrl}
                    style={{ display: 'none' }}
                    onEnded={() => setPreviewPlaying(false)}
                    onTimeUpdate={(e) => {
                      if (previewAudioUrl) {
                        setPreviewTimeMs(e.currentTarget.currentTime * 1000);
                      }
                    }}
                  />"""
final_audio_good = """<audio
                    ref={previewAudioRef}
                    src={getPreviewPlaybackUrl() || previewAudioUrl}
                    controls
                    style={{ width: '100%', marginTop: '1rem', height: '40px' }}
                    onEnded={() => setPreviewPlaying(false)}
                    onTimeUpdate={(e) => {
                      if (previewAudioUrl) {
                        setPreviewTimeMs(e.currentTarget.currentTime * 1000);
                      }
                    }}
                  />"""
content = content.replace(final_audio_bad, final_audio_good)

# 8. Fix SFX time input bug
sfx_input_bad = """<input type="text" className="acp-sfx-card__time-input"
                              value={formatMsToTimeInput(sfx.startMs)}
                              onChange={e => updateSfxItem(sfx.id, { startMs: parseTimeInputToMs(e.target.value) })}
                              placeholder="00:00.000" />"""
sfx_input_good = """<input type="text" className="acp-sfx-card__time-input"
                              key={`sfx-time-${sfx.id}-${sfx.startMs}`}
                              defaultValue={formatMsToTimeInput(sfx.startMs)}
                              onBlur={e => updateSfxItem(sfx.id, { startMs: parseTimeInputToMs(e.target.value) })}
                              placeholder="00:00.000" />"""
content = content.replace(sfx_input_bad, sfx_input_good)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done fixing AudioCreatePage.tsx")
