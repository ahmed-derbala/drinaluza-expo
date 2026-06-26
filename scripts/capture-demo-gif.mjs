import { chromium } from 'playwright'
import { execFileSync } from 'child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DOCS = path.join(ROOT, 'docs')
const GIF_PATH = path.join(DOCS, 'demo.gif')
const TMP_DIR = path.join(DOCS, '.demo-capture')
const BASE_URL = 'https://drinaluza.vercel.app'
const FFMPEG = ffmpegInstaller.path

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function scrollPage(page, steps = 3, delayMs = 900) {
	for (let i = 0; i < steps; i++) {
		await page.mouse.wheel(0, 420)
		await sleep(delayMs)
	}
}

async function gotoPage(page, path, waitMs = 2500) {
	await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
	await page.waitForTimeout(waitMs)
}

async function runDemo(page) {
	await gotoPage(page, '/feed', 3000)
	await scrollPage(page, 3, 1200)

	await gotoPage(page, '/businesses/drinaluza', 2800)
	await scrollPage(page, 3, 1100)

	await gotoPage(page, '/businesses/drinaluza/products', 2800)
	await scrollPage(page, 2, 1000)

	await gotoPage(page, '/search', 2200)
	const searchInput = page.locator('input').first()
	if (await searchInput.isVisible().catch(() => false)) {
		await searchInput.click()
		await searchInput.fill('drin')
		await sleep(2200)
	}

	await gotoPage(page, '/notifications', 2200)
	await scrollPage(page, 1, 900)

	await gotoPage(page, '/profile', 2500)
	await scrollPage(page, 2, 1000)

	await gotoPage(page, '/settings', 2200)
	await scrollPage(page, 1, 900)

	await gotoPage(page, '/auth', 2500)
	await sleep(1500)

	await gotoPage(page, '/feed', 2500)
	await scrollPage(page, 2, 1100)
	await sleep(1500)
}

async function main() {
	fs.mkdirSync(DOCS, { recursive: true })
	fs.mkdirSync(TMP_DIR, { recursive: true })

	const browser = await chromium.launch({ headless: true })
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 1,
		isMobile: true,
		hasTouch: true,
		recordVideo: {
			dir: TMP_DIR,
			size: { width: 390, height: 844 }
		}
	})

	const page = await context.newPage()
	await runDemo(page)

	const video = page.video()
	await context.close()
	await browser.close()

	const webmPath = await video.path()
	const palettePath = path.join(TMP_DIR, 'palette.png')

	execFileSync(
		FFMPEG,
		[
			'-y',
			'-i',
			webmPath,
			'-t',
			'55',
			'-vf',
			'fps=10,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff:max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
			'-loop',
			'0',
			GIF_PATH
		],
		{ stdio: 'inherit' }
	)

	const stats = fs.statSync(GIF_PATH)

	fs.rmSync(TMP_DIR, { recursive: true, force: true })

	console.log(`Created ${GIF_PATH}`)
	console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
