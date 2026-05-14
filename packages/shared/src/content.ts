/**
 * Sound Platform — Content Schema
 * ==================================
 * Phase:   4-H-1
 * Updated: 2026-05-14
 *
 * Content is the unified entity for all publishable media.
 * Access control is determined by:
 *   - published status (visible only when status == 'published')
 *   - privacy settings (owner-controlled)
 *   - moderation state (moderator-controlled)
 *   - world destination (General / Plus / Music / Radio)
 *
 * IMPORTANT: World destination does NOT gate viewing.
 *   - Plus content is readable by ANY authenticated user if published.
 *   - World controls PUBLISHING capabilities only.
 *   - Audio files are always served via signed URLs (Cloud Function).
 */

import type { WorldId, ContentTypeId, CapabilityModule } from './permissions';

export type ContentStatus =
  | 'draft'
  | 'under_review'
  | 'published'
  | 'rejected'
  | 'revision_required'
  | 'archived'
  | 'unavailable'
  | 'deleted_by_owner'
  | 'removed_by_moderation';

/** Core content document stored in Firestore `content/{contentId}`. */
export interface ContentDoc {
  id: string;
  ownerUid: string;
  channelId?: string;

  type: ContentTypeId;
  /** Destination world — controls publishing, NOT viewing */
  world: WorldId;
  /** Capability required to have published this — for audit purposes */
  publishedWithCapability: CapabilityModule | null;

  title: string;
  description?: string;
  tags: string[];
  language: string; // ISO 639-1

  status: ContentStatus;
  isExplicit: boolean;

  // Media refs (actual files served via signed URL from Cloud Function)
  mediaPath?: string;  // Storage path — never exposed to client directly
  coverUrl?: string;   // Public artwork URL (CDN or signed)
  durationSecs?: number;

  // Engagement (updated by Cloud Function aggregation)
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  playsCount: number;

  // Timestamps
  createdAt: string; // ISO
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;

  // Moderation
  moderationNote?: string;
  removedAt?: string;
  removedBy?: string;
}

/** Live session document stored in Firestore `liveSessions/{sessionId}`. */
export interface LiveSessionDoc {
  id: string;
  hostUid: string;
  /** World this session is hosted in — General (open) or Plus (requires plus_creator) */
  world: 'general' | 'plus';
  title: string;
  status: 'scheduled' | 'live' | 'ended' | 'archived' | 'cancelled';
  speakerLimit: number; // Admin-configurable
  listenerCount: number;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}
