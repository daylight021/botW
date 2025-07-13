// commands/tools/pinterest.js (Alternative Solutions - Multiple Methods)

const axios = require('axios');
const puppeteer = require('puppeteer'); // npm install puppeteer

// --- PENTING: Mengambil cookie dari variabel lingkungan (.env) ---
const PINTEREST_COOKIE = process.env.PINTEREST_COOKIE;

// Fungsi untuk memilih elemen secara acak dari sebuah array
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Fungsi untuk delay/menunggu
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === METODE 1: Menggunakan Puppeteer (Headless Browser) ===
async function pinterestSearchPuppeteer(query) {
  let browser;
  try {
    console.log("Mencoba metode Puppeteer...");
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent dan viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set cookies jika ada
    if (PINTEREST_COOKIE) {
      const cookies = PINTEREST_COOKIE.split(';').map(cookie => {
        const [name, value] = cookie.split('=');
        return { name: name.trim(), value: value?.trim() || '', domain: '.pinterest.com' };
      });
      await page.setCookie(...cookies);
    }
    
    // Navigasi ke halaman pencarian
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Tunggu gambar dimuat
    await page.waitForSelector('img[srcset]', { timeout: 10000 });
    
    // Scroll untuk memuat lebih banyak gambar
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight || totalHeight >= 2000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    // Ekstrak URL gambar
    const imageUrls = await page.evaluate(() => {
      const images = document.querySelectorAll('img[srcset]');
      const urls = [];
      
      images.forEach(img => {
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const matches = srcset.match(/https:\/\/i\.pinimg\.com\/[^\s]+/g);
          if (matches) {
            urls.push(matches[0]);
          }
        }
      });
      
      return [...new Set(urls)]; // Remove duplicates
    });
    
    await browser.close();
    return imageUrls.slice(0, 20);
    
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

// === METODE 2: Menggunakan API Pihak Ketiga (RapidAPI) ===
async function pinterestSearchRapidAPI(query) {
  try {
    console.log("Mencoba metode RapidAPI...");
    
    const rapidApiKey = process.env.RAPIDAPI_KEY; // Tambahkan ke .env
    if (!rapidApiKey) {
      throw new Error("RAPIDAPI_KEY tidak ditemukan di .env");
    }
    
    const response = await axios.get('https://pinterest-scraper-api.p.rapidapi.com/search', {
      params: { query, limit: 20 },
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'pinterest-scraper-api.p.rapidapi.com'
      }
    });
    
    return response.data.results?.map(item => item.image_url) || [];
    
  } catch (error) {
    console.error("RapidAPI gagal:", error.message);
    throw error;
  }
}

// === METODE 3: Menggunakan Unsplash API (Alternative) ===
async function unsplashSearch(query) {
  try {
    console.log("Menggunakan Unsplash sebagai alternatif...");
    
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY; // Tambahkan ke .env
    if (!unsplashAccessKey) {
      throw new Error("UNSPLASH_ACCESS_KEY tidak ditemukan di .env");
    }
    
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: { 
        query, 
        per_page: 20,
        orientation: 'all'
      },
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`
      }
    });
    
    return response.data.results?.map(item => item.urls.regular) || [];
    
  } catch (error) {
    console.error("Unsplash gagal:", error.message);
    throw error;
  }
}

// === METODE 4: Menggunakan Pixabay API (Alternative) ===
async function pixabaySearch(query) {
  try {
    console.log("Menggunakan Pixabay sebagai alternatif...");
    
    const pixabayApiKey = process.env.PIXABAY_API_KEY; // Tambahkan ke .env
    if (!pixabayApiKey) {
      throw new Error("PIXABAY_API_KEY tidak ditemukan di .env");
    }
    
    const response = await axios.get('https://pixabay.com/api/', {
      params: { 
        key: pixabayApiKey,
        q: query,
        per_page: 20,
        image_type: 'photo'
      }
    });
    
    return response.data.hits?.map(item => item.webformatURL) || [];
    
  } catch (error) {
    console.error("Pixabay gagal:", error.message);
    throw error;
  }
}

// === METODE 5: Menggunakan Pexels API (Alternative) ===
async function pexelsSearch(query) {
  try {
    console.log("Menggunakan Pexels sebagai alternatif...");
    
    const pexelsApiKey = process.env.PEXELS_API_KEY; // Tambahkan ke .env
    if (!pexelsApiKey) {
      throw new Error("PEXELS_API_KEY tidak ditemukan di .env");
    }
    
    const response = await axios.get('https://api.pexels.com/v1/search', {
      params: { 
        query, 
        per_page: 20 
      },
      headers: {
        'Authorization': pexelsApiKey
      }
    });
    
    return response.data.photos?.map(item => item.src.medium) || [];
    
  } catch (error) {
    console.error("Pexels gagal:", error.message);
    throw error;
  }
}

// Fungsi utama yang mencoba semua metode
async function pinterestSearch(query) {
  const methods = [
    { name: 'Puppeteer', func: pinterestSearchPuppeteer },
    { name: 'RapidAPI', func: pinterestSearchRapidAPI },
    { name: 'Unsplash', func: unsplashSearch },
    { name: 'Pixabay', func: pixabaySearch },
    { name: 'Pexels', func: pexelsSearch }
  ];
  
  for (const method of methods) {
    try {
      console.log(`Mencoba metode ${method.name}...`);
      const results = await method.func(query);
      if (results && results.length > 0) {
        console.log(`✅ Berhasil dengan ${method.name}: ${results.length} hasil`);
        return results;
      }
    } catch (error) {
      console.log(`❌ ${method.name} gagal: ${error.message}`);
      continue;
    }
  }
  
  throw new Error("Semua metode gagal");
}

// Fungsi video
async function pinterestVideoSearch(query) {
  return await pinterestSearch(query + " video");
}

// Module exports
module.exports = {
  name: "pin",
  alias: ["pinterest", "img", "image"],
  description: "Mencari gambar menggunakan multiple sources (Pinterest, Unsplash, Pixabay, Pexels).",
  category: "tools",
  execute: async (msg, { bot, args, usedPrefix, command }) => {
    if (!args.length) {
      const helpMessage = `*🖼️ Pencarian Gambar Multi-Source*\n\nMencari gambar dari berbagai sumber:\n• Pinterest (jika tersedia)\n• Unsplash\n• Pixabay  \n• Pexels\n\n*Cara Penggunaan:*\n\`${usedPrefix + command} <query>\`\nContoh: \`${usedPrefix + command} sunset landscape\`\n\n*Opsi Tambahan:*\n- \`-j <jumlah>\`: Kirim beberapa hasil (max 5)\n  Contoh: \`${usedPrefix + command} cat -j 3\`\n\n*Setup (Opsional):*\nTambahkan di file .env untuk hasil lebih baik:\n\`\`\`\nUNSPLASH_ACCESS_KEY=your_key\nPIXABAY_API_KEY=your_key\nPEXELS_API_KEY=your_key\nRAPIDAPI_KEY=your_key\n\`\`\`\n\n*Cara mendapatkan API keys:*\n• Unsplash: https://unsplash.com/developers\n• Pixabay: https://pixabay.com/api/docs/\n• Pexels: https://www.pexels.com/api/\n• RapidAPI: https://rapidapi.com/`;
      return bot.sendMessage(msg.from, { text: helpMessage }, { quoted: msg });
    }

    let query = [];
    let count = 1;
    let searchVideos = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i].toLowerCase() === '-j') {
        count = parseInt(args[i + 1], 10);
        if (isNaN(count) || count < 1) count = 1;
        if (count > 5) {
          count = 5;
          msg.reply("Jumlah maksimal yang diizinkan adalah 5.");
        }
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
        console.log(`🔍 Mencari: "${searchQuery}"`);
        
        const searchFunction = searchVideos ? pinterestVideoSearch : pinterestSearch;
        const results = await searchFunction(searchQuery);

        if (!results.length) {
            await msg.react("❌");
            return msg.reply(`Maaf, tidak ada hasil yang ditemukan untuk query "${searchQuery}".`);
        }

        console.log(`✅ Berhasil mendapatkan ${results.length} hasil`);

        // Kirim hasil dengan delay
        for (let i = 0; i < count; i++) {
            const randomMedia = pickRandom(results);
            if (randomMedia) {
                try {
                  await bot.sendMessage(msg.from, { 
                      image: { url: randomMedia }, 
                      caption: `🖼️ Hasil pencarian: *${searchQuery}*\n\n📊 Gambar ${i + 1} dari ${count}\n🔄 Sumber: Multi-platform` 
                  }, { quoted: msg });
                  
                  if (i < count - 1) {
                    await delay(1500); // Delay lebih lama
                  }
                } catch (sendError) {
                  console.log(`Gagal mengirim gambar ${i + 1}:`, sendError.message);
                }
            }
        }
        
        await msg.react("✅");
        
    } catch (error) {
        console.error("Error pada pencarian gambar:", error);
        await msg.react("❌");
        
        let errorMessage = "Maaf, terjadi kesalahan saat mencari gambar.";
        
        if (error.message.includes("Semua metode gagal")) {
          errorMessage = "Semua sumber gambar tidak dapat diakses saat ini. Silakan coba lagi nanti atau tambahkan API keys di file .env untuk hasil yang lebih baik.";
        } else if (error.message.includes("tidak ditemukan")) {
          errorMessage = "Untuk hasil yang lebih baik, silakan tambahkan API keys di file .env. Lihat perintah help untuk panduan.";
        }
        
        msg.reply(`❌ ${errorMessage}`);
    }
  },
};