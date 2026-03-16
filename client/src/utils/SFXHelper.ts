/**
 * SFXHelper — P34-A: SFX/Voice 재생 유틸리티
 *
 * 간편한 사운드 재생 헬퍼. SoundManager 또는 직접 Phaser.Sound 사용.
 */

import * as Phaser from 'phaser';

/**
 * 간편 SFX 재생 — 키가 로드되어 있으면 재생, 없으면 무시
 */
export function playSfx(scene: Phaser.Scene, key: string, volume = 0.5): void {
  if (scene.cache.audio.has(key)) {
    scene.sound.play(key, { volume });
  }
}

/**
 * 랜덤 Voice 재생 — 주어진 키 배열에서 랜덤으로 하나 선택하여 재생
 */
export function playRandomVoice(scene: Phaser.Scene, keys: string[], volume = 0.6): void {
  const available = keys.filter(k => scene.cache.audio.has(k));
  if (available.length === 0) return;
  const key = available[Math.floor(Math.random() * available.length)];
  scene.sound.play(key, { volume });
}

/**
 * UI SFX 키 상수 (soundManifest 키 기준)
 */
export const UI_SFX = {
  CLICK: 'sfx_ui_click',
  HOVER: 'sfx_ui_hover',
  OPEN: 'sfx_ui_open',
  CLOSE: 'sfx_ui_close',
  CONFIRM: 'sfx_ui_confirm',
  CANCEL: 'sfx_ui_cancel',
  ERROR: 'sfx_ui_error',
  LEVEL_UP: 'sfx_ui_level_up',
  ACHIEVEMENT: 'sfx_ui_achievement',
  QUEST_ACCEPT: 'sfx_ui_quest_accept',
  QUEST_COMPLETE: 'sfx_ui_quest_complete',
  ITEM_PICKUP: 'sfx_ui_item_pickup',
  ITEM_EQUIP: 'sfx_ui_item_equip',
  GOLD_GAIN: 'sfx_ui_gold_gain',
  NOTIFICATION: 'sfx_ui_notification',
} as const;

/**
 * 전투 Voice 키 상수 (soundManifest 키 기준)
 */
export const COMBAT_VOICE = {
  ATTACK: ['voice_combat_attack_1', 'voice_combat_attack_2'],
  HIT: ['voice_combat_hit_1', 'voice_combat_hit_2'],
  CRITICAL: 'voice_combat_critical',
  SKILL_CAST: 'voice_combat_skill_cast',
  ULTIMATE: 'voice_combat_ultimate',
  DODGE: 'voice_combat_dodge',
  DEATH: 'voice_combat_death',
  VICTORY: 'voice_combat_victory',
} as const;

/**
 * NPC Voice 키 매핑
 */
export const NPC_VOICE: Record<string, string> = {
  blacksmith: 'voice_npc_blacksmith_greet',
  merchant: 'voice_npc_merchant_greet',
  quest_board: 'voice_npc_quest_giver_greet',
  party_recruit: 'voice_npc_guard_greet',
  elder: 'voice_npc_mateus_greet',
};
