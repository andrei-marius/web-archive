import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { dirname } from 'path'; // Import dirname

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Hardcoded folder name
const folderName = 'scraped_data';

// Puppeteer opens a hidden (headless) browser and performs the basic scrape
export default async function scrapePage(url) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Extract metadata
    const metadata = await page.evaluate(() => {
      const getMetaContent = (name) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || `No ${name}`;

      return {
        title: document.title || "No Title",
        description: getMetaContent('description'),
        keywords: getMetaContent('keywords'),
        timestamp: new Date().toISOString(),
      };
    });

    // Create the folder
    const savePath = path.join(__dirname, folderName);
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    // Take a screenshot
    const screenshotPath = path.join(savePath, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Capture MHTML
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Page.setWebLifecycleState', { state: 'active' });
    const { data: mhtmlContent } = await client.send('Page.captureSnapshot', { format: 'mhtml' });

    // Save MHTML file
    const mhtmlPath = path.join(savePath, 'page.mhtml');
    fs.writeFileSync(mhtmlPath, mhtmlContent, 'utf-8');

    // Store metadata
    const result = {
      url: url,
      ...metadata,
      screenshot: screenshotPath,
      mhtmlFile: mhtmlPath,
    };

    // Save metadata as JSON
    const metadataPath = path.join(savePath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`Scraping complete! Data saved in folder: ${savePath}`);
    console.log(`Screenshot: ${screenshotPath}`);
    console.log(`MHTML Archive: ${mhtmlPath}`);
    console.log(`Metadata JSON: ${metadataPath}`);

    await browser.close();
    return result;
  } catch (error) {
    console.error("Error during scraping:", error);
    return {
      url: url,
      title: "Error",
      description: "Error during scraping",
      keywords: "Error",
      timestamp: new Date().toISOString(),
      screenshot: "",
      mhtmlFile: "",
    };
  }
}