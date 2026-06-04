-- 0016_monster_location_to_zone_code
-- 몬스터 Monster.location 을 구 지역명(twilight_forest 등) → 신 Zone.code(silvanhome_entrance 등)로 정합화.
-- 하이브리드 매핑(테마 region 우선 + 레벨 적합 존 배치)을 tools/seed/monsterLocationMigration.mjs 로 결정적 산출,
-- tools/seed/monster-location-map.generated.json 을 SSOT 로 시드 리터럴과 본 SQL 을 동시 생성(둘이 항상 일치).
-- code 기준 UPDATE 라 멱등하며, 대상 행이 없으면 0행 갱신(무해). #208 levelRange 폴백은 미배정 존(11개) 안전망으로 존치.
-- 총 193마리 → 32개 Zone.code.

BEGIN;

-- abyss_core (11)
UPDATE "monsters" SET "location" = 'abyss_core' WHERE "code" IN ('MON_BOSS_VA01', 'MON_BOSS_VA02', 'MON_FB_005', 'MON_RAID_001', 'MON_RAID_002', 'MON_RAID_003', 'MON_VA_008', 'MON_VA_009', 'MON_VA_010', 'MON_VA_E02', 'MON_VA_E03');

-- abyss_gate (2)
UPDATE "monsters" SET "location" = 'abyss_gate' WHERE "code" IN ('MON_VA_001', 'MON_VA_002');

-- abyss_library (1)
UPDATE "monsters" SET "location" = 'abyss_library' WHERE "code" IN ('MON_VA_005');

-- abyss_sunken_streets (2)
UPDATE "monsters" SET "location" = 'abyss_sunken_streets' WHERE "code" IN ('MON_VA_003', 'MON_VA_004');

-- abyss_trial_hall (3)
UPDATE "monsters" SET "location" = 'abyss_trial_hall' WHERE "code" IN ('MON_VA_006', 'MON_VA_007', 'MON_VA_E01');

-- argentium_market (5)
UPDATE "monsters" SET "location" = 'argentium_market' WHERE "code" IN ('MON_TF_001', 'MON_TF_002', 'MON_TF_003', 'MON_TF_004', 'MON_TF_005');

-- argentium_plaza (2)
UPDATE "monsters" SET "location" = 'argentium_plaza' WHERE "code" IN ('MON_KC_001', 'MON_TF_006');

-- argentium_sewer (1)
UPDATE "monsters" SET "location" = 'argentium_sewer' WHERE "code" IN ('MON_TF_007');

-- argentium_tower (1)
UPDATE "monsters" SET "location" = 'argentium_tower' WHERE "code" IN ('MON_KC_002');

-- britallia_arena (1)
UPDATE "monsters" SET "location" = 'britallia_arena' WHERE "code" IN ('MON_FB_002');

-- britallia_blackmarket (5)
UPDATE "monsters" SET "location" = 'britallia_blackmarket' WHERE "code" IN ('MON_BOSS_KC01', 'MON_BOSS_KC02', 'MON_KC_009', 'MON_KC_010', 'MON_KC_E03');

-- britallia_port (8)
UPDATE "monsters" SET "location" = 'britallia_port' WHERE "code" IN ('MON_KC_003', 'MON_KC_004', 'MON_KC_005', 'MON_KC_006', 'MON_KC_007', 'MON_KC_008', 'MON_KC_E01', 'MON_KC_E02');

-- erebos_catacomb (5)
UPDATE "monsters" SET "location" = 'erebos_catacomb' WHERE "code" IN ('MON_SF_004', 'MON_SF_005', 'MON_SF_006', 'MON_SF_007', 'MON_SF_E01');

-- erebos_cathedral (5)
UPDATE "monsters" SET "location" = 'erebos_cathedral' WHERE "code" IN ('MON_AV_010', 'MON_AV_E04', 'MON_BOSS_AV01', 'MON_BOSS_AV02', 'MON_SF_003');

-- erebos_center (5)
UPDATE "monsters" SET "location" = 'erebos_center' WHERE "code" IN ('MON_AV_008', 'MON_AV_009', 'MON_AV_E02', 'MON_AV_E03', 'MON_SF_002');

-- erebos_outskirts (7)
UPDATE "monsters" SET "location" = 'erebos_outskirts' WHERE "code" IN ('MON_AV_003', 'MON_AV_004', 'MON_AV_005', 'MON_AV_006', 'MON_AV_007', 'MON_AV_E01', 'MON_SF_001');

-- mist_sea_abyss (18)
UPDATE "monsters" SET "location" = 'mist_sea_abyss' WHERE "code" IN ('MON_BOSS_MS02', 'MON_BOSS_MS03', 'MON_BOSS_MS04', 'MON_BOSS_MS05', 'MON_MS_009', 'MON_MS_010', 'MON_MS_016', 'MON_MS_017', 'MON_MS_018', 'MON_MS_019', 'MON_MS_020', 'MON_MS_E02', 'MON_MS_E03', 'MON_MS_E04', 'MON_MS_E05', 'MON_RAID_MS01', 'MON_RAID_MS02', 'MON_RAID_MS03');

-- mist_sea_archipelago (7)
UPDATE "monsters" SET "location" = 'mist_sea_archipelago' WHERE "code" IN ('MON_MS_002', 'MON_MS_003', 'MON_MS_004', 'MON_MS_005', 'MON_MS_006', 'MON_MS_011', 'MON_MS_012');

-- mist_sea_lighthouse (1)
UPDATE "monsters" SET "location" = 'mist_sea_lighthouse' WHERE "code" IN ('MON_MS_001');

-- mist_sea_spire (7)
UPDATE "monsters" SET "location" = 'mist_sea_spire' WHERE "code" IN ('MON_BOSS_MS01', 'MON_MS_007', 'MON_MS_008', 'MON_MS_013', 'MON_MS_014', 'MON_MS_015', 'MON_MS_E01');

-- northland_cave (4)
UPDATE "monsters" SET "location" = 'northland_cave' WHERE "code" IN ('MON_CC_006', 'MON_CC_007', 'MON_CC_008', 'MON_CC_E02');

-- northland_peak (7)
UPDATE "monsters" SET "location" = 'northland_peak' WHERE "code" IN ('MON_BOSS_CC01', 'MON_BOSS_CC02', 'MON_CC_009', 'MON_CC_010', 'MON_CC_E03', 'MON_CC_E04', 'MON_FB_004');

-- northland_village (4)
UPDATE "monsters" SET "location" = 'northland_village' WHERE "code" IN ('MON_CC_003', 'MON_CC_004', 'MON_CC_005', 'MON_CC_E01');

-- rift_core (28)
UPDATE "monsters" SET "location" = 'rift_core' WHERE "code" IN ('MON_TR_018', 'MON_TR_019', 'MON_TR_020', 'MON_TR_BOSS_002', 'MON_TR_BOSS_003', 'MON_TR_BOSS_004', 'MON_TR_BOSS_005', 'MON_TR_ELITE_001', 'MON_TR_ELITE_002', 'MON_TR_ELITE_003', 'MON_TR_ELITE_004', 'MON_TR_ELITE_005', 'boss_abyss_guardian', 'boss_chrono_serpent', 'boss_leviathan_prime', 'boss_memory_colossus', 'boss_void_empress', 'elite_chrono_hydra', 'elite_leviathan_spawn', 'elite_memory_kraken', 'elite_temporal_lord', 'elite_void_whale', 'mob_abyssal_mimic', 'mob_brine_elemental', 'mob_chrono_nautilus', 'mob_echo_manta', 'mob_forgotten_diver', 'mob_pressure_serpent');

-- rift_frozen_battlefield (9)
UPDATE "monsters" SET "location" = 'rift_frozen_battlefield' WHERE "code" IN ('MON_TR_006', 'MON_TR_007', 'MON_TR_008', 'MON_TR_009', 'MON_TR_010', 'MON_TR_011', 'mob_abyss_angler', 'mob_chrono_barnacle', 'mob_memory_eel');

-- rift_mirror_city (5)
UPDATE "monsters" SET "location" = 'rift_mirror_city' WHERE "code" IN ('MON_TR_001', 'MON_TR_002', 'MON_TR_003', 'MON_TR_004', 'MON_TR_005');

-- rift_reverse_forest (18)
UPDATE "monsters" SET "location" = 'rift_reverse_forest' WHERE "code" IN ('MON_TR_012', 'MON_TR_013', 'MON_TR_014', 'MON_TR_015', 'MON_TR_016', 'MON_TR_017', 'MON_TR_BOSS_001', 'mob_abyss_urchin', 'mob_coral_golem', 'mob_drift_phantom', 'mob_forgotten_wraith', 'mob_memory_leech', 'mob_memory_starfish', 'mob_temporal_polyp', 'mob_time_jellyfish', 'mob_void_anemone', 'mob_void_crab', 'mob_warp_squid');

-- silvanhome_entrance (8)
UPDATE "monsters" SET "location" = 'silvanhome_entrance' WHERE "code" IN ('MON_BOSS_TF01', 'MON_BOSS_TF02', 'MON_TF_008', 'MON_TF_009', 'MON_TF_010', 'MON_TF_E01', 'MON_TF_E02', 'MON_TF_E03');

-- silvanhome_mist (2)
UPDATE "monsters" SET "location" = 'silvanhome_mist' WHERE "code" IN ('MON_AV_001', 'MON_FB_001');

-- silvanhome_sanctum (1)
UPDATE "monsters" SET "location" = 'silvanhome_sanctum' WHERE "code" IN ('MON_AV_002');

-- solaris_mine (2)
UPDATE "monsters" SET "location" = 'solaris_mine' WHERE "code" IN ('MON_CC_001', 'MON_SF_008');

-- solaris_temple (8)
UPDATE "monsters" SET "location" = 'solaris_temple' WHERE "code" IN ('MON_BOSS_SF01', 'MON_BOSS_SF02', 'MON_CC_002', 'MON_FB_003', 'MON_SF_009', 'MON_SF_010', 'MON_SF_E02', 'MON_SF_E03');

COMMIT;
