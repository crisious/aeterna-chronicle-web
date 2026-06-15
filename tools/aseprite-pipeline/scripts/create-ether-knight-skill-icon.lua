local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local skillKey = app.params["skill"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if skillKey == nil or skillKey == "" then
  error("Missing required --script-param skill=<skill-key>")
end

local FRAME_SIZE = 64
local colors = {
  outline = Color { r = 4, g = 7, b = 18, a = 255 },
  panel = Color { r = 20, g = 31, b = 54, a = 245 },
  panelLight = Color { r = 41, g = 65, b = 105, a = 245 },
  aether = Color { r = 89, g = 178, b = 255, a = 245 },
  aetherLight = Color { r = 189, g = 244, b = 255, a = 245 },
  gold = Color { r = 255, g = 213, b = 90, a = 245 },
  steel = Color { r = 158, g = 174, b = 196, a = 245 },
  steelDark = Color { r = 85, g = 98, b = 130, a = 245 },
  red = Color { r = 255, g = 91, b = 126, a = 245 },
  green = Color { r = 116, g = 233, b = 155, a = 245 },
  purple = Color { r = 166, g = 107, b = 255, a = 245 },
  violet = Color { r = 98, g = 72, b = 181, a = 245 },
  shadow = Color { r = 56, g = 44, b = 93, a = 245 },
  smoke = Color { r = 139, g = 153, b = 170, a = 220 },
  earth = Color { r = 154, g = 108, b = 72, a = 245 },
  orange = Color { r = 255, g = 145, b = 72, a = 245 },
  pale = Color { r = 230, g = 245, b = 225, a = 245 },
}

local sprite = Sprite(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
sprite.filename = outputPath
app.sprite = sprite

if palettePath ~= nil and palettePath ~= "" then
  pcall(function()
    app.command.LoadPalette { filename = palettePath }
  end)
end

pcall(function()
  sprite.gridBounds = Rectangle(0, 0, FRAME_SIZE, FRAME_SIZE)
end)

local layer = sprite.layers[1]
layer.name = "icon"

local image = Image(FRAME_SIZE, FRAME_SIZE, ColorMode.RGB)
image:clear()

local function fillPixel(x, y, color)
  if x >= 0 and x < FRAME_SIZE and y >= 0 and y < FRAME_SIZE then
    image:drawPixel(x, y, color)
  end
end

local function fillRect(x, y, w, h, color)
  for py = y, y + h - 1 do
    for px = x, x + w - 1 do
      fillPixel(px, py, color)
    end
  end
end

local function fillEllipse(cx, cy, rx, ry, color)
  for y = -ry, ry do
    for x = -rx, rx do
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry)) <= 1 then
        fillPixel(cx + x, cy + y, color)
      end
    end
  end
end

local function fillDiamond(cx, cy, radius, color)
  for dy = -radius, radius do
    local width = radius - math.abs(dy)
    fillRect(cx - width, cy + dy, width * 2 + 1, 1, color)
  end
end

local function drawBase(accentColor)
  fillEllipse(32, 32, 27, 27, colors.outline)
  fillEllipse(32, 32, 24, 24, colors.panel)
  fillEllipse(32, 32, 19, 19, colors.panelLight)
  fillDiamond(32, 32, 26, accentColor)
  fillDiamond(32, 32, 22, colors.panel)
end

local function drawSlash()
  fillRect(21, 42, 7, 6, colors.outline)
  fillRect(23, 40, 5, 8, colors.gold)
  for i = 0, 25 do
    fillRect(22 + i, 43 - i, 5, 3, colors.outline)
    fillRect(23 + i, 42 - i, 3, 2, colors.aetherLight)
  end
  fillRect(41, 18, 7, 3, colors.aether)
end

local function drawShield()
  fillDiamond(32, 29, 17, colors.outline)
  fillDiamond(32, 30, 14, colors.steelDark)
  fillDiamond(32, 30, 10, colors.steel)
  fillRect(30, 18, 4, 27, colors.outline)
  fillRect(31, 20, 2, 22, colors.aetherLight)
  fillPixel(32, 31, colors.gold)
end

local function drawCharge()
  fillRect(18, 35, 19, 8, colors.outline)
  fillRect(20, 36, 16, 5, colors.steel)
  fillDiamond(42, 33, 12, colors.outline)
  fillDiamond(42, 33, 9, colors.aether)
  fillRect(15, 24, 20, 3, colors.aetherLight)
  fillRect(20, 29, 18, 2, colors.gold)
  fillPixel(50, 31, colors.red)
end

local function drawExplode()
  fillDiamond(32, 32, 21, colors.outline)
  fillDiamond(32, 32, 17, colors.red)
  fillDiamond(32, 32, 11, colors.gold)
  fillDiamond(32, 32, 6, colors.aetherLight)
  fillRect(31, 9, 3, 12, colors.aether)
  fillRect(31, 43, 3, 12, colors.aether)
  fillRect(9, 31, 12, 3, colors.aether)
  fillRect(43, 31, 12, 3, colors.aether)
end

local function drawPassive()
  fillDiamond(32, 32, 16, colors.outline)
  fillDiamond(32, 32, 12, colors.green)
  fillEllipse(32, 32, 8, 8, colors.aetherLight)
  fillRect(30, 18, 4, 28, colors.outline)
  fillRect(31, 20, 2, 24, colors.gold)
  fillPixel(23, 25, colors.aetherLight)
  fillPixel(42, 25, colors.aetherLight)
  fillPixel(24, 41, colors.aether)
  fillPixel(41, 42, colors.aether)
end

local function drawUltimate()
  fillEllipse(32, 32, 20, 20, colors.outline)
  fillEllipse(32, 32, 16, 16, colors.purple)
  fillDiamond(32, 32, 16, colors.aether)
  fillDiamond(32, 32, 10, colors.gold)
  fillDiamond(32, 32, 5, colors.aetherLight)
  fillRect(31, 6, 3, 14, colors.red)
  fillRect(31, 44, 3, 14, colors.red)
  fillRect(6, 31, 14, 3, colors.red)
  fillRect(44, 31, 14, 3, colors.red)
end

local function drawArrow()
  fillRect(15, 32, 28, 4, colors.outline)
  fillRect(17, 33, 24, 2, colors.aetherLight)
  fillDiamond(45, 34, 9, colors.outline)
  fillDiamond(45, 34, 6, colors.aether)
  fillRect(14, 26, 7, 3, colors.gold)
  fillRect(14, 39, 7, 3, colors.gold)
end

local function drawBolt()
  fillRect(34, 11, 7, 15, colors.outline)
  fillRect(30, 25, 11, 5, colors.outline)
  fillRect(24, 29, 9, 20, colors.outline)
  fillRect(35, 13, 4, 13, colors.aetherLight)
  fillRect(29, 27, 9, 3, colors.gold)
  fillRect(26, 31, 5, 15, colors.aether)
end

local function drawHeal()
  fillEllipse(32, 32, 16, 16, colors.outline)
  fillEllipse(32, 32, 12, 12, colors.green)
  fillRect(29, 19, 7, 26, colors.outline)
  fillRect(20, 28, 25, 7, colors.outline)
  fillRect(31, 21, 3, 22, colors.pale)
  fillRect(22, 30, 21, 3, colors.pale)
end

local function drawStorm()
  fillEllipse(32, 32, 19, 14, colors.outline)
  fillEllipse(29, 32, 15, 9, colors.aether)
  fillEllipse(38, 29, 10, 7, colors.aetherLight)
  fillRect(17, 45, 24, 3, colors.outline)
  fillRect(21, 48, 22, 2, colors.gold)
  fillRect(42, 18, 4, 16, colors.purple)
end

local function drawMemoryPassive()
  fillEllipse(32, 32, 17, 17, colors.outline)
  fillEllipse(32, 32, 13, 13, colors.aether)
  fillRect(18, 31, 28, 3, colors.aetherLight)
  fillRect(31, 18, 3, 28, colors.aetherLight)
  fillDiamond(32, 32, 7, colors.gold)
end

local function drawMemoryUltimate()
  fillEllipse(32, 32, 21, 21, colors.outline)
  fillEllipse(32, 32, 17, 17, colors.violet)
  fillEllipse(32, 32, 10, 10, colors.aetherLight)
  fillRect(18, 20, 28, 4, colors.gold)
  fillRect(18, 40, 28, 4, colors.gold)
  fillRect(22, 16, 4, 32, colors.aether)
  fillRect(38, 16, 4, 32, colors.aether)
end

local function drawStab()
  fillRect(19, 43, 8, 5, colors.outline)
  fillRect(21, 41, 5, 7, colors.steel)
  for i = 0, 27 do
    fillRect(23 + i, 43 - i, 4, 2, colors.outline)
    fillRect(24 + i, 42 - i, 2, 1, colors.pale)
  end
  fillPixel(51, 15, colors.red)
end

local function drawVital()
  fillEllipse(32, 32, 17, 17, colors.outline)
  fillEllipse(32, 32, 13, 13, colors.red)
  fillEllipse(32, 32, 7, 7, colors.panel)
  fillRect(31, 14, 3, 36, colors.outline)
  fillRect(14, 31, 36, 3, colors.outline)
  fillRect(31, 18, 3, 28, colors.gold)
  fillRect(18, 31, 28, 3, colors.gold)
end

local function drawSmoke()
  fillEllipse(25, 36, 10, 8, colors.outline)
  fillEllipse(37, 35, 13, 10, colors.outline)
  fillEllipse(30, 28, 11, 8, colors.outline)
  fillEllipse(25, 36, 8, 6, colors.smoke)
  fillEllipse(37, 35, 10, 8, colors.smoke)
  fillEllipse(30, 28, 8, 6, colors.pale)
  fillRect(21, 45, 24, 4, colors.shadow)
end

local function drawShadowExplosion()
  fillDiamond(32, 32, 21, colors.outline)
  fillDiamond(32, 32, 17, colors.shadow)
  fillDiamond(32, 32, 10, colors.purple)
  fillRect(31, 9, 3, 13, colors.violet)
  fillRect(31, 42, 3, 13, colors.violet)
  fillRect(9, 31, 13, 3, colors.violet)
  fillRect(42, 31, 13, 3, colors.violet)
end

local function drawPoison()
  fillEllipse(32, 32, 17, 19, colors.outline)
  fillEllipse(32, 32, 13, 15, colors.green)
  fillEllipse(27, 28, 3, 3, colors.panel)
  fillEllipse(37, 28, 3, 3, colors.panel)
  fillRect(28, 40, 9, 3, colors.outline)
  fillPixel(24, 18, colors.pale)
  fillPixel(42, 45, colors.pale)
end

local function drawVoidLord()
  fillEllipse(32, 32, 21, 21, colors.outline)
  fillEllipse(32, 32, 17, 17, colors.shadow)
  fillEllipse(32, 32, 9, 9, colors.violet)
  fillDiamond(32, 32, 17, colors.purple)
  fillDiamond(32, 32, 9, colors.panel)
  fillRect(18, 16, 28, 4, colors.gold)
end

local function drawShatter()
  fillDiamond(31, 31, 19, colors.outline)
  fillDiamond(31, 31, 15, colors.steel)
  fillRect(31, 13, 3, 37, colors.outline)
  fillRect(18, 26, 27, 3, colors.outline)
  fillRect(24, 37, 25, 3, colors.outline)
  fillPixel(20, 17, colors.aetherLight)
  fillPixel(44, 45, colors.gold)
end

local function drawGround()
  fillRect(17, 42, 30, 8, colors.outline)
  fillRect(19, 40, 26, 8, colors.earth)
  fillRect(26, 21, 13, 20, colors.outline)
  fillRect(28, 23, 9, 16, colors.steel)
  fillRect(21, 18, 22, 6, colors.outline)
  fillRect(23, 19, 18, 4, colors.gold)
end

local function drawRage()
  fillEllipse(32, 32, 18, 18, colors.outline)
  fillEllipse(32, 32, 14, 14, colors.red)
  fillRect(18, 29, 28, 6, colors.outline)
  fillRect(20, 31, 24, 3, colors.orange)
  fillDiamond(32, 24, 8, colors.gold)
  fillDiamond(32, 40, 8, colors.gold)
end

local function drawBreakerStorm()
  fillEllipse(32, 32, 19, 14, colors.outline)
  fillEllipse(30, 32, 15, 10, colors.earth)
  fillEllipse(40, 28, 9, 7, colors.steel)
  fillDiamond(22, 43, 6, colors.gold)
  fillDiamond(42, 44, 7, colors.aetherLight)
  fillRect(15, 24, 34, 3, colors.purple)
end

local function drawOverload()
  fillEllipse(32, 32, 19, 19, colors.outline)
  fillEllipse(32, 32, 15, 15, colors.purple)
  fillDiamond(32, 32, 11, colors.orange)
  fillRect(18, 31, 28, 3, colors.outline)
  fillRect(31, 18, 3, 28, colors.outline)
  fillPixel(20, 20, colors.aetherLight)
  fillPixel(44, 44, colors.aetherLight)
end

local function drawSurge()
  fillEllipse(32, 32, 21, 21, colors.outline)
  fillEllipse(32, 32, 17, 17, colors.red)
  fillDiamond(32, 32, 17, colors.orange)
  fillDiamond(32, 32, 10, colors.gold)
  fillRect(15, 27, 34, 4, colors.outline)
  fillRect(18, 33, 28, 3, colors.outline)
end

local function drawTimeStop()
  fillEllipse(32, 32, 20, 20, colors.outline)
  fillEllipse(32, 32, 16, 16, colors.aether)
  fillRect(24, 19, 5, 26, colors.outline)
  fillRect(35, 19, 5, 26, colors.outline)
  fillRect(25, 21, 3, 22, colors.pale)
  fillRect(36, 21, 3, 22, colors.pale)
  fillPixel(32, 13, colors.gold)
  fillPixel(32, 51, colors.gold)
end

local function drawTimeSlow()
  fillEllipse(32, 32, 20, 20, colors.outline)
  fillEllipse(32, 32, 16, 16, colors.green)
  fillRect(30, 19, 4, 15, colors.outline)
  fillRect(32, 32, 13, 4, colors.outline)
  fillRect(31, 21, 2, 12, colors.pale)
  fillRect(33, 33, 10, 2, colors.pale)
  fillRect(18, 45, 28, 3, colors.steel)
end

local function drawTimeHaste()
  fillEllipse(32, 32, 18, 18, colors.outline)
  fillEllipse(32, 32, 14, 14, colors.gold)
  fillDiamond(42, 24, 8, colors.aether)
  fillDiamond(45, 39, 8, colors.aetherLight)
  fillRect(16, 24, 20, 3, colors.outline)
  fillRect(16, 39, 22, 3, colors.outline)
  fillRect(18, 25, 17, 1, colors.pale)
  fillRect(18, 40, 18, 1, colors.pale)
end

local function drawTimeReverse()
  fillEllipse(32, 32, 20, 20, colors.outline)
  fillEllipse(32, 32, 16, 16, colors.violet)
  fillRect(18, 27, 28, 4, colors.aetherLight)
  fillRect(18, 34, 28, 4, colors.aetherLight)
  fillDiamond(18, 29, 6, colors.gold)
  fillDiamond(46, 36, 6, colors.gold)
  fillRect(30, 20, 4, 25, colors.outline)
end

local function drawTimeEternity()
  fillEllipse(24, 32, 11, 9, colors.outline)
  fillEllipse(40, 32, 11, 9, colors.outline)
  fillEllipse(24, 32, 8, 6, colors.aetherLight)
  fillEllipse(40, 32, 8, 6, colors.aetherLight)
  fillEllipse(24, 32, 4, 3, colors.panel)
  fillEllipse(40, 32, 4, 3, colors.panel)
  fillRect(29, 30, 6, 5, colors.gold)
end

local function drawVoidBullet()
  fillEllipse(38, 31, 13, 10, colors.outline)
  fillEllipse(38, 31, 9, 7, colors.purple)
  fillDiamond(39, 31, 5, colors.aetherLight)
  fillRect(14, 28, 22, 3, colors.violet)
  fillRect(18, 36, 17, 2, colors.shadow)
end

local function drawVoidWarp()
  fillEllipse(32, 32, 21, 21, colors.outline)
  fillEllipse(32, 32, 17, 17, colors.shadow)
  fillDiamond(32, 32, 15, colors.purple)
  fillDiamond(32, 32, 9, colors.panel)
  fillRect(28, 14, 8, 6, colors.aetherLight)
  fillRect(28, 44, 8, 6, colors.aetherLight)
end

local function drawVoidTether()
  for i = 0, 28 do
    fillRect(18 + i, 44 - i, 5, 3, colors.outline)
    if i % 5 < 3 then
      fillRect(19 + i, 43 - i, 3, 1, colors.aetherLight)
    end
  end
  fillDiamond(18, 44, 7, colors.purple)
  fillDiamond(47, 15, 7, colors.purple)
end

local function drawVoidRift()
  fillDiamond(32, 32, 22, colors.outline)
  fillDiamond(32, 32, 18, colors.shadow)
  fillRect(30, 10, 5, 16, colors.purple)
  fillRect(25, 25, 10, 5, colors.purple)
  fillRect(34, 30, 5, 16, colors.aetherLight)
  fillRect(28, 45, 9, 5, colors.aetherLight)
end

local function drawVoidExplosion()
  fillDiamond(32, 32, 22, colors.outline)
  fillDiamond(32, 32, 17, colors.violet)
  fillDiamond(32, 32, 10, colors.purple)
  fillDiamond(32, 32, 5, colors.aetherLight)
  fillRect(31, 8, 3, 13, colors.shadow)
  fillRect(31, 43, 3, 13, colors.shadow)
  fillRect(8, 31, 13, 3, colors.shadow)
  fillRect(43, 31, 13, 3, colors.shadow)
end

if skillKey == "skill_ek_slash" then
  drawBase(colors.aether)
  drawSlash()
elseif skillKey == "skill_ek_shield" then
  drawBase(colors.steel)
  drawShield()
elseif skillKey == "skill_ek_charge" then
  drawBase(colors.gold)
  drawCharge()
elseif skillKey == "skill_ek_explode" then
  drawBase(colors.red)
  drawExplode()
elseif skillKey == "skill_ek_passive" then
  drawBase(colors.green)
  drawPassive()
elseif skillKey == "skill_ek_ultimate" then
  drawBase(colors.purple)
  drawUltimate()
elseif skillKey == "skill_mw_arrow" then
  drawBase(colors.aether)
  drawArrow()
elseif skillKey == "skill_mw_bolt" then
  drawBase(colors.gold)
  drawBolt()
elseif skillKey == "skill_mw_heal" then
  drawBase(colors.green)
  drawHeal()
elseif skillKey == "skill_mw_storm" then
  drawBase(colors.aether)
  drawStorm()
elseif skillKey == "skill_mw_passive" then
  drawBase(colors.aetherLight)
  drawMemoryPassive()
elseif skillKey == "skill_mw_ultimate" then
  drawBase(colors.violet)
  drawMemoryUltimate()
elseif skillKey == "skill_sw_stab" then
  drawBase(colors.shadow)
  drawStab()
elseif skillKey == "skill_sw_vital" then
  drawBase(colors.red)
  drawVital()
elseif skillKey == "skill_sw_smoke" then
  drawBase(colors.smoke)
  drawSmoke()
elseif skillKey == "skill_sw_explosion" then
  drawBase(colors.violet)
  drawShadowExplosion()
elseif skillKey == "skill_sw_passive" then
  drawBase(colors.green)
  drawPoison()
elseif skillKey == "skill_sw_ultimate" then
  drawBase(colors.purple)
  drawVoidLord()
elseif skillKey == "skill_mb_shatter" then
  drawBase(colors.steel)
  drawShatter()
elseif skillKey == "skill_mb_ground" then
  drawBase(colors.earth)
  drawGround()
elseif skillKey == "skill_mb_rage" then
  drawBase(colors.red)
  drawRage()
elseif skillKey == "skill_mb_storm" then
  drawBase(colors.orange)
  drawBreakerStorm()
elseif skillKey == "skill_mb_passive" then
  drawBase(colors.purple)
  drawOverload()
elseif skillKey == "skill_mb_ultimate" then
  drawBase(colors.orange)
  drawSurge()
elseif skillKey == "skill_tg_stop" then
  drawBase(colors.aether)
  drawTimeStop()
elseif skillKey == "skill_tg_slow" then
  drawBase(colors.green)
  drawTimeSlow()
elseif skillKey == "skill_tg_haste" then
  drawBase(colors.gold)
  drawTimeHaste()
elseif skillKey == "skill_tg_reverse" then
  drawBase(colors.violet)
  drawTimeReverse()
elseif skillKey == "skill_tg_eternity" then
  drawBase(colors.aetherLight)
  drawTimeEternity()
elseif skillKey == "skill_vw_bullet" then
  drawBase(colors.purple)
  drawVoidBullet()
elseif skillKey == "skill_vw_warp" then
  drawBase(colors.violet)
  drawVoidWarp()
elseif skillKey == "skill_vw_tether" then
  drawBase(colors.aether)
  drawVoidTether()
elseif skillKey == "skill_vw_rift" then
  drawBase(colors.shadow)
  drawVoidRift()
elseif skillKey == "skill_vw_explosion" then
  drawBase(colors.purple)
  drawVoidExplosion()
else
  error("Unknown skill: " .. skillKey)
end

sprite:newCel(layer, sprite.frames[1], image, Point(0, 0))
app.command.SaveFileAs { filename = outputPath }
