const inquirer = require('inquirer')
const argv = require('minimist')(process.argv.slice(2))
const fs = require('fs')
const puppeteer = require('puppeteer')
const path = require('path')

const isPkg = typeof process.pkg !== 'undefined'

let chromiumExecutablePath = isPkg
  ? puppeteer
      .executablePath()
      .replace(
        /^.*?\/node_modules\/puppeteer\/\.local-chromium/,
        path.join(
          path.dirname(process.execPath),
          'puppeteer',
          '.local-chromium'
        )
      )
  : puppeteer.executablePath()

if (process.platform === 'win32') {
  chromiumExecutablePath = isPkg
    ? puppeteer
        .executablePath()
        .replace(
          /^.*?\\node_modules\\puppeteer\\\.local-chromium/,
          path.join(
            path.dirname(process.execPath),
            'puppeteer',
            '.local-chromium'
          )
        )
    : puppeteer.executablePath()
}

function getConfig() {
  return new Promise((resolve, reject) => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'url',
          message: 'URL to scrape?',
        },
        {
          type: 'confirm',
          name: 'removeDuplicates',
          message: 'Remove duplicate entries?',
          default: false,
        },
      ])
      .then((answers) => {
        resolve(answers)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function printProgress(count) {
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(`Captured ${count} phone numbers`)
}

async function doScrape(url) {
  const browser = await puppeteer.launch({
    executablePath: chromiumExecutablePath,
  })
  const page = await browser.newPage()
  await page.goto(url, {
    waitUntil: 'load',
  })

  const links = await page.evaluate(() => {
    const linkSelectors = document.querySelectorAll(
      '.listHandler .offers a.thumb.linkWithHash'
    )
    const output = []
    linkSelectors.forEach((elm) => {
      output.push(elm.getAttribute('href'))
    })
    return output
  })

  const numbers = []

  for (const link of links) {
    await page.goto(link, {
      waitUntil: 'load',
    })

    let phoneNumber = null
    const pageURL = page.url()

    if (pageURL.startsWith('https://www.olx.ro')) {
      phoneNumber = await page.evaluate(async () => {
        try {
          document.querySelector('.link-phone').click()

          return await new Promise((resolve) => {
            const waitForHide = setInterval(() => {
              const monitor = document.querySelector('.link-phone .button')
              if (monitor.style.display === 'none') {
                clearInterval(waitForHide)
                resolve(
                  document
                    .querySelector('.link-phone .contactitem')
                    .textContent.trim()
                )
              }
            }, 500)
          })
        } catch (err) {
          return null
        }
      })
    } else if (pageURL.startsWith('https://www.storia.ro')) {
      // eslint-disable-next-line no-loop-func
      phoneNumber = await page.evaluate(async () => {
        try {
          const buttons = document.querySelectorAll('button')

          for (const button of buttons) {
            if (button.textContent.trim() === 'Afiseaza numarul') {
              button.click()

              // eslint-disable-next-line no-loop-func
              return await new Promise((resolve) => {
                const workarea = document.querySelector(
                  'div[class^=styles_overlay]'
                )
                const waitForWorkarea = setInterval(() => {
                  if (workarea) {
                    clearInterval(waitForWorkarea)
                    const number = workarea.querySelector('ul li ul li')
                    resolve(number.textContent.trim())
                  }
                }, 500)
              })
            }
          }

          return null
        } catch (err) {
          return null
        }
      })
    }

    if (phoneNumber) {
      numbers.push(phoneNumber)
      printProgress(numbers.length)
    }
  }

  await browser.close()

  return numbers
}

function saveFile(destination, data) {
  const stream = fs.createWriteStream(destination, {
    flags: 'a',
  })

  stream.write('Phone number\n')
  data.forEach((entry) => {
    stream.write(`${entry}\n`)
  })
  stream.end()

  console.log(`Data saved to ${destination}`)
  return destination
}

async function main() {
  const config = {
    outFileName: `output.${Date.now()}.csv`,
    ...argv,
  }

  if (!config.url) {
    const inputConfig = await getConfig()
    config.url = inputConfig.url
    config.removeDuplicates = inputConfig.removeDuplicates
  }

  if (!config.url) {
    return 0
  }

  let output = await doScrape(config.url)

  if (config.removeDuplicates) {
    output = output.filter((entry, index) => {
      return output.indexOf(entry) !== index
    })
  }

  saveFile(config.outFileName, output)

  return 0
}

main()
