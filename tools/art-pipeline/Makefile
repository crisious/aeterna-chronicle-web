# ============================================================
# 에테르나 크로니클 — 에셋 빌드 시스템 (Art Pipeline Makefile)
# P15-16: 전체 파이프라인 오케스트레이션
# ============================================================
# 사용법:
#   make all                 # 전체 파이프라인 실행
#   make generate            # 프롬프트→이미지 생성만
#   make process             # 후처리만
#   make qa                  # QA 검증만
#   make assemble            # 시트 조립만
#   make catalog             # 카탈로그 갱신만
#   make characters          # 캐릭터 카테고리만
#   make monsters            # 몬스터 카테고리만
#   make environment         # 환경 카테고리만
#   make clean               # 빌드 아티팩트 정리
#   make status              # 빌드 상태 대시보드
# ============================================================

SHELL := /bin/bash
.DEFAULT_GOAL := all

# ── 경로 설정 ──────────────────────────────────────────────
ROOT_DIR       := $(shell cd ../.. && pwd)
PROMPTS_DIR    := $(ROOT_DIR)/assets/prompts
OUTPUT_DIR     := $(ROOT_DIR)/assets/generated
PROCESSED_DIR  := $(ROOT_DIR)/assets/processed
SHEETS_DIR     := $(ROOT_DIR)/assets/sheets
CATALOG_FILE   := $(ROOT_DIR)/assets/catalog.json
QA_REPORT_DIR  := $(ROOT_DIR)/assets/qa-reports
TOOLS_DIR      := $(ROOT_DIR)/tools/art-pipeline
LOG_DIR        := $(ROOT_DIR)/assets/build-logs

# ── 도구 경로 ──────────────────────────────────────────────
BATCH_GEN      := python3 $(TOOLS_DIR)/batch_generator.py
POSE_GEN       := python3 $(TOOLS_DIR)/pose_generator.py
POST_PROC      := python3 $(TOOLS_DIR)/post_process_pipeline.py
QA_RUNNER      := python3 $(TOOLS_DIR)/qa_runner.py
QA_CHECKER     := python3 $(TOOLS_DIR)/qa_checker.py
SHEET_ASM      := python3 $(TOOLS_DIR)/spritesheet_assembler.py
CATALOG_MGR    := python3 $(TOOLS_DIR)/asset_catalog.py
COLOR_CORR     := python3 $(TOOLS_DIR)/color_correct.py
REMOVE_BG      := python3 $(TOOLS_DIR)/remove_bg.py

# ── 엔진 설정 ──────────────────────────────────────────────
ENGINE         ?= sd
ENGINES        := sd dalle midjourney
PARALLEL_JOBS  ?= 4
RETRY_COUNT    ?= 3
RETRY_DELAY    ?= 30

# ── 카테고리 정의 ──────────────────────────────────────────
CATEGORIES     := characters monsters environment ui vfx
CHAR_SUBCATS   := class_main class_advanced npc npc_sprites sprites
MONSTER_SUBCATS := normal elite_boss raid_boss
ENV_SUBCATS    := tiles backgrounds

# ── 타임스탬프 ──────────────────────────────────────────────
TIMESTAMP      := $(shell date +%Y%m%d_%H%M%S)

# ============================================================
# 전체 파이프라인
# ============================================================
.PHONY: all generate process qa assemble catalog clean status

all: setup generate process qa assemble catalog report
	@echo "═══════════════════════════════════════════════"
	@echo " ✅ 전체 파이프라인 완료: $(TIMESTAMP)"
	@echo "═══════════════════════════════════════════════"

# ── 환경 준비 ──────────────────────────────────────────────
setup:
	@echo "🔧 빌드 환경 준비..."
	@mkdir -p $(OUTPUT_DIR) $(PROCESSED_DIR) $(SHEETS_DIR) $(QA_REPORT_DIR) $(LOG_DIR)
	@mkdir -p $(OUTPUT_DIR)/{characters,monsters,environment,ui,vfx}
	@mkdir -p $(PROCESSED_DIR)/{characters,monsters,environment,ui,vfx}
	@mkdir -p $(SHEETS_DIR)/{characters,monsters,environment}
	@echo "   디렉터리 구조 생성 완료"

# ============================================================
# 1단계: 생성 (프롬프트→이미지)
# ============================================================
generate: setup generate-characters generate-monsters generate-environment
	@echo "🎨 [1/5] 이미지 생성 단계 완료"

generate-characters:
	@echo "  📦 캐릭터 이미지 생성..."
	@for subcat in $(CHAR_SUBCATS); do \
		if [ -d "$(PROMPTS_DIR)/characters/$$subcat" ]; then \
			echo "    → characters/$$subcat"; \
			$(BATCH_GEN) \
				--input-dir "$(PROMPTS_DIR)/characters/$$subcat" \
				--output-dir "$(OUTPUT_DIR)/characters/$$subcat" \
				--engine $(ENGINE) \
				--parallel $(PARALLEL_JOBS) \
				--retry $(RETRY_COUNT) \
				--retry-delay $(RETRY_DELAY) \
				--log "$(LOG_DIR)/gen_characters_$${subcat}_$(TIMESTAMP).log" \
				2>&1 | tee -a "$(LOG_DIR)/generate_$(TIMESTAMP).log"; \
		fi; \
	done

generate-monsters:
	@echo "  📦 몬스터 이미지 생성..."
	@for subcat in $(MONSTER_SUBCATS); do \
		if [ -d "$(PROMPTS_DIR)/monsters/$$subcat" ]; then \
			echo "    → monsters/$$subcat"; \
			$(BATCH_GEN) \
				--input-dir "$(PROMPTS_DIR)/monsters/$$subcat" \
				--output-dir "$(OUTPUT_DIR)/monsters/$$subcat" \
				--engine $(ENGINE) \
				--parallel $(PARALLEL_JOBS) \
				--retry $(RETRY_COUNT) \
				--retry-delay $(RETRY_DELAY) \
				--log "$(LOG_DIR)/gen_monsters_$${subcat}_$(TIMESTAMP).log" \
				2>&1 | tee -a "$(LOG_DIR)/generate_$(TIMESTAMP).log"; \
		fi; \
	done

generate-environment:
	@echo "  📦 환경 이미지 생성..."
	@for subcat in $(ENV_SUBCATS); do \
		if [ -d "$(PROMPTS_DIR)/environment/$$subcat" ]; then \
			echo "    → environment/$$subcat"; \
			$(BATCH_GEN) \
				--input-dir "$(PROMPTS_DIR)/environment/$$subcat" \
				--output-dir "$(OUTPUT_DIR)/environment/$$subcat" \
				--engine $(ENGINE) \
				--parallel $(PARALLEL_JOBS) \
				--retry $(RETRY_COUNT) \
				--retry-delay $(RETRY_DELAY) \
				--log "$(LOG_DIR)/gen_env_$${subcat}_$(TIMESTAMP).log" \
				2>&1 | tee -a "$(LOG_DIR)/generate_$(TIMESTAMP).log"; \
		fi; \
	done

# ============================================================
# 2단계: 후처리 (배경제거→색보정)
# ============================================================
process: process-characters process-monsters process-environment
	@echo "🔄 [2/5] 후처리 단계 완료"

process-characters:
	@echo "  🖌️ 캐릭터 후처리..."
	@$(POST_PROC) \
		--input-dir "$(OUTPUT_DIR)/characters" \
		--output-dir "$(PROCESSED_DIR)/characters" \
		--steps "remove_bg,color_correct" \
		--palette-file "$(ROOT_DIR)/docs/art-production/style-guide.md" \
		--parallel $(PARALLEL_JOBS) \
		--log "$(LOG_DIR)/proc_characters_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/process_$(TIMESTAMP).log"

process-monsters:
	@echo "  🖌️ 몬스터 후처리..."
	@$(POST_PROC) \
		--input-dir "$(OUTPUT_DIR)/monsters" \
		--output-dir "$(PROCESSED_DIR)/monsters" \
		--steps "remove_bg,color_correct" \
		--palette-file "$(ROOT_DIR)/docs/art-production/style-guide.md" \
		--parallel $(PARALLEL_JOBS) \
		--log "$(LOG_DIR)/proc_monsters_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/process_$(TIMESTAMP).log"

process-environment:
	@echo "  🖌️ 환경 후처리..."
	@$(POST_PROC) \
		--input-dir "$(OUTPUT_DIR)/environment" \
		--output-dir "$(PROCESSED_DIR)/environment" \
		--steps "color_correct,seamless_check" \
		--palette-file "$(ROOT_DIR)/docs/art-production/style-guide.md" \
		--parallel $(PARALLEL_JOBS) \
		--log "$(LOG_DIR)/proc_env_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/process_$(TIMESTAMP).log"

# ============================================================
# 3단계: QA 검증
# ============================================================
qa: qa-resolution qa-alpha qa-palette qa-naming qa-seamless
	@echo "✅ [3/5] QA 검증 단계 완료"

qa-resolution:
	@echo "  🔍 해상도 검증..."
	@$(QA_RUNNER) --check resolution \
		--input-dir "$(PROCESSED_DIR)" \
		--report "$(QA_REPORT_DIR)/resolution_$(TIMESTAMP).json" \
		2>&1 | tee -a "$(LOG_DIR)/qa_$(TIMESTAMP).log"

qa-alpha:
	@echo "  🔍 알파 채널 검증..."
	@$(QA_RUNNER) --check alpha \
		--input-dir "$(PROCESSED_DIR)" \
		--report "$(QA_REPORT_DIR)/alpha_$(TIMESTAMP).json" \
		2>&1 | tee -a "$(LOG_DIR)/qa_$(TIMESTAMP).log"

qa-palette:
	@echo "  🔍 팔레트 준수 검증..."
	@$(QA_RUNNER) --check palette \
		--input-dir "$(PROCESSED_DIR)" \
		--palette-file "$(ROOT_DIR)/docs/art-production/style-guide.md" \
		--tolerance 15 \
		--report "$(QA_REPORT_DIR)/palette_$(TIMESTAMP).json" \
		2>&1 | tee -a "$(LOG_DIR)/qa_$(TIMESTAMP).log"

qa-naming:
	@echo "  🔍 네이밍 컨벤션 검증..."
	@$(QA_RUNNER) --check naming \
		--input-dir "$(PROCESSED_DIR)" \
		--convention "$(ROOT_DIR)/docs/art-production/naming-convention.md" \
		--report "$(QA_REPORT_DIR)/naming_$(TIMESTAMP).json" \
		2>&1 | tee -a "$(LOG_DIR)/qa_$(TIMESTAMP).log"

qa-seamless:
	@echo "  🔍 심리스 타일링 검증 (환경)..."
	@$(QA_RUNNER) --check seamless \
		--input-dir "$(PROCESSED_DIR)/environment" \
		--report "$(QA_REPORT_DIR)/seamless_$(TIMESTAMP).json" \
		2>&1 | tee -a "$(LOG_DIR)/qa_$(TIMESTAMP).log"

# ============================================================
# 4단계: 시트 조립
# ============================================================
assemble: assemble-sprites assemble-tiles
	@echo "📋 [4/5] 시트 조립 단계 완료"

assemble-sprites:
	@echo "  📐 스프라이트 시트 조립..."
	@$(SHEET_ASM) \
		--input-dir "$(PROCESSED_DIR)/characters/sprites" \
		--output-dir "$(SHEETS_DIR)/characters" \
		--grid "8x7" \
		--frame-size "64x64" \
		--log "$(LOG_DIR)/asm_sprites_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/assemble_$(TIMESTAMP).log"
	@$(SHEET_ASM) \
		--input-dir "$(PROCESSED_DIR)/monsters" \
		--output-dir "$(SHEETS_DIR)/monsters" \
		--grid "5x4" \
		--frame-size "64x64" \
		--log "$(LOG_DIR)/asm_monsters_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/assemble_$(TIMESTAMP).log"

assemble-tiles:
	@echo "  📐 타일셋 시트 조립..."
	@$(SHEET_ASM) \
		--input-dir "$(PROCESSED_DIR)/environment/tiles" \
		--output-dir "$(SHEETS_DIR)/environment" \
		--mode "autotile" \
		--tile-size "32x32" \
		--grid "3x3" \
		--log "$(LOG_DIR)/asm_tiles_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/assemble_$(TIMESTAMP).log"

# ============================================================
# 5단계: 카탈로그 갱신
# ============================================================
catalog:
	@echo "📚 [5/5] 카탈로그 갱신..."
	@$(CATALOG_MGR) update \
		--scan-dir "$(PROCESSED_DIR)" \
		--sheets-dir "$(SHEETS_DIR)" \
		--catalog "$(CATALOG_FILE)" \
		--qa-dir "$(QA_REPORT_DIR)" \
		--log "$(LOG_DIR)/catalog_$(TIMESTAMP).log" \
		2>&1 | tee -a "$(LOG_DIR)/catalog_$(TIMESTAMP).log"
	@echo "   카탈로그 갱신 완료: $(CATALOG_FILE)"

# ============================================================
# 리포트 + 상태
# ============================================================
report:
	@echo ""
	@echo "═══════════════════════════════════════════════"
	@echo " 📊 빌드 리포트 — $(TIMESTAMP)"
	@echo "═══════════════════════════════════════════════"
	@echo " 생성 이미지:  $$(find $(OUTPUT_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ') files"
	@echo " 후처리 완료:  $$(find $(PROCESSED_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ') files"
	@echo " 시트 조립:    $$(find $(SHEETS_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ') sheets"
	@echo " QA 리포트:    $$(find $(QA_REPORT_DIR) -name '*.json' 2>/dev/null | wc -l | tr -d ' ') reports"
	@echo " 로그:         $(LOG_DIR)"
	@echo "═══════════════════════════════════════════════"

status:
	@echo "📊 에셋 빌드 현황"
	@echo "────────────────────────────────────────────"
	@echo " 프롬프트 파일: $$(find $(PROMPTS_DIR) -name '*.json' 2>/dev/null | wc -l | tr -d ' ')"
	@echo " 생성 이미지:   $$(find $(OUTPUT_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
	@echo " 후처리 완료:   $$(find $(PROCESSED_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
	@echo " 시트:          $$(find $(SHEETS_DIR) -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
	@echo " 카탈로그:      $$(python3 -c "import json; d=json.load(open('$(CATALOG_FILE)')); print(len(d.get('assets',[])))" 2>/dev/null || echo 'N/A')"
	@echo "────────────────────────────────────────────"

# ============================================================
# 카테고리별 바로가기
# ============================================================
.PHONY: characters monsters environment ui vfx

characters: setup generate-characters process-characters
	@$(QA_RUNNER) --check resolution,alpha,palette,naming \
		--input-dir "$(PROCESSED_DIR)/characters" \
		--report "$(QA_REPORT_DIR)/characters_$(TIMESTAMP).json"
	@$(SHEET_ASM) --input-dir "$(PROCESSED_DIR)/characters/sprites" \
		--output-dir "$(SHEETS_DIR)/characters" --grid "8x7" --frame-size "64x64"
	@echo "✅ 캐릭터 카테고리 빌드 완료"

monsters: setup generate-monsters process-monsters
	@$(QA_RUNNER) --check resolution,alpha,palette,naming \
		--input-dir "$(PROCESSED_DIR)/monsters" \
		--report "$(QA_REPORT_DIR)/monsters_$(TIMESTAMP).json"
	@$(SHEET_ASM) --input-dir "$(PROCESSED_DIR)/monsters" \
		--output-dir "$(SHEETS_DIR)/monsters" --grid "5x4" --frame-size "64x64"
	@echo "✅ 몬스터 카테고리 빌드 완료"

environment: setup generate-environment process-environment
	@$(QA_RUNNER) --check resolution,palette,seamless \
		--input-dir "$(PROCESSED_DIR)/environment" \
		--report "$(QA_REPORT_DIR)/environment_$(TIMESTAMP).json"
	@$(SHEET_ASM) --input-dir "$(PROCESSED_DIR)/environment/tiles" \
		--output-dir "$(SHEETS_DIR)/environment" --mode "autotile" --tile-size "32x32"
	@echo "✅ 환경 카테고리 빌드 완료"

# ============================================================
# 정리
# ============================================================
clean:
	@echo "🗑️ 빌드 아티팩트 정리..."
	@rm -rf $(LOG_DIR)/*.log
	@rm -rf $(QA_REPORT_DIR)/*.json
	@echo "   로그 + QA 리포트 정리 완료 (생성 이미지는 유지)"

clean-all: clean
	@echo "🗑️ 전체 정리 (생성 이미지 포함)..."
	@rm -rf $(OUTPUT_DIR)
	@rm -rf $(PROCESSED_DIR)
	@rm -rf $(SHEETS_DIR)
	@echo "   ⚠️  전체 정리 완료 — 재생성 필요"

# ============================================================
# 도움말
# ============================================================
help:
	@echo "에테르나 크로니클 에셋 빌드 시스템"
	@echo ""
	@echo "사용법: make [타겟] [옵션]"
	@echo ""
	@echo "주요 타겟:"
	@echo "  all          전체 파이프라인 (생성→후처리→QA→조립→카탈로그)"
	@echo "  generate     이미지 생성만"
	@echo "  process      후처리만"
	@echo "  qa           QA 검증만"
	@echo "  assemble     시트 조립만"
	@echo "  catalog      카탈로그 갱신만"
	@echo "  status       빌드 상태 대시보드"
	@echo "  clean        로그/리포트 정리"
	@echo "  clean-all    전체 정리 (이미지 포함)"
	@echo ""
	@echo "카테고리:"
	@echo "  characters   캐릭터만 빌드"
	@echo "  monsters     몬스터만 빌드"
	@echo "  environment  환경만 빌드"
	@echo ""
	@echo "옵션:"
	@echo "  ENGINE=sd|dalle|midjourney  생성 엔진 (기본: sd)"
	@echo "  PARALLEL_JOBS=N            병렬 실행 수 (기본: 4)"
	@echo "  RETRY_COUNT=N              실패 시 재시도 횟수 (기본: 3)"
