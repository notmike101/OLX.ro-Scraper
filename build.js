const puppeteer = require('puppeteer')
const { exec } = require('pkg')
const path = require('path')
const fs = require('fs')

async function downloadPuppeteer(downloadPath) {
  const platforms = ['win64', 'linux']

  for (const platform of platforms) {
    const downloadFetcher = puppeteer.createBrowserFetcher({
      platform,
      path: downloadPath,
    })

    try {
      console.log(`Downloading chromium ${platform} r809590`)
      await downloadFetcher.download(809590)
      console.log(`Downloaded chromium ${platform} r809590 to ${downloadPath}`)
    } catch (err) {
      console.log(err)
      return false
    }
  }

  return true
}

async function build() {
  try {
    const rootPath = path.resolve('.')
    const binPath = path.normalize(path.join(rootPath, '/dist'))
    const puppeteerPath = path.normalize(
      path.join(rootPath, '/dist', '/puppeteer')
    )
    fs.mkdirSync(puppeteerPath, { recursive: true })

    await exec(['.', '--out-path', binPath, '--public'])
    await downloadPuppeteer(puppeteerPath)

    console.log('Build successful')
    console.log('Build output to ./dist directory')
  } catch (err) {
    console.error('Build failed')
    console.error(err)
  }
}

build()
