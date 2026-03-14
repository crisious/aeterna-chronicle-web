/**
 * P28-03: 오디오 씬 연결 — BGM 42곡 + SFX 75개 씬별/이벤트별 자동 매핑
 *
 * SoundManager + soundManifest를 활용하여:
 * - 존/씬 진입 시 BGM 자동 재생 (크로스페이드)
 * - 전투/UI/환경 이벤트 발생 시 SFX 트리거
 * - 볼륨 설정 UI 연동
 */

import { SoundManager } from './SoundManager';

// ─── 씬별 BGM 매핑 ──────────────────────────────────────────────

export interface SceneBgmMapping {
  sceneKey: string;
  bgmKey: string;
  /** 존 하위 구역 (null이면 씬 전체) */
  subZone?: string;
  /** 크로스페이드 시간 ms (기본 1500) */
  crossfadeMs?: number;
}

/**
 * 10개 지역 + 시스템 씬의 BGM 매핑
 * soundManifest.ts의 키와 일치시킨다.
 */
export const SCENE_BGM_MAP: SceneBgmMapping[] = [
  // ── 탐색 BGM (12곡) ─────────────────────────────
  { sceneKey: 'GameScene',    bgmKey: 'bgm_erb_01', subZone: 'erebos' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_syl_01', subZone: 'sylvanheim' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_syl_02', subZone: 'sylvanheim_night' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_sol_01', subZone: 'solaris' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_sol_02', subZone: 'solaris_night' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_bor_01', subZone: 'boreal' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_bor_02', subZone: 'boreal_deep' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_arg_01', subZone: 'argentium' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_arg_02', subZone: 'argentium_underground' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_brt_01', subZone: 'britalia' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_brt_02', subZone: 'britalia_tavern' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_plt_01', subZone: 'plateau_oblivion' },
  { sceneKey: 'GameScene',    bgmKey: 'bgm_village', subZone: 'village' },

  // ── 전투 BGM (10곡) ─────────────────────────────
  { sceneKey: 'BattleScene',  bgmKey: 'bgm_erb_02' },
  { sceneKey: 'BattleScene',  bgmKey: 'bgm_erb_03', subZone: 'boss_memory_golem' },
  { sceneKey: 'BattleScene',  bgmKey: 'bgm_syl_03', subZone: 'boss_malatus' },
  { sceneKey: 'BattleScene',  bgmKey: 'bgm_sol_03', subZone: 'boss_lawar' },
  { sceneKey: 'BattleScene',  bgmKey: 'bgm_arg_03', subZone: 'boss_kain' },

  // ── 던전 BGM ────────────────────────────────────
  { sceneKey: 'DungeonScene', bgmKey: 'bgm_dungeon_01' },
  { sceneKey: 'DungeonScene', bgmKey: 'bgm_dungeon_02', subZone: 'deep' },
  { sceneKey: 'DungeonScene', bgmKey: 'bgm_dungeon_03', subZone: 'boss_room' },

  // ── 시스템 씬 BGM ───────────────────────────────
  { sceneKey: 'MainMenuScene',       bgmKey: 'bgm_title' },
  { sceneKey: 'CharacterSelectScene', bgmKey: 'bgm_char_select' },
  { sceneKey: 'LobbyScene',          bgmKey: 'bgm_lobby' },
  { sceneKey: 'CutsceneScene',       bgmKey: 'bgm_cutscene_01' },
  { sceneKey: 'EndingScene',         bgmKey: 'bgm_ending_01' },
  { sceneKey: 'SettingsScene',       bgmKey: 'bgm_settings' },
  { sceneKey: 'WorldScene',          bgmKey: 'bgm_worldmap' },
];

// ─── 이벤트별 SFX 매핑 ──────────────────────────────────────────

export type SfxEvent =
  | 'attack_hit' | 'attack_miss' | 'attack_critical'
  | 'skill_cast' | 'skill_fire' | 'skill_ice' | 'skill_lightning' | 'skill_shadow' | 'skill_heal'
  | 'player_damage' | 'player_death' | 'player_levelup' | 'player_revive'
  | 'monster_death' | 'monster_aggro'
  | 'item_pickup' | 'item_equip' | 'item_unequip' | 'item_use'
  | 'gold_gain' | 'gold_spend'
  | 'enhance_success' | 'enhance_fail' | 'enhance_destroy'
  | 'quest_accept' | 'quest_complete' | 'quest_update'
  | 'ui_click' | 'ui_hover' | 'ui_open' | 'ui_close' | 'ui_error' | 'ui_confirm'
  | 'notification_popup' | 'notification_important'
  | 'chat_message' | 'party_invite' | 'trade_request'
  | 'env_footstep' | 'env_portal' | 'env_door' | 'env_chest_open'
  | 'env_rain' | 'env_wind' | 'env_thunder'
  | 'ether_crystal_resonate' | 'memory_fragment_absorb';

export const SFX_EVENT_MAP: Record<SfxEvent, string> = {
  // 전투
  attack_hit:          'sfx_attack_hit',
  attack_miss:         'sfx_attack_miss',
  attack_critical:     'sfx_attack_crit',
  skill_cast:          'sfx_skill_cast',
  skill_fire:          'sfx_skill_fire',
  skill_ice:           'sfx_skill_ice',
  skill_lightning:     'sfx_skill_lightning',
  skill_shadow:        'sfx_skill_shadow',
  skill_heal:          'sfx_skill_heal',
  player_damage:       'sfx_player_hurt',
  player_death:        'sfx_player_death',
  player_levelup:      'sfx_levelup',
  player_revive:       'sfx_revive',
  monster_death:       'sfx_monster_death',
  monster_aggro:       'sfx_monster_aggro',

  // 아이템
  item_pickup:         'sfx_item_pickup',
  item_equip:          'sfx_item_equip',
  item_unequip:        'sfx_item_unequip',
  item_use:            'sfx_item_use',
  gold_gain:           'sfx_gold_gain',
  gold_spend:          'sfx_gold_spend',

  // 강화
  enhance_success:     'sfx_enhance_success',
  enhance_fail:        'sfx_enhance_fail',
  enhance_destroy:     'sfx_enhance_destroy',

  // 퀘스트
  quest_accept:        'sfx_quest_accept',
  quest_complete:      'sfx_quest_complete',
  quest_update:        'sfx_quest_update',

  // UI
  ui_click:            'sfx_ui_click',
  ui_hover:            'sfx_ui_hover',
  ui_open:             'sfx_ui_open',
  ui_close:            'sfx_ui_close',
  ui_error:            'sfx_ui_error',
  ui_confirm:          'sfx_ui_confirm',

  // 알림
  notification_popup:    'sfx_notification',
  notification_important:'sfx_notification_urgent',

  // 소셜
  chat_message:        'sfx_chat_msg',
  party_invite:        'sfx_party_invite',
  trade_request:       'sfx_trade_req',

  // 환경
  env_footstep:        'sfx_footstep',
  env_portal:          'sfx_portal',
  env_door:            'sfx_door',
  env_chest_open:      'sfx_chest_open',
  env_rain:            'sfx_rain',
  env_wind:            'sfx_wind',
  env_thunder:         'sfx_thunder',

  // 에테르 특수
  ether_crystal_resonate: 'sfx_ether_resonate',
  memory_fragment_absorb: 'sfx_memory_absorb',
};

// ─── AudioSceneController ─────────────────────────────────────

/**
 * 각 Phaser.Scene에 연결되어 씬 라이프사이클에 따라
 * BGM 전환 + SFX 트리거를 자동 관리한다.
 */
export class AudioSceneController {
  private soundManager: SoundManager;
  private currentSceneKey: string = '';
  private currentSubZone: string = '';

  constructor(soundManager: SoundManager) {
    this.soundManager = soundManager;
  }

  /**
   * 씬 진입 시 호출 — 해당 씬의 BGM을 크로스페이드로 전환
   */
  onSceneEnter(sceneKey: string, subZone?: string): void {
    this.currentSceneKey = sceneKey;
    this.currentSubZone = subZone || '';

    const mapping = this.findBgmMapping(sceneKey, subZone);
    if (mapping) {
      this.soundManager.playBgm(mapping.bgmKey, {
        crossfadeMs: mapping.crossfadeMs ?? 1500,
      });
    }
  }

  /**
   * 존 내 서브존 전환 (씬 전환 없이 BGM만 변경)
   */
  onSubZoneChange(subZone: string): void {
    if (subZone === this.currentSubZone) return;
    this.currentSubZone = subZone;

    const mapping = this.findBgmMapping(this.currentSceneKey, subZone);
    if (mapping) {
      this.soundManager.playBgm(mapping.bgmKey, {
        crossfadeMs: mapping.crossfadeMs ?? 2000,
      });
    }
  }

  /**
   * 이벤트 기반 SFX 재생
   */
  playSfx(event: SfxEvent): void {
    const sfxKey = SFX_EVENT_MAP[event];
    if (sfxKey) {
      this.soundManager.playSfx(sfxKey);
    }
  }

  /**
   * 씬 퇴장 시 정리
   */
  onSceneExit(): void {
    this.currentSceneKey = '';
    this.currentSubZone = '';
  }

  private findBgmMapping(sceneKey: string, subZone?: string): SceneBgmMapping | undefined {
    // subZone이 있으면 정확 매칭 우선
    if (subZone) {
      const exact = SCENE_BGM_MAP.find(
        m => m.sceneKey === sceneKey && m.subZone === subZone,
      );
      if (exact) return exact;
    }
    // fallback: subZone 없는 기본 매핑
    return SCENE_BGM_MAP.find(
      m => m.sceneKey === sceneKey && !m.subZone,
    );
  }
}
