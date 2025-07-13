// commands/tools/pinterest.js (Perbaikan Final - Menggunakan Puppeteer Core)

// --- PERBAIKAN UTAMA: Menggunakan puppeteer-core dan chrome-aws-lambda ---
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');
// --- AKHIR PERBAIKAN ---

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Fungsi helper tetap sama
async function autoScroll(page) { /* ... (fungsi ini tidak perlu diubah) ... */ }
function shuffleArray(array) { /* ... (fungsi ini tidak perlu diubah) ... */ }

// --- FUNGSI UTAMA SCRAPING & DOWNLOAD (dengan puppeteer-core) ---

async function getPinterestLinks(keyword, type = 'image') {
  let browser;
  try {
    // --- PERBAIKAN UTAMA: Konfigurasi Launch untuk puppeteer-core ---
    browser = await puppeteer.launch({
      args: [
        ...chromium.args, // Menggunakan argumen default dari chrome-aws-lambda
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ],
      executablePath: await chromium.executablePath, // Path browser dari chrome-aws-lambda
      headless: chromium.headless, // Mode headless dari chrome-aws-lambda
      ignoreHTTPSErrors: true,
    });
    // --- AKHIR PERBAIKAN ---

    const page = await browser.newPage();
    const query = encodeURIComponent(keyword);
    const url = `https://id.pinterest.com/search/pins/?q=${query}`;

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2' });
    await autoScroll(page);

    let results = [];
    if (type === 'image') {
      results = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img[src*="i.pinimg.com"]'));
        const imageUrls = images.map(img => img.src.replace(/236x/, '736x'));
        return [...new Set(imageUrls)];
      });
    } else if (type === 'video') {
      results = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/pin/"]'));
        return [...new Set(anchors.map(a => a.href))];
      });
    }
    
    await browser.close();
    return results;

  } catch (error) {
    console.error("Error saat scraping dengan Puppeteer:", error);
    if (browser) await browser.close();
    return [];
  }
}

async function downloadViaPintodown(pinUrl) {
  let browser;
  try {
    // Menggunakan konfigurasi yang sama untuk downloader video
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    
    await page.goto('https://pintodown.com/', { waitUntil: 'domcontentloaded' });
    await page.type('#pinterest_video_url', pinUrl);
    await page.click('button.pinterest__button--download');

    await page.waitForSelector('a[href$=".mp4"]', { timeout: 15000 });
    const videoUrl = await page.evaluate(() => document.querySelector('a[href$=".mp4"]').href);

    await browser.close();
    return videoUrl;

  } catch (err) {
    console.error(`❌ Gagal unduh video dari ${pinUrl}: ${err.message}`);
    if (browser) await browser.close();
    return null;
  }
}

// --- LOGIKA UTAMA PERINTAH BOT ---
module.exports = {
  name: "pin",
  alias: ["pinterest"],
  description: "Mencari gambar atau video dari Pinterest.",
  category: "tools",
  execute: async (msg, { bot, args, usedPrefix, command }) => {
    // Logika execute tetap sama, tidak ada perubahan di sini
    if (!args.length) {
      const helpMessage = `*Pencarian Pinterest* 🔎...`; // Pesan bantuan Anda
      return bot.sendMessage(msg.from, { text: helpMessage }, { quoted: msg });
    }

    let query = [];
    let count = 1;
    let searchVideos = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i].toLowerCase() === '-j') {
        count = parseInt(args[i + 1], 10) || 1;
        count = Math.min(Math.max(1, count), 5);
        i++;
      } else if (args[i].toLowerCase() === '-v') {
        searchVideos = true;
      } else {
        query.push(args[i]);
      }
    }
    const searchQuery = query.join(' ');
    if (!searchQuery) return msg.reply("Mohon masukkan query pencarian.");

    try {
      await msg.react("⏳");
      const searchType = searchVideos ? 'video' : 'image';
      
      const results = await getPinterestLinks(searchQuery, searchType);

      if (!results || results.length === 0) {
        await msg.react("❌");
        return msg.reply("Maaf, tidak ada hasil yang ditemukan. Coba dengan kata kunci lain.");
      }
      
      const itemsToSend = shuffleArray(results).slice(0, count);

      for (const item of itemsToSend) {
        if (searchType === 'image') {
          await bot.sendMessage(msg.from, { image: { url: item }, caption: `Hasil pencarian untuk: *${searchQuery}*` }, { quoted: msg });
        } else if (searchType === 'video') {
            msg.reply(`Mencoba mengunduh video dari: ${item}\nMohon tunggu...`);
            const videoUrl = await downloadViaPintodown(item);
            if (videoUrl) {
                await bot.sendMessage(msg.from, { video: { url: videoUrl }, caption: `Video *${searchQuery}* berhasil diunduh.` }, { quoted: msg });
            } else {
                msg.reply(`Gagal mengunduh video dari link tersebut.`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1500)); // Jeda antar kiriman
      }

      await msg.react("✅");

    } catch (error) {
      console.error("Error pada perintah Pinterest:", error);
      await msg.react("❌");
      msg.reply("Terjadi kesalahan fatal saat memproses permintaan Anda.");
    }
  },
};

// Pastikan fungsi yang tidak digunakan di-comment atau dihapus untuk kebersihan
/*
async function autoScroll(page) { ... }
function shuffleArray(array) { ... }
*/

// Menambahkan kembali fungsi yang diperlukan agar tidak error
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 200;
      const scrollMax = 5000;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollMax) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}