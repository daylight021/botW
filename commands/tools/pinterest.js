const axios = require('axios');

// --- PENTING: Mengambil cookie dari variabel lingkungan (.env) ---
const PINTEREST_COOKIE = process.env.PINTEREST_COOKIE;

// Fungsi untuk memilih elemen secara acak dari sebuah array
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Fungsi untuk mendapatkan User-Agent yang lebih realistis
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Fungsi untuk delay/menunggu
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi utama untuk mencari di Pinterest dengan perbaikan anti-deteksi
async function pinterestSearch(query) {
  return new Promise(async (resolve, reject) => {
    try {
      // Memeriksa apakah cookie sudah diatur di file .env
      if (!PINTEREST_COOKIE) {
        return reject(new Error("Cookie Pinterest tidak ditemukan di file .env Anda. Silakan tambahkan PINTEREST_COOKIE di file .env"));
      }

      // Tambahkan delay random untuk menghindari rate limiting
      await delay(Math.random() * 1000 + 500);

      // --- PERBAIKAN: Headers yang lebih realistis dan up-to-date ---
      const headers = {
        'accept': 'application/json, text/javascript, */*, q=0.01',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
        'cache-control': 'no-cache',
        'cookie': PINTEREST_COOKIE,
        'dnt': '1',
        'pragma': 'no-cache',
        'referer': `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`,
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': getRandomUserAgent(),
        'x-app-version': 'c056fb7',
        'x-pinterest-appstate': 'active',
        'x-requested-with': 'XMLHttpRequest'
      };

      // Konfigurasi axios dengan timeout dan retry
      const axiosConfig = {
        headers,
        timeout: 15000, // 15 detik timeout
        params: {
          source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
          data: JSON.stringify({
            options: { 
              query: query, 
              scope: "pins",
              page_size: 25 // Menambah jumlah hasil
            },
            context: {},
          }),
        },
      };

      // Mencoba request dengan retry mechanism
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Mencoba request ke Pinterest (percobaan ${attempt}/3)...`);
          
          const { data } = await axios.get('https://www.pinterest.com/resource/BaseSearchResource/get/', axiosConfig);
          
          if (data.resource_response?.data?.results) {
            const results = data.resource_response.data.results;
            console.log(`Ditemukan ${results.length} hasil dari Pinterest`);
            
            if (results.length > 0) {
              // Ambil URL gambar dengan berbagai resolusi sebagai fallback
              const imageUrls = results.map(item => {
                const images = item.images;
                if (images) {
                  return images['736x']?.url || 
                         images['564x']?.url || 
                         images['474x']?.url || 
                         images['236x']?.url ||
                         images.orig?.url;
                }
                return null;
              }).filter(url => url);
              
              return resolve(imageUrls);
            } else {
              return resolve([]);
            }
          } else {
            throw new Error("Format response tidak sesuai");
          }
          
        } catch (error) {
          lastError = error;
          console.log(`Percobaan ${attempt} gagal:`, error.message);
          
          if (attempt < 3) {
            // Tunggu lebih lama sebelum retry
            await delay(2000 * attempt);
          }
        }
      }
      
      // Jika semua percobaan gagal
      throw lastError;
      
    } catch (error) {
      console.error("Gagal mengambil data dari API Pinterest:", error.message);
      
      // Memberikan pesan error yang lebih spesifik
      if (error.response) {
        const status = error.response.status;
        if (status === 403) {
          reject(new Error("Pinterest memblokir permintaan ini. Coba perbarui cookie atau tunggu beberapa saat."));
        } else if (status === 429) {
          reject(new Error("Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi."));
        } else {
          reject(new Error(`HTTP Error ${status}: ${error.response.statusText}`));
        }
      } else if (error.code === 'ECONNABORTED') {
        reject(new Error("Koneksi timeout. Coba lagi nanti."));
      } else {
        reject(error);
      }
    }
  });
}

// Fungsi alternative menggunakan scraping method yang berbeda
async function pinterestSearchAlternative(query) {
  try {
    console.log("Mencoba metode alternatif...");
    
    // Method alternatif menggunakan Pinterest RSS atau public API
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
    
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    const response = await axios.get(searchUrl, { headers, timeout: 10000 });
    
    // Regex untuk mengekstrak URL gambar dari HTML
    const imageRegex = /"url":"(https:\/\/i\.pinimg\.com\/[^"]+)"/g;
    const matches = [...response.data.matchAll(imageRegex)];
    
    if (matches.length > 0) {
      const imageUrls = matches.map(match => match[1]).filter(url => url);
      return imageUrls.slice(0, 20); // Ambil maksimal 20 gambar
    }
    
    return [];
  } catch (error) {
    console.error("Metode alternatif juga gagal:", error.message);
    throw error;
  }
}

// Fungsi video tetap menggunakan metode yang sama
async function pinterestVideoSearch(query) {
    try {
      return await pinterestSearch(query + " video");
    } catch (error) {
      // Fallback ke metode alternatif
      return await pinterestSearchAlternative(query + " video");
    }
}

// Module exports dan logika execute yang diperbaiki
module.exports = {
  name: "pin",
  alias: ["pinterest"],
  description: "Mencari gambar atau video dari Pinterest.",
  category: "tools",
  execute: async (msg, { bot, args, usedPrefix, command }) => {
    if (!args.length) {
      const helpMessage = `*Pencarian Pinterest* 🔎\n\nFitur ini digunakan untuk mencari media dari Pinterest.\n\n*Cara Penggunaan:*\n\`${usedPrefix + command} <query>\`\nContoh: \`${usedPrefix + command} cyberpunk city\`\n\n*Opsi Tambahan:*\n- \`-j <jumlah>\`: Untuk mengirim beberapa hasil sekaligus (maksimal 5).\n  Contoh: \`${usedPrefix + command} cat -j 3\`\n\n- \`-v\`: Untuk mencoba memprioritaskan pencarian video.\n  Contoh: \`${usedPrefix + command} aesthetic scenery -v\`\n\n*Catatan:* Pastikan PINTEREST_COOKIE sudah diatur di file .env`;
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
        console.log(`Mencari: "${searchQuery}" ${searchVideos ? '(video)' : '(gambar)'}`);
        
        let results = [];
        
        try {
          // Coba metode utama terlebih dahulu
          const searchFunction = searchVideos ? pinterestVideoSearch : pinterestSearch;
          results = await searchFunction(searchQuery);
        } catch (error) {
          console.log("Metode utama gagal, mencoba metode alternatif...");
          // Jika gagal, coba metode alternatif
          results = await pinterestSearchAlternative(searchQuery);
        }

        if (!results.length) {
            await msg.react("❌");
            return msg.reply(`Maaf, tidak ada hasil yang ditemukan untuk query "${searchQuery}".`);
        }

        console.log(`Berhasil mendapatkan ${results.length} hasil`);

        // Kirim hasil dengan delay untuk menghindari spam
        for (let i = 0; i < count; i++) {
            const randomMedia = pickRandom(results);
            if (randomMedia) {
                try {
                  await bot.sendMessage(msg.from, { 
                      image: { url: randomMedia }, 
                      caption: `📌 Hasil pencarian untuk: *${searchQuery}*\n\n_Gambar ${i + 1} dari ${count}_` 
                  }, { quoted: msg });
                  
                  // Delay antar pengiriman
                  if (i < count - 1) {
                    await delay(1000);
                  }
                } catch (sendError) {
                  console.log(`Gagal mengirim gambar ${i + 1}:`, sendError.message);
                }
            }
        }
        
        await msg.react("✅");
        
    } catch (error) {
        console.error("Error pada perintah Pinterest:", error);
        await msg.react("❌");
        
        let errorMessage = "Terjadi kesalahan saat mencari di Pinterest.";
        
        if (error.message.includes("Cookie")) {
          errorMessage = "Cookie Pinterest tidak valid atau belum diatur. Silakan perbarui PINTEREST_COOKIE di file .env";
        } else if (error.message.includes("memblokir")) {
          errorMessage = "Pinterest memblokir permintaan. Coba lagi nanti atau perbarui cookie.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Koneksi timeout. Coba lagi nanti.";
        }
        
        msg.reply(`❌ ${errorMessage}`);
    }
  },
};