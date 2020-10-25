const puppeteer = require('puppeteer')
const { exec } = require('pkg')
const path = require('path')

async function downloadPuppeteer(downloadPath) {
  const platforms = ['win64', 'linux']

  for (const platform of platforms) {
    const downloadFetcher = puppeteer.createBrowserFetcher({
      platform,
      downloadPath,
    })

    try {
      await downloadFetcher.download(809590)
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
    const binPath = path.join(rootPath, '/dist')
    const puppeteerPath = path.join(rootPath, '/dist', '/puppeteer')

    console.log(binPath, puppeteerPath)

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
