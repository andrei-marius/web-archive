import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

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

    // Take a screenshot (as a buffer)
    const screenshotBuffer = await page.screenshot({ fullPage: true });

    // Capture MHTML (as a string)
    const client = await page.target().createCDPSession();
    await client.send('Page.enable');
    await client.send('Page.setWebLifecycleState', { state: 'active' });
    const { data: mhtmlContent } = await client.send('Page.captureSnapshot', { format: 'mhtml' });

    // Return metadata and file data
    const result = {
      url: url,
      ...metadata,
      screenshotBuffer: screenshotBuffer, // Screenshot as a buffer (not base64)
      mhtmlContent: mhtmlContent, // MHTML content as a string
    };

    console.log('Scraping complete!');
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
      screenshotBuffer: null,
      mhtmlContent: null,
    };
  }
}