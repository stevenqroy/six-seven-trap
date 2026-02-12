import Foundation
import AVFoundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let inputURL = cwd.appendingPathComponent("src/assets/test.mp4")
let outputURL = cwd.appendingPathComponent("src/assets/test-sheet-opaque.png")

let frameW = 480
let frameH = 270
let cols = 8
let rows = 16
let totalFrames = cols * rows
let durationWindow: Double = 10.0

func makeBitmapContext(width: Int, height: Int) -> CGContext? {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    return CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )
}

func renderFrame(_ image: CGImage, width: Int, height: Int) -> CGImage? {
    guard let ctx = makeBitmapContext(width: width, height: height) else { return nil }
    ctx.setBlendMode(.copy)
    ctx.clear(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.interpolationQuality = .high

    ctx.translateBy(x: 0, y: CGFloat(height))
    ctx.scaleBy(x: 1, y: -1)

    let srcW = CGFloat(image.width)
    let srcH = CGFloat(image.height)
    let dstW = CGFloat(width)
    let dstH = CGFloat(height)
    let scale = max(dstW / srcW, dstH / srcH)
    let drawW = srcW * scale
    let drawH = srcH * scale
    let drawX = (dstW - drawW) * 0.5
    let drawY = (dstH - drawH) * 0.5

    ctx.draw(image, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
    return ctx.makeImage()
}

guard FileManager.default.fileExists(atPath: inputURL.path) else {
    fputs("Missing input video at \(inputURL.path)\n", stderr)
    exit(1)
}

let asset = AVURLAsset(url: inputURL)
let sourceDuration = CMTimeGetSeconds(asset.duration)
if !sourceDuration.isFinite || sourceDuration <= 0 {
    fputs("Unable to read video duration for \(inputURL.path)\n", stderr)
    exit(1)
}
let clipDuration = min(durationWindow, sourceDuration)

let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceAfter = .zero
generator.requestedTimeToleranceBefore = .zero
generator.maximumSize = CGSize(width: frameW * 2, height: frameH * 2)

guard let sheetCtx = makeBitmapContext(width: frameW * cols, height: frameH * rows) else {
    fputs("Failed to allocate output bitmap context\n", stderr)
    exit(1)
}
sheetCtx.setBlendMode(.copy)
sheetCtx.clear(CGRect(x: 0, y: 0, width: frameW * cols, height: frameH * rows))
sheetCtx.translateBy(x: 0, y: CGFloat(frameH * rows))
sheetCtx.scaleBy(x: 1, y: -1)
sheetCtx.interpolationQuality = .high

var lastGoodFrame: CGImage? = nil
for frameIndex in 0..<totalFrames {
    let t = clipDuration * Double(frameIndex) / Double(max(1, totalFrames - 1))
    let cm = CMTime(seconds: t, preferredTimescale: 600)

    let sourceFrame: CGImage
    do {
        sourceFrame = try generator.copyCGImage(at: cm, actualTime: nil)
    } catch {
        if let fallback = lastGoodFrame {
            sourceFrame = fallback
        } else {
            continue
        }
    }

    let rendered = renderFrame(sourceFrame, width: frameW, height: frameH) ?? sourceFrame
    lastGoodFrame = rendered

    let col = frameIndex % cols
    let row = frameIndex / cols
    let dx = CGFloat(col * frameW)
    let dy = CGFloat(row * frameH)
    sheetCtx.draw(rendered, in: CGRect(x: dx, y: dy, width: CGFloat(frameW), height: CGFloat(frameH)))
}

guard let sheetImage = sheetCtx.makeImage() else {
    fputs("Failed to produce sheet image\n", stderr)
    exit(1)
}

if !FileManager.default.fileExists(atPath: outputURL.deletingLastPathComponent().path) {
    try? FileManager.default.createDirectory(
        at: outputURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
}

guard let dest = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    UTType.png.identifier as CFString,
    1,
    nil
) else {
    fputs("Failed to create output image destination\n", stderr)
    exit(1)
}

CGImageDestinationAddImage(dest, sheetImage, nil)
if !CGImageDestinationFinalize(dest) {
    fputs("Failed to finalize output PNG at \(outputURL.path)\n", stderr)
    exit(1)
}
