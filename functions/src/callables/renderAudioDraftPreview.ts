/**
 * Sound Platform — renderAudioDraftPreview Callable Cloud Function
 * ==================================================================
 * Phase:   8-L.1 (Draft Render Pipeline)
 * Created: 2026-05-30
 *
 * WHAT THIS FUNCTION DOES:
 *   Renders a real audio preview for a draft at a given stage (edit, effects,
 *   mixing, or final) using server-side FFmpeg. The user hears the actual
 *   rendered audio BEFORE publishing — no surprises after publish.
 *
 * CALLER CONTRACT:
 *   Input:  RenderDraftPreviewRequest { draftId, stage }
 *   Output: RenderDraftPreviewResponse { stage, status, playbackUrl?, durationMs?, error? }
 *   Auth:   required
 *
 * STAGE INPUT CHAIN:
 *   edit    → original upload  → applyTrimCut
 *   effects → edit preview (or original) → transcodeWithEffects
 *   mixing  → effects preview (or edit/original) → applyMixingMaster + mixMultiTrack
 *   final   → latest enabled stage preview (or render upstream first)
 *
 * STORAGE OUTPUT:
 *   audioPreviews/{uid}/{draftId}/{stage}/{stage}.m4a
 *
 * SECURITY:
 *   - Auth required. Draft must belong to caller.
 *   - Previews are private — playback via download-token signed URL.
 *   - Original upload is never modified.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import type {
  AudioDraftDoc,
  AudioEffectsConfig,
  AudioMixingConfig,
  AudioEditConfig,
  AudioSfxItem,
  RenderDraftPreviewRequest,
  RenderDraftPreviewResponse,
  PreviewStage,
  AudioDraftPreviewAsset,
} from '@sound/shared';
import {
  buildEffectsChain,
  getRequestedFilterIds,
  getMixingMasterOps,
  buildMixingFFmpegChain,
} from '@sound/shared';
import {
  probeAudio,
  transcodeToAAC,
  transcodeWithEffects,
  applyMixingMaster,
  applyTrimCut,
  mixMultiTrack,
} from '../processing/audioProcessor';
import type { MultiTrackLayer } from '../processing/audioProcessor';

// ── Constants ────────────────────────────────────────────────────────────────
const db = admin.firestore();
const storage = admin.storage();
const VALID_STAGES: PreviewStage[] = ['edit', 'effects', 'mixing', 'final'];

// ── Callable ─────────────────────────────────────────────────────────────────

export const renderAudioDraftPreview = functions
  .runWith({ memory: '1GB', timeoutSeconds: 300 })
  .region('us-central1')
  .https.onCall(
    async (
      data: RenderDraftPreviewRequest,
      context: functions.https.CallableContext,
    ): Promise<RenderDraftPreviewResponse> => {
      // ── 1. Auth ──────────────────────────────────────────────────────────
      if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
      }
      const uid = context.auth.uid;

      // ── 2. Validate input ────────────────────────────────────────────────
      if (!data.draftId || typeof data.draftId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'draftId is required.');
      }
      if (!data.stage || !VALID_STAGES.includes(data.stage)) {
        throw new functions.https.HttpsError('invalid-argument', `stage must be one of: ${VALID_STAGES.join(', ')}`);
      }

      const { draftId, stage } = data;

      // ── 3. Read draft and verify ownership ───────────────────────────────
      const draftRef = db.collection('drafts').doc(uid).collection('drafts').doc(draftId);
      const draftSnap = await draftRef.get();
      if (!draftSnap.exists) {
        throw new functions.https.HttpsError('not-found', `Draft ${draftId} not found.`);
      }
      const draft = draftSnap.data() as AudioDraftDoc;
      if (draft.ownerUid !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'You can only render your own drafts.');
      }

      // ── 4. Validate audio asset exists ───────────────────────────────────
      const audioAsset = draft.audioAsset;
      if (!audioAsset?.storagePath) {
        throw new functions.https.HttpsError('failed-precondition', 'Draft must have an uploaded audio asset.');
      }

      const editConfig = draft.editConfig as AudioEditConfig | undefined;
      const effectsConfig = draft.effectsConfig as AudioEffectsConfig | undefined;
      const mixingConfig = draft.mixingConfig as AudioMixingConfig | undefined;
      const previewAssets = draft.previewAssets || {};

      // ── 5. Mark rendering ────────────────────────────────────────────────
      await draftRef.update({
        [`previewAssets.${stage}.status`]: 'rendering',
        [`previewAssets.${stage}.stage`]: stage,
        [`previewAssets.${stage}.error`]: admin.firestore.FieldValue.delete(),
      });

      const bucket = storage.bucket();
      const tmpDir = os.tmpdir();
      const outputStoragePath = `audioPreviews/${uid}/${draftId}/${stage}/${stage}.m4a`;
      const tmpOutput = path.join(tmpDir, `${draftId}_preview_${stage}.m4a`);

      try {
        // ── 6. Resolve input source for this stage ───────────────────────
        let inputPath: string;

        if (stage === 'edit') {
          // Input is always the original upload
          inputPath = path.join(tmpDir, `${draftId}_original_for_edit${path.extname(audioAsset.storagePath)}`);
          await bucket.file(audioAsset.storagePath).download({ destination: inputPath });

        } else if (stage === 'effects') {
          // Input is edit preview if edit enabled, else original
          if (editConfig?.enabled) {
            if (previewAssets.edit?.status !== 'ready' || !previewAssets.edit?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة القص أولاً (Render edit preview first)');
              return { stage, status: 'failed', error: 'يجب معاينة القص أولاً (Render edit preview first)' };
            }
            inputPath = path.join(tmpDir, `${draftId}_edit_for_effects.m4a`);
            await bucket.file(previewAssets.edit.storagePath).download({ destination: inputPath });
          } else {
            inputPath = path.join(tmpDir, `${draftId}_original_for_effects${path.extname(audioAsset.storagePath)}`);
            await bucket.file(audioAsset.storagePath).download({ destination: inputPath });
          }

        } else if (stage === 'mixing') {
          // Input chain: effects → edit → original
          if (effectsConfig?.enabled) {
            if (previewAssets.effects?.status !== 'ready' || !previewAssets.effects?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة المؤثرات أولاً (Render effects preview first)');
              return { stage, status: 'failed', error: 'يجب معاينة المؤثرات أولاً (Render effects preview first)' };
            }
            inputPath = path.join(tmpDir, `${draftId}_effects_for_mixing.m4a`);
            await bucket.file(previewAssets.effects.storagePath).download({ destination: inputPath });
          } else if (editConfig?.enabled) {
            if (previewAssets.edit?.status !== 'ready' || !previewAssets.edit?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة القص أولاً (Render edit preview first)');
              return { stage, status: 'failed', error: 'يجب معاينة القص أولاً (Render edit preview first)' };
            }
            inputPath = path.join(tmpDir, `${draftId}_edit_for_mixing.m4a`);
            await bucket.file(previewAssets.edit.storagePath).download({ destination: inputPath });
          } else {
            inputPath = path.join(tmpDir, `${draftId}_original_for_mixing${path.extname(audioAsset.storagePath)}`);
            await bucket.file(audioAsset.storagePath).download({ destination: inputPath });
          }

        } else {
          // 'final' — use the latest enabled stage's preview, or original
          if (mixingConfig?.enabled) {
            if (previewAssets.mixing?.status !== 'ready' || !previewAssets.mixing?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة المكساج أولاً (Render mixing preview first)');
              return { stage, status: 'failed', error: 'يجب معاينة المكساج أولاً (Render mixing preview first)' };
            }
            inputPath = path.join(tmpDir, `${draftId}_mixing_for_final.m4a`);
            await bucket.file(previewAssets.mixing.storagePath).download({ destination: inputPath });
          } else if (effectsConfig?.enabled) {
            if (previewAssets.effects?.status !== 'ready' || !previewAssets.effects?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة المؤثرات أولاً');
              return { stage, status: 'failed', error: 'يجب معاينة المؤثرات أولاً' };
            }
            inputPath = path.join(tmpDir, `${draftId}_effects_for_final.m4a`);
            await bucket.file(previewAssets.effects.storagePath).download({ destination: inputPath });
          } else if (editConfig?.enabled) {
            if (previewAssets.edit?.status !== 'ready' || !previewAssets.edit?.storagePath) {
              await markFailed(draftRef, stage, 'يجب معاينة القص أولاً');
              return { stage, status: 'failed', error: 'يجب معاينة القص أولاً' };
            }
            inputPath = path.join(tmpDir, `${draftId}_edit_for_final.m4a`);
            await bucket.file(previewAssets.edit.storagePath).download({ destination: inputPath });
          } else {
            inputPath = path.join(tmpDir, `${draftId}_original_for_final${path.extname(audioAsset.storagePath)}`);
            await bucket.file(audioAsset.storagePath).download({ destination: inputPath });
          }
        }

        functions.logger.info(`[renderPreview] ${draftId}/${stage}: input resolved.`, { inputPath: path.basename(inputPath) });

        // ── 7. Apply stage-specific processing ─────────────────────────
        if (stage === 'edit') {
          await renderEditStage(inputPath, tmpOutput, editConfig);
        } else if (stage === 'effects') {
          await renderEffectsStage(inputPath, tmpOutput, effectsConfig);
        } else if (stage === 'mixing') {
          await renderMixingStage(inputPath, tmpOutput, mixingConfig, uid, draftId, bucket, tmpDir);
        } else {
          // 'final' — just transcode to AAC (input is already processed)
          await transcodeToAAC(inputPath, tmpOutput);
        }

        // ── 8. Probe output ────────────────────────────────────────────
        const outputProbe = await probeAudio(tmpOutput);
        const outputStat = fs.statSync(tmpOutput);

        functions.logger.info(`[renderPreview] ${draftId}/${stage}: rendered.`, {
          durationMs: outputProbe.durationMs,
          sizeBytes: outputStat.size,
        });

        // ── 9. Upload to Storage ───────────────────────────────────────
        await bucket.upload(tmpOutput, {
          destination: outputStoragePath,
          metadata: {
            contentType: 'audio/mp4',
            metadata: {
              processedBy: 'renderAudioDraftPreview',
              stage,
              draftId,
            },
          },
        });

        // ── 10. Generate signed playback URL ───────────────────────────
        const playbackUrl = await generatePlaybackUrl(bucket, outputStoragePath);

        // ── 11. Determine if this is the final preview ─────────────────
        const isHighestStage = determineIfFinalPreview(stage, editConfig, effectsConfig, mixingConfig);

        // ── 12. Update draft with preview metadata ─────────────────────
        const now = new Date().toISOString();
        const previewAsset: AudioDraftPreviewAsset = {
          stage,
          storagePath: outputStoragePath,
          durationMs: outputProbe.durationMs,
          mimeType: 'audio/mp4',
          sizeBytes: outputStat.size,
          generatedAt: now,
          status: 'ready',
        };

        const updateObj: Record<string, unknown> = {
          [`previewAssets.${stage}`]: previewAsset,
        };
        if (isHighestStage) {
          updateObj.finalPreviewReady = true;
          updateObj.activePreviewStage = stage;
        }
        await draftRef.update(updateObj);

        // ── 13. Cleanup tmp ────────────────────────────────────────────
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch { /* ignore */ }
        try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch { /* ignore */ }

        return {
          stage,
          status: 'ready',
          playbackUrl,
          durationMs: outputProbe.durationMs,
          mimeType: 'audio/mp4',
          sizeBytes: outputStat.size,
        };

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        functions.logger.error(`[renderPreview] ${draftId}/${stage}: FAILED.`, { error: msg });
        await markFailed(draftRef, stage, msg.slice(0, 500));
        // Cleanup
        try { if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput); } catch { /* ignore */ }
        return { stage, status: 'failed', error: msg.slice(0, 500) };
      }
    },
  );

// ── Helper: mark stage as failed ──────────────────────────────────────────────

async function markFailed(
  draftRef: FirebaseFirestore.DocumentReference,
  stage: PreviewStage,
  error: string,
): Promise<void> {
  await draftRef.update({
    [`previewAssets.${stage}.status`]: 'failed',
    [`previewAssets.${stage}.error`]: error.slice(0, 500),
    finalPreviewReady: false,
  });
}

// ── Helper: generate download-token playback URL ──────────────────────────────

async function generatePlaybackUrl(
  bucket: ReturnType<typeof admin.storage.prototype.bucket>,
  filePath: string,
): Promise<string> {
  const file = bucket.file(filePath);
  const [metadata] = await file.getMetadata();
  let downloadToken = metadata.metadata?.firebaseStorageDownloadTokens as string | undefined;
  if (!downloadToken) {
    const newToken = crypto.randomUUID();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: newToken } });
    downloadToken = newToken;
  }
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}

// ── Helper: determine if this stage is the highest enabled stage ──────────────

function determineIfFinalPreview(
  stage: PreviewStage,
  editConfig?: AudioEditConfig,
  effectsConfig?: AudioEffectsConfig,
  mixingConfig?: AudioMixingConfig,
): boolean {
  if (stage === 'final') return true;
  if (stage === 'mixing') return true; // mixing is always the highest processing stage
  if (stage === 'effects' && !mixingConfig?.enabled) return true;
  if (stage === 'edit' && !effectsConfig?.enabled && !mixingConfig?.enabled) return true;
  return false;
}

// ── Stage renderers ───────────────────────────────────────────────────────────

async function renderEditStage(
  inputPath: string,
  outputPath: string,
  editConfig?: AudioEditConfig,
): Promise<void> {
  if (!editConfig?.enabled) {
    // No edit — just transcode to AAC
    await transcodeToAAC(inputPath, outputPath);
    return;
  }

  const hasTrim = (editConfig.trimStartMs && editConfig.trimStartMs > 0) ||
                  (editConfig.trimEndMs && editConfig.trimEndMs > 0);
  const hasCuts = editConfig.cuts && editConfig.cuts.length > 0;

  if (hasTrim || hasCuts) {
    const tmpTrimmed = outputPath.replace('.m4a', '_trimmed.m4a');
    const result = await applyTrimCut(inputPath, tmpTrimmed, {
      trimStartMs: editConfig.trimStartMs,
      trimEndMs: editConfig.trimEndMs,
      cuts: editConfig.cuts,
    });
    if (!result.editApplied) {
      throw new Error(`Trim/cut failed: ${result.error || 'unknown error'}`);
    }
    // Transcode trimmed to AAC output
    await transcodeToAAC(tmpTrimmed, outputPath);
    try { fs.unlinkSync(tmpTrimmed); } catch { /* ignore */ }
  } else {
    // Edit enabled but no actual edits — just transcode
    await transcodeToAAC(inputPath, outputPath);
  }
}

async function renderEffectsStage(
  inputPath: string,
  outputPath: string,
  effectsConfig?: AudioEffectsConfig,
): Promise<void> {
  if (!effectsConfig?.enabled) {
    await transcodeToAAC(inputPath, outputPath);
    return;
  }

  const chain = buildEffectsChain(effectsConfig);
  const filterIds = getRequestedFilterIds(effectsConfig);

  if (!chain) {
    // No actual filter chain — just transcode
    await transcodeToAAC(inputPath, outputPath);
    return;
  }

  const result = await transcodeWithEffects(inputPath, outputPath, chain, filterIds);
  if (!result.effectsApplied) {
    throw new Error(`Effects rendering failed: ${result.effectsError || 'unknown error'}`);
  }
}

async function renderMixingStage(
  inputPath: string,
  outputPath: string,
  mixingConfig?: AudioMixingConfig,
  uid?: string,
  draftId?: string,
  bucket?: ReturnType<typeof admin.storage.prototype.bucket>,
  tmpDir?: string,
): Promise<void> {
  if (!mixingConfig?.enabled) {
    await transcodeToAAC(inputPath, outputPath);
    return;
  }

  // Step 1: Transcode input to AAC first (as tmpMaster)
  const tmpMaster = outputPath.replace('.m4a', '_mixmaster.m4a');
  await transcodeToAAC(inputPath, tmpMaster);

  // Step 2: Apply master adjustments (volume, gain, fades)
  const mixOps = getMixingMasterOps(mixingConfig);
  if (mixOps.hasRenderableOps) {
    const probe = await probeAudio(tmpMaster);
    const mixChain = buildMixingFFmpegChain(mixOps, probe.durationMs);
    if (mixChain) {
      const result = await applyMixingMaster(tmpMaster, mixChain, mixOps.operationLabels);
      if (!result.mixApplied && result.error) {
        functions.logger.warn('[renderPreview] Master adjustments failed, continuing with base.', { error: result.error });
      }
    }
  }

  // Step 3: Multi-track mixing (music bed + SFX)
  if (bucket && tmpDir && uid && draftId) {
    const layers: MultiTrackLayer[] = [];

    // Download music bed if uploaded
    const musicTrack = (mixingConfig.tracks || []).find(
      (t) => t.type === 'musicBed' && t.sourceType === 'uploaded' && t.storagePath && t.enabled,
    );
    if (musicTrack?.storagePath) {
      try {
        const musicLocalPath = path.join(tmpDir, `${draftId}_preview_music.m4a`);
        await bucket.file(musicTrack.storagePath).download({ destination: musicLocalPath });
        layers.push({
          localPath: musicLocalPath,
          type: 'musicBed',
          volumeDb: musicTrack.volumeDb ?? 0,
          startMs: musicTrack.startMs ?? 0,
          label: musicTrack.fileName || 'music bed',
        });
      } catch (err) {
        functions.logger.warn('[renderPreview] Failed to download music bed.', { error: err });
      }
    }

    // Download SFX items
    const sfxItems = (mixingConfig.sfxItems || []).filter((s: AudioSfxItem) => s.enabled && s.storagePath);
    for (const sfx of sfxItems) {
      try {
        const sfxLocalPath = path.join(tmpDir, `${draftId}_preview_sfx_${sfx.id}.m4a`);
        await bucket.file(sfx.storagePath).download({ destination: sfxLocalPath });
        layers.push({
          localPath: sfxLocalPath,
          type: 'sfx',
          volumeDb: sfx.volumeDb ?? 0,
          startMs: sfx.startMs ?? 0,
          label: sfx.label || sfx.fileName || sfx.id,
        });
      } catch (err) {
        functions.logger.warn('[renderPreview] Failed to download SFX item.', { id: sfx.id, error: err });
      }
    }

    if (layers.length > 0) {
      const mtResult = await mixMultiTrack(tmpMaster, layers);
      if (!mtResult.mixApplied && mtResult.error) {
        functions.logger.warn('[renderPreview] Multi-track mix failed, using master-only.', { error: mtResult.error });
      }
    }
  }

  // Copy final tmpMaster to output
  fs.copyFileSync(tmpMaster, outputPath);
  try { fs.unlinkSync(tmpMaster); } catch { /* ignore */ }
}
