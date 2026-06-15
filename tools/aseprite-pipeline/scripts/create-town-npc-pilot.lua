local outputPath = app.params["output"]
local palettePath = app.params["palette"]
local npcKey = app.params["npc"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

if npcKey == nil or npcKey == "" then
  error("Missing required --script-param npc=<elder_mateus|merchant_mira|blacksmith_kalen|memory_fragment_board|guild_hashir>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 6
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local base = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 10, g = 9, b = 18, a = 120 },
  skin = Color { r = 198, g = 142, b = 116, a = 255 },
  skinDark = Color { r = 128, g = 76, b = 72, a = 255 },
  white = Color { r = 235, g = 229, b = 212, a = 255 },
  steel = Color { r = 165, g = 180, b = 190, a = 255 },
  cyan = Color { r = 97, g = 232, b = 215, a = 255 },
  gold = Color { r = 255, g = 204, b = 80, a = 255 },
  reference = Color { r = 255, g = 0, b = 255, a = 90 },
}

local variants = {
  elder_mateus = {
    hair = Color { r = 225, g = 223, b = 212, a = 255 },
    hairDark = Color { r = 132, g = 126, b = 134, a = 255 },
    coat = Color { r = 93, g = 66, b = 132, a = 255 },
    coatDark = Color { r = 48, g = 39, b = 82, a = 255 },
    coatLight = Color { r = 156, g = 112, b = 190, a = 255 },
    accent = Color { r = 193, g = 135, b = 255, a = 255 },
    prop = "staff",
  },
  merchant_mira = {
    hair = Color { r = 104, g = 67, b = 48, a = 255 },
    hairDark = Color { r = 58, g = 43, b = 39, a = 255 },
    coat = Color { r = 57, g = 143, b = 108, a = 255 },
    coatDark = Color { r = 32, g = 84, b = 76, a = 255 },
    coatLight = Color { r = 113, g = 208, b = 150, a = 255 },
    accent = Color { r = 255, g = 204, b = 80, a = 255 },
    prop = "satchel",
  },
  blacksmith_kalen = {
    hair = Color { r = 77, g = 54, b = 50, a = 255 },
    hairDark = Color { r = 34, g = 31, b = 35, a = 255 },
    coat = Color { r = 172, g = 78, b = 48, a = 255 },
    coatDark = Color { r = 95, g = 49, b = 44, a = 255 },
    coatLight = Color { r = 232, g = 128, b = 68, a = 255 },
    accent = Color { r = 180, g = 194, b = 205, a = 255 },
    prop = "hammer",
  },
  memory_fragment_board = {
    kind = "board",
    board = Color { r = 82, g = 69, b = 105, a = 255 },
    boardDark = Color { r = 37, g = 32, b = 54, a = 255 },
    boardLight = Color { r = 132, g = 108, b = 158, a = 255 },
    accent = Color { r = 104, g = 226, b = 255, a = 255 },
    accentAlt = Color { r = 255, g = 209, b = 94, a = 255 },
    prop = "fragments",
  },
  guild_hashir = {
    hair = Color { r = 45, g = 42, b = 56, a = 255 },
    hairDark = Color { r = 19, g = 22, b = 32, a = 255 },
    coat = Color { r = 46, g = 93, b = 173, a = 255 },
    coatDark = Color { r = 28, g = 45, b = 94, a = 255 },
    coatLight = Color { r = 86, g = 142, b = 232, a = 255 },
    accent = Color { r = 255, g = 219, b = 91, a = 255 },
    prop = "banner",
  },
}

local variant = variants[npcKey]
if variant == nil then
  error("Unsupported npc key: " .. npcKey)
end

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

for i = 2, FRAME_COUNT do
  sprite:newFrame()
end

local shadowLayer = sprite.layers[1]
shadowLayer.name = "shadow"

local bodyLayer = sprite:newLayer()
bodyLayer.name = "body"

local clothLayer = sprite:newLayer()
clothLayer.name = "clothing"

local propLayer = sprite:newLayer()
propLayer.name = "prop"

local accentLayer = sprite:newLayer()
accentLayer.name = "accent"

local referenceLayer = sprite:newLayer()
referenceLayer.name = "reference"
referenceLayer.isVisible = false

local function newImage()
  local image = Image(CANVAS_WIDTH, CANVAS_HEIGHT, ColorMode.RGB)
  image:clear()
  return image
end

local function fillRect(image, x, y, w, h, color)
  for py = y, y + h - 1 do
    if py >= 0 and py < CANVAS_HEIGHT then
      for px = x, x + w - 1 do
        if px >= 0 and px < CANVAS_WIDTH then
          image:drawPixel(px, py, color)
        end
      end
    end
  end
end

local function fillPixel(image, x, y, color)
  if x >= 0 and x < CANVAS_WIDTH and y >= 0 and y < CANVAS_HEIGHT then
    image:drawPixel(x, y, color)
  end
end

local function drawLine(image, x0, y0, x1, y1, color, thickness)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy
  local half = math.max(0, math.floor((thickness or 1) / 2))

  while true do
    fillRect(image, x0 - half, y0 - half, half * 2 + 1, half * 2 + 1, color)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then
      err = err + dy
      x0 = x0 + sx
    end
    if e2 <= dx then
      err = err + dx
      y0 = y0 + sy
    end
  end
end

local poses = {
  { motion = "idle", bob = 0, sway = 0, prop = 0, mouth = 0 },
  { motion = "idle", bob = -1, sway = 0, prop = 1, mouth = 0 },
  { motion = "idle", bob = 0, sway = 1, prop = 0, mouth = 0 },
  { motion = "idle", bob = 1, sway = 0, prop = -1, mouth = 0 },
  { motion = "talk", bob = 0, sway = -1, prop = 1, mouth = 1, hand = -2 },
  { motion = "talk", bob = -1, sway = 1, prop = -1, mouth = 2, hand = 2 },
}

local function drawShadow(image, pose)
  local stretch = pose.motion == "talk" and 2 or 0
  fillRect(image, 20 - stretch, 58, 24 + stretch * 2, 2, base.shadow)
  fillRect(image, 25 - stretch, 60, 14 + stretch * 2, 1, base.shadow)
end

local function drawBody(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local mouth = pose.mouth or 0

  fillRect(image, 22 + sway, 10 + bob, 20, 19, base.outline)
  fillRect(image, 24 + sway, 12 + bob, 16, 15, base.skin)
  fillRect(image, 26 + sway, 12 + bob, 12, 5, variant.hair)
  fillRect(image, 23 + sway, 14 + bob, 5, 11, variant.hairDark)
  fillRect(image, 37 + sway, 14 + bob, 5, 11, variant.hairDark)
  fillRect(image, 27 + sway, 18 + bob, 3, 2, base.cyan)
  fillRect(image, 35 + sway, 18 + bob, 3, 2, base.cyan)
  fillRect(image, 31 + sway, 23 + bob, 4, 1 + mouth, base.skinDark)

  if npcKey == "elder_mateus" then
    fillRect(image, 27 + sway, 26 + bob, 11, 5, base.white)
    fillRect(image, 29 + sway, 29 + bob, 7, 5, base.white)
  end
end

local function drawCloth(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0

  fillRect(image, 20 + sway, 28 + bob, 25, 24, base.outline)
  fillRect(image, 23 + sway, 31 + bob, 19, 18, variant.coat)
  fillRect(image, 25 + sway, 34 + bob, 15, 13, variant.coatDark)
  fillRect(image, 27 + sway, 32 + bob, 8, 4, variant.coatLight)
  fillRect(image, 31 + sway, 31 + bob, 3, 18, variant.accent)

  fillRect(image, 17 + sway, 33 + bob, 8, 11, base.outline)
  fillRect(image, 40 + sway, 33 + bob, 8, 11, base.outline)
  fillRect(image, 19 + sway, 35 + bob, 5, 8, base.skin)
  fillRect(image, 42 + sway, 35 + bob, 4, 8, base.skin)

  fillRect(image, 24 + sway, 49, 7, 10, base.outline)
  fillRect(image, 36 + sway, 49, 7, 10, base.outline)
  fillRect(image, 26 + sway, 51, 3, 6, variant.coatDark)
  fillRect(image, 38 + sway, 51, 3, 6, variant.coatDark)
end

local function drawProp(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local prop = pose.prop or 0
  local hand = pose.hand or 0

  if variant.prop == "staff" then
    drawLine(image, 49 + sway + hand, 18 + bob, 47 + sway, 56, base.outline, 2)
    drawLine(image, 49 + sway + hand, 19 + bob, 47 + sway, 55, variant.accent, 1)
    fillRect(image, 45 + sway + hand, 14 + bob + prop, 8, 8, base.outline)
    fillRect(image, 47 + sway + hand, 16 + bob + prop, 4, 4, base.cyan)
  elseif variant.prop == "satchel" then
    fillRect(image, 10 + sway, 34 + bob, 13, 15, base.outline)
    fillRect(image, 12 + sway, 36 + bob, 9, 11, base.gold)
    fillRect(image, 13 + sway, 38 + bob, 7, 2, variant.coatLight)
    drawLine(image, 22 + sway, 34 + bob, 34 + sway, 49 + bob, variant.accent, 1)
    fillRect(image, 47 + sway + hand, 31 + bob + prop, 7, 7, base.outline)
    fillRect(image, 49 + sway + hand, 33 + bob + prop, 3, 3, base.gold)
  elseif variant.prop == "hammer" then
    drawLine(image, 48 + sway, 35 + bob, 56 + sway + hand, 49 + bob + prop, base.outline, 2)
    drawLine(image, 49 + sway, 35 + bob, 55 + sway + hand, 48 + bob + prop, variant.coatLight, 1)
    fillRect(image, 52 + sway + hand, 27 + bob + prop, 11, 7, base.outline)
    fillRect(image, 54 + sway + hand, 29 + bob + prop, 7, 3, base.steel)
  elseif variant.prop == "banner" then
    drawLine(image, 12 + sway, 19 + bob, 12 + sway, 56, base.outline, 2)
    drawLine(image, 12 + sway, 20 + bob, 12 + sway, 55, variant.accent, 1)
    fillRect(image, 13 + sway, 18 + bob + prop, 15, 12, base.outline)
    fillRect(image, 15 + sway, 20 + bob + prop, 11, 8, variant.coatLight)
    fillRect(image, 16 + sway, 22 + bob + prop, 7, 2, variant.accent)
    fillRect(image, 47 + sway + hand, 33 + bob + prop, 7, 7, base.outline)
    fillRect(image, 49 + sway + hand, 35 + bob + prop, 3, 3, variant.accent)
  end
end

local function drawBoardShadow(image, pose)
  local pulse = pose.motion == "talk" and 2 or 0
  fillRect(image, 13 - pulse, 57, 38 + pulse * 2, 2, base.shadow)
  fillRect(image, 20 - pulse, 59, 24 + pulse * 2, 1, base.shadow)
end

local function drawBoardBody(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local mouth = pose.mouth or 0

  fillRect(image, 13 + sway, 17 + bob, 38, 30, base.outline)
  fillRect(image, 16 + sway, 20 + bob, 32, 24, variant.board)
  fillRect(image, 18 + sway, 22 + bob, 28, 20, variant.boardDark)
  fillRect(image, 20 + sway, 24 + bob, 24, 15, variant.board)
  fillRect(image, 19 + sway, 23 + bob, 26, 2, variant.boardLight)

  fillRect(image, 18 + sway, 46 + bob, 7, 11, base.outline)
  fillRect(image, 39 + sway, 46 + bob, 7, 11, base.outline)
  fillRect(image, 20 + sway, 48 + bob, 3, 8, variant.boardDark)
  fillRect(image, 41 + sway, 48 + bob, 3, 8, variant.boardDark)

  fillRect(image, 27 + sway, 29 + bob, 10, 1 + mouth, variant.accentAlt)
end

local function drawBoardProp(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local prop = pose.prop or 0
  local hand = pose.hand or 0

  fillRect(image, 24 + sway, 25 + bob, 16, 10, base.outline)
  fillRect(image, 26 + sway, 27 + bob, 12, 6, base.white)
  fillRect(image, 28 + sway, 29 + bob, 8, 1, variant.boardLight)
  fillRect(image, 29 + sway, 31 + bob, 6, 1, variant.boardLight)

  fillRect(image, 17 + sway + hand, 18 + bob + prop, 8, 8, base.outline)
  fillRect(image, 19 + sway + hand, 20 + bob + prop, 4, 4, variant.accent)
  fillRect(image, 42 + sway - hand, 33 + bob - prop, 7, 7, base.outline)
  fillRect(image, 44 + sway - hand, 35 + bob - prop, 3, 3, variant.accentAlt)
end

local function drawBoardAccent(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local prop = pose.prop or 0

  fillPixel(image, 21 + sway, 27 + bob, variant.accent)
  fillPixel(image, 43 + sway, 27 + bob, variant.accentAlt)
  fillPixel(image, 31 + sway + prop, 36 + bob, variant.accent)
  fillPixel(image, 34 + sway - prop, 37 + bob, variant.accentAlt)
  fillRect(image, 23 + sway, 41 + bob, 18, 1, variant.accent)
end

local function drawAccent(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local prop = pose.prop or 0

  fillRect(image, 22 + sway + prop, 56, 20, 1, variant.accent)
  fillPixel(image, 18 + sway, 27 + bob, variant.accent)
  fillPixel(image, 46 + sway, 27 + bob, base.cyan)
  fillPixel(image, 31 + sway, 47 + bob, base.gold)
  fillPixel(image, 35 + sway, 47 + bob, base.cyan)
end

local function drawReference(image, frameIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, base.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, base.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, base.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, base.reference)
  if frameIndex == 0 or frameIndex == 4 then
    fillRect(image, 2, 2, 8, 2, variant.accent)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local shadowImage = newImage()
  local bodyImage = newImage()
  local clothImage = newImage()
  local propImage = newImage()
  local accentImage = newImage()
  local referenceImage = newImage()
  local pose = poses[frameNumber]

  if variant.kind == "board" then
    drawBoardShadow(shadowImage, pose)
    drawBoardBody(bodyImage, pose)
    drawBoardProp(propImage, pose)
    drawBoardAccent(accentImage, pose)
  else
    drawShadow(shadowImage, pose)
    drawBody(bodyImage, pose)
    drawCloth(clothImage, pose)
    drawProp(propImage, pose)
    drawAccent(accentImage, pose)
  end
  drawReference(referenceImage, frameNumber - 1)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
  sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
  sprite:newCel(clothLayer, frame, clothImage, Point(0, 0))
  sprite:newCel(propLayer, frame, propImage, Point(0, 0))
  sprite:newCel(accentLayer, frame, accentImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("idle_D", 1, 4, variant.accent)
addTag("talk_D", 5, 6, base.gold)

app.command.SaveFileAs { filename = outputPath }
