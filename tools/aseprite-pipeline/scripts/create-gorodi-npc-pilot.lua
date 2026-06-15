local outputPath = app.params["output"]
local palettePath = app.params["palette"]

if outputPath == nil or outputPath == "" then
  error("Missing required --script-param output=<path>")
end

local FRAME_SIZE = 64
local FRAME_COUNT = 6
local CANVAS_WIDTH = FRAME_SIZE
local CANVAS_HEIGHT = FRAME_SIZE

local colors = {
  outline = Color { r = 0, g = 0, b = 0, a = 255 },
  shadow = Color { r = 8, g = 10, b = 18, a = 120 },
  ghostDark = Color { r = 41, g = 59, b = 76, a = 210 },
  ghost = Color { r = 89, g = 173, b = 172, a = 220 },
  ghostLight = Color { r = 164, g = 248, b = 226, a = 235 },
  cloakDark = Color { r = 41, g = 31, b = 64, a = 235 },
  cloak = Color { r = 87, g = 61, b = 112, a = 240 },
  cloakLight = Color { r = 128, g = 86, b = 148, a = 235 },
  packDark = Color { r = 90, g = 63, b = 46, a = 255 },
  pack = Color { r = 151, g = 102, b = 61, a = 255 },
  packLight = Color { r = 216, g = 164, b = 87, a = 255 },
  lantern = Color { r = 255, g = 196, b = 82, a = 255 },
  lanternLight = Color { r = 255, g = 237, b = 153, a = 255 },
  cyan = Color { r = 97, g = 232, b = 215, a = 255 },
  cyanDim = Color { r = 43, g = 132, b = 144, a = 210 },
  magenta = Color { r = 182, g = 92, b = 255, a = 230 },
  reference = Color { r = 255, g = 0, b = 255, a = 90 },
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

for i = 2, FRAME_COUNT do
  sprite:newFrame()
end

local shadowLayer = sprite.layers[1]
shadowLayer.name = "shadow"

local bodyLayer = sprite:newLayer()
bodyLayer.name = "ghost_body"

local cloakLayer = sprite:newLayer()
cloakLayer.name = "merchant_cloak"

local packLayer = sprite:newLayer()
packLayer.name = "rare_goods_pack"

local lanternLayer = sprite:newLayer()
lanternLayer.name = "lantern"

local auraLayer = sprite:newLayer()
auraLayer.name = "aether_aura"

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

local function drawSpark(image, x, y, color)
  fillPixel(image, x, y, color)
  fillPixel(image, x - 1, y, color)
  fillPixel(image, x + 1, y, color)
  fillPixel(image, x, y - 1, color)
  fillPixel(image, x, y + 1, color)
end

local poses = {
  { motion = "idle", bob = 0, sway = 0, lantern = 0, mouth = 0, aura = 0 },
  { motion = "idle", bob = -1, sway = 0, lantern = 1, mouth = 0, aura = 1 },
  { motion = "idle", bob = 0, sway = 1, lantern = 0, mouth = 0, aura = 0 },
  { motion = "idle", bob = 1, sway = 0, lantern = -1, mouth = 0, aura = -1 },
  { motion = "talk", bob = 0, sway = -1, lantern = 1, mouth = 1, aura = 1, hand = -2 },
  { motion = "talk", bob = -1, sway = 1, lantern = -1, mouth = 2, aura = -1, hand = 2 },
}

local function drawShadow(image, pose)
  local stretch = pose.motion == "talk" and 3 or 0
  fillRect(image, 18 - stretch, 58, 28 + stretch * 2, 2, colors.shadow)
  fillRect(image, 25 - stretch, 60, 15 + stretch * 2, 1, colors.shadow)
end

local function drawGhostBody(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local mouth = pose.mouth or 0

  fillRect(image, 23 + sway, 10 + bob, 19, 18, colors.outline)
  fillRect(image, 25 + sway, 12 + bob, 15, 14, colors.ghost)
  fillRect(image, 28 + sway, 13 + bob, 9, 4, colors.ghostLight)
  fillRect(image, 28 + sway, 18 + bob, 3, 2, colors.cyan)
  fillRect(image, 35 + sway, 18 + bob, 3, 2, colors.cyan)
  fillRect(image, 31 + sway, 22 + bob, 4, 1 + mouth, colors.ghostDark)

  fillRect(image, 22 + sway, 29 + bob, 22, 21, colors.outline)
  fillRect(image, 24 + sway, 31 + bob, 18, 16, colors.ghost)
  fillRect(image, 27 + sway, 34 + bob, 12, 8, colors.ghostLight)
  fillRect(image, 24 + sway, 47 + bob, 5, 6, colors.ghostDark)
  fillRect(image, 31 + sway, 48 + bob, 4, 7, colors.ghost)
  fillRect(image, 38 + sway, 47 + bob, 5, 6, colors.ghostDark)
end

local function drawCloak(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0

  fillRect(image, 19 + sway, 25 + bob, 27, 8, colors.outline)
  fillRect(image, 21 + sway, 26 + bob, 23, 6, colors.cloak)
  fillRect(image, 24 + sway, 27 + bob, 8, 2, colors.cloakLight)
  fillRect(image, 20 + sway, 33 + bob, 26, 18, colors.outline)
  fillRect(image, 23 + sway, 35 + bob, 20, 13, colors.cloakDark)
  fillRect(image, 27 + sway, 36 + bob, 10, 5, colors.cloak)
  fillRect(image, 31 + sway, 37 + bob, 3, 12, colors.magenta)
end

local function drawPack(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local hand = pose.hand or 0

  fillRect(image, 10 + sway, 33 + bob, 15, 18, colors.outline)
  fillRect(image, 12 + sway, 35 + bob, 11, 14, colors.pack)
  fillRect(image, 13 + sway, 36 + bob, 7, 3, colors.packLight)
  fillRect(image, 15 + sway, 42 + bob, 6, 2, colors.cyanDim)
  fillRect(image, 8 + sway, 39 + bob, 5, 2, colors.packDark)

  drawLine(image, 42 + sway, 34 + bob, 51 + sway + hand, 31 + bob, colors.outline, 2)
  drawLine(image, 43 + sway, 34 + bob, 50 + sway + hand, 32 + bob, colors.ghostLight, 1)
  fillRect(image, 49 + sway + hand, 30 + bob, 4, 4, colors.ghost)
end

local function drawLantern(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local lantern = pose.lantern or 0
  local lx = 52 + sway
  local ly = 38 + bob + lantern

  drawLine(image, 50 + sway, 33 + bob, lx, ly - 4, colors.outline, 1)
  fillRect(image, lx - 4, ly - 4, 9, 11, colors.outline)
  fillRect(image, lx - 2, ly - 2, 5, 7, colors.lantern)
  fillRect(image, lx - 1, ly - 1, 3, 3, colors.lanternLight)
  fillRect(image, lx - 5, ly + 7, 11, 1, colors.magenta)
end

local function drawAura(image, pose)
  local bob = pose.bob or 0
  local sway = pose.sway or 0
  local aura = pose.aura or 0

  fillRect(image, 18 + sway + aura, 55, 28, 1, colors.cyanDim)
  fillRect(image, 22 + sway - aura, 57, 20, 1, colors.magenta)
  drawSpark(image, 15 + aura, 24 + bob, colors.cyan)
  drawSpark(image, 47 - aura, 20 + bob, colors.magenta)
  drawSpark(image, 51 + sway, 49 + bob, colors.lanternLight)
  fillPixel(image, 30 + sway, 30 + bob, colors.lanternLight)
  fillPixel(image, 36 + sway, 30 + bob, colors.cyan)
end

local function drawReference(image, frameIndex)
  fillRect(image, 0, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, FRAME_SIZE - 1, 0, 1, CANVAS_HEIGHT, colors.reference)
  fillRect(image, 0, 0, FRAME_SIZE, 1, colors.reference)
  fillRect(image, 0, CANVAS_HEIGHT - 1, FRAME_SIZE, 1, colors.reference)
  if frameIndex == 0 or frameIndex == 4 then
    fillRect(image, 2, 2, 8, 2, colors.cyan)
  end
end

for frameNumber = 1, FRAME_COUNT do
  local shadowImage = newImage()
  local bodyImage = newImage()
  local cloakImage = newImage()
  local packImage = newImage()
  local lanternImage = newImage()
  local auraImage = newImage()
  local referenceImage = newImage()
  local pose = poses[frameNumber]

  drawShadow(shadowImage, pose)
  drawGhostBody(bodyImage, pose)
  drawCloak(cloakImage, pose)
  drawPack(packImage, pose)
  drawLantern(lanternImage, pose)
  drawAura(auraImage, pose)
  drawReference(referenceImage, frameNumber - 1)

  local frame = sprite.frames[frameNumber]
  sprite:newCel(shadowLayer, frame, shadowImage, Point(0, 0))
  sprite:newCel(bodyLayer, frame, bodyImage, Point(0, 0))
  sprite:newCel(cloakLayer, frame, cloakImage, Point(0, 0))
  sprite:newCel(packLayer, frame, packImage, Point(0, 0))
  sprite:newCel(lanternLayer, frame, lanternImage, Point(0, 0))
  sprite:newCel(auraLayer, frame, auraImage, Point(0, 0))
  sprite:newCel(referenceLayer, frame, referenceImage, Point(0, 0))
end

local function addTag(name, fromFrame, toFrame, color)
  local tag = sprite:newTag(sprite.frames[fromFrame], sprite.frames[toFrame])
  tag.name = name
  tag.color = color
end

addTag("idle_D", 1, 4, colors.cyan)
addTag("talk_D", 5, 6, colors.lantern)

app.command.SaveFileAs { filename = outputPath }
